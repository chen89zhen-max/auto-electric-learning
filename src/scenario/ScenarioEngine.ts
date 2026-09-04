import type { ScenarioConfig, ScenarioDefinition } from '@/src/scenario/scenarioTypes';

export class ScenarioEngine<TStage extends string = string> {
  constructor(private readonly config: ScenarioConfig<TStage>) {}

  getScenario(stage: TStage): ScenarioDefinition<TStage> {
    const scenario = this.config.scenarios.find((item) => item.stage === stage);
    if (!scenario) throw new Error(`Unknown scenario stage: ${stage}`);
    return scenario;
  }

  isActionAvailable(stage: TStage, action: string): boolean {
    return this.getScenario(stage).availableActions.includes(action);
  }

  nextStage(stage: TStage): TStage {
    return this.getScenario(stage).nextStage ?? stage;
  }
}
