import type { AppDatabase } from './database';
import { hashPassword } from '../auth/crypto';
import { createBaseUserProgress } from '@/src/types/progress';

export interface DefaultAccountInfo {
  roleName: string;
  username: string;
  passwordText: string;
  realName: string;
  role: 'admin' | 'teacher' | 'student';
  className: string;
  description: string;
}

export interface DemoSeedOptions {
  environment?: string;
  enableDemoSeed?: boolean;
}

export const DEFAULT_ACCOUNTS: DefaultAccountInfo[] = [
  {
    roleName: '系统管理员',
    username: 'admin',
    passwordText: 'Admin#2026',
    realName: '系统管理员',
    role: 'admin',
    className: '管理组',
    description: '拥有全校学情视察、班级管理、教师授权、学生转班与重置凭据最高特权',
  },
  {
    roleName: '任课教师（1班）',
    username: 'teacher',
    passwordText: 'Teacher#2026',
    realName: '陈老师（1班任课教师）',
    role: 'teacher',
    className: '24新能源1班',
    description: '任教 24新能源1班，可查看1班学情大屏与导出报表，受服务端严格数据隔离约束',
  },
  {
    roleName: '任课教师（2班）',
    username: 'teacher2',
    passwordText: 'Teacher#2026',
    realName: '李老师（2班任课教师）',
    role: 'teacher',
    className: '24新能源2班',
    description: '任教 24新能源2班，用于对照验证教师跨班数据隔离与防窥机制',
  },
  {
    roleName: '在读学员（1班）',
    username: 'student1',
    passwordText: 'Student#2026',
    realName: '张晓明',
    role: 'student',
    className: '24新能源1班',
    description: '24新能源1班学员，可进行实训闯关，学习数据对陈老师可见，对李老师完全隔离',
  },
  {
    roleName: '在读学员（2班）',
    username: 'student2',
    passwordText: 'Student#2026',
    realName: '李小华',
    role: 'student',
    className: '24新能源2班',
    description: '24新能源2班学员，可进行实训闯关，学习数据对李老师可见，对陈老师完全隔离',
  },
];

/**
 * Ensures default teaching classes and accounts exist in the SQLite database.
 */
export function bootstrapDefaultDataIfNeeded(
  db: AppDatabase,
  options: DemoSeedOptions = {}
): boolean {
  const environment = options.environment || process.env.NODE_ENV || 'development';
  const enableDemoSeed = options.enableDemoSeed ?? process.env.ENABLE_DEMO_SEED === 'true';
  if (environment === 'production' || !enableDemoSeed) {
    return false;
  }

  const now = Date.now();

  db.transaction(() => {
    // 1. Ensure default classes
    const checkClass = db.prepare<Record<string, unknown>>('SELECT id FROM classes WHERE id = ?');
    const insertClass = db.prepare(
      `INSERT OR IGNORE INTO classes (id, school_id, name, grade, cohort_year, status, created_at, updated_at)
       VALUES (?, 'school_default', ?, '2024级', 2024, 'active', ?, ?)`
    );

    if (!checkClass.get('class_24new1')) {
      insertClass.run('class_24new1', '24新能源1班', now, now);
    }
    if (!checkClass.get('class_24new2')) {
      insertClass.run('class_24new2', '24新能源2班', now, now);
    }

    // 2. Ensure default accounts
    const checkUser = db.prepare<Record<string, unknown>>('SELECT id FROM users WHERE username = ?');
    const insertUser = db.prepare(
      `INSERT OR IGNORE INTO users (id, username, password_hash, real_name, role, class_name, status, must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)`
    );

    const checkProgress = db.prepare<Record<string, unknown>>('SELECT user_id FROM user_progress WHERE user_id = ?');
    const insertProgress = db.prepare(
      `INSERT OR IGNORE INTO user_progress (user_id, progress_data, version, last_updated)
       VALUES (?, ?, 1, ?)`
    );

    const checkTeacherClass = db.prepare<Record<string, unknown>>(
      'SELECT id FROM teacher_class WHERE teacher_id = ? AND class_id = ? AND status = ?'
    );
    const insertTeacherClass = db.prepare(
      `INSERT OR IGNORE INTO teacher_class (id, teacher_id, class_id, course_id, valid_from, valid_to, status, created_at)
       VALUES (?, ?, ?, 'auto_elec_base', ?, NULL, 'active', ?)`
    );

    const checkStudentClass = db.prepare<Record<string, unknown>>(
      'SELECT id FROM student_class WHERE student_id = ? AND is_current = 1'
    );
    const insertStudentClass = db.prepare(
      `INSERT OR IGNORE INTO student_class (id, student_id, class_id, valid_from, valid_to, is_current, created_at)
       VALUES (?, ?, ?, ?, NULL, 1, ?)`
    );

    // Map each account
    for (const acc of DEFAULT_ACCOUNTS) {
      const existing = checkUser.get(acc.username);
      const userId = `usr_${acc.username}`;

      if (!existing) {
        const passHash = hashPassword(acc.passwordText);
        insertUser.run(
          userId,
          acc.username,
          passHash,
          acc.realName,
          acc.role,
          acc.className,
          now,
          now
        );
      }

      if (acc.role === 'student' && !checkProgress.get(userId)) {
        insertProgress.run(
          userId,
          JSON.stringify(createBaseUserProgress(acc.realName)),
          now
        );
      }

      // Teaching relationships
      if (acc.role === 'teacher') {
        const targetClassId = acc.className === '24新能源2班' ? 'class_24new2' : 'class_24new1';
        if (!checkTeacherClass.get(userId, targetClassId, 'active')) {
          insertTeacherClass.run(
            `tc_${acc.username}_${targetClassId}`,
            userId,
            targetClassId,
            now,
            now
          );
        }
      }

      // Student class membership
      if (acc.role === 'student') {
        const targetClassId = acc.className === '24新能源2班' ? 'class_24new2' : 'class_24new1';
        if (!checkStudentClass.get(userId)) {
          insertStudentClass.run(
            `sc_${acc.username}_${targetClassId}`,
            userId,
            targetClassId,
            now,
            now
          );
        }
      }
    }
  });

  return true;
}
