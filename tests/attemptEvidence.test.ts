import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as eventPost } from '@/app/api/learning/events/route';
import { hashPassword } from '@/src/server/auth/crypto';
import { createSession } from '@/src/server/auth/session';
import { assignStudentToClass, createClass } from '@/src/server/db/classService';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import type { UserProgressData } from '@/src/types/progress';

let db: AppDatabase;
let studentToken: string;
let teacherToken: string;

function request(token: string, eventData: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/learning/events', {
    method: 'POST',
    headers: { cookie: `nev_session=${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(eventData),
  });
}

function makeEvent(
  eventId: string,
  levelId = 'LEVEL_00',
  score = 90,
  options: { mode?: string; evidence?: Record<string, string>; seed?: string } = {}
) {
  return {
    eventId,
    levelId,
    eventType: 'LEVEL_COMPLETE',
    payload: {
      score,
      mode: options.mode || 'guided',
      ...(options.evidence ? { evidence: options.evidence } : {}),
      ...(options.seed ? { seed: options.seed } : {}),
    },
    occurredAt: Date.now(),
  };
}

beforeEach(() => {
  db = createSqliteAdapter(':memory:');
  setDatabaseInstance(db);
  const now = Date.now();
  const insert = db.prepare(
    `INSERT INTO users
      (id,username,password_hash,real_name,role,class_name,status,must_change_password,created_at,updated_at)
     VALUES (?,?,?,?,?,'','active',0,?,?)`
  );
  insert.run('student', 'student', hashPassword('Start#2026'), '张晓明', 'student', now, now);
  insert.run('teacher', 'teacher', hashPassword('Start#2026'), '陈老师', 'teacher', now, now);
  const targetClass = createClass({ name: '实训一班' }, db);
  assignStudentToClass('student', targetClass.id, undefined, db);
  studentToken = createSession('student', 'student', { db }).token;
  teacherToken = createSession('teacher', 'teacher', { db }).token;
});

describe('Attempt Tracking, Replay & Evidence Framework (P1)', () => {
  it('supports repeated practice (replay) on completed level without throwing errors', async () => {
    // 1. Initial completion of LEVEL_00
    const firstEvt = makeEvent('evt-att-001', 'LEVEL_00', 85, { mode: 'guided' });
    const res1 = await eventPost(request(studentToken, firstEvt));
    expect(res1.status).toBe(200);

    const body1 = (await res1.json()) as { projection: UserProgressData };
    expect(body1.projection.levels.LEVEL_00.status).toBe('completed');
    expect(body1.projection.levels.LEVEL_00.score).toBe(85);
    expect(body1.projection.levels.LEVEL_00.attemptCount).toBe(1);
    expect(body1.projection.levels.LEVEL_00.firstRecord?.score).toBe(85);
    expect(body1.projection.levels.LEVEL_00.recentRecord?.score).toBe(85);

    // 2. Replay with higher score and independent mode
    const secondEvt = makeEvent('evt-att-002', 'LEVEL_00', 98, { mode: 'independent' });
    const res2 = await eventPost(request(studentToken, secondEvt));
    expect(res2.status).toBe(200);

    const body2 = (await res2.json()) as { projection: UserProgressData };
    const level00 = body2.projection.levels.LEVEL_00;

    expect(level00.status).toBe('completed');
    // First score is preserved for legacy backward-compatibility
    expect(level00.score).toBe(85);
    expect(level00.attemptCount).toBe(2);
    expect(level00.firstRecord?.score).toBe(85);
    expect(level00.recentRecord?.score).toBe(98);
    expect(level00.recentRecord?.mode).toBe('independent');
    expect(level00.bestRecord?.score).toBe(98);
    expect(level00.bestRecord?.mode).toBe('independent');

    // 3. Check SQLite learning_attempts has 2 distinct records
    const attempts = db.prepare<{ id: string; score: number; mode: string }>(
      "SELECT id, score, mode FROM learning_attempts WHERE student_id='student' AND level_id='LEVEL_00' ORDER BY started_at ASC"
    ).all();
    expect(attempts.length).toBe(2);
    expect(attempts[0].score).toBe(85);
    expect(attempts[0].mode).toBe('guided');
    expect(attempts[1].score).toBe(98);
    expect(attempts[1].mode).toBe('independent');
  });

  it('rejects event submission for under-construction levels (LEVEL_03 / A02)', async () => {
    // LEVEL_00 and LEVEL_01 completed first
    await eventPost(request(studentToken, makeEvent('evt-lvl00', 'LEVEL_00', 90)));
    await eventPost(request(studentToken, makeEvent('evt-lvl01', 'LEVEL_01', 90)));
    await eventPost(request(studentToken, makeEvent('evt-lvl02', 'LEVEL_02', 90)));

    // Attempting to submit for unimplemented / under-construction LEVEL_03 (A03)
    const responseLegacy = await eventPost(request(studentToken, makeEvent('evt-under-cons-1', 'LEVEL_03', 90)));
    expect(responseLegacy.status).toBe(422);
    const bodyLegacy = (await responseLegacy.json()) as { error: string };
    expect(bodyLegacy.error).toContain('建设中');

    // Attempting to submit for canonical A02
    const responseCanonical = await eventPost(request(studentToken, makeEvent('evt-under-cons-2', 'A02', 90)));
    expect(responseCanonical.status).toBe(422);
    const bodyCanonical = (await responseCanonical.json()) as { error: string };
    expect(bodyCanonical.error).toContain('建设中');

    // Verify nothing persisted
    expect(
      db.prepare<{ count: number }>("SELECT COUNT(*) count FROM learning_events WHERE id LIKE 'evt-under-cons%'").get()?.count
    ).toBe(0);
  });

  it('maintains strict idempotency on identical payload resubmission', async () => {
    const input = makeEvent('evt-idemp-001', 'LEVEL_00', 92, { seed: 'seed-42' });
    const first = await eventPost(request(studentToken, input));
    const firstBody = (await first.json()) as { projection: UserProgressData; attemptId: string };

    const second = await eventPost(request(studentToken, input));
    const secondBody = (await second.json()) as { projection: UserProgressData; attemptId: string; idempotent: boolean };

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(secondBody.idempotent).toBe(true);
    expect(secondBody.attemptId).toBe(firstBody.attemptId);
    expect(secondBody.projection.levels.LEVEL_00.recentRecord?.score).toBe(92);

    // No extra attempt or event created
    expect(
      db.prepare<{ count: number }>("SELECT COUNT(*) count FROM learning_events WHERE id='evt-idemp-001'").get()?.count
    ).toBe(1);
    expect(
      db.prepare<{ count: number }>("SELECT COUNT(*) count FROM learning_attempts WHERE id=?").get(firstBody.attemptId)?.count
    ).toBe(1);
  });

  it('rejects event submission if same eventId is resubmitted with conflicting payload', async () => {
    const original = makeEvent('evt-conflict-001', 'LEVEL_00', 88);
    const first = await eventPost(request(studentToken, original));
    expect(first.status).toBe(200);

    // Same eventId, but tampered/different score
    const tampered = makeEvent('evt-conflict-001', 'LEVEL_00', 99);
    const second = await eventPost(request(studentToken, tampered));
    expect(second.status).toBe(409);

    const body = (await second.json()) as { code: string; error: string };
    expect(body.code).toBe('EVENT_ID_CONFLICT');
    expect(body.error).toContain('内容不一致');
  });

  it('aggregates six-dimensional evidence monotonically across attempts', async () => {
    // Attempt 1: Guided completion with basic safety and reading
    const evt1 = makeEvent('evt-ev-001', 'LEVEL_00', 80, {
      mode: 'guided',
      evidence: {
        SAFETY_SPECIFICATION: 'GUIDED_COMPLETE',
        CIRCUIT_READING: 'GUIDED_COMPLETE',
      },
    });
    const res1 = await eventPost(request(studentToken, evt1));
    const body1 = (await res1.json()) as { projection: UserProgressData };
    expect(body1.projection.levels.LEVEL_00.evidence?.SAFETY_SPECIFICATION).toBe('GUIDED_COMPLETE');
    expect(body1.projection.levels.LEVEL_00.evidence?.CIRCUIT_READING).toBe('GUIDED_COMPLETE');
    expect(body1.projection.levels.LEVEL_00.evidence?.TOOL_MEASUREMENT).toBe('NO_EVIDENCE');

    // Attempt 2: Replay with independent safety and tool measurement
    const evt2 = makeEvent('evt-ev-002', 'LEVEL_00', 95, {
      mode: 'independent',
      evidence: {
        SAFETY_SPECIFICATION: 'INDEPENDENT_COMPLETE',
        TOOL_MEASUREMENT: 'GUIDED_COMPLETE',
      },
    });
    const res2 = await eventPost(request(studentToken, evt2));
    const body2 = (await res2.json()) as { projection: UserProgressData };
    // Safety upgraded to INDEPENDENT_COMPLETE
    expect(body2.projection.levels.LEVEL_00.evidence?.SAFETY_SPECIFICATION).toBe('INDEPENDENT_COMPLETE');
    // Circuit reading remains GUIDED_COMPLETE (not degraded)
    expect(body2.projection.levels.LEVEL_00.evidence?.CIRCUIT_READING).toBe('GUIDED_COMPLETE');
    // Tool measurement updated to GUIDED_COMPLETE
    expect(body2.projection.levels.LEVEL_00.evidence?.TOOL_MEASUREMENT).toBe('GUIDED_COMPLETE');
  });

  it('ensures teacher demo mode does not write student attempts', async () => {
    const teacherEvt = makeEvent('evt-teacher-demo', 'LEVEL_00', 100);
    const res = await eventPost(request(teacherToken, teacherEvt));
    // Non-student role is rejected
    expect(res.status).toBe(403);

    // Verify no attempts written
    expect(
      db.prepare<{ count: number }>("SELECT COUNT(*) count FROM learning_attempts WHERE student_id='teacher'").get()?.count
    ).toBe(0);
  });
});
