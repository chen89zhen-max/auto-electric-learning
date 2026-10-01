// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { startLevelAttempt } = vi.hoisted(() => ({
  startLevelAttempt: vi.fn(async () => ({ attemptId: 'try_1', startedAt: 1_000 })),
}));

vi.mock('@/src/stores/userProgressStore', () => ({
  startLevelAttempt,
  getUserProgress: () => ({ teacherMode: false }),
}));

import { LevelAttemptBoundary } from '@/src/components/LevelAttemptBoundary';

afterEach(() => {
  cleanup();
  startLevelAttempt.mockClear();
});

describe('LevelAttemptBoundary', () => {
  it('starts the exam clock when a student enters a canonical level', async () => {
    render(
      <LevelAttemptBoundary levelId="C01">
        <div>关卡内容</div>
      </LevelAttemptBoundary>,
    );

    expect(screen.getByText('关卡内容')).toBeTruthy();
    await waitFor(() => expect(startLevelAttempt).toHaveBeenCalledOnce());
    expect(startLevelAttempt).toHaveBeenCalledWith('C01');
  });
});
