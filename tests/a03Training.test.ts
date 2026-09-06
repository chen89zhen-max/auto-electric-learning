import { describe, expect, it } from 'vitest';
import { STANDARD_RESISTOR_POOL } from '@/src/levels/a03/scenes/A03ResistanceScene';

describe('A03 色环电阻规格池与公差规则验证', () => {
  it('色环电阻池包含多种规格且涵盖金色 (±5%) 与银色 (±10%) 公差', () => {
    expect(STANDARD_RESISTOR_POOL.length).toBeGreaterThanOrEqual(6);

    const hasGold = STANDARD_RESISTOR_POOL.some((r) => r.tolerance === 5);
    const hasSilver = STANDARD_RESISTOR_POOL.some((r) => r.tolerance === 10);

    expect(hasGold).toBe(true);
    expect(hasSilver).toBe(true);
  });

  it('每一颗电阻的标称阻值与色环计算一致，且允许上下限计算正确', () => {
    for (const r of STANDARD_RESISTOR_POOL) {
      const d1 = r.bands[0].value;
      const d2 = r.bands[1].value;
      const multPow = r.bands[2].value;
      const tol = r.bands[3].value;

      const calcNominal = (d1 * 10 + d2) * Math.pow(10, multPow);
      expect(calcNominal).toBe(r.nominal);
      expect(tol).toBe(r.tolerance);

      const delta = r.nominal * (r.tolerance / 100);
      expect(r.expectedMin).toBeCloseTo(r.nominal - delta);
      expect(r.expectedMax).toBeCloseTo(r.nominal + delta);

      // Step 2 联动样品验证：样品 A 必须合格，样品 B 必须超差
      expect(r.sampleAValue).toBeGreaterThanOrEqual(r.expectedMin);
      expect(r.sampleAValue).toBeLessThanOrEqual(r.expectedMax);

      const isSampleBOutOfRange =
        r.sampleBValue < r.expectedMin || r.sampleBValue > r.expectedMax;
      expect(isSampleBOutOfRange).toBe(true);
    }
  });
});
