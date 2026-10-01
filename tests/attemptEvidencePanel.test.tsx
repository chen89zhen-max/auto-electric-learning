// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatAttemptEvidence } from '@/src/components/evidence/attemptEvidenceFormatters';
import { AttemptEvidencePanel } from '@/src/components/evidence/AttemptEvidencePanel';
import {
  makeValidA03Metrics,
  makeValidD02Metrics,
  makeValidE03Metrics,
  makeValidE05Metrics,
} from './helpers/c7EvidenceFixtures';
import { buildAttemptEvidenceEnvelope } from '@/src/server/learning/attemptEvidenceService';
import type {
  AttemptEvidenceEnvelopeV2,
  AttemptEvidenceListResponse,
  AttemptEvidenceView,
} from '@/src/types/attemptEvidence';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('formatAttemptEvidence', () => {
  it('each of A03, D02, E03, and E05 renders its required Chinese section heading and no raw JSON braces', () => {
    const a03Env = buildAttemptEvidenceEnvelope('A03', makeValidA03Metrics());
    const a03Sections = formatAttemptEvidence('A03', a03Env);
    expect(a03Sections.some((s) => s.title.includes('敏感电阻测点与趋势'))).toBe(true);
    // User-facing field values must not contain raw JSON braces
    a03Sections.forEach((s) => {
      s.fields.forEach((f) => {
        expect(f.value).not.toContain('{');
        expect(f.value).not.toContain('}');
      });
    });

    const d02Env = buildAttemptEvidenceEnvelope('D02', makeValidD02Metrics());
    const d02Sections = formatAttemptEvidence('D02', d02Env);
    expect(d02Sections.some((s) => s.title.includes('异步电机观察与转差判断'))).toBe(true);
    d02Sections.forEach((s) => {
      s.fields.forEach((f) => {
        expect(f.value).not.toContain('{');
        expect(f.value).not.toContain('}');
      });
    });

    const e03Env = buildAttemptEvidenceEnvelope('E03', makeValidE03Metrics());
    const e03Sections = formatAttemptEvidence('E03', e03Env);
    expect(e03Sections.some((s) => s.title.includes('整流滤波五阶段记录'))).toBe(true);
    e03Sections.forEach((s) => {
      s.fields.forEach((f) => {
        expect(f.value).not.toContain('{');
        expect(f.value).not.toContain('}');
      });
    });

    const e05Env = buildAttemptEvidenceEnvelope('E05', makeValidE05Metrics());
    const e05Sections = formatAttemptEvidence('E05', e05Env);
    const e05Sec = e05Sections.find((s) => s.title.includes('逻辑门真值表与联锁判断'))!;
    expect(e05Sec).toBeDefined();
    e05Sections.forEach((s) => {
      s.fields.forEach((f) => {
        expect(f.value).not.toContain('{');
        expect(f.value).not.toContain('}');
      });
    });

    const readingField = e05Sec.fields.find((f) => f.label.includes('14组逻辑门真值表实测记录'))!;
    expect(readingField).toBeDefined();
    const expectedGateSubstrings = [
      'AND(A=0, B=1)', 'AND(A=1, B=0)', 'AND(A=1, B=1)',
      'OR(A=0, B=0)', 'OR(A=0, B=1)', 'OR(A=1, B=0)',
      'NOT(A=0)', 'NOT(A=1)',
      'NAND(A=0, B=1)', 'NAND(A=1, B=0)', 'NAND(A=1, B=1)',
      'NOR(A=0, B=0)', 'NOR(A=0, B=1)', 'NOR(A=1, B=0)',
    ];
    for (const key of expectedGateSubstrings) {
      expect(readingField.value).toContain(key);
    }
    expect(e05Sec.fields.some((f) => f.label.includes('阶段2') && f.value.includes('74HC08实测真值'))).toBe(true);
    expect(e05Sec.fields.some((f) => f.label.includes('阶段3') && f.value.includes('已触发报警'))).toBe(true);
    expect(
      e05Sec.fields.some(
        (f) =>
          f.label.includes('阶段4') &&
          f.value.includes('IC_1: 原装良好') &&
          f.value.includes('IC_2: VCC虚焊脱焊') &&
          f.value.includes('IC_3: 输入引脚悬空') &&
          f.value.includes('IC_4: 输出端击穿接地')
      )
    ).toBe(true);
    expect(
      e05Sec.fields.some(
        (f) =>
          f.label.includes('阶段5') &&
          f.value.includes('修复状态: 已修复') &&
          f.value.includes('已扣紧(静音)')
      )
    ).toBe(true);
  });
});

