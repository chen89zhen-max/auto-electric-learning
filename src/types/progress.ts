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
  currentActiveLevel: LevelId;
  levels: Record<LevelId, LevelProgress>;
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
