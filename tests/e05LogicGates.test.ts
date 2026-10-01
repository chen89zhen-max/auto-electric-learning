import { describe, it, expect } from 'vitest';
import {
  E05_STAGE_CONTENT,
  E05_SAMPLES,
  evaluateLogicGate,
  GATE_REQUIRED_INPUTS,
  gateReadingKey,
  hasAllGateEvidence,
  type GateReading,
  type LogicGateType,
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

  it('固定14组关键输入证据防伪：缺项、输出伪造或键不匹配时 hasAllGateEvidence 均为 false', () => {
    // 1. 验证 GATE_REQUIRED_INPUTS 精确为 14 个输入
    expect(GATE_REQUIRED_INPUTS).toEqual({
      AND: ['01', '10', '11'],
      OR: ['00', '01', '10'],
      NOT: ['0', '1'],
      NAND: ['01', '10', '11'],
      NOR: ['00', '01', '10'],
    });

    const totalKeyCount = Object.values(GATE_REQUIRED_INPUTS).reduce(
      (sum, arr) => sum + arr.length,
      0
    );
    expect(totalKeyCount).toBe(14);

    // 2. 构造完整真实记录
    const validReadings: Record<string, GateReading> = {};
    for (const [gate, inputs] of Object.entries(GATE_REQUIRED_INPUTS) as [LogicGateType, readonly string[]][]) {
      for (const input of inputs) {
        const a = input[0] === '1';
        const b = input.length > 1 ? input[1] === '1' : false;
        const output = evaluateLogicGate(gate, a, b);
        const key = gateReadingKey(gate, a, b);
        validReadings[key] = { gate, a, b, output };
      }
    }

    // 验证每种门包含输出0和1的证据，并保留01与10输入
    for (const [gate, inputs] of Object.entries(GATE_REQUIRED_INPUTS) as [LogicGateType, readonly string[]][]) {
      const gateOutputs = inputs.map(input => {
        const key = `${gate}:${input}`;
        return validReadings[key].output;
      });
      expect(gateOutputs).toContain(true);
      expect(gateOutputs).toContain(false);
      if (gate !== 'NOT') {
        expect(inputs).toContain('01');
        expect(inputs).toContain('10');
      }
    }

    // 完整真实记录为 true
    expect(hasAllGateEvidence(validReadings)).toBe(true);

    // 缺 1 项时为 false
    const missingOne = { ...validReadings };
    delete missingOne['NAND:11'];
    expect(hasAllGateEvidence(missingOne)).toBe(false);

    // 输出值伪造时为 false (例如 NAND 11 输出本应为 false，伪造为 true)
    const forgedOutput = {
      ...validReadings,
      'NAND:11': { gate: 'NAND' as const, a: true, b: true, output: true },
    };
    expect(hasAllGateEvidence(forgedOutput)).toBe(false);

    // 门类型不一致时为 false
    const mismatchedGate = {
      ...validReadings,
      'NOR:00': { gate: 'OR' as const, a: false, b: false, output: true },
    };
    expect(hasAllGateEvidence(mismatchedGate)).toBe(false);

    // 输入键不一致时为 false
    const mismatchedKey = { ...validReadings };
    delete mismatchedKey['AND:01'];
    mismatchedKey['AND:00'] = { gate: 'AND' as const, a: false, b: false, output: false };
    expect(hasAllGateEvidence(mismatchedKey)).toBe(false);
  });
});
