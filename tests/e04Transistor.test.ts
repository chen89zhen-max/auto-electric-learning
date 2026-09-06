import { describe, it, expect } from 'vitest';
import {
  E04_STAGE_CONTENT,
  E04_SAMPLES,
  calculateBjtOperatingPoint,
} from '../src/levels/e04/e04Training';

describe('E04 Transistor Switch and Driver Suite', () => {
  it('covers all 5 progressive training stages with comprehensive pedagogy', () => {
    const steps = Object.keys(E04_STAGE_CONTENT);
    expect(steps).toEqual([
      'TRANSISTOR_PRINCIPLE_COGNITION',
      'MULTIMETER_PIN_AND_BETA_TEST',
      'THREE_OPERATION_STATES_CALC',
      'BLIND_TRANSISTOR_FAULT_DIAGNOSIS',
      'ENGINEERING_REPAIR_AND_DELIVERY',
    ]);
    steps.forEach((step) => {
      const stage = E04_STAGE_CONTENT[step as keyof typeof E04_STAGE_CONTENT];
      expect(stage.title).toBeTruthy();
      expect(stage.objective).toBeTruthy();
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt).toBeTruthy();
    });
  });

  it('correctly calculates Cutoff, Active, and Saturation states', () => {
    // 1. Cutoff: Ub = 0V
    const cutoff = calculateBjtOperatingPoint(0, 2200, 80, 100);
    expect(cutoff.state).toBe('CUTOFF');
    expect(cutoff.ibMa).toBe(0);
    expect(cutoff.uceV).toBe(12.0);

    // 2. Active: Ub = 1.0V, high base resistor 30k -> small Ib
    const active = calculateBjtOperatingPoint(1.0, 30000, 80, 100);
    expect(active.state).toBe('ACTIVE');
    expect(active.uceV).toBeGreaterThan(0.3);
    expect(active.uceV).toBeLessThan(12.0);

    // 3. Saturation: Ub = 5.0V, standard 2.2k base resistor -> plenty of Ib for 150mA load
    const sat = calculateBjtOperatingPoint(5.0, 2200, 80, 100);
    expect(sat.state).toBe('SATURATION');
    expect(sat.uceV).toBeLessThanOrEqual(0.3);
  });

  it('contains valid 4-type transistor driver samples covering normal, short, open, degraded', () => {
    expect(E04_SAMPLES.length).toBe(4);
    const types = E04_SAMPLES.map((s) => s.actualType);
    expect(types).toContain('NORMAL');
    expect(types).toContain('CE_SHORT');
    expect(types).toContain('BE_OPEN');
    expect(types).toContain('BETA_DEGRADED');
  });
});
