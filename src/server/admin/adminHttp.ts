import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, type AuthContext } from '../auth/authMiddleware';
import { OrganizationRuleError } from '../db/classService';
import { AdminServiceError } from './adminService';

export function requireSystemAdmin(
  request: NextRequest,
  actionName: string
): { context: AuthContext } | { response: NextResponse } {
  return requireAuth(request, { allowedRoles: ['admin'], actionName });
}

export function adminErrorResponse(error: unknown): NextResponse {
  if (error instanceof AdminServiceError) {
    if (error.code.endsWith('_NOT_FOUND')) {
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: 404 });
    }
    if (['USERNAME_CONFLICT', 'LAST_ACTIVE_ADMIN', 'CLASS_HAS_ACTIVE_RELATIONS'].includes(error.code)) {
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: 409 });
    }
    return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: 422 });
  }
  if (error instanceof OrganizationRuleError) {
    if (error.code.endsWith('_NOT_FOUND')) {
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: 404 });
    }
    const conflict = ['DUPLICATE_TEACHER_ASSIGNMENT', 'TEACHER_ASSIGNMENT_NOT_FOUND'];
    return NextResponse.json(
      { success: false, code: error.code, error: error.message },
      { status: conflict.includes(error.code) ? 409 : 422 }
    );
  }
  if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) {
    return NextResponse.json({ success: false, code: 'RESOURCE_CONFLICT', error: '资源已存在' }, { status: 409 });
  }
  console.error('[admin-api]', error);
  return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
}

export async function readJsonObject(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
