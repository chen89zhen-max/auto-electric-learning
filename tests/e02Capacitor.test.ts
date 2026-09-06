import { describe, it, expect } from 'vitest';
import {
  E02_STAGE_CONTENT,
  E02_SAMPLES,
  calculateTauSeconds,
  calculateVcCharging,
} from '../src/levels/e02/e02Training';

describe('E02 Capacitor and RC Transient Suite', () => {
  it('covers all 5 progressive training stages with full pedagogical guidance', () => {
    const steps = Object.keys(E02_STAGE_CONTENT);
    expect(steps).toEqual([
      'CAPACITOR_STORAGE_COGNITION',
      'MULTIMETER_CAPACITANCE_TEST',
      'RC_TIME_CONSTANT_CURVE',
      'BLIND_CAPACITOR_FAULT_DIAGNOSIS',
      'ENGINEERING_REPAIR_AND_DELIVERY',
    ]);
    steps.forEach((step) => {
      const stage = E02_STAGE_CONTENT[step as keyof typeof E02_STAGE_CONTENT];
      expect(stage.title).toBeTruthy();
      expect(stage.objective).toBeTruthy();
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt).toBeTruthy();
    });
  });

  it('correctly calculates RC time constant tau and transient voltage curve', () => {
    // R = 10k (10000), C = 470uF -> tau = 10000 * 0.00047 = 4.7s
    const tau = calculateTauSeconds(10000, 470);
    expect(tau).toBe(4.7);

    // At 1 tau, Vc should be ~63.2% of 12V = ~7.58V
    const vc1Tau = calculateVcCharging(12.0, 4.7, 4.7);
    expect(vc1Tau).toBeCloseTo(7.59, 1);

    // At 5 tau, Vc should be ~99.3% of 12V = ~11.9V
    const vc5Tau = calculateVcCharging(12.0, 4.7, 4.7 * 5);
    expect(vc5Tau).toBeGreaterThanOrEqual(11.9);
  });

  it('contains valid 4-type blind samples covering good, short, open, degraded', () => {
    expect(E02_SAMPLES.length).toBe(4);
    const types = E02_SAMPLES.map((s) => s.actualType);
    expect(types).toContain('GOOD');
    expect(types).toContain('SHORT');
    expect(types).toContain('OPEN');
    expect(types).toContain('DEGRADED');
  });
});
