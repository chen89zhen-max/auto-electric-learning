import type { EvidenceDimensionId, EvidenceStatus } from '@/src/types/evidence';

export type TrainingStageId =
  | 'cognition'
  | 'standard'
  | 'calculation'
  | 'blind_test'
  | 'transfer';

export interface StageAssessment {
  stageId: TrainingStageId;
  mode: 'guided' | 'independent' | 'transfer';
  startedAt: number;
  completedAt: number | null;
  wrongAttempts: number;
  hintRequests: number;
  meterGuardBlocks: number;
  unsafeActions: number;
  retries: number;
  completed: boolean;
}

export interface LevelAssessmentResult {
  schemaVersion: 1;
  levelId: string;
  rubricVersion: 'v2';
  startedAt: number;
  completedAt: number;
  stages: StageAssessment[];
}

export interface ScoredAssessment {
  score: number;
  durationMs: number;
  mode: 'guided' | 'independent' | 'transfer';
  dimensions: Array<{ id: EvidenceDimensionId; label: string; score: number; stars: number }>;
  evidence: Partial<Record<EvidenceDimensionId, EvidenceStatus>>;
  counters: {
    wrongAttempts: number;
    hintRequests: number;
    meterGuardBlocks: number;
    unsafeActions: number;
    retries: number;
  };
}

export interface LevelRubricDefinition {
  levelId: string;
  rubricVersion: 'v2';
  dimensions: Array<{
    id: EvidenceDimensionId;
    label: string;
    stages: TrainingStageId[];
  }>;
}
