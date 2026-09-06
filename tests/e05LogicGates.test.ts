import { describe, it, expect } from 'vitest';
import {
  E05_STAGE_CONTENT,
  E05_SAMPLES,
  evaluateLogicGate,
} from '../src/levels/e05/e05Training';

describe('E05 Logic Gates and Vehicle Interlock Suite', () => {
  it('covers all 5 progressive training stages with comprehensive pedagogy', () => {
    const steps = Object.keys(E05_STAGE_CONTENT);
    expect(steps).toEqual([
      'LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE',
      'EXPERIMENT_BOX_TRUTH_VERIFICATION',
      'VEHICLE_SAFETY_INTERLOCK_LOGIC',
      'BLIND_LOGIC_IC_FAULT_DIAGNOSIS',
      'ENGINEERING_REPAIR_AND_DELIVERY',
    ]);
    steps.forEach((step) => {
      const stage = E05_STAGE_CONTENT[step as keyof typeof E05_STAGE_CONTENT];
      expect(stage.title).toBeTruthy();
      expect(stage.objective).toBeTruthy();
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt).toBeTruthy();
    });
  });

  it('correctly evaluates Boolean truth tables for all 5 gate types', () => {
    // AND: only (1, 1) is true
    expect(evaluateLogicGate('AND', false, false)).toBe(false);
    expect(evaluateLogicGate('AND', false, true)).toBe(false);
    expect(evaluateLogicGate('AND', true, false)).toBe(false);
    expect(evaluateLogicGate('AND', true, true)).toBe(true);

    // OR: any true is true
    expect(evaluateLogicGate('OR', false, false)).toBe(false);
    expect(evaluateLogicGate('OR', false, true)).toBe(true);
    expect(evaluateLogicGate('OR', true, false)).toBe(true);
    expect(evaluateLogicGate('OR', true, true)).toBe(true);

    // NOT: inverts A
    expect(evaluateLogicGate('NOT', false, false)).toBe(true);
    expect(evaluateLogicGate('NOT', true, false)).toBe(false);

    // NAND: inverted AND
    expect(evaluateLogicGate('NAND', true, true)).toBe(false);
    expect(evaluateLogicGate('NAND', true, false)).toBe(true);

    // NOR: inverted OR
    expect(evaluateLogicGate('NOR', false, false)).toBe(true);
    expect(evaluateLogicGate('NOR', true, false)).toBe(false);
  });

  it('contains valid 4-type logic IC samples covering good, vcc disconnected, input floating, output shorted', () => {
    expect(E05_SAMPLES.length).toBe(4);
    const types = E05_SAMPLES.map((s) => s.actualType);
    expect(types).toContain('GOOD');
    expect(types).toContain('VCC_DISCONNECTED');
    expect(types).toContain('INPUT_FLOATING');
    expect(types).toContain('OUTPUT_SHORT_GND');
  });
});
