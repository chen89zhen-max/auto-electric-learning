// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { A02VoltageScene } from '@/src/levels/a02/scenes/A02VoltageScene';

describe('A02 第二步测量记录呈现', () => {
  afterEach(cleanup);

  it('未测量时显示三个待测项目且不提前揭示电压答案', () => {
    render(
      <A02VoltageScene
        currentStep="SWITCH_AND_LOAD"
        onStepComplete={vi.fn()}
        onAdvanceStep={vi.fn()}
      />,
    );

    const records = screen.getByText('本步测量记录').parentElement;
    expect(records).not.toBeNull();
    const recordView = within(records as HTMLElement);
    expect(recordView.getAllByText(/待测/)).toHaveLength(3);
    expect(recordView.queryByText(/约\s*12V|约\s*0V/)).toBeNull();
  });
});
