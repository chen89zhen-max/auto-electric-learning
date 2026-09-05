export type ProgressActorRole = 'student' | 'teacher' | 'admin';

export interface RawProgressWriteActor {
  id: string;
  username: string;
  role: ProgressActorRole;
}

export interface ProgressWriteDecision {
  allowed: boolean;
  reason: 'CURRENT_STUDENT' | 'NON_STUDENT_ROLE' | 'OTHER_STUDENT';
}

/**
 * Transitional policy for the legacy whole-progress endpoint.
 * Only the authenticated student may write their own record. Teacher and admin
 * workflows must use dedicated, audited teaching or correction endpoints.
 */
export function evaluateRawProgressWrite(
  actor: RawProgressWriteActor,
  requestedUsername?: string
): ProgressWriteDecision {
  if (actor.role !== 'student') {
    return { allowed: false, reason: 'NON_STUDENT_ROLE' };
  }

  const target = requestedUsername?.trim().toLowerCase();
  if (target && target !== actor.username.trim().toLowerCase()) {
    return { allowed: false, reason: 'OTHER_STUDENT' };
  }

  return { allowed: true, reason: 'CURRENT_STUDENT' };
}
