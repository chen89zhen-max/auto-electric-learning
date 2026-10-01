'use client';

import { useEffect, type ReactNode } from 'react';
import { startLevelAttempt } from '@/src/stores/userProgressStore';

export function LevelAttemptBoundary({ levelId, children }: { levelId: string; children: ReactNode }) {
  useEffect(() => {
    // Completion retries the start request before it submits the final result.
    // Swallow the eager request failure here to avoid an unhandled promise in
    // offline/unstable networks while keeping the level itself usable.
    void startLevelAttempt(levelId).catch(() => undefined);
  }, [levelId]);

  return children;
}