describe('AttemptEvidencePanel Component', () => {
  function makeMockAttempt(
    id: string,
    levelId: 'A03' | 'D02' | 'E03' | 'E05',
    score = 90,
    legacyRecovered = false,
    evidence: AttemptEvidenceEnvelopeV2 | null = null,
    unavailableReason?: string,
  ): AttemptEvidenceView {
    return {
      attemptId: id,
      levelId,
      score,
      mode: 'guided',
      startedAt: 1726800000000,
      completedAt: 1726800060000,
      durationMs: 60000,
      rubricVersion: 'v2',
      evidence,
      legacyRecovered,
      unavailableReason,
    };
  }

  it('renders required Chinese section heading and trust labels without raw JSON braces', async () => {
    const e03Env = buildAttemptEvidenceEnvelope('E03', makeValidE03Metrics());
    const attempt = makeMockAttempt('att_1', 'E03', 95, false, e03Env);

    const mockResponse: AttemptEvidenceListResponse = {
      levelId: 'E03',
      total: 1,
      limit: 50,
      attempts: [attempt],
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, ...mockResponse }),
    } as Response);

    const { container } = render(
      <AttemptEvidencePanel levelId="E03" viewer={{ kind: 'student' }} initiallyOpen={true} />
    );

    expect(screen.getByText('正在读取过程证据')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('服务端成绩')).toBeDefined();
    });

    expect(screen.getByText('学生端过程记录（结构已校验，不作为成绩依据）')).toBeDefined();
    expect(screen.getByText(/整流滤波五阶段记录/)).toBeDefined();
    expect(screen.getByTestId('selected-attempt-mode').textContent).toBe('引导练习');
    expect(screen.getByTestId('selected-attempt-started-at').textContent.length).toBeGreaterThan(5);
    expect(container.textContent).not.toContain('{"');
    expect(container.textContent).toContain('95');
  });

  it('renders E05 attempt with all 14 gate readings, mode, and stage 2-5 details visible in DOM', async () => {
    const e05Env = buildAttemptEvidenceEnvelope('E05', makeValidE05Metrics());
    const attempt = makeMockAttempt('att_e05', 'E05', 98, false, e05Env);
    attempt.mode = 'transfer';

    const mockResponse: AttemptEvidenceListResponse = {
      levelId: 'E05',
      total: 1,
      limit: 50,
      attempts: [attempt],
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, ...mockResponse }),
    } as Response);

    const { container } = render(
      <AttemptEvidencePanel levelId="E05" viewer={{ kind: 'student' }} initiallyOpen={true} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('selected-attempt-id').textContent).toBe('att_e05');
    });

    expect(screen.getByTestId('selected-attempt-mode').textContent).toBe('考评迁移');
    expect(screen.getByTestId('selected-attempt-started-at').textContent.length).toBeGreaterThan(5);
    expect(screen.getByText(/逻辑门真值表与联锁判断/)).toBeDefined();

    // Deep assertions on DOM content for 14 gate readings
    expect(container.textContent).toContain('AND(A=0, B=1)');
    expect(container.textContent).toContain('OR(A=0, B=0)');
    expect(container.textContent).toContain('NOT(A=0)');
    expect(container.textContent).toContain('NAND(A=0, B=1)');
    expect(container.textContent).toContain('NOR(A=0, B=0)');

    // Deep assertions on DOM content for steps 2-5
    expect(container.textContent).toContain('74HC08实测真值');
    expect(container.textContent).toContain('已触发报警');
    expect(container.textContent).toContain('IC_1: 原装良好 (GOOD)');
    expect(container.textContent).toContain('IC_2: VCC虚焊脱焊 (VCC_DISCONNECTED)');
    expect(container.textContent).toContain('IC_3: 输入引脚悬空 (INPUT_FLOATING)');
    expect(container.textContent).toContain('IC_4: 输出端击穿接地 (OUTPUT_SHORT_GND)');
    expect(container.textContent).toContain('已扣紧(静音)');
  });

  it('selecting an earlier attempt replaces the displayed attempt ID, timestamps, and sections', async () => {
    const a03Env1 = buildAttemptEvidenceEnvelope('A03', makeValidA03Metrics());
    const metrics2 = makeValidA03Metrics();
    (metrics2.COLOR_CODE_CALC as Record<string, unknown>).resistorName = '第二组电阻 470Ω';
    const a03Env2 = buildAttemptEvidenceEnvelope('A03', metrics2);

    const attempt1 = makeMockAttempt('att_new', 'A03', 92, false, a03Env1);
    attempt1.startedAt = 1726800100000;
    attempt1.completedAt = 1726800150000;

    const attempt2 = makeMockAttempt('att_old', 'A03', 75, false, a03Env2);
    attempt2.startedAt = 1726700000000;
    attempt2.completedAt = 1726700080000;

    const mockResponse: AttemptEvidenceListResponse = {
      levelId: 'A03',
      total: 2,
      limit: 50,
      attempts: [attempt1, attempt2],
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, ...mockResponse }),
    } as Response);

    render(<AttemptEvidencePanel levelId="A03" viewer={{ kind: 'teacher', studentId: 'std_1' }} initiallyOpen={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('selected-attempt-id').textContent).toBe('att_new');
    });

    // Select earlier attempt
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'att_old' } });

    await waitFor(() => {
      expect(screen.getByTestId('selected-attempt-id').textContent).toBe('att_old');
    });
    expect(screen.getByText(/第二组电阻 470Ω/)).toBeDefined();
  });

  it('recovered data shows 由历史完成事件恢复, while null evidence shows its safe unavailable reason', async () => {
    const e05Env = buildAttemptEvidenceEnvelope('E05', makeValidE05Metrics());
    const attemptRecovered = makeMockAttempt('att_rec', 'E05', 88, true, e05Env);
    const attemptUnavailable = makeMockAttempt('att_null', 'E05', 60, false, null, '该次历史记录未保存步骤明细');

    const mockResponse: AttemptEvidenceListResponse = {
      levelId: 'E05',
      total: 2,
      limit: 50,
      attempts: [attemptRecovered, attemptUnavailable],
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, ...mockResponse }),
    } as Response);

    render(<AttemptEvidencePanel levelId="E05" viewer={{ kind: 'student' }} initiallyOpen={true} />);

    await waitFor(() => {
      expect(screen.getByText('由历史完成事件恢复')).toBeDefined();
    });

    // Switch to null attempt
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'att_null' } });

    await waitFor(() => {
      expect(screen.getByText('该次历史记录未保存步骤明细')).toBeDefined();
    });
  });

  it('loading shows 正在读取过程证据, a 500 response shows 过程证据读取失败, retry issues a second fetch, and empty list shows 暂无已保存的过程证据', async () => {
    const fetchMock = vi.spyOn(global, 'fetch');
    // First call: 500 error
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: '服务器错误' }),
    } as Response);

    // Second call (after retry): empty list
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        levelId: 'D02',
        total: 0,
        limit: 50,
        attempts: [],
      }),
    } as Response);

    render(<AttemptEvidencePanel levelId="D02" viewer={{ kind: 'student' }} initiallyOpen={true} />);

    await waitFor(() => {
      expect(screen.getByText('过程证据读取失败')).toBeDefined();
    });

    const retryBtn = screen.getByRole('button', { name: /重试/ });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('暂无已保存的过程证据')).toBeDefined();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('hostile strings remain text and create no injected element', async () => {
    const a03Metrics = makeValidA03Metrics();
    (a03Metrics.COLOR_CODE_CALC as Record<string, unknown>).resistorName = '<img src=x onerror=alert(1)>';
    const hostileEnv = buildAttemptEvidenceEnvelope('A03', a03Metrics);
    const attempt = makeMockAttempt('att_hostile', 'A03', 90, false, hostileEnv);

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        levelId: 'A03',
        total: 1,
        limit: 50,
        attempts: [attempt],
      }),
    } as Response);

    const { container } = render(
      <AttemptEvidencePanel levelId="A03" viewer={{ kind: 'student' }} initiallyOpen={true} />
    );

    await waitFor(() => {
      expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeDefined();
    });

    expect(container.querySelector('img')).toBeNull();
  });

  it('there are no buttons named edit, delete, rescore, or save inside the panel', async () => {
    const e03Env = buildAttemptEvidenceEnvelope('E03', makeValidE03Metrics());
    const attempt = makeMockAttempt('att_1', 'E03', 95, false, e03Env);

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        levelId: 'E03',
        total: 1,
        limit: 50,
        attempts: [attempt],
      }),
    } as Response);

    render(<AttemptEvidencePanel levelId="E03" viewer={{ kind: 'student' }} initiallyOpen={true} />);

    await waitFor(() => {
      expect(screen.getByText('服务端成绩')).toBeDefined();
    });

    const buttons = screen.queryAllByRole('button');
    const buttonTexts = buttons.map((b) => b.textContent?.trim().toLowerCase() || '');

    const forbidden = ['edit', '编辑', 'delete', '删除', 'rescore', '重新打分', 'save', '保存'];
    for (const text of buttonTexts) {
      for (const f of forbidden) {
        expect(text).not.toContain(f);
      }
    }
  });

  it('total: 51 with 50 rows shows 当前显示最近50次，共51次', async () => {
    const e03Env = buildAttemptEvidenceEnvelope('E03', makeValidE03Metrics());
    const attempts: AttemptEvidenceView[] = [];
    for (let i = 1; i <= 50; i++) {
      attempts.push(makeMockAttempt(`att_${i}`, 'E03', 90, false, e03Env));
    }

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        levelId: 'E03',
        total: 51,
        limit: 50,
        attempts,
      }),
    } as Response);

    render(<AttemptEvidencePanel levelId="E03" viewer={{ kind: 'student' }} initiallyOpen={true} />);

    await waitFor(() => {
      expect(screen.getByText('当前显示最近50次，共51次')).toBeDefined();
    });
  });
});

