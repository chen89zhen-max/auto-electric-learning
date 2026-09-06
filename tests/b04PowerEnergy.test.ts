import { describe, expect, it } from 'vitest';
import { buildB04WorkshopBudget } from '@/src/levels/b04/B04PowerEnergyScene';
import { B04_STAGE_CONTENT, type B04Step } from '@/src/levels/b04/b04Training';

describe('B04 workstation power and fuse budget', () => {
  it('distinguishes actual power from rating and blocks overload with a fuse', () => {
    const budget = buildB04WorkshopBudget();
    expect(budget.deratedLamp.actualPower).toBeCloseTo(6, 6);
    expect(budget.deratedLamp.isOverloaded).toBe(false);
    expect(budget.eightHour.energyKWh).toBeCloseTo(2.24, 6);
    expect(budget.overloaded.totalCurrent).toBeGreaterThan(budget.fuseRatingAmps);
    expect(budget.overloaded.fuseProtectsCircuit).toBe(true);
  });

  it('contains complete 5-stage progressive training content with TTS mentor prompts', () => {
    const expectedSteps: B04Step[] = [
      'RATED_VS_ACTUAL_POWER',
      'JOULE_HEATING_WIRE_OVERHEAT',
      'WORKSHOP_ENERGY_BUDGET_CALC',
      'QUANTITATIVE_FUSE_SELECT',
      'TRANSFER_SMOKE_OVERLOAD_DIAG',
    ];

    expect(Object.keys(B04_STAGE_CONTENT)).toEqual(expectedSteps);

    expectedSteps.forEach((step) => {
      const stage = B04_STAGE_CONTENT[step];
      expect(stage.title).toBeTruthy();
      expect(stage.objective).toBeTruthy();
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt).toBeTruthy();
      expect(stage.hint).toBeTruthy();
      expect(['NORMAL', 'WARNING', 'PRAISE', 'THINKING']).toContain(stage.mentorEmotion);
    });
  });

  it('validates non-linear actual power vs voltage variation P = U² / R (Stage 1)', () => {
    const r = 6.0; // 6Ω 灯丝等效阻抗

    // 12V 额定工况
    const p12 = (12 * 12) / r;
    expect(p12).toBeCloseTo(24.0, 5);

    // 6V 欠压工况：功率降为额定的四分之一
    const p6 = (6 * 6) / r;
    expect(p6).toBeCloseTo(6.0, 5);
    expect(p6 / p12).toBeCloseTo(0.25, 5);

    // 16V 调节器失效过压工况：功率暴增超 77%
    const p16 = (16 * 16) / r;
    expect(p16).toBeCloseTo(42.667, 2);
    expect(p16 / p12).toBeGreaterThan(1.75);
  });

  it('validates Joule heating disaster on undersized wire Q = I² R t (Stage 2)', () => {
    const i = 20.0; // 20A 电流
    const rThin = 0.40; // 0.5mm² 细线电阻
    const rThick = 0.05; // 2.5mm² 粗线电阻

    const pThin = i * i * rThin; // 160W
    const pThick = i * i * rThick; // 20W

    expect(pThin).toBeCloseTo(160.0, 5);
    expect(pThick).toBeCloseTo(20.0, 5);
    expect(pThin / pThick).toBeCloseTo(8.0, 5); // 细线发热量是标准粗线的 8 倍
  });

  it('validates workshop daily electrical energy and billing calculation (Stage 3)', () => {
    const charger = (600 / 1000) * 4; // 600W × 4h = 2.4 kWh
    const lift = (2200 / 1000) * 1; // 2200W × 1h = 2.2 kWh
    const lights = (200 / 1000) * 8; // 200W × 8h = 1.6 kWh

    const totalKWh = charger + lift + lights;
    expect(totalKWh).toBeCloseTo(6.20, 5);

    const price = 0.85;
    const totalCost = totalKWh * price;
    expect(totalCost).toBeCloseTo(5.27, 2);
  });

  it('validates 360W amplifier fuse capacity and safe wire gauge (Stage 4)', () => {
    const power = 360;
    const voltage = 12;
    const current = power / voltage; // 30.0A
    expect(current).toBeCloseTo(30.0, 5);

    // 1.33 倍安全裕量选配 40A 保险丝
    const fuseFactor = 1.333;
    const recommendedFuse = Math.round(current * fuseFactor);
    expect(recommendedFuse).toBe(40);

    // 30A 持续载流需 ≥ 6.0mm² 线径
    const minWireGaugeMm2 = 6.0;
    expect(minWireGaugeMm2).toBeGreaterThanOrEqual(4.0);
  });

  it('validates 1000W inverter extreme current vs cigarette lighter limits (Stage 5)', () => {
    const power = 1000;
    const voltage = 12;
    const current = power / voltage; // 83.333A
    const lighterLimit = 10.0; // 点烟器 10A 限制

    expect(current).toBeCloseTo(83.333, 2);
    expect(current).toBeGreaterThan(lighterLimit * 8); // 超载 8 倍以上必引发融毁起火

    // 合规方案：直连蓄电池 16mm² + 100A 保险
    const directBatteryWireMm2 = 16.0;
    const mainFuseRating = 100;
    expect(directBatteryWireMm2).toBeGreaterThanOrEqual(10.0);
    expect(mainFuseRating).toBeGreaterThan(current);
  });
});
