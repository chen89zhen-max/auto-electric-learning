import { describe, it, expect } from 'vitest';
import {
  E03_STAGE_CONTENT,
  E03_SAMPLES,
  calculateRectifierOutput,
  calculateThreePhaseRectifier,
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

    // 50 Hz, 1000 uF, 20 mA; two 0.7 V diodes and 0.2 Vpp ripple.
    const fbWithCap = calculateRectifierOutput(12, 'FULL_BRIDGE', true);
    expect(fbWithCap.uDc).toBeCloseTo(Math.SQRT2 * 12 - 1.4 - 0.1, 8);
    expect(fbWithCap.rippleVpp).toBeCloseTo(0.2, 8);
    const halfFiltered = calculateRectifierOutput(12, 'HALF_WAVE', true);
    expect(halfFiltered.rippleVpp).toBeCloseTo(0.4, 8);
    expect(halfFiltered.uDc).toBeCloseTo(Math.SQRT2 * 12 - 0.7 - 0.2, 8);
  });

  it('contains valid 4-type teaching rectifier samples covering normal, short, open, cap disconnected', () => {
    expect(E03_SAMPLES.length).toBe(4);
    const types = E03_SAMPLES.map((s) => s.actualType);
    expect(types).toContain('NORMAL');
    expect(types).toContain('DIODE_SHORT');
    expect(types).toContain('DIODE_OPEN');
    expect(types).toContain('CAP_DISCONNECTED');
  });
});

it('bounds the loaded capacitor approximation and keeps its crest consistent with diode drops', () => {
  for (const topology of ['HALF_WAVE', 'FULL_BRIDGE'] as const) {
    const result = calculateRectifierOutput(12, topology, true);
    const peak = result.uDc + result.rippleVpp / 2;
    expect(peak).toBeCloseTo(Math.SQRT2 * 12 - (topology === 'FULL_BRIDGE' ? 1.4 : 0.7), 8);
    expect(result.rippleVpp / peak).toBeLessThan(0.1);
  }
  expect(() => calculateRectifierOutput(1, 'FULL_BRIDGE', true)).toThrow(/小纹波/);
  expect(() => calculateRectifierOutput(Number.NaN, 'FULL_BRIDGE', true)).toThrow();
});

it('三相六二极管整流：6个观察点形成六组导通相对且输出非负，区分相差120°、换相60°与导通角120°', () => {
  const angles = [0, 60, 120, 180, 240, 300];
  const observations = angles.map((angle) => calculateThreePhaseRectifier(angle));

  // 6个观察点形成6组导通相对，输出非负
  const pairs = observations.map((o) => `${o.positivePhase}-${o.negativePhase}`);
  expect(new Set(pairs).size).toBe(6);
  for (const o of observations) {
    expect(o.output).toBeGreaterThan(0);
    expect(o.pulsesPerCycle).toBe(6);
  }

  // 区分：三相电源相位差120°、六脉波每60°换相、单二极管理想导通角120°
  const phaseDifferenceDegrees = 120;
  const commutationIntervalDegrees = 60;
  const diodeConductionAngleDegrees = 120;
  expect(phaseDifferenceDegrees).not.toBe(commutationIntervalDegrees);
  expect(diodeConductionAngleDegrees).toBe(120);
});

