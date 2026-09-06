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

export interface E07PhysicalRubricData {
  pre_power_check: number;
  component_orientation: number;
  solder_quality: number;
  safety_process: number;
  evidence_explanation: number;
}

export interface TeacherStudentE07Attempt {
  attemptId: string;
  attemptScore: number | null;
  completedAt: number;
  hasPhysicalRubric: boolean;
  physicalEvaluation?: {
    id: string;
    teacherName: string;
    totalScore: number;
    signedAt: number;
    comment: string | null;
    rubricData: Record<string, number>;
  };
}
