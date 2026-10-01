import { describe, expect, it } from 'vitest';
import { LEVEL_CHECKPOINTS_LAYOUT, PROVING_TRACK_PATH } from '@/src/components/course-map/courseMapLayout';
import { getRoutePose, getCarSpriteIndex, ROUTE_LENGTH } from '@/src/components/course-map/courseMapGeometry';

// Independent SVG cubic evaluation catches hand-positioned checkpoints drifting off the road.
function sampleSvgPath(path: string) {
  const numbers = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const points: { x: number; y: number }[] = [];
  let [x, y] = numbers;
  for (let i = 2; i < numbers.length; i += 6) {
    const [ax, ay, bx, by, cx, cy] = numbers.slice(i, i + 6);
    for (let j = 0; j <= 2000; j++) {
      const t = j / 2000, u = 1 - t;
      points.push({ x: u ** 3 * x + 3 * u ** 2 * t * ax + 3 * u * t ** 2 * bx + t ** 3 * cx,
        y: u ** 3 * y + 3 * u ** 2 * t * ay + 3 * u * t ** 2 * by + t ** 3 * cy });
    }
    x = cx; y = cy;
  }
  return points;
}

describe('course-map shared route', () => {
  it('clamps parking to the entrance and exit', () => {
    expect(getRoutePose(-50)).toMatchObject({ x: 195, y: 254 });
    expect(getRoutePose(ROUTE_LENGTH + 100)).toMatchObject({ x: 1338, y: 712 });
  });
  it.each([[0, 0], [30, 2], [90, 4], [180, 8], [-90, 12], [-30, 14], [360, 0]])(
    'uses upright fixed-camera sprite for screen heading %d', (heading, index) => {
      expect(getCarSpriteIndex(heading)).toBe(index);
    });
  it('preserves progression order without repeated or backward stops', () => {
    for (let i = 1; i < LEVEL_CHECKPOINTS_LAYOUT.length; i++) {
      expect(LEVEL_CHECKPOINTS_LAYOUT[i].distance - LEVEL_CHECKPOINTS_LAYOUT[i - 1].distance).toBeGreaterThan(50);
    }
  });
  const samples = sampleSvgPath(PROVING_TRACK_PATH);
  for (const cp of LEVEL_CHECKPOINTS_LAYOUT) {
    it(`${cp.levelId} parks directly on the visible route`, () => {
      let error = Infinity;
      for (const p of samples) error = Math.min(error, Math.hypot(p.x - cp.svgX, p.y - cp.svgY));
      expect(error).toBeLessThan(0.25);
    });
  }
});
