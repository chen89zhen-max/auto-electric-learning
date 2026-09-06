import { describe, expect, it } from 'vitest';
import { buildB01OhmLawReadings } from '@/src/levels/b01/B01OhmLawScene';

describe('B01 Ohm-law controlled-variable experiment', () => {
  it('keeps resistance constant while voltage changes and predicts the unknown resistor', () => {
    const reading = buildB01OhmLawReadings(12, 6, 3);
    expect(reading.fixedResistance.map((row) => row.current)).toEqual([0.5, 1, 1.5, 2]);
    expect(reading.fixedResistance.every((row) => row.resistance === 6)).toBe(true);
    expect(reading.fixedVoltage.map((row) => row.current)).toEqual([6, 3, 2, 1.5]);
    expect(reading.unknownResistance).toBeCloseTo(4, 6);
  });
});
