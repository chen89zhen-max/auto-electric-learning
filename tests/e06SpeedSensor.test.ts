import { describe, it, expect } from 'vitest';
import {
  E06_STAGE_CONTENT,
  E06_SAMPLES,
  calculateSpeedFrequency,
} from '../src/levels/e06/e06Training';

describe('E06 Speed Sensor and Signal Conditioning Suite', () => {
  it('covers all 5 progressive training stages with comprehensive pedagogy', () => {
    const steps = Object.keys(E06_STAGE_CONTENT);
    expect(steps).toEqual([
      'MAGNETO_VS_HALL_COGNITION',
      'MULTIMETER_AND_OSCILLOSCOPE_TEST',
      'SPEED_FREQUENCY_AND_GAP_CALC',
      'BLIND_SPEED_SENSOR_FAULT_DIAGNOSIS',
      'ENGINEERING_REPAIR_AND_DELIVERY',
    ]);
    steps.forEach((step) => {
      const stage = E06_STAGE_CONTENT[step as keyof typeof E06_STAGE_CONTENT];
      expect(stage.title).toBeTruthy();
      expect(stage.objective).toBeTruthy();
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt).toBeTruthy();
    });
  });

  it('correctly calculates crankshaft tooth pulse frequency across engine speeds', () => {
    // 600 rpm (idle) with 58 teeth -> (600 * 58) / 60 = 580 Hz
    const fIdle = calculateSpeedFrequency(600, 58);
    expect(fIdle).toBe(580);

    // 3000 rpm (highway) with 58 teeth -> (3000 * 58) / 60 = 2900 Hz
    const fCruise = calculateSpeedFrequency(3000, 58);
    expect(fCruise).toBe(2900);
  });

  it('contains valid 4-type sensor samples covering good, open, gap too large, shield broken', () => {
    expect(E06_SAMPLES.length).toBe(4);
    const types = E06_SAMPLES.map((s) => s.actualType);
    expect(types).toContain('GOOD');
    expect(types).toContain('COIL_OPEN');
    expect(types).toContain('GAP_TOO_LARGE');
    expect(types).toContain('SHIELD_BROKEN');
  });
});
