import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as eventPost } from '@/app/api/learning/events/route';
import { hashPassword } from '@/src/server/auth/crypto';
import { createSession } from '@/src/server/auth/session';
import { assignStudentToClass, createClass } from '@/src/server/db/classService';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import { normalizeLevelId, toLegacyLevelId } from '@/src/courses/registry';
import { scoreAssessment } from '@/src/assessment/scoreAssessment';
import { createAllCompletedUserProgress } from '@/src/types/progress';
import type { AttemptEvidenceEnvelopeV2 } from '@/src/types/attemptEvidence';
import { listAttemptEvidence } from '@/src/server/learning/attemptEvidenceService';
import { validateProcessEvidence } from '@/src/server/learning/processEvidenceValidators';
import {
  makeValidA03Metrics,
  makeValidAssessment,
  makeValidD02Metrics,
  makeValidE03Metrics,
  makeValidE05Metrics,
} from './helpers/c7EvidenceFixtures';

let db: AppDatabase;
let studentToken: string;
let currentClassId: string;
let currentCourseVersionId: string;
const studentId = 'student-c7';

function makeRequest(token: string, eventData: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/learning/events', {
    method: 'POST',
    headers: { cookie: `nev_session=${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(eventData),
  });
}


function readProgressLevelStatus(targetDb: AppDatabase, userId: string, levelId: string): string | undefined {
  const row = targetDb.prepare<{ progress_data: string }>('SELECT progress_data FROM user_progress WHERE user_id=?').get(userId);
  if (!row) return undefined;
  const data = JSON.parse(row.progress_data);
  const canonical = normalizeLevelId(levelId);
  const legacy = toLegacyLevelId(canonical) || canonical;
  return data.levels[legacy]?.status || data.levels[canonical]?.status;
}

async function submitLevelCompletion(
  levelId: string,
  eventId: string,
  metrics: Record<string, unknown> | undefined,
  assessment?: unknown,
  extraPayload: Record<string, unknown> = {},
  token: string = studentToken
) {
  const startEvent = {
    eventId: `start-${eventId}`,
    levelId,
    eventType: 'LEVEL_START',
    payload: {},
    occurredAt: Date.now() - 1000,
  };
  await eventPost(makeRequest(token, startEvent));

  const completeEvent = {
    eventId,
    levelId,
    eventType: 'LEVEL_COMPLETE',
    payload: {
      score: 95,
      mode: 'transfer',
      ...(metrics ? { metrics } : {}),
      ...(assessment ? { assessment } : {}),
      ...extraPayload,
    },
    occurredAt: Date.now(),
  };
  return eventPost(makeRequest(token, completeEvent));
}

function setupTestDb(targetDb: AppDatabase) {
  const now = Date.now();
  targetDb.prepare(
    `INSERT INTO users
      (id,username,password_hash,real_name,role,class_name,status,must_change_password,created_at,updated_at)
     VALUES (?,?,?,?,?,'','active',0,?,?)`
  ).run(studentId, 'student_c7', hashPassword('Start#2026'), '李强', 'student', now, now);
  const targetClass = createClass({ name: '汽修精修一班' }, targetDb);
  assignStudentToClass(studentId, targetClass.id, undefined, targetDb);
  currentClassId = targetClass.id;
  currentCourseVersionId = targetDb.prepare<{ id: string }>(
    'SELECT id FROM course_versions WHERE course_code=\'auto_elec_base\' LIMIT 1'
  ).get()!.id;

  const initialProgress = createAllCompletedUserProgress('李强');
  // Set target levels to 'unlocked' so they can be completed in test
  for (const lvl of ['A03', 'D02', 'E03', 'E05', 'LEVEL_00', 'LEVEL_02']) {
    if (initialProgress.levels[lvl]) {
      initialProgress.levels[lvl].status = 'unlocked';
      initialProgress.levels[lvl].attemptCount = 0;
    }
  }
  targetDb.prepare('INSERT OR REPLACE INTO user_progress (user_id, progress_data, version, last_updated) VALUES (?, ?, 1, ?)')
    .run(studentId, JSON.stringify(initialProgress), now);
}

beforeEach(() => {
  db = createSqliteAdapter(':memory:');
  setDatabaseInstance(db);
  setupTestDb(db);
  studentToken = createSession(studentId, 'student_c7', { db }).token;
});

describe('Task 2: V2 Evidence Persistence & Transaction Rollback', () => {
  it('persists a V2 envelope for A03/D02/E03/E05', async () => {
    const cases = [
      { levelId: 'A03', metrics: makeValidA03Metrics(), assessment: undefined },
      { levelId: 'D02', metrics: makeValidD02Metrics(), assessment: makeValidAssessment('D02') },
      { levelId: 'E03', metrics: makeValidE03Metrics(), assessment: makeValidAssessment('E03') },
      { levelId: 'E05', metrics: makeValidE05Metrics(), assessment: makeValidAssessment('E05') },
    ];

    for (const c of cases) {
      const res = await submitLevelCompletion(c.levelId, `evt-${c.levelId}-v2`, c.metrics, c.assessment);
      expect(res.status).toBe(200);

      const legacyLevel = toLegacyLevelId(c.levelId) || c.levelId;
      const attemptRow = db.prepare<{ id: string; evidence_data: string }>(
        'SELECT id, evidence_data FROM learning_attempts WHERE student_id=? AND level_id=? AND status=\'completed\' ORDER BY started_at DESC LIMIT 1'
      ).get(studentId, legacyLevel);

      expect(attemptRow).toBeDefined();
      const envelope = JSON.parse(attemptRow!.evidence_data) as AttemptEvidenceEnvelopeV2;

      expect(envelope.schemaVersion).toBe(2);
      expect(envelope.levelId).toBe(c.levelId);
      expect(Object.keys(envelope.processEvidence.steps)).toHaveLength(5);
      expect(envelope.verification).toEqual({
        source: 'student_completion_event',
        shapeValidated: true,
        scoreAuthoritative: false,
      });
    }
  });

  it('stores server-sourced dimensionEvidence, assessmentSummary, and processEvidence together for D02/E03/E05', async () => {
    const assessment = makeValidAssessment('E03');
    const scoredExpected = scoreAssessment(assessment);

    const res = await submitLevelCompletion('E03', 'evt-e03-summary', makeValidE03Metrics(), assessment);
    expect(res.status).toBe(200);

    const attemptRow = db.prepare<{ evidence_data: string }>(
      'SELECT evidence_data FROM learning_attempts WHERE student_id=? AND level_id=? AND status=\'completed\' LIMIT 1'
    ).get(studentId, 'E03');

    const envelope = JSON.parse(attemptRow!.evidence_data) as AttemptEvidenceEnvelopeV2;
    expect(envelope.dimensionEvidence.source).toBe('server_scored_assessment');
    expect(envelope.dimensionEvidence.values).toEqual(scoredExpected.evidence);

    expect(envelope.assessmentSummary).toBeDefined();
    expect(envelope.assessmentSummary!.dimensions).toEqual(scoredExpected.dimensions);
    expect(envelope.assessmentSummary!.counters).toEqual(scoredExpected.counters);
    expect(envelope.assessmentSummary!.durationMs).toBe(scoredExpected.durationMs);
    expect(envelope.processEvidence.steps).toBeDefined();
  });

  it('stores A03 completion-payload dimension evidence without an assessment summary', async () => {
    const submittedEvidence = {
      TOOL_MEASUREMENT: 'TRANSFER_COMPLETE' as const,
      CIRCUIT_READING: 'INDEPENDENT_COMPLETE' as const,
    };

    const res = await submitLevelCompletion('A03', 'evt-a03-payload', makeValidA03Metrics(), undefined, {
      evidence: submittedEvidence,
    });
    expect(res.status).toBe(200);

    const legacyLevel = toLegacyLevelId('A03') || 'A03';
    const attemptRow = db.prepare<{ evidence_data: string }>(
      'SELECT evidence_data FROM learning_attempts WHERE student_id=? AND level_id=? AND status=\'completed\' LIMIT 1'
    ).get(studentId, legacyLevel);

    const envelope = JSON.parse(attemptRow!.evidence_data) as AttemptEvidenceEnvelopeV2;
    expect(envelope.dimensionEvidence.source).toBe('completion_payload');
    expect(envelope.dimensionEvidence.values).toEqual(submittedEvidence);
    expect(envelope.assessmentSummary).toBeUndefined();
  });

  it('rolls back completion when C7 process evidence is missing or invalid', async () => {
    const invalidMetrics = makeValidE03Metrics();
    delete invalidMetrics.RECTIFIER_TOPOLOGY_COGNITION;

    const res = await submitLevelCompletion('E03', 'evt-e03-rollback', invalidMetrics, makeValidAssessment('E03'));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('INVALID_PROCESS_EVIDENCE');

    expect(db.prepare('SELECT COUNT(*) count FROM learning_attempts WHERE status=\'completed\'').get()?.count).toBe(0);
    expect(db.prepare('SELECT COUNT(*) count FROM learning_events WHERE event_type=\'LEVEL_COMPLETE\'').get()?.count).toBe(0);
    expect(readProgressLevelStatus(db, studentId, 'E03')).not.toBe('completed');
  });

  it('returns the same attempt for an identical event retry', async () => {
    const metrics = makeValidD02Metrics();
    const assessment = makeValidAssessment('D02');

    const res1 = await submitLevelCompletion('D02', 'evt-d02-idempotent', metrics, assessment);
    expect(res1.status).toBe(200);
    const body1 = await res1.json();

    const res2 = await submitLevelCompletion('D02', 'evt-d02-idempotent', metrics, assessment);
    expect(res2.status).toBe(200);
    const body2 = await res2.json();

    expect(body2.attemptId).toBe(body1.attemptId);
    expect(body2.idempotent).toBe(true);

    const eventCount = db.prepare('SELECT COUNT(*) count FROM learning_events WHERE id=?').get('evt-d02-idempotent')?.count;
    expect(eventCount).toBe(1);
  });

  it('rejects the same event id with changed metrics', async () => {
    const metrics1 = makeValidD02Metrics();
    const assessment = makeValidAssessment('D02');
    const res1 = await submitLevelCompletion('D02', 'evt-d02-conflict', metrics1, assessment);
    expect(res1.status).toBe(200);

    const metrics2 = makeValidD02Metrics();
    (metrics2.ENGINEERING_REPAIR_AND_COMMISSIONING as Record<string, unknown>).current = 4.0;
    const res2 = await submitLevelCompletion('D02', 'evt-d02-conflict', metrics2, assessment);
    expect(res2.status).toBe(409);
    const body2 = await res2.json();
    expect(body2.code).toBe('EVENT_ID_CONFLICT');
  });

  it('creates a separate evidence envelope for a genuine replay', async () => {
    const res1 = await submitLevelCompletion('E05', 'evt-e05-first', makeValidE05Metrics(), makeValidAssessment('E05'));
    expect(res1.status).toBe(200);
    const body1 = await res1.json();

    const res2 = await submitLevelCompletion('E05', 'evt-e05-second', makeValidE05Metrics(), makeValidAssessment('E05'));
    expect(res2.status).toBe(200);
    const body2 = await res2.json();

    expect(body2.attemptId).not.toBe(body1.attemptId);

    const legacyE05 = toLegacyLevelId('E05') || 'E05';
    const attempts = db.prepare<{ id: string; evidence_data: string }>(
      'SELECT id, evidence_data FROM learning_attempts WHERE student_id=? AND level_id=? ORDER BY started_at ASC'
    ).all(studentId, legacyE05);

    expect(attempts).toHaveLength(2);
    expect(attempts[0].id).toBe(body1.attemptId);
    expect(attempts[1].id).toBe(body2.attemptId);
    expect(attempts[0].evidence_data).toBeTruthy();
    expect(attempts[1].evidence_data).toBeTruthy();
  });

  it('reads the same V2 evidence after closing and reopening a file-backed SQLite database', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c7-persist-'));
    const dbPath = path.join(tempDir, 'test-c7.db');

    try {
      let fileDb = createSqliteAdapter(dbPath);
      setDatabaseInstance(fileDb);
      setupTestDb(fileDb);
      const token = createSession(studentId, 'student_c7', { db: fileDb }).token;

      const res = await submitLevelCompletion('E03', 'evt-e03-file', makeValidE03Metrics(), makeValidAssessment('E03'), {}, token);
      expect(res.status).toBe(200);

      const beforeRow = fileDb.prepare<{ evidence_data: string }>(
        'SELECT evidence_data FROM learning_attempts WHERE student_id=? AND level_id=\'E03\' LIMIT 1'
      ).get(studentId);
      expect(beforeRow).toBeDefined();
      const beforeEnvelope = JSON.parse(beforeRow!.evidence_data);

      fileDb.close();

      fileDb = createSqliteAdapter(dbPath);
      setDatabaseInstance(fileDb);

      const afterRow = fileDb.prepare<{ evidence_data: string }>(
        'SELECT evidence_data FROM learning_attempts WHERE student_id=? AND level_id=\'E03\' LIMIT 1'
      ).get(studentId);
      expect(afterRow).toBeDefined();
      const afterEnvelope = JSON.parse(afterRow!.evidence_data);

      expect(afterEnvelope).toEqual(beforeEnvelope);
      fileDb.close();
    } finally {
      setDatabaseInstance(db);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('preserves old evidence_data behavior for a non-C7 level', async () => {
    const res = await submitLevelCompletion('LEVEL_00', 'evt-l00-legacy', undefined, undefined, {
      evidence: { TOOL_MEASUREMENT: 'GUIDED_COMPLETE' },
    });
    expect(res.status).toBe(200);

    const row = db.prepare<{ evidence_data: string }>(
      'SELECT evidence_data FROM learning_attempts WHERE student_id=? AND level_id=\'LEVEL_00\' LIMIT 1'
    ).get(studentId);

    expect(row).toBeDefined();
    // Non-C7 LEVEL_00 uses legacy JSON format or string, does not have schemaVersion: 2
    const parsed = JSON.parse(row!.evidence_data);
    expect(parsed.schemaVersion).toBeUndefined();
  });
});

describe('Task 3: Read Service & Read-Only Legacy Recovery', () => {
  it('reads V2 attempts newest first and returns total with a hard limit of 50', () => {
    const insertStmt = db.prepare(
      `INSERT INTO learning_attempts
        (id, student_id, class_id, course_version_id, level_id, started_at, completed_at, score, status, mode, evidence_data, rubric_version)
       VALUES (?, ?, '${currentClassId}', '${currentCourseVersionId}', 'E03', ?, ?, 90, 'completed', 'guided', ?, 'v2')`
    );
    const validEnvelope = JSON.stringify({
      schemaVersion: 2,
      levelId: 'E03',
      dimensionEvidence: { values: {}, source: 'completion_payload' },
      processEvidence: validateProcessEvidence('E03', makeValidE03Metrics()),
      verification: { source: 'student_completion_event', shapeValidated: true, scoreAuthoritative: false },
    });

    for (let i = 1; i <= 51; i++) {
      insertStmt.run(`try_e03_${i}`, studentId, 10000 + i * 100, 10050 + i * 100, validEnvelope);
    }

    const res = listAttemptEvidence({ studentId, levelId: 'E03', db });
    expect(res.total).toBe(51);
    expect(res.limit).toBe(50);
    expect(res.attempts).toHaveLength(50);
    expect(res.attempts[0].startedAt).toBeGreaterThan(res.attempts[1].startedAt);
    expect(res.attempts[0].attemptId).toBe('try_e03_51');
  });

  it('uses authoritative attempt columns for timing and score', () => {
    const validEnvelope = JSON.stringify({
      schemaVersion: 2,
      levelId: 'E03',
      dimensionEvidence: { values: {}, source: 'completion_payload' },
      processEvidence: validateProcessEvidence('E03', makeValidE03Metrics()),
      verification: { source: 'student_completion_event', shapeValidated: true, scoreAuthoritative: false },
    });
    db.prepare(
      `INSERT INTO learning_attempts
        (id, student_id, class_id, course_version_id, level_id, started_at, completed_at, score, status, mode, evidence_data, rubric_version)
       VALUES ('try_authoritative', ?, '${currentClassId}', '${currentCourseVersionId}', 'E03', 2000, 7000, 88, 'completed', 'transfer', ?, 'v2')`
    ).run(studentId, validEnvelope);

    const res = listAttemptEvidence({ studentId, levelId: 'E03', db });
    const item = res.attempts.find((a) => a.attemptId === 'try_authoritative');
    expect(item).toBeDefined();
    expect(item!.score).toBe(88);
    expect(item!.mode).toBe('transfer');
    expect(item!.startedAt).toBe(2000);
    expect(item!.completedAt).toBe(7000);
    expect(item!.durationMs).toBe(5000);
  });

  it('recovers valid legacy metrics without writing', () => {
    const attemptId = 'try_legacy_recover';
    const oldEvidenceJson = JSON.stringify({ oldKey: 'some_old_data' });
    db.prepare(
      `INSERT INTO learning_attempts
        (id, student_id, class_id, course_version_id, level_id, started_at, completed_at, score, status, mode, evidence_data, rubric_version)
       VALUES (?, ?, '${currentClassId}', '${currentCourseVersionId}', 'E03', 3000, 6000, 85, 'completed', 'independent', ?, 'v1')`
    ).run(attemptId, studentId, oldEvidenceJson);

    const eventPayload = {
      eventPayload: {
        score: 85,
        mode: 'independent',
        metrics: makeValidE03Metrics(),
      },
    };
    db.prepare(
      `INSERT INTO learning_events
        (id, attempt_id, event_type, payload, occurred_at)
       VALUES ('evt_legacy_rec', ?, 'LEVEL_COMPLETE', ?, 6000)`
    ).run(attemptId, JSON.stringify(eventPayload));

    const beforeRow = db.prepare<{ evidence_data: string }>('SELECT evidence_data FROM learning_attempts WHERE id=?').get(attemptId);
    expect(beforeRow?.evidence_data).toBe(oldEvidenceJson);

    const res = listAttemptEvidence({ studentId, levelId: 'E03', db });
    const item = res.attempts.find((a) => a.attemptId === attemptId);
    expect(item).toBeDefined();
    expect(item!.legacyRecovered).toBe(true);
    expect(item!.evidence).toBeDefined();
    expect(item!.evidence!.schemaVersion).toBe(2);
    expect(Object.keys(item!.evidence!.processEvidence.steps)).toHaveLength(5);

    const afterRow = db.prepare<{ evidence_data: string }>('SELECT evidence_data FROM learning_attempts WHERE id=?').get(attemptId);
    expect(afterRow?.evidence_data).toBe(oldEvidenceJson);
  });

  it('preserves a legacy assessment summary while recovering process metrics', () => {
    const attemptId = 'try_legacy_with_summary';
    const assessment = makeValidAssessment('E03');
    const scored = scoreAssessment(assessment);
    const oldEvidenceData = {
      evidence: scored.evidence,
      dimensions: scored.dimensions,
      counters: scored.counters,
      durationMs: scored.durationMs,
    };
    db.prepare(
      `INSERT INTO learning_attempts
        (id, student_id, class_id, course_version_id, level_id, started_at, completed_at, score, status, mode, evidence_data, rubric_version)
       VALUES (?, ?, '${currentClassId}', '${currentCourseVersionId}', 'E03', 4000, 8000, 92, 'completed', 'independent', ?, 'v2')`
    ).run(attemptId, studentId, JSON.stringify(oldEvidenceData));

    db.prepare(
      `INSERT INTO learning_events
        (id, attempt_id, event_type, payload, occurred_at)
       VALUES ('evt_legacy_sum', ?, 'LEVEL_COMPLETE', ?, 8000)`
    ).run(attemptId, JSON.stringify({ eventPayload: { metrics: makeValidE03Metrics() } }));

    const res = listAttemptEvidence({ studentId, levelId: 'E03', db });
    const item = res.attempts.find((a) => a.attemptId === attemptId);
    expect(item).toBeDefined();
    expect(item!.legacyRecovered).toBe(true);
    expect(item!.evidence?.assessmentSummary).toBeDefined();
    expect(item!.evidence!.assessmentSummary!.dimensions).toEqual(scored.dimensions);
    expect(item!.evidence!.assessmentSummary!.counters).toEqual(scored.counters);
    expect(item!.evidence!.processEvidence.steps).toBeDefined();
  });

  it('reports missing legacy metrics safely', () => {
    const attemptId = 'try_legacy_missing_metrics';
    db.prepare(
      `INSERT INTO learning_attempts
        (id, student_id, class_id, course_version_id, level_id, started_at, completed_at, score, status, mode, evidence_data, rubric_version)
       VALUES (?, ?, '${currentClassId}', '${currentCourseVersionId}', 'E03', 5000, 9000, 80, 'completed', 'guided', '{"old":1}', 'v1')`
    ).run(attemptId, studentId);

    // No matching event in learning_events
    const res = listAttemptEvidence({ studentId, levelId: 'E03', db });
    const item = res.attempts.find((a) => a.attemptId === attemptId);
    expect(item).toBeDefined();
    expect(item!.evidence).toBeNull();
    expect(item!.legacyRecovered).toBe(false);
    expect(item!.unavailableReason).toBe('该次历史记录未保存步骤明细');
  });

  it('reports corrupt evidence_data or event JSON safely', () => {
    const attemptId = 'try_corrupt_json';
    db.prepare(
      `INSERT INTO learning_attempts
        (id, student_id, class_id, course_version_id, level_id, started_at, completed_at, score, status, mode, evidence_data, rubric_version)
       VALUES (?, ?, '${currentClassId}', '${currentCourseVersionId}', 'E03', 6000, 9500, 75, 'completed', 'guided', '{corrupt-json-12345', 'v1')`
    ).run(attemptId, studentId);

    const res = listAttemptEvidence({ studentId, levelId: 'E03', db });
    const item = res.attempts.find((a) => a.attemptId === attemptId);
    expect(item).toBeDefined();
    expect(item!.evidence).toBeNull();
    expect(item!.unavailableReason).toBeDefined();
    expect(item!.unavailableReason).not.toContain('{corrupt-json-12345');
  });

  it('isolates a corrupt attempt', () => {
    // 1. Corrupt attempt
    db.prepare(
      `INSERT INTO learning_attempts
        (id, student_id, class_id, course_version_id, level_id, started_at, completed_at, score, status, mode, evidence_data, rubric_version)
       VALUES ('try_bad_iso', ?, '${currentClassId}', '${currentCourseVersionId}', 'E03', 1000, 2000, 70, 'completed', 'guided', '{bad_json', 'v1')`
    ).run(studentId);

    // 2. Good attempt
    const goodEnvelope = JSON.stringify({
      schemaVersion: 2,
      levelId: 'E03',
      dimensionEvidence: { values: {}, source: 'completion_payload' },
      processEvidence: validateProcessEvidence('E03', makeValidE03Metrics()),
      verification: { source: 'student_completion_event', shapeValidated: true, scoreAuthoritative: false },
    });
    db.prepare(
      `INSERT INTO learning_attempts
        (id, student_id, class_id, course_version_id, level_id, started_at, completed_at, score, status, mode, evidence_data, rubric_version)
       VALUES ('try_good_iso', ?, '${currentClassId}', '${currentCourseVersionId}', 'E03', 3000, 4000, 95, 'completed', 'transfer', ?, 'v2')`
    ).run(studentId, goodEnvelope);

    const res = listAttemptEvidence({ studentId, levelId: 'E03', db });
    expect(res.attempts).toHaveLength(2);
    const bad = res.attempts.find((a) => a.attemptId === 'try_bad_iso');
    const good = res.attempts.find((a) => a.attemptId === 'try_good_iso');
    expect(bad?.evidence).toBeNull();
    expect(good?.evidence).not.toBeNull();
    expect(good?.evidence?.schemaVersion).toBe(2);
  });
});
