export interface AdminUserItem {
  id: string;
  username: string;
  realName: string;
  role: 'student' | 'teacher' | 'admin';
  className: string;
  status: string;
  mustChangePassword: boolean;
}

export interface AdminClassItem {
  id: string;
  name: string;
  grade: string;
  cohortYear: number;
  status: 'active' | 'archived' | 'deleted';
  studentCount: number;
  teachers: Array<{ id: string; realName: string }>;
}

export interface TeacherClassItem {
  id: string;
  teacherId: string;
  classId: string;
  courseId: string;
  status: string;
  realName: string;
  className: string;
}

export interface StudentClassItem {
  id: string;
  studentId: string;
  classId: string;
  isCurrent: number;
  realName: string;
  className: string;
}

export interface AuditItem {
  id: string;
  actorUsername: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  result: string;
  occurredAt: number;
}

export type AdminMutation = (
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body: Record<string, unknown>
) => Promise<void>;
