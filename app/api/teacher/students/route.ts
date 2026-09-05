import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, teacherErrorResponse } from '@/src/server/teaching/teacherHttp';
import { listTeacherStudents } from '@/src/server/teaching/teacherService';

export async function GET(request: NextRequest) {
  const auth = requireTeacher(request, 'TEACHER_STUDENTS_READ');
  if ('response' in auth) return auth.response;
  const url = new URL(request.url);
  try {
    const students = listTeacherStudents(auth.context.user.id, url.searchParams.get('classId'));
    if (url.searchParams.get('format') === 'csv') {
      const lines = ['学号,姓名,班级,已完成关卡数,最后更新时间'];
      for (const student of students) {
        const values = [student.username, student.realName, student.className, String(student.completedLevels), new Date(student.lastUpdated).toISOString()];
        lines.push(values.map(csvCell).join(','));
      }
      return new NextResponse(`\uFEFF${lines.join('\r\n')}`, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="class_learning_${Date.now()}.csv"`,
        },
      });
    }
    return NextResponse.json({ success: true, students });
  } catch (error) {
    return teacherErrorResponse(error);
  }
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
