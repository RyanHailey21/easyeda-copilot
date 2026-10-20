import assert from 'node:assert/strict';
import test from 'node:test';
import { arcPoints } from '../src/eda/polygon-arc.ts';

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;

test('rounded board corner from a native outline stays on its circle', () => {
    // Bottom-left corner of a 55 mm board with 2 mm radius, as EasyEDA returns it:
    // ... -1003.937, -1082.6772, 'ARC', -90, -1082.6772, -1003.937 ...
    const start = { x: -1003.937, y: -1082.6772 };
    const end = { x: -1082.6772, y: -1003.937 };
    const points = arcPoints(start, end, -90);
    assert.deepEqual(points.at(-1), end);
    assert.ok(points.length > 2);
    const center = { x: -1003.937, y: -1003.937 };
    for (const p of points) {
        assert.ok(close(Math.hypot(p.x - center.x, p.y - center.y), 78.7402));
        // The corner bulges away from the board interior, never inward past the chord.
        assert.ok(p.x <= start.x + 1e-6 && p.y <= end.y + 1e-6);
    }
});

test('counterclockwise half circle passes through the far side', () => {
    const points = arcPoints({ x: 1, y: 0 }, { x: -1, y: 0 }, 180, 45);
    assert.equal(points.length, 4);
    assert.ok(close(points[1].x, 0) && close(points[1].y, 1));
});

test('zero sweep degenerates to a straight segment', () => {
    assert.deepEqual(arcPoints({ x: 0, y: 0 }, { x: 5, y: 0 }, 0), [{ x: 5, y: 0 }]);
});
