'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import firstAidConfig from '@/src/levels/level01/firstAidConfig.json';
import levelConfigData from '@/src/levels/level01/level01.json';
import scenarioData from '@/src/levels/level01/scenario.json';
import type { EventAction, GameEvent, LevelConfig } from '@/src/core/types';
import { EventLogger } from '@/src/logging/EventLogger';
import { LevelEngine } from '@/src/engine/LevelEngine';
import { ScenarioEngine } from '@/src/scenario/ScenarioEngine';
import type { ScenarioConfig } from '@/src/scenario/scenarioTypes';
import { safetyRuleEngine } from '@/src/safety/SafetyRuleEngine';
import { abilityTracker } from '@/src/abilities/AbilityTracker';
import { reflectionEngine } from '@/src/reflection/ReflectionEngine';
import type { ExtinguisherType, Level01Objective, Level01Stage, Level01State } from '@/src/levels/level01/level01Types';

export const level01Engine = new LevelEngine(levelConfigData as LevelConfig);
export const level01ScenarioEngine = new ScenarioEngine(scenarioData as ScenarioConfig<Level01Stage>);

export type Level01Action =
  | { type: 'OPEN_WORK_ORDER' }
  | { type: 'CLOSE_WORK_ORDER' }
  | { type: 'ACCEPT_WORK_ORDER' }
  | { type: 'CHECK_ENVIRONMENT' }
  | { type: 'TOUCH_PERSON' }
  | { type: 'ISOLATE_POWER' }
  | { type: 'REQUEST_HINT' }
  | { type: 'OPEN_KNOWLEDGE' }
  | { type: 'COMPLETE_MICRO_SCENARIO'; knowledgeId: string }
  | { type: 'FIRST_AID_ACTION'; action: 'CHECK_RESPONSE' | 'CALL_HELP' | 'CHECK_BREATHING' }
  | { type: 'PRACTICE_FIRST_AID' }
  | { type: 'COMPLETE_FIRST_AID' }
  | { type: 'USE_WATER' }
  | { type: 'REQUEST_FIRE_SUPPORT' }
  | { type: 'CHECK_FIRE_DEVICE' }
  | { type: 'ACK_FIRE_KNOWLEDGE' }
  | { type: 'CHECK_FIRE_POWER' }
  | { type: 'ISOLATE_FIRE_POWER' }
  | { type: 'SELECT_EXTINGUISHER'; extinguisherType: ExtinguisherType }
  | { type: 'EXECUTE_FIRE_RESPONSE' }
  | { type: 'TRANSFER_ACTION'; operation: 'OBSERVE_STATUS' | 'OPEN_DEVICE' | 'CHANGE_COMPONENT' }
  | { type: 'ADD_REFLECTION_STEP'; stepId: string }
  | { type: 'RESET_REFLECTION' }
  | { type: 'SUBMIT_REFLECTION' }
  | { type: 'CLEAR_FEEDBACK' }
  | { type: 'RESTART' };

function getHint(state: Level01State, level: number): string {
  const hintsByStage = state.currentStage.startsWith('FIRE')
    ? ['这是什么设备？', '先查看配电箱的电源状态。', '先切断相关电源，再选择适用灭火器。']
    : state.currentStage.startsWith('FIRST_AID')
      ? ['现场现在安全吗？', '先检查人员反应，并呼叫周围人员支援。', '检查反应 → 呼叫支援 → 检查呼吸。']
      : ['设备现在是什么状态？', '先检查训练台是否仍在工作。', '先切断相关电源，再接近人员。'];
  return hintsByStage[level - 1];
}

function createEvent(state: Level01State, action: EventAction, payload: Record<string, unknown> = {}, stage = state.currentStage): GameEvent {
  return EventLogger.createEvent(state.sessionId, state.currentLevel, stage, action, payload);
}

function appendEvents(state: Level01State, entries: Array<{ action: EventAction; payload?: Record<string, unknown>; stage?: Level01Stage }>): GameEvent[] {
  return [...state.eventLog, ...entries.map((entry) => createEvent(state, entry.action, entry.payload, entry.stage))];
}

