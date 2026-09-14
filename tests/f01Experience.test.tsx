// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/stores/authStore', () => ({
  getCurrentUser: () => ({ username: 'student1', realName: '张晓明', className: '24新能源1班', role: 'student' }),
  getStudentDisplayName: () => '张晓明',
}));
vi.mock('@/src/components/CompletionStatus', () => ({ CompletionStatus: () => <div>学习结果已保存</div> }));

import { F01Experience } from '@/src/levels/f01/F01Experience';

describe('F01 experience shell', () => {
  afterEach(cleanup);

  it('renders the common shell, stage count, mentor controls and game-only wording', () => {
    const { container } = render(<F01Experience onReturnLobby={vi.fn()} />);
    expect(container.querySelector('main.app-shell.f01-shell')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /F01 实训中心交付挑战/ })).toBeTruthy();
    expect(screen.getByText(/阶段 1\/5/)).toBeTruthy();
    expect(screen.getByLabelText('陈师傅实训指导')).toBeTruthy();
    expect(screen.queryByText(/教师签字|现场验收|线下实操/)).toBeNull();
  });

  it('counts restart as a retry without remounting the assessment owner', () => {
    render(<F01Experience onReturnLobby={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '重新开始' }));
    expect(screen.getByRole('status').textContent).toContain('本轮计时继续');
  });

  it('keeps mentor controls above copy and avoids text-xs in the F01 source', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const source = fs.readFileSync(path.resolve('src/levels/f01/F01Experience.tsx'), 'utf8')
      + fs.readFileSync(path.resolve('src/levels/f01/F01IntegratedDeliveryScene.tsx'), 'utf8');
    expect(source).not.toMatch(/\btext-xs\b/);
    const speechIndex = source.indexOf('<SpeechControls');
    const copyIndex = source.indexOf('{mentorText}', speechIndex + 1);
    expect(speechIndex).toBeGreaterThanOrEqual(0);
    expect(copyIndex).toBeGreaterThan(speechIndex);
  });
});
