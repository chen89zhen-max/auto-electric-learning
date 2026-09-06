import type { AuthenticatedUser } from '../auth/session';
import { generateSecureToken } from '../auth/crypto';
import { getDatabase, type AppDatabase } from '../db/database';
import { createBaseUserProgress, type UserProgressData } from '@/src/types/progress';
import { applyLearningEvent, isLevelId, LearningTransitionError } from './stateTransitions';

export interface LearningEventInput {
  eventId: string;
  levelId: string;
  eventType: string;
  payload: unknown;
  occurredAt: number;
}

export interface LearningEventResult {
  projection: UserProgressData;
  attemptId: string;
  idempotent: boolean;
}

export type LearningEventErrorCode =
  | 'INVALID_EVENT'
  | 'INVALID_LEVEL'
  | 'MISSING_CURRENT_CLASS'
  | 'MISSING_COURSE_VERSION'
  | 'EVENT_ID_CONFLICT'
  | 'LEVEL_LOCKED'
  | 'LEVEL_ALREADY_COMPLETED'
  | 'INVALID_SCORE';

export class LearningEventError extends Error {
  constructor(public readonly code: LearningEventErrorCode, message: string) {
    super(message);
    this.name = 'LearningEventError';
  }
}

interface StoredEventRow {
  payload: string;
  attempt_id: string;
  student_id: string;
}

interface StoredEnvelope {
  eventPayload: unknown;
  projection: UserProgressData;
}

export function runWriteTransactionWithRetry<T>(
  db: AppDatabase,
  operation: () => T,
  options: { maxRetries?: number; sleep?: (milliseconds: number) => void } = {}
): T {
  const maxRetries = options.maxRetries ?? 3;
  const sleep = options.sleep ?? blockingSleep;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return db.transaction(operation);
    } catch (error) {
      if (!isSqliteBusy(error) || attempt >= maxRetries) throw error;
      sleep(20 * 3 ** attempt);
    }
  }
}

export function submitLearningEvent(
  user: AuthenticatedUser,
  rawInput: LearningEventInput,
  db: AppDatabase = getDatabase()
): LearningEventResult {
  const input = validateInput(rawInput);
  const existing = findStoredEvent(input.eventId, db);
  if (existing) return existingResult(existing, user.id, input.payload);

  return runWriteTransactionWithRetry(db, () => {
    const concurrentExisting = findStoredEvent(input.eventId, db);
    if (concurrentExisting) return existingResult(concurrentExisting, user.id, input.payload);

    const classRow = db.prepare<{ class_id: string }>(
      `SELECT sc.class_id FROM student_class sc
       JOIN classes c ON c.id=sc.class_id
       WHERE sc.student_id=? AND sc.is_current=1 AND c.status='active' LIMIT 1`
    ).get(user.id);
    if (!classRow) {
      throw new LearningEventError('MISSING_CURRENT_CLASS', '学生当前没有有效班级关系');
    }
    const courseVersion = db.prepare<{ id: string }>(
      `SELECT id FROM course_versions
       WHERE course_code='auto_elec_base' AND status='active'
       ORDER BY published_at DESC,id DESC LIMIT 1`
    ).get();
    if (!courseVersion) {
      throw new LearningEventError('MISSING_COURSE_VERSION', '当前课程版本不可用');
    }

    const progressRow = db.prepare<{ progress_data: string }>(
      'SELECT progress_data FROM user_progress WHERE user_id=?'
    ).get(user.id);
    const current = parseProgress(progressRow?.progress_data, user.realName);
    let transition;
    try {
      transition = applyLearningEvent(current, user.realName, input);
    } catch (error) {
      if (error instanceof LearningTransitionError) {
        throw new LearningEventError(error.code, error.message);
      }
      throw error;
    }

    const attemptMode = transition.attemptRecord?.mode ?? extractMode(input.payload);
    const attemptSeed = extractSeed(input.payload);
    let attemptEvidence: string | null = null;
    if (transition.scoredAssessment) {
      attemptEvidence = JSON.stringify({
        evidence: transition.scoredAssessment.evidence,
        dimensions: transition.scoredAssessment.dimensions,
        counters: transition.scoredAssessment.counters,
        durationMs: transition.scoredAssessment.durationMs,
      });
    } else {
      attemptEvidence = extractEvidenceString(input.payload);
    }
    const rubricVersion = transition.rubricVersion ?? 'v1';

    let attempt = db.prepare<{ id: string }>(
      `SELECT id FROM learning_attempts
       WHERE student_id=? AND class_id=? AND course_version_id=? AND level_id=? AND status='in_progress'
       ORDER BY started_at DESC LIMIT 1`
    ).get(user.id, classRow.class_id, courseVersion.id, input.levelId);

    if (!attempt) {
      attempt = { id: `try_${generateSecureToken(10)}` };
      db.prepare(
        `INSERT INTO learning_attempts
          (id,student_id,class_id,course_version_id,level_id,started_at,completed_at,score,status,mode,seed,evidence_data,rubric_version)
         VALUES (?,?,?,?,?,?,?,?,?,'${attemptMode}',?,?,?)`
      ).run(
        attempt.id,
        user.id,
        classRow.class_id,
        courseVersion.id,
        input.levelId,
        input.occurredAt,
        transition.completed ? input.occurredAt : null,
        transition.completed ? transition.score : null,
        transition.completed ? 'completed' : 'in_progress',
        attemptSeed,
        attemptEvidence,
        rubricVersion
      );
    } else if (transition.completed) {
      db.prepare(
        `UPDATE learning_attempts
         SET status='completed',completed_at=?,score=?,mode='${attemptMode}',seed=?,evidence_data=?,rubric_version=?
         WHERE id=? AND status='in_progress'`
      ).run(input.occurredAt, transition.score, attemptSeed, attemptEvidence, rubricVersion, attempt.id);
    }

    const envelope: StoredEnvelope = { eventPayload: input.payload, projection: transition.projection };
    db.prepare(
      'INSERT INTO learning_events (id,attempt_id,event_type,payload,occurred_at) VALUES (?,?,?,?,?)'
    ).run(input.eventId, attempt.id, input.eventType, JSON.stringify(envelope), input.occurredAt);

    db.prepare(
      `INSERT INTO user_progress (user_id,progress_data,version,last_updated)
       VALUES (?,?,1,?)
       ON CONFLICT(user_id) DO UPDATE SET progress_data=excluded.progress_data,version=excluded.version,last_updated=excluded.last_updated`
    ).run(user.id, JSON.stringify(transition.projection), transition.projection.lastUpdated);

    return { projection: transition.projection, attemptId: attempt.id, idempotent: false };
  });
}

