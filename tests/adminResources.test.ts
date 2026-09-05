import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { hashPassword } from '@/src/server/auth/crypto';
import { createSession } from '@/src/server/auth/session';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import { DELETE as usersDelete, GET as usersGet, POST as usersPost, PATCH as usersPatch } from '@/app/api/admin/users/route';
import { GET as classesGet, POST as classesPost, PATCH as classesPatch } from '@/app/api/admin/classes/route';
import { POST as teacherAssign, DELETE as teacherRevoke } from '@/app/api/admin/teacher-classes/route';
import { POST as studentAssign, PATCH as studentTransfer } from '@/app/api/admin/student-classes/route';
import { GET as auditGet } from '@/app/api/admin/audit-logs/route';

let db: AppDatabase;
let adminToken: string;
let teacherToken: string;
let studentToken: string;

function request(
  path: string,
  token: string,
  init: { method?: string; body?: string; headers?: HeadersInit } = {}
): NextRequest {
  const headers = new Headers(init.headers);
  headers.set('cookie', `nev_session=${token}`);
  if (init.body) headers.set('content-type', 'application/json');
  return new NextRequest(`http://localhost${path}`, {
    method: init.method,
    body: init.body,
    headers,
  });
}

function insertUser(id: string, role: 'admin' | 'teacher' | 'student'): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO users
      (id,username,password_hash,real_name,role,class_name,status,must_change_password,created_at,updated_at)
     VALUES (?,?,?,?,?,'','active',0,?,?)`
  ).run(id, id, hashPassword('Start#2026'), id, role, now, now);
}

beforeEach(() => {
  db = createSqliteAdapter(':memory:');
  setDatabaseInstance(db);
  insertUser('admin', 'admin');
  insertUser('teacher', 'teacher');
  insertUser('student', 'student');
  adminToken = createSession('admin', 'admin', { db }).token;
  teacherToken = createSession('teacher', 'teacher', { db }).token;
  studentToken = createSession('student', 'student', { db }).token;
});

describe('isolated admin resource APIs', () => {
  it('rejects teacher and student access to every administrator resource', async () => {
    const readers = [usersGet, classesGet, auditGet];
    for (const handler of readers) {
      expect((await handler(request('/api/admin/resource', teacherToken))).status).toBe(403);
      expect((await handler(request('/api/admin/resource', studentToken))).status).toBe(403);
    }
    expect((await usersPost(request('/api/admin/users', teacherToken, {
      method: 'POST',
      body: JSON.stringify({ username: 'x', realName: 'x', role: 'teacher' }),
    }))).status).toBe(403);
  });

  it('creates and lists accounts, maps duplicates to 409 and invalid status transitions to 422', async () => {
    const createResponse = await usersPost(request('/api/admin/users', adminToken, {
      method: 'POST',
      body: JSON.stringify({ username: 'teacher_new', realName: '新教师', role: 'teacher' }),
    }));
    expect(createResponse.status).toBe(201);
    const created = await createResponse.json() as { user: { status: string; mustChangePassword: boolean }; temporaryPassword: string };
    expect(created.user).toMatchObject({ status: 'active', mustChangePassword: true });
    expect(created.temporaryPassword.length).toBeGreaterThanOrEqual(10);

    const classResponse = await classesPost(request('/api/admin/classes', adminToken, {
      method: 'POST', body: JSON.stringify({ name: '待激活学生班', grade: '2026级', cohortYear: 2026 }),
    }));
    const activationClassId = (await classResponse.json() as { class: { id: string } }).class.id;
    const studentResponse = await usersPost(request('/api/admin/users', adminToken, {
      method: 'POST',
      body: JSON.stringify({ username: 'student_new', realName: '新学生', role: 'student', classId: activationClassId }),
    }));
    const newStudent = await studentResponse.json() as { user: { id: string; status: string }; activationCode: string };
    expect(newStudent.user.status).toBe('pending_activation');
    expect(newStudent.activationCode.length).toBeGreaterThanOrEqual(10);
    const reissue = await usersPatch(request('/api/admin/users', adminToken, {
      method: 'PATCH',
      body: JSON.stringify({ userId: newStudent.user.id, operation: 'reset_password' }),
    }));
    expect((await reissue.json() as { activationCode: string }).activationCode.length).toBeGreaterThanOrEqual(10);

    const duplicate = await usersPost(request('/api/admin/users', adminToken, {
      method: 'POST',
      body: JSON.stringify({ username: 'TEACHER_NEW', realName: '重复教师', role: 'teacher' }),
    }));
    expect(duplicate.status).toBe(409);

    const list = await usersGet(request('/api/admin/users?role=teacher', adminToken));
    expect(list.status).toBe(200);
    expect((await list.json() as { users: Array<{ username: string }> }).users.some(
      (user) => user.username === 'teacher_new'
    )).toBe(true);

    const userId = db.prepare<{ id: string }>("SELECT id FROM users WHERE username='teacher_new'").get()!.id;
    const rename = await usersPatch(request('/api/admin/users', adminToken, {
      method: 'PATCH',
      body: JSON.stringify({ userId, realName: '新能源专业教师' }),
    }));
    expect(rename.status).toBe(200);
    expect((await rename.json() as { user: { realName: string } }).user.realName).toBe('新能源专业教师');
    const invalid = await usersPatch(request('/api/admin/users', adminToken, {
      method: 'PATCH',
      body: JSON.stringify({ userId, status: 'pending_activation' }),
    }));
    expect(invalid.status).toBe(422);
    const suspend = await usersPatch(request('/api/admin/users', adminToken, {
      method: 'PATCH',
      body: JSON.stringify({ userId, status: 'suspended' }),
    }));
    expect(suspend.status).toBe(200);
    expect((await usersDelete(request('/api/admin/users', adminToken, {
      method: 'DELETE', body: JSON.stringify({ userId: 'admin' }),
    }))).status).toBe(409);
  });

  it('manages classes and both relationship types, then exposes auditable results', async () => {
    const firstResponse = await classesPost(request('/api/admin/classes', adminToken, {
      method: 'POST', body: JSON.stringify({ name: '25新能源1班', grade: '2025级', cohortYear: 2025 }),
    }));
    const first = (await firstResponse.json() as { class: { id: string } }).class;
    const secondResponse = await classesPost(request('/api/admin/classes', adminToken, {
      method: 'POST', body: JSON.stringify({ name: '25新能源2班', grade: '2025级', cohortYear: 2025 }),
    }));
    const second = (await secondResponse.json() as { class: { id: string } }).class;

    const renameClass = await classesPatch(request('/api/admin/classes', adminToken, {
      method: 'PATCH', body: JSON.stringify({ classId: first.id, name: '25新能源汽车1班', grade: '2025级', cohortYear: 2025 }),
    }));
    expect(renameClass.status).toBe(200);

    expect((await teacherAssign(request('/api/admin/teacher-classes', adminToken, {
      method: 'POST', body: JSON.stringify({ teacherId: 'teacher', classId: first.id }),
    }))).status).toBe(201);
    expect((await studentAssign(request('/api/admin/student-classes', adminToken, {
      method: 'POST', body: JSON.stringify({ studentId: 'student', classId: first.id }),
    }))).status).toBe(201);
    expect((await studentTransfer(request('/api/admin/student-classes', adminToken, {
      method: 'PATCH', body: JSON.stringify({ studentId: 'student', newClassId: second.id }),
    }))).status).toBe(200);
    expect((await teacherRevoke(request('/api/admin/teacher-classes', adminToken, {
      method: 'DELETE', body: JSON.stringify({ teacherId: 'teacher', classId: first.id }),
    }))).status).toBe(200);

    const archived = await classesPatch(request('/api/admin/classes', adminToken, {
      method: 'PATCH', body: JSON.stringify({ classId: first.id, status: 'archived' }),
    }));
    expect(archived.status).toBe(200);
    const classes = await classesGet(request('/api/admin/classes', adminToken));
    expect((await classes.json() as { classes: Array<{ id: string; status: string }> }).classes)
      .toContainEqual(expect.objectContaining({ id: first.id, status: 'archived' }));

    const audit = await auditGet(request('/api/admin/audit-logs?limit=100', adminToken));
    const actions = (await audit.json() as { logs: Array<{ action: string }> }).logs.map((row) => row.action);
    expect(actions).toEqual(expect.arrayContaining([
      'CLASS_CREATED',
      'TEACHER_ASSIGNED_TO_CLASS',
      'STUDENT_CLASS_ASSIGNED',
      'STUDENT_CLASS_TRANSFERRED',
      'TEACHER_REVOKED_FROM_CLASS',
      'CLASS_STATUS_CHANGED',
    ]));
  });
});
