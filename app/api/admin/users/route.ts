import { NextRequest, NextResponse } from 'next/server';
import {
  changeManagedUserStatus,
  createManagedUser,
  listManagedUsers,
  resetManagedUserPassword,
  updateManagedUserProfile,
} from '@/src/server/admin/adminService';
import { adminErrorResponse, readJsonObject, requireSystemAdmin } from '@/src/server/admin/adminHttp';
import { getDatabase } from '@/src/server/db/database';

export async function GET(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_USERS_READ');
  if ('response' in auth) return auth.response;
  const url = new URL(request.url);
  return NextResponse.json({
    success: true,
    users: listManagedUsers({ role: url.searchParams.get('role'), status: url.searchParams.get('status') }),
  });
}

export async function POST(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_USERS_CREATE');
  if ('response' in auth) return auth.response;
  const body = await readJsonObject(request);
  const role = body?.role;
  if (!body || typeof body.username !== 'string' || typeof body.realName !== 'string'
    || !['student', 'teacher', 'admin'].includes(String(role))) {
    return NextResponse.json({ success: false, error: '账号、姓名或角色参数无效' }, { status: 400 });
  }
  try {
    const result = createManagedUser({
      username: body.username,
      realName: body.realName,
      role: role as 'student' | 'teacher' | 'admin',
      classId: typeof body.classId === 'string' ? body.classId : undefined,
      actorId: auth.context.user.id,
    });
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_USERS_UPDATE');
  if ('response' in auth) return auth.response;
  const body = await readJsonObject(request);
  if (!body || typeof body.userId !== 'string') {
    return NextResponse.json({ success: false, error: '缺少 userId' }, { status: 400 });
  }
  try {
    if (body.operation === 'reset_password') {
      return NextResponse.json({
        success: true,
        ...resetManagedUserPassword({ userId: body.userId, actorId: auth.context.user.id }),
      });
    }
    if (typeof body.realName === 'string') {
      return NextResponse.json({
        success: true,
        user: updateManagedUserProfile({
          userId: body.userId,
          realName: body.realName,
          actorId: auth.context.user.id,
        }),
      });
    }
    if (typeof body.status !== 'string') {
      return NextResponse.json({ success: false, error: '缺少 status' }, { status: 400 });
    }
    const user = changeManagedUserStatus({
      userId: body.userId,
      status: body.status,
      actorId: auth.context.user.id,
    });
    return NextResponse.json({ success: true, user });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireSystemAdmin(request, 'ADMIN_USERS_DELETE');
  if ('response' in auth) return auth.response;
  const body = await readJsonObject(request);
  if (!body || typeof body.userId !== 'string') {
    return NextResponse.json({ success: false, error: '缺少 userId' }, { status: 400 });
  }
  try {
    const user = changeManagedUserStatus({
      userId: body.userId,
      status: 'deleted',
      actorId: auth.context.user.id,
    }, getDatabase());
    return NextResponse.json({ success: true, user });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
