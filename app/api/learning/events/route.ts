import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/server/auth/authMiddleware';
import { LearningEventError, submitLearningEvent, type LearningEventInput } from '@/src/server/learning/learningEventService';

export async function POST(request: NextRequest) {
  const auth = requireAuth(request, { allowedRoles: ['student'], actionName: 'LEARNING_EVENT_SUBMIT' });
  if ('response' in auth) return auth.response;
  const expectedUser = request.headers.get('x-nev-expected-user');
  if (expectedUser && expectedUser !== encodeURIComponent(auth.context.user.username)) {
    return NextResponse.json({ success: false, code: 'SESSION_CHANGED', error: '账号已在其他页面切换，请刷新页面后重新进入实训' }, { status: 409 });
  }
  let input: LearningEventInput;
  try { input = await request.json() as LearningEventInput; } catch {
    return NextResponse.json({ success: false, code: 'INVALID_EVENT', error: '学习事件格式无效' }, { status: 400 });
  }
  try {
    const result = submitLearningEvent(auth.context.user, input);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof LearningEventError) {
      const conflictCodes = ['MISSING_CURRENT_CLASS', 'MISSING_COURSE_VERSION', 'EVENT_ID_CONFLICT'];
      const status = error.code === 'INVALID_EVENT' ? 400 : conflictCodes.includes(error.code) ? 409 : 422;
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status });
    }
    console.error('[learning-event]', error);
    return NextResponse.json({ success: false, error: '学习事件保存失败' }, { status: 500 });
  }
}
