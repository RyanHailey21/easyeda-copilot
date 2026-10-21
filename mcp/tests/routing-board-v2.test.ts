import assert from 'node:assert/strict';
import test from 'node:test';
import type { RawPcb, RawPcbPolygon } from '@copilot/shared/types/pcb/raw';
import { importEasyEdaBoardV2, nativeCopperPolygons } from '../src/routing/easyeda-board-v2';
import { parsePolygonSource } from '../src/pcb-preview/parser';
import { readEasyEdaPourRefillRules } from '../src/routing/easyeda-drc-adapter';
import { registerPcbRoutingTools } from '../src/tools/pcb/pcb-routing';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const source = {
    boardOutline: { path: [[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]] },
    layers: { route: [1, 2] }, components: {}, footprints: {},
    nets: [{ net: 'SIG', safeClearance: 'cls', trackWidth: 'cls', viaSize: 'cls' }],
    rules: { safeClearances: { cls: [{ trackToTrack: 0.2, trackToBoardOutline: 0.5 }] },
        trackWidths: { cls: [{ trackWidth: [0.2, 0.25, 0.3] }] }, viaSizes: { cls: [0.6, 0.3] } },
};
const drc = { ruleConfiguration: {}, netRules: [] };
const ring = (x: number, y: number, w: number, h: number) => [x, y, 'L', x + w, y, x + w, y + h, x, y + h, 'Z'];
const raw = (): RawPcb => ({ components: [{ id: 'c1', designator: 'U1', x: 5, y: 6, rotate: 90, layer: 'BOTTOM', value: 'IC', footprintName: 'QFN' }],
    pads: [{ id: 'p1', component: 'U1', padNumber: '1', x: 5, y: 6, rotation: Math.PI / 2, layer: 'BOTTOM', net: 'SIG',
        shape: ['POLYGON', [ring(4, 5, 2, 2)]], plated: true,
        hole: { data: ['SLOT', 0.5, 1], offsetX: 0.2, offsetY: 0.3, rotation: Math.PI / 4 } },
    { id: 'standalone', padNumber: '', x: 2, y: 2, rotation: 0, layer: 'MULTI', net: '', shape: ['ELLIPSE', 2, 2], plated: false,
        hole: { data: ['ROUND', 1], offsetX: 0, offsetY: 0, rotation: 0 } }],
    tracks: [{ id: 't', net: '', layer: 'TOP', x1: 1, y1: 2, x2: 2, y2: 2, width: 0.2 },
        { id: 'silk', net: '', layer: 'TOP_SILKSCREEN', x1: 1, y1: 1, x2: 2, y2: 2, width: 0.2 }],
    arcs: [{ id: 'a', net: 'SIG', layer: 'BOTTOM', x1: 1, y1: 0, x2: -1, y2: 0, arcAngle: 180, width: 0.2 }],
    vias: [{ id: 'v', viaType: 0, x: 3, y: 4, diameter: 0.6, drill: 0.3 }], polygons: [],
    routing: { layers: ['TOP', 'BOTTOM'], planeLayers: [], polylines: [], outlines: [ring(0, 0, 20, 10)], pours: [] },
});
const poly = (sources: (string | number)[][], lineWidth = 0, fill = true): RawPcbPolygon => ({ net: '', layer: 'TOP', sources, lineWidth, fill });
const ringArea = (ring: readonly { x: number; y: number }[]) => Math.abs(ring.reduce((a, p, i) => {
    const q = ring[(i + 1) % ring.length]; return a + p.x * q.y - p.y * q.x;
}, 0)) / 2;
const area = (regions: ReturnType<typeof nativeCopperPolygons>) => regions.reduce((a, p) => a + ringArea(p.outer) - (p.holes ?? []).reduce((s, h) => s + ringArea(h), 0), 0);

