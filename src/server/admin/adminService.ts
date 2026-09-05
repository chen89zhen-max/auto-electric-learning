import { generateSecureToken, generateTempPassword, hashPassword } from '../auth/crypto';
import { recordAuditStrict } from '../auth/audit';
import { revokeAllUserSessions } from '../auth/session';
import { getDatabase, type AppDatabase } from '../db/database';
import { getClassById, SUPPORTED_SCHOOL_ID } from '../db/classService';

export type AdminServiceErrorCode =
  | 'INVALID_INPUT'
  | 'USERNAME_CONFLICT'
  | 'USER_NOT_FOUND'
  | 'INVALID_STATUS_TRANSITION'
  | 'LAST_ACTIVE_ADMIN'
  | 'CLASS_NOT_FOUND'
  | 'CLASS_HAS_ACTIVE_RELATIONS';

export class AdminServiceError extends Error {
  constructor(public readonly code: AdminServiceErrorCode, message: string) {
    super(message);
    this.name = 'AdminServiceError';
  }
}

export interface ManagedUser {
  id: string;
  username: string;
  realName: string;
  role: 'student' | 'teacher' | 'admin';
  className: string;
  status: string;
  mustChangePassword: boolean;
  createdAt: number;
  updatedAt: number;
}

interface DbManagedUser {
  id: string;
  username: string;
  real_name: string;
  role: 'student' | 'teacher' | 'admin';
  class_name: string;
  status: string;
  must_change_password: number;
  created_at: number;
  updated_at: number;
}

