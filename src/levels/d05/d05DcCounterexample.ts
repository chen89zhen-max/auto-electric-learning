export const DC_TEACHING_CONFIG = {
  supplyVoltage: 12, // 12V
  primaryResistanceOhm: 0.3, // 0.30Ω
  estimatedCurrentA: 40.0, // 40A
  currentToleranceA: 0.1, // 相差不超过 0.1A
  assumptions: [
    '讨论对象为本关教学单相变压器原边直接接入恒定直流',
    '忽略电源内阻、接线接触电阻与温升引起的阻值变化',
    '基于供电维持且未切断的电阻限流理想稳态估算',
  ],
  protectionOutcome: 'not_simulated',
  modelKind: 'qualitative_dc_counterexample',
} as const;

export type DcObservationStage = 'not_started' | 'transient_observed' | 'steady_observed';

export interface DcOption {
  id: string;
  text: string;
}

export const TRANSIENT_STEADY_QUESTION = {
  title: '【暂态与稳态机理分析】恒定直流误接在变压器原边时，副边感应输出规律为何？',
  correctOptionId: 'OPT_TS_CORRECT',
  options: [
    {
      id: 'OPT_TS_CORRECT',
      text: '接通时可能有瞬态感应，理想稳态无持续感应输出',
    },
    {
      id: 'OPT_TS_ALWAYS_ZERO',
      text: '整个过程副边始终零电压',
    },
    {
      id: 'OPT_TS_CONTINUOUS_TRANSFORM',
      text: '恒定直流能持续按匝数比变压',
    },
  ] as const,
};

export const PROTECTION_QUESTION = {
  title: '【过流风险与保护判定】根据原边 0.30Ω 电阻限流估算，关于保护动作哪项科学客观？',
  correctOptionId: 'OPT_PROT_CORRECT',
  options: [
    {
      id: 'OPT_PROT_CORRECT',
      text: '存在过流风险，信息不足以断言熔断时刻',
    },
    {
      id: 'OPT_PROT_IMMEDIATE_BLOW',
      text: '只要发生过流，熔断器就会立即熔断',
    },
    {
      id: 'OPT_PROT_ALWAYS_SAFE',
      text: '12V说明一定安全',
    },
  ] as const,
};

export const INVERTER_QUESTION = {
  title: '【逆变器技术辨析】车载直流电（如 12V 蓄电池）为何能通过变压器升压输出交流？',
  correctOptionId: 'OPT_INV_CORRECT',
  options: [
    {
      id: 'OPT_INV_CORRECT',
      text: '经开关电路变为适当的时变激励后驱动变压器',
    },
    {
      id: 'OPT_INV_DIRECT_BATTERY',
      text: '电池直接接原边就能持续升压',
    },
    {
      id: 'OPT_INV_NEVER_TRANSFORMER',
      text: '凡直流供电设备都不能使用变压器',
    },
  ] as const,
};

export interface DcValidationResult {
  isObservationComplete: boolean;
  isFilled: boolean;
  isCurrentValid: boolean;
  isCurrentCorrect: boolean;
  parsedCurrent: number | null;
  isTransientCorrect: boolean;
  isProtectionCorrect: boolean;
  isInverterCorrect: boolean;
  isAllCorrect: boolean;
  errorCategories: string[];
}

export function validateDcCounterexample(
  stage: DcObservationStage,
  currentInput: string,
  transientChoice: string | null,
  protectionChoice: string | null,
  inverterChoice: string | null
): DcValidationResult {
  const isObservationComplete = stage === 'steady_observed';
  const trimmed = currentInput.trim();
  const parsed = Number(trimmed);
  const isFiniteNumber = trimmed !== '' && !Number.isNaN(parsed) && Number.isFinite(parsed);
  const isCurrentCorrect =
    isFiniteNumber &&
    parsed > 0 &&
    Math.abs(parsed - DC_TEACHING_CONFIG.estimatedCurrentA) <= DC_TEACHING_CONFIG.currentToleranceA + 1e-5;

  const isTransientCorrect = transientChoice === TRANSIENT_STEADY_QUESTION.correctOptionId;
  const isProtectionCorrect = protectionChoice === PROTECTION_QUESTION.correctOptionId;
  const isInverterCorrect = inverterChoice === INVERTER_QUESTION.correctOptionId;

  const isFilled = trimmed !== '' && Boolean(transientChoice) && Boolean(protectionChoice) && Boolean(inverterChoice);

  const errorCategories: string[] = [];
  if (isFilled && isObservationComplete) {
    if (!isCurrentCorrect) {
      errorCategories.push('电流估算偏差：请根据理想稳态欧姆定律估算（I = U/R = 12 / 0.30）');
    }
    if (!isTransientCorrect) {
      errorCategories.push('暂态与稳态机理判断有误：接通暂态存在磁通变化，达到理想稳态后磁通恒定无持续感应输出');
    }
    if (!isProtectionCorrect) {
      errorCategories.push('保护动作判定不科学：缺乏保护器安秒特性与回路参数，信息不足以断言熔断时刻');
    }
    if (!isInverterCorrect) {
      errorCategories.push('逆变器原理理解有误：车载直流必须经高频开关电路转换为时变电后方可输入变压器');
    }
  }

  const isAllCorrect =
    isObservationComplete && isCurrentCorrect && isTransientCorrect && isProtectionCorrect && isInverterCorrect;

  return {
    isObservationComplete,
    isFilled,
    isCurrentValid: isFiniteNumber,
    isCurrentCorrect,
    parsedCurrent: isFiniteNumber ? parsed : null,
    isTransientCorrect,
    isProtectionCorrect,
    isInverterCorrect,
    isAllCorrect,
    errorCategories,
  };
}

export interface DcCounterexampleEvidence {
  schemaVersion: 2;
  choice: 'A';
  modelKind: 'qualitative_dc_counterexample';
  observationStagesCompleted: ['transient', 'steady'];
  supplyVoltage: 12;
  primaryResistanceOhm: 0.3;
  estimatedCurrentA: number;
  transientSteadyChoice: string;
  protectionChoice: string;
  inverterChoice: string;
  assumptions: readonly string[];
  protectionOutcome: 'not_simulated';
  validatedAt: number;
}

export function buildDcCounterexampleEvidence(
  estimatedCurrent: number,
  transientChoice: string,
  protectionChoice: string,
  inverterChoice: string
): DcCounterexampleEvidence {
  return {
    schemaVersion: 2,
    choice: 'A',
    modelKind: DC_TEACHING_CONFIG.modelKind,
    observationStagesCompleted: ['transient', 'steady'],
    supplyVoltage: DC_TEACHING_CONFIG.supplyVoltage,
    primaryResistanceOhm: DC_TEACHING_CONFIG.primaryResistanceOhm,
    estimatedCurrentA: estimatedCurrent,
    transientSteadyChoice: transientChoice,
    protectionChoice: protectionChoice,
    inverterChoice: inverterChoice,
    assumptions: DC_TEACHING_CONFIG.assumptions,
    protectionOutcome: DC_TEACHING_CONFIG.protectionOutcome,
    validatedAt: Date.now(),
  };
}
