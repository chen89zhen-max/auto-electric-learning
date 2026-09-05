import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, teacherErrorResponse } from '@/src/server/teaching/teacherHttp';
import { createTeacherEvaluation, listTeacherEvaluations } from '@/src/server/teaching/teacherService';

export async function GET(request: NextRequest) {
  const auth = requireTeacher(request, 'TEACHER_EVALUATIONS_READ');
  if ('response' in auth) return auth.response;
  const studentId = new URL(request.url).searchParams.get('studentId');
  if (!studentId) return NextResponse.json({ success: false, error: '缺少 studentId' }, { status: 400 });
  try {
    return NextResponse.json({ success: true, evaluations: listTeacherEvaluations(auth.context.user.id, studentId) });
  } catch (error) {
    return teacherErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireTeacher(request, 'TEACHER_EVALUATIONS_CREATE');
  if ('response' in auth) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch {
    return NextResponse.json({ success: false, error: '请求格式无效' }, { status: 400 });
  }
  if (typeof body.studentId !== 'string' || typeof body.comment !== 'string') {
    return NextResponse.json({ success: false, error: '缺少学生或评价内容' }, { status: 400 });
  }
  try {
    const evaluation = createTeacherEvaluation({
      teacherId: auth.context.user.id,
      studentId: body.studentId,
      attemptId: typeof body.attemptId === 'string' ? body.attemptId : undefined,
      score: typeof body.score === 'number' ? body.score : undefined,
      comment: body.comment,
    });
    return NextResponse.json({ success: true, evaluation }, { status: 201 });
  } catch (error) {
    return teacherErrorResponse(error);
  }
}
