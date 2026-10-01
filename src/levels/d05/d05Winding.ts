/**
 * D05 变压器绕组初检纯函数与模型配置
 * 对应考纲任务 19 条目 2「了解变压器的绕组检测」
 * 教学对象限定：离线、独立双绕组、带可接触金属铁芯的教学变压器模型
 * 标注：1/2 为初级原边引脚、3/4 为次级副边引脚、K 为金属铁芯接地端
 */

export type WindingSampleId = 'A' | 'B' | 'C';

export type WindingTerminalPair = 'PAIR_1_2' | 'PAIR_3_4' | 'PAIR_1_3' | 'PAIR_1_K';

export type WindingMeterRange = 'OHM_200' | 'OHM_200K';

export type WindingReadingKind = 'finite' | 'open_or_overrange';

export type WindingModelReason = 'continuous' | 'open_circuit' | 'over_range';

export type WindingJudgmentChoice =
  | 'BOTH_CONTINUOUS'
  | 'PRIMARY_OPEN_SUSPECTED'
  | 'LOW_RESISTANCE_INCONCLUSIVE';

export interface WindingBodyConfig {
  sampleId: WindingSampleId;
  name: string;
  r12BodyOhm: number | 'OPEN'; // 1-2 初级
  r34BodyOhm: number | 'OPEN'; // 3-4 次级
  r13BodyOhm: number | 'OPEN'; // 1-3 绝缘
  r1KBodyOhm: number | 'OPEN'; // 1-K 对地/铁芯
  expectedJudgment: WindingJudgmentChoice;
}

/**
 * 固定三个教学样本本体阻值配置（教学模型设定值，非真实变压器唯一合格标准）
 */
export const WINDING_SAMPLES: Record<WindingSampleId, WindingBodyConfig> = {
  A: {
    sampleId: 'A',
    name: '样本 A',
    r12BodyOhm: 32.0,
    r34BodyOhm: 1.2,
    r13BodyOhm: 'OPEN',
    r1KBodyOhm: 'OPEN',
    expectedJudgment: 'BOTH_CONTINUOUS',
  },
  B: {
    sampleId: 'B',
    name: '样本 B',
    r12BodyOhm: 'OPEN',
    r34BodyOhm: 1.2,
    r13BodyOhm: 'OPEN',
    r1KBodyOhm: 'OPEN',
    expectedJudgment: 'PRIMARY_OPEN_SUSPECTED',
  },
  C: {
    sampleId: 'C',
    name: '样本 C',
    r12BodyOhm: 0.4,
    r34BodyOhm: 0.3,
    r13BodyOhm: 'OPEN',
    r1KBodyOhm: 'OPEN',
    expectedJudgment: 'LOW_RESISTANCE_INCONCLUSIVE',
  },
};

/** 教学表笔自检固定短接阻值 */
export const LEAD_ZERO_RESISTANCE_OHM = 0.2;

/** 量程上限 */
export const RANGE_LIMITS: Record<WindingMeterRange, number> = {
  OHM_200: 199.99,
  OHM_200K: 199999.99,
};

/** 单条测量记录结构 */
export interface WindingReadingRecord {
  sampleId: WindingSampleId;
  pair: WindingTerminalPair;
  meterRange: WindingMeterRange;
  powered: boolean;
  isolated: boolean;
  voltageConfirmed: boolean;
  leadResistanceOhm: number;
  readingKind: WindingReadingKind;
  rawOhm: number | null;
  compensatedOhm: number | null;
  displayText: string;
  modelReason: WindingModelReason;
  measuredAt: number;
}

/** 样本诊断判定记录结构 */
export interface WindingJudgmentRecord {
  sampleId: WindingSampleId;
  studentChoice: WindingJudgmentChoice;
  isCorrect: boolean;
  requiredPairKeys: string[];
  validatedAt: number;
}

