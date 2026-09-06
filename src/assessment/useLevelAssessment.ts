'use client';

import { useReducer, useCallback } from 'react';
import type { TrainingStageId } from './assessmentTypes';
import {
  assessmentReducer,
  createInitialAssessment,
} from './assessmentReducer';

export function useLevelAssessment(levelId: string, initialTimestamp?: number) {
  const [assessment, dispatch] = useReducer(
    assessmentReducer,
    levelId,
    (id) => createInitialAssessment(id, initialTimestamp)
  );

  const startStage = useCallback((stageId: TrainingStageId, mode?: 'guided' | 'independent' | 'transfer') => {
    dispatch({ type: 'START_STAGE', stageId, mode, timestamp: Date.now() });
  }, []);

  const recordWrong = useCallback((stageId?: TrainingStageId) => {
    dispatch({ type: 'RECORD_WRONG', stageId });
  }, []);

  const requestHint = useCallback((stageId?: TrainingStageId) => {
    dispatch({ type: 'REQUEST_HINT', stageId });
  }, []);

  const recordMeterBlocked = useCallback((stageId?: TrainingStageId) => {
    dispatch({ type: 'METER_BLOCKED', stageId });
  }, []);

  const recordUnsafeAction = useCallback((stageId?: TrainingStageId) => {
    dispatch({ type: 'UNSAFE_ACTION', stageId });
  }, []);

  const retryStage = useCallback((stageId?: TrainingStageId) => {
    dispatch({ type: 'RETRY_STAGE', stageId });
  }, []);

  const completeStage = useCallback((stageId: TrainingStageId) => {
    dispatch({ type: 'COMPLETE_STAGE', stageId, timestamp: Date.now() });
  }, []);

  const completeLevel = useCallback(() => {
    const ts = Date.now();
    dispatch({ type: 'COMPLETE_LEVEL', timestamp: ts });
    return assessmentReducer(assessment, { type: 'COMPLETE_LEVEL', timestamp: ts });
  }, [assessment]);

  return {
    assessment,
    dispatch,
    startStage,
    recordWrong,
    requestHint,
    recordMeterBlocked,
    recordUnsafeAction,
    retryStage,
    completeStage,
    completeLevel,
  };
}

export type LevelAssessmentHook = ReturnType<typeof useLevelAssessment>;
