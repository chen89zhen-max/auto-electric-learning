import { describe, expect, it } from 'vitest';
import { SafetyRuleEngine } from '@/src/safety/SafetyRuleEngine';
import type { SafetyRule } from '@/src/safety/safetyTypes';
import { createLevel01InitialState, level01Reducer } from '@/src/stores/level01Store';

describe('Sprint 1 milestone 1', () => {
  it('blocks direct person contact while power remains ON', () => {
    const engine = new SafetyRuleEngine();
    const decision = engine.evaluate({
      levelId: 'LEVEL_01',
      stage: 'ACCIDENT_DISCOVERY',
      powerState: 'ON',
      personContactRisk: true,
      operation: 'TOUCH_PERSON',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.ruleId).toBe('SHOCK_DIRECT_CONTACT');
  });

  it('allows person assessment after power is OFF', () => {
    const engine = new SafetyRuleEngine();
    const decision = engine.evaluate({
      levelId: 'LEVEL_01',
      stage: 'FIRST_AID_ASSESSMENT',
      powerState: 'OFF',
      personContactRisk: true,
      operation: 'TOUCH_PERSON',
    });
    expect(decision.allowed).toBe(true);
    expect(decision.ruleId).toBe('SAFE_TOUCH_PERSON');
  });

  it('uses injected configuration without a UI change', () => {
    const customRules: SafetyRule[] = [
      {
        id: 'CUSTOM_CONTACT_RULE',
        when: { operation: 'TOUCH_PERSON' },
        allow: false,
        severity: 'WARNING',
        messageKey: 'CUSTOM_MESSAGE',
      },
    ];
    const engine = new SafetyRuleEngine(customRules);
    expect(engine.evaluate({ levelId: 'LEVEL_01', stage: 'ACCIDENT_DISCOVERY', operation: 'TOUCH_PERSON' })).toMatchObject({
      allowed: false,
      ruleId: 'CUSTOM_CONTACT_RULE',
      messageKey: 'CUSTOM_MESSAGE',
    });
  });

  it('keeps the student in environment checking when first aid is attempted early', () => {
    let state = createLevel01InitialState(false, 1_000);
    state = level01Reducer(state, { type: 'ACCEPT_WORK_ORDER' });
    state = level01Reducer(state, { type: 'CHECK_ENVIRONMENT' });
    state = level01Reducer(state, { type: 'TOUCH_PERSON' });
    expect(state.currentStage).toBe('ENVIRONMENT_CHECK');
  });

  it('records the blocked contact and reaches first aid only after isolation and micro learning', () => {
    let state = createLevel01InitialState(false, 1_000);
    state = level01Reducer(state, { type: 'ACCEPT_WORK_ORDER' });
    state = level01Reducer(state, { type: 'TOUCH_PERSON' });
    expect(state.eventLog.slice(-2).map((event) => event.action)).toEqual(['DIRECT_CONTACT_ATTEMPT', 'SECONDARY_RISK_WARNING']);
    state = level01Reducer(state, { type: 'CHECK_ENVIRONMENT' });
    state = level01Reducer(state, { type: 'ISOLATE_POWER' });
    expect(state.powerState).toBe('OFF');
    expect(state.eventLog.at(-1)?.action).toBe('POWER_ISOLATED');
    state = level01Reducer(state, { type: 'OPEN_KNOWLEDGE' });
    for (const knowledgeId of ['SHOCK_RISK', 'SINGLE_PHASE', 'TWO_PHASE', 'STEP_VOLTAGE', 'SAFE_VOLTAGE']) {
      state = level01Reducer(state, { type: 'COMPLETE_MICRO_SCENARIO', knowledgeId });
    }
    expect(state.currentStage).toBe('FIRST_AID_ASSESSMENT');
  });
});

function reachFireEvent() {
  let state = createLevel01InitialState(false, 1_000);
  state = level01Reducer(state, { type: 'ACCEPT_WORK_ORDER' });
  state = level01Reducer(state, { type: 'CHECK_ENVIRONMENT' });
  state = level01Reducer(state, { type: 'ISOLATE_POWER' });
  state = level01Reducer(state, { type: 'OPEN_KNOWLEDGE' });
  for (const knowledgeId of ['SHOCK_RISK', 'SINGLE_PHASE', 'TWO_PHASE', 'STEP_VOLTAGE', 'SAFE_VOLTAGE']) {
    state = level01Reducer(state, { type: 'COMPLETE_MICRO_SCENARIO', knowledgeId });
  }
  for (const action of ['CHECK_RESPONSE', 'CALL_HELP', 'CHECK_BREATHING'] as const) {
    state = level01Reducer(state, { type: 'FIRST_AID_ACTION', action });
  }
  for (let index = 0; index < 6; index += 1) state = level01Reducer(state, { type: 'PRACTICE_FIRST_AID' });
  return level01Reducer(state, { type: 'COMPLETE_FIRST_AID' });
}

describe('Sprint 1 milestone 2', () => {
  it('blocks unsafe fire responses through SafetyRuleEngine', () => {
    let state = reachFireEvent();
    state = level01Reducer(state, { type: 'USE_WATER' });
    expect(state.currentStage).toBe('FIRE_EVENT');
    expect(state.eventLog.at(-1)?.action).toBe('UNSAFE_FIRE_RESPONSE');
    expect(state.lastSafetyDecision?.ruleId).toBe('ELECTRICAL_FIRE_WATER');

    state = level01Reducer(state, { type: 'CHECK_FIRE_DEVICE' });
    state = level01Reducer(state, { type: 'ACK_FIRE_KNOWLEDGE' });
    state = level01Reducer(state, { type: 'CHECK_FIRE_POWER' });
    state = level01Reducer(state, { type: 'SELECT_EXTINGUISHER', extinguisherType: 'CO2' });
    expect(state.currentStage).toBe('FIRE_RISK_ASSESSMENT');
    expect(state.eventLog.at(-1)?.action).toBe('UNSAFE_FIRE_RESPONSE');
    expect(state.lastSafetyDecision?.ruleId).toBe('POWERED_FIRE_EXTINGUISHER');

    state = level01Reducer(state, { type: 'ISOLATE_FIRE_POWER' });
    state = level01Reducer(state, { type: 'SELECT_EXTINGUISHER', extinguisherType: 'FOAM' });
    expect(state.currentStage).toBe('FIRE_RISK_ASSESSMENT');
    expect(state.lastSafetyDecision?.ruleId).toBe('ELECTRICAL_FIRE_FOAM');
  });

  it('completes every stage, emits core logs, and generates the ability report', () => {
    let state = reachFireEvent();
    state = level01Reducer(state, { type: 'CHECK_FIRE_DEVICE' });
    state = level01Reducer(state, { type: 'ACK_FIRE_KNOWLEDGE' });
    state = level01Reducer(state, { type: 'CHECK_FIRE_POWER' });
    state = level01Reducer(state, { type: 'ISOLATE_FIRE_POWER' });
    state = level01Reducer(state, { type: 'SELECT_EXTINGUISHER', extinguisherType: 'CO2' });
    state = level01Reducer(state, { type: 'EXECUTE_FIRE_RESPONSE' });
    state = level01Reducer(state, { type: 'TRANSFER_ACTION', operation: 'OBSERVE_STATUS' });
    for (const stepId of ['OBSERVE', 'JUDGE', 'CONTROL', 'RESPOND', 'CONFIRM']) {
      state = level01Reducer(state, { type: 'ADD_REFLECTION_STEP', stepId });
    }
    state = level01Reducer(state, { type: 'SUBMIT_REFLECTION' });

    expect(state.currentStage).toBe('COMPLETE');
    expect(state.completedObjectives).toHaveLength(5);
    expect(state.abilityReport?.dimensions).toHaveLength(5);
    expect(state.eventLog.at(-1)?.action).toBe('LEVEL_COMPLETE');
    expect(state.eventLog.map((event) => event.action)).toEqual(expect.arrayContaining([
      'ACCIDENT_DISCOVERED',
      'ENVIRONMENT_CHECK',
      'POWER_STATE_VIEWED',
      'POWER_ISOLATED',
      'MICRO_SCENARIO_COMPLETE',
      'FIRST_AID_ASSESSMENT_START',
      'CONSCIOUSNESS_CHECK',
      'HELP_CALLED',
      'FIRST_AID_SEQUENCE_COMPLETE',
      'FIRE_EVENT_START',
      'FIRE_POWER_CHECK',
      'EXTINGUISHER_SELECTED',
      'FIRE_RESPONSE_SUCCESS',
      'TRANSFER_CHECK_SUBMIT',
      'REFLECTION_SUBMIT',
      'ABILITY_REPORT_GENERATED',
      'LEVEL_COMPLETE',
    ]));
  });

  it('uses safety rules for wrong operations in the transfer scene', () => {
    let state = reachFireEvent();
    state = level01Reducer(state, { type: 'CHECK_FIRE_DEVICE' });
    state = level01Reducer(state, { type: 'ACK_FIRE_KNOWLEDGE' });
    state = level01Reducer(state, { type: 'CHECK_FIRE_POWER' });
    state = level01Reducer(state, { type: 'ISOLATE_FIRE_POWER' });
    state = level01Reducer(state, { type: 'SELECT_EXTINGUISHER', extinguisherType: 'DRY_CHEMICAL' });
    state = level01Reducer(state, { type: 'EXECUTE_FIRE_RESPONSE' });
    state = level01Reducer(state, { type: 'TRANSFER_ACTION', operation: 'CHANGE_COMPONENT' });
    expect(state.currentStage).toBe('TRANSFER_CHECK');
    expect(state.lastSafetyDecision?.ruleId).toBe('LIVE_COMPONENT_CHANGE');
  });
});
