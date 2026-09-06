export type LevelId =
  | 'LEVEL_00'
  | 'LEVEL_01'
  | 'LEVEL_02'
  | 'LEVEL_03'
  | 'LEVEL_04'
  | 'LEVEL_05'
  | 'LEVEL_06'
  | 'LEVEL_07'
  | 'LEVEL_08'
  | 'LEVEL_09';

export interface LevelProgress {
  status: 'locked' | 'unlocked' | 'completed';
  completedAt?: string;
  score?: number;
}

export interface UserProgressData {
  version: number;
  traineeName: string;
  currentActiveLevel: LevelId;
  levels: Record<LevelId, LevelProgress>;
  teacherMode: boolean;
  lastUpdated: number;
}

export function createBaseUserProgress(traineeName = '见习学员'): UserProgressData {
  return {
    version: 1,
    traineeName,
    currentActiveLevel: 'LEVEL_00',
    teacherMode: false,
    lastUpdated: Date.now(),
    levels: {
      LEVEL_00: { status: 'unlocked' },
      LEVEL_01: { status: 'locked' },
      LEVEL_02: { status: 'locked' },
      LEVEL_03: { status: 'locked' },
      LEVEL_04: { status: 'locked' },
      LEVEL_05: { status: 'locked' },
      LEVEL_06: { status: 'locked' },
      LEVEL_07: { status: 'locked' },
      LEVEL_08: { status: 'locked' },
      LEVEL_09: { status: 'locked' },
    },
  };
}
