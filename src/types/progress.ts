import {
  type AttemptSummaryRecord,
  type EvidenceState,
  createInitialEvidenceState,
} from './evidence';

export type {
  EvidenceDimensionId,
  EvidenceStatus,
  PhysicalObservationStatus,
  PracticeMode,
  EvidenceDimensionInfo,
  EvidenceState,
  AttemptSummaryRecord,
} from './evidence';

export {
  EVIDENCE_DIMENSIONS,
  createInitialEvidenceState,
  mergeEvidenceState,
} from './evidence';

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
  attemptCount?: number;
  firstRecord?: AttemptSummaryRecord;
  recentRecord?: AttemptSummaryRecord;
  bestRecord?: AttemptSummaryRecord;
  transferRecord?: AttemptSummaryRecord;
  evidence?: EvidenceState;
  isLegacyVersion?: boolean;
}

export interface UserProgressData {
  version: number;
  traineeName: string;
  currentActiveLevel: string;
  levels: Record<LevelId, LevelProgress> & Record<string, LevelProgress>;
  teacherMode: boolean;
  lastUpdated: number;
}

export function createBaseUserProgress(traineeName = '见习学员'): UserProgressData {
  const createInitialLevel = (status: 'locked' | 'unlocked'): LevelProgress => ({
    status,
    attemptCount: 0,
    evidence: createInitialEvidenceState(),
  });

  return {
    version: 1,
    traineeName,
    currentActiveLevel: 'LEVEL_00',
    teacherMode: false,
    lastUpdated: Date.now(),
    levels: {
      LEVEL_00: createInitialLevel('unlocked'),
      LEVEL_01: createInitialLevel('locked'),
      LEVEL_02: createInitialLevel('locked'),
      LEVEL_03: createInitialLevel('locked'),
      LEVEL_04: createInitialLevel('locked'),
      LEVEL_05: createInitialLevel('locked'),
      LEVEL_06: createInitialLevel('locked'),
      LEVEL_07: createInitialLevel('locked'),
      LEVEL_08: createInitialLevel('locked'),
      LEVEL_09: createInitialLevel('locked'),
    },
  };
}

export function createAllCompletedUserProgress(traineeName = '通关学员'): UserProgressData {
  const completedLevel = (): LevelProgress => ({
    status: 'completed',
    score: 100,
    attemptCount: 1,
    completedAt: '2026-09-01T08:00:00.000Z',
    evidence: createInitialEvidenceState(),
  });

  const levels: Record<string, LevelProgress> = {
    LEVEL_00: completedLevel(),
    LEVEL_01: completedLevel(),
    LEVEL_02: completedLevel(),
    LEVEL_03: completedLevel(),
    LEVEL_04: completedLevel(),
    LEVEL_05: completedLevel(),
    LEVEL_06: completedLevel(),
    LEVEL_07: completedLevel(),
    LEVEL_08: completedLevel(),
    LEVEL_09: completedLevel(),
  };

  const canonicalIds = [
    'O00', 'O01',
    'A01', 'A02', 'A03', 'A04',
    'B01', 'B02', 'B03', 'B04', 'B05', 'B06',
    'C01', 'C02', 'C03',
    'D01', 'D02', 'D03', 'D04', 'D05',
    'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07',
    'F01',
  ];

  for (const id of canonicalIds) {
    levels[id] = completedLevel();
  }

  return {
    version: 1,
    traineeName,
    currentActiveLevel: 'O00',
    teacherMode: false,
    lastUpdated: Date.now(),
    levels: levels as UserProgressData['levels'],
  };
}