/** 共享边界题选项定义 */
export const BOUNDARY_QUESTION = {
  id: 'D05_WINDING_BOUNDARY',
  title: '【测量与绝缘证据边界辨析】关于万用表电阻挡在变压器初检中的测量结论，下列哪项科学准确？',
  options: [
    {
      id: 'OPT_BOUNDARY_CORRECT',
      text: '1–3与1–K在普通万用表下显示OL，仅表示在当前量程/测试电压下未检出导通；本次只测指定端对，不构成完整绝缘检验，也不能排除匝间短路。',
      isCorrect: true,
    },
    {
      id: 'OPT_BOUNDARY_WRONG_INSULATION',
      text: '万用表测量初次级1–3及对地1–K显示OL，足以完全证明变压器绝缘耐压完全合格，无需再做高压摇表试验。',
      isCorrect: false,
    },
    {
      id: 'OPT_BOUNDARY_WRONG_SHORT',
      text: '变压器绕组实测直流电阻只有零点几欧姆（如0.3Ω），这必然是绕组内部发生了严重匝间短路故障。',
      isCorrect: false,
    },
  ],
};

/** 样本判断题三个统一选项定义 */
export const SAMPLE_JUDGMENT_OPTIONS: Array<{
  id: WindingJudgmentChoice;
  label: string;
  description: string;
}> = [
  {
    id: 'BOTH_CONTINUOUS',
    label: '两绕组通路正常 (未见断路)',
    description: '两组绕组在本次检查中均呈有限电阻，未发现明显断路；不能据此证明无匝间短路或绝缘合格。',
  },
  {
    id: 'PRIMARY_OPEN_SUSPECTED',
    label: '初级疑似断路',
    description: '初级在自检与高量程复核后仍为OL，提示疑似断路，应进一步复核接触及器件；不能仅凭一次OL断言故障。',
  },
  {
    id: 'LOW_RESISTANCE_INCONCLUSIVE',
    label: '两绕组低阻 (需结合基准复核)',
    description: '两组绕组均有低阻读数，仅凭直流低阻不能判定匝间短路，应结合该型号基准和进一步专用检测。',
  },
];

/** 端对人类可读名称与用途说明 */
export const TERMINAL_PAIR_META: Record<
  WindingTerminalPair,
  { label: string; name: string; purpose: string; isHighResistanceCheck: boolean }
> = {
  PAIR_1_2: {
    label: '端子 1 – 2',
    name: '初级原边绕组本体',
    purpose: '测量初级原边绕组铜阻通路',
    isHighResistanceCheck: false,
  },
  PAIR_3_4: {
    label: '端子 3 – 4',
    name: '次级副边绕组本体',
    purpose: '测量次级副边绕组铜阻通路',
    isHighResistanceCheck: false,
  },
  PAIR_1_3: {
    label: '端子 1 – 3',
    name: '初级与次级间初检',
    purpose: '排查初级与次级之间是否存在直流击穿导通',
    isHighResistanceCheck: true,
  },
  PAIR_1_K: {
    label: '端子 1 – 铁芯 K',
    name: '绕组对金属铁芯外壳初检',
    purpose: '排查初级绕组对硅钢片铁芯外壳是否存在直流碰壳导通',
    isHighResistanceCheck: true,
  },
};

/**
 * 纯解算单次电阻测量读数（无副作用）
 * @param bodyOhm 本体电阻值（数字或 'OPEN'）
 * @param range 挡位
 * @param leadResistance 自检表笔电阻（0.20Ω）
 */
export function calculateWindingReadingPure(
  bodyOhm: number | 'OPEN',
  range: WindingMeterRange,
  leadResistance: number = LEAD_ZERO_RESISTANCE_OHM
): {
  readingKind: WindingReadingKind;
  rawOhm: number | null;
  compensatedOhm: number | null;
  displayText: string;
  modelReason: WindingModelReason;
} {
  if (bodyOhm === 'OPEN') {
    return {
      readingKind: 'open_or_overrange',
      rawOhm: null,
      compensatedOhm: null,
      displayText: 'OL',
      modelReason: 'open_circuit',
    };
  }

  // 有限电阻计算：读数 = 本体阻值 + 表笔电阻
  const totalOhm = bodyOhm + leadResistance;
  const limit = RANGE_LIMITS[range];

  if (totalOhm > limit) {
    return {
      readingKind: 'open_or_overrange',
      rawOhm: null,
      compensatedOhm: null,
      displayText: 'OL',
      modelReason: 'over_range',
    };
  }

  // 在量程以内
  if (range === 'OHM_200') {
    return {
      readingKind: 'finite',
      rawOhm: Number(totalOhm.toFixed(2)),
      compensatedOhm: Number(bodyOhm.toFixed(2)),
      displayText: `${totalOhm.toFixed(2)} Ω`,
      modelReason: 'continuous',
    };
  }

  // OHM_200K 挡位：转换为 kΩ 显示，保留至少三位小数
  const kOhm = totalOhm / 1000;
  return {
    readingKind: 'finite',
    rawOhm: Number(totalOhm.toFixed(2)),
    compensatedOhm: Number(bodyOhm.toFixed(2)),
    displayText: `${kOhm.toFixed(3)} kΩ`,
    modelReason: 'continuous',
  };
}

