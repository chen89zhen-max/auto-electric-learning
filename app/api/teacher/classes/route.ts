import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/src/server/teaching/teacherHttp';
import { listTeacherClasses } from '@/src/server/teaching/teacherService';

export async function GET(request: NextRequest) {
  const auth = requireTeacher(request, 'TEACHER_CLASSES_READ');
  if ('response' in auth) return auth.response;
  return NextResponse.json({ success: true, classes: listTeacherClasses(auth.context.user.id) });
}
