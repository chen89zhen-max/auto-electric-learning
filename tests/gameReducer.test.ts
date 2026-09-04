import { describe, expect, it } from 'vitest';
import { levelEngine } from '@/src/engine/LevelEngine';
import { gameReducer } from '@/src/stores/gameStore';

function reachSafety() {
  let state = levelEngine.createInitialState();
  state = gameReducer(state, { type: 'ENTER' });
  state = gameReducer(state, { type: 'OPEN_WORK_ORDER' });
  state = gameReducer(state, { type: 'ACCEPT_WORK_ORDER' });
  state = gameReducer(state, { type: 'SELECT_OBJECT' });
  state = gameReducer(state, { type: 'PLACE_OBJECT' });
  return gameReducer(state, { type: 'CONTINUE_AFTER_INTERACTION' });
}

describe('Sprint 0 core flow', () => {
  it('starts with power ON and guard CLOSED', () => {
    const state = levelEngine.createInitialState();
    expect(state.workbenchPower).toBe('ON');
    expect(state.guardState).toBe('CLOSED');
    expect(state.eventLog.map((event) => event.action)).toEqual(['LEVEL_START', 'WELCOME_SHOWN']);
  });

  it('blocks opening the guard while power is ON', () => {
    const state = gameReducer(reachSafety(), { type: 'OPEN_GUARD' });
    expect(state.guardState).toBe('CLOSED');
    expect(state.eventLog.at(-1)?.action).toBe('UNSAFE_ACTION_ATTEMPT');
    expect(state.eventLog.some((event) => event.action === 'GUARD_OPEN_ATTEMPT')).toBe(true);
  });

  it('opens the guard after power is turned OFF', () => {
    let state = gameReducer(reachSafety(), { type: 'TOGGLE_POWER' });
    expect(state.workbenchPower).toBe('OFF');
    state = gameReducer(state, { type: 'OPEN_GUARD' });
    expect(state.guardState).toBe('OPEN');
    expect(state.eventLog.at(-1)?.action).toBe('GUARD_OPEN_SUCCESS');
  });

  it('records tutor help and exposes the tutor panel', () => {
    let state = gameReducer(reachSafety(), { type: 'TOGGLE_POWER' });
    state = gameReducer(state, { type: 'OPEN_GUARD' });
    state = gameReducer(state, { type: 'CONTINUE_AFTER_SAFETY' });
    state = gameReducer(state, { type: 'REQUEST_HELP' });
    expect(state.helpRequested).toBe(true);
    expect(state.tutorPanelOpen).toBe(true);
    expect(state.eventLog.slice(-3).map((event) => event.action)).toEqual([
      'HELP_REQUESTED',
      'TUTOR_PANEL_OPEN',
      'TUTOR_MESSAGE_SHOWN',
    ]);
  });

  it('completes the level only after all objectives and both review answers', () => {
    let state = gameReducer(reachSafety(), { type: 'TOGGLE_POWER' });
    state = gameReducer(state, { type: 'OPEN_GUARD' });
    state = gameReducer(state, { type: 'CONTINUE_AFTER_SAFETY' });
    state = gameReducer(state, { type: 'REQUEST_HELP' });
    state = gameReducer(state, { type: 'START_REVIEW' });
    state = gameReducer(state, { type: 'ANSWER_REVIEW', questionId: 'PREPARE_DEVICE', optionId: 'OBSERVE', correct: true, feedback: 'ok' });
    state = gameReducer(state, { type: 'ANSWER_REVIEW', questionId: 'UNKNOWN_PROBLEM', optionId: 'ASK', correct: true, feedback: 'ok' });
    expect(state.currentStage).toBe('COMPLETE');
    expect(state.completedObjectives).toHaveLength(4);
    expect(state.eventLog.at(-1)?.action).toBe('LEVEL_COMPLETE');
  });

  it('restarts with a clean state and a new session', () => {
    const oldState = reachSafety();
    const state = gameReducer(oldState, { type: 'RESTART' });
    expect(state.sessionId).not.toBe(oldState.sessionId);
    expect(state.currentStage).toBe('WELCOME');
    expect(state.workOrderOpened).toBe(false);
    expect(state.trainingObjectPosition).toBe('TRAY');
    expect(state.workbenchPower).toBe('ON');
    expect(state.guardState).toBe('CLOSED');
    expect(state.helpRequested).toBe(false);
    expect(state.inLobby).toBe(false);
    expect(state.completedObjectives).toEqual([]);
    expect(state.eventLog.map((event) => event.action)).toEqual(['LEVEL_RESTART', 'LEVEL_START', 'WELCOME_SHOWN']);
  });
});
