import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/server/auth/authMiddleware';
import { getDatabase } from '@/src/server/db/database';
import { getPhysicalEvaluationByAttempt } from '@/src/server/teaching/teacherService';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request, { allowedRoles: ['student'], actionName: 'STUDENT_EVALUATION_READ' });
  if ('response' in auth) return auth.response;

  const attemptId = new URL(request.url).searchParams.get('attemptId');
  if (!attemptId) {
    return NextResponse.json({ success: false, error: '缺少 attemptId' }, { status: 400 });
  }

  const db = getDatabase();
  const attempt = db.prepare<{ student_id: string }>(
    'SELECT student_id FROM learning_attempts WHERE id=?'
  ).get(attemptId);

  if (!attempt) {
    return NextResponse.json({ success: false, error: '未找到实训记录' }, { status: 404 });
  }

  if (attempt.student_id !== auth.context.user.id) {
    return NextResponse.json({ success: false, error: '无权查看他人评价' }, { status: 403 });
  }

  const evaluation = getPhysicalEvaluationByAttempt(attemptId, db);
  if (!evaluation) {
    return NextResponse.json({ success: false, error: '暂无实物量规评价' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    evaluation,
  });
}
