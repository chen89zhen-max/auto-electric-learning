import { describe, expect, it } from 'vitest';
import { inspectB03NodeAndLoop } from '@/src/levels/b03/B03KclKvlScene';

describe('B03 KCL/KVL and reference-ground experiment', () => {
  it('preserves a two-point voltage difference after changing the reference node', () => {
    const inspection = inspectB03NodeAndLoop();
    expect(inspection.kclClosed).toBe(true);
    expect(inspection.kvlClosed).toBe(true);
    expect(inspection.original.nodeA).not.toBeCloseTo(inspection.referencedToB.nodeA, 6);
    expect(inspection.original.voltageAB).toBeCloseTo(inspection.referencedToB.voltageAB, 6);
  });
});
