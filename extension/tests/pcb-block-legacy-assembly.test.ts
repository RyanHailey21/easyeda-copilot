import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as refs from '../src/eda/component-part-ref';
import * as blocks from '../src/eda/pcb-block-properties';
import * as parts from '@copilot/shared/types/lcsc';

// The real legacy createComponent with placement doubles: no editor is needed to check what it writes.
const file = resolve(__dirname, '../src/eda/assemble.ts');
const code = ts.transpileModule(readFileSync(file, 'utf8') + '\nexport const api = { createComponent };', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, fileName: file,
}).outputText;

function legacy(failWrite = false) {
    const logs: string[] = [];
    const placed: { properties: Record<string, unknown>; name?: string }[] = [];
    const placeComponent = async () => {
        const state: { properties: Record<string, unknown>; name?: string } = { properties: { Value: '10k' } };
        placed.push(state);
        const comp: any = {
            setState_Designator: () => comp, setState_Mirror: () => comp,
            setState_Name: (name: string) => { state.name = name; },
            getState_OtherProperty: () => state.properties,
            setState_OtherProperty: (value: Record<string, unknown>) => {
                if (failWrite && 'PCB Block' in value) throw new Error('write failed');
                state.properties = value;
            },
        };
        return comp;
    };
    const exports: Record<string, any> = {};
    runInNewContext(code, { exports, eda: { sys_Log: { add: (message: string) => logs.push(message) } },
        ESYS_LogType: { WARNING: 'warning' }, ESCH_PrimitiveLineType: { DOT_DASHED: 'dot' }, require(name: string) {
            if (name === 'p-queue') return { default: class { add(task: () => unknown) { return task(); } } };
            if (name === './place-component') return { placeComponent };
            if (name === './component-part-ref') return refs;
            if (name === './pcb-block-properties') return blocks;
            if (name === '@copilot/shared/types/lcsc') return parts;
            if (name === './types') return { ECHOSYS_LIB: 'sys', GND_PORT_COMPONENT: {}, VCC_PORT_COMPONENT: {}, NET_PORT_COMPONENT: {} };
            if (name === './utils') return { rmPartFromDesignator: (v: string) => v.replace(/\.\d+$/, '') };
            return {};
        } });
    return { create: exports.api.createComponent as (component: unknown) => Promise<unknown>, placed, logs };
}

const component = (designator: string, block_name: string, part_uuid = '3a6c559f43b44aff962dd7571d5f44ee') =>
    ({ designator, block_name, part_uuid, value: '10k', pins: [{ pin_number: 1, signal_name: 'N1' }], pos: { x: 0, y: 0, width: 10, height: 10, rotate: 0 } });

test('legacy assembly writes PCB Block next to the part reference, and nothing on net ports', async () => {
    const l = legacy();
    await l.create(component('R1', 'buck_feedback'));
    await l.create(component('R2', '__bulk_net__'));
    await l.create(component('3V3|1', 'power'));
    assert.equal(l.placed[0].properties['PCB Block'], 'buck_feedback');
    assert.equal(l.placed[0].properties.Value, '10k');
    assert.ok(typeof l.placed[0].properties['EasyEDA Copilot Part Ref'] === 'string', 'the part reference is kept');
    assert.equal('PCB Block' in l.placed[1].properties, false, 'internal names are not written');
    assert.equal('PCB Block' in l.placed[2].properties, false, 'net ports get no block');
});

test('a failed legacy PCB Block write is logged and the component is still placed', async () => {
    const l = legacy(true);
    assert.ok(await l.create(component('R1', 'buck_feedback')));
    assert.ok(l.logs.some(message => message.includes('PCB Block property not written for R1')));
});
