import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as sourceDocument from '../src/eda/source-document';

// Exercise the real cleanup functions without loading the editor-dependent imports.
const file = resolve(__dirname, '../src/eda/assemble-source.ts');
const code = ts.transpileModule(
    readFileSync(file, 'utf8') + '\nexport const findForTest = findUnusedShortSymbols; export const removeForTest = removeUnusedShortSymbols;',
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, fileName: file },
).outputText;

const types = { COMPONENT: 'part', NET_FLAG: 'netflag', NET_PORT: 'netport', SHORT_CIRCUIT_FLAG: 'short' };

function page(ports: Array<{ id: string; x: number }>, wires: Array<[number, number, number, number]>) {
    let source = [
        ...ports.map(port => `{"type":"COMPONENT","id":"${port.id}"}||{"x":${port.x}}`),
        ...wires.map(([x1, y1, x2, y2], index) =>
            `{"type":"LINE","id":"l${index}"}||{"lineGroup":"w${index}","startX":${x1},"startY":${y1},"endX":${x2},"endY":${y2}}`),
    ].join('\n');
    const exports: Record<string, any> = {};
    runInNewContext(code, {
        exports,
        ESCH_PrimitiveComponentType: types,
        eda: {
            sch_PrimitiveComponent: { getAll: async () => ports.map(port => ({
                getState_ComponentType: () => types.NET_PORT,
                getState_PrimitiveId: () => port.id,
                getState_Net: () => port.id,
                getState_X: () => port.x,
                getState_Y: () => 0,
            })) },
            sch_PrimitiveWire: { getAll: async () => [] },
            sch_Net: { getAllNets: async () => [] },
            sys_FileManager: {
                getDocumentSource: async () => source,
                setDocumentSource: async (next: string) => { source = next; return true; },
            },
        },
        require(name: string) {
            if (name === './source-document') return sourceDocument;
            if (name === './utils') return {
                to2: (value: number) => Math.round(value * 100) / 100,
                normWireY: (value: number) => value,
                yieldToEventLoop: async () => undefined,
            };
            if (name === './search') return { getPrimitiveComponentPins: async (id: string) => {
                const port = ports.find(item => item.id === id)!;
                return [{ getState_X: () => port.x, getState_Y: () => 0 }];
            } };
            if (name === './wire-snap') return { sch_PrimitiveWireSnap: { invalidate() {}, activate: async () => undefined } };
            return {};
        },
    });
    return { exports, source: () => source };
}

test('cleanup keeps short symbols that were already unconnected before the assembly', async () => {
    // Port "user" never touched a wire; port "orphan" lost its wire during the assembly.
    const run = page([{ id: 'user', x: 10 }, { id: 'orphan', x: 20 }, { id: 'wired', x: 30 }], [[30, 0, 40, 0]]);
    const before = await run.exports.findForTest();
    assert.deepEqual([...before.ids], ['user', 'orphan']);

    const preserve = new Set(['user']);
    assert.equal(await run.exports.removeForTest(preserve), 1);
    const ids = sourceDocument.parseDocumentSource(run.source()).map(record => record.outer.id);
    assert.deepEqual(ids, ['user', 'wired', 'l0']);
});

test('cleanup without a snapshot still removes every unconnected short symbol', async () => {
    const run = page([{ id: 'a', x: 10 }, { id: 'b', x: 30 }], [[30, 0, 40, 0]]);
    assert.equal(await run.exports.removeForTest(), 1);
    const ids = sourceDocument.parseDocumentSource(run.source()).map(record => record.outer.id);
    assert.deepEqual(ids, ['b', 'l0']);
});
