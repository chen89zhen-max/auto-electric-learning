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
  | 'LEVEL_RESTART';

export interface GameEvent {
  timestamp: string;
  sessionId: string;
  levelId: string;
  stage: StageId;
  action: EventAction;
  payload: Record<string, unknown>;
}

export interface LevelConfig {
  id: string;
  title: string;
  subtitle: string;
  mode: 'GUIDED';
  estimatedMinutes: number;
  scoring: false;
  objectives: ObjectiveId[];
  stages: StageId[];
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
