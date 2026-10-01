import { describe, expect, it } from 'vitest';
import {
  STANDARD_RESISTOR_POOL,
  hasSensitiveComparison,
  sensitiveResistance,
  type SensitiveResistorKind,
} from '@/src/levels/a03/a03Training';

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

  it('敏感电阻比较门槛：重复同一条件不构成两点比较，跨度39不足而40满足', () => {
    // 仅一个点或同一条件重复记录不构成有效跨度比较
    expect(hasSensitiveComparison([])).toBe(false);
    expect(hasSensitiveComparison([{ condition: 20, resistance: 2500 }])).toBe(false);
    expect(
      hasSensitiveComparison([
        { condition: 20, resistance: 2500 },
        { condition: 20, resistance: 2500 },
      ])
    ).toBe(false);

    // 条件跨度39时为false，恰好40时为true
    expect(
      hasSensitiveComparison([
        { condition: 20, resistance: 2500 },
        { condition: 59, resistance: 633 },
      ])
    ).toBe(false);
    expect(
      hasSensitiveComparison([
        { condition: 20, resistance: 2500 },
        { condition: 60, resistance: 611 },
      ])
    ).toBe(true);
  });

  it('隔离元件教学模型中 NTC、LDR、FSR 的高条件阻值均低于低条件阻值', () => {
    // 明确这些值为隔离元件教学模型，非全车型维修规格
    const kinds: SensitiveResistorKind[] = ['NTC', 'LDR', 'FSR'];
    for (const kind of kinds) {
      const lowCond = kind === 'NTC' ? 20 : 0;
      const highCond = kind === 'NTC' ? 80 : 100;
      const rLow = sensitiveResistance(kind, lowCond);
      const rHigh = sensitiveResistance(kind, highCond);

      expect(rHigh).toBeLessThan(rLow);
      expect(Number.isFinite(rLow)).toBe(true);
      expect(Number.isFinite(rHigh)).toBe(true);
      expect(rHigh).toBeGreaterThan(0);
    }
  });
});

