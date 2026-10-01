export interface CompoundCircuitParams {
  caseId: 'A' | 'B';
  name: string;
  u: number;
  r1: number;
  r2: number;
  r3: number;
}

export interface CompoundCalculationResult {
  rp: number;
  req: number;
  itotal: number;
  uparallel: number;
  u3: number;
  i1: number;
  i2: number;
  p1: number;
  p2: number;
  p3: number;
  ptotal: number;
  powerRatio: number;
}

export interface StudentAnswersRaw {
  req: string;
  itotal: string;
  uparallel: string;
  p1: string;
  p2: string;
  p3: string;
  powerRatio: string;
}

export interface StudentAnswersParsed {
  req: number;
  itotal: number;
  uparallel: number;
  p1: number;
  p2: number;
  p3: number;
  powerRatio: number;
}

export interface CompoundFieldValidation {
  isCorrect: boolean;
  studentVal: number;
  expectedVal: number;
  diff: number;
}

export interface CompoundCaseRecord {
  caseId: 'A' | 'B';
  topologyId: 'R3_SERIES_R1_PARALLEL_R2';
  params: {
    u: number;
    r1: number;
    r2: number;
    r3: number;
  };
  expected: CompoundCalculationResult;
  studentAnswers: StudentAnswersParsed;
  fieldResults: Record<keyof StudentAnswersParsed, CompoundFieldValidation>;
  isCorrect: boolean;
  validatedAt: number;
}

export interface BypassRecord {
  caseId: 'A';
  simulationTested: boolean;
  normalValues: {
    req: number;
    itotal: number;
    uab: number;
  };
  bypassedValues: {
    req: number;
    itotal: number;
    uab: number;
    p3: number;
    i1: number;
    i2: number;
    p1: number;
    p2: number;
  };
  studentChoice: string | null;
  isCorrect: boolean;
  testedAt: number;
}

export const COMPOUND_CASES: Record<'A' | 'B', CompoundCircuitParams> = {
  A: {
    caseId: 'A',
    name: '算例 A · 基础计算',
    u: 12,
    r1: 6,
    r2: 12,
    r3: 2,
  },
  B: {
    caseId: 'B',
    name: '算例 B · 参数变式',
    u: 12,
    r1: 12,
    r2: 6,
    r3: 4,
  },
};

export const ABSOLUTE_TOLERANCE = 0.02;

/**
 * 混联电路纯计算函数
 * 拓扑：电源 U (12V) -> R3 串联 (R1 ∥ R2) -> 地
 */
export function calculateCompoundCircuit(
  u: number,
  r1: number,
  r2: number,
  r3: number
): CompoundCalculationResult | null {
  if (
    !Number.isFinite(u) ||
    !Number.isFinite(r1) ||
    !Number.isFinite(r2) ||
    !Number.isFinite(r3) ||
    u <= 0 ||
    r1 <= 0 ||
    r2 <= 0 ||
    r3 <= 0
  ) {
    return null;
  }

  const rp = (r1 * r2) / (r1 + r2);
  const req = r3 + rp;
  const itotal = u / req;
  const uparallel = itotal * rp;
  const u3 = itotal * r3;
  const i1 = uparallel / r1;
  const i2 = uparallel / r2;
  const p1 = (uparallel * uparallel) / r1;
  const p2 = (uparallel * uparallel) / r2;
  const p3 = itotal * itotal * r3;
  const ptotal = u * itotal;
  const powerRatio = p1 / p2;

  return {
    rp,
    req,
    itotal,
    uparallel,
    u3,
    i1,
    i2,
    p1,
    p2,
    p3,
    ptotal,
    powerRatio,
  };
}

/**
 * 算例 A 的 A-B 短接旁路纯计算
 * 正常态 vs 理想导线短接 A-B 节点
 */
export function calculateBypassCircuitA() {
  const normal = calculateCompoundCircuit(12, 6, 12, 2)!;
  // A-B 短接后，R1 与 R2 两端被 0Ω 导线跨接旁路：UAB = 0V, I1 = I2 = 0A, P1 = P2 = 0W
  // R3 仍然串联在回路中限流：Req = R3 = 2Ω, Itotal = 12 / 2 = 6A, P3 = 6^2 * 2 = 72W
  const bypassed = {
    req: 2,
    itotal: 6,
    uab: 0,
    p3: 72,
    i1: 0,
    i2: 0,
    p1: 0,
    p2: 0,
  };

  return {
    normal: {
      req: normal.req,
      itotal: normal.itotal,
      uab: normal.uparallel,
    },
    bypassed,
  };
}

/**
 * 解析并校验单个数值字段输入
 * 规则：非空、有限正数（允许最大两位小数答题）
 */
export function parseInputField(raw: string): { validFormat: boolean; value: number } {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { validFormat: false, value: 0 };
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) {
    return { validFormat: false, value: 0 };
  }
  return { validFormat: true, value: num };
}

/**
 * 校验学生提交的 7 个数值项
 */
export function validateCompoundSubmission(
  rawAnswers: StudentAnswersRaw,
  expected: CompoundCalculationResult,
  tolerance = ABSOLUTE_TOLERANCE
): {
  allValidFormat: boolean;
  invalidFields: (keyof StudentAnswersRaw)[];
  parsedAnswers: StudentAnswersParsed | null;
  fieldResults: Record<keyof StudentAnswersParsed, CompoundFieldValidation> | null;
  allCorrect: boolean;
} {
  const keys: (keyof StudentAnswersRaw)[] = [
    'req',
    'itotal',
    'uparallel',
    'p1',
    'p2',
    'p3',
    'powerRatio',
  ];

  const invalidFields: (keyof StudentAnswersRaw)[] = [];
  const parsedMap: Partial<StudentAnswersParsed> = {};

  for (const key of keys) {
    const res = parseInputField(rawAnswers[key]);
    if (!res.validFormat) {
      invalidFields.push(key);
    } else {
      parsedMap[key] = res.value;
    }
  }

  if (invalidFields.length > 0) {
    return {
      allValidFormat: false,
      invalidFields,
      parsedAnswers: null,
      fieldResults: null,
      allCorrect: false,
    };
  }

  const parsed = parsedMap as StudentAnswersParsed;
  const fieldResults: Partial<Record<keyof StudentAnswersParsed, CompoundFieldValidation>> = {};
  let allCorrect = true;

  for (const key of keys) {
    const studentVal = parsed[key];
    const expectedVal = expected[key];
    const diff = Math.abs(studentVal - expectedVal);
    const isCorrect = diff <= tolerance + 1e-9;
    if (!isCorrect) {
      allCorrect = false;
    }
    fieldResults[key] = {
      isCorrect,
      studentVal,
      expectedVal,
      diff,
    };
  }

  return {
    allValidFormat: true,
    invalidFields: [],
    parsedAnswers: parsed,
    fieldResults: fieldResults as Record<keyof StudentAnswersParsed, CompoundFieldValidation>,
    allCorrect,
  };
}
