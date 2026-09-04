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
    expect(decision.ruleId).toBe('SAFE_DEFAULT');
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
