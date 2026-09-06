import {
  createBaseUserProgress,
  type LevelId,
  type UserProgressData,
  type AttemptSummaryRecord,
  type PracticeMode,
  type EvidenceDimensionId,
  type EvidenceStatus,
  mergeEvidenceState,
  createInitialEvidenceState,
} from '@/src/types/progress';
import {
  getCourseLevel,
  normalizeLevelId,
  toLegacyLevelId,
  isLevelPublished,
  CANONICAL_COURSE_REGISTRY,
} from '@/src/courses/registry';
import { scoreAssessment } from '@/src/assessment/scoreAssessment';
import type { LevelAssessmentResult, ScoredAssessment } from '@/src/assessment/assessmentTypes';

export const P4_P5_P6_LEVELS = new Set([
  'C01', 'C02', 'C03',
  'D01', 'D02', 'D03', 'D04', 'D05',
  'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07',
]);

export function isAssessmentRequiredLevel(levelId: string): boolean {
  const norm = normalizeLevelId(levelId);
  return P4_P5_P6_LEVELS.has(norm);
}

export const LEVEL_IDS: LevelId[] = [
  'LEVEL_00', 'LEVEL_01', 'LEVEL_02', 'LEVEL_03', 'LEVEL_04',
  'LEVEL_05', 'LEVEL_06', 'LEVEL_07', 'LEVEL_08', 'LEVEL_09',
];

const PREREQUISITE: Partial<Record<LevelId, LevelId>> = {
  LEVEL_01: 'LEVEL_00',
  LEVEL_02: 'LEVEL_01',
  LEVEL_03: 'LEVEL_02',
  LEVEL_04: 'LEVEL_03',
  LEVEL_05: 'LEVEL_04',
  LEVEL_06: 'LEVEL_05',
  LEVEL_07: 'LEVEL_06',
  LEVEL_08: 'LEVEL_07',
  LEVEL_09: 'LEVEL_08',
};

const IMPLEMENTED_NEXT: Partial<Record<string, string>> = {
  LEVEL_00: 'LEVEL_01',
  LEVEL_01: 'LEVEL_02',
  B01: 'B02',
  B02: 'B03',
  B03: 'B04',
  B04: 'B05',
  B05: 'B06',
};

export class LearningTransitionError extends Error {
  constructor(
    public readonly code: 'INVALID_LEVEL' | 'LEVEL_LOCKED' | 'LEVEL_ALREADY_COMPLETED' | 'INVALID_SCORE',
    message: string
  ) {
    super(message);
    this.name = 'LearningTransitionError';
  }
}

export function isLevelId(value: string): value is LevelId {
  if (LEVEL_IDS.includes(value as LevelId)) return true;
  // Also recognize canonical IDs
  const canonical = normalizeLevelId(value);
  return CANONICAL_COURSE_REGISTRY.some((l) => l.canonicalId === canonical);
}

