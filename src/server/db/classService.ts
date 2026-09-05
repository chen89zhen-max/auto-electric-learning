import { getDatabase, type AppDatabase } from './database';
import { generateSecureToken } from '../auth/crypto';
import { recordAuditStrict } from '../auth/audit';

export const SUPPORTED_SCHOOL_ID = 'default_school';
export const SUPPORTED_COURSE_ID = 'auto_elec_base';

export type OrganizationRuleErrorCode =
  | 'EMPTY_CLASS_NAME'
  | 'USER_NOT_FOUND'
  | 'INVALID_STUDENT_ROLE'
  | 'INVALID_TEACHER_ROLE'
  | 'ACCOUNT_NOT_ACTIVE'
  | 'CLASS_NOT_FOUND'
  | 'CLASS_NOT_ACTIVE'
  | 'SCHOOL_SCOPE_VIOLATION'
  | 'COURSE_SCOPE_VIOLATION'
  | 'DUPLICATE_TEACHER_ASSIGNMENT'
  | 'TEACHER_ASSIGNMENT_NOT_FOUND'
  | 'STUDENT_NOT_ASSIGNED';

export class OrganizationRuleError extends Error {
  constructor(public readonly code: OrganizationRuleErrorCode, message: string) {
    super(message);
    this.name = 'OrganizationRuleError';
  }
}

export interface ClassRecord {
  id: string;
  schoolId: string;
  name: string;
  grade: string;
  cohortYear: number;
  status: 'active' | 'archived' | 'deleted';
  createdAt: number;
  updatedAt: number;
}

export interface ClassWithStats extends ClassRecord {
  studentCount: number;
  teachers: Array<{ id: string; username: string; realName: string }>;
}

export interface TeacherClassRecord {
  id: string;
  teacherId: string;
  classId: string;
  courseId: string;
  validFrom: number;
  validTo: number | null;
  status: 'active' | 'revoked';
  createdAt: number;
}

export interface StudentClassRecord {
  id: string;
  studentId: string;
  classId: string;
  validFrom: number;
  validTo: number | null;
  isCurrent: boolean;
  createdAt: number;
}

export interface StudentWithClassRow {
  id: string;
  username: string;
  realName: string;
  className: string;
  classId: string;
  role: string;
  status: string;
  createdAt: number;
  progressData?: string;
}

interface DbClassRow {
  id: string;
  school_id: string;
  name: string;
  grade: string;
  cohort_year: number;
  status: 'active' | 'archived' | 'deleted';
  created_at: number;
  updated_at: number;
}

interface DbUserScopeRow {
  id: string;
  role: 'student' | 'teacher' | 'admin';
  status: string;
}

interface DbStudentClassRow {
  id: string;
  student_id: string;
  class_id: string;
  valid_from: number;
  valid_to: number | null;
  is_current: number;
  created_at: number;
}

function requireUserForNewRelation(
  userId: string,
  expectedRole: 'student' | 'teacher',
  db: AppDatabase
): DbUserScopeRow {
  const user = db.prepare<DbUserScopeRow>('SELECT id,role,status FROM users WHERE id=?').get(userId);
  if (!user) {
    throw new OrganizationRuleError('USER_NOT_FOUND', `账号 ${userId} 不存在`);
  }
  if (user.role !== expectedRole) {
    const code = expectedRole === 'student' ? 'INVALID_STUDENT_ROLE' : 'INVALID_TEACHER_ROLE';
    throw new OrganizationRuleError(code, `账号 ${userId} 不是${expectedRole === 'student' ? '学生' : '教师'}账号`);
  }
  const canCreateRelation = expectedRole === 'student'
    ? user.status === 'active' || user.status === 'pending_activation'
    : user.status === 'active';
  if (!canCreateRelation) {
    throw new OrganizationRuleError('ACCOUNT_NOT_ACTIVE', `账号 ${userId} 当前不可建立教学关系`);
  }
  return user;
}

function requireClassForNewRelation(classId: string, db: AppDatabase): ClassRecord {
  const targetClass = getClassById(classId, db);
  if (!targetClass) {
    throw new OrganizationRuleError('CLASS_NOT_FOUND', `班级 ${classId} 不存在`);
  }
  if (targetClass.status !== 'active') {
    throw new OrganizationRuleError('CLASS_NOT_ACTIVE', `班级 ${classId} 当前不可建立教学关系`);
  }
  if (targetClass.schoolId !== SUPPORTED_SCHOOL_ID) {
    throw new OrganizationRuleError('SCHOOL_SCOPE_VIOLATION', '不能跨学校建立教学关系');
  }
  return targetClass;
}

