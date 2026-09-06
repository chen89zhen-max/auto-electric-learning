import { describe, expect, it } from 'vitest';
import { calculateFaultClassificationCircuit } from '@/src/circuit/solver/DCAnalysisUtils';
import { C02_STAGE_CONTENT, type C02Step } from '@/src/levels/c02/c02Training';
import { getCourseLevel, isLevelPublished } from '@/src/courses/registry';
import { resolveRequestedLevel } from '@/src/app/levelRoute';

describe('C02 同样不亮，原因不同 · 电路断路与短路综合排查', () => {
  it('correctly calculates deterministic parameters for normal, open, short, and high resistance circuits', () => {
    // 1. Normal state
    const normal = calculateFaultClassificationCircuit({
      sourceVoltage: 12.0,
      loadResistance: 6.0,
      faultType: 'NORMAL',
      faultLocation: 'HARNESS_SUPPLY',
      fuseIntact: true,
    });
    expect(normal.circuitCurrent).toBe(2.0);
    expect(normal.lampVoltage).toBe(12.0);
    expect(normal.lampGlow).toBe('BRIGHT');
    expect(normal.fuseBlown).toBe(false);

    // 2. Open circuit at switch
    const open = calculateFaultClassificationCircuit({
      sourceVoltage: 12.0,
      loadResistance: 6.0,
      faultType: 'OPEN_CIRCUIT',
      faultLocation: 'SWITCH',
      fuseIntact: true,
    });
    expect(open.circuitCurrent).toBe(0);
    expect(open.nodeVoltages.switchIn).toBe(12.0);
    expect(open.nodeVoltages.switchOut).toBe(0.0);
    expect(open.lampVoltage).toBe(0);
    expect(open.lampGlow).toBe('DARK');

    // 3. Short to ground (blown fuse)
    const short = calculateFaultClassificationCircuit({
      sourceVoltage: 12.0,
      loadResistance: 6.0,
      faultType: 'SHORT_TO_GROUND',
      faultLocation: 'HARNESS_SUPPLY',
      fuseIntact: true,
    });
    expect(short.fuseBlown).toBe(true);
    expect(short.nodeVoltages.fuseOut).toBe(0);
    expect(short.lampVoltage).toBe(0);

    // 4. High resistance contact (50Ω)
    const highR = calculateFaultClassificationCircuit({
      sourceVoltage: 12.0,
      loadResistance: 6.0,
      faultType: 'HIGH_RESISTANCE',
      faultLocation: 'HARNESS_SUPPLY',
      faultResistance: 50.0,
      fuseIntact: true,
    });
    expect(highR.circuitCurrent).toBeCloseTo(12.0 / 56.0, 4);
    expect(highR.lampVoltage).toBeCloseTo((12.0 / 56.0) * 6.0, 4); // ~1.2857V
    expect(highR.lampGlow).toBe('DARK');
  });

  it('provides complete 5-stage progressive training curriculum and mentor dialogues', () => {
    const requiredSteps: C02Step[] = [
      'SYMPTOM_AND_TOOLS',
      'OPEN_CIRCUIT_ISOLATION',
      'SHORT_CIRCUIT_FUSE_BLOWN',
      'BLIND_THREE_FAULT_ISOLATION',
      'FAULT_REPAIR_AND_PREVENTION',
    ];

    expect(Object.keys(C02_STAGE_CONTENT)).toEqual(requiredSteps);

    for (const step of requiredSteps) {
      const stage = C02_STAGE_CONTENT[step];
      expect(stage.title.length).toBeGreaterThan(5);
      expect(stage.objective.length).toBeGreaterThan(10);
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt.length).toBeGreaterThan(15);
      expect(stage.hint.length).toBeGreaterThan(5);
      expect(['NORMAL', 'WARNING', 'PRAISE', 'THINKING']).toContain(stage.mentorEmotion);
    }
  });

  it('registers C02 as published in the course registry and handles URL routing', () => {
    expect(isLevelPublished('C02')).toBe(true);
    const c02Level = getCourseLevel('C02');
    expect(c02Level?.implemented).toBe(true);
    expect(c02Level?.contentVersion).toBe('1.0.0');
    expect(c02Level?.chapterId).toBe('chapter_c');
    expect(resolveRequestedLevel('?level=C02')).toBe('C02');
  });
});
