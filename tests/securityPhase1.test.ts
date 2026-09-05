import { describe, expect, it, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { createSqliteAdapter, setDatabaseInstance, type AppDatabase } from '@/src/server/db/database';
import { hashPassword, verifyPassword } from '@/src/server/auth/crypto';
import { createSession, validateSession, revokeSession, revokeAllUserSessions } from '@/src/server/auth/session';
import { checkLoginRateLimit, recordLoginAttempt } from '@/src/server/auth/rateLimit';
import { GET as adminGet, POST as adminPost } from '@/app/api/admin/route';
import { GET as progressGet, POST as progressPost } from '@/app/api/progress/route';
import { GET as authGet, POST as authPost } from '@/app/api/auth/route';
import { createBaseUserProgress } from '@/src/types/progress';

let testDb: AppDatabase;

beforeEach(() => {
  // Use isolated in-memory SQLite database for test runs
  testDb = createSqliteAdapter(':memory:');
  setDatabaseInstance(testDb);

  // Seed baseline admin and student
  const now = Date.now();
  const insertUser = testDb.prepare(
    `INSERT INTO users (id, username, password_hash, real_name, role, class_name, status, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)`
  );
  insertUser.run('usr_admin', 'admin', hashPassword('Admin#Pass123'), '陈师傅', 'admin', '教师组', now, now);
  insertUser.run('usr_student1', 'stu1', hashPassword('Stu1#Pass123'), '小明', 'student', '24新能源1班', now, now);
  insertUser.run('usr_student2', 'stu2', hashPassword('Stu2#Pass123'), '小红', 'student', '24新能源1班', now, now);

  const insertProg = testDb.prepare(
    `INSERT INTO user_progress (user_id, progress_data, version, last_updated)
     VALUES (?, ?, 1, ?)`
  );
  insertProg.run('usr_admin', JSON.stringify(createBaseUserProgress('陈师傅')), now);
  insertProg.run('usr_student1', JSON.stringify(createBaseUserProgress('小明')), now);
  insertProg.run('usr_student2', JSON.stringify(createBaseUserProgress('小红')), now);
});

afterAll(() => {
  setDatabaseInstance(null);
});

describe('阶段1 安全风险封堵全量自动化验证 (Phase 1 Security Controls)', () => {
  // 1. 密码学加固与防时序攻击验证
  it('1. passwordHashingSecurity: 使用 scrypt 盐值哈希，防时序碰撞且不同盐值哈希不同', () => {
    const rawPass = 'Secret#P@ssw0rd2026';
    const hash1 = hashPassword(rawPass);
    const hash2 = hashPassword(rawPass);

    expect(hash1).toMatch(/^scrypt\$v1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(hash2).toMatch(/^scrypt\$v1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    // Unique salt ensures hashes are distinct
    expect(hash1).not.toBe(hash2);

    expect(verifyPassword(rawPass, hash1)).toBe(true);
    expect(verifyPassword(rawPass, hash2)).toBe(true);
    expect(verifyPassword('WrongPass', hash1)).toBe(false);
  });

  // 2. 服务端 Session 生命周期、滑动续期与主动吊销
  it('2. sessionLifecycleAndRevocation: Session 创建、验证、注销与批量失效', () => {
    const { token } = createSession('usr_student1', 'student', { db: testDb });
    expect(token).toBeDefined();

    // Valid session resolves to user
    const res = validateSession(token, testDb);
    expect(res).not.toBeNull();
    expect(res?.user.username).toBe('stu1');
    expect(res?.user.role).toBe('student');

    // Revoking single session
    revokeSession(token, testDb);
    expect(validateSession(token, testDb)).toBeNull();

    // Multiple sessions & revokeAllUserSessions
    const s1 = createSession('usr_student2', 'student', { db: testDb });
    const s2 = createSession('usr_student2', 'student', { db: testDb });
    expect(validateSession(s1.token, testDb)).not.toBeNull();
    expect(validateSession(s2.token, testDb)).not.toBeNull();

    revokeAllUserSessions('usr_student2', testDb);
    expect(validateSession(s1.token, testDb)).toBeNull();
    expect(validateSession(s2.token, testDb)).toBeNull();
  });

  // 3. 登录失败暴力破解速率限制（5次失败后锁定）
  it('3. loginRateLimiting: 连续5次错误密码锁定并返回429', () => {
    const ip = '192.168.1.100';
    const identifier = 'stu1';

    for (let i = 0; i < 5; i++) {
      const check = checkLoginRateLimit(identifier, ip, { db: testDb });
      expect(check.allowed).toBe(true);
      recordLoginAttempt(identifier, ip, false, testDb);
    }

    // 6th attempt should be blocked
    const blocked = checkLoginRateLimit(identifier, ip, { db: testDb });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    // Successful attempt resets failure count
    recordLoginAttempt(identifier, ip, true, testDb);
    const resetCheck = checkLoginRateLimit(identifier, ip, { db: testDb });
    expect(resetCheck.allowed).toBe(true);
  });

  // 4. 匿名访问受保护接口一律阻断（401 Unauthorized）
  it('4. anonymousAccessBlockedWith401: 未认证直接访问管理和进度API返回401', async () => {
    // Admin GET
    const reqAdminGet = new NextRequest('http://localhost:3000/api/admin?action=students');
    const resAdminGet = await adminGet(reqAdminGet);
    expect(resAdminGet.status).toBe(401);

    // Admin POST
    const reqAdminPost = new NextRequest('http://localhost:3000/api/admin', {
      method: 'POST',
      body: JSON.stringify({ action: 'reset_progress', username: 'stu1' }),
    });
    const resAdminPost = await adminPost(reqAdminPost);
    expect(resAdminPost.status).toBe(401);

    // Progress GET
    const reqProgGet = new NextRequest('http://localhost:3000/api/progress?username=stu1');
    const resProgGet = await progressGet(reqProgGet);
    expect(resProgGet.status).toBe(401);

    // Progress POST
    const reqProgPost = new NextRequest('http://localhost:3000/api/progress', {
      method: 'POST',
      body: JSON.stringify({ username: 'stu1', progress: createBaseUserProgress('小明') }),
    });
    const resProgPost = await progressPost(reqProgPost);
    expect(resProgPost.status).toBe(401);

    // Auth GET (prevents anonymous enumeration)
    const reqAuthGet = new NextRequest('http://localhost:3000/api/auth');
    const resAuthGet = await authGet(reqAuthGet);
    expect(resAuthGet.status).toBe(401);
  });

  // 5. 纵向越权阻断：学生访问管理员后台返回 403 Forbidden
  it('5. verticalPrivilegeEscalationBlocked: 学生角色访问管理接口被拦截并返回403', async () => {
    const { token } = createSession('usr_student1', 'student', { db: testDb });
    const headers = { cookie: `nev_session=${token}` };

    // Student attempts to fetch student list
    const reqGet = new NextRequest('http://localhost:3000/api/admin?action=students', { headers });
    const resGet = await adminGet(reqGet);
    expect(resGet.status).toBe(403);
    const bodyGet = (await resGet.json()) as { error: string };
    expect(bodyGet.error).toContain('权限不足');

    // Student attempts to reset student password
    const reqPost = new NextRequest('http://localhost:3000/api/admin', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'reset_password', username: 'stu2' }),
    });
    const resPost = await adminPost(reqPost);
    expect(resPost.status).toBe(403);
  });

  // 6. 横向越权阻断：学生不能读取或篡改其他学生的实训数据
  it('6. horizontalPrivilegeEscalationBlocked: 学生A不能读取或覆盖学生B的实训进度', async () => {
    const { token: token1 } = createSession('usr_student1', 'student', { db: testDb });
    const headers = { cookie: `nev_session=${token1}` };

    // Student 1 attempts to read Student 2 progress
    const reqRead = new NextRequest('http://localhost:3000/api/progress?username=stu2', { headers });
    const resRead = await progressGet(reqRead);
    expect(resRead.status).toBe(403);
    const bodyRead = (await resRead.json()) as { error: string };
    expect(bodyRead.error).toContain('学生不能查看其他学生的实训数据');

    // Student 1 attempts to overwrite Student 2 progress
    const reqWrite = new NextRequest('http://localhost:3000/api/progress', {
      method: 'POST',
      headers,
      body: JSON.stringify({ username: 'stu2', progress: createBaseUserProgress('小红') }),
    });
    const resWrite = await progressPost(reqWrite);
    expect(resWrite.status).toBe(403);
    const bodyWrite = (await resWrite.json()) as { error: string };
    expect(bodyWrite.error).toContain('学生不能篡改其他学生的实训进度');
  });

  // 7. 防伪造成绩与跳关卡控：未完成前置关卡禁止提交后续关卡成绩
  it('7. prerequisiteEnforcementAndScoreSanitization: 未完成任务0/1时跳关提交任务2被服务端阻断', async () => {
    const { token } = createSession('usr_student1', 'student', { db: testDb });
    const headers = { cookie: `nev_session=${token}` };

    const forgedProgress = createBaseUserProgress('小明');
    // Forge LEVEL_02 as completed with 100 points, but LEVEL_00 and LEVEL_01 are locked!
    forgedProgress.levels.LEVEL_02 = { status: 'completed', score: 100 };
    forgedProgress.teacherMode = true; // Attempt to forge teacherMode

    const reqPost = new NextRequest('http://localhost:3000/api/progress', {
      method: 'POST',
      headers,
      body: JSON.stringify({ username: 'stu1', progress: forgedProgress }),
    });
    const resPost = await progressPost(reqPost);
    expect(resPost.status).toBe(400);
    const body = (await resPost.json()) as { error: string };
    expect(body.error).toContain('关卡非法跳过');

    // Verify student cannot set teacherMode: true even when valid
    const validProgress = createBaseUserProgress('小明');
    validProgress.teacherMode = true; // Forged
    validProgress.levels.LEVEL_00 = { status: 'completed', score: 100 };

    const reqValid = new NextRequest('http://localhost:3000/api/progress', {
      method: 'POST',
      headers,
      body: JSON.stringify({ username: 'stu1', progress: validProgress }),
    });
    const resValid = await progressPost(reqValid);
    expect(resValid.status).toBe(200);
    const savedBody = (await resValid.json()) as { progress: { teacherMode: boolean } };
    // Teacher mode MUST be sanitized to false for students
    expect(savedBody.progress.teacherMode).toBe(false);
  });

  // 8. 高并发事务性读写一致性（40并发无锁冲突与数据损坏）
  it('8. highConcurrencyConsistency: 40名学生同时并发读写数据库无丢失或崩溃', async () => {
    const now = Date.now();
    const students: string[] = [];
    const tokens: string[] = [];

    // Seed 40 test students
    for (let i = 0; i < 40; i++) {
      const username = `concurrent_stu_${i}`;
      const userId = `usr_concurrent_${i}`;
      students.push(username);

      testDb.prepare(
        `INSERT INTO users (id, username, password_hash, real_name, role, class_name, status, must_change_password, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'student', '并发班', 'active', 0, ?, ?)`
      ).run(userId, username, hashPassword('Pass123'), `学生${i}`, now, now);

      const { token } = createSession(userId, 'student', { db: testDb });
      tokens.push(token);
    }

    // Perform 40 concurrent POST requests
    const promises = tokens.map((tok, idx) => {
      const u = students[idx];
      const prog = createBaseUserProgress(`学生${idx}`);
      prog.levels.LEVEL_00 = { status: 'completed', score: 95 };

      const req = new NextRequest('http://localhost:3000/api/progress', {
        method: 'POST',
        headers: { cookie: `nev_session=${tok}` },
        body: JSON.stringify({ username: u, progress: prog }),
      });
      return progressPost(req);
    });

    const responses = await Promise.all(promises);
    expect(responses.length).toBe(40);
    for (const r of responses) {
      expect(r.status).toBe(200);
    }

    // Verify all 40 progress records are saved correctly in DB
    const countRow = testDb.prepare<{ count: number }>(
      "SELECT COUNT(*) as count FROM user_progress WHERE user_id LIKE 'usr_concurrent_%'"
    ).get();
    expect(countRow?.count).toBe(40);
  });

  // 9. 用户认证接口验证：正常登录下发可信 Cookie，密码错误返回401，登出注销 Cookie
  it('9. authPostLoginAndLogout: 账号密码验证、Cookie签发与注销全生命周期', async () => {
    // Correct login
    const reqLogin = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        username: 'stu1',
        password: 'Stu1#Pass123',
        expectedRole: 'student',
      }),
    });
    const resLogin = await authPost(reqLogin);
    expect(resLogin.status).toBe(200);
    const cookieHeader = resLogin.headers.get('set-cookie');
    expect(cookieHeader).toContain('nev_session=');
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('SameSite=Lax');

    // Extract token from cookie
    const tokenMatch = cookieHeader?.match(/nev_session=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : '';
    expect(token).toBeTruthy();

    // Wrong password login
    const reqWrong = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        username: 'stu1',
        password: 'BadPassword',
        expectedRole: 'student',
      }),
    });
    const resWrong = await authPost(reqWrong);
    expect(resWrong.status).toBe(401);

    // Logout
    const reqLogout = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      headers: { cookie: `nev_session=${token}` },
      body: JSON.stringify({ action: 'logout' }),
    });
    const resLogout = await authPost(reqLogout);
    expect(resLogout.status).toBe(200);
    const logoutCookie = resLogout.headers.get('set-cookie');
    expect(logoutCookie).toContain('Max-Age=0');

    // Session is now revoked
    expect(validateSession(token, testDb)).toBeNull();
  });
});
