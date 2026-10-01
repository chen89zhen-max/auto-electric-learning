import type { ScoredAssessment } from '@/src/assessment/assessmentTypes';
import type { EvidenceDimensionId, EvidenceStatus, PracticeMode } from '@/src/types/evidence';
import type {
  AttemptAssessmentSummary,
  AttemptEvidenceEnvelopeV2,
  AttemptEvidenceListResponse,
  AttemptEvidenceView,
  C7EvidenceLevelId,
  ValidatedProcessEvidence,
} from '@/src/types/attemptEvidence';
import {
  ProcessEvidenceValidationError,
  validateProcessEvidence,
} from './processEvidenceValidators';
import { getDatabase, type AppDatabase } from '../db/database';
import { normalizeLevelId, toLegacyLevelId } from '@/src/courses/registry';

const VALID_DIMENSION_IDS = new Set<EvidenceDimensionId>([
  'SAFETY_SPECIFICATION',
  'CIRCUIT_READING',
  'TOOL_MEASUREMENT',
  'RULE_EXPLANATION',
  'DIAGNOSTIC_STRATEGY',
  'EVIDENCE_EXPRESSION',
]);

const VALID_EVIDENCE_STATUSES = new Set<EvidenceStatus>([
  'NO_EVIDENCE',
  'GUIDED_COMPLETE',
  'INDEPENDENT_COMPLETE',
  'TRANSFER_COMPLETE',
]);

export function sanitizeDimensionEvidence(
  submitted: unknown,
): Partial<Record<EvidenceDimensionId, EvidenceStatus>> {
  if (!submitted || typeof submitted !== 'object' || Array.isArray(submitted)) {
    return {};
  }
  const result: Partial<Record<EvidenceDimensionId, EvidenceStatus>> = {};
  for (const [k, v] of Object.entries(submitted as Record<string, unknown>)) {
    if (!VALID_DIMENSION_IDS.has(k as EvidenceDimensionId)) {
      throw new ProcessEvidenceValidationError('UNKNOWN_FIELD');
    }
    if (!VALID_EVIDENCE_STATUSES.has(v as EvidenceStatus)) {
      throw new ProcessEvidenceValidationError('INVALID_VALUE');
    }
    result[k as EvidenceDimensionId] = v as EvidenceStatus;
  }
  return result;
}

export function buildAttemptEvidenceEnvelope(
  levelId: C7EvidenceLevelId,
  metrics: unknown,
  scoredAssessment?: ScoredAssessment,
  submittedDimensionEvidence?: unknown,
): AttemptEvidenceEnvelopeV2 {
  const processEvidence = validateProcessEvidence(levelId, metrics);
  const dimensionEvidence = scoredAssessment
    ? { values: scoredAssessment.evidence, source: 'server_scored_assessment' as const }
    : { values: sanitizeDimensionEvidence(submittedDimensionEvidence), source: 'completion_payload' as const };
  return {
    schemaVersion: 2,
    levelId,
    dimensionEvidence,
    ...(scoredAssessment
      ? {
          assessmentSummary: {
            dimensions: scoredAssessment.dimensions,
            counters: scoredAssessment.counters,
            durationMs: scoredAssessment.durationMs,
          },
        }
      : {}),
    processEvidence,
    verification: {
      source: 'student_completion_event',
      shapeValidated: true,
      scoreAuthoritative: false,
    },
  };
}

