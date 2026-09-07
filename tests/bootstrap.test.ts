import { describe, expect, it } from 'vitest';
import { createSqliteAdapter } from '@/src/server/db/database';
import { bootstrapDefaultDataIfNeeded, DEFAULT_ACCOUNTS } from '@/src/server/db/bootstrap';
import { verifyPassword } from '@/src/server/auth/crypto';

describe('系统基础账号与班级教学关系初始化测试 (Bootstrap Accounts Verification)', () => {
  it('应当成功注入初始管理员、任课教师与学员账号，且密码校验一致', () => {
    const db = createSqliteAdapter(':memory:');
    bootstrapDefaultDataIfNeeded(db, { environment: 'test', enableDemoSeed: true });

    // 1. Verify all accounts exist and passwords verify correctly
    for (const acc of DEFAULT_ACCOUNTS) {
      const user = db.prepare<{
        username: string;
        password_hash: string;
        role: string;
        real_name: string;
        class_name: string;
      }>('SELECT username, password_hash, role, real_name, class_name FROM users WHERE username = ?').get(acc.username);

      expect(user).toBeDefined();
      expect(user?.role).toBe(acc.role);
      expect(user?.real_name).toBe(acc.realName);
      expect(verifyPassword(acc.passwordText, user!.password_hash)).toBe(true);
    }

    // 2. Verify classes created
    const classes = db.prepare<{ id: string; name: string }>('SELECT id, name FROM classes').all();
    expect(classes.length).toBe(2);
    expect(classes.some((c) => c.name === '24新能源1班')).toBe(true);
    expect(classes.some((c) => c.name === '24新能源2班')).toBe(true);

    // 3. Verify teacher_class relations
    const teacherLinks = db.prepare<{ teacher_id: string; class_id: string }>(
      "SELECT teacher_id, class_id FROM teacher_class WHERE status = 'active'"
    ).all();
    expect(teacherLinks.some((t) => t.teacher_id === 'usr_teacher' && t.class_id === 'class_24new1')).toBe(true);
    expect(teacherLinks.some((t) => t.teacher_id === 'usr_teacher2' && t.class_id === 'class_24new2')).toBe(true);

    // 4. Verify student_class relations
    const studentLinks = db.prepare<{ student_id: string; class_id: string }>(
      'SELECT student_id, class_id FROM student_class WHERE is_current = 1'
    ).all();
    expect(studentLinks.some((s) => s.student_id === 'usr_student1' && s.class_id === 'class_24new1')).toBe(true);
    expect(studentLinks.some((s) => s.student_id === 'usr_student2' && s.class_id === 'class_24new2')).toBe(true);
  });

  it('MemorySqlDatabase 应当完美支持 Session 鉴权、任教班级解析与学生隔离', async () => {
    const { MemorySqlDatabase } = await import('@/src/server/db/memorySqlStore');
    const { createSession, validateSession } = await import('@/src/server/auth/session');
    const { getTeacherAssignedClasses, getAuthorizedStudents } = await import('@/src/server/db/classService');

    const db = new MemorySqlDatabase(':memory:');
    bootstrapDefaultDataIfNeeded(db, { environment: 'test', enableDemoSeed: true });

    // 1. Session creation & validation
    const { token } = createSession('usr_teacher', 'teacher', { db });
    const auth = validateSession(token, db);
    expect(auth).not.toBeNull();
    expect(auth?.user.username).toBe('teacher');
    expect(auth?.user.role).toBe('teacher');

    // 2. Class query
    const teacherClasses = getTeacherAssignedClasses('usr_teacher', db);
    expect(teacherClasses.length).toBe(1);
    expect(teacherClasses[0].name).toBe('24新能源1班');

    // 3. Student query
    const students = getAuthorizedStudents({ callerRole: 'teacher', callerId: 'usr_teacher' }, db);
    expect(students.length).toBe(1);
    expect(students[0].username).toBe('student1');
  });

  it('student_pass 账号应当初始拥有全通关进度且所有已实现关卡均解锁', async () => {
    const db = createSqliteAdapter(':memory:');
    bootstrapDefaultDataIfNeeded(db, { environment: 'test', enableDemoSeed: true });

    const progRow = db.prepare<{ progress_data: string }>(
      "SELECT progress_data FROM user_progress WHERE user_id = 'usr_student_pass'"
    ).get();

    expect(progRow).toBeDefined();
    const progress = JSON.parse(progRow!.progress_data);
    expect(progress.traineeName).toBe('通关学员');

    const { CANONICAL_COURSE_REGISTRY } = await import('@/src/courses/registry');
    const { isLevelUnlocked } = await import('@/src/stores/userProgressStore');

    for (const level of CANONICAL_COURSE_REGISTRY) {
      if (level.implemented) {
        expect(progress.levels[level.canonicalId]?.status).toBe('completed');
        expect(isLevelUnlocked(level.canonicalId, progress)).toBe(true);
      }
    }
  });
});
