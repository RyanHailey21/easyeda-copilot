import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import { buildSync } from 'esbuild';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { IDBFactory, IDBKeyRange, IDBObjectStore, IDBIndex } from 'fake-indexeddb';

const bundle = buildSync({
    entryPoints: [join(__dirname, '../src/eda/checkpointer.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    external: ['@copilot/shared/types/eda'],
    metafile: true,
});
const runtime = bundle.outputFiles[0].text;

type Saved = { _id: string; timestamp: number; content: string; pageId?: string; name?: string };

async function open(factory: IDBFactory) {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = factory.open('checkpoints');
        request.onupgradeneeded = () => request.result.createObjectStore('checkpoints', { keyPath: '_id', autoIncrement: true });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function seed(factory: IDBFactory, rows: Saved[], overwrite = false) {
    const db = await open(factory);
    try {
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction('checkpoints', 'readwrite');
            transaction.oncomplete = () => resolve();
            transaction.onabort = () => reject(transaction.error);
            const store = transaction.objectStore('checkpoints');
            for (const row of rows) {
                if (overwrite) store.put(row);
                else store.add(row);
            }
        });
    } finally { db.close(); }
}

async function records(factory: IDBFactory) {
    const db = await open(factory);
    try {
        return await new Promise<Saved[]>((resolve, reject) => {
            const transaction = db.transaction('checkpoints');
            const request = transaction.objectStore('checkpoints').getAll();
            transaction.oncomplete = () => resolve(request.result as Saved[]);
            transaction.onabort = () => reject(transaction.error);
        });
    } finally { db.close(); }
}

async function load(rows: Saved[] = [], factory = new IDBFactory(), shadowIndexedDB = false) {
    if (rows.length) await seed(factory, rows);
    const state = {
        pageId: 'page-1', content: 'current source', documentInfoError: false,
        restoreResult: true, restoreError: false, confirmed: true,
        onConfirm: undefined as (() => void | Promise<void>) | undefined,
        onCapture: undefined as (() => void | Promise<void>) | undefined,
        onDocumentInfo: undefined as (() => void) | undefined,
        onRestore: undefined as (() => void) | undefined,
        writes: [] as string[], toasts: [] as string[],
    };
    const module = { exports: {} as any };
    runInNewContext(runtime, {
        module, exports: module.exports, indexedDB: factory, IDBKeyRange, crypto: webcrypto,
        ...(shadowIndexedDB ? { indexedDB: undefined, globalThis: { indexedDB: factory, IDBKeyRange } } : {}),
        require: () => ({}),
        ESYS_ToastMessageType: { WARNING: 1, SUCCESS: 2, ERROR: 3, INFO: 4 },
        eda: {
            dmt_SelectControl: { getCurrentDocumentInfo: async () => {
                state.onDocumentInfo?.();
                if (state.documentInfoError) throw new Error('document metadata unavailable');
                return { uuid: state.pageId, documentType: 3 };
            } },
            sys_FileManager: {
                getDocumentSource: async () => { await state.onCapture?.(); return state.content; },
                setDocumentSource: async (content: string) => {
                    state.onRestore?.();
                    state.writes.push(content);
                    if (state.restoreError) throw new Error('restore failed');
                    if (state.restoreResult) state.content = content;
                    return state.restoreResult;
                },
            },
            sys_Dialog: { showConfirmationMessage: (...args: any[]) => {
                Promise.resolve(state.onConfirm?.()).then(() => args.at(-1)(state.confirmed));
            } },
            sys_Message: { showToastMessage: (message: string) => { state.toasts.push(message); } },
        },
    });
    return { checkpointer: module.exports.checkpointer, state, factory, records: () => records(factory) };
}

test('old checkpoints get English display names without rewriting records and still restore', async () => {
    const rows: Saved[] = [{ _id: 'old', timestamp: 1700000000000, content: 'old source', pageId: 'page-1' }];
    const f = await load(rows);
    const [entry] = await f.checkpointer.list();
    assert.equal(entry.name, 'Unnamed — 2023-11-14T22:13:20.000Z');
    assert.deepEqual(await f.records(), rows);
    assert.equal(await f.checkpointer.restore('old', true), true);
    assert.equal(f.state.content, 'old source');
});

test('names survive reload and duplicate names restore distinct snapshots by ID', async () => {
    const first = await load();
    const name = 'Schematic verified, before property changes';
    first.state.content = 'first source';
    const firstId = await first.checkpointer.save(false, `  ${name}  `);
    first.state.content = 'second source';
    const secondId = await first.checkpointer.save(false, name);
    assert.notEqual(firstId, secondId);
    const reloaded = await load([], first.factory);
    assert.equal((await reloaded.checkpointer.read(firstId)).name, name);
    assert.equal((await reloaded.checkpointer.list()).filter((row: Saved) => row.name === name).length, 2);
    assert.equal(await reloaded.checkpointer.restore(firstId, true), true);
    assert.equal(reloaded.state.content, 'first source');
    assert.equal(await reloaded.checkpointer.restore(secondId, true), true);
    assert.equal(reloaded.state.content, 'second source');
    reloaded.state.pageId = 'another-page';
    assert.equal(await reloaded.checkpointer.restore(firstId, true), false);
    assert.equal(reloaded.state.content, 'second source');
});

test('legacy save calls and blank names work; invalid names do not save', async () => {
    const f = await load();
    assert.ok(await f.checkpointer.save(false));
    assert.ok(await f.checkpointer.save(false, '   '));
    assert.equal((await f.records()).length, 2);
    assert.ok((await f.records()).every(row => !Object.hasOwn(row, 'name')));
    for (const name of ['x'.repeat(201), 42, null]) assert.equal(await f.checkpointer.save(false, name), null);
    assert.equal((await f.records()).length, 2);
    assert.ok(await f.checkpointer.save(true, 'Temporary checkpoint'));
    assert.equal((await f.records()).length, 2);
    assert.equal(await f.checkpointer.restore(undefined, true), true);
    assert.equal(f.checkpointer.hasCheckpoint(), false);
});

test('a checkpoint is not saved without a stable document UUID or source', async () => {
    const f = await load();
    f.state.documentInfoError = true;
    assert.equal(await f.checkpointer.save(false, 'unsafe'), null);
    f.state.documentInfoError = false;
    f.state.pageId = '';
    assert.equal(await f.checkpointer.save(false), null);
    f.state.pageId = 'page-1';
    f.state.content = '';
    assert.equal(await f.checkpointer.save(false), null);
    f.state.content = 'source';
    f.state.onCapture = () => { f.state.pageId = 'page-2'; };
    assert.equal(await f.checkpointer.save(false), null);
    assert.equal((await f.records()).length, 0);
    assert.equal(f.checkpointer.hasCheckpoint(), false);
});

test('legacy checkpoints without a document UUID cannot be restored', async () => {
    const f = await load([{ _id: 'legacy', timestamp: 1, content: 'other source' }]);
    assert.equal(await f.checkpointer.restore('legacy', true), false);
    assert.equal(f.state.content, 'current source');
    assert.equal((await f.checkpointer.list())[0].isCurrentPage, false);
});

test('active scope baselines survive history pruning, expired pins do not', async () => {
    const f = await load(Array.from({ length: 512 }, (_, i) => ({ _id: `cp-${i}`, timestamp: i, content: 'source', pageId: 'page-1' })));
    f.checkpointer.pin('cp-0', Date.now() + 60000);
    f.checkpointer.pin('cp-1', Date.now() - 1);
    assert.ok(await f.checkpointer.save(false));
    const rows = await f.records();
    assert.equal(rows.length, 101);
    assert.ok(rows.some(r => r._id === 'cp-0'));
    assert.ok(!rows.some(r => r._id === 'cp-1'));
    f.checkpointer.unpin('cp-0');
    await seed(f.factory, Array.from({ length: 512 - rows.length }, (_, i) => ({ _id: `new-${i}`, timestamp: Date.now(), content: 'source' })));
    assert.ok(await f.checkpointer.save(false));
    assert.equal((await f.records()).length, 100);
    assert.ok(!(await f.records()).some(r => r._id === 'cp-0'));
});

test('40 MB history: ordinary saves never scan history; paged lists load only selected records', async t => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ _id: `large-${i}`, timestamp: i, content: String(i) + 'x'.repeat(2 * 1024 * 1024), pageId: 'page-1' }));
    const f = await load(rows);
    t.mock.method(IDBObjectStore.prototype, 'getAll', () => { throw new Error('Bulk history read forbidden'); });
    const cursor = t.mock.method(IDBObjectStore.prototype, 'openCursor');
    const count = t.mock.method(IDBObjectStore.prototype, 'count');
    const get = t.mock.method(IDBObjectStore.prototype, 'get');
    const add = t.mock.method(IDBObjectStore.prototype, 'add');
    const id = await f.checkpointer.save(false, 'Small new checkpoint');
    assert.ok(id);
    assert.equal(count.mock.callCount(), 1);
    assert.equal(cursor.mock.callCount(), 0);
    assert.equal(add.mock.callCount(), 1);
    for (let i = 0; i < 3; i++) {
        const list = await f.checkpointer.list();
        assert.equal(list.length, 16);
        assert.equal(list[0]._id, id);
        assert.ok(list.every((row: object) => !Object.hasOwn(row, 'content')));
    }
    assert.equal(cursor.mock.callCount(), 0);
    assert.equal(get.mock.callCount(), 48);
    assert.equal((await f.checkpointer.read('large-3')).content, rows[3].content);
    assert.equal(get.mock.callCount(), 49);
});

