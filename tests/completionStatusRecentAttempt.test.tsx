// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { submitLevelCompletion, getUserProgress } = vi.hoisted(() => ({
  getUserProgress: vi.fn(() => ({
    teacherMode: false,
    levels: { LEVEL_00: { status: 'completed', score: 95 } },
  })),
  submitLevelCompletion: vi.fn(async () => ({
    teacherMode: false,
    traineeName: '学生',
    currentActiveLevel: 'LEVEL_00',
    version: 1,
    lastUpdated: 1,
    levels: {
      LEVEL_00: {
        status: 'completed',
        score: 95,
        attemptCount: 2,
        firstRecord: { attemptId: 'try_first', completedAt: '2026-09-11T00:00:05.000Z', score: 95, mode: 'guided', durationMs: 5_000 },
        recentRecord: {
          attemptId: 'try_latest',
          startedAt: '2026-09-11T00:00:00.000Z',
          completedAt: '2026-09-11T00:01:05.432Z',
          score: 72,
          mode: 'guided',
          durationMs: 65_432,
          timingSource: 'server',
        },
      },
    },
  })),
}));

vi.mock('@/src/stores/userProgressStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/stores/userProgressStore')>();
  return { ...actual, getUserProgress, submitLevelCompletion };
});

import { CompletionStatus } from '@/src/components/CompletionStatus';
import { AbilityReport } from '@/src/components/AbilityReport';

afterEach(() => {
  cleanup();
  submitLevelCompletion.mockClear();
});

describe('CompletionStatus replay result', () => {
  it('shows and returns the latest attempt score and authoritative duration', async () => {
    const onSavedAttempt = vi.fn();
    render(
      <CompletionStatus
        levelId="O00"
        report={{ dimensions: [{ id: 'D1', label: '维度', stars: 4 }], summary: {} as never }}
        score={72}
        onSavedAttempt={onSavedAttempt}
      />,
    );

    await waitFor(() => expect(screen.getByText(/本次重复练习已保存/)).toBeTruthy());
    expect(screen.getByText(/72 分/)).toBeTruthy();
    expect(screen.getByText(/1 分 05 秒/)).toBeTruthy();
    expect(onSavedAttempt).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: 'try_latest',
      score: 72,
      durationMs: 65_432,
      timingSource: 'server',
    }));
    expect(submitLevelCompletion).toHaveBeenCalledWith(
      'O00',
      72,
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('replaces the preliminary report time with the latest server attempt timing', async () => {
    render(
      <AbilityReport
        levelId="O00"
        dimensions={[{ id: 'D1', label: '维度', stars: 4 }]}
        score={72}
        summaryItems={[{ label: '本关用时', value: '0 秒' }]}
        onReturn={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText('1 分 05 秒')).toBeTruthy());
    expect(screen.getByText('本次开始')).toBeTruthy();
    expect(screen.getByText('本次完成')).toBeTruthy();
  });
});