function validateInput(input: LearningEventInput): LearningEventInput {
  const now = Date.now();
  let serializedPayload = '';
  try { serializedPayload = JSON.stringify(input.payload); } catch {}
  if (!input || typeof input.eventId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(input.eventId)
    || typeof input.levelId !== 'string' || !isLevelId(input.levelId)
    || typeof input.eventType !== 'string' || !/^[A-Z][A-Z0-9_]{1,79}$/.test(input.eventType)
    || !Number.isInteger(input.occurredAt) || input.occurredAt < 0 || input.occurredAt > now + 5 * 60 * 1000
    || !serializedPayload || serializedPayload.length > 64 * 1024) {
    throw new LearningEventError('INVALID_EVENT', '学习事件格式无效');
  }
  return input;
}

function findStoredEvent(eventId: string, db: AppDatabase): StoredEventRow | undefined {
  return db.prepare<StoredEventRow>(
    `SELECT le.payload,le.attempt_id,la.student_id
     FROM learning_events le JOIN learning_attempts la ON la.id=le.attempt_id WHERE le.id=?`
  ).get(eventId);
}

function existingResult(row: StoredEventRow, userId: string, incomingPayload: unknown): LearningEventResult {
  if (row.student_id !== userId) {
    throw new LearningEventError('EVENT_ID_CONFLICT', '事件编号已被其他学习记录使用');
  }
  try {
    const envelope = JSON.parse(row.payload) as StoredEnvelope;
    if (!envelope.projection?.levels) throw new Error('projection missing');

    // Strict conflict detection: verify payload consistency for same eventId
    const storedPayloadStr = JSON.stringify(envelope.eventPayload);
    const incomingPayloadStr = JSON.stringify(incomingPayload);
    if (storedPayloadStr !== incomingPayloadStr) {
      throw new LearningEventError('EVENT_ID_CONFLICT', '相同事件编号已存在但事件内容不一致');
    }

    return { projection: envelope.projection, attemptId: row.attempt_id, idempotent: true };
  } catch (error) {
    if (error instanceof LearningEventError) throw error;
    throw new LearningEventError('EVENT_ID_CONFLICT', '历史事件内容无法用于幂等响应');
  }
}

function parseProgress(value: string | undefined, traineeName: string): UserProgressData {
  if (!value) return createBaseUserProgress(traineeName);
  try {
    const parsed = JSON.parse(value) as UserProgressData;
    return parsed?.levels ? parsed : createBaseUserProgress(traineeName);
  } catch {
    return createBaseUserProgress(traineeName);
  }
}

function extractMode(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'mode' in payload) {
    const mode = (payload as { mode?: unknown }).mode;
    if (mode === 'independent' || mode === 'transfer') return mode;
  }
  return 'guided';
}

function extractSeed(payload: unknown): string | null {
  if (payload && typeof payload === 'object' && 'seed' in payload) {
    const seed = (payload as { seed?: unknown }).seed;
    if (typeof seed === 'string') return seed;
  }
  return null;
}

function extractEvidenceString(payload: unknown): string | null {
  if (payload && typeof payload === 'object' && 'evidence' in payload) {
    const ev = (payload as { evidence?: unknown }).evidence;
    if (ev && typeof ev === 'object') {
      try {
        return JSON.stringify(ev);
      } catch {}
    }
  }
  return null;
}

function isSqliteBusy(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; errcode?: number; message?: string };
  return candidate.code === 'SQLITE_BUSY' || candidate.errcode === 5
    || /database is (locked|busy)/i.test(candidate.message || '');
}

function blockingSleep(milliseconds: number): void {
  const waitBuffer = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(waitBuffer), 0, 0, milliseconds);
}
