import { NextRequest, NextResponse } from 'next/server';
import { adminErrorResponse, readJsonObject, requireSystemAdmin } from '@/src/server/admin/adminHttp';
import { assignStudentToClass, transferStudent } from '@/src/server/db/classService';
import { getDatabase } from '@/src/server/db/database';

export async function GET(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_STUDENT_CLASSES_READ');
  if ('response' in auth) return auth.response;
  const url = new URL(request.url);
  const studentId = url.searchParams.get('studentId');
  const where = studentId ? 'WHERE sc.student_id=?' : '';
  const rows = getDatabase().prepare(
    `SELECT sc.id,sc.student_id studentId,sc.class_id classId,sc.valid_from validFrom,
            sc.valid_to validTo,sc.is_current isCurrent,c.name className,u.username,u.real_name realName
     FROM student_class sc
     JOIN users u ON u.id=sc.student_id
     JOIN classes c ON c.id=sc.class_id
     ${where}
     ORDER BY sc.created_at DESC`
  ).all(...(studentId ? [studentId] : []));
  return NextResponse.json({ success: true, relations: rows });
}

export async function POST(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_STUDENT_CLASSES_CREATE');
  if ('response' in auth) return auth.response;
  const body = await readJsonObject(request);
  if (!body || typeof body.studentId !== 'string' || typeof body.classId !== 'string') {
    return NextResponse.json({ success: false, error: '缺少 studentId 或 classId' }, { status: 400 });
  }
  try {
    const relation = assignStudentToClass(body.studentId, body.classId, auth.context.user.id);
    return NextResponse.json({ success: true, relation }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_STUDENT_CLASSES_TRANSFER');
  if ('response' in auth) return auth.response;
  const body = await readJsonObject(request);
  if (!body || typeof body.studentId !== 'string' || typeof body.newClassId !== 'string') {
    return NextResponse.json({ success: false, error: '缺少 studentId 或 newClassId' }, { status: 400 });
  }
  try {
    const relation = transferStudent(body.studentId, body.newClassId, auth.context.user.id);
    return NextResponse.json({ success: true, relation });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