/**
 * 获取指定样本和端对在指定量程下的解算结果
 */
export function evaluateSampleTerminalPair(
  sampleId: WindingSampleId,
  pair: WindingTerminalPair,
  range: WindingMeterRange,
  leadResistance: number = LEAD_ZERO_RESISTANCE_OHM
) {
  const config = WINDING_SAMPLES[sampleId];
  if (!config) return null;

  let body: number | 'OPEN';
  switch (pair) {
    case 'PAIR_1_2':
      body = config.r12BodyOhm;
      break;
    case 'PAIR_3_4':
      body = config.r34BodyOhm;
      break;
    case 'PAIR_1_3':
      body = config.r13BodyOhm;
      break;
    case 'PAIR_1_K':
      body = config.r1KBodyOhm;
      break;
    default:
      return null;
  }

  return calculateWindingReadingPure(body, range, leadResistance);
}

/**
 * 校验某个样本所必需的测量记录是否全部齐备
 * - 样本 A 与 C：必须测过 1-2, 3-4, 1-3, 1-K 四对
 * - 样本 B：必须测过 1-2(OHM_200), 1-2(OHM_200K), 3-4, 1-3, 1-K，共 5 条
 */
export function checkSampleReadingsComplete(
  sampleId: WindingSampleId,
  records: WindingReadingRecord[]
): {
  isComplete: boolean;
  missingRequirements: string[];
  matchedRecords: WindingReadingRecord[];
} {
  const sampleRecords = records.filter((r) => r.sampleId === sampleId);
  const missing: string[] = [];
  const matched: WindingReadingRecord[] = [];

  // 1-2
  const r12 = sampleRecords.filter((r) => r.pair === 'PAIR_1_2');
  if (sampleId === 'B') {
    const hasLowRange = r12.some((r) => r.meterRange === 'OHM_200');
    const hasHighRange = r12.some((r) => r.meterRange === 'OHM_200K');
    if (!hasLowRange) {
      missing.push('初级 1–2 必须在 Ω200 基础量程下测量');
    }
    if (!hasHighRange) {
      missing.push('初级 1–2 必须切换至 Ω200k 高量程复核以确认非超量程误判');
    }
    const lowRec = r12.find((r) => r.meterRange === 'OHM_200');
    const highRec = r12.find((r) => r.meterRange === 'OHM_200K');
    if (lowRec) matched.push(lowRec);
    if (highRec) matched.push(highRec);
  } else {
    const hasLowRange = r12.some((r) => r.meterRange === 'OHM_200');
    if (!hasLowRange) {
      missing.push('初级 1–2 绕组测量');
    } else {
      const lowRec = r12.find((r) => r.meterRange === 'OHM_200');
      if (lowRec) matched.push(lowRec);
    }
  }

  // 3-4
  const r34 = sampleRecords.filter((r) => r.pair === 'PAIR_3_4');
  const r34Low = r34.find((r) => r.meterRange === 'OHM_200');
  if (!r34Low) {
    missing.push('次级 3–4 绕组测量');
  } else {
    matched.push(r34Low);
  }

  // 1-3
  const r13 = sampleRecords.filter((r) => r.pair === 'PAIR_1_3');
  const r13Low = r13.find((r) => r.meterRange === 'OHM_200');
  if (!r13Low) {
    missing.push('初次级 1–3 隔离初检');
  } else {
    matched.push(r13Low);
  }

  // 1-K
  const r1K = sampleRecords.filter((r) => r.pair === 'PAIR_1_K');
  const r1KLow = r1K.find((r) => r.meterRange === 'OHM_200');
  if (!r1KLow) {
    missing.push('绕组对铁芯 1–K 绝缘初检');
  } else {
    matched.push(r1KLow);
  }

  return {
    isComplete: missing.length === 0,
    missingRequirements: missing,
    matchedRecords: matched,
  };
}

