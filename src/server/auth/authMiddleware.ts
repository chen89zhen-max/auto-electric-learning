import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE_NAME, type AuthenticatedUser, type SessionRecord } from './session';
import { recordAudit } from './audit';
import { evaluateAuthenticatedAccess } from './accessPolicy';

export interface AuthContext {
  user: AuthenticatedUser;
  session: SessionRecord;
  token: string;
  ip: string;
  userAgent: string;
}

/**
 * Extracts client IP from incoming Next.js request, taking proxy headers into account.
 */
export function extractClientIp(req: Request | NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/**
 * Extracts session token from Cookie header or Authorization Bearer header.
 */
export function extractSessionToken(req: Request | NextRequest): string | null {
  const cookieHeader = req.headers.get('cookie') || '';
  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    for (const part of cookies) {
      const [key, ...vals] = part.trim().split('=');
      if (key === SESSION_COOKIE_NAME) {
        return vals.join('=').trim();
      }
    }
  }

  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
}

/**
 * Authenticates the incoming request against the server session database.
 * Returns AuthContext if valid, or null.
 */
export function authenticateRequest(req: Request | NextRequest): AuthContext | null {
  const token = extractSessionToken(req);
  if (!token) return null;

  const res = validateSession(token);
  if (!res) return null;

  const ip = extractClientIp(req);
  const userAgent = req.headers.get('user-agent') || '';

  return {
    user: res.user,
    session: res.session,
    token,
    ip,
    userAgent,
  };
}

/**
 * Enforces authentication and role-based access control.
 * Returns an AuthContext on success, or a 401/403 NextResponse on denial.
 */
export function requireAuth(
  req: Request | NextRequest,
  options?: {
    allowedRoles?: Array<'student' | 'teacher' | 'admin'>;
    actionName?: string;
    allowPasswordChangeRequired?: boolean;
  }
): { context: AuthContext } | { response: NextResponse } {
  const ip = extractClientIp(req);
  const actionName = options?.actionName || 'API_ACCESS';
  const auth = authenticateRequest(req);

  if (!auth) {
    recordAudit({
      actorId: null,
      actorUsername: null,
      actorRole: 'anonymous',
      action: actionName,
      result: 'DENIED',
      details: { reason: 'UNAUTHENTICATED' },
      ip,
    });

    return {
      response: NextResponse.json(
        { success: false, error: '未登录或登录会话已过期，请重新登录' },
        { status: 401 }
      ),
    };
  }

  const accessDecision = evaluateAuthenticatedAccess(auth.user, {
    allowPasswordChangeRequired: options?.allowPasswordChangeRequired,
  });
  if (!accessDecision.allowed) {
    recordAudit({
      actorId: auth.user.id,
      actorUsername: auth.user.username,
      actorRole: auth.user.role,
      action: actionName,
      result: 'DENIED',
      details: { reason: accessDecision.code },
      ip,
    });

    return {
      response: NextResponse.json(
        {
          success: false,
          code: accessDecision.code,
          error: accessDecision.message,
        },
        { status: 403 }
      ),
    };
  }

  if (options?.allowedRoles && !options.allowedRoles.includes(auth.user.role)) {
    recordAudit({
      actorId: auth.user.id,
      actorUsername: auth.user.username,
      actorRole: auth.user.role,
      action: actionName,
      result: 'DENIED',
      details: { reason: 'FORBIDDEN_ROLE', allowedRoles: options.allowedRoles },
      ip,
    });

    return {
      response: NextResponse.json(
        { success: false, error: '权限不足：当前角色无权执行此操作' },
        { status: 403 }
      ),
    };
  }

  return { context: auth };
}
