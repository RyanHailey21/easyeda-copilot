import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { buildSync } from 'esbuild';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { IDBFactory, IDBObjectStore, IDBIndex } from 'fake-indexeddb';
import type { Checkpoint } from '../src/eda/checkpoint-store';

const runtime = buildSync({
    entryPoints: [join(__dirname, '../src/eda/checkpoint-store.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
}).outputFiles[0].text;

function load(factory = new IDBFactory()) {
    const module = { exports: {} as { checkpointStore: typeof import('../src/eda/checkpoint-store').checkpointStore } };
    runInNewContext(runtime, { module, exports: module.exports, indexedDB: factory });
    return { store: module.exports.checkpointStore, factory };
}

function open(factory: IDBFactory, version?: number, upgrade?: (request: IDBOpenDBRequest) => void) {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = factory.open('checkpoints', version);
        request.onupgradeneeded = () => upgrade?.(request);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function checkpoint(id: string, timestamp = 1): Checkpoint {
    return { _id: id, timestamp, content: `source ${id}`, pageId: 'page-1' };
}

async function seed(factory: IDBFactory, rows: Checkpoint[], indexes: string[] = [], version = 1) {
    const db = await open(factory, version, request => {
        const store = request.result.createObjectStore('checkpoints', { keyPath: '_id', autoIncrement: true });
        for (const name of indexes) store.createIndex(name, name, { multiEntry: true });
    });
    try {
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction('checkpoints', 'readwrite');
            transaction.oncomplete = () => resolve();
            transaction.onabort = () => reject(transaction.error);
            for (const row of rows) transaction.objectStore('checkpoints').add(row);
        });
    } finally { db.close(); }
}

async function rows(factory: IDBFactory): Promise<Checkpoint[]> {
    const db = await open(factory);
    try {
        return await new Promise((resolve, reject) => {
            const transaction = db.transaction('checkpoints');
            const request = transaction.objectStore('checkpoints').getAll();
            transaction.oncomplete = () => resolve(request.result);
            transaction.onabort = () => reject(transaction.error);
        });
    } finally { db.close(); }
}

test('fresh databases support count, add, get, metadata and delete with the existing schema', async () => {
    const f = load();
    assert.equal(await f.store.count(), 0);
    assert.equal((await f.store.listMetadata()).length, 0);
    assert.equal(await f.store.get('missing'), undefined);
    await f.store.add(checkpoint('one'), () => false);
    assert.equal(await f.store.count(), 1);
    assert.equal((await f.store.get('one'))?.content, 'source one');
    const metadata = await f.store.listMetadata();
    assert.equal(metadata[0]._id, 'one');
    assert.equal(Object.hasOwn(metadata[0], 'content'), false);
    const db = await open(f.factory);
    assert.equal(db.objectStoreNames.length, 1);
    const store = db.transaction('checkpoints').objectStore('checkpoints');
    assert.equal(store.keyPath, '_id');
    assert.equal(store.autoIncrement, true);
    assert.deepEqual(Array.from(store.indexNames), ['timestamp']);
    assert.equal(store.index('timestamp').multiEntry, false);
    assert.equal(store.index('timestamp').unique, false);
    db.close();
    await f.store.delete('one');
    await f.store.delete('missing');
    assert.equal(await f.store.count(), 0);
});

test('migration replaces old indexes with only a time index and preserves every record by SHA-256', async () => {
    const f = load();
    const original = Array.from({ length: 12 }, (_, i) => ({ ...checkpoint(`cp-${i}`, i), content: `${i}:` + 'x'.repeat(1024 * 1024) }));
    await seed(f.factory, original, ['timestamp', 'content', '_id', 'pageId'], 7);
    const hash = (values: Checkpoint[]) => createHash('sha256').update(JSON.stringify(values)).digest('hex');
    const before = hash(await rows(f.factory));
    assert.equal(await f.store.count(), original.length);
    assert.equal(hash(await rows(f.factory)), before);
    for (let i = 0; i < 3; i++) assert.equal((await f.store.listMetadata()).length, original.length);
    const db = await open(f.factory);
    assert.equal(db.version, 8);
    assert.deepEqual(Array.from(db.transaction('checkpoints').objectStore('checkpoints').indexNames), ['timestamp']);
    db.close();
});

test('a database missing the checkpoint store is upgraded without dropping unrelated data', async () => {
    const f = load();
    const db = await open(f.factory, 4, request => {
        request.result.createObjectStore('unrelated').put('keep me', 'key');
    });
    db.close();
    assert.equal(await f.store.count(), 0);
    const after = await open(f.factory);
    assert.equal(after.version, 5);
    await new Promise<void>((resolve, reject) => {
        const transaction = after.transaction('unrelated');
        const request = transaction.objectStore('unrelated').get('key');
        transaction.oncomplete = () => { assert.equal(request.result, 'keep me'); resolve(); };
        transaction.onabort = () => reject(transaction.error);
    });
    after.close();
});

test('an incompatible primary key is rejected without deleting or rewriting the store', async () => {
    const f = load();
    const db = await open(f.factory, 3, request => {
        request.result.createObjectStore('checkpoints', { keyPath: 'different' }).add({ different: 'old', content: 'keep me' });
    });
    db.close();
    await assert.rejects(f.store.count(), /primary key/);
    const after = await open(f.factory);
    assert.equal(after.version, 3);
    const request = after.transaction('checkpoints').objectStore('checkpoints').get('old');
    await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => { assert.equal(request.result.content, 'keep me'); resolve(); };
        request.onerror = () => reject(request.error);
    });
    after.close();
});

