import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/server/auth/authMiddleware';
import { getDatabase } from '@/src/server/db/database';
import { getPhysicalEvaluationByAttempt } from '@/src/server/teaching/teacherService';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request, { allowedRoles: ['student'], actionName: 'STUDENT_EVALUATION_READ' });
  if ('response' in auth) return auth.response;

  const db = getDatabase();
  const searchParams = new URL(request.url).searchParams;
  const requestedAttemptId = searchParams.get('attemptId');
  const levelId = searchParams.get('levelId');
  if (!requestedAttemptId && !levelId) {
    return NextResponse.json({ success: false, error: '缺少 attemptId 或 levelId' }, { status: 400 });
  }

  const attempt = requestedAttemptId
    ? db.prepare<{ id: string; student_id: string }>(
        'SELECT id, student_id FROM learning_attempts WHERE id=?'
      ).get(requestedAttemptId)
    : db.prepare<{ id: string; student_id: string }>(
        `SELECT id, student_id
         FROM learning_attempts
         WHERE student_id=? AND level_id=? AND status='completed'
         ORDER BY COALESCE(completed_at, started_at) DESC, id DESC
         LIMIT 1`
      ).get(auth.context.user.id, levelId);

  if (!attempt) {
    return NextResponse.json({ success: false, error: '未找到实训记录' }, { status: 404 });
  }

  if (attempt.student_id !== auth.context.user.id) {
    return NextResponse.json({ success: false, error: '无权查看他人评价' }, { status: 403 });
  }

  const evaluation = getPhysicalEvaluationByAttempt(attempt.id, db);
  if (!evaluation) {
    return NextResponse.json({ success: false, error: '暂无实物量规评价' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    evaluation,
  });
}
