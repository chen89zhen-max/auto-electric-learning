import { createBaseUserProgress, type LevelId, type UserProgressData } from '@/src/types/progress';

export const LEVEL_IDS: LevelId[] = [
  'LEVEL_00', 'LEVEL_01', 'LEVEL_02', 'LEVEL_03', 'LEVEL_04',
  'LEVEL_05', 'LEVEL_06', 'LEVEL_07', 'LEVEL_08', 'LEVEL_09',
];

const PREREQUISITE: Partial<Record<LevelId, LevelId>> = {
  LEVEL_01: 'LEVEL_00', LEVEL_02: 'LEVEL_01', LEVEL_03: 'LEVEL_02', LEVEL_04: 'LEVEL_03',
  LEVEL_05: 'LEVEL_04', LEVEL_06: 'LEVEL_05', LEVEL_07: 'LEVEL_06', LEVEL_08: 'LEVEL_07', LEVEL_09: 'LEVEL_08',
};

const IMPLEMENTED_NEXT: Partial<Record<LevelId, LevelId>> = {
  LEVEL_00: 'LEVEL_01',
  LEVEL_01: 'LEVEL_02',
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
  return LEVEL_IDS.includes(value as LevelId);
}

export function applyLearningEvent(
  current: UserProgressData | null,
  traineeName: string,
  input: { levelId: LevelId; eventType: string; payload: unknown; occurredAt: number }
): { projection: UserProgressData; score: number | null; completed: boolean } {
  const base = current || createBaseUserProgress(traineeName);
  const prerequisite = PREREQUISITE[input.levelId];
  if (prerequisite && base.levels[prerequisite]?.status !== 'completed') {
    throw new LearningTransitionError('LEVEL_LOCKED', `前置关卡 ${prerequisite} 尚未完成`);
  }
  if (base.levels[input.levelId]?.status === 'locked') {
    throw new LearningTransitionError('LEVEL_LOCKED', `关卡 ${input.levelId} 尚未解锁`);
  }

  if (input.eventType !== 'LEVEL_COMPLETE') {
    return {
      projection: { ...base, traineeName, currentActiveLevel: input.levelId, teacherMode: false, lastUpdated: Date.now() },
      score: null,
      completed: false,
    };
  }
  if (base.levels[input.levelId]?.status === 'completed') {
    throw new LearningTransitionError('LEVEL_ALREADY_COMPLETED', `关卡 ${input.levelId} 已完成`);
  }
  const score = readScore(input.payload);
  const levels = { ...base.levels };
  levels[input.levelId] = {
    ...levels[input.levelId],
    status: 'completed',
    score,
    completedAt: new Date(input.occurredAt).toISOString(),
  };
  const nextLevel = IMPLEMENTED_NEXT[input.levelId];
  if (nextLevel && levels[nextLevel].status === 'locked') {
    levels[nextLevel] = { ...levels[nextLevel], status: 'unlocked' };
  }
  return {
    projection: {
      version: 1,
      traineeName,
      currentActiveLevel: nextLevel || input.levelId,
      teacherMode: false,
      lastUpdated: Date.now(),
      levels,
    },
    score,
    completed: true,
  };
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
