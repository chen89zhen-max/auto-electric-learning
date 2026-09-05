import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/server/auth/authMiddleware';
import { recordAudit } from '@/src/server/auth/audit';
import { isTeacherAuthorizedForStudent } from '@/src/server/db/classService';
import { getDatabase } from '@/src/server/db/database';
import { evaluateRawProgressWrite } from '@/src/server/learning/progressPolicy';
import { createBaseUserProgress, type UserProgressData } from '@/src/types/progress';

interface UserLookupRow {
  id: string;
  username: string;
  real_name: string;
}

export async function GET(request: NextRequest) {
  const auth = requireAuth(request, { actionName: 'PROGRESS_GET' });
  if ('response' in auth) return auth.response;
  const db = getDatabase();
  const requestedUsername = new URL(request.url).searchParams.get('username')?.trim().toLowerCase();
  let targetUserId = auth.context.user.id;
  let targetRealName = auth.context.user.realName;

  if (requestedUsername && requestedUsername !== auth.context.user.username.toLowerCase()) {
    if (auth.context.user.role === 'student') {
      recordAudit({
        actorId: auth.context.user.id,
        actorUsername: auth.context.user.username,
        actorRole: auth.context.user.role,
        action: 'PROGRESS_HORIZONTAL_READ_ATTEMPT',
        targetType: 'user',
        targetId: requestedUsername,
        result: 'DENIED',
        ip: auth.context.ip,
      }, db);
      return NextResponse.json({ success: false, error: '权限不足：学生不能查看其他学生的实训数据' }, { status: 403 });
    }
    const target = db.prepare<UserLookupRow>(
      "SELECT id,username,real_name FROM users WHERE username=? AND role='student' AND status!='deleted'"
    ).get(requestedUsername);
    if (!target) return NextResponse.json({ success: false, error: '未找到指定学生' }, { status: 404 });
    if (auth.context.user.role === 'teacher'
      && !isTeacherAuthorizedForStudent(auth.context.user.id, target.id, db)) {
      recordAudit({
        actorId: auth.context.user.id,
        actorUsername: auth.context.user.username,
        actorRole: auth.context.user.role,
        action: 'TEACHER_CROSS_CLASS_STUDENT_PROGRESS_DENIED',
        targetType: 'user',
        targetId: target.id,
        result: 'DENIED',
        ip: auth.context.ip,
      }, db);
      return NextResponse.json({ success: false, error: '权限不足：教师不能跨班查看非任教学生的实训进度' }, { status: 403 });
    }
    targetUserId = target.id;
    targetRealName = target.real_name;
  }

  const row = db.prepare<{ progress_data: string }>(
    'SELECT progress_data FROM user_progress WHERE user_id=?'
  ).get(targetUserId);
  let progress = createBaseUserProgress(targetRealName);
  if (row?.progress_data) {
    try { progress = JSON.parse(row.progress_data) as UserProgressData; } catch {}
  }
  return NextResponse.json({ success: true, progress });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request, { actionName: 'PROGRESS_POST_DEPRECATED' });
  if ('response' in auth) return auth.response;
  let username: string | undefined;
  try {
    const body = await request.json() as { username?: unknown };
    username = typeof body.username === 'string' ? body.username : undefined;
  } catch {}
  const decision = evaluateRawProgressWrite(auth.context.user, username);
  if (!decision.allowed) {
    const error = decision.reason === 'OTHER_STUDENT'
      ? '权限不足：学生不能篡改其他学生的实训进度；原始学习进度提交已停用'
      : '权限不足：原始学习进度只有学生本人可以提交';
    return NextResponse.json({ success: false, error }, { status: 403 });
  }
  return NextResponse.json(
    { success: false, code: 'PROGRESS_POST_DEPRECATED', error: '整份进度提交已停用，请提交学习事件' },
    { status: 410 }
  );
}
