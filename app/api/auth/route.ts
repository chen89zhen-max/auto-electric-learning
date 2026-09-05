import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDatabase } from '@/src/server/db/database';
import { hashPassword, verifyPassword } from '@/src/server/auth/crypto';
import { createSession, revokeSession, createClearCookieHeader } from '@/src/server/auth/session';
import { checkLoginRateLimit, recordLoginAttempt } from '@/src/server/auth/rateLimit';
import { recordAudit } from '@/src/server/auth/audit';
import { authenticateRequest, extractClientIp } from '@/src/server/auth/authMiddleware';
import { createBaseUserProgress, type UserProgressData } from '@/src/types/progress';

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  real_name: string;
  role: 'student' | 'teacher' | 'admin';
  class_name: string;
  status: string;
  must_change_password: number;
  created_at: number;
}

interface ProgressRow {
  progress_data: string;
}

type UserRole = UserRow['role'];

function isUserRole(value: string | undefined): value is UserRole {
  return value === 'student' || value === 'teacher' || value === 'admin';
}

export async function POST(req: NextRequest) {
  const ip = extractClientIp(req);

  try {
    const body = (await req.json()) as Record<string, string>;
    const { action } = body;
    const db = getDatabase();

    // 1. REGISTER
    if (action === 'register') {
      const { username, password, realName, className } = body;

      if (!username || !password || !realName) {
        return NextResponse.json(
          { success: false, error: '学号/账号、姓名和密码为必填项' },
          { status: 400 }
        );
      }

      const cleanUsername = username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_\-\u4e00-\u9fa5]{2,30}$/.test(cleanUsername)) {
        return NextResponse.json(
          { success: false, error: '学号/账号格式不合规（2-30位字符，支持字母、数字与中文）' },
          { status: 400 }
        );
      }

      if (password.trim().length < 6) {
        return NextResponse.json(
          { success: false, error: '密码长度至少需要 6 个字符' },
          { status: 400 }
        );
      }

      // Check existing user
      const checkUser = db.prepare<UserRow>('SELECT id FROM users WHERE username = ?');
      if (checkUser.get(cleanUsername)) {
        return NextResponse.json(
          { success: false, error: '该学号/账号已存在，请直接登录' },
          { status: 409 }
        );
      }

      const userId = `usr_${crypto.createHash('md5').update(cleanUsername).digest('hex')}`;
      const passwordHash = hashPassword(password.trim());
      const now = Date.now();
      const userClassName = (className || '新能源汽修班').trim();
      const userRealName = realName.trim();

      db.transaction(() => {
        const insertUser = db.prepare(
          `INSERT INTO users (id, username, password_hash, real_name, role, class_name, status, must_change_password, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'student', ?, 'active', 0, ?, ?)`
        );
        insertUser.run(userId, cleanUsername, passwordHash, userRealName, userClassName, now, now);

        const initialProg = createBaseUserProgress(userRealName);
        const insertProg = db.prepare(
          `INSERT INTO user_progress (user_id, progress_data, version, last_updated)
           VALUES (?, ?, 1, ?)`
        );
        insertProg.run(userId, JSON.stringify(initialProg), now);
      });

      // Create session and set cookie
      const userAgent = req.headers.get('user-agent') || '';
      const { cookieHeader } = createSession(userId, 'student', { ip, userAgent, db });

      recordAudit({
        actorId: userId,
        actorUsername: cleanUsername,
        actorRole: 'student',
        action: 'USER_REGISTER',
        result: 'SUCCESS',
        details: { realName: userRealName, className: userClassName },
        ip,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          username: cleanUsername,
          realName: userRealName,
          className: userClassName,
          role: 'student',
        },
        progress: createBaseUserProgress(userRealName),
      });

      response.headers.set('Set-Cookie', cookieHeader);
      return response;
    }

    // 2. LOGIN
    if (action === 'login') {
      const { username, password, expectedRole } = body;
      if (!username || !password || !isUserRole(expectedRole)) {
        return NextResponse.json(
          { success: false, error: '请输入账号、密码并选择正确的登录入口' },
          { status: 400 }
        );
      }

      const cleanUsername = username.trim().toLowerCase();

      // Rate limit check
      const rateCheck = checkLoginRateLimit(cleanUsername, ip, { db });
      if (!rateCheck.allowed) {
        recordAudit({
          actorUsername: cleanUsername,
          action: 'LOGIN_RATE_LIMITED',
          result: 'DENIED',
          details: { retryAfterSeconds: rateCheck.retryAfterSeconds },
          ip,
        });

        return NextResponse.json(
          {
            success: false,
            error: `连续登录失败次数过多，已临时锁定。请在 ${rateCheck.retryAfterSeconds} 秒后再试`,
          },
          { status: 429 }
        );
      }

      const getUser = db.prepare<UserRow>(
        'SELECT id, username, password_hash, real_name, role, class_name, status, must_change_password FROM users WHERE username = ?'
      );
      const user = getUser.get(cleanUsername);

      if (
        !user ||
        user.status !== 'active' ||
        !verifyPassword(password.trim(), user.password_hash) ||
        user.role !== expectedRole
      ) {
        recordLoginAttempt(cleanUsername, ip, false, db);
        recordAudit({
          actorUsername: cleanUsername,
          action: 'USER_LOGIN',
          result: 'FAILED',
          details: { reason: 'INVALID_CREDENTIALS_OR_ENTRY' },
          ip,
        });

        return NextResponse.json(
          { success: false, error: '账号、密码或登录入口不匹配' },
          { status: 401 }
        );
      }

      // Record successful login (clears failure count)
      recordLoginAttempt(cleanUsername, ip, true, db);

      // Only students own formal learning progress.
      let progress: UserProgressData | undefined;
      if (user.role === 'student') {
        const getProg = db.prepare<ProgressRow>(
          'SELECT progress_data FROM user_progress WHERE user_id = ?'
        );
        const progRow = getProg.get(user.id);
        if (progRow) {
          try {
            progress = JSON.parse(progRow.progress_data) as UserProgressData;
          } catch {
            progress = createBaseUserProgress(user.real_name);
          }
        } else {
          progress = createBaseUserProgress(user.real_name);
          db.prepare(
            'INSERT INTO user_progress (user_id, progress_data, version, last_updated) VALUES (?, ?, 1, ?)'
          ).run(user.id, JSON.stringify(progress), Date.now());
        }
      }

      // Create session and set cookie
      const userAgent = req.headers.get('user-agent') || '';
      const { cookieHeader } = createSession(user.id, user.role, { ip, userAgent, db });

      recordAudit({
        actorId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        action: 'USER_LOGIN',
        result: 'SUCCESS',
        ip,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          username: user.username,
          realName: user.real_name,
          className: user.class_name,
          role: user.role,
          mustChangePassword: user.must_change_password === 1,
        },
        ...(progress ? { progress } : {}),
      });

      response.headers.set('Set-Cookie', cookieHeader);
      return response;
    }

    // 3. LOGOUT
    if (action === 'logout') {
      const auth = authenticateRequest(req);
      if (auth) {
        revokeSession(auth.token, db);
        recordAudit({
          actorId: auth.user.id,
          actorUsername: auth.user.username,
          actorRole: auth.user.role,
          action: 'USER_LOGOUT',
          result: 'SUCCESS',
          ip,
        });
      }

      const response = NextResponse.json({ success: true });
      response.headers.set('Set-Cookie', createClearCookieHeader());
      return response;
    }

    return NextResponse.json(
      { success: false, error: `不支持的操作: ${action}` },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error('Auth API error:', err);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Protected: only authenticated sessions can read user profile
    const auth = authenticateRequest(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '未登录或登录会话已过期' },
        { status: 401 }
      );
    }

    let progress: UserProgressData | undefined;
    if (auth.user.role === 'student') {
      const db = getDatabase();
      const getProg = db.prepare<ProgressRow>(
        'SELECT progress_data FROM user_progress WHERE user_id = ?'
      );
      const progRow = getProg.get(auth.user.id);
      if (progRow) {
        try {
          progress = JSON.parse(progRow.progress_data) as UserProgressData;
        } catch {
          progress = createBaseUserProgress(auth.user.realName);
        }
      } else {
        progress = createBaseUserProgress(auth.user.realName);
      }
    }

    return NextResponse.json({
      success: true,
      user: auth.user,
      ...(progress ? { progress } : {}),
    });
  } catch (err: unknown) {
    console.error('Auth GET API error:', err);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
