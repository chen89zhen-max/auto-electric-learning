import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/server/auth/authMiddleware';
import { isC7EvidenceLevelId } from '@/src/types/attemptEvidence';
import { listAttemptEvidence } from '@/src/server/learning/attemptEvidenceService';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request, { allowedRoles: ['student'], actionName: 'LEARNING_ATTEMPTS_READ' });
  if ('response' in auth) return auth.response;

  const url = new URL(request.url);
  if (url.searchParams.has('studentId') || url.searchParams.has('username')) {
    return NextResponse.json({ success: false, error: '禁止指定目标学生身份' }, { status: 400 });
  }

  const levelId = url.searchParams.get('levelId');
  if (!levelId || !isC7EvidenceLevelId(levelId)) {
    return NextResponse.json({ success: false, error: '无效或不支持的关卡ID' }, { status: 400 });
  }

  try {
    const result = listAttemptEvidence({
      studentId: auth.context.user.id,
      levelId,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[learning-attempts]', error);
    return NextResponse.json({ success: false, error: '过程证据读取失败' }, { status: 500 });
  }
}
