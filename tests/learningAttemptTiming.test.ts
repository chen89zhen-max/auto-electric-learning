import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as eventPost } from '@/app/api/learning/events/route';
import { hashPassword } from '@/src/server/auth/crypto';
import { createSession } from '@/src/server/auth/session';
import { assignStudentToClass, createClass } from '@/src/server/db/classService';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';

let db: AppDatabase;
let studentToken: string;

function request(event: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/learning/events', {
    method: 'POST',
    headers: { cookie: `nev_session=${studentToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(event),
  });
}

function event(
  eventId: string,
  eventType: 'LEVEL_START' | 'LEVEL_COMPLETE',
  occurredAt: number,
  levelId = 'LEVEL_00',
  score = 88,
) {
  return {
    eventId,
    levelId,
    eventType,
    payload: eventType === 'LEVEL_COMPLETE' ? { score } : {},
    occurredAt,
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
  ).run('student', 'student', hashPassword('Start#2026'), '学生', 'student', now, now);
  const targetClass = createClass({ name: '计时班' }, db);
  assignStudentToClass('student', targetClass.id, undefined, db);
  studentToken = createSession('student', 'student', { db }).token;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('server-authoritative exam clock', () => {
  it('rejects completion when the exam clock was never started', async () => {
    const response = await eventPost(request(event('evt-no-start-done', 'LEVEL_COMPLETE', Date.now())));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'MISSING_ATTEMPT_START' });
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) count FROM learning_attempts').get()?.count).toBe(0);
  });

  it('keeps the first start time when the same unfinished level is entered again', async () => {
    const base = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(base);
    const first = await eventPost(request(event('evt-timing-start-1', 'LEVEL_START', base - 60_000)));
    vi.setSystemTime(base + 4_000);
    const second = await eventPost(request(event('evt-timing-start-2', 'LEVEL_START', base - 30_000)));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await first.json()).toMatchObject({ startedAt: base });
    expect(await second.json()).toMatchObject({ startedAt: base });

    const rows = db.prepare<{ started_at: number }>(
      "SELECT started_at FROM learning_attempts WHERE student_id='student' AND level_id='LEVEL_00'"
    ).all();
    expect(rows).toEqual([{ started_at: base }]);
  });

  it('computes duration from the persisted first start to completion', async () => {
    const base = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(base);
    await eventPost(request(event('evt-timing-start-3', 'LEVEL_START', base - 60_000)));
    vi.setSystemTime(base + 5_250);
    const response = await eventPost(request(event('evt-timing-done-1', 'LEVEL_COMPLETE', base - 30_000)));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      startedAt: base,
      completedAt: base + 5_250,
      durationMs: 5_250,
    });
    expect(body.projection.levels.LEVEL_00.recentRecord).toMatchObject({
      startedAt: new Date(base).toISOString(),
      durationMs: 5_250,
      timingSource: 'server',
    });
  });

  it('treats canonical and legacy aliases as the same unfinished attempt', async () => {
    const base = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(base);
    await eventPost(request(event('evt-timing-alias-1', 'LEVEL_START', base, 'LEVEL_00')));
    vi.setSystemTime(base + 2_000);
    const response = await eventPost(request(event('evt-timing-alias-2', 'LEVEL_START', base, 'O00')));

    expect(await response.json()).toMatchObject({ startedAt: base });
    expect(db.prepare<{ count: number }>(
      "SELECT COUNT(*) count FROM learning_attempts WHERE student_id='student' AND status='in_progress'"
    ).get()?.count).toBe(1);
  });

  it('records a replay as the latest score and latest wall-clock duration', async () => {
    const base = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(base);
    await eventPost(request(event('evt-replay-start-1', 'LEVEL_START', base)));
    vi.setSystemTime(base + 5_000);
    await eventPost(request(event('evt-replay-done-1', 'LEVEL_COMPLETE', base, 'LEVEL_00', 95)));

    vi.setSystemTime(base + 10_000);
    await eventPost(request(event('evt-replay-start-2', 'LEVEL_START', base, 'O00')));
    vi.setSystemTime(base + 17_500);
    const response = await eventPost(request(event('evt-replay-done-2', 'LEVEL_COMPLETE', base, 'O00', 72)));
    const body = await response.json();

    expect(body.projection.levels.LEVEL_00).toMatchObject({
      score: 72,
      attemptCount: 2,
      firstRecord: { score: 95, durationMs: 5_000 },
      recentRecord: { score: 72, durationMs: 7_500, timingSource: 'server' },
    });
  });
});
