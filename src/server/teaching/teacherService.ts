import { createBaseUserProgress, type UserProgressData } from '@/src/types/progress';
import { recordAuditStrict } from '../auth/audit';
import { generateSecureToken } from '../auth/crypto';
import {
  getAuthorizedStudents,
  getTeacherAssignedClasses,
  isTeacherAuthorizedForStudent,
  type ClassRecord,
} from '../db/classService';
import { getDatabase, type AppDatabase } from '../db/database';

export type TeacherServiceErrorCode =
  | 'FORBIDDEN_STUDENT'
  | 'FORBIDDEN_CLASS'
  | 'INVALID_EVALUATION'
  | 'INVALID_RETRAINING_REASON'
  | 'INVALID_ATTEMPT'
  | 'DUPLICATE_RETRAINING_REQUEST'
  | 'DUPLICATE_PHYSICAL_RUBRIC'
  | 'DUPLICATE_EVALUATION';

export const E07_PHYSICAL_RUBRIC_VERSION = 'E07-PHYSICAL-v1';

export const E07_PHYSICAL_RUBRIC_MAX_SCORES = {
  pre_power_check: 20,
  component_orientation: 20,
  solder_quality: 30,
  safety_process: 20,
  evidence_explanation: 10,
} as const;

export type E07PhysicalRubricKey = keyof typeof E07_PHYSICAL_RUBRIC_MAX_SCORES;

export class TeacherServiceError extends Error {
  constructor(public readonly code: TeacherServiceErrorCode, message: string) {
    super(message);
    this.name = 'TeacherServiceError';
  }
}

export interface TeacherStudentEvidence {
  id: string;
  username: string;
  realName: string;
  classId: string;
  className: string;
  progress: UserProgressData;
  completedLevels: number;
  lastUpdated: number;
}

export function listTeacherClasses(teacherId: string, db: AppDatabase = getDatabase()): ClassRecord[] {
  return getTeacherAssignedClasses(teacherId, db);
}

export function listTeacherStudents(
  teacherId: string,
  classId?: string | null,
  db: AppDatabase = getDatabase()
): TeacherStudentEvidence[] {
  let rows;
  try {
    rows = getAuthorizedStudents({ callerRole: 'teacher', callerId: teacherId, classIdFilter: classId }, db);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('FORBIDDEN_CLASS')) {
      throw new TeacherServiceError('FORBIDDEN_CLASS', '教师无权访问该班级');
    }
    throw error;
  }
  return rows.map((row) => {
    let progress = createBaseUserProgress(row.realName);
    if (row.progressData) {
      try { progress = JSON.parse(row.progressData) as UserProgressData; } catch {}
    }
    return {
      id: row.id,
      username: row.username,
      realName: row.realName,
      classId: row.classId,
      className: row.className,
      progress,
      completedLevels: Object.values(progress.levels).filter((level) => level.status === 'completed').length,
      lastUpdated: progress.lastUpdated || row.createdAt,
    };
  });
}

function requireAuthorizedStudent(teacherId: string, studentId: string, db: AppDatabase): void {
  if (!isTeacherAuthorizedForStudent(teacherId, studentId, db)) {
    throw new TeacherServiceError('FORBIDDEN_STUDENT', '教师只能操作当前任教班级的学生');
  }
}

function validateAttempt(studentId: string, attemptId: string | undefined, db: AppDatabase): string | null {
  if (!attemptId) return null;
  const attempt = db.prepare<{ student_id: string }>('SELECT student_id FROM learning_attempts WHERE id=?').get(attemptId);
  if (!attempt || attempt.student_id !== studentId) {
    throw new TeacherServiceError('INVALID_ATTEMPT', '实训记录与目标学生不匹配');
  }
  return attemptId;
}

export interface CreateEvaluationInput {
  teacherId: string;
  studentId: string;
  attemptId?: string;
  score?: number;
  comment?: string;
  evaluationType?: 'FORMATIVE' | 'PHYSICAL_RUBRIC';
  rubricVersion?: string;
  rubricItems?: Record<string, unknown>;
}

