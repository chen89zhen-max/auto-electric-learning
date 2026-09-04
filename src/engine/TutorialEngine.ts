import tutorialData from '@/src/levels/level00/tutorial.json';
import type { GameState, StageId, TutorialStep } from '@/src/core/types';

const steps = tutorialData as TutorialStep[];

export class TutorialEngine {
  getStep(stage: StageId): TutorialStep {
    const step = steps.find((item) => item.id === stage);
    if (!step) throw new Error(`Unknown tutorial stage: ${stage}`);
    return step;
  }

  canOpenGuard(state: GameState): boolean {
    return state.workbenchPower === 'OFF';
  }

  isActionAllowed(stage: StageId, action: string): boolean {
    return this.getStep(stage).allowedActions.includes(action);
  }
}

export const tutorialEngine = new TutorialEngine();
