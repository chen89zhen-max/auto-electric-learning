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
  | 'DUPLICATE_RETRAINING_REQUEST';

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

export function createTeacherEvaluation(
  params: { teacherId: string; studentId: string; attemptId?: string; score?: number; comment: string },
  db: AppDatabase = getDatabase()
): { id: string; createdAt: number } {
  requireAuthorizedStudent(params.teacherId, params.studentId, db);
  const comment = params.comment.trim();
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
        (id,teacher_id,student_id,attempt_id,score,comment,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?)`
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
  return { id, createdAt: now };
}

export function listTeacherEvaluations(
  teacherId: string,
  studentId: string,
  db: AppDatabase = getDatabase()
): unknown[] {
  requireAuthorizedStudent(teacherId, studentId, db);
  return db.prepare(
    `SELECT id,student_id studentId,attempt_id attemptId,score,comment,created_at createdAt,updated_at updatedAt
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
