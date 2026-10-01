// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { E03RectifierScene } from '@/src/levels/e03/E03RectifierScene';
import { D02DcMotorScene } from '@/src/levels/d02/D02DcMotorScene';
import * as rectifier from '@/src/levels/e03/e03Training';
import * as motor from '@/src/levels/d02/d02Training';

const recordWrongMock = vi.fn();
vi.mock('@/src/assessment/useLevelAssessment', () => ({
  useLevelAssessment: () => ({
    requestHint: vi.fn(),
    recordWrong: recordWrongMock,
    completeStage: vi.fn(),
    startStage: vi.fn(),
  }),
}));
vi.mock('@/src/components/visuals/SoundEffects', () => ({ sounds: { click: vi.fn(), success: vi.fn(), warningBuzz: vi.fn() } }));
afterEach(() => {
  cleanup();
  recordWrongMock.mockClear();
});
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('curriculum motor and rectifier verification', () => {
  it('requires three-phase operation and an independent conduction judgement before E03 completion', () => {
    const complete = vi.fn();
    render(<E03RectifierScene currentStep="RECTIFIER_TOPOLOGY_COGNITION" onStepComplete={complete} onAdvanceStep={vi.fn()} />);
    click(/桥式整流将正负半周全部利用/);
    click('提交认知判定');
    expect(complete).not.toHaveBeenCalled();
    click('推进三相电角度 60°');
    click('推进三相电角度 60°');
    fireEvent.change(screen.getByLabelText('独立判断：U=8V、V=-3V、W=-5V时的导通相对'), { target: { value: 'U-W' } });
    fireEvent.change(screen.getByLabelText('三相整流每周期脉波数'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('独立判断：U=8V、V=-3V、W=-5V时的导通相对'), { target: { value: 'W-U' } });
    click('验证三相整流');
    expect(recordWrongMock).toHaveBeenCalledWith('cognition');
    expect(recordWrongMock).toHaveBeenCalledTimes(1);
    click('提交认知判定');
    expect(complete).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('独立判断：U=8V、V=-3V、W=-5V时的导通相对'), { target: { value: 'U-W' } });
    click('验证三相整流');
    fireEvent.change(screen.getByLabelText('三相整流每周期脉波数'), { target: { value: '3' } });
    click('提交认知判定');
    expect(complete).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('三相整流每周期脉波数'), { target: { value: '6' } });
    click('验证三相整流');
    click('提交认知判定');
    expect(complete).toHaveBeenCalledWith('RECTIFIER_TOPOLOGY_COGNITION', expect.objectContaining({ threePhase: expect.objectContaining({ pair: 'U-W', pulses: 6, verified: true }) }));
  });

  it('requires structure, speed operation and slip judgement before D02 completion', () => {
    const complete = vi.fn();
    render(<D02DcMotorScene currentStep="COMMUTATOR_AND_CONTINUOUS_ROTATION" onStepComplete={complete} onAdvanceStep={vi.fn()} />);
    click(/当线圈刚转过平衡位置时自动反转/);
    click('提交换向原理分析');
    expect(complete).not.toHaveBeenCalled();

    // 仅观察1个部件无法验证
    click('观察定子');
    // 同一转速选择两次不构成两个不同转速
    fireEvent.change(screen.getByLabelText('转子转速'), { target: { value: '1500' } });
    fireEvent.change(screen.getByLabelText('转子转速'), { target: { value: '1500' } });
    fireEvent.change(screen.getByLabelText('独立判断：50Hz、4极、转速1440r/min的转差率'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('异步机转矩来源'), { target: { value: 'INDUCTION' } });
    expect((screen.getByRole('button', { name: '验证异步电机' }) as HTMLButtonElement).disabled).toBe(true);

    // 补齐部件与不同转速
    click('观察鼠笼转子');
    fireEvent.change(screen.getByLabelText('转子转速'), { target: { value: '1200' } });
    expect((screen.getByRole('button', { name: '验证异步电机' }) as HTMLButtonElement).disabled).toBe(false);

    // 错误转差率验证：只记1次 standard 错误且不完成
    fireEvent.change(screen.getByLabelText('独立判断：50Hz、4极、转速1440r/min的转差率'), { target: { value: '96' } });
    click('验证异步电机');
    expect(recordWrongMock).toHaveBeenCalledWith('standard');
    expect(recordWrongMock).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('button', { name: '提交换向原理分析' }) as HTMLButtonElement).disabled).toBe(true);
    expect(complete).not.toHaveBeenCalled();

    // 改正转差率并验证通过
    fireEvent.change(screen.getByLabelText('独立判断：50Hz、4极、转速1440r/min的转差率'), { target: { value: '4' } });
    click('验证异步电机');
    expect((screen.getByRole('button', { name: '提交换向原理分析' }) as HTMLButtonElement).disabled).toBe(false);

    // 改选转矩来源使旧验证立即失效
    fireEvent.change(screen.getByLabelText('异步机转矩来源'), { target: { value: 'COMMUTATOR' } });
    expect((screen.getByRole('button', { name: '提交换向原理分析' }) as HTMLButtonElement).disabled).toBe(true);

    // 改回并重新验证
    fireEvent.change(screen.getByLabelText('异步机转矩来源'), { target: { value: 'INDUCTION' } });
    click('验证异步电机');
    click('提交换向原理分析');

    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith('COMMUTATOR_AND_CONTINUOUS_ROTATION', expect.objectContaining({
      choice: 'A',
      inductionMotor: expect.objectContaining({
        parts: expect.arrayContaining(['定子', '鼠笼转子']),
        observedSpeeds: expect.arrayContaining([1500, 1200]),
        slipPercent: 4,
        mechanism: 'INDUCTION',
        verified: true,
      }),
    }));

    // 成功后按钮切换为进入下一步，完成事件只发一次
    expect(screen.queryByRole('button', { name: '提交换向原理分析' })).toBeNull();
    expect(screen.getByText(/进入双继电器 H 桥控制实战/)).toBeTruthy();
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('models six-pulse selection and asynchronous slip independently from DC commutation', () => {
    expect(rectifier.calculateThreePhaseRectifier(60)).toMatchObject({ positivePhase: 'U', negativePhase: 'V', pulsesPerCycle: 6 });
    expect(motor.calculateInductionMotor(50, 4, 1440)).toEqual({ synchronousRpm: 1500, slipPercent: 4, rotorFrequencyHz: 2 });
    expect(motor.calculateInductionMotor(50, 4, 1500).rotorFrequencyHz).toBe(0);
    const pairs = Array.from({ length: 6 }, (_, index) => rectifier.calculateThreePhaseRectifier(index * 60));
    expect(new Set(pairs.map(result => `${result.positivePhase}-${result.negativePhase}`)).size).toBe(6);
    for (const result of pairs) expect(result.output).toBeGreaterThan(0);
    expect(rectifier.calculateRectifierOutput(12, 'FULL_BRIDGE', false).rippleVpp).toBe(17);
  });

  it('does not accept the bench calculation as an explanation of automotive regulation', () => {
    const complete = vi.fn();
    render(<E03RectifierScene currentStep="FILTER_CAPACITOR_AND_VOLTAGE_CALC" onStepComplete={complete} onAdvanceStep={vi.fn()} />);
    click('未接滤波电容 (脉动波形)');
    expect(screen.getByText('15.47 V')).toBeTruthy();
    expect(screen.getByText('0.20 V')).toBeTruthy();
    expect(screen.getByLabelText('单相滤波台架输出曲线')).toBeTruthy();
    click(/Uo ≈ √2 × 12 −/);
    click('提交计算结论');
    expect(complete).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('汽车充电电压的控制机制'), { target: { value: 'FIELD_REGULATION' } });
    click('提交计算结论');
    expect(complete).toHaveBeenCalledWith('FILTER_CAPACITOR_AND_VOLTAGE_CALC', expect.objectContaining({ regulation: 'FIELD_REGULATION', modelScope: 'SINGLE_PHASE_BENCH' }));
  });

  it('prevents completion of E03 step 3 if filter capacitor is not connected, showing required prompt without charging calculation errors', () => {
    recordWrongMock.mockClear();
    const complete = vi.fn();
    render(<E03RectifierScene currentStep="FILTER_CAPACITOR_AND_VOLTAGE_CALC" onStepComplete={complete} onAdvanceStep={vi.fn()} />);

    // 1. 初始未接滤波电容
    // 选择计算项A与汽车调压机制
    click(/Uo ≈ √2 × 12 −/);
    fireEvent.change(screen.getByLabelText('汽车充电电压的控制机制'), { target: { value: 'FIELD_REGULATION' } });

    // 未接电容属于前置实验未完成：提交按钮应保持禁用，并提示尚缺“接入滤波电容并观察”，不记 calculation 错误
    const submitBtn = screen.getByRole('button', { name: '提交计算结论' });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/接入滤波电容并观察/)).toBeTruthy();
    expect(complete).not.toHaveBeenCalled();
    expect(recordWrongMock).not.toHaveBeenCalled();

    // 2. 点击接入电容
    click('未接滤波电容 (脉动波形)');
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(/接入滤波电容并观察/)).toBeNull();

    // 3. 点击提交计算结论，验证成功证据
    click('提交计算结论');
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith('FILTER_CAPACITOR_AND_VOLTAGE_CALC', expect.objectContaining({
      s3Choice: 'A',
      s3HasCapacitor: true,
      regulation: 'FIELD_REGULATION',
      modelScope: 'SINGLE_PHASE_BENCH',
      filteredOutput: expect.objectContaining({
        uDc: expect.closeTo(15.47, 1),
        rippleVpp: expect.closeTo(0.20, 2),
      }),
    }));

    // 成功后按钮切换为进入下一步，输入控件锁定、完成事件只发一次
    expect(screen.queryByRole('button', { name: '提交计算结论' })).toBeNull();
    expect((screen.getByLabelText('汽车充电电压的控制机制') as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText(/进入步骤 4：/)).toBeTruthy();
    expect((screen.getByRole('button', { name: /滤波电容已接入/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('locks filter capacitor toggle button and preserves filtered parameters upon successful step 3 completion', () => {
    const complete = vi.fn();
    render(<E03RectifierScene currentStep="FILTER_CAPACITOR_AND_VOLTAGE_CALC" onStepComplete={complete} onAdvanceStep={vi.fn()} />);

    // 1. 接入滤波电容并填写正确选项
    click('未接滤波电容 (脉动波形)');
    click(/Uo ≈ √2 × 12 −/);
    fireEvent.change(screen.getByLabelText('汽车充电电压的控制机制'), { target: { value: 'FIELD_REGULATION' } });

    // 2. 提交成功
    click('提交计算结论');
    expect(complete).toHaveBeenCalledTimes(1);

    // 3. 验证电容按钮处于禁用状态
    const capBtn = screen.getByRole('button', { name: /滤波电容已接入/ });
    expect((capBtn as HTMLButtonElement).disabled).toBe(true);

    // 4. 尝试再次操作电容按钮，界面不得切回未接滤波电容
    fireEvent.click(capBtn);
    expect(screen.queryByText(/未接滤波电容/)).toBeNull();
    expect(screen.getByText('15.47 V')).toBeTruthy();
    expect(screen.getByText('0.20 V')).toBeTruthy();

    // 5. onStepComplete 始终只调用一次，已提交证据保持 s3HasCapacitor: true
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenLastCalledWith('FILTER_CAPACITOR_AND_VOLTAGE_CALC', expect.objectContaining({
      s3HasCapacitor: true,
      filteredOutput: expect.objectContaining({
        uDc: expect.closeTo(15.47, 1),
        rippleVpp: expect.closeTo(0.20, 2),
      }),
    }));
  });
});
