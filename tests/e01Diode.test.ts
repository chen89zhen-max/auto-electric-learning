import { describe, it, expect } from 'vitest';
import {
  E01_STAGE_CONTENT,
  E01_SAMPLES,
  calculateLedResistor,
  calculateLedCurrentMa,
} from '../src/levels/e01/e01Training';

describe('E01 Diode and LED Application Suite', () => {
  it('covers all 5 progressive training stages with full guidance', () => {
    const steps = Object.keys(E01_STAGE_CONTENT);
    expect(steps).toEqual([
      'DIODE_CONDUCTION_COGNITION',
      'MULTIMETER_DIODE_TEST',
      'ZENER_AND_LED_CALCULATION',
      'BLIND_DIODE_FAULT_DIAGNOSIS',
      'ENGINEERING_REPAIR_AND_DELIVERY',
    ]);
    steps.forEach((step) => {
      const stage = E01_STAGE_CONTENT[step as keyof typeof E01_STAGE_CONTENT];
      expect(stage.title).toBeTruthy();
      expect(stage.objective).toBeTruthy();
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt).toBeTruthy();
    });
  });

  it('correctly calculates LED current-limiting resistor and branch current', () => {
    // 12V system, 2V LED, 20mA target -> (12 - 2) / 0.02 = 500 Ohm
    const r = calculateLedResistor(12, 2, 20);
    expect(r).toBe(500);

    // Current with 500 Ohm: (12 - 2) / 500 = 0.02A = 20mA
    const i = calculateLedCurrentMa(12, 2, 500);
    expect(i).toBe(20);

    // If small resistor 10 Ohm: (12 - 2) / 10 = 1A = 1000mA (burn danger!)
    const iDanger = calculateLedCurrentMa(12, 2, 10);
    expect(iDanger).toBe(1000);
  });

  it('contains valid 4-type blind samples covering normal, short, open, reverse-leak', () => {
    expect(E01_SAMPLES.length).toBe(4);
    const types = E01_SAMPLES.map((s) => s.actualType);
    expect(types).toContain('NORMAL');
    expect(types).toContain('SHORT');
    expect(types).toContain('OPEN');
    expect(types).toContain('REVERSE_LEAK');
  });
});
