import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, type AuthContext } from '../auth/authMiddleware';
import { TeacherServiceError } from './teacherService';

export function requireTeacher(
  request: NextRequest,
  actionName: string
): { context: AuthContext } | { response: NextResponse } {
  return requireAuth(request, { allowedRoles: ['teacher'], actionName });
}

export function teacherErrorResponse(error: unknown): NextResponse {
  if (error instanceof TeacherServiceError) {
    if (error.code.startsWith('FORBIDDEN_')) {
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: 403 });
    }
    if (error.code === 'DUPLICATE_RETRAINING_REQUEST' || error.code === 'DUPLICATE_PHYSICAL_RUBRIC' || error.code === 'DUPLICATE_EVALUATION') {
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: 409 });
    }
    return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: 422 });
  }
  console.error('[teacher-api]', error);
  return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
}
