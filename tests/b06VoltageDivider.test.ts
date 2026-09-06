import { describe, expect, it } from 'vitest';
import { buildB06SensorReadings } from '@/src/levels/b06/B06VoltageDividerScene';

describe('B06 NTC divider and loading experiment', () => {
  it('keeps ECU sampling high impedance but exposes low-resistance loading distortion', () => {
    const readings = buildB06SensorReadings(12, 1000, 1000);
    expect(readings.ecuSignal.loadingErrorPercent).toBeLessThan(1);
    expect(readings.lowResistanceLoad.loadedVOut).toBeCloseTo(4, 6);
    expect(readings.lowResistanceLoad.loadingErrorPercent).toBeCloseTo(33.3333, 2);
    expect(readings.hotNtcSignal.loadedVOut).toBeLessThan(readings.coldNtcSignal.loadedVOut);
  });
});
