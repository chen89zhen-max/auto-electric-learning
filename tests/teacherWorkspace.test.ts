import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as classGet } from '@/app/api/teacher/classes/route';
import { GET as studentGet } from '@/app/api/teacher/students/route';
import { POST as evaluationPost } from '@/app/api/teacher/evaluations/route';
import { POST as retrainingPost } from '@/app/api/teacher/retraining/route';
import { hashPassword } from '@/src/server/auth/crypto';
import { createSession } from '@/src/server/auth/session';
import { assignStudentToClass, assignTeacherToClass, createClass } from '@/src/server/db/classService';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import { createBaseUserProgress } from '@/src/types/progress';

let db: AppDatabase;
let teacherAToken: string;
let teacherBToken: string;
let studentToken: string;
let classAId: string;
let classBId: string;

function request(path: string, token: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { cookie: `nev_session=${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function addUser(id: string, role: 'teacher' | 'student'): void {
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
  addUser('teacher_a', 'teacher');
  addUser('teacher_b', 'teacher');
  addUser('student_a', 'student');
  addUser('student_b', 'student');
  classAId = createClass({ name: '教师A班' }, db).id;
  classBId = createClass({ name: '教师B班' }, db).id;
  assignTeacherToClass({ teacherId: 'teacher_a', classId: classAId }, db);
  assignTeacherToClass({ teacherId: 'teacher_b', classId: classBId }, db);
  assignStudentToClass('student_a', classAId, undefined, db);
  assignStudentToClass('student_b', classBId, undefined, db);
  const progress = createBaseUserProgress('student_a');
  progress.levels.LEVEL_00 = { status: 'completed', score: 88 };
  db.prepare('INSERT INTO user_progress (user_id,progress_data,version,last_updated) VALUES (?,?,1,?)')
    .run('student_a', JSON.stringify(progress), Date.now());
  teacherAToken = createSession('teacher_a', 'teacher', { db }).token;
  teacherBToken = createSession('teacher_b', 'teacher', { db }).token;
  studentToken = createSession('student_a', 'student', { db }).token;
});

describe('teacher workspace authorization', () => {
  it('returns only assigned classes and students, blocking class parameter tampering and student role access', async () => {
    const classes = await classGet(request('/api/teacher/classes', teacherAToken));
    expect((await classes.json() as { classes: Array<{ id: string }> }).classes.map((item) => item.id)).toEqual([classAId]);

    const students = await studentGet(request('/api/teacher/students', teacherAToken));
    expect((await students.json() as { students: Array<{ id: string }> }).students.map((item) => item.id)).toEqual(['student_a']);
    expect((await studentGet(request(`/api/teacher/students?classId=${classBId}`, teacherAToken))).status).toBe(403);
    expect((await studentGet(request(`/api/teacher/students?classId=${classBId}&format=csv`, teacherAToken))).status).toBe(403);
    expect((await classGet(request('/api/teacher/classes', studentToken))).status).toBe(403);
  });

  it('records an in-scope evaluation without modifying game progress and rejects cross-class evaluation', async () => {
    const before = db.prepare<{ progress_data: string }>('SELECT progress_data FROM user_progress WHERE user_id=?').get('student_a')!.progress_data;
    const accepted = await evaluationPost(request('/api/teacher/evaluations', teacherAToken, {
      studentId: 'student_a', score: 90, comment: '操作顺序清楚',
    }));
    expect(accepted.status).toBe(201);
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) count FROM teacher_evaluations').get()?.count).toBe(1);
    expect(db.prepare<{ progress_data: string }>('SELECT progress_data FROM user_progress WHERE user_id=?').get('student_a')!.progress_data).toBe(before);

    const denied = await evaluationPost(request('/api/teacher/evaluations', teacherAToken, {
      studentId: 'student_b', score: 90, comment: '越权评价',
    }));
    expect(denied.status).toBe(403);
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) count FROM teacher_evaluations').get()?.count).toBe(1);
  });

  it('creates a reasoned retraining request without resetting progress and blocks invalid or cross-class requests', async () => {
    const before = db.prepare<{ progress_data: string }>('SELECT progress_data FROM user_progress WHERE user_id=?').get('student_a')!.progress_data;
    expect((await retrainingPost(request('/api/teacher/retraining', teacherAToken, {
      studentId: 'student_a', reason: '需要重新训练安全处置顺序',
    }))).status).toBe(201);
    expect(db.prepare<{ status: string }>('SELECT status FROM progress_corrections').get()?.status).toBe('requested');
    expect(db.prepare<{ progress_data: string }>('SELECT progress_data FROM user_progress WHERE user_id=?').get('student_a')!.progress_data).toBe(before);
    expect((await retrainingPost(request('/api/teacher/retraining', teacherAToken, {
      studentId: 'student_a', reason: '短',
    }))).status).toBe(422);
    expect((await retrainingPost(request('/api/teacher/retraining', teacherBToken, {
      studentId: 'student_a', reason: '试图操作非任教学生',
    }))).status).toBe(403);
  });
});
