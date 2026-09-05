import { NextRequest, NextResponse } from 'next/server';
import { adminErrorResponse, readJsonObject, requireSystemAdmin } from '@/src/server/admin/adminHttp';
import { assignTeacherToClass, revokeTeacherFromClass } from '@/src/server/db/classService';
import { getDatabase } from '@/src/server/db/database';

export async function GET(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_TEACHER_CLASSES_READ');
  if ('response' in auth) return auth.response;
  const rows = getDatabase().prepare(
    `SELECT tc.id,tc.teacher_id teacherId,tc.class_id classId,tc.course_id courseId,
            tc.valid_from validFrom,tc.valid_to validTo,tc.status,
            u.username,u.real_name realName,c.name className
     FROM teacher_class tc
     JOIN users u ON u.id=tc.teacher_id
     JOIN classes c ON c.id=tc.class_id
     ORDER BY tc.created_at DESC`
  ).all();
  return NextResponse.json({ success: true, assignments: rows });
}

export async function POST(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_TEACHER_CLASSES_CREATE');
  if ('response' in auth) return auth.response;
  const body = await readJsonObject(request);
  if (!body || typeof body.teacherId !== 'string' || typeof body.classId !== 'string') {
    return NextResponse.json({ success: false, error: '缺少 teacherId 或 classId' }, { status: 400 });
  }
  try {
    const assignment = assignTeacherToClass({
      teacherId: body.teacherId,
      classId: body.classId,
      courseId: typeof body.courseId === 'string' ? body.courseId : undefined,
      actorId: auth.context.user.id,
    });
    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_TEACHER_CLASSES_DELETE');
  if ('response' in auth) return auth.response;
  const body = await readJsonObject(request);
  if (!body || typeof body.teacherId !== 'string' || typeof body.classId !== 'string') {
    return NextResponse.json({ success: false, error: '缺少 teacherId 或 classId' }, { status: 400 });
  }
  try {
    revokeTeacherFromClass(body.teacherId, body.classId, auth.context.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