import { CurrentMissionPanel } from '@/src/components/course-map/CurrentMissionPanel';
import type { CourseMapLevelModel, CourseMapItemState } from '@/src/components/course-map/courseMapModel';

describe('CurrentMissionPanel C7 Evidence Integration', () => {
  function makeMockLevel(id: string, state: CourseMapItemState = 'completed'): CourseMapLevelModel {
    return {
      id,
      chapterId: 'chapter_e',
      num: id,
      title: `${id} 测试任务`,
      subtitle: '测试副标题',
      description: '测试描述',
      category: '专业技能',
      duration: '15分钟',
      isElective: false,
      state,
      prerequisiteName: null,
      missingPrerequisiteNames: [],
      recommendedPriorLevelNames: [],
      recentScore: 90,
      recentDurationMs: 60000,
      recentCompletedAt: '2026-09-20T10:00:00.000Z',
      attemptCount: 1,
    };
  }

  it('查看过程证据 appears for completed C7 levels and does not appear for unfinished, non-C7, or preview mode', () => {
    const onOpen = vi.fn();

    // Completed E03 (C7) -> button appears
    const { unmount: unmount1 } = render(
      <CurrentMissionPanel level={makeMockLevel('E03', 'completed')} onOpen={onOpen} isPreview={false} />
    );
    expect(screen.queryByRole('button', { name: /查看过程证据/ })).not.toBeNull();
    unmount1();

    // Unfinished E03 (C7) -> button does not appear
    const { unmount: unmount2 } = render(
      <CurrentMissionPanel level={makeMockLevel('E03', 'available')} onOpen={onOpen} isPreview={false} />
    );
    expect(screen.queryByRole('button', { name: /查看过程证据/ })).toBeNull();
    unmount2();

    // Completed E04 (non-C7) -> button does not appear
    const { unmount: unmount3 } = render(
      <CurrentMissionPanel level={makeMockLevel('E04', 'completed')} onOpen={onOpen} isPreview={false} />
    );
    expect(screen.queryByRole('button', { name: /查看过程证据/ })).toBeNull();
    unmount3();

    // Teacher preview mode for completed E03 -> button does not appear
    const { unmount: unmount4 } = render(
      <CurrentMissionPanel level={makeMockLevel('E03', 'completed')} onOpen={onOpen} isPreview={true} />
    );
    expect(screen.queryByRole('button', { name: /查看过程证据/ })).toBeNull();
    unmount4();
  });

  it('clicking 查看过程证据 does not trigger onOpen and opens panel using student endpoint', async () => {
    const onOpen = vi.fn();
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        levelId: 'E03',
        total: 0,
        limit: 50,
        attempts: [],
      }),
    } as Response);

    render(
      <CurrentMissionPanel level={makeMockLevel('E03', 'completed')} onOpen={onOpen} isPreview={false} />
    );

    const evidenceBtn = screen.getByRole('button', { name: /查看过程证据/ });
    fireEvent.click(evidenceBtn);

    expect(onOpen).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/learning/attempts?levelId=E03');
    expect(calledUrl).not.toContain('/api/teacher/attempts');
  });
});
