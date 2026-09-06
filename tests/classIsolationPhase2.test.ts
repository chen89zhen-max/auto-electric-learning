import { describe, expect, it, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import { hashPassword } from '@/src/server/auth/crypto';
import { createSession } from '@/src/server/auth/session';
import { GET as adminGet, POST as adminPost } from '@/app/api/admin/route';
import { GET as progressGet } from '@/app/api/progress/route';
import {
  createClass,
  assignTeacherToClass,
  revokeTeacherFromClass,
  assignStudentToClass,
  transferStudent,
} from '@/src/server/db/classService';
import { createBaseUserProgress } from '@/src/types/progress';

let testDb: AppDatabase;
let class1Id: string;
let class2Id: string;
let teacherAToken: string;
let teacherBToken: string;
let teacherCToken: string;

beforeEach(() => {
  testDb = createSqliteAdapter(':memory:');
  setDatabaseInstance(testDb);

  const now = Date.now();

  // 1. Create classes
  const c1 = createClass({ name: '24新能源1班', grade: '2024级', cohortYear: 2024 }, testDb);
  const c2 = createClass({ name: '24新能源2班', grade: '2024级', cohortYear: 2024 }, testDb);
  class1Id = c1.id;
  class2Id = c2.id;

  // 2. Create users (Admin, Teacher A, Teacher B, Teacher C, Student 1, Student 2)
  const insertUser = testDb.prepare(
    `INSERT INTO users (id, username, password_hash, real_name, role, class_name, status, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)`
  );
  insertUser.run('usr_admin', 'admin', hashPassword('AdminPass123'), '系统管理员', 'admin', '管理组', now, now);
  insertUser.run('usr_teacher_a', 'teacher_a', hashPassword('TeaPass123'), '陈老师', 'teacher', '电工组', now, now);
  insertUser.run('usr_teacher_b', 'teacher_b', hashPassword('TeaPass123'), '李老师', 'teacher', '电子组', now, now);
  insertUser.run('usr_teacher_c', 'teacher_c', hashPassword('TeaPass123'), '张老师', 'teacher', '实训组', now, now);
  insertUser.run('usr_student_1', 'stu_class1', hashPassword('StuPass123'), '小明', 'student', '24新能源1班', now, now);
  insertUser.run('usr_student_2', 'stu_class2', hashPassword('StuPass123'), '小华', 'student', '24新能源2班', now, now);

  // 3. Assign students to classes
  assignStudentToClass('usr_student_1', class1Id, 'usr_admin', testDb);
  assignStudentToClass('usr_student_2', class2Id, 'usr_admin', testDb);

  // 4. Assign teachers: Teacher A -> Class 1, Teacher B -> Class 2, Teacher C -> Class 1 (Co-teaching)
  assignTeacherToClass({ teacherId: 'usr_teacher_a', classId: class1Id, actorId: 'usr_admin' }, testDb);
  assignTeacherToClass({ teacherId: 'usr_teacher_b', classId: class2Id, actorId: 'usr_admin' }, testDb);
  assignTeacherToClass({ teacherId: 'usr_teacher_c', classId: class1Id, actorId: 'usr_admin' }, testDb);

  // 5. Seed progress
  const insertProg = testDb.prepare(
    'INSERT INTO user_progress (user_id, progress_data, version, last_updated) VALUES (?, ?, 1, ?)'
  );
  insertProg.run('usr_student_1', JSON.stringify(createBaseUserProgress('小明')), now);
  insertProg.run('usr_student_2', JSON.stringify(createBaseUserProgress('小华')), now);

  // 6. Generate sessions
  teacherAToken = createSession('usr_teacher_a', 'teacher', { db: testDb }).token;
  teacherBToken = createSession('usr_teacher_b', 'teacher', { db: testDb }).token;
  teacherCToken = createSession('usr_teacher_c', 'teacher', { db: testDb }).token;
});

afterAll(() => {
  setDatabaseInstance(null);
});

describe('阶段2 多教师与班级关系及服务端数据隔离全量验证 (Phase 2 Class Isolation)', () => {
  // 1. 教师A（1班）与教师B（2班）严格数据隔离：绝无跨班泄露
  it('1. teacherCrossClassIsolation: 教师A仅能获取1班学生，教师B仅能获取2班学生', async () => {
    // Teacher A requests students
    const reqA = new NextRequest('http://localhost:3000/api/admin?action=students', {
      headers: { cookie: `nev_session=${teacherAToken}` },
    });
    const resA = await adminGet(reqA);
    expect(resA.status).toBe(200);
    const bodyA = (await resA.json()) as { students: Array<{ username: string; className: string }> };
    expect(bodyA.students.length).toBe(1);
    expect(bodyA.students[0].username).toBe('stu_class1');
    expect(bodyA.students[0].className).toBe('24新能源1班');

    // Teacher B requests students
    const reqB = new NextRequest('http://localhost:3000/api/admin?action=students', {
      headers: { cookie: `nev_session=${teacherBToken}` },
    });
    const resB = await adminGet(reqB);
    expect(resB.status).toBe(200);
    const bodyB = (await resB.json()) as { students: Array<{ username: string; className: string }> };
    expect(bodyB.students.length).toBe(1);
    expect(bodyB.students[0].username).toBe('stu_class2');
    expect(bodyB.students[0].className).toBe('24新能源2班');
  });

  // 2. 教师传参篡改攻击拦截：教师A强行请求2班参数被403拦截
  it('2. teacherParameterTamperingBlocked: 教师A在URL中伪造classId=2班被严格返回403', async () => {
    const reqTamper = new NextRequest(`http://localhost:3000/api/admin?action=students&classId=${class2Id}`, {
      headers: { cookie: `nev_session=${teacherAToken}` },
    });
    const resTamper = await adminGet(reqTamper);
    expect(resTamper.status).toBe(403);
    const body = (await resTamper.json()) as { error: string };
    expect(body.error).toContain('未授权班级');

    // CSV Export spoofing also blocked with 403
    const reqCsvTamper = new NextRequest(`http://localhost:3000/api/admin?action=export_csv&classId=${class2Id}`, {
      headers: { cookie: `nev_session=${teacherAToken}` },
    });
    const resCsvTamper = await adminGet(reqCsvTamper);
    expect(resCsvTamper.status).toBe(403);
  });

  // 3. 多师同班共同授课与单方撤销
  it('3. coTeachingAndSingleTeacherRevocation: 共同授课多位教师均可查看，撤销一人另一人不受影响', async () => {
    // Both Teacher A and Teacher C can see Class 1 students initially
    const reqCInitial = new NextRequest('http://localhost:3000/api/admin?action=students', {
      headers: { cookie: `nev_session=${teacherCToken}` },
    });
    const resCInitial = await adminGet(reqCInitial);
    expect(resCInitial.status).toBe(200);
    const bodyCInitial = (await resCInitial.json()) as { students: Array<{ username: string }> };
    expect(bodyCInitial.students.length).toBe(1);
    expect(bodyCInitial.students[0].username).toBe('stu_class1');

    // Admin revokes Teacher C's assignment to Class 1
    revokeTeacherFromClass('usr_teacher_c', class1Id, 'usr_admin', testDb);

    // Teacher C now has no authorized classes, returns 0 students
    const reqCAfter = new NextRequest('http://localhost:3000/api/admin?action=students', {
      headers: { cookie: `nev_session=${teacherCToken}` },
    });
    const resCAfter = await adminGet(reqCAfter);
    expect(resCAfter.status).toBe(200);
    const bodyCAfter = (await resCAfter.json()) as { students: Array<{ username: string }> };
    expect(bodyCAfter.students.length).toBe(0);

    // Teacher A still retains full access to Class 1
    const reqA = new NextRequest('http://localhost:3000/api/admin?action=students', {
      headers: { cookie: `nev_session=${teacherAToken}` },
    });
    const resA = await adminGet(reqA);
    expect(resA.status).toBe(200);
    const bodyA = (await resA.json()) as { students: Array<{ username: string }> };
    expect(bodyA.students.length).toBe(1);
    expect(bodyA.students[0].username).toBe('stu_class1');
  });

  // 4. 学生转班生命周期：新班教师即刻接管，原班教师即刻失权，历史记录完整审计
  it('4. studentTransferLifecycle: 学生从1班转入2班，权限立即转移且保留历史审计', async () => {
    // Before transfer: Teacher A sees stu_class1, Teacher B does not
    transferStudent('usr_student_1', class2Id, 'usr_admin', testDb);

    // After transfer:
    // Teacher B (Class 2) now sees both stu_class1 and stu_class2!
    const reqB = new NextRequest('http://localhost:3000/api/admin?action=students', {
      headers: { cookie: `nev_session=${teacherBToken}` },
    });
    const resB = await adminGet(reqB);
    const bodyB = (await resB.json()) as { students: Array<{ username: string }> };
    expect(bodyB.students.length).toBe(2);
    expect(bodyB.students.some((s) => s.username === 'stu_class1')).toBe(true);
    expect(bodyB.students.some((s) => s.username === 'stu_class2')).toBe(true);

    // Teacher A (Class 1) now sees 0 students!
    const reqA = new NextRequest('http://localhost:3000/api/admin?action=students', {
      headers: { cookie: `nev_session=${teacherAToken}` },
    });
    const resA = await adminGet(reqA);
    const bodyA = (await resA.json()) as { students: Array<{ username: string }> };
    expect(bodyA.students.length).toBe(0);

    // Verify historical student_class records
    const historyRows = testDb.prepare<{ class_id: string; is_current: number; valid_to: number | null }>(
      'SELECT class_id, is_current, valid_to FROM student_class WHERE student_id = ? ORDER BY created_at ASC'
    ).all('usr_student_1');
    expect(historyRows.length).toBe(2);
    // Old class record
    expect(historyRows[0].class_id).toBe(class1Id);
    expect(historyRows[0].is_current).toBe(0);
    expect(historyRows[0].valid_to).not.toBeNull();
    // New class record
    expect(historyRows[1].class_id).toBe(class2Id);
    expect(historyRows[1].is_current).toBe(1);
    expect(historyRows[1].valid_to).toBeNull();
  });

  // 5. 教师查看学生个体实训进度防窥：不能查看非任教学生进度
  it('5. teacherProgressSnoopingBlocked: 教师A尝试读取2班学生进度被返回403', async () => {
    // Teacher A reads student 2 (in Class 2) -> 403 Forbidden!
    const reqReadBlocked = new NextRequest('http://localhost:3000/api/progress?username=stu_class2', {
      headers: { cookie: `nev_session=${teacherAToken}` },
    });
    const resBlocked = await progressGet(reqReadBlocked);
    expect(resBlocked.status).toBe(403);
    const bodyBlocked = (await resBlocked.json()) as { error: string };
    expect(bodyBlocked.error).toContain('教师不能跨班查看非任教学生的实训进度');

    // Teacher A reads student 1 (in Class 1) -> 200 OK!
    const reqReadOk = new NextRequest('http://localhost:3000/api/progress?username=stu_class1', {
      headers: { cookie: `nev_session=${teacherAToken}` },
    });
    const resOk = await progressGet(reqReadOk);
    expect(resOk.status).toBe(200);
  });

  // 6. 纵向权限控制：教师角色禁止调用管理员专用系统配置接口
  it('6. teacherCannotExecuteAdminOnlyActions: 教师调用创建班级/重置密码/删除账号被返回403', async () => {
    // 1. Create class
    const reqCreate = new NextRequest('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: { cookie: `nev_session=${teacherAToken}` },
      body: JSON.stringify({ action: 'create_class', name: '非法创建班级' }),
    });
    const resCreate = await adminPost(reqCreate);
    expect(resCreate.status).toBe(403);

    // 2. Reset password
    const reqPass = new NextRequest('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: { cookie: `nev_session=${teacherAToken}` },
      body: JSON.stringify({ action: 'reset_password', username: 'stu_class1' }),
    });
    const resPass = await adminPost(reqPass);
    expect(resPass.status).toBe(403);

    // 3. Delete student
    const reqDel = new NextRequest('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: { cookie: `nev_session=${teacherAToken}` },
      body: JSON.stringify({ action: 'delete_student', username: 'stu_class1' }),
    });
    const resDel = await adminPost(reqDel);
    expect(resDel.status).toBe(403);
  });
});
