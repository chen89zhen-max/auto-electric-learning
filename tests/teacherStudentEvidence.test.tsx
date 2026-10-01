// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentEvidence } from '@/src/components/teacher/StudentEvidence';
import { createBaseUserProgress } from '@/src/types/progress';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('teacher latest attempt evidence', () => {
  it('shows all published tasks and the latest score and duration to seconds', () => {
    const progress = createBaseUserProgress('学生');
    progress.levels.LEVEL_00 = {
      status: 'completed',
      score: 95,
      attemptCount: 2,
      firstRecord: { attemptId: 'first', completedAt: '2026-09-11T00:00:05.000Z', durationMs: 5_000, score: 95, mode: 'guided' },
      recentRecord: { attemptId: 'latest', completedAt: '2026-09-11T00:01:10.432Z', durationMs: 65_432, score: 72, mode: 'guided', timingSource: 'server' },
    };

    const html = renderToStaticMarkup(
      <StudentEvidence
        student={{ id: 'student', username: 'student', realName: '学生', classId: 'class', className: '一班', progress, completedLevels: 1, lastUpdated: Date.now() }}
        onSaved={vi.fn()}
      />,
    );

    expect(html).toContain('最近成绩：<strong>72分</strong>');
    expect(html).toContain('最近用时：1 分 05 秒');
    expect(html).toContain('E07');
    expect(html).toContain('装配与检查训练板');
  });

  it('four C7 evidence buttons are present, opening E03 calls teacher endpoint with student ID, without evaluation write controls in panel', async () => {
    const progress = createBaseUserProgress('学生');
    const toUrlStr = (u: unknown): string => (typeof u === 'string' ? u : u instanceof URL ? u.toString() : '');
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = toUrlStr(url);
      if (urlStr.includes('/api/teacher/evaluations')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ e07Attempts: [] }),
        } as Response;
      }
      if (urlStr.includes('/api/teacher/attempts')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            levelId: 'E03',
            total: 0,
            limit: 50,
            attempts: [],
          }),
        } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    });

    render(
      <StudentEvidence
        student={{ id: 'student_123', username: 'student_123', realName: '学生甲', classId: 'class_a', className: '一班', progress, completedLevels: 0, lastUpdated: Date.now() }}
        onSaved={vi.fn()}
      />,
    );

    // Section heading
    expect(screen.getByText(/四关过程证据追溯/)).toBeDefined();

    // Four C7 buttons are present
    const btnA03 = screen.getByRole('button', { name: /A03/ });
    const btnD02 = screen.getByRole('button', { name: /D02/ });
    const btnE03 = screen.getByRole('button', { name: /E03/ });
    const btnE05 = screen.getByRole('button', { name: /E05/ });
    expect(btnA03).toBeDefined();
    expect(btnD02).toBeDefined();
    expect(btnE03).toBeDefined();
    expect(btnE05).toBeDefined();

    // Open E03
    fireEvent.click(btnE03);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const attemptsCall = fetchMock.mock.calls.find((c) => toUrlStr(c[0]).includes('/api/teacher/attempts'));
    expect(attemptsCall).toBeDefined();
    const callUrl = toUrlStr(attemptsCall?.[0]);
    expect(callUrl).toContain('studentId=student_123');
    expect(callUrl).toContain('levelId=E03');

    // The process panel does not expose teacher evaluation write controls
    const panel = screen.getByText('暂无已保存的过程证据').closest('div');
    expect(panel?.textContent).not.toContain('保存评价');
    expect(panel?.textContent).not.toContain('提交申请');

    // Existing E07 controls still render unchanged
    expect(screen.getByText(/E07 关卡实物焊接量规签署/)).toBeDefined();
  });
});