test('public list forwards pagination and keeps display names and page flags', async () => {
    const f = await load(Array.from({ length: 30 }, (_, i) => ({
        _id: `cp-${29 - i}`, timestamp: i + 1, content: 'source',
        ...(i % 2 ? { pageId: 'page-1', name: `named-${i}` } : {}),
    })));
    const page = await f.checkpointer.list({ limit: 3, offset: 10 });
    assert.deepEqual(Array.from(page, (row: Saved) => row.timestamp), [20, 19, 18]);
    assert.equal(page[0].name, 'named-19');
    assert.equal(page[0].isCurrentPage, true);
    assert.match(page[1].name, /^Unnamed/);
    assert.equal(page[1].isCurrentPage, false);
    assert.equal((await f.checkpointer.list({ offset: 30 })).length, 0);
    await assert.rejects(f.checkpointer.list({ offset: -1 }), /offset/);
});

test('an insert error does not report success or replace the last temporary checkpoint', async t => {
    const rows = [{ _id: 'existing', timestamp: 1, content: 'source', pageId: 'page-1' }];
    const f = await load(rows);
    assert.ok(await f.checkpointer.save(true));
    const originalAdd = IDBObjectStore.prototype.add;
    t.mock.method(IDBObjectStore.prototype, 'add', function (this: IDBObjectStore) {
        // Produce a real asynchronous request error.
        return originalAdd.call(this, rows[0]);
    });
    assert.equal(await f.checkpointer.save(false), null);
    assert.deepEqual(await f.records(), rows);
    assert.ok(!f.state.toasts.includes('Create checkpoint'));
    assert.equal(f.checkpointer.hasCheckpoint(), true);
});

