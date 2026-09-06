export type StageId =
  | 'WELCOME'
  | 'READ_WORK_ORDER'
  | 'INTERACTION_TUTORIAL'
  | 'SAFETY_PRECHECK'
  | 'HELP_TUTORIAL'
  | 'REVIEW'
  | 'COMPLETE';

export type ObjectiveId =
  | 'READ_WORK_ORDER'
  | 'BASIC_INTERACTION'
  | 'DEVICE_STATE_CHECK'
  | 'USE_TUTOR_HELP';

export type FeatureId = 'WORK_ORDER' | 'CURRENT_TASK' | 'HELP' | 'LEARNING_RECORD';
export type PowerState = 'ON' | 'OFF';
export type GuardState = 'CLOSED' | 'OPEN';
export type TrainingObjectPosition = 'TRAY' | 'TARGET';

export type EventAction =
  | 'LEVEL_START'
  | 'WELCOME_SHOWN'
  | 'WORK_ORDER_OPEN'
  | 'WORK_ORDER_ACCEPTED'
  | 'OBJECT_SELECTED'
  | 'OBJECT_DRAGGED'
  | 'OBJECT_PLACED'
  | 'POWER_STATE_VIEWED'
  | 'POWER_OFF'
  | 'POWER_ON'
  | 'GUARD_OPEN_ATTEMPT'
  | 'UNSAFE_ACTION_ATTEMPT'
  | 'GUARD_OPEN_SUCCESS'
  | 'HELP_REQUESTED'
  | 'TUTOR_PANEL_OPEN'
  | 'TUTOR_MESSAGE_SHOWN'
  | 'REVIEW_START'
  | 'REVIEW_COMPLETE'
  | 'LEVEL_COMPLETE'
  | 'LEVEL_RESTART'
  | 'ACCIDENT_DISCOVERED'
  | 'ENVIRONMENT_CHECK'
  | 'DIRECT_CONTACT_ATTEMPT'
  | 'SECONDARY_RISK_WARNING'
  | 'POWER_ISOLATED'
  | 'KNOWLEDGE_CARD_OPEN'
  | 'MICRO_SCENARIO_COMPLETE'
  | 'FIRST_AID_ASSESSMENT_START'
  | 'CONSCIOUSNESS_CHECK'
  | 'BREATHING_CHECK'
  | 'HELP_CALLED'
  | 'FIRST_AID_SEQUENCE_COMPLETE'
  | 'FIRE_EVENT_START'
  | 'FIRE_POWER_CHECK'
  | 'EXTINGUISHER_SELECTED'
  | 'UNSAFE_FIRE_RESPONSE'
  | 'FIRE_RESPONSE_SUCCESS'
  | 'TRANSFER_CHECK_SUBMIT'
  | 'REFLECTION_SUBMIT'
  | 'ABILITY_REPORT_GENERATED'
  | 'COMPONENT_EXPLORED'
  | 'WIRE_CONNECTED'
  | 'WIRE_DISCONNECTED'
  | 'HOT_WIRING_ATTEMPT'
  | 'SHORT_CIRCUIT_ATTEMPT'
  | 'INVALID_TERMINAL_ATTEMPT'
  | 'SWITCH_TOGGLED'
  | 'OPEN_CIRCUIT_DISCONNECT'
  | 'OPEN_CIRCUIT_DIAGNOSED'
  | 'CHASSIS_GROUND_CONNECTED'
  | 'TRANSFER_WIRE_CONNECTED'
  | 'TRANSFER_CHECK_FAIL'
  | 'TRANSFER_CHALLENGE_SUCCESS'
  | 'RESET_WIRING';

export interface GameEvent {
  timestamp: string;
  sessionId: string;
  levelId: string;
  stage: string;
  action: EventAction;
  payload: Record<string, unknown>;
}

export interface LevelConfig {
  id: string;
  title: string;
  subtitle: string;
  mode: 'GUIDED' | 'SEMI_GUIDED';
  estimatedMinutes: number;
  scoring: boolean;
  objectives: string[];
  stages: string[];
  unlock: string;
}

export interface TutorialStep {
  id: StageId;
  objective?: ObjectiveId;
  currentTask: string;
  allowedActions: string[];
  nextStage?: StageId;
  requiredState?: Record<string, string>;
}

export interface ReviewQuestion {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string; correct: boolean; feedback: string }>;
}

export interface GameState {
  sessionId: string;
  currentLevel: string;
  currentStage: StageId;
  workOrderOpened: boolean;
  trainingObjectPosition: TrainingObjectPosition;
  trainingObjectSelected: boolean;
  workbenchPower: PowerState;
  powerStateViewed: boolean;
  guardState: GuardState;
  helpRequested: boolean;
  tutorPanelOpen: boolean;
  completedObjectives: ObjectiveId[];
  unlockedFeatures: FeatureId[];
  eventLog: GameEvent[];
  feedback: string | null;
  reviewAnswers: Record<string, string>;
  reviewIndex: number;
  inLobby: boolean;
}