function addObjective(state: Level01State, objective: Level01Objective): Level01Objective[] {
  return state.completedObjectives.includes(objective) ? state.completedObjectives : [...state.completedObjectives, objective];
}

export function createLevel01InitialState(restarted = false, now = Date.now()): Level01State {
  const sessionId = EventLogger.createSessionId();
  const baseEvents = restarted
    ? [EventLogger.createEvent(sessionId, 'LEVEL_01', 'WORK_ORDER', 'LEVEL_RESTART')]
    : [];
  return {
    sessionId,
    currentLevel: 'LEVEL_01',
    currentStage: 'WORK_ORDER',
    workOrderOpened: true,
    powerState: 'ON',
    warningLight: true,
    personState: 'DOWN',
    environmentChecked: false,
    powerIsolated: false,
    knowledgeIndex: 0,
    firstAidStep: 0,
    firstAidPracticeCount: 0,
    firePowerState: 'ON',
    fireIdentified: false,
    fireKnowledgeAcknowledged: false,
    firePowerChecked: false,
    selectedExtinguisher: null,
    fireResolved: false,
    transferPassed: false,
    reflectionSequence: [],
    completedObjectives: [],
    abilityReport: null,
    lastSafetyDecision: null,
    feedback: null,
    hintLevel: 0,
    metrics: {
      levelStartedAt: now,
      firstAction: null,
      timeToEnvironmentCheck: null,
      timeToPowerIsolation: null,
      directContactAttempts: 0,
      unsafeFireResponses: 0,
      helpRequests: 0,
      maxHintLevel: 0,
      firstAidSequenceErrors: 0,
      fireResponseErrors: 0,
      levelDuration: null,
    },
    eventLog: [...baseEvents, EventLogger.createEvent(sessionId, 'LEVEL_01', 'WORK_ORDER', 'LEVEL_START')],
  };
}

