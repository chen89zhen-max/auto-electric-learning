import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as authLoginPost } from '@/app/api/auth/login/route';
import { GET as authMeGet } from '@/app/api/auth/me/route';
import { POST as progressPost } from '@/app/api/progress/route';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import { hashPassword, verifyPassword } from '@/src/server/auth/crypto';
import { createSession, validateSession } from '@/src/server/auth/session';
import { assignStudentToClass, createClass } from '@/src/server/db/classService';
import { createBaseUserProgress } from '@/src/types/progress';

let testDb: AppDatabase;

function insertStudent(
  id: string,
  username: string,
  status: 'pending_activation' | 'active' | 'suspended' | 'locked' | 'deleted',
  mustChangePassword = 0
) {
  const now = Date.now();
  testDb.prepare(
    `INSERT INTO users (id, username, password_hash, real_name, role, class_name, status, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'student', '', ?, ?, ?, ?)`
  ).run(id, username, hashPassword('Temp#Pass123'), username, status, mustChangePassword, now, now);
}

beforeEach(() => {
  testDb = createSqliteAdapter(':memory:');
  setDatabaseInstance(testDb);
});

afterAll(() => {
  setDatabaseInstance(null);
});

describe('账号生命周期与强制改密访问边界', () => {
  it('账号生命周期扩展以独立迁移版本记录，已有V2数据库可升级', () => {
    const migration = testDb.prepare<{ version: number; name: string }>(
      'SELECT version, name FROM schema_migrations WHERE version = 3'
    ).get();
    expect(migration).toMatchObject({ version: 3, name: '0003_account_lifecycle' });
  });

  it.each(['pending_activation', 'suspended', 'locked', 'deleted'] as const)(
    '%s 状态账号不能登录',
    async (status) => {
      insertStudent(`usr_${status}`, `student_${status}`, status);

      const response = await authLoginPost(
        new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username: `student_${status}`,
            password: 'Temp#Pass123',
            expectedRole: 'student',
          }),
        })
      );

      expect(response.status).toBe(401);
      expect((await response.json()) as { error: string }).toMatchObject({
        error: '账号、密码或登录入口不匹配',
      });
    }
  );

  it('must_change_password账号可以读取me，但不能提交学习进度', async () => {
    insertStudent('usr_force_change', 'student_force_change', 'active', 1);
    const { token } = createSession('usr_force_change', 'student', { db: testDb });
    const headers = { cookie: `nev_session=${token}` };

    const meResponse = await authMeGet(
      new NextRequest('http://localhost:3000/api/auth/me', { headers })
    );
    expect(meResponse.status).toBe(200);
    const meBody = (await meResponse.json()) as {
      user: { mustChangePassword: boolean };
    };
    expect(meBody.user.mustChangePassword).toBe(true);

    const progress = createBaseUserProgress('student_force_change');
    progress.levels.LEVEL_00 = { status: 'completed', score: 100 };
    const progressResponse = await progressPost(
      new NextRequest('http://localhost:3000/api/progress', {
        method: 'POST',
        headers,
        body: JSON.stringify({ progress }),
      })
    );
    const progressBody = (await progressResponse.json()) as { code?: string };

    expect(progressResponse.status).toBe(403);
    expect(progressBody.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('强制改密成功后撤销全部旧Session、清除标志并签发新Session', async () => {
    insertStudent('usr_force_change', 'student_force_change', 'active', 1);
    const currentSession = createSession('usr_force_change', 'student', { db: testDb });
    const otherSession = createSession('usr_force_change', 'student', { db: testDb });
    const { POST: changePasswordPost } = await import('@/app/api/auth/change-password/route');

    const response = await changePasswordPost(
      new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { cookie: `nev_session=${currentSession.token}` },
        body: JSON.stringify({
          currentPassword: 'Temp#Pass123',
          newPassword: 'New#SecurePass2026',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(validateSession(currentSession.token, testDb)).toBeNull();
    expect(validateSession(otherSession.token, testDb)).toBeNull();

    const row = testDb.prepare<{ password_hash: string; must_change_password: number }>(
      'SELECT password_hash, must_change_password FROM users WHERE id = ?'
    ).get('usr_force_change');
    expect(row?.must_change_password).toBe(0);
    expect(verifyPassword('New#SecurePass2026', row!.password_hash)).toBe(true);

    const cookie = response.headers.get('set-cookie') || '';
    const newToken = cookie.match(/nev_session=([^;]+)/)?.[1] || '';
    expect(newToken).toBeTruthy();
    expect(validateSession(newToken, testDb)?.user.mustChangePassword).toBe(false);
  });

  it('学生凭一次性激活码激活，班级只取管理员预置关系且激活码只能使用一次', async () => {
    insertStudent('usr_pending', 'student_pending', 'pending_activation', 1);
    const assignedClass = createClass({ name: '24新能源预置班' }, testDb);
    assignStudentToClass('usr_pending', assignedClass.id, undefined, testDb);

    const activationCode = 'ACT-9K7M2P';
    const now = Date.now();
    testDb.prepare(
      `INSERT INTO student_activations
       (id, student_id, code_hash, expires_at, used_at, created_by, created_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`
    ).run(
      'activation_1',
      'usr_pending',
      hashPassword(activationCode),
      now + 10 * 60 * 1000,
      null,
      now
    );

    const { POST: activatePost } = await import('@/app/api/auth/activate/route');
    const response = await activatePost(
      new NextRequest('http://localhost:3000/api/auth/activate', {
        method: 'POST',
        body: JSON.stringify({
          username: 'student_pending',
          activationCode,
          newPassword: 'Student#Secure2026',
          classId: 'forged-class-id',
        }),
      })
    );
    const body = (await response.json()) as {
      user: { className: string; role: string };
    };

    expect(response.status).toBe(200);
    expect(body.user).toMatchObject({ role: 'student', className: assignedClass.name });

    const user = testDb.prepare<{ status: string; password_hash: string }>(
      'SELECT status, password_hash FROM users WHERE id = ?'
    ).get('usr_pending');
    expect(user?.status).toBe('active');
    expect(verifyPassword('Student#Secure2026', user!.password_hash)).toBe(true);
    expect(
      testDb.prepare<{ user_id: string }>('SELECT user_id FROM user_progress WHERE user_id = ?').get('usr_pending')
    ).toBeDefined();

    const secondResponse = await activatePost(
      new NextRequest('http://localhost:3000/api/auth/activate', {
        method: 'POST',
        body: JSON.stringify({
          username: 'student_pending',
          activationCode,
          newPassword: 'Another#Secure2026',
        }),
      })
    );
    expect(secondResponse.status).toBe(401);
  });
});