test('native pads, absolute polygon shapes, bottom transforms, slots and netless copper survive V2', () => {
    const { board } = importEasyEdaBoardV2(source, raw(), drc);
    assert.deepEqual(board.components[0].at, { x: 5, y: -6 });
    assert.equal(board.components[0].side, 'bottom');
    assert.equal(board.components[0].value, 'IC');
    const pad = board.pads[0];
    assert.equal(pad.rotationDeg, -90);
    assert.equal(pad.shape.kind, 'polygon');
    if (pad.shape.kind === 'polygon') assert.ok(pad.shape.polygon.outer.every(p => Math.abs(p.x) <= 1.000001 && Math.abs(p.y) <= 1.000001));
    assert.deepEqual(pad.hole, { shape: 'slot', diameterMm: 0.5, slotLengthMm: 1, offset: { x: 0.2, y: -0.3 }, rotationDeg: -45, plated: true });
    assert.equal(board.pads[1].component, undefined);
    assert.equal(board.pads[1].hole?.plated, false);
    assert.deepEqual(board.pads[1].layers, ['TOP', 'BOTTOM']);
    assert.equal(board.copper.fixed.tracks.length, 2);
    assert.equal(board.copper.fixed.tracks[0].net, undefined);
    assert.deepEqual(board.copper.fixed.tracks[0].points, [{ x: 1, y: -2 }, { x: 2, y: -2 }]);
    assert.ok(board.copper.fixed.tracks[1].points.some(p => p.y < -0.99));
    assert.equal(board.copper.fixed.vias[0].net, undefined);
    assert.equal(board.copper.fixed.vias[0].toLayer, 'BOTTOM');
    assert.deepEqual(board.copper.editable, { tracks: [], vias: [], zones: [] });
});

test('nested islands and very small holes are retained without preview filtering', () => {
    const regions = nativeCopperPolygons(poly([ring(0, 0, 10, 10), ring(2, 2, 0.2, 0.2), ring(2.05, 2.05, 0.1, 0.1)]));
    assert.equal(regions.length, 2);
    assert.equal(regions.reduce((s, p) => s + (p.holes?.length ?? 0), 0), 1);
    assert.ok(Math.abs(area(regions) - 99.97) < 1e-8);
});

test('circle, rounded rectangle and native Q curves use bounded sampling; preview keeps its defaults', () => {
    const circle = nativeCopperPolygons(poly([['CIRCLE', 0, 0, 5]]));
    assert.ok(Math.abs(area(circle) - 25 * Math.PI) < 0.03);
    const rectangle = nativeCopperPolygons(poly([['R', 0, 0, 4, 2, 37, 0.5]]));
    assert.ok(Math.abs(area(rectangle) - (8 - (4 - Math.PI) * 0.25)) < 0.005);
    const q = parsePolygonSource([0, 0, 'Q', 1, 2, 3, 4], {}, 0.001);
    assert.deepEqual(q[0].at(-1), { x: 3, y: 4 });
    assert.equal(parsePolygonSource(['CIRCLE', 0, 0, 5])[0].length, 24);
    assert.throws(() => nativeCopperPolygons(poly([[0, 0, 'L', 1, 0, 'BOGUS', 2, 2]])), /Unsupported polygon commands|Unexpected native/);
});

test('native strokes become copper area, preserving interior holes', () => {
    const regions = nativeCopperPolygons(poly([ring(0, 0, 10, 10)], 0.2, false));
    assert.ok(area(regions) > 7.99 && area(regions) < 8.01);
    assert.equal(regions[0].holes?.length, 1);
    assert.ok(Math.abs(area(nativeCopperPolygons(poly([ring(0, 0, 10, 10).slice(0, -1)], 0.2, false))) - area(regions)) < 1e-8);
    const combined = nativeCopperPolygons(poly([ring(0, 0, 10, 10), ring(2, 2, 1, 1)], 0.2));
    assert.ok(area(combined) > 103 && area(combined) < 104);
});

test('missing Poured and verified empty Poured are different states; Fill is independent', () => {
    const data = raw();
    data.routing!.pours = ['missing', 'empty'].map(id => ({ ...poly([ring(0, 0, 2, 2)]), id, priority: 3, preserveIslands: false, pouredIds: id === 'empty' ? ['native-poured'] : [] }));
    data.polygons = [{ ...poly([ring(3, 0, 1, 1)]), id: 'fill' }];
    const { board } = importEasyEdaBoardV2(source, data, drc);
    const zones = board.copper.fixed.zones;
    assert.equal(zones[0].kind, 'pour');
    assert.equal(zones[0].filledPolygons[0].status, 'missing');
    assert.deepEqual(zones[1].filledPolygons[0], { layer: 'TOP', source: 'cad', status: 'available', freshness: 'unknown', nativePrimitiveIds: ['native-poured'], polygons: [] });
    assert.equal(zones[2].kind, 'fill');
    data.polygons[0].fillMode = 1;
    assert.equal(importEasyEdaBoardV2(source, data, drc).board.copper.fixed.zones[2].filledPolygons[0].status, 'unsupported');
});