test('concurrent saves below the pruning threshold retain both new records', async () => {
    const f = await load();
    const ids = await Promise.all([f.checkpointer.save(false, 'A'), f.checkpointer.save(false, 'B')]);
    assert.ok(ids.every(Boolean));
    assert.notEqual(ids[0], ids[1]);
    const rows = await f.records();
    assert.equal(rows.length, 2);
    assert.ok(ids.every(id => rows.some(row => row._id === id)));
});

test('restore refuses a document switch during confirmation and keeps the temporary checkpoint', async () => {
    const f = await load();
    await f.checkpointer.save(true);
    f.state.onConfirm = () => { f.state.pageId = 'other'; };
    assert.equal(await f.checkpointer.restore(), false);
    assert.equal(f.state.writes.length, 0);
    assert.equal(f.checkpointer.hasCheckpoint(), true);
});

test('failed restores and declined confirmations keep the last checkpoint for retry', async () => {
    const f = await load();
    await f.checkpointer.save(true);
    f.state.confirmed = false;
    assert.equal(await f.checkpointer.restore(), false);
    assert.equal(f.state.writes.length, 0);
    f.state.confirmed = true;
    f.state.restoreResult = false;
    assert.equal(await f.checkpointer.restore(), false);
    assert.equal(f.checkpointer.hasCheckpoint(), true);
    f.state.restoreError = true;
    assert.equal(await f.checkpointer.restore(), false);
    assert.equal(f.checkpointer.hasCheckpoint(), true);
    f.state.restoreError = false;
    f.state.restoreResult = true;
    assert.equal(await f.checkpointer.restore(), true);
    assert.equal(f.checkpointer.hasCheckpoint(), false);
});