export function parseAttemptEvidence(
  expectedLevelId: C7EvidenceLevelId,
  data: unknown,
): AttemptEvidenceEnvelopeV2 | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const obj = data as Record<string, unknown>;
  const allowedKeys = new Set([
    'schemaVersion',
    'levelId',
    'dimensionEvidence',
    'assessmentSummary',
    'processEvidence',
    'verification',
  ]);
  for (const k of Object.keys(obj)) {
    if (!allowedKeys.has(k)) return null;
  }
  if (obj.schemaVersion !== 2) return null;
  if (obj.levelId !== expectedLevelId) return null;

  if (
    !obj.verification ||
    typeof obj.verification !== 'object' ||
    (obj.verification as Record<string, unknown>).source !== 'student_completion_event' ||
    (obj.verification as Record<string, unknown>).shapeValidated !== true ||
    (obj.verification as Record<string, unknown>).scoreAuthoritative !== false
  ) {
    return null;
  }

  const dimEv = obj.dimensionEvidence as Record<string, unknown> | undefined;
  if (
    !dimEv ||
    typeof dimEv !== 'object' ||
    (dimEv.source !== 'server_scored_assessment' && dimEv.source !== 'completion_payload')
  ) {
    return null;
  }
  let sanitizedValues: Partial<Record<EvidenceDimensionId, EvidenceStatus>>;
  try {
    sanitizedValues = sanitizeDimensionEvidence(dimEv.values);
  } catch {
    return null;
  }

  let assessmentSummary: AttemptAssessmentSummary | undefined;
  if (obj.assessmentSummary !== undefined) {
    if (!obj.assessmentSummary || typeof obj.assessmentSummary !== 'object') return null;
    const as = obj.assessmentSummary as Record<string, unknown>;
    if (!Array.isArray(as.dimensions) || typeof as.counters !== 'object' || !as.counters) return null;
    if (typeof as.durationMs !== 'number' || !Number.isFinite(as.durationMs) || as.durationMs < 0) return null;

    const counters = as.counters as Record<string, unknown>;
    const counterKeys = ['wrongAttempts', 'hintRequests', 'meterGuardBlocks', 'unsafeActions', 'retries'] as const;
    for (const ck of counterKeys) {
      if (typeof counters[ck] !== 'number' || !Number.isFinite(counters[ck]) || (counters[ck] as number) < 0) {
        return null;
      }
    }
    assessmentSummary = {
      dimensions: as.dimensions as AttemptAssessmentSummary['dimensions'],
      counters: {
        wrongAttempts: counters.wrongAttempts as number,
        hintRequests: counters.hintRequests as number,
        meterGuardBlocks: counters.meterGuardBlocks as number,
        unsafeActions: counters.unsafeActions as number,
        retries: counters.retries as number,
      },
      durationMs: as.durationMs,
    };
  }

  const pe = obj.processEvidence as Record<string, unknown> | undefined;
  if (!pe || typeof pe !== 'object' || !pe.steps) return null;

  let validatedSteps: ValidatedProcessEvidence;
  try {
    validatedSteps = validateProcessEvidence(expectedLevelId, pe.steps);
  } catch {
    return null;
  }

  return {
    schemaVersion: 2,
    levelId: expectedLevelId,
    dimensionEvidence: {
      values: sanitizedValues,
      source: dimEv.source,
    },
    ...(assessmentSummary ? { assessmentSummary } : {}),
    processEvidence: validatedSteps,
    verification: {
      source: 'student_completion_event',
      shapeValidated: true,
      scoreAuthoritative: false,
    },
  };
}

function recoverLegacyAttemptEvidence(
  attemptId: string,
  levelId: C7EvidenceLevelId,
  oldEvidenceData: Record<string, unknown> | null,
  db: AppDatabase,
): { evidence: AttemptEvidenceEnvelopeV2 | null; legacyRecovered: boolean; unavailableReason?: string } {
  const eventRow = db.prepare<{ payload: string }>(
    `SELECT payload
     FROM learning_events
     WHERE attempt_id=? AND event_type='LEVEL_COMPLETE'
     ORDER BY occurred_at DESC
     LIMIT 1`
  ).get(attemptId);

  if (!eventRow) {
    return { evidence: null, legacyRecovered: false, unavailableReason: '该次历史记录未保存步骤明细' };
  }

  let eventPayloadObj: Record<string, unknown>;
  try {
    const parsedEnvelope = JSON.parse(eventRow.payload) as Record<string, unknown>;
    eventPayloadObj = (parsedEnvelope.eventPayload ?? parsedEnvelope) as Record<string, unknown>;
  } catch {
    return { evidence: null, legacyRecovered: false, unavailableReason: '该次历史记录未保存步骤明细' };
  }

  const rawMetrics = eventPayloadObj.metrics;
  if (!rawMetrics) {
    return { evidence: null, legacyRecovered: false, unavailableReason: '该次历史记录未保存步骤明细' };
  }

  let processEvidence: ValidatedProcessEvidence;
  try {
    processEvidence = validateProcessEvidence(levelId, rawMetrics);
  } catch {
    return { evidence: null, legacyRecovered: false, unavailableReason: '该次历史记录未保存步骤明细' };
  }

  // Preserve legacy assessment summary if present in old evidence_data
  let assessmentSummary: AttemptAssessmentSummary | undefined;
  let dimensionEvidence: AttemptEvidenceEnvelopeV2['dimensionEvidence'] = {
    values: {},
    source: 'completion_payload',
  };

  if (oldEvidenceData) {
    if (
      Array.isArray(oldEvidenceData.dimensions) &&
      oldEvidenceData.counters &&
      typeof oldEvidenceData.counters === 'object' &&
      typeof oldEvidenceData.durationMs === 'number'
    ) {
      assessmentSummary = {
        dimensions: oldEvidenceData.dimensions as AttemptAssessmentSummary['dimensions'],
        counters: oldEvidenceData.counters as AttemptAssessmentSummary['counters'],
        durationMs: oldEvidenceData.durationMs as number,
      };
      dimensionEvidence = {
        values: sanitizeDimensionEvidence(oldEvidenceData.evidence),
        source: 'server_scored_assessment',
      };
    } else if (oldEvidenceData.evidence && typeof oldEvidenceData.evidence === 'object') {
      dimensionEvidence = {
        values: sanitizeDimensionEvidence(oldEvidenceData.evidence),
        source: 'completion_payload',
      };
    } else {
      try {
        dimensionEvidence = {
          values: sanitizeDimensionEvidence(oldEvidenceData),
          source: 'completion_payload',
        };
      } catch {
        dimensionEvidence = { values: {}, source: 'completion_payload' };
      }
    }
  }

  return {
    evidence: {
      schemaVersion: 2,
      levelId,
      dimensionEvidence,
      ...(assessmentSummary ? { assessmentSummary } : {}),
      processEvidence,
      verification: {
        source: 'student_completion_event',
        shapeValidated: true,
        scoreAuthoritative: false,
      },
    },
    legacyRecovered: true,
  };
}

