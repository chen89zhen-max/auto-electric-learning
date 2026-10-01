import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as studentAttemptsGet } from '@/app/api/learning/attempts/route';
import { GET as teacherAttemptsGet } from '@/app/api/teacher/attempts/route';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import { hashPassword } from '@/src/server/auth/crypto';
import { createSession } from '@/src/server/auth/session';
import {
  assignStudentToClass,
  assignTeacherToClass,
  createClass,
} from '@/src/server/db/classService';
import { makeValidA03Metrics } from './helpers/c7EvidenceFixtures';
import { buildAttemptEvidenceEnvelope } from '@/src/server/learning/attemptEvidenceService';

let testDb: AppDatabase;
let teacherToken: string;
let student1Token: string;
let student2Token: string;

function makeStudentReq(query: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.cookie = `nev_session=${token}`;
  }
  return new NextRequest(`http://localhost:3000/api/learning/attempts?${query}`, {
    method: 'GET',
    headers,
  });
}

function makeTeacherReq(query: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.cookie = `nev_session=${token}`;
  }
  return new NextRequest(`http://localhost:3000/api/teacher/attempts?${query}`, {
    method: 'GET',
    headers,
  });
}

beforeEach(() => {
  testDb = createSqliteAdapter(':memory:');
  setDatabaseInstance(testDb);

  const now = Date.now();
  const insertUser = testDb.prepare(
    `INSERT INTO users (id, username, password_hash, real_name, role, class_name, status, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  );
  insertUser.run('usr_teacher', 'teacher', hashPassword('Pass#123'), '王老师', 'teacher', '教师组', 'active', now, now);
  insertUser.run('usr_student1', 'student1', hashPassword('Pass#123'), '张三', 'student', '新能源1班', 'active', now, now);
  insertUser.run('usr_student2', 'student2', hashPassword('Pass#123'), '李四', 'student', '新能源2班', 'active', now, now);
  insertUser.run('usr_deleted', 'deleted_std', hashPassword('Pass#123'), '已注销', 'student', '新能源1班', 'active', now, now);

  const classA = createClass({ name: '新能源1班' }, testDb);
  const classB = createClass({ name: '新能源2班' }, testDb);
  assignTeacherToClass({ teacherId: 'usr_teacher', classId: classA.id }, testDb);
  assignStudentToClass('usr_student1', classA.id, undefined, testDb);
  assignStudentToClass('usr_student2', classB.id, undefined, testDb);
  assignStudentToClass('usr_deleted', classA.id, undefined, testDb);
  testDb.prepare("UPDATE users SET status = 'deleted' WHERE id = 'usr_deleted'").run();

  teacherToken = createSession('usr_teacher', 'teacher', { db: testDb }).token;
  student1Token = createSession('usr_student1', 'student', { db: testDb }).token;
  student2Token = createSession('usr_student2', 'student', { db: testDb }).token;

  // Seed course version for attempt FK
  testDb.prepare(
    `INSERT OR IGNORE INTO course_versions (id, course_code, version, published_at, status)
     VALUES ('cv_c7_auth', 'auto_electric', 'v1.0.0', ?, 'published')`
  ).run(now);

  const v2Envelope = buildAttemptEvidenceEnvelope('A03', makeValidA03Metrics());

  // Insert attempts for student 1 and student 2
  const insertAttempt = testDb.prepare(
    `INSERT INTO learning_attempts
      (id, student_id, class_id, course_version_id, level_id, status, score, started_at, completed_at, mode, evidence_data)
     VALUES (?, ?, ?, 'cv_c7_auth', 'A03', 'completed', 90, ?, ?, 'guided', ?)`
  );

  insertAttempt.run('att_s1_a03', 'usr_student1', classA.id, now - 5000, now - 1000, JSON.stringify(v2Envelope));
  insertAttempt.run('att_s2_a03', 'usr_student2', classB.id, now - 5000, now - 1000, JSON.stringify(v2Envelope));
});

afterAll(() => {
  setDatabaseInstance(null);
});

describe('C7 学生端与教师端过程证据只读鉴权', () => {
  it('student self-read returns 200 and only that student\'s attempt IDs', async () => {
    const res = await studentAttemptsGet(makeStudentReq('levelId=A03', student1Token));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.total).toBe(1);
    expect(body.attempts).toHaveLength(1);
    expect(body.attempts[0].attemptId).toBe('att_s1_a03');
    expect(body.attempts.some((a: { attemptId: string }) => a.attemptId === 'att_s2_a03')).toBe(false);

    const res2 = await studentAttemptsGet(makeStudentReq('levelId=A03', student2Token));
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.success).toBe(true);
    expect(body2.attempts).toHaveLength(1);
    expect(body2.attempts[0].attemptId).toBe('att_s2_a03');
  });

  it('adding studentId or username to the student endpoint returns 400 and never returns the targeted student\'s IDs', async () => {
    const resWithStudentId = await studentAttemptsGet(makeStudentReq('levelId=A03&studentId=usr_student2', student1Token));
    expect(resWithStudentId.status).toBe(400);
    const body1 = await resWithStudentId.json();
    expect(body1.success).toBe(false);
    expect(body1.attempts).toBeUndefined();

    const resWithUsername = await studentAttemptsGet(makeStudentReq('levelId=A03&username=student2', student1Token));
    expect(resWithUsername.status).toBe(400);
    const body2 = await resWithUsername.json();
    expect(body2.success).toBe(false);
    expect(body2.attempts).toBeUndefined();
  });

  it('requesting a non-C7 level returns 400', async () => {
    const resStudent = await studentAttemptsGet(makeStudentReq('levelId=E04', student1Token));
    expect(resStudent.status).toBe(400);
    const bodyStudent = await resStudent.json();
    expect(bodyStudent.success).toBe(false);

    const resTeacher = await teacherAttemptsGet(makeTeacherReq('studentId=usr_student1&levelId=B02', teacherToken));
    expect(resTeacher.status).toBe(400);
    const bodyTeacher = await resTeacher.json();
    expect(bodyTeacher.success).toBe(false);
  });

  it('assigned-class teacher read returns 200 and the requested student\'s attempt IDs', async () => {
    const res = await teacherAttemptsGet(makeTeacherReq('studentId=usr_student1&levelId=A03', teacherToken));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.total).toBe(1);
    expect(body.attempts).toHaveLength(1);
    expect(body.attempts[0].attemptId).toBe('att_s1_a03');
  });

  it('cross-class teacher read returns 403 and creates one TEACHER_ATTEMPT_EVIDENCE_READ_DENIED audit row', async () => {
    const res = await teacherAttemptsGet(makeTeacherReq('studentId=usr_student2&levelId=A03', teacherToken));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN_STUDENT');

    const auditLogs = testDb.prepare<{ action: string; actor_id: string; target_id: string; result: string; details: string }>(
      "SELECT action, actor_id, target_id, result, details FROM audit_logs WHERE action = 'TEACHER_ATTEMPT_EVIDENCE_READ_DENIED'"
    ).all();
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].actor_id).toBe('usr_teacher');
    expect(auditLogs[0].target_id).toBe('usr_student2');
    expect(auditLogs[0].result).toBe('DENIED');
    const details = JSON.parse(auditLogs[0].details);
    expect(details).toEqual({ levelId: 'A03' });
    expect(auditLogs[0].details).not.toContain('steps');
    expect(auditLogs[0].details).not.toContain('metrics');
  });

  it('unknown and deleted student IDs return 404', async () => {
    const resUnknown = await teacherAttemptsGet(makeTeacherReq('studentId=usr_nonexistent&levelId=A03', teacherToken));
    expect(resUnknown.status).toBe(404);
    const bodyUnknown = await resUnknown.json();
    expect(bodyUnknown.success).toBe(false);

    const resDeleted = await teacherAttemptsGet(makeTeacherReq('studentId=usr_deleted&levelId=A03', teacherToken));
    expect(resDeleted.status).toBe(404);
    const bodyDeleted = await resDeleted.json();
    expect(bodyDeleted.success).toBe(false);
  });

  it('unauthenticated requests return 401 and wrong-role requests return 403', async () => {
    // Unauthenticated
    const resNoAuthStudent = await studentAttemptsGet(makeStudentReq('levelId=A03'));
    expect(resNoAuthStudent.status).toBe(401);

    const resNoAuthTeacher = await teacherAttemptsGet(makeTeacherReq('studentId=usr_student1&levelId=A03'));
    expect(resNoAuthTeacher.status).toBe(401);

    // Wrong role
    const resTeacherOnStudent = await studentAttemptsGet(makeStudentReq('levelId=A03', teacherToken));
    expect(resTeacherOnStudent.status).toBe(403);

    const resStudentOnTeacher = await teacherAttemptsGet(makeTeacherReq('studentId=usr_student1&levelId=A03', student1Token));
    expect(resStudentOnTeacher.status).toBe(403);
  });
});
