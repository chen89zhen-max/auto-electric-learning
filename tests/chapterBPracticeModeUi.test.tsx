// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { B05Experience } from '@/src/levels/b05/B05Experience';
import { B06Experience } from '@/src/levels/b06/B06Experience';

describe('B05/B06 实训模式入口', () => {
  it.each([
    ['B05', B05Experience],
    ['B06', B06Experience],
  ])('%s 不显示不会改变任务的跟练、独立、迁移切换按钮', (levelId, Experience) => {
    const { unmount } = render(<Experience onReturnLobby={vi.fn()} />);

    expect(screen.queryByLabelText('实训模式')).toBeNull();
    expect(screen.queryByRole('button', { name: '跟练' })).toBeNull();
    expect(screen.queryByRole('button', { name: '独立' })).toBeNull();
    expect(screen.queryByRole('button', { name: '迁移' })).toBeNull();
    expect(screen.getByLabelText(`${levelId} 实训工作区`)).toBeTruthy();

    unmount();
  });
});