export function createTeacherEvaluation(
  params: CreateEvaluationInput,
  db: AppDatabase = getDatabase()
): { id: string; score: number; createdAt: number; signedAt?: number } {
  requireAuthorizedStudent(params.teacherId, params.studentId, db);
  const evaluationType = params.evaluationType || 'FORMATIVE';

  if (evaluationType === 'PHYSICAL_RUBRIC') {
    if (!params.attemptId) {
      throw new TeacherServiceError('INVALID_ATTEMPT', '物理实物量规评价必须关联实训记录');
    }
    const attempt = db.prepare<{ student_id: string; level_id: string }>(
      'SELECT student_id, level_id FROM learning_attempts WHERE id=?'
    ).get(params.attemptId);

    if (!attempt || attempt.student_id !== params.studentId) {
      throw new TeacherServiceError('INVALID_ATTEMPT', '实训记录与目标学生不匹配');
    }
    if (attempt.level_id !== 'E07') {
      throw new TeacherServiceError('INVALID_ATTEMPT', '仅 E07 关卡支持实物量规签署');
    }

    const duplicate = db.prepare<{ id: string }>(
      "SELECT id FROM teacher_evaluations WHERE attempt_id=? AND evaluation_type='PHYSICAL_RUBRIC'"
    ).get(params.attemptId);
    if (duplicate) {
      throw new TeacherServiceError('DUPLICATE_PHYSICAL_RUBRIC', '该实训记录已完成物理量规签署，不可重复提交');
    }

    if (params.rubricVersion !== E07_PHYSICAL_RUBRIC_VERSION) {
      throw new TeacherServiceError('INVALID_EVALUATION', `未知的量规版本: ${params.rubricVersion}`);
    }

    if (!params.rubricItems || typeof params.rubricItems !== 'object') {
      throw new TeacherServiceError('INVALID_EVALUATION', '缺少实物量规打分明细');
    }

    let totalScore = 0;
    const validatedRubricData: Record<string, number> = {};

    for (const [key, maxScore] of Object.entries(E07_PHYSICAL_RUBRIC_MAX_SCORES)) {
      const val = (params.rubricItems as Record<string, unknown>)[key];
      if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val > maxScore) {
        throw new TeacherServiceError('INVALID_EVALUATION', `量规项目 ${key} 得分必须为 0 到 ${maxScore} 的整数`);
      }
      validatedRubricData[key] = val;
      totalScore += val;
    }

    const comment = (params.comment ?? '').trim();
    if (comment.length > 1000) {
      throw new TeacherServiceError('INVALID_EVALUATION', '评语长度不能超过 1000 个字符');
    }

    const id = `eval_${generateSecureToken(10)}`;
    const now = Date.now();

    db.transaction(() => {
      db.prepare(
        `INSERT INTO teacher_evaluations
          (id, teacher_id, student_id, attempt_id, score, comment, evaluation_type, rubric_version, rubric_data, signed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        params.teacherId,
        params.studentId,
        params.attemptId,
        totalScore,
        comment,
        'PHYSICAL_RUBRIC',
        params.rubricVersion,
        JSON.stringify(validatedRubricData),
        now,
        now,
        now
      );

      recordAuditStrict({
        actorId: params.teacherId,
        action: 'TEACHER_PHYSICAL_RUBRIC_SIGNED',
        targetType: 'teacher_evaluation',
        targetId: id,
        result: 'SUCCESS',
        details: {
          studentId: params.studentId,
          attemptId: params.attemptId,
          rubricVersion: params.rubricVersion,
          score: totalScore,
        },
      }, db);
    });

    return { id, score: totalScore, createdAt: now, signedAt: now };
  }

  const comment = (params.comment ?? '').trim();
  if (!comment || comment.length > 1000
    || (params.score !== undefined && (!Number.isInteger(params.score) || params.score < 0 || params.score > 100))) {
    throw new TeacherServiceError('INVALID_EVALUATION', '评价内容或分数无效');
  }
  const attemptId = validateAttempt(params.studentId, params.attemptId, db);
  const id = `eval_${generateSecureToken(10)}`;
  const now = Date.now();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO teacher_evaluations
        (id,teacher_id,student_id,attempt_id,score,comment,evaluation_type,rubric_version,rubric_data,signed_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,'FORMATIVE',NULL,NULL,NULL,?,?)`
    ).run(id, params.teacherId, params.studentId, attemptId, params.score ?? null, comment, now, now);
    recordAuditStrict({
      actorId: params.teacherId,
      action: 'TEACHER_EVALUATION_CREATED',
      targetType: 'teacher_evaluation',
      targetId: id,
      result: 'SUCCESS',
      details: { studentId: params.studentId, attemptId },
    }, db);
  });
  return { id, score: params.score ?? 0, createdAt: now };
}

export function listStudentE07Attempts(
  teacherId: string,
  studentId: string,
  db: AppDatabase = getDatabase()
): Array<{
  attemptId: string;
  attemptScore: number | null;
  completedAt: number;
  hasPhysicalRubric: boolean;
  physicalEvaluation?: {
    id: string;
    teacherName: string;
    totalScore: number;
    signedAt: number;
    comment: string | null;
    rubricData: Record<string, number>;
  };
}> {
  requireAuthorizedStudent(teacherId, studentId, db);
  const rows = db.prepare<{
    attemptId: string;
    completedAt: number;
    attemptScore: number | null;
    evaluationId: string | null;
    totalScore: number | null;
    signedAt: number | null;
    comment: string | null;
    teacherName: string | null;
    teacherUsername: string | null;
    rubricDataStr: string | null;
  }>(
    `SELECT a.id AS attemptId, a.completed_at AS completedAt, a.score AS attemptScore,
            e.id AS evaluationId, e.score AS totalScore, e.signed_at AS signedAt,
            e.comment, e.rubric_data AS rubricDataStr,
            u.real_name AS teacherName, u.username AS teacherUsername
     FROM learning_attempts a
     LEFT JOIN teacher_evaluations e
       ON e.attempt_id = a.id AND e.evaluation_type = 'PHYSICAL_RUBRIC'
     LEFT JOIN users u ON u.id = e.teacher_id
     WHERE a.student_id = ? AND a.level_id = 'E07'
     ORDER BY a.started_at DESC`
  ).all(studentId);

  return rows.map((r) => {
    let rubricData: Record<string, number> = {};
    if (r.rubricDataStr) {
      try { rubricData = JSON.parse(r.rubricDataStr); } catch {}
    }
    const result: {
      attemptId: string;
      attemptScore: number | null;
      completedAt: number;
      hasPhysicalRubric: boolean;
      physicalEvaluation?: {
        id: string;
        teacherName: string;
        totalScore: number;
        signedAt: number;
        comment: string | null;
        rubricData: Record<string, number>;
      };
    } = {
      attemptId: r.attemptId,
      attemptScore: r.attemptScore,
      completedAt: r.completedAt,
      hasPhysicalRubric: Boolean(r.evaluationId),
    };
    if (r.evaluationId && r.totalScore !== null && r.signedAt !== null) {
      result.physicalEvaluation = {
        id: r.evaluationId,
        teacherName: r.teacherName || r.teacherUsername || '',
        totalScore: r.totalScore,
        signedAt: r.signedAt,
        comment: r.comment,
        rubricData,
      };
    }
    return result;
  });
}

