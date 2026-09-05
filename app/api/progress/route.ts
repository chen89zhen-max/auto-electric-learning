import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/src/server/db/database';
import { requireAuth } from '@/src/server/auth/authMiddleware';
import { recordAudit } from '@/src/server/auth/audit';
import { createBaseUserProgress, type LevelId, type UserProgressData } from '@/src/types/progress';
import { isTeacherAuthorizedForStudent } from '@/src/server/db/classService';
import { evaluateRawProgressWrite } from '@/src/server/learning/progressPolicy';

const PREREQUISITE_RULES: Partial<Record<LevelId, LevelId>> = {
  LEVEL_01: 'LEVEL_00',
  LEVEL_02: 'LEVEL_01',
  LEVEL_03: 'LEVEL_02',
  LEVEL_04: 'LEVEL_03',
  LEVEL_05: 'LEVEL_04',
  LEVEL_06: 'LEVEL_05',
  LEVEL_07: 'LEVEL_06',
  LEVEL_08: 'LEVEL_07',
  LEVEL_09: 'LEVEL_08',
};

interface UserLookupRow {
  id: string;
  username: string;
  real_name: string;
  role: string;
}

interface ProgressRow {
  progress_data: string;
}

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req, { actionName: 'PROGRESS_GET' });
  if ('response' in authResult) {
    return authResult.response;
  }
  const { context } = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const requestedUsername = searchParams.get('username')?.trim().toLowerCase();
    const db = getDatabase();

    let targetUserId = context.user.id;
    let targetRealName = context.user.realName;

    // If querying another student
    if (requestedUsername && requestedUsername !== context.user.username.toLowerCase()) {
      // Only admin or teacher can read other students' progress
      if (context.user.role === 'student') {
        recordAudit({
          actorId: context.user.id,
          actorUsername: context.user.username,
          actorRole: context.user.role,
          action: 'PROGRESS_HORIZONTAL_READ_ATTEMPT',
          targetType: 'user',
          targetId: requestedUsername,
          result: 'DENIED',
          ip: context.ip,
        });

        return NextResponse.json(
          { success: false, error: '权限不足：学生不能查看其他学生的实训数据' },
          { status: 403 }
        );
      }

      const targetUser = db.prepare<UserLookupRow>(
        'SELECT id, username, real_name, role FROM users WHERE username = ?'
      ).get(requestedUsername);

      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: '未找到指定用户' },
          { status: 404 }
        );
      }

      if (context.user.role === 'teacher') {
        const authorized = isTeacherAuthorizedForStudent(context.user.id, targetUser.id, db);
        if (!authorized) {
          recordAudit({
            actorId: context.user.id,
            actorUsername: context.user.username,
            actorRole: context.user.role,
            action: 'TEACHER_CROSS_CLASS_STUDENT_PROGRESS_DENIED',
            targetType: 'user',
            targetId: targetUser.id,
            result: 'DENIED',
            details: { requestedUsername },
            ip: context.ip,
          }, db);

          return NextResponse.json(
            { success: false, error: '权限不足：教师不能跨班查看非任教学生的实训进度' },
            { status: 403 }
          );
        }
      }

      targetUserId = targetUser.id;
      targetRealName = targetUser.real_name;
    }

    const row = db.prepare<ProgressRow>(
      'SELECT progress_data FROM user_progress WHERE user_id = ?'
    ).get(targetUserId);

    let progress: UserProgressData;
    if (row?.progress_data) {
      try {
        progress = JSON.parse(row.progress_data) as UserProgressData;
      } catch {
        progress = createBaseUserProgress(targetRealName);
      }
    } else {
      progress = createBaseUserProgress(targetRealName);
    }

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (err: unknown) {
    console.error('Progress GET API error:', err);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req, { actionName: 'PROGRESS_POST' });
  if ('response' in authResult) {
    return authResult.response;
  }
  const { context } = authResult;

  try {
    const body = (await req.json()) as { username?: string; progress?: UserProgressData };
    const { username, progress } = body;

    if (!progress || typeof progress !== 'object' || !progress.levels) {
      return NextResponse.json(
        { success: false, error: '缺少有效的 progress 实训数据' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const writeDecision = evaluateRawProgressWrite(context.user, username);
    if (!writeDecision.allowed) {
      recordAudit({
        actorId: context.user.id,
        actorUsername: context.user.username,
        actorRole: context.user.role,
        action:
          writeDecision.reason === 'OTHER_STUDENT'
            ? 'PROGRESS_HORIZONTAL_WRITE_ATTEMPT'
            : 'NON_STUDENT_RAW_PROGRESS_WRITE_ATTEMPT',
        targetType: 'user',
        targetId: username || context.user.id,
        result: 'DENIED',
        details: { reason: writeDecision.reason },
        ip: context.ip,
      }, db);

      return NextResponse.json(
        {
          success: false,
          error:
            writeDecision.reason === 'OTHER_STUDENT'
              ? '权限不足：学生不能篡改其他学生的实训进度；原始学习进度只有学生本人可以提交'
              : '权限不足：原始学习进度只有学生本人可以提交',
        },
        { status: 403 }
      );
    }

    const targetUserId = context.user.id;
    const targetRealName = context.user.realName;

    // 1. Sanitize teacherMode: Students are NEVER allowed to enable teacherMode
    const sanitizedTeacherMode = context.user.role === 'student' ? false : !!progress.teacherMode;

    // 2. Validate level progression and sanitize forged completions
    const sanitizedLevels = { ...progress.levels };

    for (const [levelKey, prereqKey] of Object.entries(PREREQUISITE_RULES)) {
      const lid = levelKey as LevelId;
      const prereq = prereqKey as LevelId;
      const levelItem = sanitizedLevels[lid];

      if (levelItem?.status === 'completed' && !sanitizedTeacherMode) {
        // Must verify prerequisite is completed
        const prereqItem = sanitizedLevels[prereq];
        if (!prereqItem || prereqItem.status !== 'completed') {
          // Reject skip-level forged progression!
          recordAudit({
            actorId: context.user.id,
            actorUsername: context.user.username,
            actorRole: context.user.role,
            action: 'PROGRESS_SKIP_LEVEL_BLOCKED',
            targetType: 'level',
            targetId: lid,
            result: 'DENIED',
            details: { reason: `Prerequisite ${prereq} not completed` },
            ip: context.ip,
          });

          return NextResponse.json(
            {
              success: false,
              error: `关卡非法跳过：未完成前置关卡【${prereq}】，不可直接提交【${lid}】成绩`,
            },
            { status: 400 }
          );
        }
      }

      // Sanitize score range
      if (levelItem && typeof levelItem.score === 'number') {
        levelItem.score = Math.max(0, Math.min(100, Math.round(levelItem.score)));
      }
    }

    const validatedProgress: UserProgressData = {
      version: 1,
      traineeName: targetRealName,
      currentActiveLevel: progress.currentActiveLevel || 'LEVEL_00',
      teacherMode: sanitizedTeacherMode,
      lastUpdated: Date.now(),
      levels: sanitizedLevels,
    };

    db.prepare(
      `INSERT INTO user_progress (user_id, progress_data, version, last_updated)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         progress_data = excluded.progress_data,
         last_updated = excluded.last_updated`
    ).run(targetUserId, JSON.stringify(validatedProgress), Date.now());

    recordAudit({
      actorId: context.user.id,
      actorUsername: context.user.username,
      actorRole: context.user.role,
      action: 'PROGRESS_SAVED',
      targetType: 'user',
      targetId: targetUserId,
      result: 'SUCCESS',
      ip: context.ip,
    });

    return NextResponse.json({
      success: true,
      progress: validatedProgress,
    });
  } catch (err: unknown) {
    console.error('Progress POST API error:', err);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
