import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, teacherErrorResponse } from '@/src/server/teaching/teacherHttp';
import { isC7EvidenceLevelId } from '@/src/types/attemptEvidence';
import { listStudentAttemptEvidence } from '@/src/server/teaching/teacherService';

export async function GET(request: NextRequest) {
  const auth = requireTeacher(request, 'TEACHER_STUDENT_EVIDENCE_READ');
  if ('response' in auth) return auth.response;

  const url = new URL(request.url);
  const studentId = url.searchParams.get('studentId');
  if (!studentId) {
    return NextResponse.json({ success: false, error: '缺少 studentId' }, { status: 400 });
  }

  const levelId = url.searchParams.get('levelId');
  if (!levelId || !isC7EvidenceLevelId(levelId)) {
    return NextResponse.json({ success: false, error: '无效或不支持的关卡ID' }, { status: 400 });
  }

  try {
    const result = listStudentAttemptEvidence(auth.context.user.id, studentId, levelId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return teacherErrorResponse(error);
  }
}