export function getPhysicalEvaluationByAttempt(
  attemptId: string,
  db: AppDatabase = getDatabase()
): {
  id: string;
  studentId: string;
  attemptId: string;
  score: number;
  comment: string;
  evaluationType: string;
  rubricVersion: string;
  rubricData: Record<string, number>;
  teacherName: string;
  signedAt: number;
} | null {
  const row = db.prepare<{
    id: string;
    student_id: string;
    attempt_id: string;
    score: number;
    comment: string;
    evaluation_type: string;
    rubric_version: string | null;
    rubric_data: string | null;
    signed_at: number | null;
    teacher_name: string | null;
    teacher_username: string;
  }>(
    `SELECT e.id, e.student_id, e.attempt_id, e.score, e.comment, e.evaluation_type,
            e.rubric_version, e.rubric_data, e.signed_at,
            u.real_name AS teacher_name, u.username AS teacher_username
     FROM teacher_evaluations e
     JOIN users u ON e.teacher_id = u.id
     WHERE e.attempt_id = ? AND e.evaluation_type = 'PHYSICAL_RUBRIC'
     ORDER BY e.created_at DESC
     LIMIT 1`
  ).get(attemptId);

  if (!row) return null;

  let rubricData: Record<string, number> = {};
  if (row.rubric_data) {
    try { rubricData = JSON.parse(row.rubric_data); } catch {}
  }

  return {
    id: row.id,
    studentId: row.student_id,
    attemptId: row.attempt_id,
    score: row.score,
    comment: row.comment,
    evaluationType: row.evaluation_type,
    rubricVersion: row.rubric_version || '',
    rubricData,
    teacherName: row.teacher_name || row.teacher_username,
    signedAt: row.signed_at || 0,
  };
}

export function listTeacherEvaluations(
  teacherId: string,
  studentId: string,
  db: AppDatabase = getDatabase()
): unknown[] {
  requireAuthorizedStudent(teacherId, studentId, db);
  return db.prepare(
    `SELECT id,student_id studentId,attempt_id attemptId,score,comment,evaluation_type evaluationType,rubric_version rubricVersion,signed_at signedAt,created_at createdAt,updated_at updatedAt
     FROM teacher_evaluations WHERE teacher_id=? AND student_id=? ORDER BY created_at DESC`
  ).all(teacherId, studentId);
}

export function requestStudentRetraining(
  params: { teacherId: string; studentId: string; attemptId?: string; reason: string },
  db: AppDatabase = getDatabase()
): { id: string; status: 'requested'; createdAt: number } {
  requireAuthorizedStudent(params.teacherId, params.studentId, db);
  const reason = params.reason.trim();
  if (reason.length < 5 || reason.length > 500) {
    throw new TeacherServiceError('INVALID_RETRAINING_REASON', '重训原因须为5至500个字符');
  }
  const attemptId = validateAttempt(params.studentId, params.attemptId, db);
  const duplicate = db.prepare(
    `SELECT id FROM progress_corrections
     WHERE student_id=? AND ifnull(attempt_id,'')=ifnull(?,'') AND status='requested'`
  ).get(params.studentId, attemptId);
  if (duplicate) {
    throw new TeacherServiceError('DUPLICATE_RETRAINING_REQUEST', '该学生已有待处理的同类重训申请');
  }
  const id = `cor_${generateSecureToken(10)}`;
  const now = Date.now();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO progress_corrections
        (id,student_id,attempt_id,requested_by,reason,status,decided_by,created_at,decided_at)
       VALUES (?,?,?,?,?,'requested',NULL,?,NULL)`
    ).run(id, params.studentId, attemptId, params.teacherId, reason, now);
    recordAuditStrict({
      actorId: params.teacherId,
      action: 'RETRAINING_REQUESTED',
      targetType: 'progress_correction',
      targetId: id,
      result: 'SUCCESS',
      details: { studentId: params.studentId, attemptId, reason },
    }, db);
  });
  return { id, status: 'requested', createdAt: now };
}