test('a blocked upgrade rejects clearly, closes late connections and can be retried', { timeout: 3000 }, async () => {
    const f = load();
    await seed(f.factory, [checkpoint('old')], ['content']);
    const blocker = await open(f.factory);
    try { await assert.rejects(f.store.count(), /blocked/); }
    finally { blocker.close(); }
    assert.equal(await f.store.count(), 1);
    assert.equal((await f.store.get('old'))?.content, 'source old');
});

test('a concurrent schema version change is retried without losing records', { timeout: 3000 }, async t => {
    const f = load();
    await seed(f.factory, [checkpoint('old')], ['content']);
    const originalOpen = f.factory.open.bind(f.factory);
    let raced = false;
    t.mock.method(f.factory, 'open', (name: string, version?: number) => {
        if (version !== undefined && !raced) {
            raced = true;
            const other = originalOpen(name, version + 1);
            other.onsuccess = () => other.result.close();
        }
        return originalOpen(name, version);
    });
    assert.equal(await f.store.count(), 1);
    assert.equal(raced, true);
    assert.equal((await f.store.get('old'))?.content, 'source old');
});

test('failure after add success still rolls back pruning and rejects the write', async t => {
    const f = load();
    await seed(f.factory, Array.from({ length: 512 }, (_, i) => checkpoint(`cp-${i}`, i)));
    const before = await rows(f.factory);
    const originalAdd = IDBObjectStore.prototype.add;
    t.mock.method(IDBObjectStore.prototype, 'add', function (this: IDBObjectStore, value: unknown) {
        const request = originalAdd.call(this, value);
        request.addEventListener('success', () => this.transaction.abort());
        return request;
    });
    await assert.rejects(f.store.add(checkpoint('new', 1000), () => false), /aborted/);
    assert.deepEqual(await rows(f.factory), before);
});

test('an ID collision cannot overwrite a record or commit pruning', async () => {
    const f = load();
    await seed(f.factory, Array.from({ length: 512 }, (_, i) => checkpoint(`cp-${i}`, i)));
    const before = await rows(f.factory);
    for (const id of ['cp-0', 'cp-511']) {
        await assert.rejects(f.store.add({ ...checkpoint(id, 1000), content: 'replacement' }, () => false), /already exists/);
    }
    assert.deepEqual(await rows(f.factory), before);
});

test('synchronous write errors and errors in pruning callbacks abort without partial cleanup', async () => {
    const f = load();
    await seed(f.factory, Array.from({ length: 512 }, (_, i) => checkpoint(`cp-${i}`, i)));
    const before = await rows(f.factory);
    await assert.rejects(f.store.add(checkpoint('new'), () => { throw new Error('pin lookup failed'); }), /pin lookup failed/);
    assert.deepEqual(await rows(f.factory), before);
    await assert.rejects(f.store.add({ ...checkpoint('new'), content: (() => {}) as unknown as string }, () => false), { name: 'DataCloneError' });
    assert.deepEqual(await rows(f.factory), before);
});

