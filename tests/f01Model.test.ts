import { describe, expect, it } from 'vitest';
import {
  applyF01Action,
  createF01Model,
  evaluateF01Stage,
  getF01Outputs,
  measureF01,
  selectF01ScenarioSeed,
  validateF01CompletionMetrics,
  type F01MeterRequest,
} from '@/src/levels/f01/f01Model';
import { makeValidF01Metrics } from './helpers/f01TestFixtures';

describe('F01 deterministic integrated model', () => {
  it('rotates all three seeds and repeats after three completed attempts', () => {
    const sequence = [1, 2, 3, 4].map((ordinal) =>
      selectF01ScenarioSeed('student1', ordinal),
    );
    expect(new Set(sequence.slice(0, 3)).size).toBe(3);
    expect(sequence[3]).toBe(sequence[0]);
    expect(selectF01ScenarioSeed('student1', 2)).toBe(sequence[1]);
  });

  it('calculates the normal and high-resistance power circuits', () => {
    const a = createF01Model('F01-A');
    const safeA = applyF01Action(a, { type: 'FIX_PREPOWER', defect: 'FLYBACK_DIODE_REVERSED' }).state;
    const poweredA = applyF01Action(safeA, { type: 'SET_POWER', on: true }).state;
    expect(measureF01(poweredA, dcVoltage('supply_connector_drop'))).toMatchObject({ kind: 'reading', value: 1.4118, unit: 'V' });
    expect(measureF01(poweredA, current('main_current_series'))).toMatchObject({ kind: 'reading', value: 1.7647, unit: 'A' });
    const repairedA = applyF01Action(poweredA, { type: 'REPAIR_OPERATIONAL', fault: 'SUPPLY_CONNECTOR_HIGH_RESISTANCE' }).state;
    expect(measureF01(repairedA, current('main_current_series'))).toMatchObject({ kind: 'reading', value: 2, unit: 'A' });
    expect(measureF01(repairedA, dcVoltage('lamp_voltage'))).toMatchObject({ kind: 'reading', value: 10, unit: 'V' });

    const c = createF01Model('F01-C');
    const safeC = applyF01Action(c, { type: 'FIX_PREPOWER', defect: 'RELAY_COIL_COLD_JOINT' }).state;
    const poweredC = applyF01Action(safeC, { type: 'SET_POWER', on: true }).state;
    expect(measureF01(poweredC, dcVoltage('ground_drop'))).toMatchObject({ kind: 'reading', value: 1.0909, unit: 'V' });
    expect(measureF01(poweredC, dcVoltage('lamp_voltage'))).toMatchObject({ kind: 'reading', value: 9.0909, unit: 'V' });
  });

  it('blocks energizing before the visible defect is corrected', () => {
    const state = createF01Model('F01-B');
    const transition = applyF01Action(state, { type: 'SET_POWER', on: true });
    expect(transition).toMatchObject({ allowed: false, code: 'PREPOWER_INTERLOCK' });
    expect(transition.state.powerOn).toBe(false);
  });

  it('blocks live resistance and current-across-source operations', () => {
    let state = createF01Model('F01-C');
    state = applyF01Action(state, { type: 'FIX_PREPOWER', defect: 'RELAY_COIL_COLD_JOINT' }).state;
    state = applyF01Action(state, { type: 'SET_POWER', on: true }).state;
    const liveOhm = measureF01(state, { mode: 'OHM', blackJack: 'COM', redJack: 'V_OHM', target: 'relay_coil_continuity' });
    const currentBridge = measureF01(state, { mode: 'DCA_10', blackJack: 'COM', redJack: '10A', target: 'battery_terminals' });
    expect(liveOhm).toMatchObject({ kind: 'blocked', code: 'LIVE_RESISTANCE' });
    expect(currentBridge).toMatchObject({ kind: 'blocked', code: 'DANGEROUS_BRIDGE' });
    expect(JSON.stringify([liveOhm, currentBridge])).toContain('仿真安全规则已在送电前阻断操作');
    expect(JSON.stringify([liveOhm, currentBridge])).not.toMatch(/纳秒级|1200A|真实断路器|瞬间炸表/);
  });

  it('restores the AND truth table after repair', () => {
    let state = createF01Model('F01-B');
    state = applyF01Action(state, { type: 'FIX_PREPOWER', defect: 'POWER_GROUND_SOLDER_BRIDGE' }).state;
    state = applyF01Action(state, { type: 'REPAIR_OPERATIONAL', fault: 'DIVIDER_UPPER_OPEN' }).state;
    state = applyF01Action(state, { type: 'SET_POWER', on: true }).state;
    const outputs = [[false, false], [false, true], [true, false], [true, true]].map(([a, b]) => {
      const next = applyF01Action(state, { type: 'SET_INPUTS', a, b }).state;
      return getF01Outputs(next).relayOn;
    });
    expect(outputs).toEqual([false, false, false, true]);
  });

  it('accepts only complete evidence for the expected seed', () => {
    const metrics = makeValidF01Metrics('F01-A');
    expect(validateF01CompletionMetrics(metrics, 'F01-A')).toMatchObject({ valid: true });
    expect(validateF01CompletionMetrics(metrics, 'F01-B')).toMatchObject({ valid: false });
    expect(validateF01CompletionMetrics({ ...metrics, operationalFaultFixed: false as unknown as true }, 'F01-A')).toMatchObject({ valid: false });
    expect(validateF01CompletionMetrics({ ...metrics, defenseEvidenceIds: ['missing', metrics.measurementLog[0].id] }, 'F01-A')).toMatchObject({ valid: false });
  });

  it('evaluates stage transitions correctly', () => {
    const stateA = createF01Model('F01-A');
    // Stage 1
    expect(evaluateF01Stage('WORK_ORDER_AND_HYPOTHESIS', stateA, {
      stage: 'WORK_ORDER_AND_HYPOTHESIS',
      identifiedCircuits: ['POWER', 'CONTROL'],
      hypotheses: ['Hypothesis A', 'Hypothesis B'],
    })).toEqual({ passed: true, missing: [] });

    // Stage 2
    const safeA = applyF01Action(stateA, { type: 'FIX_PREPOWER', defect: 'FLYBACK_DIODE_REVERSED' }).state;
    expect(evaluateF01Stage('SAFETY_AND_TEST_PLAN', safeA, {
      stage: 'SAFETY_AND_TEST_PLAN',
      plan: 'OFF_INSPECT_ON_MEASURE_OFF_REPAIR_ON_RETEST',
      prePowerDefectFixed: true,
      measurementLog: [{ id: '1', target: 'flyback_polarity', mode: 'DIODE', value: -0.55, unit: 'V' }],
    })).toEqual({ passed: true, missing: [] });

    // Stage 3
    expect(evaluateF01Stage('EXPECTED_VALUE_CALCULATION', safeA, {
      stage: 'EXPECTED_VALUE_CALCULATION',
      currentA: 2.0,
      lampV: 10.0,
      dividerV: 2.5,
      truthTable: '0001',
    })).toEqual({ passed: true, missing: [] });

    // Stage 4
    const repairedA = applyF01Action(safeA, { type: 'REPAIR_OPERATIONAL', fault: 'SUPPLY_CONNECTOR_HIGH_RESISTANCE' }).state;
    expect(evaluateF01Stage('BLIND_DIAGNOSIS_AND_REPAIR', repairedA, {
      stage: 'BLIND_DIAGNOSIS_AND_REPAIR',
      diagnosis: 'SUPPLY_CONNECTOR_HIGH_RESISTANCE',
      measurementLog: [
        { id: '1', target: 'supply_connector_drop', mode: 'DCV_20', value: 1.4118, unit: 'V' },
        { id: '2', target: 'lamp_voltage', mode: 'DCV_20', value: 8.8235, unit: 'V' },
        { id: '3', target: 'main_current_series', mode: 'DCA_10', value: 1.7647, unit: 'A' },
      ],
    })).toEqual({ passed: true, missing: [] });
  });
});

function dcVoltage(target: F01MeterRequest['target']) {
  return { mode: 'DCV_20' as const, blackJack: 'COM' as const, redJack: 'V_OHM' as const, target };
}

function current(target: F01MeterRequest['target']) {
  return { mode: 'DCA_10' as const, blackJack: 'COM' as const, redJack: '10A' as const, target };
}
