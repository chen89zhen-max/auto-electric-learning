import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/src/server/auth/authMiddleware';
import { createSession } from '@/src/server/auth/session';
import { recordAudit } from '@/src/server/auth/audit';
import {
  AccountServiceError,
  changeAccountPassword,
} from '@/src/server/accounts/accountService';
import { getDatabase } from '@/src/server/db/database';

export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: '未登录或登录会话已过期，请重新登录' },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!body.currentPassword || !body.newPassword) {
      return NextResponse.json(
        { success: false, error: '请输入当前密码和新密码' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const account = changeAccountPassword(
      {
        userId: auth.user.id,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      },
      db
    );

    const { cookieHeader } = createSession(account.id, account.role, {
      ip: auth.ip,
      userAgent: auth.userAgent,
      db,
    });
    recordAudit({
      actorId: account.id,
      actorUsername: account.username,
      actorRole: account.role,
      action: 'PASSWORD_CHANGED',
      targetType: 'user',
      targetId: account.id,
      result: 'SUCCESS',
      ip: auth.ip,
    }, db);

    const response = NextResponse.json({
      success: true,
      user: {
        username: account.username,
        realName: account.real_name,
        className: account.class_name,
        role: account.role,
        mustChangePassword: false,
      },
    });
    response.headers.set('Set-Cookie', cookieHeader);
    return response;
  } catch (err) {
    if (err instanceof AccountServiceError) {
      return NextResponse.json(
        { success: false, code: err.code, error: err.message },
        { status: err.code === 'INVALID_CURRENT_PASSWORD' ? 401 : 400 }
      );
    }
    console.error('Change password error:', err);
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}
