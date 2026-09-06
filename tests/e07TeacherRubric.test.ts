import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as teacherEvaluationPost } from '@/app/api/teacher/evaluations/route';
import { GET as studentEvaluationGet } from '@/app/api/learning/evaluations/route';
import { hashPassword } from '@/src/server/auth/crypto';
import { createSession } from '@/src/server/auth/session';
import { assignStudentToClass, assignTeacherToClass, createClass } from '@/src/server/db/classService';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import { createBaseUserProgress } from '@/src/types/progress';

let db: AppDatabase;
let teacherAToken: string;
let teacherBToken: string;
let studentAToken: string;
let studentBToken: string;
let classAId: string;
let classBId: string;
let attemptE07AId: string;
let attemptE07BId: string;
let attemptC01AId: string;

function request(path: string, token: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      cookie: `nev_session=${token}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
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

function createAttempt(id: string, studentId: string, levelId: string, classId: string = classAId): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO learning_attempts
      (id, student_id, class_id, course_version_id, level_id, started_at, completed_at, score, status, mode, rubric_version)
     VALUES (?, ?, ?, 'cv_auto_elec_p1_v1', ?, ?, ?, 90, 'completed', 'guided', 'v2')`
  ).run(id, studentId, classId, levelId, now - 120000, now);
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

  const progressA = createBaseUserProgress('student_a');
  progressA.levels.E07 = { status: 'completed', score: 90 };
  db.prepare('INSERT INTO user_progress (user_id,progress_data,version,last_updated) VALUES (?,?,1,?)')
    .run('student_a', JSON.stringify(progressA), Date.now());

  teacherAToken = createSession('teacher_a', 'teacher', { db }).token;
  teacherBToken = createSession('teacher_b', 'teacher', { db }).token;
  studentAToken = createSession('student_a', 'student', { db }).token;
  studentBToken = createSession('student_b', 'student', { db }).token;

  attemptE07AId = 'att_e07_a_1';
  createAttempt(attemptE07AId, 'student_a', 'E07');

  attemptE07BId = 'att_e07_b_1';
  createAttempt(attemptE07BId, 'student_b', 'E07', classBId);

  attemptC01AId = 'att_c01_a_1';
  createAttempt(attemptC01AId, 'student_a', 'C01', classAId);
});