export function applyLearningEvent(
  current: UserProgressData | null,
  traineeName: string,
  input: { levelId: string; eventType: string; payload: unknown; occurredAt: number }
): {
  projection: UserProgressData;
  score: number | null;
  completed: boolean;
  isReplay?: boolean;
  attemptRecord?: AttemptSummaryRecord;
  scoredAssessment?: ScoredAssessment;
  rubricVersion?: 'v1' | 'v2';
} {
  const base = current || createBaseUserProgress(traineeName);
  const canonical = normalizeLevelId(input.levelId);
  const courseLevel = getCourseLevel(canonical);

  if (!courseLevel) {
    throw new LearningTransitionError('INVALID_LEVEL', `未知关卡：${input.levelId}`);
  }

  // Publication gate: Under-construction levels cannot be entered or completed
  if (!isLevelPublished(canonical)) {
    throw new LearningTransitionError('LEVEL_LOCKED', `关卡 ${courseLevel.title}（${courseLevel.num}）正在建设中，尚未开放实训`);
  }

  // Resolve legacy key for progress dictionary
  const legacyId = toLegacyLevelId(canonical) || input.levelId;

  // Prerequisite check
  const isCanonicalRequest = input.levelId.trim().toUpperCase() === canonical;
  if (isCanonicalRequest) {
    const completed = new Set(
      Object.entries(base.levels)
        .filter(([, progress]) => progress.status === 'completed')
        .map(([levelId]) => normalizeLevelId(levelId))
    );
    const missing = courseLevel.prerequisiteLevelIds.filter((levelId) => !completed.has(normalizeLevelId(levelId)));
    if (missing.length > 0) {
      throw new LearningTransitionError('LEVEL_LOCKED', `关卡 ${courseLevel.num} 尚未完成前置任务：${missing.join('、')}`);
    }
  } else {
    const prereq = PREREQUISITE[legacyId as LevelId];
    if (prereq && base.levels[prereq]?.status !== 'completed') {
      throw new LearningTransitionError('LEVEL_LOCKED', `前置关卡 ${prereq} 尚未完成`);
    }
    if (base.levels[legacyId]?.status === 'locked') {
      throw new LearningTransitionError('LEVEL_LOCKED', `关卡 ${legacyId} 尚未解锁`);
    }
  }

  if (input.eventType !== 'LEVEL_COMPLETE') {
    return {
      projection: {
        ...base,
        traineeName,
        currentActiveLevel: legacyId,
        teacherMode: false,
        lastUpdated: Date.now(),
      },
      score: null,
      completed: false,
    };
  }

  const isP4P5P6 = isAssessmentRequiredLevel(canonical);
  const rawAssessment = payloadHasAssessment(input.payload);

  let score: number;
  let mode: PracticeMode;
  let incomingEvidence: Partial<Record<EvidenceDimensionId, EvidenceStatus>> | undefined;
  let scoredAssessment: ScoredAssessment | undefined;
  let rubricVersion: 'v1' | 'v2' = 'v1';

  if (isP4P5P6) {
    if (!rawAssessment) {
      throw new LearningTransitionError('INVALID_SCORE', `关卡 ${canonical} 必须提交包含真实过程的量规评测数据 (assessment)`);
    }
    try {
      scoredAssessment = scoreAssessment(rawAssessment);
    } catch (err) {
      throw new LearningTransitionError('INVALID_SCORE', `关卡 ${canonical} 评测数据无效：${err instanceof Error ? err.message : '解析失败'}`);
    }
    score = scoredAssessment.score;
    mode = scoredAssessment.mode;
    incomingEvidence = scoredAssessment.evidence;
    rubricVersion = 'v2';
  } else if (rawAssessment) {
    try {
      scoredAssessment = scoreAssessment(rawAssessment);
      score = scoredAssessment.score;
      mode = scoredAssessment.mode;
      incomingEvidence = scoredAssessment.evidence;
      rubricVersion = 'v2';
    } catch {
      score = readScore(input.payload);
      mode = readPracticeMode(input.payload);
      incomingEvidence = readEvidence(input.payload);
    }
  } else {
    score = readScore(input.payload);
    mode = readPracticeMode(input.payload);
    incomingEvidence = readEvidence(input.payload);
  }

  const isReplay = base.levels[legacyId]?.status === 'completed';
  const maxHintLevel = readHintLevel(input.payload);

  const attemptRecord: AttemptSummaryRecord = {
    attemptId: readAttemptId(input.payload) || `att_${input.occurredAt}`,
    completedAt: new Date(input.occurredAt).toISOString(),
    score,
    mode,
    maxHintLevel,
    counters: scoredAssessment?.counters,
    rubricVersion,
  };

  const existingLevel = base.levels[legacyId] || { status: 'locked' };
  const currentCount = existingLevel.attemptCount ?? (isReplay ? 1 : 0);
  const newCount = currentCount + 1;

  // Evidence merging
  const existingEvidence = existingLevel.evidence ?? createInitialEvidenceState();
  const updatedEvidence = mergeEvidenceState(existingEvidence, incomingEvidence);

  // Preserve firstRecord, update recentRecord and bestRecord
  const firstRecord: AttemptSummaryRecord = existingLevel.firstRecord ?? attemptRecord;
  const recentRecord: AttemptSummaryRecord = attemptRecord;
  let bestRecord: AttemptSummaryRecord = existingLevel.bestRecord ?? attemptRecord;

  if (
    score > bestRecord.score ||
    (score === bestRecord.score && mode === 'independent' && bestRecord.mode === 'guided')
  ) {
    bestRecord = attemptRecord;
  }

  const levels = { ...base.levels };
  levels[legacyId] = {
    ...existingLevel,
    status: 'completed',
    score: existingLevel.score ?? score, // Preserve first score for legacy backward compatibility
    completedAt: existingLevel.completedAt || attemptRecord.completedAt,
    attemptCount: newCount,
    firstRecord,
    recentRecord,
    bestRecord,
    evidence: updatedEvidence,
  };

  // Unlock next implemented level ONLY on initial completion (not replay)
  const nextLevel = IMPLEMENTED_NEXT[legacyId];
  if (!isReplay && nextLevel && levels[nextLevel]?.status !== 'completed') {
    levels[nextLevel] = { ...(levels[nextLevel] ?? { status: 'locked' }), status: 'unlocked' };
  }

  return {
    projection: {
      version: 1,
      traineeName,
        currentActiveLevel: nextLevel || legacyId,
      teacherMode: false,
      lastUpdated: Date.now(),
      levels,
    },
    score,
    completed: true,
    isReplay,
    attemptRecord,
    scoredAssessment,
    rubricVersion,
  };
}

function payloadHasAssessment(payload: unknown): LevelAssessmentResult | null {
  if (payload && typeof payload === 'object' && 'assessment' in payload) {
    const candidate = (payload as { assessment?: unknown }).assessment;
    if (candidate && typeof candidate === 'object') {
      return candidate as LevelAssessmentResult;
    }
  }
  return null;
}

function readScore(payload: unknown): number {
  const score = payload && typeof payload === 'object' && 'score' in payload
    ? (payload as { score?: unknown }).score
    : undefined;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 100) {
    throw new LearningTransitionError('INVALID_SCORE', '成绩必须是0至100之间的整数');
  }
  return score;
}

function readPracticeMode(payload: unknown): PracticeMode {
  if (payload && typeof payload === 'object' && 'mode' in payload) {
    const mode = (payload as { mode?: unknown }).mode;
    if (mode === 'independent' || mode === 'transfer') return mode;
  }
  return 'guided';
}

function readHintLevel(payload: unknown): number {
  if (payload && typeof payload === 'object' && 'maxHintLevel' in payload) {
    const hint = (payload as { maxHintLevel?: unknown }).maxHintLevel;
    if (typeof hint === 'number' && Number.isInteger(hint) && hint >= 0) return hint;
  }
  return 0;
}

function readAttemptId(payload: unknown): string | undefined {
  if (payload && typeof payload === 'object' && 'attemptId' in payload) {
    const id = (payload as { attemptId?: unknown }).attemptId;
    if (typeof id === 'string' && id.trim()) return id.trim();
  }
  return undefined;
}

function readEvidence(payload: unknown): Partial<Record<string, unknown>> | undefined {
  if (payload && typeof payload === 'object' && 'evidence' in payload) {
    const ev = (payload as { evidence?: unknown }).evidence;
    if (ev && typeof ev === 'object') {
      return ev as Partial<Record<string, unknown>>;
    }
  }
  return undefined;
}
