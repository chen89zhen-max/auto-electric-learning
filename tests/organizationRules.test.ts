import { beforeEach, describe, expect, it } from 'vitest';
import {
  assignStudentToClass,
  assignTeacherToClass,
  createClass,
  listAllClasses,
  transferStudent,
} from '@/src/server/db/classService';
import { createSqliteAdapter, type AppDatabase } from '@/src/server/db/database';
import { bootstrapDefaultDataIfNeeded } from '@/src/server/db/bootstrap';

let db: AppDatabase;

function insertUser(id: string, role: 'student' | 'teacher' | 'admin', status = 'active'): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO users
      (id,username,password_hash,real_name,role,class_name,status,must_change_password,created_at,updated_at)
     VALUES (?,?,?,?,?,'',?,0,?,?)`
  ).run(id, id, 'hash', id, role, status, now, now);
}

beforeEach(() => {
  db = createSqliteAdapter(':memory:');
  insertUser('admin', 'admin');
  insertUser('teacher', 'teacher');
  insertUser('student', 'student');
});

describe('organization relationship invariants', () => {
  it('rejects an admin as a student and a student as a teacher with stable codes', () => {
    const target = createClass({ name: '24新能源1班' }, db);

    expect(() => assignStudentToClass('admin', target.id, 'admin', db)).toThrow(
      expect.objectContaining({ code: 'INVALID_STUDENT_ROLE' })
    );
    expect(() => assignTeacherToClass({ teacherId: 'student', classId: target.id, actorId: 'admin' }, db))
      .toThrow(expect.objectContaining({ code: 'INVALID_TEACHER_ROLE' }));
  });

  it('rejects inactive accounts, archived classes, unsupported schools and courses', () => {
    insertUser('suspended_teacher', 'teacher', 'suspended');
    insertUser('suspended_student', 'student', 'suspended');
    insertUser('pending_student', 'student', 'pending_activation');
    const active = createClass({ name: '24新能源2班' }, db);
    const archived = createClass({ name: '已归档班' }, db);
    db.prepare("UPDATE classes SET status='archived' WHERE id=?").run(archived.id);

    expect(() => assignTeacherToClass({ teacherId: 'suspended_teacher', classId: active.id }, db))
      .toThrow(expect.objectContaining({ code: 'ACCOUNT_NOT_ACTIVE' }));
    expect(() => assignStudentToClass('suspended_student', active.id, undefined, db))
      .toThrow(expect.objectContaining({ code: 'ACCOUNT_NOT_ACTIVE' }));
    expect(assignStudentToClass('pending_student', active.id, 'admin', db).classId).toBe(active.id);
    expect(() => assignTeacherToClass({ teacherId: 'teacher', classId: archived.id }, db))
      .toThrow(expect.objectContaining({ code: 'CLASS_NOT_ACTIVE' }));
    expect(() => createClass({ name: '外校班', schoolId: 'another_school' }, db))
      .toThrow(expect.objectContaining({ code: 'SCHOOL_SCOPE_VIOLATION' }));
    expect(() => assignTeacherToClass({ teacherId: 'teacher', classId: active.id, courseId: 'other' }, db))
      .toThrow(expect.objectContaining({ code: 'COURSE_SCOPE_VIOLATION' }));
  });

  it('enforces one current class and one active teacher-class-course relation', () => {
    const first = createClass({ name: '24新能源3班' }, db);
    const second = createClass({ name: '24新能源4班' }, db);
    assignTeacherToClass({ teacherId: 'teacher', classId: first.id }, db);

    expect(() => assignTeacherToClass({ teacherId: 'teacher', classId: first.id }, db))
      .toThrow(expect.objectContaining({ code: 'DUPLICATE_TEACHER_ASSIGNMENT' }));

    const current = assignStudentToClass('student', first.id, 'admin', db);
    expect(assignStudentToClass('student', first.id, 'admin', db).id).toBe(current.id);
    expect(() => db.prepare(
      `INSERT INTO student_class (id,student_id,class_id,valid_from,valid_to,is_current,created_at)
       VALUES ('duplicate','student',?,1,NULL,1,1)`
    ).run(second.id)).toThrow();
  });

  it('moves a student and writes one transfer audit record in the same transaction', () => {
    const first = createClass({ name: '24新能源5班' }, db);
    const second = createClass({ name: '24新能源6班' }, db);
    assignStudentToClass('student', first.id, 'admin', db);

    transferStudent('student', second.id, 'admin', db);

    const history = db.prepare<{ class_id: string; is_current: number; valid_to: number | null }>(
      'SELECT class_id,is_current,valid_to FROM student_class WHERE student_id=? ORDER BY created_at,id'
    ).all('student');
    expect(history).toHaveLength(2);
    expect(history.filter((row) => row.is_current === 1)).toEqual([
      expect.objectContaining({ class_id: second.id, valid_to: null }),
    ]);
    expect(history.find((row) => row.class_id === first.id)?.valid_to).not.toBeNull();
    expect(db.prepare<{ count: number }>(
      "SELECT COUNT(*) count FROM audit_logs WHERE action='STUDENT_CLASS_TRANSFERRED'"
    ).get()?.count).toBe(1);
  });

  it('rolls back a relationship when its mandatory audit insert fails', () => {
    const target = createClass({ name: '审计事务班' }, db);
    db.exec(`CREATE TRIGGER reject_assignment_audit BEFORE INSERT ON audit_logs
      WHEN NEW.action = 'TEACHER_ASSIGNED_TO_CLASS'
      BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END;`);

    expect(() => assignTeacherToClass({ teacherId: 'teacher', classId: target.id, actorId: 'admin' }, db))
      .toThrow(/audit unavailable/);
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) count FROM teacher_class').get()?.count).toBe(0);
  });

  it('reports counts from current relations only', () => {
    const first = createClass({ name: '24新能源7班' }, db);
    const second = createClass({ name: '24新能源8班' }, db);
    assignStudentToClass('student', first.id, 'admin', db);
    transferStudent('student', second.id, 'admin', db);

    const counts = Object.fromEntries(listAllClasses(db).map((item) => [item.id, item.studentCount]));
    expect(counts[first.id]).toBe(0);
    expect(counts[second.id]).toBe(1);
  });

  it('seeds development demo classes inside the supported school scope', () => {
    const fresh = createSqliteAdapter(':memory:');
    bootstrapDefaultDataIfNeeded(fresh, { environment: 'development', enableDemoSeed: true });

    expect(
      fresh.prepare<{ count: number }>(
        "SELECT COUNT(*) count FROM classes WHERE school_id != 'default_school'"
      ).get()?.count
    ).toBe(0);
    fresh.close();
  });
});
