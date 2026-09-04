export interface ScenarioDefinition<TStage extends string = string> {
  id: string;
  stage: TStage;
  initialState?: Record<string, string | boolean | number>;
  availableActions: string[];
  nextStage?: TStage;
}

export interface ScenarioConfig<TStage extends string = string> {
  scenarios: ScenarioDefinition<TStage>[];
}
