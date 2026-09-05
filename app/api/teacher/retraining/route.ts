import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, teacherErrorResponse } from '@/src/server/teaching/teacherHttp';
import { requestStudentRetraining } from '@/src/server/teaching/teacherService';

export async function POST(request: NextRequest) {
  const auth = requireTeacher(request, 'TEACHER_RETRAINING_REQUEST');
  if ('response' in auth) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch {
    return NextResponse.json({ success: false, error: '请求格式无效' }, { status: 400 });
  }
  if (typeof body.studentId !== 'string' || typeof body.reason !== 'string') {
    return NextResponse.json({ success: false, error: '缺少学生或重训原因' }, { status: 400 });
  }
  try {
    const requestRecord = requestStudentRetraining({
      teacherId: auth.context.user.id,
      studentId: body.studentId,
      attemptId: typeof body.attemptId === 'string' ? body.attemptId : undefined,
      reason: body.reason,
    });
    return NextResponse.json({ success: true, request: requestRecord }, { status: 201 });
  } catch (error) {
    return teacherErrorResponse(error);
  }
}
