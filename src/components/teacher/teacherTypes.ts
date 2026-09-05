import type { UserProgressData } from '@/src/types/progress';

export interface TeacherClassItem {
  id: string;
  name: string;
  grade: string;
  cohortYear: number;
}

export interface TeacherStudentItem {
  id: string;
  username: string;
  realName: string;
  classId: string;
  className: string;
  progress: UserProgressData;
  completedLevels: number;
  lastUpdated: number;
}