test('concurrent saves at the retention threshold retain both new checkpoints', async () => {
    const f = load();
    await seed(f.factory, Array.from({ length: 512 }, (_, i) => checkpoint(`cp-${i}`, i)));
    await Promise.all([
        f.store.add(checkpoint('new-a', 1000), () => false),
        f.store.add(checkpoint('new-b', 1001), () => false),
    ]);
    assert.equal(await f.store.count(), 101);
    assert.ok(await f.store.get('new-a'));
    assert.ok(await f.store.get('new-b'));
});

test('all pinned baselines survive pruning without reading any source values', async t => {
    const f = load();
    await seed(f.factory, Array.from({ length: 512 }, (_, i) => checkpoint(`cp-${i}`, i)));
    t.mock.method(IDBObjectStore.prototype, 'getAll', () => { throw new Error('Bulk read forbidden'); });
    t.mock.method(IDBObjectStore.prototype, 'get', () => { throw new Error('Source read forbidden'); });
    t.mock.method(IDBObjectStore.prototype, 'openCursor', () => { throw new Error('Source cursor forbidden'); });
    t.mock.method(IDBIndex.prototype, 'openCursor', () => { throw new Error('Source cursor forbidden'); });
    await f.store.add(checkpoint('new', 1000), () => true);
    assert.equal(await f.store.count(), 513);
});

test('pagination loads only requested values in time order, including ties and large offsets', async t => {
    const f = load();
    await seed(f.factory, Array.from({ length: 40 }, (_, i) => ({
        ...checkpoint(`id-${String(39 - i).padStart(2, '0')}`, Math.floor(i / 2)),
        content: 'x'.repeat(1024 * 1024),
    })));
    // Complete the schema migration before forbidding any value cursor.
    await f.store.count();
    const original = await rows(f.factory);
    const expected = original.sort((a, b) => b.timestamp - a.timestamp || b._id.localeCompare(a._id));
    const get = t.mock.method(IDBObjectStore.prototype, 'get');
    t.mock.method(IDBObjectStore.prototype, 'getAll', () => { throw new Error('Bulk read forbidden'); });
    t.mock.method(IDBObjectStore.prototype, 'openCursor', () => { throw new Error('Value cursor forbidden'); });
    t.mock.method(IDBIndex.prototype, 'openCursor', () => { throw new Error('Value cursor forbidden'); });
    for (const [options, start, end] of [[undefined, 0, 16], [{ limit: 7, offset: 15 }, 15, 22],
        [{ limit: 16, offset: 35 }, 35, 40], [{ offset: 40 }, 40, 40],
        [{ offset: 2 ** 32 }, 40, 40], [{ offset: Number.MAX_SAFE_INTEGER }, 40, 40]] as const) {
        const before = get.mock.callCount();
        const actual = await f.store.listMetadata(options);
        assert.deepEqual(Array.from(actual, row => row._id), expected.slice(start, end).map(row => row._id));
        assert.equal(get.mock.callCount() - before, end - start);
        assert.ok(actual.every(row => !Object.hasOwn(row, 'content')));
    }
});

test('pagination rejects invalid limits and offsets', async () => {
    const f = load();
    for (const limit of [0, -1, 513, 1.5, NaN, Infinity, '16', null]) {
        await assert.rejects(f.store.listMetadata({ limit: limit as number }), /limit/);
    }
    for (const offset of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '0', null]) {
        await assert.rejects(f.store.listMetadata({ offset: offset as number }), /offset/);
    }
});

test('a transaction abort releases the connection for a subsequent schema upgrade', { timeout: 3000 }, async t => {
    const f = load();
    await seed(f.factory, [checkpoint('old')]);
    const originalCount = IDBObjectStore.prototype.count;
    t.mock.method(IDBObjectStore.prototype, 'count', function (this: IDBObjectStore) {
        const request = originalCount.call(this);
        this.transaction.abort();
        return request;
    });
    await assert.rejects(f.store.count(), /aborted/);
    const db = await open(f.factory, 2);
    db.close();
});
