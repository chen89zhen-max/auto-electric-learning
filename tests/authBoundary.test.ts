import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as authLoginPost } from '@/app/api/auth/login/route';
import { POST as authLogoutPost } from '@/app/api/auth/logout/route';
import { GET as authMeGet } from '@/app/api/auth/me/route';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import { hashPassword } from '@/src/server/auth/crypto';
import { createSession, validateSession } from '@/src/server/auth/session';
import { createBaseUserProgress } from '@/src/types/progress';
import { logoutUser, setCurrentUser } from '@/src/stores/authStore';

let testDb: AppDatabase;

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, String(value));
    },
  };
}

beforeEach(() => {
  testDb = createSqliteAdapter(':memory:');
  setDatabaseInstance(testDb);

  const now = Date.now();
  const insertUser = testDb.prepare(
    `INSERT INTO users (id, username, password_hash, real_name, role, class_name, status, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)`
  );
  insertUser.run('usr_student', 'student_a', hashPassword('Student#123'), '学生甲', 'student', '24新能源1班', now, now);
  insertUser.run('usr_teacher', 'teacher_a', hashPassword('Teacher#123'), '教师甲', 'teacher', '教师组', now, now);
  insertUser.run('usr_admin', 'admin_a', hashPassword('Admin#123'), '管理员甲', 'admin', '管理组', now, now);

  testDb.prepare(
    'INSERT INTO user_progress (user_id, progress_data, version, last_updated) VALUES (?, ?, 1, ?)'
  ).run('usr_student', JSON.stringify(createBaseUserProgress('学生甲')), now);

  vi.stubGlobal('localStorage', createMemoryStorage());
  setCurrentUser(null);
});

afterEach(() => {
  setCurrentUser(null);
  setDatabaseInstance(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('认证入口、会话恢复与安全退出边界', () => {
  it('错误角色入口使用统一错误拒绝登录，不泄露真实角色', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin_a',
        password: 'Admin#123',
        expectedRole: 'student',
      }),
    });

    const response = await authLoginPost(request);
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe('账号、密码或登录入口不匹配');
    expect(body.error).not.toContain('管理员');
  });

  it.each([
    ['teacher_a', 'Teacher#123', 'teacher'],
    ['admin_a', 'Admin#123', 'admin'],
  ] as const)('%s 登录成功时不返回学生学习进度', async (username, password, expectedRole) => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, expectedRole }),
    });

    const response = await authLoginPost(request);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.progress).toBeUndefined();
  });

  it('GET /api/auth 对教师会话只返回服务端身份，不返回学生学习进度', async () => {
    const { token } = createSession('usr_teacher', 'teacher', { db: testDb });
    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      headers: { cookie: `nev_session=${token}` },
    });

    const response = await authMeGet(request);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.user).toMatchObject({ username: 'teacher_a', role: 'teacher' });
    expect(body.progress).toBeUndefined();
  });

  it('服务端logout端点撤销当前Session，随后me返回401', async () => {
    const { token } = createSession('usr_admin', 'admin', { db: testDb });
    const headers = { cookie: `nev_session=${token}` };

    const logoutResponse = await authLogoutPost(
      new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers,
      })
    );

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(validateSession(token, testDb)).toBeNull();

    const meResponse = await authMeGet(
      new NextRequest('http://localhost:3000/api/auth/me', { headers })
    );
    expect(meResponse.status).toBe(401);
  });

  it('前端退出必须请求服务端logout端点，然后清理本地身份', async () => {
    setCurrentUser({
      username: 'teacher_a',
      realName: '教师甲',
      className: '教师组',
      role: 'teacher',
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await logoutUser();

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual({ success: true });
    expect(localStorage.getItem('NEV_AUTH_CURRENT_USER_V1')).toBeNull();
  });
});
