import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as eventPost } from '@/app/api/learning/events/route';
import { hashPassword } from '@/src/server/auth/crypto';
import { createSession } from '@/src/server/auth/session';
import { assignStudentToClass, createClass } from '@/src/server/db/classService';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import { runWriteTransactionWithRetry } from '@/src/server/learning/learningEventService';

let db: AppDatabase;
let studentToken: string;
let teacherToken: string;

function request(token: string, event: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/learning/events', {
    method: 'POST',
    headers: { cookie: `nev_session=${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(event),
  });
}

function event(eventId: string, levelId = 'LEVEL_00', eventType = 'LEVEL_COMPLETE', score: number = 90) {
  return { eventId, levelId, eventType, payload: { score }, occurredAt: Date.now() };
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
  insert.run('student', 'student', hashPassword('Start#2026'), '学生', 'student', now, now);
  insert.run('teacher', 'teacher', hashPassword('Start#2026'), '教师', 'teacher', now, now);
  const targetClass = createClass({ name: '事件班' }, db);
  assignStudentToClass('student', targetClass.id, undefined, db);
  studentToken = createSession('student', 'student', { db }).token;
  teacherToken = createSession('teacher', 'teacher', { db }).token;
});

describe('SQLite learning event projection', () => {
  it('is idempotent by eventId and returns the originally stored projection', async () => {
    const input = event('evt-00000001');
    const first = await eventPost(request(studentToken, input));
    const firstBody = await first.json() as { projection: unknown };
    const second = await eventPost(request(studentToken, input));
    const secondBody = await second.json() as { projection: unknown; idempotent: boolean };

    expect(first.status).toBe(200);
    expect(secondBody.idempotent).toBe(true);
    expect(secondBody.projection).toEqual(firstBody.projection);
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) count FROM learning_events').get()?.count).toBe(1);
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) count FROM learning_attempts').get()?.count).toBe(1);
  });

  it('rejects skip-level completion and scores outside 0-100 without persisting anything', async () => {
    expect((await eventPost(request(studentToken, event('evt-00000002', 'LEVEL_01')))).status).toBe(422);
    expect((await eventPost(request(studentToken, event('evt-00000003', 'LEVEL_00', 'LEVEL_COMPLETE', -1)))).status).toBe(422);
    expect((await eventPost(request(studentToken, event('evt-00000004', 'LEVEL_00', 'LEVEL_COMPLETE', 101)))).status).toBe(422);
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) count FROM learning_events').get()?.count).toBe(0);
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) count FROM learning_attempts').get()?.count).toBe(0);
  });

  it('rejects non-student event submission', async () => {
    expect((await eventPost(request(teacherToken, event('evt-00000005')))).status).toBe(403);
  });

  it('commits event, attempt and projection together across sequential levels', async () => {
    expect((await eventPost(request(studentToken, event('evt-00000006', 'LEVEL_00', 'LEVEL_COMPLETE', 88)))).status).toBe(200);
    expect((await eventPost(request(studentToken, event('evt-00000007', 'LEVEL_01', 'LEVEL_COMPLETE', 92)))).status).toBe(200);
    const projection = JSON.parse(db.prepare<{ progress_data: string }>(
      'SELECT progress_data FROM user_progress WHERE user_id=?'
    ).get('student')!.progress_data) as { levels: Record<string, { status: string; score?: number }> };
    expect(projection.levels.LEVEL_00).toMatchObject({ status: 'completed', score: 88 });
    expect(projection.levels.LEVEL_01).toMatchObject({ status: 'completed', score: 92 });
    expect(projection.levels.LEVEL_02.status).toBe('unlocked');
    expect(db.prepare<{ count: number }>("SELECT COUNT(*) count FROM learning_attempts WHERE status='completed'").get()?.count).toBe(2);
  });

  it('rolls back event and attempt if projection persistence fails', async () => {
    db.exec(`CREATE TRIGGER reject_projection BEFORE INSERT ON user_progress
      BEGIN SELECT RAISE(ABORT, 'projection unavailable'); END;`);
    const response = await eventPost(request(studentToken, event('evt-00000008')));
    expect(response.status).toBe(500);
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) count FROM learning_events').get()?.count).toBe(0);
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) count FROM learning_attempts').get()?.count).toBe(0);
  });

  it('retries the complete transaction only for SQLITE_BUSY, at most three retries', () => {
    let attempts = 0;
    const fakeDb = {
      transaction<T>(operation: () => T): T {
        attempts += 1;
        if (attempts < 3) throw Object.assign(new Error('database is locked'), { code: 'SQLITE_BUSY' });
        return operation();
      },
    } as AppDatabase;
    expect(runWriteTransactionWithRetry(fakeDb, () => 'ok', { sleep: () => {} })).toBe('ok');
    expect(attempts).toBe(3);
    expect(() => runWriteTransactionWithRetry(fakeDb, () => { throw new Error('bad input'); }, { sleep: () => {} }))
      .toThrow('bad input');
  });
});
