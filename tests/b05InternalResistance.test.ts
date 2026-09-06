import { describe, expect, it } from 'vitest';
import { buildB05BatteryLoadCurve } from '@/src/levels/b05/B05InternalResistanceScene';

describe('B05 source internal-resistance loading experiment', () => {
  it('shows that a near-normal no-load voltage does not prove heavy-load performance', () => {
    const curve = buildB05BatteryLoadCurve(12.6, 0.4);
    expect(curve.noLoad.terminalVoltage).toBeCloseTo(12.6, 4);
    expect(curve.heavyLoad.terminalVoltage).toBeCloseTo(4.2, 4);
    expect(curve.heavyLoad.internalDrop).toBeCloseTo(8.4, 4);
    expect(curve.noLoadVoltageIsNotLoadHealthProof).toBe(true);
  });
});
