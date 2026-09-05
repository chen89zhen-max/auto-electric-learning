import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as progressPost } from '@/app/api/progress/route';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import { hashPassword } from '@/src/server/auth/crypto';
import { createSession } from '@/src/server/auth/session';
import {
  assignStudentToClass,
  assignTeacherToClass,
  createClass,
} from '@/src/server/db/classService';
import { createBaseUserProgress } from '@/src/types/progress';

let testDb: AppDatabase;
let teacherToken: string;
let adminToken: string;
let student1Token: string;

function postProgress(token: string, username?: string) {
  const progress = createBaseUserProgress(username === 'student2' ? '学生乙' : '学生甲');
  progress.levels.LEVEL_00 = { status: 'completed', score: 90 };

  return progressPost(
    new NextRequest('http://localhost:3000/api/progress', {
      method: 'POST',
      headers: { cookie: `nev_session=${token}` },
      body: JSON.stringify({ username, progress }),
    })
  );
}

beforeEach(() => {
  testDb = createSqliteAdapter(':memory:');
  setDatabaseInstance(testDb);

  const now = Date.now();
  const insertUser = testDb.prepare(
    `INSERT INTO users (id, username, password_hash, real_name, role, class_name, status, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)`
  );
  insertUser.run('usr_admin', 'admin', hashPassword('Pass#123'), '管理员', 'admin', '管理组', now, now);
  insertUser.run('usr_teacher', 'teacher', hashPassword('Pass#123'), '教师', 'teacher', '教师组', now, now);
  insertUser.run('usr_student1', 'student1', hashPassword('Pass#123'), '学生甲', 'student', '', now, now);
  insertUser.run('usr_student2', 'student2', hashPassword('Pass#123'), '学生乙', 'student', '', now, now);

  const class1 = createClass({ name: '24新能源1班' }, testDb);
  const class2 = createClass({ name: '24新能源2班' }, testDb);
  assignTeacherToClass({ teacherId: 'usr_teacher', classId: class1.id }, testDb);
  assignStudentToClass('usr_student1', class1.id, undefined, testDb);
  assignStudentToClass('usr_student2', class2.id, undefined, testDb);

  teacherToken = createSession('usr_teacher', 'teacher', { db: testDb }).token;
  adminToken = createSession('usr_admin', 'admin', { db: testDb }).token;
  student1Token = createSession('usr_student1', 'student', { db: testDb }).token;
});

afterAll(() => {
  setDatabaseInstance(null);
});

describe('原始学习进度写入权限', () => {
  it.each([
    ['教师覆盖任教班学生', () => postProgress(teacherToken, 'student1')],
    ['教师覆盖非任教班学生', () => postProgress(teacherToken, 'student2')],
    ['教师写入自己的学习进度', () => postProgress(teacherToken)],
    ['管理员覆盖学生进度', () => postProgress(adminToken, 'student1')],
  ])('%s 必须返回403', async (_label, requestFactory) => {
    const response = await requestFactory();
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toContain('只有学生本人');
  });

  it('学生本人提交旧整份进度接口返回410且不写入', async () => {
    const response = await postProgress(student1Token);
    expect(response.status).toBe(410);

    const row = testDb.prepare<{ progress_data: string }>(
      'SELECT progress_data FROM user_progress WHERE user_id = ?'
    ).get('usr_student1');
    expect(row).toBeUndefined();
  });

  it('学生伪造其他用户名仍返回403且不写入目标学生', async () => {
    const response = await postProgress(student1Token, 'student2');
    expect(response.status).toBe(403);

    const row = testDb.prepare<{ progress_data: string }>(
      'SELECT progress_data FROM user_progress WHERE user_id = ?'
    ).get('usr_student2');
    expect(row).toBeUndefined();
  });
});
