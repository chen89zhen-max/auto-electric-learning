import { evaluateMeterGuard } from '@/src/game/instruments/meterGuard';

export const F01_SEEDS = ['F01-A', 'F01-B', 'F01-C'] as const;
export type F01Seed = typeof F01_SEEDS[number];

export const F01_STAGES = [
  'WORK_ORDER_AND_HYPOTHESIS',
  'SAFETY_AND_TEST_PLAN',
  'EXPECTED_VALUE_CALCULATION',
  'BLIND_DIAGNOSIS_AND_REPAIR',
  'FUNCTION_RETEST_AND_DEFENSE',
] as const;
export type F01Stage = typeof F01_STAGES[number];

export type F01PrePowerDefect =
  | 'FLYBACK_DIODE_REVERSED'
  | 'POWER_GROUND_SOLDER_BRIDGE'
  | 'RELAY_COIL_COLD_JOINT';

export type F01OperationalFault =
  | 'SUPPLY_CONNECTOR_HIGH_RESISTANCE'
  | 'DIVIDER_UPPER_OPEN'
  | 'GROUND_HIGH_RESISTANCE';

export type F01MeterMode = 'OFF' | 'DCV_20' | 'DCA_10' | 'OHM' | 'CONTINUITY' | 'DIODE';
export type F01MeterJack = 'COM' | 'V_OHM' | '10A';

export type F01MeasurementTarget =
  | 'battery_terminals'
  | 'lamp_voltage'
  | 'main_current_series'
  | 'supply_connector_drop'
  | 'ground_drop'
  | 'divider_output'
  | 'relay_coil_voltage'
  | 'relay_coil_continuity'
  | 'flyback_polarity'
  | 'board_supply_to_ground';

export interface F01MeterRequest {
  mode: F01MeterMode;
  blackJack: F01MeterJack;
  redJack: F01MeterJack;
  target: F01MeasurementTarget;
}

export interface F01ModelState {
  seed: F01Seed;
  powerOn: boolean;
  prePowerDefect: F01PrePowerDefect;
  operationalFault: F01OperationalFault;
  prePowerDefectFixed: boolean;
  operationalFaultFixed: boolean;
  inputs: { a: boolean; b: boolean };
  divider: { supplyV: number; upperOhms: number; lowerOhms: number; thresholdV: number };
}

export type F01Action =
  | { type: 'FIX_PREPOWER'; defect: F01PrePowerDefect }
  | { type: 'SET_POWER'; on: boolean }
  | { type: 'SET_INPUTS'; a: boolean; b: boolean }
  | { type: 'REPAIR_OPERATIONAL'; fault: F01OperationalFault }
  | { type: 'APPLY_TRANSFER_DIVIDER'; upperOhms: 2000; lowerOhms: 1000 };

export interface F01Transition {
  state: F01ModelState;
  allowed: boolean;
  code?: 'PREPOWER_INTERLOCK' | 'WRONG_REPAIR';
  message?: string;
}

export interface F01FunctionalCase {
  a: boolean;
  b: boolean;
  relayOn: boolean;
  lampOn: boolean;
  passed: boolean;
}

export interface F01Outputs {
  dividerVoltage: number;
  sensorInput: boolean;
  relayOn: boolean;
  lampOn: boolean;
}

export interface F01MeasurementRecord {
  id: string;
  target: F01MeasurementTarget;
  mode: F01MeterMode;
  value: number;
  unit: 'V' | 'A' | 'Ω';
}

export interface F01CompletionMetrics {
  schemaVersion: 1;
  seed: F01Seed;
  completedStages: F01Stage[];
  prePowerDefectFixed: true;
  operationalFaultFixed: true;
  measurementLog: F01MeasurementRecord[];
  functionalMatrix: Array<{ a: boolean; b: boolean; relayOn: boolean; lampOn: boolean; passed: boolean }>;
  transfer: { upperOhms: 2000; lowerOhms: 1000; dividerVoltage: number; sensorInput: false; relayOn: false; passed: true };
  defenseEvidenceIds: [string, string];
}

