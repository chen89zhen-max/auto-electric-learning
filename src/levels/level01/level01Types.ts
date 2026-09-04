import type { AbilityReportData } from '@/src/abilities/AbilityTracker';
import type { GameEvent } from '@/src/core/types';
import type { PowerState } from '@/src/core/types';
import type { SafetyDecision } from '@/src/safety/safetyTypes';

export type Level01Stage =
  | 'WORK_ORDER'
  | 'ACCIDENT_DISCOVERY'
  | 'ENVIRONMENT_CHECK'
  | 'POWER_ISOLATION'
  | 'SHOCK_MICRO_LEARNING'
  | 'FIRST_AID_ASSESSMENT'
  | 'FIRST_AID_ACTION'
  | 'FIRE_EVENT'
  | 'FIRE_RISK_ASSESSMENT'
  | 'FIRE_RESPONSE'
  | 'TRANSFER_CHECK'
  | 'REFLECTION'
  | 'COMPLETE';

export type Level01Objective =
  | 'CONTROL_ELECTRICAL_RISK'
  | 'ASSESS_FIRST_AID'
  | 'RESPOND_TO_ELECTRICAL_FIRE'
  | 'TRANSFER_SAFETY_RULE'
  | 'REFLECT_SAFETY_CHAIN';

export type ExtinguisherType = 'CO2' | 'DRY_CHEMICAL' | 'FOAM' | 'WATER_BASED';

export interface Level01Metrics {
  levelStartedAt: number;
  firstAction: string | null;
  timeToEnvironmentCheck: number | null;
  timeToPowerIsolation: number | null;
  directContactAttempts: number;
  unsafeFireResponses: number;
  helpRequests: number;
  maxHintLevel: number;
  firstAidSequenceErrors: number;
  fireResponseErrors: number;
  levelDuration: number | null;
}

export interface Level01State {
  sessionId: string;
  currentLevel: 'LEVEL_01';
  currentStage: Level01Stage;
  workOrderOpened: boolean;
  powerState: PowerState;
  warningLight: boolean;
  personState: 'DOWN' | 'ASSESSED';
  environmentChecked: boolean;
  powerIsolated: boolean;
  knowledgeIndex: number;
  firstAidStep: number;
  firstAidPracticeCount: number;
  firePowerState: PowerState;
  fireIdentified: boolean;
  fireKnowledgeAcknowledged: boolean;
  firePowerChecked: boolean;
  selectedExtinguisher: ExtinguisherType | null;
  fireResolved: boolean;
  transferPassed: boolean;
  reflectionSequence: string[];
  completedObjectives: Level01Objective[];
  abilityReport: AbilityReportData | null;
  lastSafetyDecision: SafetyDecision | null;
  feedback: string | null;
  hintLevel: number;
  metrics: Level01Metrics;
  eventLog: GameEvent[];
}