export function listAttemptEvidence(params: {
  studentId: string;
  levelId: C7EvidenceLevelId;
  limit?: number;
  db?: AppDatabase;
}): AttemptEvidenceListResponse {
  const db = params.db ?? getDatabase();
  const canonical = normalizeLevelId(params.levelId) as C7EvidenceLevelId;
  const legacy = toLegacyLevelId(canonical) || canonical;
  const hardLimit = 50;

  const countRow = db.prepare<{ count: number }>(
    `SELECT COUNT(*) count FROM learning_attempts
     WHERE student_id=? AND (level_id=? OR level_id=?) AND status='completed' AND completed_at IS NOT NULL`
  ).get(params.studentId, legacy, canonical);
  const total = countRow?.count ?? 0;

  const rows = db.prepare<{
    id: string;
    level_id: string;
    started_at: number;
    completed_at: number;
    score: number | null;
    mode: string | null;
    rubric_version: string | null;
    evidence_data: string | null;
  }>(
    `SELECT id, level_id, started_at, completed_at, score, mode, rubric_version, evidence_data
     FROM learning_attempts
     WHERE student_id=? AND (level_id=? OR level_id=?) AND status='completed' AND completed_at IS NOT NULL
     ORDER BY started_at DESC, id DESC
     LIMIT ?`
  ).all(params.studentId, legacy, canonical, hardLimit);

  const attempts: AttemptEvidenceView[] = rows.map((row) => {
    const startedAt = Number(row.started_at);
    const completedAt = Number(row.completed_at);
    const durationMs = Math.max(0, completedAt - startedAt);
    const score = Number(row.score ?? 0);
    const mode = (row.mode ?? 'guided') as PracticeMode;
    const rubricVersion = row.rubric_version ?? 'v1';

    let evidence: AttemptEvidenceEnvelopeV2 | null = null;
    let legacyRecovered = false;
    let unavailableReason: string | undefined;

    let parsedEvidenceData: Record<string, unknown> | null = null;
    let isCorruptJson = false;

    if (row.evidence_data) {
      try {
        parsedEvidenceData = JSON.parse(row.evidence_data) as Record<string, unknown>;
      } catch {
        isCorruptJson = true;
      }
    }

    if (parsedEvidenceData && parsedEvidenceData.schemaVersion === 2) {
      try {
        evidence = parseAttemptEvidence(canonical, parsedEvidenceData);
        if (!evidence) {
          unavailableReason = '过程证据记录损坏或格式无效';
        }
      } catch {
        evidence = null;
        unavailableReason = '过程证据记录损坏或格式无效';
      }
    } else {
      // Legacy recovery attempt
      try {
        const recovered = recoverLegacyAttemptEvidence(row.id, canonical, parsedEvidenceData, db);
        evidence = recovered.evidence;
        legacyRecovered = recovered.legacyRecovered;
        unavailableReason = recovered.unavailableReason;
      } catch {
        evidence = null;
        legacyRecovered = false;
        unavailableReason = isCorruptJson ? '过程证据记录损坏或格式无效' : '该次历史记录未保存步骤明细';
      }
    }

    if (!evidence && !unavailableReason) {
      unavailableReason = isCorruptJson ? '过程证据记录损坏或格式无效' : '该次历史记录未保存步骤明细';
    }

    return {
      attemptId: row.id,
      levelId: canonical,
      score,
      mode,
      startedAt,
      completedAt,
      durationMs,
      rubricVersion,
      evidence,
      legacyRecovered,
      ...(unavailableReason ? { unavailableReason } : {}),
    };
  });

  return {
    levelId: canonical,
    total,
    limit: 50,
    attempts,
  };
}
