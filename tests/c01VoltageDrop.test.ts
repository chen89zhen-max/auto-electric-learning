import { describe, expect, it } from 'vitest';
import { calculateVoltageDropCircuit } from '@/src/circuit/solver/DCAnalysisUtils';
import { C01_STAGE_CONTENT, type C01Step } from '@/src/levels/c01/c01Training';
import { getCourseLevel, isLevelPublished } from '@/src/courses/registry';
import { resolveRequestedLevel } from '@/src/app/levelRoute';

describe('C01 越来越暗的灯 · 带载电压降排查与虚接诊断', () => {
  it('accurately models deterministic benchmark circuit parameters under load', () => {
    // 12V supply, 6Ω lamp load, 0.5Ω supply contact resistance, 0.1Ω ground contact resistance
    const result = calculateVoltageDropCircuit({
      sourceVoltage: 12.0,
      loadResistance: 6.0,
      supplyDropResistance: 0.5,
      groundDropResistance: 0.1,
      isLoaded: true,
    });

    // Total resistance = 0.5 + 6.0 + 0.1 = 6.6Ω
    expect(result.totalResistance).toBeCloseTo(6.6, 3);

    // Current I = 12 / 6.6 ≈ 1.81818A
    expect(result.circuitCurrent).toBeCloseTo(1.81818, 4);

    // Lamp voltage U_lamp = 1.81818 * 6.0 ≈ 10.90909V
    expect(result.lampVoltage).toBeCloseTo(10.90909, 4);

    // Supply voltage drop = 1.81818 * 0.5 ≈ 0.90909V (> 0.2V limit!)
    expect(result.supplyVoltageDrop).toBeCloseTo(0.90909, 4);

    // Ground voltage drop = 1.81818 * 0.1 ≈ 0.18182V
    expect(result.groundVoltageDrop).toBeCloseTo(0.18182, 4);

    // Actual lamp power = 10.90909 * 1.81818 ≈ 19.8347W (dim bulb)
    expect(result.lampPower).toBeCloseTo(19.8347, 3);
  });

  it('demonstrates the unloaded counterexample fallacy: current drops to 0A and open-circuit pin reads 12V', () => {
    const unloaded = calculateVoltageDropCircuit({
      sourceVoltage: 12.0,
      loadResistance: 6.0,
      supplyDropResistance: 0.5,
      groundDropResistance: 0.1,
      isLoaded: false, // Switch open / lamp unplugged
    });

    // Current is 0
    expect(unloaded.circuitCurrent).toBe(0);

    // Voltage drop across 0.5Ω resistor is 0 (V_drop = 0 * 0.5 = 0)
    expect(unloaded.supplyVoltageDrop).toBe(0);
    expect(unloaded.groundVoltageDrop).toBe(0);

    // Lamp pin potential upstream remains at 12.00V (the classic false positive)
    expect(unloaded.lampPositivePotential).toBe(12.0);
  });

  it('verifies post-repair electrical parameters: drop <= 0.05V and lamp power restored to > 23W', () => {
    const repaired = calculateVoltageDropCircuit({
      sourceVoltage: 12.0,
      loadResistance: 6.0,
      supplyDropResistance: 0.01, // Deoxidized, polished and tightened
      groundDropResistance: 0.08,
      isLoaded: true,
    });

    // Circuit current returns to ~1.97A
    expect(repaired.circuitCurrent).toBeGreaterThan(1.95);

    // Supply drop drops below 0.05V (well below 0.2V limit)
    expect(repaired.supplyVoltageDrop).toBeLessThan(0.05);

    // Lamp voltage restored to > 11.7V
    expect(repaired.lampVoltage).toBeGreaterThan(11.7);

    // Lamp power restored to > 23.0W (brilliant incandescent brightness)
    expect(repaired.lampPower).toBeGreaterThan(23.0);
  });

  it('provides complete 5-stage progressive curriculum and mentor dialogues', () => {
    const requiredSteps: C01Step[] = [
      'SYMPTOM_AND_HYPOTHESIS',
      'LOADED_VOLTAGE_DROP_TEST',
      'UNLOADED_COUNTEREXAMPLE',
      'BLIND_FAULT_ISOLATION',
      'REPAIR_AND_CLOSED_LOOP',
    ];

    expect(Object.keys(C01_STAGE_CONTENT)).toEqual(requiredSteps);

    for (const step of requiredSteps) {
      const stage = C01_STAGE_CONTENT[step];
      expect(stage.title.length).toBeGreaterThan(5);
      expect(stage.objective.length).toBeGreaterThan(10);
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt.length).toBeGreaterThan(15);
      expect(stage.hint.length).toBeGreaterThan(5);
      expect(['NORMAL', 'WARNING', 'PRAISE', 'THINKING']).toContain(stage.mentorEmotion);
    }
  });

  it('registers C01 as published and accessible via URL routing', () => {
    expect(isLevelPublished('C01')).toBe(true);
    const c01Level = getCourseLevel('C01');
    expect(c01Level?.implemented).toBe(true);
    expect(c01Level?.contentVersion).toBe('1.0.0');
    expect(c01Level?.chapterId).toBe('chapter_c');
    expect(resolveRequestedLevel('?level=C01')).toBe('C01');
  });
});
