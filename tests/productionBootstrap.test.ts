import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as authPost } from '@/app/api/auth/route';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import { bootstrapDefaultDataIfNeeded } from '@/src/server/db/bootstrap';
import { bootstrapInitialAdminIfNeeded } from '@/src/server/db/migration';

let testDb: AppDatabase;

beforeEach(() => {
  testDb = createSqliteAdapter(':memory:');
  setDatabaseInstance(testDb);
});

afterAll(() => {
  setDatabaseInstance(null);
});

describe('生产初始化与公开注册边界', () => {
  it('生产环境即使请求演示种子也不创建任何固定账号', () => {
    bootstrapDefaultDataIfNeeded(testDb, {
      environment: 'production',
      enableDemoSeed: true,
    });

    const count = testDb.prepare<{ count: number }>('SELECT COUNT(*) as count FROM users').get();
    expect(count?.count).toBe(0);
  });

  it('开发环境只有显式启用时才创建演示账号，且不存在重复教师身份', () => {
    bootstrapDefaultDataIfNeeded(testDb, {
      environment: 'development',
      enableDemoSeed: false,
    });
    let count = testDb.prepare<{ count: number }>('SELECT COUNT(*) as count FROM users').get();
    expect(count?.count).toBe(0);

    bootstrapDefaultDataIfNeeded(testDb, {
      environment: 'development',
      enableDemoSeed: true,
    });
    count = testDb.prepare<{ count: number }>('SELECT COUNT(*) as count FROM users').get();
    expect(count?.count).toBeGreaterThan(0);

    const duplicateTeacher = testDb.prepare<{ id: string }>(
      "SELECT id FROM users WHERE username = 'teacher1'"
    ).get();
    expect(duplicateTeacher).toBeUndefined();
  });

  it('演示初始化只为学生创建user_progress', () => {
    bootstrapDefaultDataIfNeeded(testDb, {
      environment: 'test',
      enableDemoSeed: true,
    });

    const invalidRows = testDb.prepare<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM user_progress p
       INNER JOIN users u ON p.user_id = u.id
       WHERE u.role != 'student'`
    ).get();
    expect(invalidRows?.count).toBe(0);
  });

  it('没有显式一次性管理员密码时不自动创建默认管理员', () => {
    const created = bootstrapInitialAdminIfNeeded(testDb, {
      initialPassword: undefined,
    });

    const count = testDb.prepare<{ count: number }>(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
    ).get();
    expect(created).toBe(false);
    expect(count?.count).toBe(0);
  });

  it('公开学生注册接口被禁用，客户端提交班级不会创建用户或归班关系', async () => {
    const response = await authPost(
      new NextRequest('http://localhost:3000/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'register',
          username: 'forged_student',
          password: 'Student#123',
          realName: '伪造学生',
          className: '任意伪造班级',
        }),
      })
    );
    const body = (await response.json()) as { success: boolean; code?: string };

    expect(response.status).toBe(403);
    expect(body.code).toBe('SELF_REGISTRATION_DISABLED');
    expect(testDb.prepare<{ count: number }>('SELECT COUNT(*) as count FROM users').get()?.count).toBe(0);
    expect(
      testDb.prepare<{ count: number }>('SELECT COUNT(*) as count FROM student_class').get()?.count
    ).toBe(0);
  });
});
