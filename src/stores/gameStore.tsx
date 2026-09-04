'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import type { GameEvent, GameState } from '@/src/core/types';
import { EventLogger } from '@/src/logging/EventLogger';
import { levelEngine } from '@/src/engine/LevelEngine';
import { tutorialEngine } from '@/src/engine/TutorialEngine';
import { interactionEngine } from '@/src/engine/InteractionEngine';

export type GameAction =
  | { type: 'ENTER' }
  | { type: 'OPEN_WORK_ORDER' }
  | { type: 'CLOSE_WORK_ORDER' }
  | { type: 'ACCEPT_WORK_ORDER' }
  | { type: 'SELECT_OBJECT' }
  | { type: 'DRAG_OBJECT' }
  | { type: 'PLACE_OBJECT' }
  | { type: 'VIEW_POWER' }
  | { type: 'TOGGLE_POWER' }
  | { type: 'OPEN_GUARD' }
  | { type: 'CONTINUE_AFTER_INTERACTION' }
  | { type: 'CONTINUE_AFTER_SAFETY' }
  | { type: 'TRY_UNKNOWN' }
  | { type: 'REQUEST_HELP' }
  | { type: 'START_REVIEW' }
  | { type: 'ANSWER_REVIEW'; questionId: string; optionId: string; correct: boolean; feedback: string }
  | { type: 'CLEAR_FEEDBACK' }
  | { type: 'RETURN_LOBBY' }
  | { type: 'RETURN_RESULT' }
  | { type: 'RESTART' };