function mapDbStudentClass(row: DbStudentClassRow): StudentClassRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    isCurrent: row.is_current === 1,
    createdAt: row.created_at,
  };
}

function mapDbClass(row: DbClassRow): ClassRecord {
  return {
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    grade: row.grade,
    cohortYear: row.cohort_year,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Creates a new teaching class.
 */
export function createClass(
  params: {
    name: string;
    grade?: string;
    cohortYear?: number;
    schoolId?: string;
    actorId?: string;
  },
  db: AppDatabase = getDatabase()
): ClassRecord {
  const cleanName = params.name.trim();
  if (!cleanName) {
    throw new OrganizationRuleError('EMPTY_CLASS_NAME', '班级名称不能为空');
  }
  const id = `cls_${generateSecureToken(8)}`;
  const schoolId = params.schoolId || SUPPORTED_SCHOOL_ID;
  if (schoolId !== SUPPORTED_SCHOOL_ID) {
    throw new OrganizationRuleError('SCHOOL_SCOPE_VIOLATION', '当前部署只允许管理本校班级');
  }
  const grade = params.grade || '2024级';
  const cohortYear = params.cohortYear || 2024;
  const now = Date.now();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO classes (id, school_id, name, grade, cohort_year, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
    ).run(id, schoolId, cleanName, grade, cohortYear, now, now);

    if (params.actorId) {
      recordAuditStrict({
        actorId: params.actorId,
        action: 'CLASS_CREATED',
        targetType: 'class',
        targetId: id,
        result: 'SUCCESS',
        details: { name: cleanName, grade, schoolId },
      }, db);
    }
  });

  return {
    id,
    schoolId,
    name: cleanName,
    grade,
    cohortYear,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Retrieves a class by ID.
 */
export function getClassById(classId: string, db: AppDatabase = getDatabase()): ClassRecord | null {
  const row = db.prepare<DbClassRow>('SELECT * FROM classes WHERE id = ?').get(classId);
  return row ? mapDbClass(row) : null;
}

/**
 * Retrieves a class by name (case-insensitive).
 */
export function getClassByName(name: string, db: AppDatabase = getDatabase()): ClassRecord | null {
  const row = db.prepare<DbClassRow>('SELECT * FROM classes WHERE name = ? COLLATE NOCASE').get(name.trim());
  return row ? mapDbClass(row) : null;
}

/**
 * Lists all classes with stats (student count and assigned teachers).
 */
export function listAllClasses(db: AppDatabase = getDatabase()): ClassWithStats[] {
  const classes = db.prepare<DbClassRow>(
    "SELECT * FROM classes WHERE status != 'deleted' ORDER BY created_at ASC"
  ).all();

  return classes.map((c) => {
    const classRec = mapDbClass(c);

    // Count current students
    const countRow = db.prepare<{ count: number }>(
      'SELECT COUNT(*) as count FROM student_class WHERE class_id = ? AND is_current = 1'
    ).get(c.id);

    // Get active teachers
    const teachers = db.prepare<{ id: string; username: string; real_name: string }>(
      `SELECT u.id, u.username, u.real_name
       FROM teacher_class tc
       INNER JOIN users u ON tc.teacher_id = u.id
       WHERE tc.class_id = ? AND tc.status = 'active'
         AND (tc.valid_to IS NULL OR tc.valid_to > ?)`
    ).all(c.id, Date.now()).map((t) => ({ id: t.id, username: t.username, realName: t.real_name }));

    return {
      ...classRec,
      studentCount: countRow?.count || 0,
      teachers,
    };
  });
}

/**
 * Assigns a teacher to a class (supports co-teaching with multiple teachers per class).
 */
export function assignTeacherToClass(
  params: {
    teacherId: string;
    classId: string;
    courseId?: string;
    actorId?: string;
  },
  db: AppDatabase = getDatabase()
): TeacherClassRecord {
  const courseId = params.courseId || SUPPORTED_COURSE_ID;
  if (courseId !== SUPPORTED_COURSE_ID) {
    throw new OrganizationRuleError('COURSE_SCOPE_VIOLATION', '当前部署不支持该课程范围');
  }
  requireUserForNewRelation(params.teacherId, 'teacher', db);
  requireClassForNewRelation(params.classId, db);
  const duplicate = db.prepare<{ id: string }>(
    `SELECT id FROM teacher_class
     WHERE teacher_id=? AND class_id=? AND course_id=? AND status='active'`
  ).get(params.teacherId, params.classId, courseId);
  if (duplicate) {
    throw new OrganizationRuleError('DUPLICATE_TEACHER_ASSIGNMENT', '该教师已在此班承担该课程');
  }
  const now = Date.now();
  const id = `tc_${generateSecureToken(8)}`;

  db.transaction(() => {
    db.prepare(
      `INSERT INTO teacher_class (id, teacher_id, class_id, course_id, valid_from, valid_to, status, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, 'active', ?)`
    ).run(id, params.teacherId, params.classId, courseId, now, now);
    if (params.actorId) {
      recordAuditStrict({
        actorId: params.actorId,
        action: 'TEACHER_ASSIGNED_TO_CLASS',
        targetType: 'teacher_class',
        targetId: id,
        result: 'SUCCESS',
        details: { teacherId: params.teacherId, classId: params.classId, courseId },
      }, db);
    }
  });

  return {
    id,
    teacherId: params.teacherId,
    classId: params.classId,
    courseId,
    validFrom: now,
    validTo: null,
    status: 'active',
    createdAt: now,
  };
}

/**
 * Revokes a teacher's assignment to a class without affecting other co-teachers.
 */
export function revokeTeacherFromClass(
  teacherId: string,
  classId: string,
  actorId?: string,
  db: AppDatabase = getDatabase()
): void {
  const teacher = db.prepare<DbUserScopeRow>('SELECT id,role,status FROM users WHERE id=?').get(teacherId);
  if (!teacher) {
    throw new OrganizationRuleError('USER_NOT_FOUND', `账号 ${teacherId} 不存在`);
  }
  if (teacher.role !== 'teacher') {
    throw new OrganizationRuleError('INVALID_TEACHER_ROLE', `账号 ${teacherId} 不是教师账号`);
  }
  const targetClass = getClassById(classId, db);
  if (!targetClass) {
    throw new OrganizationRuleError('CLASS_NOT_FOUND', `班级 ${classId} 不存在`);
  }
  if (targetClass.schoolId !== SUPPORTED_SCHOOL_ID) {
    throw new OrganizationRuleError('SCHOOL_SCOPE_VIOLATION', '不能跨学校撤销教学关系');
  }
  const now = Date.now();
  const active = db.prepare<{ count: number }>(
    `SELECT COUNT(*) count FROM teacher_class
     WHERE teacher_id=? AND class_id=? AND status='active'`
  ).get(teacherId, classId)?.count ?? 0;
  if (active === 0) {
    throw new OrganizationRuleError('TEACHER_ASSIGNMENT_NOT_FOUND', '未找到可撤销的有效任教关系');
  }

  db.transaction(() => {
    db.prepare(
      `UPDATE teacher_class
       SET status = 'revoked', valid_to = ?
       WHERE teacher_id = ? AND class_id = ? AND status = 'active'`
    ).run(now, teacherId, classId);

    if (actorId) {
      recordAuditStrict({
        actorId,
        action: 'TEACHER_REVOKED_FROM_CLASS',
        targetType: 'teacher_class',
        targetId: `${teacherId}:${classId}`,
        result: 'SUCCESS',
        details: { teacherId, classId },
      }, db);
    }
  });
}

/**
 * Gets all classes assigned to a specific teacher.
 */
export function getTeacherAssignedClasses(
  teacherId: string,
  db: AppDatabase = getDatabase()
): ClassRecord[] {
  const now = Date.now();
  const rows = db.prepare<DbClassRow>(
    `SELECT c.*
     FROM teacher_class tc
     INNER JOIN classes c ON tc.class_id = c.id
     WHERE tc.teacher_id = ? AND tc.status = 'active'
       AND (tc.valid_to IS NULL OR tc.valid_to > ?)
       AND c.status = 'active'
     ORDER BY c.name ASC`
  ).all(teacherId, now);

  return rows.map(mapDbClass);
}

/**
 * Gets IDs of classes assigned to a teacher.
 */
export function getTeacherAssignedClassIds(
  teacherId: string,
  db: AppDatabase = getDatabase()
): string[] {
  const classes = getTeacherAssignedClasses(teacherId, db);
  return classes.map((c) => c.id);
}

/**
 * Checks if a teacher is authorized to teach and view a specific class.
 */
export function isTeacherAuthorizedForClass(
  teacherId: string,
  classId: string,
  db: AppDatabase = getDatabase()
): boolean {
  const now = Date.now();
  const row = db.prepare<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM teacher_class
     WHERE teacher_id = ? AND class_id = ? AND status = 'active'
       AND (valid_to IS NULL OR valid_to > ?)`
  ).get(teacherId, classId, now);

  return (row?.count || 0) > 0;
}

/**
 * Real-time derived authorization: Checks whether teacher T is authorized to view student S.
 * Derived dynamically via teacher_class + student_class (student must currently belong to teacher's class).
 */
export function isTeacherAuthorizedForStudent(
  teacherId: string,
  studentId: string,
  db: AppDatabase = getDatabase()
): boolean {
  const now = Date.now();
  const row = db.prepare<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM teacher_class tc
     INNER JOIN student_class sc ON tc.class_id = sc.class_id
     WHERE tc.teacher_id = ? AND sc.student_id = ?
       AND tc.status = 'active' AND (tc.valid_to IS NULL OR tc.valid_to > ?)
       AND sc.is_current = 1 AND (sc.valid_to IS NULL OR sc.valid_to > ?)`
  ).get(teacherId, studentId, now, now);

  return (row?.count || 0) > 0;
}

/**
 * Enrolls a student into a class, marking previous class as historical.
 */
export function assignStudentToClass(
  studentId: string,
  classId: string,
  actorId?: string,
  db: AppDatabase = getDatabase()
): StudentClassRecord {
  requireUserForNewRelation(studentId, 'student', db);
  const classObj = requireClassForNewRelation(classId, db);
  const existing = db.prepare<DbStudentClassRow>(
    'SELECT * FROM student_class WHERE student_id=? AND is_current=1'
  ).get(studentId);
  if (existing?.class_id === classId) {
    return mapDbStudentClass(existing);
  }

  const now = Date.now();
  const id = `sc_${generateSecureToken(8)}`;

  db.transaction(() => {
    db.prepare(
      `UPDATE student_class
       SET is_current = 0, valid_to = ?
       WHERE student_id = ? AND is_current = 1`
    ).run(now, studentId);

    db.prepare(
      `INSERT INTO student_class (id, student_id, class_id, valid_from, valid_to, is_current, created_at)
       VALUES (?, ?, ?, ?, NULL, 1, ?)`
    ).run(id, studentId, classId, now, now);

    db.prepare(
      'UPDATE users SET class_name = ?, updated_at = ? WHERE id = ?'
    ).run(classObj.name, now, studentId);

    if (actorId) {
      recordAuditStrict({
        actorId,
        action: 'STUDENT_CLASS_ASSIGNED',
        targetType: 'student_class',
        targetId: id,
        result: 'SUCCESS',
        details: { studentId, classId, className: classObj.name },
      }, db);
    }
  });

  return {
    id,
    studentId,
    classId,
    validFrom: now,
    validTo: null,
    isCurrent: true,
    createdAt: now,
  };
}

/**
 * Transfers a student from their current class to a new class.
 */
export function transferStudent(
  studentId: string,
  newClassId: string,
  actorId: string,
  db: AppDatabase = getDatabase()
): StudentClassRecord {
  requireUserForNewRelation(studentId, 'student', db);
  const classObj = requireClassForNewRelation(newClassId, db);
  const previous = db.prepare<DbStudentClassRow>(
    'SELECT * FROM student_class WHERE student_id=? AND is_current=1'
  ).get(studentId);
  if (!previous) {
    throw new OrganizationRuleError('STUDENT_NOT_ASSIGNED', '学生当前没有可转出的班级关系');
  }
  if (previous.class_id === newClassId) {
    return mapDbStudentClass(previous);
  }

  const now = Date.now();
  const id = `sc_${generateSecureToken(8)}`;
  db.transaction(() => {
    db.prepare(
      'UPDATE student_class SET is_current=0, valid_to=? WHERE id=? AND is_current=1'
    ).run(now, previous.id);
    db.prepare(
      `INSERT INTO student_class (id,student_id,class_id,valid_from,valid_to,is_current,created_at)
       VALUES (?,?,?,?,NULL,1,?)`
    ).run(id, studentId, newClassId, now, now);
    db.prepare('UPDATE users SET class_name=?, updated_at=? WHERE id=?')
      .run(classObj.name, now, studentId);
    recordAuditStrict({
      actorId,
      action: 'STUDENT_CLASS_TRANSFERRED',
      targetType: 'student_class',
      targetId: id,
      result: 'SUCCESS',
      details: { studentId, previousClassId: previous.class_id, newClassId },
    }, db);
  });

  return {
    id,
    studentId,
    classId: newClassId,
    validFrom: now,
    validTo: null,
    isCurrent: true,
    createdAt: now,
  };
}

/**
 * Queries students with strict class authorization enforcement.
 * If caller is admin: can view all or filter by classId.
 * If caller is teacher: strictly limited to authorized classes.
 */
export function getAuthorizedStudents(
  options: {
    callerRole: 'admin' | 'teacher' | 'student';
    callerId: string;
    classIdFilter?: string | null;
  },
  db: AppDatabase = getDatabase()
): StudentWithClassRow[] {
  const { callerRole, callerId, classIdFilter } = options;

  if (callerRole === 'admin') {
    if (classIdFilter) {
      return db.prepare<StudentWithClassRow>(
        `SELECT u.id, u.username, u.real_name as realName, c.name as className, c.id as classId,
                u.role, u.status, u.created_at as createdAt, p.progress_data as progressData
         FROM users u
         INNER JOIN student_class sc ON u.id = sc.student_id
         INNER JOIN classes c ON sc.class_id = c.id
         LEFT JOIN user_progress p ON u.id = p.user_id
         WHERE sc.class_id = ? AND sc.is_current = 1 AND u.role = 'student' AND u.status != 'deleted'
         ORDER BY u.created_at DESC`
      ).all(classIdFilter);
    }

    return db.prepare<StudentWithClassRow>(
      `SELECT u.id, u.username, u.real_name as realName, COALESCE(c.name, u.class_name) as className,
              COALESCE(c.id, '') as classId, u.role, u.status, u.created_at as createdAt, p.progress_data as progressData
       FROM users u
       LEFT JOIN student_class sc ON u.id = sc.student_id AND sc.is_current = 1
       LEFT JOIN classes c ON sc.class_id = c.id
       LEFT JOIN user_progress p ON u.id = p.user_id
       WHERE u.role = 'student' AND u.status != 'deleted'
       ORDER BY u.created_at DESC`
    ).all();
  }

  if (callerRole === 'teacher') {
    const authorizedClassIds = getTeacherAssignedClassIds(callerId, db);
    if (authorizedClassIds.length === 0) {
      return [];
    }

    // If teacher provided a class filter, verify they are authorized for that class
    if (classIdFilter) {
      if (!authorizedClassIds.includes(classIdFilter)) {
        throw new Error('FORBIDDEN_CLASS: 教师无权访问未分配班级的学生数据');
      }

      return db.prepare<StudentWithClassRow>(
        `SELECT u.id, u.username, u.real_name as realName, c.name as className, c.id as classId,
                u.role, u.status, u.created_at as createdAt, p.progress_data as progressData
         FROM users u
         INNER JOIN student_class sc ON u.id = sc.student_id
         INNER JOIN classes c ON sc.class_id = c.id
         LEFT JOIN user_progress p ON u.id = p.user_id
         WHERE sc.class_id = ? AND sc.is_current = 1 AND u.role = 'student' AND u.status != 'deleted'
         ORDER BY u.created_at DESC`
      ).all(classIdFilter);
    }

    // Teacher queries all their authorized students
    const placeholders = authorizedClassIds.map(() => '?').join(',');
    return db.prepare<StudentWithClassRow>(
      `SELECT u.id, u.username, u.real_name as realName, c.name as className, c.id as classId,
              u.role, u.status, u.created_at as createdAt, p.progress_data as progressData
       FROM users u
       INNER JOIN student_class sc ON u.id = sc.student_id
       INNER JOIN classes c ON sc.class_id = c.id
       LEFT JOIN user_progress p ON u.id = p.user_id
       WHERE sc.class_id IN (${placeholders}) AND sc.is_current = 1
         AND u.role = 'student' AND u.status != 'deleted'
       ORDER BY u.created_at DESC`
    ).all(...authorizedClassIds);
  }

  return [];
}

/**
 * Ensures baseline classes exist and links existing unassigned students to classes.
 */
export function initializeDefaultClassesIfNeeded(db: AppDatabase = getDatabase()): void {
  const checkClasses = db.prepare<{ count: number }>('SELECT COUNT(*) as count FROM classes').get();
  if (!checkClasses || checkClasses.count === 0) {
    const c1 = createClass({ name: '24新能源1班', grade: '2024级', cohortYear: 2024 }, db);
    const c2 = createClass({ name: '24新能源2班', grade: '2024级', cohortYear: 2024 }, db);
    createClass({ name: '体验班', grade: '2024级', cohortYear: 2024 }, db);

    // Link any existing students without student_class
    const unlinkedStudents = db.prepare<{ id: string; class_name: string }>(
      `SELECT u.id, u.class_name
       FROM users u
       LEFT JOIN student_class sc ON u.id = sc.student_id
       WHERE u.role = 'student' AND sc.id IS NULL`
    ).all();

    for (const stu of unlinkedStudents) {
      const targetClass = stu.class_name.includes('2班') ? c2 : c1;
      assignStudentToClass(stu.id, targetClass.id, undefined, db);
    }
  }
}
