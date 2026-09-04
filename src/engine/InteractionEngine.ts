import type { GameState } from '@/src/core/types';

export class InteractionEngine {
  canSelectTrainingObject(state: GameState): boolean {
    return state.currentStage === 'INTERACTION_TUTORIAL' && state.trainingObjectPosition === 'TRAY';
  }

  canPlaceTrainingObject(state: GameState): boolean {
    return this.canSelectTrainingObject(state) && state.trainingObjectSelected;
  }

  canDropTrainingObject(state: GameState): boolean {
    return this.canSelectTrainingObject(state);
  }
}

export const interactionEngine = new InteractionEngine();
