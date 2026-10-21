import assert from 'node:assert/strict';
import test from 'node:test';

const empty = { getAll: async () => [] };
Object.assign(globalThis, {
    EPCB_LayerId: { TOP: 1, BOTTOM: 2, BOARD_OUTLINE: 11, 1: 'TOP', 2: 'BOTTOM' },
    EPCB_LayerType: { INTERNAL_ELECTRICAL: 'PLANE' },
    eda: {
        sys_Environment: { getEditorCurrentVersion: () => '3.2.206' },
        pcb_PrimitivePolyline: { getAll: async () => [{ getState_Layer: () => 11,
            getState_Polygon: () => ({ getSource: () => [0, 0, 'L', 100, 0, 100, 100, 0, 100] }) }] },
        pcb_PrimitiveComponent: empty, pcb_PrimitivePad: empty, pcb_PrimitiveVia: empty,
        pcb_PrimitiveArc: empty, pcb_PrimitivePour: empty, pcb_PrimitivePoured: empty, pcb_PrimitiveFill: empty,
        pcb_PrimitiveLine: { getAll: async () => { throw new Error('Native track read failed'); } },
        pcb_Layer: { getAllLayers: async () => [{ id: 1, layerStatus: 1 }, { id: 2, layerStatus: 1 }] },
    },
});

test('V2 rejects failed native reads while the legacy raw read keeps its existing best-effort result', async () => {
    const { getPcbRaw } = await import('../src/eda/pcb.ts');
    await assert.rejects(getPcbRaw(true), /Native track read failed/);
    const legacy = await getPcbRaw();
    assert.equal(legacy.board?.polygon.length, 4);
    assert.deepEqual(legacy.tracks, []);
    assert.equal('routing' in legacy, false);
    assert.deepEqual(Object.keys(legacy).sort(), ['arcs', 'board', 'components', 'pads', 'polygons', 'tracks', 'vias']);
});