test('special pad shapes cover physical layers; unknown via spans fail instead of becoming through', () => {
    const data = raw();
    data.routing!.layers = ['TOP', 'INNER_1', 'BOTTOM'];
    data.routing!.planeLayers = ['INNER_1'];
    data.pads[1].specialPad = [[1, 15, ['RECT', 3, 4, 0]]];
    const { board, diagnostics } = importEasyEdaBoardV2(source, data, drc);
    assert.deepEqual(board.pads[1].shapesByLayer?.INNER_1, { kind: 'rect', widthMm: 3, heightMm: 4 });
    assert.equal(board.pads[1].shapesByLayer?.BOTTOM.kind, 'circle');
    assert.ok(diagnostics.some(d => d.code === 'EASYEDA_V2_PLANE_COPPER_UNAVAILABLE'));
    data.vias[0].viaType = 1;
    assert.throws(() => importEasyEdaBoardV2(source, data, drc), /Unresolved via span/);
    delete data.routing;
    assert.throws(() => importEasyEdaBoardV2(source, data, drc), /Reload the extension/);
});

test('Pour rules read both pad groups and reject a nonuniform scalar clearance', () => {
    const bundle = { netRules: [], ruleConfiguration: {
        Spacing: { 'Copper Safe Spacing': { preset: { isSetDefault: true, table: [{ content: [[0.2, 0.3]] }] } } },
        Plane: { 'Copper Zone': { preset: { isSetDefault: true, singleLayerPadModel: { connectMode: 0, lineClearance: 0.2, lineWidth: 0.3, lineAngle: 45 }, multiLayerPadModel: { connectMode: 1 } } } },
    } };
    const rules = readEasyEdaPourRefillRules(bundle, 'SIG');
    assert.equal(rules.status, 'partial');
    assert.equal(rules.clearanceMm, undefined);
    assert.deepEqual(rules.padConnection?.singleLayer, { mode: 'thermal', thermalGapMm: 0.2, spokeWidthMm: 0.3, spokeAngleDeg: 45 });
    assert.equal(rules.padConnection?.multiLayer?.mode, 'solid');
    assert.ok(rules.unresolved.some(r => r.includes('nonuniform')));
});

test('export tool requests V2, saves native evidence and never applies routing', async () => {
    const handlers = new Map<string, (...args: any[]) => Promise<any>>();
    const events: string[] = [];
    const data = raw();
    const bridge = {
        getSelectedEasyEdaInstance: async () => ({ instanceId: 'test-instance' }),
        getVersionWarning: async () => undefined,
        requestEasyEda: async (event: string, body?: Record<string, unknown>) => {
            events.push(event);
            if (event === 'get-command-target') return { documentUuid: 'test-pcb' };
            assert.equal(event, 'export-routing-input');
            assert.deepEqual(body, { version: 2 });
            return { text: JSON.stringify(source), pcb: data, drc };
        },
    };
    registerPcbRoutingTools({ registerTool: (name: string, _definition: unknown, handler: (...args: any[]) => Promise<any>) => handlers.set(name, handler) } as never, bridge as never);
    const directory = await mkdtemp(join(tmpdir(), 'routing-board-v2-'));
    const file = join(directory, 'board.json');
    try {
        const handler = handlers.get('export_pcb_routing_board')!;
        await handler({ file }, { signal: new AbortController().signal });
        const result = JSON.parse(await readFile(file, 'utf8'));
        assert.equal(result.board.pads[0].id, 'p1');
        assert.equal(result.capture.pcb.pads[0].id, 'p1');
        assert.deepEqual(events, ['get-command-target', 'export-routing-input']);
        data.vias[0].viaType = 1;
        await assert.rejects(handler({ file }, { signal: new AbortController().signal }), /Unresolved via span/);
        assert.ok(JSON.parse(await readFile(file, 'utf8')).capture, 'native evidence survives a conversion failure');
    } finally {
        assert.ok(directory.startsWith(join(tmpdir(), 'routing-board-v2-')));
        await rm(directory, { recursive: true, force: true });
    }
});

test('independent drills are not duplicated as copper pads; copper circles remain closed tracks', () => {
    const data = raw();
    delete data.pads[1].shape;
    data.routing!.polylines = [{ ...poly([['CIRCLE', 2, 3, 1]], 0.2, false), id: 'circle' }];
    const { board } = importEasyEdaBoardV2(source, data, drc);
    assert.equal(board.pads.length, 1);
    assert.equal(board.holes?.length, 1);
    assert.deepEqual(board.holes?.[0].at, { x: 2, y: -2 });
    const circle = board.copper.fixed.tracks[0];
    assert.equal(circle.id, 'circle');
    assert.deepEqual(circle.points[0], circle.points.at(-1));
});
