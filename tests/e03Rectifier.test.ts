import { describe, it, expect } from 'vitest';
import {
  E03_STAGE_CONTENT,
  E03_SAMPLES,
  calculateRectifierOutput,
} from '../src/levels/e03/e03Training';

describe('E03 Rectifier and Filter Circuit Suite', () => {
  it('covers all 5 progressive training stages with comprehensive pedagogy', () => {
    const steps = Object.keys(E03_STAGE_CONTENT);
    expect(steps).toEqual([
      'RECTIFIER_TOPOLOGY_COGNITION',
      'BRIDGE_WIRING_AND_MULTIMETER_TEST',
      'FILTER_CAPACITOR_AND_VOLTAGE_CALC',
      'BLIND_RECTIFIER_FAULT_DIAGNOSIS',
      'ENGINEERING_REPAIR_AND_DELIVERY',
    ]);
    steps.forEach((step) => {
      const stage = E03_STAGE_CONTENT[step as keyof typeof E03_STAGE_CONTENT];
      expect(stage.title).toBeTruthy();
      expect(stage.objective).toBeTruthy();
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt).toBeTruthy();
    });
  });

  it('correctly calculates half-wave and full-bridge rectifier outputs with/without filter cap', () => {
    // 12V AC input:
    // Half wave without cap: ~0.45 * 12 = 5.4V
    const hwNoCap = calculateRectifierOutput(12, 'HALF_WAVE', false);
    expect(hwNoCap.uDc).toBe(5.4);

    // Full bridge without cap: ~0.9 * 12 = 10.8V
    const fbNoCap = calculateRectifierOutput(12, 'FULL_BRIDGE', false);
    expect(fbNoCap.uDc).toBe(10.8);

    // Full bridge with cap: ~1.2 * 12 = 14.4V (automotive alternator standard!)
    const fbWithCap = calculateRectifierOutput(12, 'FULL_BRIDGE', true);
    expect(fbWithCap.uDc).toBe(14.4);
    expect(fbWithCap.rippleVpp).toBeLessThan(0.3); // smooth!
  });

  it('contains valid 4-type alternator rectifier samples covering normal, short, open, cap disconnected', () => {
    expect(E03_SAMPLES.length).toBe(4);
    const types = E03_SAMPLES.map((s) => s.actualType);
    expect(types).toContain('NORMAL');
    expect(types).toContain('DIODE_SHORT');
    expect(types).toContain('DIODE_OPEN');
    expect(types).toContain('CAP_DISCONNECTED');
  });
});
