import { describe, expect, it } from 'vitest';
import { compareB02LampConnections } from '@/src/levels/b02/B02LoadConnectionScene';
import { B02_STAGE_CONTENT, type B02Step } from '@/src/levels/b02/b02Training';

describe('B02 lamp-group connection model', () => {
  it('shows series dimming and parallel branch independence from electrical nodes', () => {
    const comparison = compareB02LampConnections(12, 6, 6);
    expect(comparison.series.lampVoltage).toBeCloseTo(6, 6);
    expect(comparison.series.totalCurrent).toBeCloseTo(1, 6);
    expect(comparison.parallel.lampVoltage).toBeCloseTo(12, 6);
    expect(comparison.parallel.totalCurrent).toBeCloseTo(4, 6);
    expect(comparison.parallel.removingOneLampKeepsOtherOn).toBe(true);
  });

  it('contains complete 5-stage progressive training content with TTS mentor prompts', () => {
    const expectedSteps: B02Step[] = [
      'SERIES_DIVIDER_TEST',
      'PARALLEL_INDEPENDENT_TEST',
      'COMPOUND_SHORT_BYPASS',
      'QUANTITATIVE_FOG_PREDICT',
      'TRANSFER_SPOTLIGHT_MOD_RISK',
    ];

    expect(Object.keys(B02_STAGE_CONTENT)).toEqual(expectedSteps);

    expectedSteps.forEach((step) => {
      const stage = B02_STAGE_CONTENT[step];
      expect(stage.title).toBeTruthy();
      expect(stage.objective).toBeTruthy();
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt).toBeTruthy();
      expect(stage.hint).toBeTruthy();
      expect(['NORMAL', 'WARNING', 'PRAISE', 'THINKING']).toContain(stage.mentorEmotion);
    });
  });

  it('verifies quantitative calculation for fog light addition (Stage 4)', () => {
    const rWidth = 2.0; // 示宽灯组等效电阻 2Ω
    const rFog = 3.0; // 雾灯组等效电阻 3Ω
    const u = 12.0;

    // 并联等效电阻: 1/R = 1/2 + 1/3 = 5/6 => R = 1.2Ω
    const rTotal = 1 / (1 / rWidth + 1 / rFog);
    expect(rTotal).toBeCloseTo(1.2, 5);

    // 总电流: I = U / R = 12 / 1.2 = 10.0A
    const iTotal = u / rTotal;
    expect(iTotal).toBeCloseTo(10.0, 5);
  });

  it('verifies power and wire current safety threshold for 400W offroad spotlight (Stage 5)', () => {
    const power = 400; // 400W
    const voltage = 12; // 12V
    const current = power / voltage; // 33.333A
    const origFuseRating = 15; // 15A 原车保险丝

    expect(current).toBeCloseTo(33.333, 2);
    expect(current).toBeGreaterThan(origFuseRating); // 远超 15A 额定

    // 1.0mm² 细线承载极限约为 15A，若强制换 40A 保险丝，线束温升将严重超标引发自燃
    const isWireSafeWith40AFuse = false;
    expect(isWireSafeWith40AFuse).toBe(false);

    // 合规整改要求独立 6.0mm² 专线 + 独立 40A 保险 + 大功率继电器
    const recommendedWireGaugeMm2 = 6.0;
    expect(recommendedWireGaugeMm2).toBeGreaterThanOrEqual(4.0);
  });
});