describe('E07 Teacher Physical Rubric Evaluation', () => {
  const validRubricItems = {
    pre_power_check: 18,        // max 20
    component_orientation: 20,  // max 20
    solder_quality: 28,         // max 30
    safety_process: 19,         // max 20
    evidence_explanation: 9,    // max 10
  }; // total = 94

  it('rejects POST from student role with 403', async () => {
    const res = await teacherEvaluationPost(request('/api/teacher/evaluations', studentAToken, {
      studentId: 'student_a',
      attemptId: attemptE07AId,
      evaluationType: 'PHYSICAL_RUBRIC',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricItems: validRubricItems,
      comment: '自评应该被拦截',
    }));
    expect(res.status).toBe(403);
  });

  it('allows authorized teacher to sign E07 physical rubric with server-calculated total', async () => {
    const res = await teacherEvaluationPost(request('/api/teacher/evaluations', teacherAToken, {
      studentId: 'student_a',
      attemptId: attemptE07AId,
      evaluationType: 'PHYSICAL_RUBRIC',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricItems: validRubricItems,
      // Client spoofed score should be ignored: server computes 18+20+28+19+9 = 94
      score: 100,
      comment: 'PCB 焊接实物合格，焊点润湿良好，无桥连。',
    }));

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; evaluation: { id: string; score: number } };
    expect(body.success).toBe(true);
    expect(body.evaluation.score).toBe(94);

    const row = db.prepare<{
      evaluation_type: string;
      rubric_version: string;
      score: number;
      signed_at: number;
    }>('SELECT evaluation_type, rubric_version, score, signed_at FROM teacher_evaluations WHERE id=?')
      .get(body.evaluation.id);

    expect(row).toBeDefined();
    expect(row?.evaluation_type).toBe('PHYSICAL_RUBRIC');
    expect(row?.rubric_version).toBe('E07-PHYSICAL-v1');
    expect(row?.score).toBe(94);
    expect(row?.signed_at).toBeGreaterThan(0);
  });

  it('rejects unauthorized teacher (Teacher B signing Student A) with 403', async () => {
    const res = await teacherEvaluationPost(request('/api/teacher/evaluations', teacherBToken, {
      studentId: 'student_a',
      attemptId: attemptE07AId,
      evaluationType: 'PHYSICAL_RUBRIC',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricItems: validRubricItems,
      comment: '跨班签署应该被拒绝',
    }));
    expect(res.status).toBe(403);
  });

  it('rejects attempt not belonging to student with 422 or 403', async () => {
    const res = await teacherEvaluationPost(request('/api/teacher/evaluations', teacherAToken, {
      studentId: 'student_a',
      attemptId: attemptE07BId, // belongs to student_b
      evaluationType: 'PHYSICAL_RUBRIC',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricItems: validRubricItems,
      comment: '试图用别人的记录',
    }));
    expect([403, 422]).toContain(res.status);
  });

  it('rejects non-E07 attempt for physical rubric with 422', async () => {
    const res = await teacherEvaluationPost(request('/api/teacher/evaluations', teacherAToken, {
      studentId: 'student_a',
      attemptId: attemptC01AId, // C01 level, not E07
      evaluationType: 'PHYSICAL_RUBRIC',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricItems: validRubricItems,
      comment: 'C01 没有实物焊接量规',
    }));
    expect(res.status).toBe(422);
  });

  it('rejects invalid item scores with 422', async () => {
    // solder_quality max is 30, sending 35
    const invalidItems = { ...validRubricItems, solder_quality: 35 };
    const res = await teacherEvaluationPost(request('/api/teacher/evaluations', teacherAToken, {
      studentId: 'student_a',
      attemptId: attemptE07AId,
      evaluationType: 'PHYSICAL_RUBRIC',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricItems: invalidItems,
      comment: '超出量规最高分',
    }));
    expect(res.status).toBe(422);

    // negative score
    const negItems = { ...validRubricItems, pre_power_check: -5 };
    const resNeg = await teacherEvaluationPost(request('/api/teacher/evaluations', teacherAToken, {
      studentId: 'student_a',
      attemptId: attemptE07AId,
      evaluationType: 'PHYSICAL_RUBRIC',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricItems: negItems,
      comment: '负数分',
    }));
    expect(resNeg.status).toBe(422);
  });

  it('rejects duplicate signature on same attempt with 409', async () => {
    const first = await teacherEvaluationPost(request('/api/teacher/evaluations', teacherAToken, {
      studentId: 'student_a',
      attemptId: attemptE07AId,
      evaluationType: 'PHYSICAL_RUBRIC',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricItems: validRubricItems,
      comment: '首次签署',
    }));
    expect(first.status).toBe(201);

    const second = await teacherEvaluationPost(request('/api/teacher/evaluations', teacherAToken, {
      studentId: 'student_a',
      attemptId: attemptE07AId,
      evaluationType: 'PHYSICAL_RUBRIC',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricItems: validRubricItems,
      comment: '重复签署',
    }));
    expect(second.status).toBe(409);
  });

  it('allows student to read own physical evaluation and blocks reading another student evaluation', async () => {
    // Sign student_a's attempt
    await teacherEvaluationPost(request('/api/teacher/evaluations', teacherAToken, {
      studentId: 'student_a',
      attemptId: attemptE07AId,
      evaluationType: 'PHYSICAL_RUBRIC',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricItems: validRubricItems,
      comment: '实物焊接达标',
    }));

    // Student A reads own evaluation
    const resA = await studentEvaluationGet(request(`/api/learning/evaluations?attemptId=${attemptE07AId}`, studentAToken));
    expect(resA.status).toBe(200);
    const bodyA = await resA.json() as {
      success: boolean;
      evaluation: {
        score: number;
        evaluationType: string;
        rubricVersion: string;
        rubricData: typeof validRubricItems;
        teacherName: string;
      };
    };
    expect(bodyA.success).toBe(true);
    expect(bodyA.evaluation.score).toBe(94);
    expect(bodyA.evaluation.evaluationType).toBe('PHYSICAL_RUBRIC');
    expect(bodyA.evaluation.rubricData.solder_quality).toBe(28);

    // Student B attempts to read Student A's evaluation -> 403 or 404
    const resB = await studentEvaluationGet(request(`/api/learning/evaluations?attemptId=${attemptE07AId}`, studentBToken));
    expect([403, 404]).toContain(resB.status);
  });
});
