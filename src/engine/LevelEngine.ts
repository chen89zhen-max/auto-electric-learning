import levelData from '@/src/levels/level00/level00.json';
import type { FeatureId, GameState, LevelConfig, ObjectiveId, StageId } from '@/src/core/types';
import { EventLogger } from '@/src/logging/EventLogger';

const config = levelData as LevelConfig;

export class LevelEngine {
  readonly config: LevelConfig;

  constructor(levelConfig: LevelConfig = config) {
    this.config = levelConfig;
  }

  createInitialState(restarted = false): GameState {
    const sessionId = EventLogger.createSessionId();
    if (this.config.id !== 'LEVEL_00') throw new Error('Use the level-specific state factory for non-LEVEL_00 levels.');
    const firstStage: StageId = 'WELCOME';
    const initialEvents = restarted
      ? [EventLogger.createEvent(sessionId, this.config.id, firstStage, 'LEVEL_RESTART')]
      : [];

    return {
      sessionId,
      currentLevel: this.config.id,
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
        EventLogger.createEvent(sessionId, this.config.id, firstStage, 'LEVEL_START'),
        EventLogger.createEvent(sessionId, this.config.id, firstStage, 'WELCOME_SHOWN'),
      ],
      feedback: null,
      reviewAnswers: {},
      reviewIndex: 0,
      inLobby: false,
    };
  }

  nextStage<TStage extends string>(stage: TStage): TStage {
    const index = this.config.stages.indexOf(stage);
    return (this.config.stages[index + 1] ?? stage) as TStage;
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
    return this.config.objectives.every((objective) => state.completedObjectives.includes(objective as ObjectiveId));
  }
}

export const levelEngine = new LevelEngine();
