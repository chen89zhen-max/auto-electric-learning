import type { EvidenceDimensionId, EvidenceStatus, PracticeMode } from './evidence';

export const C7_EVIDENCE_LEVEL_IDS = ['A03', 'D02', 'E03', 'E05'] as const;
export type C7EvidenceLevelId = (typeof C7_EVIDENCE_LEVEL_IDS)[number];

export interface AttemptAssessmentSummary {
  dimensions: Array<{ id: EvidenceDimensionId; label: string; score: number; stars: number }>;
  counters: {
    wrongAttempts: number;
    hintRequests: number;
    meterGuardBlocks: number;
    unsafeActions: number;
    retries: number;
  };
  durationMs: number;
}

export interface ValidatedProcessEvidence {
  steps: Record<string, Record<string, unknown>>;
}

export interface AttemptEvidenceEnvelopeV2 {
  schemaVersion: 2;
  levelId: C7EvidenceLevelId;
  dimensionEvidence: {
    values: Partial<Record<EvidenceDimensionId, EvidenceStatus>>;
    source: 'server_scored_assessment' | 'completion_payload';
  };
  assessmentSummary?: AttemptAssessmentSummary;
  processEvidence: ValidatedProcessEvidence;
  verification: {
    source: 'student_completion_event';
    shapeValidated: true;
    scoreAuthoritative: false;
  };
}

export interface AttemptEvidenceView {
  attemptId: string;
  levelId: C7EvidenceLevelId;
  score: number;
  mode: PracticeMode;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  rubricVersion: string;
  evidence: AttemptEvidenceEnvelopeV2 | null;
  legacyRecovered: boolean;
  unavailableReason?: string;
}

export interface AttemptEvidenceListResponse {
  levelId: C7EvidenceLevelId;
  total: number;
  limit: 50;
  attempts: AttemptEvidenceView[];
}

export function isC7EvidenceLevelId(value: unknown): value is C7EvidenceLevelId {
  return typeof value === 'string' && (C7_EVIDENCE_LEVEL_IDS as readonly string[]).includes(value);
}