export type F01StageSubmission =
  | { stage: 'WORK_ORDER_AND_HYPOTHESIS'; identifiedCircuits: ['POWER', 'CONTROL']; hypotheses: [string, string] }
  | { stage: 'SAFETY_AND_TEST_PLAN'; plan: 'OFF_INSPECT_ON_MEASURE_OFF_REPAIR_ON_RETEST'; prePowerDefectFixed: boolean; measurementLog: F01MeasurementRecord[] }
  | { stage: 'EXPECTED_VALUE_CALCULATION'; currentA: number; lampV: number; dividerV: number; truthTable: '0001' }
  | { stage: 'BLIND_DIAGNOSIS_AND_REPAIR'; diagnosis: F01OperationalFault; measurementLog: F01MeasurementRecord[] }
  | { stage: 'FUNCTION_RETEST_AND_DEFENSE'; metrics: F01CompletionMetrics };

export type F01MeterResult =
  | { kind: 'reading'; value: number; unit: 'V' | 'A' | 'Ω' }
  | { kind: 'blocked'; code: 'OFF' | 'WRONG_MODE' | 'WRONG_JACK' | 'PROBE_MISSING' | 'LIVE_RESISTANCE' | 'DANGEROUS_BRIDGE' | 'POWER_REQUIRED' | 'POWER_MUST_BE_OFF'; message: string };

export type F01ValidationResult =
  | { valid: true; metrics: F01CompletionMetrics }
  | { valid: false; reason: string };

export const REQUIRED_EVIDENCE_TARGETS: Record<F01Seed, readonly F01MeasurementTarget[]> = {
  'F01-A': ['flyback_polarity', 'supply_connector_drop', 'lamp_voltage', 'main_current_series'],
  'F01-B': ['board_supply_to_ground', 'divider_output', 'relay_coil_voltage', 'relay_coil_continuity'],
  'F01-C': ['relay_coil_continuity', 'ground_drop', 'lamp_voltage', 'main_current_series'],
};

export const F01_EXPECTED_FAULT_EVIDENCE: Record<F01Seed, Record<string, { value: number; unit: 'V' | 'A' | 'Ω'; tolerance: number }>> = {
  'F01-A': {
    flyback_polarity: { value: -0.55, unit: 'V', tolerance: 0.01 },
    supply_connector_drop: { value: 1.4118, unit: 'V', tolerance: 0.01 },
    lamp_voltage: { value: 8.8235, unit: 'V', tolerance: 0.01 },
    main_current_series: { value: 1.7647, unit: 'A', tolerance: 0.01 },
  },
  'F01-B': {
    board_supply_to_ground: { value: 0.1, unit: 'Ω', tolerance: 0.05 },
    divider_output: { value: 0, unit: 'V', tolerance: 0.01 },
    relay_coil_voltage: { value: 0, unit: 'V', tolerance: 0.01 },
    relay_coil_continuity: { value: 80, unit: 'Ω', tolerance: 1 },
  },
  'F01-C': {
    relay_coil_continuity: { value: 1_000_000, unit: 'Ω', tolerance: 1 },
    ground_drop: { value: 1.0909, unit: 'V', tolerance: 0.01 },
    lamp_voltage: { value: 9.0909, unit: 'V', tolerance: 0.01 },
    main_current_series: { value: 1.8182, unit: 'A', tolerance: 0.01 },
  },
};

export const FAULT_PACKAGE: Record<F01Seed, Pick<F01ModelState, 'prePowerDefect' | 'operationalFault'>> = {
  'F01-A': { prePowerDefect: 'FLYBACK_DIODE_REVERSED', operationalFault: 'SUPPLY_CONNECTOR_HIGH_RESISTANCE' },
  'F01-B': { prePowerDefect: 'POWER_GROUND_SOLDER_BRIDGE', operationalFault: 'DIVIDER_UPPER_OPEN' },
  'F01-C': { prePowerDefect: 'RELAY_COIL_COLD_JOINT', operationalFault: 'GROUND_HIGH_RESISTANCE' },
};

