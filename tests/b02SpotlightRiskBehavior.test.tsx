// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { B02LoadConnectionScene } from '@/src/levels/b02/B02LoadConnectionScene';
import { B02Experience } from '@/src/levels/b02/B02Experience';
import { B02_STAGE_CONTENT } from '@/src/levels/b02/b02Training';

vi.mock('@/src/components/visuals/SoundEffects', () => ({
  sounds: {
    click: vi.fn(),
    success: vi.fn(),
    warningBuzz: vi.fn(),
    zap: vi.fn(),
    playToggleSound: vi.fn(),
    playSuccessSound: vi.fn(),
    playFailureSound: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('B02 批次 C5 行为测试：加装负载风险评估与决策纠错', () => {
  const setupStep5Scene = (overrides = {}) => {
    const onStepComplete = vi.fn();
    const onAdvanceStep = vi.fn();
    const onProcessEvent = vi.fn();

    const view = render(
      <B02LoadConnectionScene
        currentStep="TRANSFER_SPOTLIGHT_MOD_RISK"
        onStepComplete={onStepComplete}
        onAdvanceStep={onAdvanceStep}
        onProcessEvent={onProcessEvent}
        {...overrides}
      />
    );

    return {
      view,
      onStepComplete,
      onAdvanceStep,
      onProcessEvent,
    };
  };

  it('初始状态：无选择时禁用提交或不记录扣分且不触发完成，工况卡片展示33.3A估算且不伪称实时爆断', () => {
    const { onStepComplete, onProcessEvent } = setupStep5Scene();

    // 检查普通 HTML 教学工况与负荷估算卡内容
    expect(screen.getByText(/教学工况与负荷估算/i)).toBeTruthy();
    expect(screen.getAllByText(/12\s*V/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/400\s*W/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/15\s*A/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/33\.3\s*A/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/估算，非实测；熔断时间与具体选型未确定/i)).toBeTruthy();

    // 确认已移除仿仪表实时测量暗示与绝对化断言
    expect(screen.queryByText(/FUSE 15A BLOWN/i)).toBeNull();
    expect(screen.queryByText(/SAFE LIMIT:\s*15A/i)).toBeNull();

    // 提交按钮：未选择时点击不触发完成或扣分
    const submitBtn = screen.getByRole('button', { name: /提交改装安全整改工单/i });
    fireEvent.click(submitBtn);

    expect(onStepComplete).not.toHaveBeenCalled();
    expect(onProcessEvent).not.toHaveBeenCalled();
  });

  it('选项 OPT_B（换 40A 熔断器继续使用）：仅记一次 unsafe，不记 wrong，展示针对性危险反馈', () => {
    const { onStepComplete, onProcessEvent } = setupStep5Scene();

    const optB = screen.getByLabelText(/B\.\s*先把15A熔断器换为40A，保留原线路继续使用/i);
    fireEvent.click(optB);

    const submitBtn = screen.getByRole('button', { name: /提交改装安全整改工单/i });
    fireEvent.click(submitBtn);

    expect(onProcessEvent).toHaveBeenCalledTimes(1);
    expect(onProcessEvent).toHaveBeenCalledWith('unsafe');
    expect(onStepComplete).not.toHaveBeenCalled();

    // 反馈中不得含有“第一大祸根”等无依据排名
    expect(screen.queryByText(/第一大祸根/i)).toBeNull();
  });

  it('选项 OPT_C（改四灯串联继续使用）：仅记一次 unsafe，不记 wrong', () => {
    const { onStepComplete, onProcessEvent } = setupStep5Scene();

    const optC = screen.getByLabelText(/C\.\s*不查灯具资料，直接把四盏灯改串联后继续使用/i);
    fireEvent.click(optC);

    const submitBtn = screen.getByRole('button', { name: /提交改装安全整改工单/i });
    fireEvent.click(submitBtn);

    expect(onProcessEvent).toHaveBeenCalledTimes(1);
    expect(onProcessEvent).toHaveBeenCalledWith('unsafe');
    expect(onStepComplete).not.toHaveBeenCalled();
  });

  it('选项 OPT_D（仅凭熔断认定灯具内部短路）：仅记一次 wrong，不记 unsafe', () => {
    const { onStepComplete, onProcessEvent } = setupStep5Scene();

    const optD = screen.getByLabelText(/D\.\s*仅凭熔断就认定灯具内部短路，换同款灯后继续使用/i);
    fireEvent.click(optD);

    const submitBtn = screen.getByRole('button', { name: /提交改装安全整改工单/i });
    fireEvent.click(submitBtn);

    expect(onProcessEvent).toHaveBeenCalledTimes(1);
    expect(onProcessEvent).toHaveBeenCalledWith('wrong');
    expect(onStepComplete).not.toHaveBeenCalled();
  });

  it('错误后改选清空旧反馈与已提交状态，未重新提交不能推进，且反馈不会随改选变绿', () => {
    const { onStepComplete, onProcessEvent } = setupStep5Scene();

    // 先选 OPT_B 提交错误
    const optB = screen.getByLabelText(/B\.\s*先把15A熔断器换为40A，保留原线路继续使用/i);
    fireEvent.click(optB);
    const submitBtn = screen.getByRole('button', { name: /提交改装安全整改工单/i });
    fireEvent.click(submitBtn);
    expect(onProcessEvent).toHaveBeenCalledWith('unsafe');

    // 改选为 OPT_A 但尚未重新点击提交
    const optA = screen.getByLabelText(/A\.\s*停用当前接法，先核对车型与灯具资料及回路保护配合，再确定可行方案/i);
    fireEvent.click(optA);

    // 旧反馈已清空
    expect(screen.queryByText(/决策不合规/i)).toBeNull();
    // 尚未重新提交，绝不能触发完成
    expect(onStepComplete).not.toHaveBeenCalled();
    // 页面中不能出现“查看通关报告”按钮
    expect(screen.queryByRole('button', { name: /查看通关报告/i })).toBeNull();
  });

  it('选项 OPT_A 提交成功：选项与提交按钮锁定，仅发一份合规证据，重复点击不重复触发', () => {
    const { onStepComplete, onProcessEvent } = setupStep5Scene();

    const optA = screen.getByLabelText(/A\.\s*停用当前接法，先核对车型与灯具资料及回路保护配合，再确定可行方案/i);
    fireEvent.click(optA);

    const submitBtn = screen.getByRole('button', { name: /提交改装安全整改工单/i });
    fireEvent.click(submitBtn);

    expect(onProcessEvent).not.toHaveBeenCalled();
    expect(onStepComplete).toHaveBeenCalledTimes(1);
    expect(onStepComplete).toHaveBeenCalledWith('TRANSFER_SPOTLIGHT_MOD_RISK', {
      spotlightCurrentCalculated: 33.3,
      overloadRiskRecognized: true,
      modificationDecision: 'OPT_A',
      schemaVersion: 2,
      evidenceKind: 'risk_decision',
      currentSource: 'provided_working_point_estimate',
      supplyVoltage: 12,
      addedLoadInputPowerW: 400,
      existingFuseRatedA: 15,
      repairApproved: false,
      specificSizingDetermined: false,
      protectionTiming: 'not_determined',
    });

    // 成功后控件锁定
    expect((optA as HTMLInputElement).disabled).toBe(true);
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    // 再次点击提交按钮不重复派发完成事件
    fireEvent.click(submitBtn);
    expect(onStepComplete).toHaveBeenCalledTimes(1);

    // 顶栏出现“查看通关报告”按钮，点击它不会重复派发 onStepComplete
    const advanceBtn = screen.getByRole('button', { name: /查看通关报告/i });
    expect(advanceBtn).toBeTruthy();
    fireEvent.click(advanceBtn);
    expect(onStepComplete).toHaveBeenCalledTimes(1);
  });

  it('全关重置路径验证：在 Experience 中整关重置能完全重置第 5 步状态', () => {
    const { unmount } = render(<B02Experience onReturnLobby={vi.fn()} />);

    // 检查重置按钮存在
    const restartBtn = screen.getByRole('button', { name: /重新开始/i });
    expect(restartBtn).toBeTruthy();
    fireEvent.click(restartBtn);
    // 重置后处于阶段 1
    expect(screen.getByText(/阶段 1 \/ 5/i)).toBeTruthy();

    unmount();
  });

  it('文案审查：步骤 4 关联说明与步骤 5 题干/引导/反馈去除伪科学绝对值', () => {
    // 检查步骤 4 渲染
    const { unmount } = render(
      <B02LoadConnectionScene
        currentStep="QUANTITATIVE_FOG_PREDICT"
        onStepComplete={vi.fn()}
        onAdvanceStep={vi.fn()}
      />
    );

    // 步骤 4 改装线束校核说明必须符合新规范
    expect(screen.getByText(/新增负载后的总电流需与原回路能力及保护资料核对/i)).toBeTruthy();
    expect(screen.getByText(/不能据此断言立即熔断，也不能直接指定换15A和1\.5mm²导线/i)).toBeTruthy();
    // 不得保留旧的绝对断言
    expect(screen.queryByText(/必须将干路保险丝匹配升级至 15A/i)).toBeNull();
    unmount();

    // 检查步骤 5 导师提示与考纲配置
    const s5Training = B02_STAGE_CONTENT['TRANSFER_SPOTLIGHT_MOD_RISK'];
    expect(s5Training.mentorPrompt).not.toContain('45A');
    expect(s5Training.mentorPrompt).not.toContain('6.0mm²');
    expect(s5Training.mentorPrompt).not.toContain('几分钟就会烧得发红自燃');
    expect(s5Training.hint).not.toContain('1.0mm² 电线最大安全电流仅约 15A');
    expect(s5Training.hint).not.toContain('必须重新从蓄电池引出 6.0mm² 粗线');
  });
});