/**
 * 校验 13 项全局必需记录是否全部收集完成
 */
export function checkAll13ReadingsCollected(records: WindingReadingRecord[]): {
  is13Complete: boolean;
  completedCount: number;
  totalRequired: 13;
} {
  const requiredEntries: Array<{
    sampleId: WindingSampleId;
    pair: WindingTerminalPair;
    meterRange: WindingMeterRange;
  }> = [
    // 样本 A (4条)
    { sampleId: 'A', pair: 'PAIR_1_2', meterRange: 'OHM_200' },
    { sampleId: 'A', pair: 'PAIR_3_4', meterRange: 'OHM_200' },
    { sampleId: 'A', pair: 'PAIR_1_3', meterRange: 'OHM_200' },
    { sampleId: 'A', pair: 'PAIR_1_K', meterRange: 'OHM_200' },
    // 样本 B (5条: 含高量程复核)
    { sampleId: 'B', pair: 'PAIR_1_2', meterRange: 'OHM_200' },
    { sampleId: 'B', pair: 'PAIR_1_2', meterRange: 'OHM_200K' },
    { sampleId: 'B', pair: 'PAIR_3_4', meterRange: 'OHM_200' },
    { sampleId: 'B', pair: 'PAIR_1_3', meterRange: 'OHM_200' },
    { sampleId: 'B', pair: 'PAIR_1_K', meterRange: 'OHM_200' },
    // 样本 C (4条)
    { sampleId: 'C', pair: 'PAIR_1_2', meterRange: 'OHM_200' },
    { sampleId: 'C', pair: 'PAIR_3_4', meterRange: 'OHM_200' },
    { sampleId: 'C', pair: 'PAIR_1_3', meterRange: 'OHM_200' },
    { sampleId: 'C', pair: 'PAIR_1_K', meterRange: 'OHM_200' },
  ];

  let completed = 0;
  for (const entry of requiredEntries) {
    const exists = records.some(
      (r) =>
        r.sampleId === entry.sampleId &&
        r.pair === entry.pair &&
        r.meterRange === entry.meterRange
    );
    if (exists) completed++;
  }

  return {
    is13Complete: completed >= 13,
    completedCount: completed,
    totalRequired: 13,
  };
}

/**
 * 校验步骤 1 实操及诊断前置条件是否齐备（认知题非空已选即可，不剧透正误）
 */
export function isD05Step1PrerequisitesReady(
  records: WindingReadingRecord[],
  judgments: Record<WindingSampleId, WindingJudgmentRecord | null>,
  boundaryJudgmentVerified: boolean,
  s1Choice: string | null
): boolean {
  if (!s1Choice) return false;
  if (!boundaryJudgmentVerified) return false;

  const { is13Complete } = checkAll13ReadingsCollected(records);
  if (!is13Complete) return false;

  const sampleA = judgments.A;
  const sampleB = judgments.B;
  const sampleC = judgments.C;

  if (!sampleA?.isCorrect || sampleA.studentChoice !== 'BOTH_CONTINUOUS') return false;
  if (!sampleB?.isCorrect || sampleB.studentChoice !== 'PRIMARY_OPEN_SUSPECTED') return false;
  if (!sampleC?.isCorrect || sampleC.studentChoice !== 'LOW_RESISTANCE_INCONCLUSIVE') return false;

  return true;
}

/**
 * 整步完成互锁聚合判定（包含原认知题最终答对 A）
 */
export function isD05Step1Complete(
  records: WindingReadingRecord[],
  judgments: Record<WindingSampleId, WindingJudgmentRecord | null>,
  boundaryJudgmentVerified: boolean,
  s1Choice: string | null
): boolean {
  if (s1Choice !== 'A') return false;
  return isD05Step1PrerequisitesReady(records, judgments, boundaryJudgmentVerified, s1Choice);
}

/**
 * 步骤 1 绕组初检证据包结构
 */
export interface WindingEvidenceInspection {
  modelVersion: '1.0.0';
  deviceType: 'isolated_dual_winding_training_model';
  samples: WindingReadingRecord[];
  judgments: WindingJudgmentRecord[];
  boundaryJudgment: {
    studentChoice: string;
    isCorrect: boolean;
    validatedAt: number;
  };
}
