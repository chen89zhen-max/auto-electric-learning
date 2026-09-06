import { describe, expect, it } from 'vitest';
import { compareB02LampConnections } from '@/src/levels/b02/B02LoadConnectionScene';

describe('B02 lamp-group connection model', () => {
  it('shows series dimming and parallel branch independence from electrical nodes', () => {
    const comparison = compareB02LampConnections(12, 6, 6);
    expect(comparison.series.lampVoltage).toBeCloseTo(6, 6);
    expect(comparison.series.totalCurrent).toBeCloseTo(1, 6);
    expect(comparison.parallel.lampVoltage).toBeCloseTo(12, 6);
    expect(comparison.parallel.totalCurrent).toBeCloseTo(4, 6);
    expect(comparison.parallel.removingOneLampKeepsOtherOn).toBe(true);
  });
});
