import levelData from '@/src/levels/level00/level00.json';
import type { FeatureId, GameState, LevelConfig, ObjectiveId, StageId } from '@/src/core/types';
import { EventLogger } from '@/src/logging/EventLogger';

const config = levelData as LevelConfig;

export class LevelEngine {
  readonly config = config;

  createInitialState(restarted = false): GameState {
    const sessionId = EventLogger.createSessionId();
    const firstStage: StageId = 'WELCOME';
    const initialEvents = restarted
      ? [EventLogger.createEvent(sessionId, config.id, firstStage, 'LEVEL_RESTART')]
      : [];

    return {
      sessionId,
      currentLevel: config.id,
      currentStage: firstStage,
      workOrderOpened: false,
      trainingObjectPosition: 'TRAY',
      trainingObjectSelected: false,
      workbenchPower: 'ON',
      powerStateViewed: false,
      guardState: 'CLOSED',
      helpRequested: false,
      tutorPanelOpen: false,
      completedObjectives: [],
      unlockedFeatures: ['WORK_ORDER'],
      eventLog: [
        ...initialEvents,
        EventLogger.createEvent(sessionId, config.id, firstStage, 'LEVEL_START'),
        EventLogger.createEvent(sessionId, config.id, firstStage, 'WELCOME_SHOWN'),
      ],
      feedback: null,
      reviewAnswers: {},
      reviewIndex: 0,
      inLobby: false,
    };
  }

  nextStage(stage: StageId): StageId {
    const index = config.stages.indexOf(stage);
    return config.stages[index + 1] ?? stage;
  }

  completeObjective(state: GameState, objective: ObjectiveId): ObjectiveId[] {
    return state.completedObjectives.includes(objective)
      ? state.completedObjectives
      : [...state.completedObjectives, objective];
  }

  unlock(state: GameState, feature: FeatureId): FeatureId[] {
    return state.unlockedFeatures.includes(feature)
      ? state.unlockedFeatures
      : [...state.unlockedFeatures, feature];
  }

  hasCompletedAllObjectives(state: GameState): boolean {
    return config.objectives.every((objective) => state.completedObjectives.includes(objective));
  }
}

export const levelEngine = new LevelEngine();
