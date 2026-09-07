import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import { hashPassword } from '@/src/server/auth/crypto';
import { createSession } from '@/src/server/auth/session';
import { POST as teacherEvaluationPost } from '@/app/api/teacher/evaluations/route';
import { GET as studentEvaluationGet } from '@/app/api/learning/evaluations/route';
import { GET as teacherStudentsGet } from '@/app/api/teacher/students/route';
import { POST as adminClassesPost } from '@/app/api/admin/classes/route';
import {
  createClass,
  assignTeacherToClass,
  assignStudentToClass,
  transferStudent,
} from '@/src/server/db/classService';

let db: AppDatabase;
let class1Id: string;
let class2Id: string;
let teacherAToken: string;
let teacherBToken: string;
let studentAToken: string;
let studentBToken: string;
let adminToken: string;
let attemptE07AId: string;

function jsonRequest(path: string, token: string, method: 'GET' | 'POST' = 'GET', body?: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      cookie: `nev_session=${token}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function seedUser(id: string, username: string, realName: string, role: 'admin' | 'teacher' | 'student'): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO users (id, username, password_hash, real_name, role, class_name, status, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, '', 'active', 0, ?, ?)`
  ).run(id, username, hashPassword('Pass#2026'), realName, role, now, now);
}

function seedAttempt(id: string, studentId: string, classId: string, levelId: string): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO learning_attempts
      (id, student_id, class_id, course_version_id, level_id, started_at, completed_at, score, status, mode, rubric_version)
     VALUES (?, ?, ?, 'cv_auto_elec_p1_v1', ?, ?, ?, 90, 'completed', 'guided', 'v2')`
  ).run(id, studentId, classId, levelId, now - 120000, now);
}

describe('Task 10: Three-Role End-to-End & E07 Physical Rubric Signing Lifecycle', () => {
  beforeEach(() => {
    db = createSqliteAdapter(':memory:');
    setDatabaseInstance(db);

    // 1. Seed users across all 3 roles
    seedUser('usr_admin', 'admin', '系统管理员', 'admin');
    seedUser('usr_teacher_a', 'teacher_a', '陈老师', 'teacher');
    seedUser('usr_teacher_b', 'teacher_b', '李老师', 'teacher');
    seedUser('usr_student_a', 'student_a', '张学员', 'student');
    seedUser('usr_student_b', 'student_b', '王学员', 'student');

    // 2. Admin creates two distinct classes
    const c1 = createClass({ name: '24汽修1班', grade: '2024级', cohortYear: 2024 }, db);
    const c2 = createClass({ name: '24汽修2班', grade: '2024级', cohortYear: 2024 }, db);
    class1Id = c1.id;
    class2Id = c2.id;

    // 3. Assign teachers: Teacher A -> Class 1, Teacher B -> Class 2
    assignTeacherToClass({ teacherId: 'usr_teacher_a', classId: class1Id, actorId: 'usr_admin' }, db);
    assignTeacherToClass({ teacherId: 'usr_teacher_b', classId: class2Id, actorId: 'usr_admin' }, db);

    // 4. Enroll students: Student A -> Class 1, Student B -> Class 2
    assignStudentToClass('usr_student_a', class1Id, 'usr_admin', db);
    assignStudentToClass('usr_student_b', class2Id, 'usr_admin', db);

    // 5. Issue sessions for all roles
    adminToken = createSession('usr_admin', 'admin', { db }).token;
    teacherAToken = createSession('usr_teacher_a', 'teacher', { db }).token;
    teacherBToken = createSession('usr_teacher_b', 'teacher', { db }).token;
    studentAToken = createSession('usr_student_a', 'student', { db }).token;
    studentBToken = createSession('usr_student_b', 'student', { db }).token;

    // 6. Student A completes virtual E07 training
    attemptE07AId = 'att_e07_student_a_001';
    seedAttempt(attemptE07AId, 'usr_student_a', class1Id, 'E07');
  });

  it('Step 3.1: verifies class enrollment, co-teaching and student transfer lifecycle', () => {
    // Admin transfers Student A from Class 1 to Class 2
    transferStudent('usr_student_a', class2Id, 'usr_admin', db);

    // Verify student is now effectively in Class 2
    const mapping = db.prepare(
      `SELECT class_id, is_current, valid_to FROM student_class WHERE student_id = ? AND is_current = 1`
    ).get('usr_student_a') as { class_id: string; is_current: number; valid_to: number | null } | undefined;

    expect(mapping).toBeDefined();
    expect(mapping?.class_id).toBe(class2Id);
    expect(mapping?.is_current).toBe(1);

    // Transfer back to Class 1 for subsequent tests
    transferStudent('usr_student_a', class1Id, 'usr_admin', db);
  });

  it('Step 3.2: enforces strict cross-class isolation between Teacher A and Teacher B', async () => {
    // Teacher A queries students in assigned Class 1 -> sees Student A
    const reqA = jsonRequest(`/api/teacher/students?classId=${class1Id}`, teacherAToken, 'GET');
    const resA = await teacherStudentsGet(reqA);
    expect(resA.status).toBe(200);
    const dataA = await resA.json();
    expect(dataA.students.some((s: { id: string }) => s.id === 'usr_student_a')).toBe(true);
    expect(dataA.students.some((s: { id: string }) => s.id === 'usr_student_b')).toBe(false);

    // Teacher A tampers classId in query parameter to Class 2 -> strictly blocked with 403
    const reqTamper = jsonRequest(`/api/teacher/students?classId=${class2Id}`, teacherAToken, 'GET');
    const resTamper = await teacherStudentsGet(reqTamper);
    expect(resTamper.status).toBe(403);

    // Teacher B queries Class 2 -> sees Student B and not Student A
    const reqB = jsonRequest(`/api/teacher/students?classId=${class2Id}`, teacherBToken, 'GET');
    const resB = await teacherStudentsGet(reqB);
    expect(resB.status).toBe(200);
    const dataB = await resB.json();
    expect(dataB.students.some((s: { id: string }) => s.id === 'usr_student_b')).toBe(true);
    expect(dataB.students.some((s: { id: string }) => s.id === 'usr_student_a')).toBe(false);
  });

  it('Step 3.3: blocks student role from accessing teacher workspace or admin APIs', async () => {
    // Student tries to call teacher students list API -> 403
    const reqTeacher = jsonRequest(`/api/teacher/students?classId=${class1Id}`, studentAToken, 'GET');
    const resTeacher = await teacherStudentsGet(reqTeacher);
    expect(resTeacher.status).toBe(403);

    // Student tries to create class via admin API -> 403
    const reqAdmin = jsonRequest('/api/admin/classes', studentAToken, 'POST', { name: '黑客班级' });
    const resAdmin = await adminClassesPost(reqAdmin);
    expect(resAdmin.status).toBe(403);

    // System admin creates class via admin API -> 201
    const reqAdminAllowed = jsonRequest('/api/admin/classes', adminToken, 'POST', { name: '智能网联2班' });
    const resAdminAllowed = await adminClassesPost(reqAdminAllowed);
    expect(resAdminAllowed.status).toBe(201);

    // Student tries to post teacher evaluation -> 403
    const reqEval = jsonRequest('/api/teacher/evaluations', studentAToken, 'POST', {
      studentId: 'usr_student_a',
      attemptId: attemptE07AId,
      evaluationType: 'PHYSICAL_RUBRIC',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricItems: { pre_power_check: 20 },
    });
    const resEval = await teacherEvaluationPost(reqEval);
    expect(resEval.status).toBe(403);
  });

  it('Step 3.4: executes complete E07 physical rubric signing and read-only student verification', async () => {
    // 1. Before teacher signing, student queries evaluation -> 404
    const reqPre = jsonRequest(`/api/learning/evaluations?attemptId=${attemptE07AId}`, studentAToken, 'GET');
    const resPre = await studentEvaluationGet(reqPre);
    expect(resPre.status).toBe(404);

    // 2. Teacher B (unauthorized for Class 1) attempts to sign Student A's E07 attempt -> strictly 403
    const reqSignB = jsonRequest('/api/teacher/evaluations', teacherBToken, 'POST', {
      studentId: 'usr_student_a',
      attemptId: attemptE07AId,
      evaluationType: 'PHYSICAL_RUBRIC',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricItems: {
        pre_power_check: 20,
        component_orientation: 20,
        solder_quality: 30,
        safety_process: 20,
        evidence_explanation: 10,
      },
      comment: '非法跨班代签',
    });
    const resSignB = await teacherEvaluationPost(reqSignB);
    expect(resSignB.status).toBe(403);

    // 3. Teacher A (authorized) submits realistic 5-dimension rubric scores
    const rubricPayload = {
      studentId: 'usr_student_a',
      attemptId: attemptE07AId,
      evaluationType: 'PHYSICAL_RUBRIC',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricItems: {
        pre_power_check: 20,
        component_orientation: 18,
        solder_quality: 28,
        safety_process: 19,
        evidence_explanation: 9,
      },
      comment: 'IPC-A-610 润湿良好，焊点圆润饱满，安全防护到位。',
    };
    const reqSignA = jsonRequest('/api/teacher/evaluations', teacherAToken, 'POST', rubricPayload);
    const resSignA = await teacherEvaluationPost(reqSignA);
    expect(resSignA.status).toBe(201);
    const bodySignA = await resSignA.json();

    // Server must calculate total (20+18+28+19+9 = 94), ignoring any client score tampering
    expect(bodySignA.evaluation.score).toBe(94);
    const evalRow = db.prepare('SELECT evaluation_type FROM teacher_evaluations WHERE id = ?').get(bodySignA.evaluation.id) as { evaluation_type: string };
    expect(evalRow.evaluation_type).toBe('PHYSICAL_RUBRIC');

    // 4. Student A reads their own signed rubric -> 200 read-only
    const reqReadA = jsonRequest(`/api/learning/evaluations?attemptId=${attemptE07AId}`, studentAToken, 'GET');
    const resReadA = await studentEvaluationGet(reqReadA);
    expect(resReadA.status).toBe(200);
    const bodyReadA = await resReadA.json();
    expect(bodyReadA.evaluation.score).toBe(94);
    expect(bodyReadA.evaluation.evaluationType).toBe('PHYSICAL_RUBRIC');
    expect(bodyReadA.evaluation.rubricData.solder_quality).toBe(28);
    expect(bodyReadA.evaluation.comment).toContain('IPC-A-610');

    // 5. Student B attempts to snoop Student A's evaluation -> 403
    const reqSnoop = jsonRequest(`/api/learning/evaluations?attemptId=${attemptE07AId}`, studentBToken, 'GET');
    const resSnoop = await studentEvaluationGet(reqSnoop);
    expect(resSnoop.status).toBe(403);

    // 6. Duplicate signing attempt on same attempt -> 409 Conflict
    const reqDup = jsonRequest('/api/teacher/evaluations', teacherAToken, 'POST', rubricPayload);
    const resDup = await teacherEvaluationPost(reqDup);
    expect(resDup.status).toBe(409);
  });
});