export function level01Reducer(state: Level01State, action: Level01Action): Level01State {
  switch (action.type) {
    case 'OPEN_WORK_ORDER':
      return { ...state, workOrderOpened: true, eventLog: appendEvents(state, [{ action: 'WORK_ORDER_OPEN' }]) };
    case 'CLOSE_WORK_ORDER':
      return { ...state, workOrderOpened: false };
    case 'ACCEPT_WORK_ORDER':
      if (state.currentStage !== 'WORK_ORDER') return { ...state, workOrderOpened: false };
      return {
        ...state,
        currentStage: level01ScenarioEngine.nextStage('WORK_ORDER'),
        workOrderOpened: false,
        eventLog: appendEvents(state, [{ action: 'WORK_ORDER_ACCEPTED' }, { action: 'ACCIDENT_DISCOVERED', stage: 'ACCIDENT_DISCOVERY' }]),
        feedback: '发现人员倒地，请立即处置。',
      };
    case 'CHECK_ENVIRONMENT': {
      if (!level01ScenarioEngine.isActionAvailable(state.currentStage, 'CHECK_ENVIRONMENT')) return state;
      const now = Date.now();
      return {
        ...state,
        currentStage: level01ScenarioEngine.nextStage('ACCIDENT_DISCOVERY'),
        environmentChecked: true,
        metrics: {
          ...state.metrics,
          firstAction: state.metrics.firstAction ?? 'CHECK_ENVIRONMENT',
          timeToEnvironmentCheck: state.metrics.timeToEnvironmentCheck ?? now - state.metrics.levelStartedAt,
        },
        eventLog: appendEvents(state, [{ action: 'ENVIRONMENT_CHECK' }, { action: 'POWER_STATE_VIEWED', stage: 'ENVIRONMENT_CHECK' }]),
        feedback: '2号实训台仍在工作，人员接触带电设备的可能性无法排除。',
      };
    }
    case 'TOUCH_PERSON': {
      if (!level01ScenarioEngine.isActionAvailable(state.currentStage, 'TOUCH_PERSON')) return state;
      const decision = safetyRuleEngine.evaluate({ levelId: 'LEVEL_01', stage: state.currentStage, powerState: state.powerState, personContactRisk: true, operation: 'TOUCH_PERSON' });
      if (decision.allowed) return { ...state, currentStage: 'FIRST_AID_ASSESSMENT', lastSafetyDecision: decision };
      return {
        ...state,
        lastSafetyDecision: decision,
        metrics: { ...state.metrics, firstAction: state.metrics.firstAction ?? 'TOUCH_PERSON', directContactAttempts: state.metrics.directContactAttempts + 1 },
        eventLog: appendEvents(state, [{ action: 'DIRECT_CONTACT_ATTEMPT', payload: { ruleId: decision.ruleId } }, { action: 'SECONDARY_RISK_WARNING', payload: { ruleId: decision.ruleId } }]),
        feedback: '⚠ 当前环境可能仍存在电气危险。',
      };
    }
    case 'ISOLATE_POWER': {
      if (state.currentStage !== 'ENVIRONMENT_CHECK' || !state.environmentChecked) return {
        ...state,
        metrics: { ...state.metrics, firstAction: state.metrics.firstAction ?? 'POWER_OFF' },
        feedback: '先观察现场，确认危险来自哪里。',
      };
      const decision = safetyRuleEngine.evaluate({ levelId: 'LEVEL_01', stage: state.currentStage, powerState: state.powerState, operation: 'POWER_OFF' });
      if (!decision.allowed) return { ...state, lastSafetyDecision: decision, feedback: '当前操作暂不可执行。' };
      return {
        ...state,
        currentStage: level01ScenarioEngine.nextStage('ENVIRONMENT_CHECK'),
        powerState: 'OFF',
        warningLight: false,
        powerIsolated: true,
        lastSafetyDecision: decision,
        completedObjectives: addObjective(state, 'CONTROL_ELECTRICAL_RISK'),
        metrics: { ...state.metrics, timeToPowerIsolation: Date.now() - state.metrics.levelStartedAt },
        eventLog: appendEvents(state, [{ action: 'POWER_ISOLATED' }]),
        feedback: '✓ 危险源已控制',
      };
    }
    case 'REQUEST_HINT': {
      const hintLevel = Math.min(3, state.hintLevel + 1);
      return {
        ...state,
        hintLevel,
        metrics: {
          ...state.metrics,
          firstAction: state.currentStage === 'ACCIDENT_DISCOVERY' ? state.metrics.firstAction ?? 'REQUEST_HELP' : state.metrics.firstAction,
          helpRequests: state.metrics.helpRequests + 1,
          maxHintLevel: Math.max(state.metrics.maxHintLevel, hintLevel),
        },
        eventLog: appendEvents(state, [{ action: 'HELP_REQUESTED', payload: { hintLevel } }]),
        feedback: getHint(state, hintLevel),
      };
    }
    case 'OPEN_KNOWLEDGE':
      if (state.currentStage !== 'POWER_ISOLATION' || !state.powerIsolated) return state;
      return {
        ...state,
        currentStage: level01ScenarioEngine.nextStage('POWER_ISOLATION'),
        knowledgeIndex: 0,
        eventLog: appendEvents(state, [{ action: 'KNOWLEDGE_CARD_OPEN', payload: { knowledgeId: 'SHOCK_RISK' }, stage: 'SHOCK_MICRO_LEARNING' }]),
        feedback: null,
      };
    case 'COMPLETE_MICRO_SCENARIO': {
      if (state.currentStage !== 'SHOCK_MICRO_LEARNING') return state;
      const nextIndex = state.knowledgeIndex + 1;
      const completionEvent = { action: 'MICRO_SCENARIO_COMPLETE' as EventAction, payload: { knowledgeId: action.knowledgeId } };
      if (nextIndex >= 5) {
        return {
          ...state,
          currentStage: level01ScenarioEngine.nextStage('SHOCK_MICRO_LEARNING'),
          knowledgeIndex: nextIndex,
          eventLog: appendEvents(state, [completionEvent, { action: 'FIRST_AID_ASSESSMENT_START', stage: 'FIRST_AID_ASSESSMENT' }]),
          feedback: '现在可以进行下一步处置。',
        };
      }
      const knowledgeIds = ['SHOCK_RISK', 'SINGLE_PHASE', 'TWO_PHASE', 'STEP_VOLTAGE', 'SAFE_VOLTAGE'];
      return {
        ...state,
        knowledgeIndex: nextIndex,
        eventLog: appendEvents(state, [completionEvent, { action: 'KNOWLEDGE_CARD_OPEN', payload: { knowledgeId: knowledgeIds[nextIndex] } }]),
        feedback: null,
      };
    }
    case 'FIRST_AID_ACTION': {
      if (state.currentStage !== 'FIRST_AID_ASSESSMENT') return state;
      const expected = firstAidConfig.sequence[state.firstAidStep];
      if (action.action !== expected) {
        return { ...state, metrics: { ...state.metrics, firstAidSequenceErrors: state.metrics.firstAidSequenceErrors + 1 }, feedback: '顺序不合适。先确认人员反应并呼叫支援。' };
      }
      const eventMap: Record<typeof action.action, EventAction> = {
        CHECK_RESPONSE: 'CONSCIOUSNESS_CHECK',
        CALL_HELP: 'HELP_CALLED',
        CHECK_BREATHING: 'BREATHING_CHECK',
      };
      const nextStep = state.firstAidStep + 1;
      return {
        ...state,
        currentStage: nextStep >= firstAidConfig.sequence.length ? level01ScenarioEngine.nextStage('FIRST_AID_ASSESSMENT') : state.currentStage,
        firstAidStep: nextStep,
        personState: nextStep >= firstAidConfig.sequence.length ? 'ASSESSED' : state.personState,
        eventLog: appendEvents(state, [{ action: eventMap[action.action] }]),
        feedback: nextStep >= firstAidConfig.sequence.length ? '人员无反应、呼吸异常，应立即按系统提示处置。' : '检查已记录，继续按顺序判断。',
      };
    }
    case 'PRACTICE_FIRST_AID':
      if (state.currentStage !== 'FIRST_AID_ACTION') return state;
      return { ...state, firstAidPracticeCount: Math.min(firstAidConfig.practiceActionsRequired, state.firstAidPracticeCount + 1), feedback: null };
    case 'COMPLETE_FIRST_AID':
      if (state.currentStage !== 'FIRST_AID_ACTION' || state.firstAidPracticeCount < firstAidConfig.practiceActionsRequired) return { ...state, feedback: '请先完成屏幕节奏模拟。' };
      return {
        ...state,
        currentStage: level01ScenarioEngine.nextStage('FIRST_AID_ACTION'),
        completedObjectives: addObjective(state, 'ASSESS_FIRST_AID'),
        eventLog: appendEvents(state, [{ action: 'FIRST_AID_SEQUENCE_COMPLETE' }, { action: 'FIRE_EVENT_START', stage: 'FIRE_EVENT' }]),
        feedback: '发现另一侧配电箱异常冒烟。',
      };
    case 'USE_WATER': {
      if (!['FIRE_EVENT', 'FIRE_RISK_ASSESSMENT'].includes(state.currentStage)) return state;
      const decision = safetyRuleEngine.evaluate({ levelId: 'LEVEL_01', stage: state.currentStage, powerState: state.firePowerState, fireType: 'ELECTRICAL', operation: 'USE_WATER' });
      return {
        ...state,
        lastSafetyDecision: decision,
        metrics: { ...state.metrics, unsafeFireResponses: state.metrics.unsafeFireResponses + 1, fireResponseErrors: state.metrics.fireResponseErrors + 1 },
        eventLog: appendEvents(state, [{ action: 'UNSAFE_FIRE_RESPONSE', payload: { ruleId: decision.ruleId, operation: 'USE_WATER' } }]),
        feedback: '先确认这是不是电气设备火情。',
      };
    }
    case 'REQUEST_FIRE_SUPPORT':
      if (!level01ScenarioEngine.isActionAvailable(state.currentStage, 'REQUEST_FIRE_SUPPORT')) return state;
      return {
        ...state,
        eventLog: appendEvents(state, [{ action: 'HELP_CALLED', payload: { context: 'ELECTRICAL_FIRE' } }]),
        feedback: '已呼叫周围人员支援，继续在安全距离内判断。',
      };
    case 'CHECK_FIRE_DEVICE':
      if (state.currentStage !== 'FIRE_EVENT') return state;
      return {
        ...state,
        currentStage: level01ScenarioEngine.nextStage('FIRE_EVENT'),
        fireIdentified: true,
        eventLog: appendEvents(state, [{ action: 'KNOWLEDGE_CARD_OPEN', payload: { knowledgeId: 'ELECTRICAL_FIRE' }, stage: 'FIRE_RISK_ASSESSMENT' }]),
        feedback: null,
      };
    case 'ACK_FIRE_KNOWLEDGE':
      if (state.currentStage !== 'FIRE_RISK_ASSESSMENT' || !state.fireIdentified) return state;
      return { ...state, fireKnowledgeAcknowledged: true, feedback: '已识别为电气设备火情。' };
    case 'CHECK_FIRE_POWER':
      if (!['FIRE_EVENT', 'FIRE_RISK_ASSESSMENT'].includes(state.currentStage)) return state;
      return {
        ...state,
        firePowerChecked: true,
        eventLog: state.firePowerChecked ? state.eventLog : appendEvents(state, [{ action: 'FIRE_POWER_CHECK' }]),
        feedback: `配电箱电源状态：${state.firePowerState}`,
      };
    case 'ISOLATE_FIRE_POWER': {
      if (state.currentStage !== 'FIRE_RISK_ASSESSMENT' || !state.fireIdentified || !state.firePowerChecked) return { ...state, feedback: '先识别设备，并查看电源状态。' };
      const decision = safetyRuleEngine.evaluate({ levelId: 'LEVEL_01', stage: state.currentStage, powerState: state.firePowerState, fireType: 'ELECTRICAL', operation: 'POWER_OFF' });
      if (!decision.allowed) return { ...state, lastSafetyDecision: decision, feedback: '当前不能安全切断该电源，请请求支援。' };
      return { ...state, firePowerState: 'OFF', firePowerChecked: true, lastSafetyDecision: decision, feedback: '✓ 配电箱相关电源已切断' };
    }
    case 'SELECT_EXTINGUISHER': {
      if (!['FIRE_RISK_ASSESSMENT', 'FIRE_RESPONSE'].includes(state.currentStage) || !state.fireKnowledgeAcknowledged) return { ...state, feedback: '先确认火情类型。' };
      const decision = safetyRuleEngine.evaluate({ levelId: 'LEVEL_01', stage: state.currentStage, powerState: state.firePowerState, fireType: 'ELECTRICAL', extinguisherType: action.extinguisherType, operation: 'USE_EXTINGUISHER' });
      if (!decision.allowed) {
        return {
          ...state,
          lastSafetyDecision: decision,
          metrics: { ...state.metrics, fireResponseErrors: state.metrics.fireResponseErrors + 1 },
          eventLog: appendEvents(state, [{ action: 'UNSAFE_FIRE_RESPONSE', payload: { ruleId: decision.ruleId, extinguisherType: action.extinguisherType } }]),
          feedback: decision.messageKey === 'ISOLATE_POWER_FIRST' ? '先切断相关电源，再选择灭火器材。' : '这种器材不适用于当前电气设备火情。',
        };
      }
      return {
        ...state,
        currentStage: level01ScenarioEngine.nextStage('FIRE_RISK_ASSESSMENT'),
        selectedExtinguisher: action.extinguisherType,
        lastSafetyDecision: decision,
        eventLog: appendEvents(state, [{ action: 'EXTINGUISHER_SELECTED', payload: { extinguisherType: action.extinguisherType, ruleId: decision.ruleId } }]),
        feedback: '器材适用，可以在安全范围内模拟处置。',
      };
    }
    case 'EXECUTE_FIRE_RESPONSE':
      if (state.currentStage !== 'FIRE_RESPONSE' || !state.selectedExtinguisher || state.firePowerState !== 'OFF') return state;
      return {
        ...state,
        currentStage: level01ScenarioEngine.nextStage('FIRE_RESPONSE'),
        fireResolved: true,
        completedObjectives: addObjective(state, 'RESPOND_TO_ELECTRICAL_FIRE'),
        eventLog: appendEvents(state, [{ action: 'FIRE_RESPONSE_SUCCESS' }]),
        feedback: '✓ 火情已解除，周围环境已确认。',
      };
    case 'TRANSFER_ACTION': {
      if (state.currentStage !== 'TRANSFER_CHECK') return state;
      const correct = action.operation === 'OBSERVE_STATUS';
      const operation = action.operation === 'OPEN_DEVICE' ? 'OPEN_DEVICE' : action.operation === 'CHANGE_COMPONENT' ? 'CHANGE_COMPONENT' : 'POWER_OFF';
      const decision = safetyRuleEngine.evaluate({ levelId: 'LEVEL_01', stage: state.currentStage, powerState: 'ON', operation });
      if (!correct) {
        return {
          ...state,
          lastSafetyDecision: decision,
          eventLog: appendEvents(state, [{ action: 'TRANSFER_CHECK_SUBMIT', payload: { firstAction: action.operation, passed: false, ruleId: decision.ruleId } }]),
          feedback: '状态灯仍亮，直接操作会跳过危险判断。先观察状态。',
        };
      }
      return {
        ...state,
        currentStage: level01ScenarioEngine.nextStage('TRANSFER_CHECK'),
        transferPassed: true,
        completedObjectives: addObjective(state, 'TRANSFER_SAFETY_RULE'),
        eventLog: appendEvents(state, [{ action: 'TRANSFER_CHECK_SUBMIT', payload: { firstAction: action.operation, passed: true } }]),
        feedback: '迁移判断正确：换了设备，也先观察状态。',
      };
    }
    case 'ADD_REFLECTION_STEP':
      if (state.currentStage !== 'REFLECTION' || state.reflectionSequence.includes(action.stepId)) return state;
      return { ...state, reflectionSequence: [...state.reflectionSequence, action.stepId], feedback: null };
    case 'RESET_REFLECTION':
      return { ...state, reflectionSequence: [], feedback: null };
    case 'SUBMIT_REFLECTION': {
      if (state.currentStage !== 'REFLECTION') return state;
      const result = reflectionEngine.evaluate(state.reflectionSequence);
      if (!result.correct) return { ...state, eventLog: appendEvents(state, [{ action: 'REFLECTION_SUBMIT', payload: { correct: false } }]), feedback: result.message };
      const completedObjectives = addObjective(state, 'REFLECT_SAFETY_CHAIN');
      const report = abilityTracker.generate({
        firstAction: state.metrics.firstAction,
        directContactAttempts: state.metrics.directContactAttempts,
        unsafeFireResponses: state.metrics.unsafeFireResponses,
        helpRequests: state.metrics.helpRequests,
        maxHintLevel: state.metrics.maxHintLevel,
        firstAidSequenceErrors: state.metrics.firstAidSequenceErrors,
        fireResponseErrors: state.metrics.fireResponseErrors,
        environmentChecked: state.environmentChecked,
        powerIsolated: state.powerIsolated,
        firePowerIsolated: state.firePowerState === 'OFF',
        transferPassed: state.transferPassed,
      });
      return {
        ...state,
        currentStage: level01ScenarioEngine.nextStage('REFLECTION'),
        completedObjectives,
        abilityReport: report,
        metrics: { ...state.metrics, levelDuration: Date.now() - state.metrics.levelStartedAt },
        eventLog: appendEvents(state, [
          { action: 'REFLECTION_SUBMIT', payload: { correct: true } },
          { action: 'ABILITY_REPORT_GENERATED', stage: 'COMPLETE' },
          { action: 'LEVEL_COMPLETE', stage: 'COMPLETE' },
        ]),
        feedback: result.message,
      };
    }
    case 'CLEAR_FEEDBACK':
      return { ...state, feedback: null };
    case 'RESTART':
      return createLevel01InitialState(true);
    default:
      return state;
  }
}

interface Level01StoreValue {
  state: Level01State;
  dispatch: Dispatch<Level01Action>;
}

const Level01StoreContext = createContext<Level01StoreValue | null>(null);

export function Level01StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(level01Reducer, undefined, () => createLevel01InitialState());
  useEffect(() => EventLogger.persist(state.eventLog), [state.eventLog]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Level01StoreContext.Provider value={value}>{children}</Level01StoreContext.Provider>;
}

export function useLevel01Store(): Level01StoreValue {
  const value = useContext(Level01StoreContext);
  if (!value) throw new Error('useLevel01Store must be used inside Level01StoreProvider');
  return value;
}
