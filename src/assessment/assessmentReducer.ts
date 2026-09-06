import type {
  LevelAssessmentResult,
  StageAssessment,
  TrainingStageId,
} from './assessmentTypes';

export const STAGE_IDS: readonly TrainingStageId[] = [
  'cognition',
  'standard',
  'calculation',
  'blind_test',
  'transfer',
] as const;

export function defaultModeForStage(stageId: TrainingStageId): 'guided' | 'independent' | 'transfer' {
  if (stageId === 'transfer') return 'transfer';
  if (stageId === 'blind_test') return 'independent';
  return 'guided';
}

export function createInitialAssessment(
  levelId: string,
  startedAt?: number
): LevelAssessmentResult {
  const safeStart = Number.isInteger(startedAt) && (startedAt as number) >= 0 ? (startedAt as number) : 0;

  const stages: StageAssessment[] = STAGE_IDS.map((stageId) => ({
    stageId,
    mode: defaultModeForStage(stageId),
    startedAt: safeStart,
    completedAt: null,
    wrongAttempts: 0,
    hintRequests: 0,
    meterGuardBlocks: 0,
    unsafeActions: 0,
    retries: 0,
    completed: false,
  }));

  return {
    schemaVersion: 1,
    levelId,
    rubricVersion: 'v2',
    startedAt: safeStart,
    completedAt: safeStart,
    stages,
  };
}

export type AssessmentAction =
  | { type: 'START_STAGE'; stageId: TrainingStageId; timestamp?: number; mode?: 'guided' | 'independent' | 'transfer' }
  | { type: 'RECORD_WRONG'; stageId?: TrainingStageId }
  | { type: 'REQUEST_HINT'; stageId?: TrainingStageId }
  | { type: 'METER_BLOCKED'; stageId?: TrainingStageId }
  | { type: 'UNSAFE_ACTION'; stageId?: TrainingStageId }
  | { type: 'RETRY_STAGE'; stageId?: TrainingStageId }
  | { type: 'COMPLETE_STAGE'; stageId: TrainingStageId; timestamp?: number }
  | { type: 'COMPLETE_LEVEL'; timestamp?: number };

export function assessmentReducer(
  state: LevelAssessmentResult,
  action: AssessmentAction
): LevelAssessmentResult {
  function updateStage(
    targetId: TrainingStageId | undefined,
    updater: (stage: StageAssessment) => StageAssessment
  ): StageAssessment[] {
    let matchedId = targetId;
    if (!matchedId) {
      // Find the first incomplete stage, or fallback to the last stage
      const incomplete = state.stages.find((s) => !s.completed);
      matchedId = incomplete ? incomplete.stageId : state.stages[state.stages.length - 1].stageId;
    }

    return state.stages.map((stage) => {
      if (stage.stageId === matchedId) {
        return updater(stage);
      }
      return stage;
    });
  }

  switch (action.type) {
    case 'START_STAGE': {
      const ts = Number.isInteger(action.timestamp) && (action.timestamp as number) >= 0
        ? (action.timestamp as number)
        : Date.now();
      const startedAt = state.startedAt === 0 ? ts : Math.min(state.startedAt, ts);
      return {
        ...state,
        startedAt,
        stages: updateStage(action.stageId, (stage) => ({
          ...stage,
          startedAt: Math.max(startedAt, ts),
          mode: action.mode ?? stage.mode,
        })),
      };
    }

    case 'RECORD_WRONG': {
      return {
        ...state,
        stages: updateStage(action.stageId, (stage) => ({
          ...stage,
          wrongAttempts: stage.wrongAttempts + 1,
        })),
      };
    }

    case 'REQUEST_HINT': {
      return {
        ...state,
        stages: updateStage(action.stageId, (stage) => ({
          ...stage,
          hintRequests: stage.hintRequests + 1,
        })),
      };
    }

    case 'METER_BLOCKED': {
      return {
        ...state,
        stages: updateStage(action.stageId, (stage) => ({
          ...stage,
          meterGuardBlocks: stage.meterGuardBlocks + 1,
        })),
      };
    }

    case 'UNSAFE_ACTION': {
      return {
        ...state,
        stages: updateStage(action.stageId, (stage) => ({
          ...stage,
          unsafeActions: stage.unsafeActions + 1,
        })),
      };
    }

    case 'RETRY_STAGE': {
      return {
        ...state,
        stages: updateStage(action.stageId, (stage) => ({
          ...stage,
          retries: stage.retries + 1,
        })),
      };
    }

    case 'COMPLETE_STAGE': {
      const ts = Number.isInteger(action.timestamp) && (action.timestamp as number) >= 0
        ? (action.timestamp as number)
        : Date.now();
      const startedAt = state.startedAt === 0 ? ts : state.startedAt;
      return {
        ...state,
        startedAt,
        stages: updateStage(action.stageId, (stage) => ({
          ...stage,
          completed: true,
          completedAt: Math.max(stage.startedAt || startedAt, ts),
        })),
      };
    }

    case 'COMPLETE_LEVEL': {
      const ts = Number.isInteger(action.timestamp) && (action.timestamp as number) >= 0
        ? (action.timestamp as number)
        : Date.now();
      const startedAt = state.startedAt === 0 ? ts : state.startedAt;
      const completedAt = Math.max(startedAt, ts);

      // Complete any remaining incomplete stages with this timestamp
      const stages = state.stages.map((stage) => {
        if (!stage.completed) {
          return {
            ...stage,
            completed: true,
            completedAt,
          };
        }
        return stage;
      });

      return {
        ...state,
        startedAt,
        completedAt,
        stages,
      };
    }

    default:
      return state;
  }
}