function mapUser(row: DbManagedUser): ManagedUser {
  return {
    id: row.id,
    username: row.username,
    realName: row.real_name,
    role: row.role,
    className: row.class_name,
    status: row.status,
    mustChangePassword: row.must_change_password === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireManagedUser(userId: string, db: AppDatabase): DbManagedUser {
  const row = db.prepare<DbManagedUser>('SELECT * FROM users WHERE id=?').get(userId);
  if (!row) throw new AdminServiceError('USER_NOT_FOUND', '账号不存在');
  return row;
}

export function listManagedUsers(
  filters: { role?: string | null; status?: string | null } = {},
  db: AppDatabase = getDatabase()
): ManagedUser[] {
  const conditions = ["status != 'deleted'"];
  const params: unknown[] = [];
  if (filters.role) {
    conditions.push('role=?');
    params.push(filters.role);
  }
  if (filters.status) {
    conditions.push('status=?');
    params.push(filters.status);
  }
  return db.prepare<DbManagedUser>(
    `SELECT * FROM users WHERE ${conditions.join(' AND ')} ORDER BY role,username`
  ).all(...params).map(mapUser);
}

export function createManagedUser(
  params: {
    username: string;
    realName: string;
    role: 'student' | 'teacher' | 'admin';
    classId?: string;
    actorId: string;
  },
  db: AppDatabase = getDatabase()
): { user: ManagedUser; temporaryPassword?: string; activationCode?: string } {
  const username = params.username.trim().toLowerCase();
  const realName = params.realName.trim();
  if (!/^[a-z0-9_.-]{3,64}$/.test(username) || !realName) {
    throw new AdminServiceError('INVALID_INPUT', '账号格式或姓名无效');
  }
  if (!['student', 'teacher', 'admin'].includes(params.role)) {
    throw new AdminServiceError('INVALID_INPUT', '账号角色无效');
  }
  if (db.prepare('SELECT id FROM users WHERE username=? COLLATE NOCASE').get(username)) {
    throw new AdminServiceError('USERNAME_CONFLICT', '账号已存在');
  }

  const targetClass = params.role === 'student' && params.classId
    ? getClassById(params.classId, db)
    : null;
  if (params.role === 'student') {
    if (!targetClass || targetClass.status !== 'active' || targetClass.schoolId !== SUPPORTED_SCHOOL_ID) {
      throw new AdminServiceError('INVALID_INPUT', '学生必须预先归入本校启用班级');
    }
  }

  const id = `usr_${generateSecureToken(10)}`;
  const now = Date.now();
  const temporaryPassword = params.role === 'student' ? undefined : generateTempPassword(12);
  const activationCode = params.role === 'student' ? generateTempPassword(12) : undefined;
  const placeholderSecret = temporaryPassword || generateSecureToken(32);
  const status = params.role === 'student' ? 'pending_activation' : 'active';
  const mustChangePassword = params.role === 'student' ? 0 : 1;
  const className = targetClass?.name || '';

  db.transaction(() => {
    db.prepare(
      `INSERT INTO users
        (id,username,password_hash,real_name,role,class_name,status,must_change_password,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(
      id,
      username,
      hashPassword(placeholderSecret),
      realName,
      params.role,
      className,
      status,
      mustChangePassword,
      now,
      now
    );

    if (params.role === 'student' && targetClass && activationCode) {
      db.prepare(
        `INSERT INTO student_class (id,student_id,class_id,valid_from,valid_to,is_current,created_at)
         VALUES (?,?,?,?,NULL,1,?)`
      ).run(`sc_${generateSecureToken(8)}`, id, targetClass.id, now, now);
      db.prepare(
        `INSERT INTO student_activations (id,student_id,code_hash,expires_at,used_at,created_by,created_at)
         VALUES (?,?,?,?,NULL,?,?)`
      ).run(
        `act_${generateSecureToken(8)}`,
        id,
        hashPassword(activationCode),
        now + 7 * 24 * 60 * 60 * 1000,
        params.actorId,
        now
      );
    }

    recordAuditStrict({
      actorId: params.actorId,
      action: 'USER_CREATED',
      targetType: 'user',
      targetId: id,
      result: 'SUCCESS',
      details: { username, role: params.role, classId: targetClass?.id || null },
    }, db);
  });

  return {
    user: mapUser({
      id,
      username,
      real_name: realName,
      role: params.role,
      class_name: className,
      status,
      must_change_password: mustChangePassword,
      created_at: now,
      updated_at: now,
    }),
    temporaryPassword,
    activationCode,
  };
}

const ALLOWED_STATUS_TRANSITIONS: Record<string, Set<string>> = {
  pending_activation: new Set(['suspended', 'deleted']),
  active: new Set(['suspended', 'locked', 'deleted']),
  suspended: new Set(['active', 'deleted']),
  locked: new Set(['active', 'suspended', 'deleted']),
};

function protectLastAdmin(user: DbManagedUser, nextStatus: string, db: AppDatabase): void {
  if (user.role !== 'admin' || user.status !== 'active' || nextStatus === 'active') return;
  const activeAdmins = db.prepare<{ count: number }>(
    "SELECT COUNT(*) count FROM users WHERE role='admin' AND status='active'"
  ).get()?.count ?? 0;
  if (activeAdmins <= 1) {
    throw new AdminServiceError('LAST_ACTIVE_ADMIN', '不能停用或删除最后一个启用的系统管理员');
  }
}

export function changeManagedUserStatus(
  params: { userId: string; status: string; actorId: string },
  db: AppDatabase = getDatabase()
): ManagedUser {
  const user = requireManagedUser(params.userId, db);
  if (user.status === params.status) return mapUser(user);
  if (!ALLOWED_STATUS_TRANSITIONS[user.status]?.has(params.status)) {
    throw new AdminServiceError('INVALID_STATUS_TRANSITION', `不允许从 ${user.status} 变更为 ${params.status}`);
  }
  protectLastAdmin(user, params.status, db);
  const now = Date.now();
  db.transaction(() => {
    db.prepare('UPDATE users SET status=?,updated_at=? WHERE id=?')
      .run(params.status, now, user.id);
    if (params.status !== 'active') revokeAllUserSessions(user.id, db);
    recordAuditStrict({
      actorId: params.actorId,
      action: 'USER_STATUS_CHANGED',
      targetType: 'user',
      targetId: user.id,
      result: 'SUCCESS',
      details: { previousStatus: user.status, status: params.status },
    }, db);
  });
  return mapUser({ ...user, status: params.status, updated_at: now });
}

export function updateManagedUserProfile(
  params: { userId: string; realName: string; actorId: string },
  db: AppDatabase = getDatabase()
): ManagedUser {
  const user = requireManagedUser(params.userId, db);
  const realName = params.realName.trim();
  if (!realName || realName.length > 80) {
    throw new AdminServiceError('INVALID_INPUT', '姓名不能为空且不能超过80个字符');
  }
  const now = Date.now();
  db.transaction(() => {
    db.prepare('UPDATE users SET real_name=?,updated_at=? WHERE id=?').run(realName, now, user.id);
    recordAuditStrict({
      actorId: params.actorId,
      action: 'USER_PROFILE_UPDATED',
      targetType: 'user',
      targetId: user.id,
      result: 'SUCCESS',
      details: { previousRealName: user.real_name, realName },
    }, db);
  });
  return mapUser({ ...user, real_name: realName, updated_at: now });
}

export function resetManagedUserPassword(
  params: { userId: string; actorId: string },
  db: AppDatabase = getDatabase()
): { temporaryPassword?: string; activationCode?: string } {
  const user = requireManagedUser(params.userId, db);
  if (user.status === 'deleted') throw new AdminServiceError('INVALID_STATUS_TRANSITION', '已删除账号不能重置密码');
  if (user.role === 'student' && user.status === 'pending_activation') {
    const activationCode = generateTempPassword(12);
    const now = Date.now();
    db.transaction(() => {
      db.prepare(
        'UPDATE student_activations SET expires_at=? WHERE student_id=? AND used_at IS NULL AND expires_at>?'
      ).run(now, user.id, now);
      db.prepare(
        `INSERT INTO student_activations (id,student_id,code_hash,expires_at,used_at,created_by,created_at)
         VALUES (?,?,?,?,NULL,?,?)`
      ).run(
        `act_${generateSecureToken(8)}`,
        user.id,
        hashPassword(activationCode),
        now + 7 * 24 * 60 * 60 * 1000,
        params.actorId,
        now
      );
      recordAuditStrict({
        actorId: params.actorId,
        action: 'ADMIN_REISSUE_ACTIVATION',
        targetType: 'user',
        targetId: user.id,
        result: 'SUCCESS',
      }, db);
    });
    return { activationCode };
  }
  const temporaryPassword = generateTempPassword(12);
  const now = Date.now();
  db.transaction(() => {
    db.prepare('UPDATE users SET password_hash=?,must_change_password=1,updated_at=? WHERE id=?')
      .run(hashPassword(temporaryPassword), now, user.id);
    revokeAllUserSessions(user.id, db);
    recordAuditStrict({
      actorId: params.actorId,
      action: 'ADMIN_RESET_PASSWORD',
      targetType: 'user',
      targetId: user.id,
      result: 'SUCCESS',
    }, db);
  });
  return { temporaryPassword };
}

export function changeClassStatus(
  params: { classId: string; status: 'active' | 'archived' | 'deleted'; actorId: string },
  db: AppDatabase = getDatabase()
): void {
  const target = getClassById(params.classId, db);
  if (!target) throw new AdminServiceError('CLASS_NOT_FOUND', '班级不存在');
  if (target.status === params.status) return;
  const valid = (target.status === 'active' && params.status === 'archived')
    || (target.status === 'archived' && ['active', 'deleted'].includes(params.status));
  if (!valid) throw new AdminServiceError('INVALID_STATUS_TRANSITION', '班级状态转换无效');
  if (params.status !== 'active') {
    const activeRelations = db.prepare<{ count: number }>(
      `SELECT
        (SELECT COUNT(*) FROM student_class WHERE class_id=? AND is_current=1) +
        (SELECT COUNT(*) FROM teacher_class WHERE class_id=? AND status='active') count`
    ).get(target.id, target.id)?.count ?? 0;
    if (activeRelations > 0) {
      throw new AdminServiceError('CLASS_HAS_ACTIVE_RELATIONS', '班级仍有当前学生或有效任教关系');
    }
  }
  const now = Date.now();
  db.transaction(() => {
    db.prepare('UPDATE classes SET status=?,updated_at=? WHERE id=?')
      .run(params.status, now, target.id);
    recordAuditStrict({
      actorId: params.actorId,
      action: 'CLASS_STATUS_CHANGED',
      targetType: 'class',
      targetId: target.id,
      result: 'SUCCESS',
      details: { previousStatus: target.status, status: params.status },
    }, db);
  });
}

export function updateClassDetails(
  params: { classId: string; name: string; grade: string; cohortYear: number; actorId: string },
  db: AppDatabase = getDatabase()
): void {
  const target = getClassById(params.classId, db);
  if (!target) throw new AdminServiceError('CLASS_NOT_FOUND', '班级不存在');
  const name = params.name.trim();
  const grade = params.grade.trim();
  if (!name || !grade || !Number.isInteger(params.cohortYear)
    || params.cohortYear < 2000 || params.cohortYear > 2100) {
    throw new AdminServiceError('INVALID_INPUT', '班级名称、年级或入学年份无效');
  }
  const now = Date.now();
  db.transaction(() => {
    db.prepare('UPDATE classes SET name=?,grade=?,cohort_year=?,updated_at=? WHERE id=?')
      .run(name, grade, params.cohortYear, now, target.id);
    db.prepare(
      `UPDATE users SET class_name=?,updated_at=?
       WHERE id IN (SELECT student_id FROM student_class WHERE class_id=? AND is_current=1)`
    ).run(name, now, target.id);
    recordAuditStrict({
      actorId: params.actorId,
      action: 'CLASS_DETAILS_UPDATED',
      targetType: 'class',
      targetId: target.id,
      result: 'SUCCESS',
      details: { name, grade, cohortYear: params.cohortYear },
    }, db);
  });
}