test('cancellation before restore, during confirmation or the final UUID lookup prevents edits', async () => {
    for (const when of ['before', 'dialog', 'uuid']) {
        const f = await load();
        await f.checkpointer.save(true);
        const controller = new AbortController();
        if (when === 'before') controller.abort();
        if (when === 'dialog') f.state.onConfirm = () => controller.abort();
        if (when === 'uuid') {
            let calls = 0;
            f.state.onDocumentInfo = () => { if (++calls === 2) controller.abort(); };
        }
        await assert.rejects(f.checkpointer.restore(undefined, false, controller.signal), { name: 'AbortError' });
        assert.equal(f.state.writes.length, 0);
        assert.equal(f.checkpointer.hasCheckpoint(), true);
    }
});

test('missing records differ from database failures; a failed read/list is not an empty history', async t => {
    const f = await load();
    assert.equal(await f.checkpointer.read('missing'), null);
    assert.equal(await f.checkpointer.restore('missing', true), false);
    assert.equal(await f.checkpointer.restore(undefined, true), false);
    const originalGet = IDBObjectStore.prototype.get;
    t.mock.method(IDBObjectStore.prototype, 'get', function (this: IDBObjectStore, key: IDBValidKey) {
        const request = originalGet.call(this, key);
        this.transaction.abort();
        return request;
    });
    await assert.rejects(f.checkpointer.read('missing'));
    await assert.rejects(f.checkpointer.restore('missing', true));
    const originalCursor = IDBIndex.prototype.openKeyCursor;
    t.mock.method(IDBIndex.prototype, 'openKeyCursor', function (this: IDBIndex) {
        const request = originalCursor.call(this);
        request.addEventListener('success', () => this.transaction.abort());
        return request;
    });
    await assert.rejects(f.checkpointer.list(), { name: 'AbortError' });
});

test('literal true/false names and sources round-trip without coercion', async () => {
    const f = await load();
    for (const value of ['true', 'false']) {
        f.state.content = value;
        const id = await f.checkpointer.save(false, value);
        const checkpoint = await f.checkpointer.read(id);
        assert.equal(checkpoint.name, value);
        assert.equal(checkpoint.content, f.state.content);
        assert.equal((await f.checkpointer.list()).find((row: Saved) => row._id === id).name, value);
    }
});

test('the editor sandbox may shadow indexedDB while storage uses the host global', async () => {
    const f = await load([], new IDBFactory(), true);
    const id = await f.checkpointer.save(false, 'Sandbox checkpoint');
    assert.ok(id);
    assert.equal((await f.checkpointer.list())[0]._id, id);
    assert.equal((await f.checkpointer.read(id)).content, 'current source');
    assert.equal(await f.checkpointer.restore(id, true), true);
});

test('existing schema initialization removes old indexes without changing checkpoint records', async () => {
    const factory = new IDBFactory();
    const rows = [{ _id: 'old', timestamp: 1, content: 'unchanged source', name: 'old', pageId: 'page-1' }];
    await seed(factory, rows);
    await new Promise<void>((resolve, reject) => {
        const request = factory.open('checkpoints', 2);
        request.onupgradeneeded = () => request.transaction!.objectStore('checkpoints').createIndex('content', 'content');
        request.onsuccess = () => { request.result.close(); resolve(); };
        request.onerror = () => reject(request.error);
    });
    const f = await load([], factory);
    assert.equal((await f.checkpointer.list())[0]._id, 'old');
    assert.deepEqual(await f.records(), rows);
    const db = await open(factory);
    try {
        assert.deepEqual(Array.from(db.transaction('checkpoints').objectStore('checkpoints').indexNames), ['timestamp']);
    } finally { db.close(); }
});

