import { NextRequest, NextResponse } from 'next/server';
import { changeClassStatus, updateClassDetails } from '@/src/server/admin/adminService';
import { adminErrorResponse, readJsonObject, requireSystemAdmin } from '@/src/server/admin/adminHttp';
import { createClass, listAllClasses } from '@/src/server/db/classService';

export async function GET(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_CLASSES_READ');
  if ('response' in auth) return auth.response;
  return NextResponse.json({ success: true, classes: listAllClasses() });
}

export async function POST(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_CLASSES_CREATE');
  if ('response' in auth) return auth.response;
  const body = await readJsonObject(request);
  if (!body || typeof body.name !== 'string') {
    return NextResponse.json({ success: false, error: '缺少班级名称' }, { status: 400 });
  }
  try {
    const cohortYear = typeof body.cohortYear === 'number' && Number.isInteger(body.cohortYear)
      ? body.cohortYear
      : undefined;
    const created = createClass({
      name: body.name,
      grade: typeof body.grade === 'string' ? body.grade : undefined,
      cohortYear,
      actorId: auth.context.user.id,
    });
    return NextResponse.json({ success: true, class: created }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_CLASSES_UPDATE');
  if ('response' in auth) return auth.response;
  const body = await readJsonObject(request);
  if (!body || typeof body.classId !== 'string') {
    return NextResponse.json({ success: false, error: '缺少 classId' }, { status: 400 });
  }
  try {
    if (typeof body.name === 'string' && typeof body.grade === 'string'
      && typeof body.cohortYear === 'number') {
      updateClassDetails({
        classId: body.classId,
        name: body.name,
        grade: body.grade,
        cohortYear: body.cohortYear,
        actorId: auth.context.user.id,
      });
      return NextResponse.json({ success: true });
    }
    if (!['active', 'archived'].includes(String(body.status))) {
      return NextResponse.json({ success: false, error: '班级状态参数无效' }, { status: 400 });
    }
    changeClassStatus({
      classId: body.classId,
      status: body.status as 'active' | 'archived',
      actorId: auth.context.user.id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_CLASSES_DELETE');
  if ('response' in auth) return auth.response;
  const body = await readJsonObject(request);
  if (!body || typeof body.classId !== 'string') {
    return NextResponse.json({ success: false, error: '缺少 classId' }, { status: 400 });
  }
  try {
    changeClassStatus({ classId: body.classId, status: 'deleted', actorId: auth.context.user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
