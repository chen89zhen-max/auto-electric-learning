export type SafetyOperation =
  | 'TOUCH_PERSON'
  | 'OPEN_DEVICE'
  | 'CHANGE_COMPONENT'
  | 'USE_EXTINGUISHER'
  | 'USE_WATER'
  | 'POWER_OFF'
  | 'POWERED_RESISTANCE_MEASUREMENT'
  | 'CURRENT_RANGE_PARALLEL_CONNECTION'
  | 'METER_PORT_MISMATCH'
  | 'SHORT_CIRCUIT_RISK'
  | 'WRONG_FUSE_RATING'
  | 'LIVE_COMPONENT_REPLACEMENT'
  | 'UNSAFE_JUMPER_CONNECTION';

export interface SafetyContext {
  levelId: string;
  stage: string;
  powerState?: 'ON' | 'OFF';
  personContactRisk?: boolean;
  fireType?: 'ELECTRICAL' | 'ORDINARY';
  extinguisherType?: 'CO2' | 'DRY_CHEMICAL' | 'FOAM' | 'WATER_BASED';
  operation: SafetyOperation;
}

export interface SafetyDecision {
  allowed: boolean;
  severity: 'INFO' | 'WARNING' | 'DANGER';
  ruleId: string;
  messageKey: string;
  consequence?: string;
}

export interface SafetyRule {
  id: string;
  when: Partial<SafetyContext>;
  allow: boolean;
  severity: SafetyDecision['severity'];
  messageKey: string;
  consequence?: string;
}