test('the 512-record threshold preserves 511 records until the next save', async t => {
    const f = await load(Array.from({ length: 511 }, (_, i) => ({ _id: `cp-${i}`, timestamp: i, content: 'source' })));
    const cursor = t.mock.method(IDBIndex.prototype, 'openKeyCursor');
    assert.ok(await f.checkpointer.save(false));
    assert.equal(cursor.mock.callCount(), 0);
    assert.equal((await f.records()).length, 512);
    assert.ok(await f.checkpointer.save(false));
    assert.equal(cursor.mock.callCount(), 1);
    assert.equal((await f.records()).length, 100);
});

test('document sources are not cached on writes or reads', async () => {
    const f = await load();
    const id = await f.checkpointer.save(false, 'Original');
    const [saved] = await f.records();
    await seed(f.factory, [{ ...saved, content: 'changed outside the module' }], true);
    assert.equal((await f.checkpointer.read(id)).content, 'changed outside the module');
    // If read cached the source, the next read would return that old value.
    await seed(f.factory, [{ ...saved, content: 'changed again outside the module' }], true);
    assert.equal((await f.checkpointer.read(id)).content, 'changed again outside the module');
});

test('the checkpointer bundle has no AppDB dependency', () => {
    assert.ok(!Object.keys(bundle.metafile!.inputs).some(file => file.includes('node_modules/appdb/')));
});

test('the last persistent checkpoint retains only an ID and reloads its source on restore', async () => {
    const f = await load();
    await f.checkpointer.save(false);
    const [saved] = await f.records();
    await seed(f.factory, [{ ...saved, content: 'updated persistent source' }], true);
    assert.equal(await f.checkpointer.restore(undefined, true), true);
    assert.equal(f.state.content, 'updated persistent source');
    assert.equal(f.checkpointer.hasCheckpoint(), false);
});

test('saves capture one source at a time and reject an excessive backlog', async () => {
    const f = await load();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let captures = 0;
    let inFlight = 0;
    let peak = 0;
    f.state.onCapture = async () => {
        captures++;
        peak = Math.max(peak, ++inFlight);
        await gate;
        inFlight--;
    };
    const saves = Array.from({ length: 20 }, (_, i) => f.checkpointer.save(false, `Queued ${i}`));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(captures, 1);
    release();
    const ids = await Promise.all(saves);
    assert.equal(ids.filter(Boolean).length, 8);
    assert.equal(peak, 1);
    assert.equal((await f.records()).length, 8);
    assert.ok(await f.checkpointer.save(false, 'After the queue drained'));
});

test('malformed saved sources cannot reach the editor restore API', async () => {
    const f = await load([{ _id: 'bad', timestamp: 1, content: null as unknown as string, pageId: 'page-1' }]);
    assert.equal(await f.checkpointer.restore('bad', true), false);
    assert.equal(f.state.writes.length, 0);
});

test('concurrent restores cannot retain multiple sources behind confirmation dialogs', { timeout: 3000 }, async t => {
    const f = await load([checkpoint('one'), checkpoint('two')]);
    let release!: () => void;
    let shown!: () => void;
    const dialogShown = new Promise<void>(resolve => { shown = resolve; });
    f.state.onConfirm = () => new Promise<void>(resolve => { release = resolve; shown(); });
    const get = t.mock.method(IDBObjectStore.prototype, 'get');
    const first = f.checkpointer.restore('one');
    await dialogShown;
    assert.equal(await f.checkpointer.restore('two'), false);
    assert.equal(get.mock.callCount(), 1);
    release();
    assert.equal(await first, true);
    assert.equal(await f.checkpointer.restore('two', true), true);

    function checkpoint(id: string): Saved {
        return { _id: id, timestamp: 1, content: `source ${id}`, pageId: 'page-1' };
    }
});