function appendEvents(state: GameState, actions: GameEvent['action'][]): GameEvent[] {
  return [
    ...state.eventLog,
    ...actions.map((action) =>
      EventLogger.createEvent(state.sessionId, state.currentLevel, state.currentStage, action),
    ),
  ];
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ENTER':
      return {
        ...state,
        currentStage: 'READ_WORK_ORDER',
        unlockedFeatures: levelEngine.unlock(state, 'CURRENT_TASK'),
        feedback: null,
      };
    case 'OPEN_WORK_ORDER':
      return {
        ...state,
        workOrderOpened: true,
        eventLog: appendEvents(state, ['WORK_ORDER_OPEN']),
      };
    case 'CLOSE_WORK_ORDER':
      return { ...state, workOrderOpened: false };
    case 'ACCEPT_WORK_ORDER':
      return {
        ...state,
        currentStage: 'INTERACTION_TUTORIAL',
        workOrderOpened: false,
        completedObjectives: levelEngine.completeObjective(state, 'READ_WORK_ORDER'),
        eventLog: appendEvents(state, ['WORK_ORDER_ACCEPTED']),
        feedback: null,
      };
    case 'SELECT_OBJECT':
      if (!interactionEngine.canSelectTrainingObject(state)) return state;
      return {
        ...state,
        trainingObjectSelected: true,
        eventLog: appendEvents(state, ['OBJECT_SELECTED']),
        feedback: '已选中训练件，再点击指定位置。',
      };
    case 'DRAG_OBJECT':
      if (!interactionEngine.canSelectTrainingObject(state)) return state;
      return { ...state, trainingObjectSelected: true, eventLog: appendEvents(state, ['OBJECT_DRAGGED']) };
    case 'PLACE_OBJECT':
      if (!interactionEngine.canPlaceTrainingObject(state) && !interactionEngine.canDropTrainingObject(state)) return state;
      return {
        ...state,
        trainingObjectPosition: 'TARGET',
        trainingObjectSelected: false,
        completedObjectives: levelEngine.completeObjective(state, 'BASIC_INTERACTION'),
        eventLog: appendEvents(state, ['OBJECT_PLACED']),
        feedback: '✓ 操作完成',
      };
    case 'CONTINUE_AFTER_INTERACTION':
      if (state.trainingObjectPosition !== 'TARGET') return state;
      return { ...state, currentStage: 'SAFETY_PRECHECK', feedback: null };
    case 'VIEW_POWER':
      return {
        ...state,
        powerStateViewed: true,
        eventLog: state.powerStateViewed ? state.eventLog : appendEvents(state, ['POWER_STATE_VIEWED']),
        feedback: `训练台当前状态：${state.workbenchPower}`,
      };
    case 'TOGGLE_POWER': {
      const power = state.workbenchPower === 'ON' ? 'OFF' : 'ON';
      return {
        ...state,
        workbenchPower: power,
        powerStateViewed: true,
        eventLog: appendEvents(state, [power === 'OFF' ? 'POWER_OFF' : 'POWER_ON']),
        feedback: `训练台已切换为 ${power}`,
      };
    }
    case 'OPEN_GUARD': {
      const attemptLog = appendEvents(state, ['GUARD_OPEN_ATTEMPT']);
      if (!tutorialEngine.canOpenGuard(state)) {
        return {
          ...state,
          guardState: 'CLOSED',
          eventLog: [
            ...attemptLog,
            EventLogger.createEvent(state.sessionId, state.currentLevel, state.currentStage, 'UNSAFE_ACTION_ATTEMPT'),
          ],
          feedback: '⚠ 当前训练台仍处于工作状态。',
        };
      }
      return {
        ...state,
        guardState: 'OPEN',
        completedObjectives: levelEngine.completeObjective(state, 'DEVICE_STATE_CHECK'),
        eventLog: [
          ...attemptLog,
          EventLogger.createEvent(state.sessionId, state.currentLevel, state.currentStage, 'GUARD_OPEN_SUCCESS'),
        ],
        feedback: '✓ 操作完成',
      };
    }
    case 'CONTINUE_AFTER_SAFETY':
      if (state.guardState !== 'OPEN') return state;
      return {
        ...state,
        currentStage: 'HELP_TUTORIAL',
        unlockedFeatures: levelEngine.unlock(state, 'HELP'),
        feedback: null,
      };
    case 'TRY_UNKNOWN':
      return { ...state, feedback: '不确定的时候，先别乱操作。' };
    case 'REQUEST_HELP':
      return {
        ...state,
        helpRequested: true,
        tutorPanelOpen: true,
        completedObjectives: levelEngine.completeObjective(state, 'USE_TUTOR_HELP'),
        eventLog: appendEvents(state, ['HELP_REQUESTED', 'TUTOR_PANEL_OPEN', 'TUTOR_MESSAGE_SHOWN']),
        feedback: null,
      };
    case 'START_REVIEW':
      if (!state.helpRequested) return state;
      return {
        ...state,
        currentStage: 'REVIEW',
        unlockedFeatures: levelEngine.unlock(state, 'LEARNING_RECORD'),
        eventLog: appendEvents(state, ['REVIEW_START']),
        feedback: null,
      };
    case 'ANSWER_REVIEW': {
      if (!action.correct) return { ...state, feedback: action.feedback };
      const reviewAnswers = { ...state.reviewAnswers, [action.questionId]: action.optionId };
      if (state.reviewIndex === 0) {
        return { ...state, reviewAnswers, reviewIndex: 1, feedback: action.feedback };
      }
      const reviewedState: GameState = {
        ...state,
        reviewAnswers,
        feedback: action.feedback,
        eventLog: appendEvents(state, ['REVIEW_COMPLETE']),
      };
      if (!levelEngine.hasCompletedAllObjectives(reviewedState)) return reviewedState;
      return {
        ...reviewedState,
        currentStage: 'COMPLETE',
        eventLog: [
          ...reviewedState.eventLog,
          EventLogger.createEvent(state.sessionId, state.currentLevel, 'COMPLETE', 'LEVEL_COMPLETE'),
        ],
      };
    }
    case 'CLEAR_FEEDBACK':
      return { ...state, feedback: null };
    case 'RETURN_LOBBY':
      if (state.currentStage !== 'COMPLETE') return state;
      return { ...state, inLobby: true, feedback: null };
    case 'RETURN_RESULT':
      return { ...state, inLobby: false };
    case 'RESTART':
      return levelEngine.createInitialState(true);
    default:
      return state;
  }
}

interface GameStoreValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GameStoreContext = createContext<GameStoreValue | null>(null);

export function GameStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => levelEngine.createInitialState());
  useEffect(() => EventLogger.persist(state.eventLog), [state.eventLog]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <GameStoreContext.Provider value={value}>{children}</GameStoreContext.Provider>;
}

export function useGameStore(): GameStoreValue {
  const value = useContext(GameStoreContext);
  if (!value) throw new Error('useGameStore must be used inside GameStoreProvider');
  return value;
}
