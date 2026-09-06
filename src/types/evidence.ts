export type EvidenceDimensionId =
  | 'SAFETY_SPECIFICATION'  // 安全规范
  | 'CIRCUIT_READING'        // 电路识读
  | 'TOOL_MEASUREMENT'       // 工具测量
  | 'RULE_EXPLANATION'       // 规律解释
  | 'DIAGNOSTIC_STRATEGY'    // 诊断策略
  | 'EVIDENCE_EXPRESSION';   // 证据表达

export type EvidenceStatus =
  | 'NO_EVIDENCE'           // 尚无证据
  | 'GUIDED_COMPLETE'       // 跟练完成
  | 'INDEPENDENT_COMPLETE'  // 独立完成
  | 'TRANSFER_COMPLETE';    // 迁移完成

export type PhysicalObservationStatus =
  | 'PENDING_OBSERVATION'   // 待观察
  | 'NEEDS_PRACTICE'        // 需练习
  | 'TEACHER_CONFIRMED';    // 教师确认

export type PracticeMode = 'guided' | 'independent' | 'transfer';

export interface EvidenceDimensionInfo {
  id: EvidenceDimensionId;
  label: string;
  description: string;
}

export const EVIDENCE_DIMENSIONS: EvidenceDimensionInfo[] = [
  {
    id: 'SAFETY_SPECIFICATION',
    label: '安全规范',
    description: '绝缘防护选用、带电与断电隔离规范、高低压作业安全红线与应急处置',
  },
  {
    id: 'CIRCUIT_READING',
    label: '电路识读',
    description: '原理图符号、实物端子对应、车身搭铁单线制识别与回路闭合追踪',
  },
  {
    id: 'TOOL_MEASUREMENT',
    label: '工具测量',
    description: '万用表挡位与插孔选用、量程切换、表笔测点接触规范及测量加载认识',
  },
  {
    id: 'RULE_EXPLANATION',
    label: '规律解释',
    description: '欧姆定律定量关系、串并联分压分流、节点回路规律与电功率预算解释',
  },
  {
    id: 'DIAGNOSTIC_STRATEGY',
    label: '诊断策略',
    description: '故障假设提出、测点选取策略、压降与通路分析及非破坏性排查',
  },
  {
    id: 'EVIDENCE_EXPRESSION',
    label: '证据表达',
    description: '测量数据有效记录、假设排除理由陈述、修复复检与答辩表达',
  },
];

export type EvidenceState = Record<EvidenceDimensionId, EvidenceStatus>;

export interface AttemptSummaryRecord {
  attemptId: string;
  completedAt: string;
  score: number;
  mode: PracticeMode;
  maxHintLevel?: number;
  seed?: string;
}

export function createInitialEvidenceState(): EvidenceState {
  return {
    SAFETY_SPECIFICATION: 'NO_EVIDENCE',
    CIRCUIT_READING: 'NO_EVIDENCE',
    TOOL_MEASUREMENT: 'NO_EVIDENCE',
    RULE_EXPLANATION: 'NO_EVIDENCE',
    DIAGNOSTIC_STRATEGY: 'NO_EVIDENCE',
    EVIDENCE_EXPRESSION: 'NO_EVIDENCE',
  };
}

const STATUS_RANK: Record<EvidenceStatus, number> = {
  NO_EVIDENCE: 0,
  GUIDED_COMPLETE: 1,
  INDEPENDENT_COMPLETE: 2,
  TRANSFER_COMPLETE: 3,
};

export function mergeEvidenceState(
  current: EvidenceState | undefined,
  incoming: Partial<EvidenceState> | undefined
): EvidenceState {
  const base = current ? { ...current } : createInitialEvidenceState();
  if (!incoming) return base;

  for (const dim of Object.keys(base) as EvidenceDimensionId[]) {
    const nextStatus = incoming[dim];
    if (nextStatus) {
      const currentRank = STATUS_RANK[base[dim]] ?? 0;
      const nextRank = STATUS_RANK[nextStatus] ?? 0;
      if (nextRank > currentRank) {
        base[dim] = nextStatus;
      }
    }
  }

  return base;
}
