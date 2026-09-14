import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as eventPost } from '@/app/api/learning/events/route';
import { hashPassword } from '@/src/server/auth/crypto';
import { createSession } from '@/src/server/auth/session';
import { assignStudentToClass, createClass } from '@/src/server/db/classService';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import type { LevelAssessmentResult, StageAssessment, TrainingStageId } from '@/src/assessment/assessmentTypes';
import { makeValidF01Metrics } from './helpers/f01TestFixtures';
import { selectF01ScenarioSeed } from '@/src/levels/f01/f01Model';

let db: AppDatabase;
let studentToken: string;

function request(event: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/learning/events', {
    method: 'POST',
    headers: { cookie: `nev_session=${studentToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(event),
  });
}

function makeF01Assessment(levelId = 'F01'): LevelAssessmentResult {
  const startedAt = 1_700_000_000_000;
  const stageIds: TrainingStageId[] = ['cognition', 'standard', 'calculation', 'blind_test', 'transfer'];
  const stages: StageAssessment[] = stageIds.map((stageId, idx) => ({
    stageId,
    mode: 'transfer',
    startedAt: startedAt + idx * 20_000,
    completedAt: startedAt + (idx + 1) * 20_000,
    wrongAttempts: 0,
    hintRequests: 0,
    meterGuardBlocks: 0,
    unsafeActions: 0,
    retries: 0,
    completed: true,
  }));
  return {
    schemaVersion: 1,
    levelId,
    rubricVersion: 'v2',
    startedAt,
    completedAt: startedAt + 120_000,
    stages,
  };
}

beforeEach(() => {
  db = createSqliteAdapter(':memory:');
  setDatabaseInstance(db);
  const now = Date.now();
  db.prepare(
    `INSERT INTO users
      (id,username,password_hash,real_name,role,class_name,status,must_change_password,created_at,updated_at)
     VALUES (?,?,?,?,?,'','active',0,?,?)`
  ).run('student', 'student', hashPassword('Start#2026'), '张晓明', 'student', now, now);
  const targetClass = createClass({ name: '实训一班' }, db);
  assignStudentToClass('student', targetClass.id, undefined, db);
  studentToken = createSession('student', 'student', { db }).token;

  const prereqs = ['C03', 'E03', 'E04', 'E05', 'E07'];
  const initialProgress = {
    traineeName: '张晓明',
    currentActiveLevel: 'F01',
    levels: Object.fromEntries(prereqs.map((p) => [p, { status: 'completed', score: 95 }])),
    teacherMode: false,
    lastUpdated: now,
  };
  db.prepare(
    `INSERT INTO user_progress (user_id, progress_data, version, last_updated)
     VALUES (?, ?, 1, ?)`
  ).run('student', JSON.stringify(initialProgress), now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('F01 Server-Side Evidence Enforcement and Learning Integration', () => {
  it('rejects F01 completion without assessment with 422 INVALID_SCORE', async () => {
    await eventPost(request({
      eventId: 'evt-start-1',
      levelId: 'F01',
      eventType: 'LEVEL_START',
      payload: {},
      occurredAt: Date.now(),
    }));

    const completeRes = await eventPost(request({
      eventId: 'evt-comp-1',
      levelId: 'F01',
      eventType: 'LEVEL_COMPLETE',
      payload: { score: 100 },
      occurredAt: Date.now(),
    }));

    expect(completeRes.status).toBe(422);
    const body = await completeRes.json();
    expect(body.code).toBe('INVALID_SCORE');
  });

  it('rejects F01 completion carrying a mismatched assessment level (C01) with 422', async () => {
    await eventPost(request({
      eventId: 'evt-start-2',
      levelId: 'F01',
      eventType: 'LEVEL_START',
      payload: {},
      occurredAt: Date.now(),
    }));

    const completeRes = await eventPost(request({
      eventId: 'evt-comp-2',
      levelId: 'F01',
      eventType: 'LEVEL_COMPLETE',
      payload: {
        assessment: makeF01Assessment('C01'),
        metrics: makeValidF01Metrics('F01-A'),
      },
      occurredAt: Date.now(),
    }));

    expect(completeRes.status).toBe(422);
    const body = await completeRes.json();
    expect(body.code).toBe('INVALID_SCORE');
    expect(body.error).toContain('不一致');
  });

  it('rejects F01 with valid assessment but wrong seed or incomplete metrics with 422', async () => {
    await eventPost(request({
      eventId: 'evt-start-3',
      levelId: 'F01',
      eventType: 'LEVEL_START',
      payload: {},
      occurredAt: Date.now(),
    }));

    // Expected seed for student (attempt 1)
    const expectedSeed = selectF01ScenarioSeed('student', 1);
    const wrongSeed = expectedSeed === 'F01-A' ? 'F01-B' : 'F01-A';

    const completeRes = await eventPost(request({
      eventId: 'evt-comp-3',
      levelId: 'F01',
      eventType: 'LEVEL_COMPLETE',
      payload: {
        assessment: makeF01Assessment('F01'),
        metrics: makeValidF01Metrics(wrongSeed),
      },
      occurredAt: Date.now(),
    }));

    expect(completeRes.status).toBe(422);
    const body = await completeRes.json();
    expect(body.code).toBe('INVALID_SCORE');
    expect(body.error).toContain('证据无效');
  });

  it('accepts F01 with valid expected seed and complete metrics, deriving score and persisting evidence', async () => {
    await eventPost(request({
      eventId: 'evt-start-4',
      levelId: 'F01',
      eventType: 'LEVEL_START',
      payload: {},
      occurredAt: Date.now(),
    }));

    const expectedSeed = selectF01ScenarioSeed('student', 1);
    const validMetrics = makeValidF01Metrics(expectedSeed);

    const completeRes = await eventPost(request({
      eventId: 'evt-comp-4',
      levelId: 'F01',
      eventType: 'LEVEL_COMPLETE',
      payload: {
        assessment: makeF01Assessment('F01'),
        metrics: validMetrics,
      },
      occurredAt: Date.now(),
    }));

    expect(completeRes.status).toBe(200);
    const body = await completeRes.json();
    expect(body.projection.levels.F01.status).toBe('completed');
    expect(body.projection.levels.F01.score).toBe(100);
    expect(body.projection.levels.F01.attemptCount).toBe(1);

    // Verify attempt row
    const row = db.prepare<{ seed: string; evidence_data: string; rubric_version: string }>(
      "SELECT seed, evidence_data, rubric_version FROM learning_attempts WHERE student_id='student' AND level_id='F01' AND status='completed'"
    ).get();
    expect(row).toBeDefined();
    expect(row?.seed).toBe(expectedSeed);
    expect(row?.rubric_version).toBe('v2');
    const parsedEvidence = JSON.parse(row!.evidence_data);
    expect(parsedEvidence.f01).toBeDefined();
    expect(parsedEvidence.f01.seed).toBe(expectedSeed);
  });
});
