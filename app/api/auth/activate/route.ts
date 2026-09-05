import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/src/server/auth/session';
import { extractClientIp } from '@/src/server/auth/authMiddleware';
import { recordAudit } from '@/src/server/auth/audit';
import {
  AccountServiceError,
  activateStudentAccount,
} from '@/src/server/accounts/accountService';
import { getDatabase } from '@/src/server/db/database';
import { createBaseUserProgress } from '@/src/types/progress';

export async function POST(req: NextRequest) {
  const ip = extractClientIp(req);
  try {
    const body = (await req.json()) as {
      username?: string;
      activationCode?: string;
      newPassword?: string;
    };
    if (!body.username || !body.activationCode || !body.newPassword) {
      return NextResponse.json(
        { success: false, error: '请输入学号、一次性激活码和新密码' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const account = activateStudentAccount(
      {
        username: body.username,
        activationCode: body.activationCode,
        newPassword: body.newPassword,
      },
      db
    );
    const { cookieHeader } = createSession(account.id, 'student', {
      ip,
      userAgent: req.headers.get('user-agent') || '',
      db,
    });

    recordAudit({
      actorId: account.id,
      actorUsername: account.username,
      actorRole: 'student',
      action: 'STUDENT_ACCOUNT_ACTIVATED',
      targetType: 'user',
      targetId: account.id,
      result: 'SUCCESS',
      ip,
    }, db);

    const response = NextResponse.json({
      success: true,
      user: {
        username: account.username,
        realName: account.real_name,
        className: account.class_name,
        role: 'student',
        mustChangePassword: false,
      },
      progress: createBaseUserProgress(account.real_name),
    });
    response.headers.set('Set-Cookie', cookieHeader);
    return response;
  } catch (err) {
    if (err instanceof AccountServiceError) {
      return NextResponse.json(
        { success: false, code: err.code, error: err.message },
        { status: err.code === 'WEAK_PASSWORD' || err.code === 'MISSING_CLASS_RELATION' ? 400 : 401 }
      );
    }
    console.error('Student activation error:', err);
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}
