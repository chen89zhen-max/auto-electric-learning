import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/server/auth/authMiddleware';
import { recordAudit } from '@/src/server/auth/audit';
import { getAuthorizedStudents, getTeacherAssignedClasses } from '@/src/server/db/classService';
import { getDatabase } from '@/src/server/db/database';
import { createBaseUserProgress, type LevelId, type UserProgressData } from '@/src/types/progress';

/**
 * Transitional read-only endpoint retained for older teacher clients.
 * New clients use /api/teacher/*; system administrators use /api/admin/{resource}.
 */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request, { allowedRoles: ['teacher'], actionName: 'LEGACY_TEACHER_READ' });
  if ('response' in auth) return auth.response;
  const db = getDatabase();
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'students';
  const classId = url.searchParams.get('classId')?.trim() || null;

  if (action === 'classes') {
    return NextResponse.json({ success: true, classes: getTeacherAssignedClasses(auth.context.user.id, db) });
  }
  if (action === 'teachers') {
    return NextResponse.json({ success: false, error: '权限不足：教师不能读取全校教师账号' }, { status: 403 });
  }

  let rows;
  try {
    rows = getAuthorizedStudents({
      callerRole: 'teacher',
      callerId: auth.context.user.id,
      classIdFilter: classId,
    }, db);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('FORBIDDEN_CLASS')) {
      recordAudit({
        actorId: auth.context.user.id,
        actorUsername: auth.context.user.username,
        actorRole: auth.context.user.role,
        action: 'TEACHER_FORBIDDEN_CLASS_READ_ATTEMPT',
        targetType: 'class',
        targetId: classId,
        result: 'DENIED',
        ip: auth.context.ip,
      }, db);
      return NextResponse.json({ success: false, error: '权限不足：不能查看未授权班级的学生数据' }, { status: 403 });
    }
    console.error('[legacy-teacher-read]', error);
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }

  const students = rows.map((row) => {
    let progress = createBaseUserProgress(row.realName);
    if (row.progressData) {
      try { progress = JSON.parse(row.progressData) as UserProgressData; } catch {}
    }
    const completedLevelsCount = Object.values(progress.levels).filter((level) => level.status === 'completed').length;
    return {
      id: row.id,
      username: row.username,
      realName: row.realName,
      className: row.className,
      classId: row.classId,
      createdAt: row.createdAt,
      progress,
      completedLevelsCount,
      totalLevelsCount: 10,
      lastUpdated: progress.lastUpdated || row.createdAt,
    };
  });

  if (action === 'export_csv') {
    const lines = ['学号/账号,真实姓名,班级,已完成关卡数,最后活跃时间'];
    for (const student of students) {
      lines.push([
        student.username,
        student.realName,
        student.className,
        String(student.completedLevelsCount),
        new Date(student.lastUpdated).toISOString(),
      ].map(csvCell).join(','));
    }
    return new NextResponse(`\uFEFF${lines.join('\r\n')}`, {
      headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="class_learning.csv"' },
    });
  }

  const totalStudents = students.length;
  const countCompleted = (levelId: LevelId) => students.filter((student) => student.progress.levels[levelId]?.status === 'completed').length;
  const l0Passed = countCompleted('LEVEL_00');
  const l1Passed = countCompleted('LEVEL_01');
  const l2Passed = countCompleted('LEVEL_02');
  const rate = (count: number) => totalStudents > 0 ? Math.round(count * 100 / totalStudents) : 0;
  return NextResponse.json({
    success: true,
    students,
    stats: {
      totalStudents,
      l0Passed,
      l1Passed,
      l2Passed,
      allPassed: students.filter((student) => (['LEVEL_00', 'LEVEL_01', 'LEVEL_02'] as LevelId[]).every(
        (levelId) => student.progress.levels[levelId]?.status === 'completed'
      )).length,
      l0Rate: rate(l0Passed),
      l1Rate: rate(l1Passed),
      l2Rate: rate(l2Passed),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request, { allowedRoles: [], actionName: 'LEGACY_ADMIN_MUTATION_DISABLED' });
  if ('response' in auth) return auth.response;
  return NextResponse.json({ success: false, error: '旧管理写入接口已停用' }, { status: 410 });
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
