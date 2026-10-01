// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  calculateBjtOperatingPoint,
  hasCompletedAllThreeStates,
  type E04StateSampleRecord,
} from '@/src/levels/e04/e04Training';
import { E04TransistorScene } from '@/src/levels/e04/E04TransistorScene';
import { E04Experience } from '@/src/levels/e04/E04Experience';

const mockRecordWrong = vi.fn();
const mockCompleteStage = vi.fn();
const mockStartStage = vi.fn();
const mockRequestHint = vi.fn();

vi.mock('@/src/assessment/useLevelAssessment', () => ({
  useLevelAssessment: () => ({
    requestHint: mockRequestHint,
    recordWrong: mockRecordWrong,
    completeStage: mockCompleteStage,
    startStage: mockStartStage,
    recordMeterBlocked: vi.fn(),
    recordUnsafeAction: vi.fn(),
    retryStage: vi.fn(),
    completeLevel: vi.fn(),
  }),
}));

vi.mock('@/src/components/visuals/SoundEffects', () => ({
  sounds: {
    playToggleSound: vi.fn(),
    playSuccessSound: vi.fn(),
    playFailureSound: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('E04 批次 C1 行为与模型测试：三态回路一致性、独立判断门槛与专业规范', () => {
  describe('1. 数学模型修正与回路 KVL 一致性', () => {
    it('在饱和区满足回路电压 KVL: Uce + Ic * Rload = Vcc (12.0V)，饱和限流为 (12 - 0.2) / Rload', () => {
      // 5V, 2.2kΩ, 80Ω 负载, beta=100
      const sat = calculateBjtOperatingPoint(5.0, 2200, 80, 100);
      expect(sat.state).toBe('SATURATION');
      expect(sat.uceV).toBe(0.2);
      // (12 - 0.2) / 80 = 11.8 / 0.08 = 147.5 mA
      expect(sat.icMa).toBe(147.5);
      // KVL: 0.2 + 147.5 * 0.08 = 12.0V
      const loopVoltage = sat.uceV + (sat.icMa / 1000) * 80;
      expect(Math.abs(loopVoltage - 12.0)).toBeLessThan(0.01);
    });

    it('uIn <= 0.7V 或 Ib <= 0 时严格按本教学模型判定为截止 (CUTOFF)', () => {
      const atBoundary = calculateBjtOperatingPoint(0.7, 2200, 80, 100);
      expect(atBoundary.state).toBe('CUTOFF');
      expect(atBoundary.ibMa).toBe(0);
      expect(atBoundary.icMa).toBe(0);
      expect(atBoundary.uceV).toBe(12.0);

      const belowThreshold = calculateBjtOperatingPoint(0.5, 2200, 80, 100);
      expect(belowThreshold.state).toBe('CUTOFF');
    });

    it('放大区线性可测并严格满足回路关系', () => {
      const active = calculateBjtOperatingPoint(1.0, 30000, 80, 100);
      expect(active.state).toBe('ACTIVE');
      expect(active.uceV).toBeGreaterThan(0.2);
      expect(active.uceV).toBeLessThan(12.0);
      const loopVoltage = active.uceV + (active.icMa / 1000) * 80;
      expect(Math.abs(loopVoltage - 12.0)).toBeLessThan(0.05);
    });

    it('对非有限数或非正阻值参数具备有限数守卫，不产生 NaN 或崩溃', () => {
      const invalidResistor = calculateBjtOperatingPoint(5.0, 0, 80, 100);
      expect(Number.isFinite(invalidResistor.ibMa)).toBe(true);
      expect(Number.isFinite(invalidResistor.uceV)).toBe(true);

      const nanInput = calculateBjtOperatingPoint(NaN, 2200, 80, 100);
      expect(nanInput.state).toBe('CUTOFF');
    });
  });

  describe('2. hasCompletedAllThreeStates 门槛判定', () => {
    it('缺一状态均返回 false，三态俱全且正确才返回 true', () => {
      const mockRecord = (state: 'CUTOFF' | 'ACTIVE' | 'SATURATION', isCorrect: boolean): E04StateSampleRecord => ({
        uIn: 5,
        rBaseOhm: 2200,
        rLoadOhm: 80,
        vSupply: 12,
        ibMa: 1.95,
        icMa: 147.5,
        uceV: 0.2,
        actualState: state,
        studentState: state,
        isCorrect,
        timestamp: Date.now(),
      });

      expect(hasCompletedAllThreeStates([])).toBe(false);
      expect(hasCompletedAllThreeStates([mockRecord('CUTOFF', true)])).toBe(false);
      expect(hasCompletedAllThreeStates([
        mockRecord('CUTOFF', true),
        mockRecord('ACTIVE', true),
      ])).toBe(false);
      // 有错误记录不算有效
      expect(hasCompletedAllThreeStates([
        mockRecord('CUTOFF', true),
        mockRecord('ACTIVE', true),
        mockRecord('SATURATION', false),
      ])).toBe(false);
      // 全部3个均有正确记录
      expect(hasCompletedAllThreeStates([
        mockRecord('CUTOFF', true),
        mockRecord('ACTIVE', true),
        mockRecord('SATURATION', true),
      ])).toBe(true);
    });
  });

  describe('3. 步骤 3 三态独立判断与提交门槛行为交互', () => {
    it('初始状态未完成三态时，工单提交按钮禁用并提示进度 (0/3)，不可提交', () => {
      const onStepComplete = vi.fn();
      render(
        <E04TransistorScene
          currentStep="THREE_OPERATION_STATES_CALC"
          onStepComplete={onStepComplete}
          onAdvanceStep={vi.fn()}
        />
      );

      // 选择选项 A
      fireEvent.click(screen.getByText(/Uce ≤ 0.3V/i));

      // 按钮禁用且文字显示须先录齐三态 (0/3)
      const submitBtn = screen.getByRole('button', { name: /须先录齐三态 \(0\/3\)/i });
      expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(submitBtn);
      expect(onStepComplete).not.toHaveBeenCalled();
    });

    it('学生独立判定错误时：触发 calculation 扣分、显示错误警示反馈，不计入有效达成；未选择判断时不误扣分', () => {
      render(
        <E04TransistorScene
          currentStep="THREE_OPERATION_STATES_CALC"
          onStepComplete={vi.fn()}
          onAdvanceStep={vi.fn()}
        />
      );

      // 1. 未选择状态时：验证按钮禁用，仅调节滑块不触发扣分
      const verifyBtn = screen.getByRole('button', { name: /验证并记录当前状态/i });
      expect((verifyBtn as HTMLButtonElement).disabled).toBe(true);

      const voltageInput = screen.getByLabelText(/基极输入电压 Ub:/i);
      fireEvent.change(voltageInput, { target: { value: '3.0' } });
      expect(mockRecordWrong).not.toHaveBeenCalled();

      // 2. 默认 Ub=5V, Rb=2.2k 是深度饱和区 SATURATION
      // 故意选择 CUTOFF 截止区进行错误判定
      const cutoffBtn = screen.getByRole('button', { name: /截止区 \(Cutoff\)/i });
      fireEvent.click(cutoffBtn);
      expect((verifyBtn as HTMLButtonElement).disabled).toBe(false);

      fireEvent.click(verifyBtn);

      // 验证触发了 recordWrong('calculation')
      expect(mockRecordWrong).toHaveBeenCalledWith('calculation');

      // 界面提示判断有误
      expect(screen.getByText(/判断有误！/i)).toBeTruthy();

      // 提交按钮依然处于 0/3
      expect((screen.getByRole('button', { name: /须先录齐三态 \(0\/3\)/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('完成三态有效记录后解锁提交；提交时传出完整数值证据包；支持重新测算与清空重置门槛', () => {
      const onStepComplete = vi.fn();
      render(
        <E04TransistorScene
          currentStep="THREE_OPERATION_STATES_CALC"
          onStepComplete={onStepComplete}
          onAdvanceStep={vi.fn()}
        />
      );

      const voltageInput = screen.getByLabelText(/基极输入电压 Ub:/i);
      const resistorInput = screen.getByLabelText(/基极限流电阻 Rb:/i);

      // 1. 记录饱和区: 当前默认 Ub=5.0V, Rb=2.2k 即为 SATURATION
      fireEvent.click(screen.getByRole('button', { name: /深度饱和区 \(Saturation\)/i }));
      fireEvent.click(screen.getByRole('button', { name: /验证并记录当前状态/i }));
      expect(screen.getByText(/当前条件.*处于【深度饱和区/i)).toBeTruthy();
      expect((screen.getByRole('button', { name: /须先录齐三态 \(1\/3\)/i }) as HTMLButtonElement).disabled).toBe(true);

      // 2. 调节 Ub 至 0.5V (截止区)
      fireEvent.change(voltageInput, { target: { value: '0.5' } });
      // 调整滑块后，之前的待验证状态被清除，提示消失
      expect(screen.queryByText(/当前条件.*处于【深度饱和区/i)).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: /截止区 \(Cutoff\)/i }));
      fireEvent.click(screen.getByRole('button', { name: /验证并记录当前状态/i }));
      expect(screen.getByText(/当前条件.*处于【截止区/i)).toBeTruthy();
      expect((screen.getByRole('button', { name: /须先录齐三态 \(2\/3\)/i }) as HTMLButtonElement).disabled).toBe(true);

      // 3. 调节 Ub 至 1.0V, Rb 至 30000Ω (线性放大区)
      fireEvent.change(voltageInput, { target: { value: '1.0' } });
      fireEvent.change(resistorInput, { target: { value: '30000' } });
      fireEvent.click(screen.getByRole('button', { name: /线性放大区 \(Active\)/i }));
      fireEvent.click(screen.getByRole('button', { name: /验证并记录当前状态/i }));
      expect(screen.getByText(/当前条件.*处于【线性放大区/i)).toBeTruthy();

      // 此时 3/3 达成，工单按钮变为 "提交设计结论"
      // 选择工单答案 A
      fireEvent.click(screen.getByText(/Uce ≤ 0.3V/i));
      const submitBtn = screen.getByRole('button', { name: /提交设计结论/i });
      expect((submitBtn as HTMLButtonElement).disabled).toBe(false);

      // 点击提交
      fireEvent.click(submitBtn);
      expect(onStepComplete).toHaveBeenCalledTimes(1);
      const [stepName, evidence] = onStepComplete.mock.calls[0] as [string, {
        s3Choice: string;
        s3Point: unknown;
        s3ThreeStateRecords: E04StateSampleRecord[];
      }];
      expect(stepName).toBe('THREE_OPERATION_STATES_CALC');
      expect(evidence.s3Choice).toBe('A');
      expect(evidence.s3ThreeStateRecords.length).toBe(3);

      // 具体核查每条记录的实际数值、模型计算值与学员判定
      const satRecord = evidence.s3ThreeStateRecords.find((r) => r.studentState === 'SATURATION');
      expect(satRecord).toBeDefined();
      expect(satRecord?.actualState).toBe('SATURATION');
      expect(satRecord?.studentState).toBe('SATURATION');
      expect(satRecord?.isCorrect).toBe(true);
      expect(satRecord?.uIn).toBe(5.0);
      expect(satRecord?.rBaseOhm).toBe(2200);
      expect(satRecord?.rLoadOhm).toBe(80);
      expect(satRecord?.vSupply).toBe(12.0);
      expect(satRecord?.ibMa).toBe(1.95);
      expect(satRecord?.icMa).toBe(147.5);
      expect(satRecord?.uceV).toBe(0.2);

      const cutoffRecord = evidence.s3ThreeStateRecords.find((r) => r.studentState === 'CUTOFF');
      expect(cutoffRecord).toBeDefined();
      expect(cutoffRecord?.actualState).toBe('CUTOFF');
      expect(cutoffRecord?.studentState).toBe('CUTOFF');
      expect(cutoffRecord?.isCorrect).toBe(true);
      expect(cutoffRecord?.uIn).toBe(0.5);
      expect(cutoffRecord?.rBaseOhm).toBe(2200);
      expect(cutoffRecord?.rLoadOhm).toBe(80);
      expect(cutoffRecord?.vSupply).toBe(12.0);
      expect(cutoffRecord?.ibMa).toBe(0);
      expect(cutoffRecord?.icMa).toBe(0);
      expect(cutoffRecord?.uceV).toBe(12.0);

      const activeRecord = evidence.s3ThreeStateRecords.find((r) => r.studentState === 'ACTIVE');
      expect(activeRecord).toBeDefined();
      expect(activeRecord?.actualState).toBe('ACTIVE');
      expect(activeRecord?.studentState).toBe('ACTIVE');
      expect(activeRecord?.isCorrect).toBe(true);
      expect(activeRecord?.uIn).toBe(1.0);
      expect(activeRecord?.rBaseOhm).toBe(30000);
      expect(activeRecord?.rLoadOhm).toBe(80);
      expect(activeRecord?.vSupply).toBe(12.0);
      expect(activeRecord?.ibMa).toBe(0.01);
      expect(activeRecord?.icMa).toBe(1);
      expect(activeRecord?.uceV).toBe(11.92);

      // 提交后处于已提交状态，输入确实 disabled，出现锁定提示和 "重新测算修改" 按钮
      expect(screen.getByText(/已提交工单，控件锁定/i)).toBeTruthy();
      expect((voltageInput as HTMLInputElement).disabled).toBe(true);
      expect((resistorInput as HTMLInputElement).disabled).toBe(true);

      const recomputeBtn = screen.getByRole('button', { name: /重新测算修改/i });
      fireEvent.click(recomputeBtn);
      expect(screen.queryByText(/已提交工单，控件锁定/i)).toBeNull();
      expect((voltageInput as HTMLInputElement).disabled).toBe(false);
      expect((resistorInput as HTMLInputElement).disabled).toBe(false);

      // 测试清空记录重置门槛
      const clearBtn = screen.getByRole('button', { name: /清空实测记录/i });
      fireEvent.click(clearBtn);
      expect((screen.getByRole('button', { name: /须先录齐三态 \(0\/3\)/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('关卡重新开始（handleRestart / remount）清空历史证据并撤销完成门槛', () => {
      // 1. 验证组件 key 变更（即 E04Experience 中 sceneRevision 递增）重置场景门槛
      const { rerender } = render(
        <E04TransistorScene
          key={0}
          currentStep="THREE_OPERATION_STATES_CALC"
          onStepComplete={vi.fn()}
          onAdvanceStep={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /深度饱和区 \(Saturation\)/i }));
      fireEvent.click(screen.getByRole('button', { name: /验证并记录当前状态/i }));
      expect((screen.getByRole('button', { name: /须先录齐三态 \(1\/3\)/i }) as HTMLButtonElement).disabled).toBe(true);

      // 触发重试/重新开始
      rerender(
        <E04TransistorScene
          key={1}
          currentStep="THREE_OPERATION_STATES_CALC"
          onStepComplete={vi.fn()}
          onAdvanceStep={vi.fn()}
        />
      );

      // 重新挂载后，旧记录彻底清空，门槛回到 0/3
      expect((screen.getByRole('button', { name: /须先录齐三态 \(0\/3\)/i }) as HTMLButtonElement).disabled).toBe(true);

      // 2. 验证 E04Experience 关卡容器重新开始将步骤重置至步骤 1
      render(<E04Experience onReturnLobby={vi.fn()} />);
      expect(screen.getAllByText(/实训步骤 1：三极管结构与小控大开关机理认知/i).length).toBeGreaterThanOrEqual(1);

      const restartBtn = screen.getByRole('button', { name: '重新开始' });
      fireEvent.click(restartBtn);
      expect(screen.getAllByText(/实训步骤 1：三极管结构与小控大开关机理认知/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4. 步骤 2 规范专业文案与二极管挡/数据手册核查', () => {
    it('纠正 C/E 判别题干与选项，明确原厂数据手册依据，纠正 C-E 导通检查说明', () => {
      render(
        <E04TransistorScene
          currentStep="MULTIMETER_PIN_AND_BETA_TEST"
          onStepComplete={vi.fn()}
          onAdvanceStep={vi.fn()}
        />
      );

      // 检查表头测量目标中 C-E 间导通检查
      expect(screen.getByRole('button', { name: /C-E\s*间导通检查/i })).toBeTruthy();

      // 检查题干不使用绝对化压降大小，而是强调数据手册规范
      expect(screen.getByText(/工程上如何规范、确凿地辨别发射极 E 与集电极 C？/i)).toBeTruthy();
      expect(screen.getByText(/查阅对应原厂数据手册与封装引脚定义/i)).toBeTruthy();
    });
  });
});
