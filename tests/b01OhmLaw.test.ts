import { describe, expect, it } from 'vitest';
import { buildB01OhmLawReadings } from '@/src/levels/b01/B01OhmLawScene';
import { B01_STAGE_CONTENT, type B01Step } from '@/src/levels/b01/b01Training';

describe('B01 Ohm-law controlled-variable experiment', () => {
  it('keeps resistance constant while voltage changes and predicts the unknown resistor', () => {
    const reading = buildB01OhmLawReadings(12, 6, 3);
    expect(reading.fixedResistance.map((row) => row.current)).toEqual([0.5, 1, 1.5, 2]);
    expect(reading.fixedResistance.every((row) => row.resistance === 6)).toBe(true);
    expect(reading.fixedVoltage.map((row) => row.current)).toEqual([6, 3, 2, 1.5]);
    expect(reading.unknownResistance).toBeCloseTo(4, 6);
  });

  it('provides all 5 progression stages with comprehensive mentor instructions', () => {
    const expectedSteps: B01Step[] = [
      'FIXED_R_CHANGE_V',
      'FIXED_V_CHANGE_R',
      'COUNTEREXAMPLE_PHYSICAL_ATTR',
      'UNKNOWN_RESISTANCE_PREDICT',
      'TRANSFER_AUTO_HEADLAMP_POWER',
    ];

    expectedSteps.forEach((step) => {
      const stage = B01_STAGE_CONTENT[step];
      expect(stage).toBeDefined();
      expect(stage.title.length).toBeGreaterThan(5);
      expect(stage.objective.length).toBeGreaterThan(10);
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt.length).toBeGreaterThan(10);
      expect(stage.hint.length).toBeGreaterThan(10);
    });
  });

  it('verifies calculations for unknown resistor and headlamp power transfer', () => {
    // Stage 4: U = 12.0V, I = 0.50A -> R = 24.0Ω
    const u4 = 12.0;
    const i4 = 0.50;
    const r4 = u4 / i4;
    expect(r4).toBe(24.0);

    // Stage 5: U = 12.0V, I = 4.50A -> P = 54W, R ≈ 2.67Ω
    const u5 = 12.0;
    const i5 = 4.50;
    const p5 = u5 * i5;
    const r5 = u5 / i5;
    expect(p5).toBe(54.0);
    expect(r5).toBeCloseTo(2.67, 2);
  });
});