const SOURCE_EMF_V = 12;
const SOURCE_INTERNAL_OHM = 1;
const LAMP_OHM = 5;
const SUPPLY_FAULT_OHM = 0.8;
const GROUND_FAULT_OHM = 0.6;
const RELAY_COIL_OHM = 80;

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function hashIdentity(value: string): number {
  let hash = 0x811c9dc5;
  for (const char of value.trim().toLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function selectF01ScenarioSeed(identityKey: string, attemptOrdinal: number): F01Seed {
  if (!identityKey.trim()) throw new Error('F01 seed requires a stable identity key');
  if (!Number.isInteger(attemptOrdinal) || attemptOrdinal < 1) throw new Error('F01 attempt ordinal must be >= 1');
  const index = (hashIdentity(identityKey) % F01_SEEDS.length + attemptOrdinal - 1) % F01_SEEDS.length;
  return F01_SEEDS[index];
}

export function createF01Model(seed: F01Seed): F01ModelState {
  return {
    seed,
    powerOn: false,
    ...FAULT_PACKAGE[seed],
    prePowerDefectFixed: false,
    operationalFaultFixed: false,
    inputs: { a: true, b: true },
    divider: { supplyV: 5, upperOhms: 1000, lowerOhms: 1000, thresholdV: 2 },
  };
}

function dividerVoltage(state: F01ModelState): number {
  if (state.operationalFault === 'DIVIDER_UPPER_OPEN' && !state.operationalFaultFixed) return 0;
  return round4(state.divider.supplyV * state.divider.lowerOhms / (state.divider.upperOhms + state.divider.lowerOhms));
}

export function getF01Outputs(state: F01ModelState): F01Outputs {
  const voltage = dividerVoltage(state);
  const sensorInput = state.inputs.b && voltage >= state.divider.thresholdV;
  const relayOn = state.powerOn && state.inputs.a && sensorInput;
  return { dividerVoltage: voltage, sensorInput, relayOn, lampOn: relayOn };
}

function powerValues(state: F01ModelState) {
  const outputs = getF01Outputs(state);
  if (!outputs.relayOn) {
    return {
      currentA: 0,
      lampV: 0,
      sourceTerminalV: round4(SOURCE_EMF_V),
      supplyDropV: 0,
      groundDropV: 0,
    };
  }
  const added = state.operationalFaultFixed ? 0
    : state.operationalFault === 'SUPPLY_CONNECTOR_HIGH_RESISTANCE' ? SUPPLY_FAULT_OHM
    : state.operationalFault === 'GROUND_HIGH_RESISTANCE' ? GROUND_FAULT_OHM
    : 0;
  const currentA = SOURCE_EMF_V / (SOURCE_INTERNAL_OHM + LAMP_OHM + added);
  return {
    currentA: round4(currentA),
    lampV: round4(currentA * LAMP_OHM),
    sourceTerminalV: round4(currentA * (LAMP_OHM + added)),
    supplyDropV: state.operationalFault === 'SUPPLY_CONNECTOR_HIGH_RESISTANCE' && !state.operationalFaultFixed ? round4(currentA * SUPPLY_FAULT_OHM) : 0,
    groundDropV: state.operationalFault === 'GROUND_HIGH_RESISTANCE' && !state.operationalFaultFixed ? round4(currentA * GROUND_FAULT_OHM) : 0,
  };
}

export function applyF01Action(state: F01ModelState, action: F01Action): F01Transition {
  switch (action.type) {
    case 'FIX_PREPOWER': {
      if (action.defect === state.prePowerDefect) {
        return { state: { ...state, prePowerDefectFixed: true }, allowed: true };
      }
      return { state, allowed: false, code: 'WRONG_REPAIR', message: '纠正的装配缺陷与当前系统缺陷不符。' };
    }
    case 'SET_POWER': {
      if (action.on) {
        if (!state.prePowerDefectFixed) {
          return {
            state,
            allowed: false,
            code: 'PREPOWER_INTERLOCK',
            message: '仿真安全规则已在送电前阻断操作，禁止形成危险回路。',
          };
        }
        return { state: { ...state, powerOn: true }, allowed: true };
      }
      return { state: { ...state, powerOn: false }, allowed: true };
    }
    case 'SET_INPUTS': {
      return { state: { ...state, inputs: { a: action.a, b: action.b } }, allowed: true };
    }
    case 'REPAIR_OPERATIONAL': {
      if (action.fault === state.operationalFault) {
        return { state: { ...state, operationalFaultFixed: true }, allowed: true };
      }
      return { state, allowed: false, code: 'WRONG_REPAIR', message: '所选修复项目与当前测得的运行故障不一致。' };
    }
    case 'APPLY_TRANSFER_DIVIDER': {
      return {
        state: {
          ...state,
          divider: {
            ...state.divider,
            upperOhms: action.upperOhms,
            lowerOhms: action.lowerOhms,
          },
        },
        allowed: true,
      };
    }
    default:
      return { state, allowed: false };
  }
}

interface TargetProfile {
  expectedModes: F01MeterMode[];
  expectedRedJack: F01MeterJack;
  requiresPowered: boolean;
}

const TARGET_PROFILES: Record<F01MeasurementTarget, TargetProfile> = {
  battery_terminals: { expectedModes: ['DCV_20'], expectedRedJack: 'V_OHM', requiresPowered: true },
  lamp_voltage: { expectedModes: ['DCV_20'], expectedRedJack: 'V_OHM', requiresPowered: true },
  supply_connector_drop: { expectedModes: ['DCV_20'], expectedRedJack: 'V_OHM', requiresPowered: true },
  ground_drop: { expectedModes: ['DCV_20'], expectedRedJack: 'V_OHM', requiresPowered: true },
  divider_output: { expectedModes: ['DCV_20'], expectedRedJack: 'V_OHM', requiresPowered: true },
  relay_coil_voltage: { expectedModes: ['DCV_20'], expectedRedJack: 'V_OHM', requiresPowered: true },
  main_current_series: { expectedModes: ['DCA_10'], expectedRedJack: '10A', requiresPowered: true },
  relay_coil_continuity: { expectedModes: ['OHM', 'CONTINUITY'], expectedRedJack: 'V_OHM', requiresPowered: false },
  board_supply_to_ground: { expectedModes: ['OHM', 'CONTINUITY'], expectedRedJack: 'V_OHM', requiresPowered: false },
  flyback_polarity: { expectedModes: ['DIODE'], expectedRedJack: 'V_OHM', requiresPowered: false },
};

export function measureF01(state: F01ModelState, request: F01MeterRequest): F01MeterResult {
  const profile = TARGET_PROFILES[request.target];
  const dangerousBridge = request.target === 'battery_terminals' && request.mode === 'DCA_10';
  const isResistanceOrDiode = request.mode === 'OHM' || request.mode === 'CONTINUITY' || request.mode === 'DIODE';

  const guard = evaluateMeterGuard({
    currentMode: request.mode,
    expectedMode: profile.expectedModes,
    blackJackOk: request.blackJack === 'COM',
    redJackOk: request.redJack === profile.expectedRedJack,
    circuitPowered: state.powerOn,
    resistanceMeasurement: isResistanceOrDiode,
    dangerousBridge,
  });

  if (!guard.allowed) {
    if (guard.code === 'DANGEROUS_BRIDGE') {
      return {
        kind: 'blocked',
        code: 'DANGEROUS_BRIDGE',
        message: '该操作将形成极低阻抗回路，可能产生严重过流并损坏仪表、表笔及蓄电池。仿真安全规则已在送电前阻断操作，禁止形成危险回路。',
      };
    }
    if (guard.code === 'LIVE_RESISTANCE') {
      return {
        kind: 'blocked',
        code: 'LIVE_RESISTANCE',
        message: '严禁带电测量电阻或通断。仿真安全规则已在送电前阻断操作，请先断开电源再测量。',
      };
    }
    return {
      kind: 'blocked',
      code: guard.code,
      message: guard.message,
    };
  }

  if (profile.requiresPowered && !state.powerOn) {
    return {
      kind: 'blocked',
      code: 'POWER_REQUIRED',
      message: '该测量需要在送电状态下进行，请先闭合电源。',
    };
  }

  const pValues = powerValues(state);
  const outputs = getF01Outputs(state);

  switch (request.target) {
    case 'battery_terminals':
      return { kind: 'reading', value: pValues.sourceTerminalV, unit: 'V' };
    case 'lamp_voltage':
      return { kind: 'reading', value: pValues.lampV, unit: 'V' };
    case 'main_current_series':
      return { kind: 'reading', value: pValues.currentA, unit: 'A' };
    case 'supply_connector_drop':
      return { kind: 'reading', value: pValues.supplyDropV, unit: 'V' };
    case 'ground_drop':
      return { kind: 'reading', value: pValues.groundDropV, unit: 'V' };
    case 'divider_output':
      return { kind: 'reading', value: outputs.dividerVoltage, unit: 'V' };
    case 'relay_coil_voltage': {
      const active = state.powerOn && state.inputs.a && outputs.sensorInput;
      return { kind: 'reading', value: active ? 10.0 : 0.0, unit: 'V' };
    }
    case 'relay_coil_continuity': {
      const broken = state.prePowerDefect === 'RELAY_COIL_COLD_JOINT' && !state.prePowerDefectFixed;
      return { kind: 'reading', value: broken ? 1_000_000 : RELAY_COIL_OHM, unit: 'Ω' };
    }
    case 'board_supply_to_ground': {
      const shorted = state.prePowerDefect === 'POWER_GROUND_SOLDER_BRIDGE' && !state.prePowerDefectFixed;
      return { kind: 'reading', value: shorted ? 0.1 : 1_000_000, unit: 'Ω' };
    }
    case 'flyback_polarity': {
      const reversed = state.prePowerDefect === 'FLYBACK_DIODE_REVERSED' && !state.prePowerDefectFixed;
      return { kind: 'reading', value: reversed ? -0.55 : 0.55, unit: 'V' };
    }
    default:
      return { kind: 'blocked', code: 'WRONG_MODE', message: '未知测量目标' };
  }
}

export function validateF01CompletionMetrics(value: unknown, expectedSeed: F01Seed): F01ValidationResult {
  if (!value || typeof value !== 'object') {
    return { valid: false, reason: '评测指标数据无效或为空' };
  }

  const m = value as Partial<F01CompletionMetrics>;

  if (m.schemaVersion !== 1) {
    return { valid: false, reason: 'schemaVersion 必须为 1' };
  }

  if (m.seed !== expectedSeed) {
    return { valid: false, reason: `故障种子不匹配：期望 ${expectedSeed}，实际为 ${m.seed}` };
  }

  if (!Array.isArray(m.completedStages) || m.completedStages.length !== F01_STAGES.length) {
    return { valid: false, reason: '五阶段必须完整按序完成' };
  }

  for (let i = 0; i < F01_STAGES.length; i++) {
    if (m.completedStages[i] !== F01_STAGES[i]) {
      return { valid: false, reason: `阶段 ${F01_STAGES[i]} 未正确按序完成` };
    }
  }

  if (m.prePowerDefectFixed !== true) {
    return { valid: false, reason: '上电前缺陷未修复' };
  }

  if (m.operationalFaultFixed !== true) {
    return { valid: false, reason: '运行故障未修复' };
  }

  if (!Array.isArray(m.measurementLog) || m.measurementLog.length === 0) {
    return { valid: false, reason: '测量日志为空' };
  }

  for (const record of m.measurementLog) {
    if (!Number.isFinite(record.value)) {
      return { valid: false, reason: `测量记录 ${record.target} 数值无效` };
    }
    if (!['V', 'A', 'Ω'].includes(record.unit)) {
      return { valid: false, reason: `测量记录 ${record.target} 单位无效` };
    }
  }

  const requiredTargets = REQUIRED_EVIDENCE_TARGETS[expectedSeed];
  const expectedEvidence = F01_EXPECTED_FAULT_EVIDENCE[expectedSeed];

  for (const target of requiredTargets) {
    const exp = expectedEvidence[target];
    const match = m.measurementLog.find(
      (r) => r.target === target && r.unit === exp.unit && Math.abs(r.value - exp.value) <= exp.tolerance,
    );
    if (!match) {
      return { valid: false, reason: `缺少关键证据点：${target}` };
    }
  }

  if (!Array.isArray(m.functionalMatrix) || m.functionalMatrix.length !== 4) {
    return { valid: false, reason: '四工况功能矩阵不完整' };
  }

  const expectedMatrix = [
    { a: false, b: false, relayOn: false, lampOn: false },
    { a: false, b: true, relayOn: false, lampOn: false },
    { a: true, b: false, relayOn: false, lampOn: false },
    { a: true, b: true, relayOn: true, lampOn: true },
  ];

  for (const exp of expectedMatrix) {
    const item = m.functionalMatrix.find((c) => c.a === exp.a && c.b === exp.b);
    if (!item) {
      return { valid: false, reason: `缺少工况 A=${exp.a}, B=${exp.b} 的测试记录` };
    }
    if (item.relayOn !== exp.relayOn || item.lampOn !== exp.lampOn || item.passed !== true) {
      return { valid: false, reason: `工况 A=${exp.a}, B=${exp.b} 结果不符合逻辑` };
    }
  }

  if (!m.transfer || typeof m.transfer !== 'object') {
    return { valid: false, reason: '参数迁移结果缺失' };
  }

  if (
    m.transfer.upperOhms !== 2000 ||
    m.transfer.lowerOhms !== 1000 ||
    Math.abs(m.transfer.dividerVoltage - 1.6667) > 0.01 ||
    m.transfer.sensorInput !== false ||
    m.transfer.relayOn !== false ||
    m.transfer.passed !== true
  ) {
    return { valid: false, reason: '参数迁移计算或状态判断错误' };
  }

  if (
    !Array.isArray(m.defenseEvidenceIds) ||
    m.defenseEvidenceIds.length !== 2 ||
    m.defenseEvidenceIds[0] === m.defenseEvidenceIds[1]
  ) {
    return { valid: false, reason: '必须选择两条不同的证据作为答辩依据' };
  }

  const logIds = new Set(m.measurementLog.map((r) => r.id));
  if (!logIds.has(m.defenseEvidenceIds[0]) || !logIds.has(m.defenseEvidenceIds[1])) {
    return { valid: false, reason: '答辩证据引用的测量记录不存在' };
  }

  return { valid: true, metrics: m as F01CompletionMetrics };
}

export function evaluateF01Stage(
  stage: F01Stage,
  state: F01ModelState,
  submission: F01StageSubmission,
): { passed: boolean; missing: string[] } {
  if (submission.stage !== stage) return { passed: false, missing: ['阶段提交与当前阶段不一致'] };
  if (submission.stage === 'WORK_ORDER_AND_HYPOTHESIS') {
    const unique = new Set(submission.hypotheses.filter(Boolean));
    return unique.size === 2 && submission.identifiedCircuits[0] === 'POWER' && submission.identifiedCircuits[1] === 'CONTROL'
      ? { passed: true, missing: [] }
      : { passed: false, missing: ['功率回路、控制回路和两个不同的诊断假设'] };
  }
  if (submission.stage === 'SAFETY_AND_TEST_PLAN') {
    const prePowerTarget = REQUIRED_EVIDENCE_TARGETS[state.seed][0];
    const hasPrePowerEvidence = submission.measurementLog.some((record) => record.target === prePowerTarget);
    return state.prePowerDefectFixed && submission.prePowerDefectFixed && hasPrePowerEvidence && submission.plan === 'OFF_INSPECT_ON_MEASURE_OFF_REPAIR_ON_RETEST'
      ? { passed: true, missing: [] }
      : { passed: false, missing: ['记录上电前缺陷证据、完成纠正并提交正确测量顺序'] };
  }
  if (submission.stage === 'EXPECTED_VALUE_CALCULATION') {
    const passed = Math.abs(submission.currentA - 2) <= 0.01
      && Math.abs(submission.lampV - 10) <= 0.01
      && Math.abs(submission.dividerV - 2.5) <= 0.01
      && submission.truthTable === '0001';
    return passed ? { passed: true, missing: [] } : { passed: false, missing: ['2.00A、10.00V、2.50V和0001真值表'] };
  }
  if (submission.stage === 'BLIND_DIAGNOSIS_AND_REPAIR') {
    const runtimeTargets = REQUIRED_EVIDENCE_TARGETS[state.seed].slice(1);
    const measured = new Set(submission.measurementLog.map((record) => record.target));
    const passed = submission.diagnosis === FAULT_PACKAGE[state.seed].operationalFault
      && runtimeTargets.every((target) => measured.has(target))
      && state.operationalFaultFixed;
    return passed ? { passed: true, missing: [] } : { passed: false, missing: ['完整运行测量证据、正确故障判断和修复状态'] };
  }
  const validation = validateF01CompletionMetrics(submission.metrics, state.seed);
  return validation.valid ? { passed: true, missing: [] } : { passed: false, missing: [validation.reason] };
}
