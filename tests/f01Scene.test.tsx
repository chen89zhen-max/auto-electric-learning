// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { F01IntegratedDeliveryScene } from '@/src/levels/f01/F01IntegratedDeliveryScene';
import { createF01Model, type F01Seed, type F01Stage } from '@/src/levels/f01/f01Model';

describe('F01IntegratedDeliveryScene', () => {
  afterEach(cleanup);

  function renderScene(stage: F01Stage, seed: F01Seed) {
    return render(
      <F01IntegratedDeliveryScene
        stage={stage}
        model={createF01Model(seed)}
        measurementLog={[]}
        functionalMatrix={[]}
        feedback={null}
        onAction={vi.fn()}
        onMeasure={vi.fn()}
        onSubmitStage={vi.fn()}
        onSelectDefenseEvidence={vi.fn()}
      />,
    );
  }

  it('emits the requested power action without mutating its controlled model', () => {
    const onAction = vi.fn();
    render(
      <F01IntegratedDeliveryScene
        stage="SAFETY_AND_TEST_PLAN"
        model={createF01Model('F01-A')}
        measurementLog={[]}
        functionalMatrix={[]}
        feedback={null}
        onAction={onAction}
        onMeasure={vi.fn()}
        onSubmitStage={vi.fn()}
        onSelectDefenseEvidence={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '闭合总电源' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'SET_POWER', on: true });
    expect(screen.getByText('断电')).toBeTruthy();
  });

  it('exposes accessible meter controls and four functional cases', () => {
    renderScene('BLIND_DIAGNOSIS_AND_REPAIR', 'F01-C');
    expect(screen.getByRole('group', { name: '数字万用表设置' })).toBeTruthy();
    expect(screen.getByLabelText('万用表挡位')).toBeTruthy();
    expect(screen.getByLabelText('红表笔插孔')).toBeTruthy();
    expect(screen.getByLabelText('测量目标')).toBeTruthy();
  });
});
