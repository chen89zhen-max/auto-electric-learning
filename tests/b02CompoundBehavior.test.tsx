// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { B02LoadConnectionScene } from '@/src/levels/b02/B02LoadConnectionScene';
import { B02Experience } from '@/src/levels/b02/B02Experience';
import type { CompoundCaseRecord, BypassRecord } from '@/src/levels/b02/b02Compound';

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

describe('B02 批次 C2 行为测试：混联定量计算、短路旁路与电气节点本质辨析', () => {
  const setupStep3Scene = (overrides = {}) => {
    const onStepComplete = vi.fn();
    const onAdvanceStep = vi.fn();
    const onProcessEvent = vi.fn();

    const view = render(
      <B02LoadConnectionScene
        currentStep="COMPOUND_SHORT_BYPASS"
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

  const fillCaseAnswers = (answers: {
    req: string;
    itotal: string;
    uparallel: string;
    p1: string;
    p2: string;
    p3: string;
    powerRatio: string;
  }) => {
    fireEvent.change(screen.getByLabelText(/1\. 总等效电阻 Req/i), { target: { value: answers.req } });
    fireEvent.change(screen.getByLabelText(/2\. 总回路电流 Itotal/i), { target: { value: answers.itotal } });
    fireEvent.change(screen.getByLabelText(/3\. 并联节点电压 Uparallel/i), { target: { value: answers.uparallel } });
    fireEvent.change(screen.getByLabelText(/4\. 电阻 R1 消耗功率 P1/i), { target: { value: answers.p1 } });
    fireEvent.change(screen.getByLabelText(/5\. 电阻 R2 消耗功率 P2/i), { target: { value: answers.p2 } });
    fireEvent.change(screen.getByLabelText(/6\. 串联电阻 R3 功率 P3/i), { target: { value: answers.p3 } });
    fireEvent.change(screen.getByLabelText(/7\. 功率分配比值 P1 \/ P2/i), { target: { value: answers.powerRatio } });
  };

  it('初始状态不泄露答案：占位符中性、门槛清单不剧透选项与比值，且未齐备时禁止提交', () => {
    const { onStepComplete } = setupStep3Scene();

    // 1. 检查 7 个输入框的 placeholder 均为中性提示，绝无预置答案
    const reqInput = screen.getByLabelText(/1\. 总等效电阻 Req/i);
    expect(reqInput.getAttribute('placeholder')).toBe('请输入计算结果');
    expect(screen.getByLabelText(/2\. 总回路电流 Itotal/i).getAttribute('placeholder')).toBe('请输入计算结果');
    expect(screen.getByLabelText(/3\. 并联节点电压 Uparallel/i).getAttribute('placeholder')).toBe('请输入计算结果');
    expect(screen.getByLabelText(/4\. 电阻 R1 消耗功率 P1/i).getAttribute('placeholder')).toBe('请输入计算结果');
    expect(screen.getByLabelText(/5\. 电阻 R2 消耗功率 P2/i).getAttribute('placeholder')).toBe('请输入计算结果');
    expect(screen.getByLabelText(/6\. 串联电阻 R3 功率 P3/i).getAttribute('placeholder')).toBe('请输入计算结果');
    expect(screen.getByLabelText(/7\. 功率分配比值 P1 \/ P2/i).getAttribute('placeholder')).toBe('请输入比值结果');

    // 2. 检查门槛清单：不含“正确选 A”、“2:1 功率比”、“1:2 功率比”等泄题文字
    expect(screen.queryByText(/正确选 A/i)).toBeNull();
    expect(screen.queryByText(/2:1 功率比/i)).toBeNull();
    expect(screen.queryByText(/1:2 功率比/i)).toBeNull();
    expect(screen.getByText('未选择')).toBeTruthy();

    // 3. 初始状态提交按钮处于禁用状态，显示 0/4
    const submitBtn = screen.getByRole('button', { name: /须先录齐前置实训与辨析选项/i });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    // 仅选择节点题 OPT_A
    const optA = screen.getByLabelText(/A\. 说法错误：串联与并联的物理本质由“电气节点”决定/i);
    fireEvent.click(optA);
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/完成进度: 1 \/ 4/i)).toBeTruthy();
    expect(screen.getByText('已选择 (待提交工单判定)')).toBeTruthy();

    // 仅完成算例 A
    fillCaseAnswers({
      req: '6',
      itotal: '2',
      uparallel: '8',
      p1: '10.67',
      p2: '5.33',
      p3: '8',
      powerRatio: '2',
    });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 A】计算/i }));
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/完成进度: 2 \/ 4/i)).toBeTruthy();

    expect(onStepComplete).not.toHaveBeenCalled();
  });

  it('空白或非正数格式错误不扣分；有效数值但结果错误时，单次提交仅调用一次 onProcessEvent("wrong")', () => {
    const { onProcessEvent } = setupStep3Scene();

    // 1. 全部为空直接点击验证
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 A】计算/i }));
    expect(onProcessEvent).not.toHaveBeenCalled();
    expect(screen.getByText(/请填写全部 7 项有效正数数值答案/i)).toBeTruthy();

    // 2. 填写部分，含有 0 或空字符串
    fireEvent.change(screen.getByLabelText(/1\. 总等效电阻 Req/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/2\. 总回路电流 Itotal/i), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 A】计算/i }));
    expect(onProcessEvent).not.toHaveBeenCalled();

    // 3. 7 项均为有效正数格式，但有多个字段数值错误（Req=10, Itotal=5, P1=20 均错）
    fillCaseAnswers({
      req: '10',
      itotal: '5',
      uparallel: '8',
      p1: '20',
      p2: '5.33',
      p3: '8',
      powerRatio: '2',
    });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 A】计算/i }));

    // 关键断言：即使多个字段错误，同一次提交只扣分一次（调用 1 次 wrong）
    expect(onProcessEvent).toHaveBeenCalledTimes(1);
    expect(onProcessEvent).toHaveBeenCalledWith('wrong');
    expect(screen.getByText(/存在计算偏差，请核对标记红色的字段/i)).toBeTruthy();
  });

  it('容差范围精确符合 ±0.02 绝对边界，支持两位小数答题', () => {
    setupStep3Scene();

    // 算例 A 中 P1 理论值为 32/3 = 10.6667W，P2 理论值为 16/3 = 5.3333W
    // 10.67 - 10.6667 = 0.0033 <= 0.02 (通过)
    // 5.33 - 5.3333 = -0.0033 <= 0.02 (通过)
    fillCaseAnswers({
      req: '6',
      itotal: '2',
      uparallel: '8',
      p1: '10.67',
      p2: '5.33',
      p3: '8',
      powerRatio: '2',
    });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 A】计算/i }));
    expect(screen.getByText(/算例 A 核算完全正确/i)).toBeTruthy();

    // 稍微超出容差：输入 10.64 (10.6667 - 10.64 = 0.0267 > 0.02)
    fireEvent.change(screen.getByLabelText(/4\. 电阻 R1 消耗功率 P1/i), { target: { value: '10.64' } });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 A】计算/i }));
    expect(screen.getByText(/存在计算偏差/i)).toBeTruthy();
  });

  it('修改已通过算例答案立即撤销该算例达成；切换算例 A/B 不丢失历史正确样本', () => {
    setupStep3Scene();

    // 1. 完成算例 A
    fillCaseAnswers({
      req: '6',
      itotal: '2',
      uparallel: '8',
      p1: '10.67',
      p2: '5.33',
      p3: '8',
      powerRatio: '2',
    });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 A】计算/i }));
    expect(screen.getByText('1 / 2')).toBeTruthy();
    expect(screen.getByText('✓ 已达成')).toBeTruthy();

    // 2. 切换到算例 B，输入并验证通过 (Req=8, Itotal=1.5, Up=6, P1=3, P2=6, P3=9, ratio=0.5)
    fireEvent.click(screen.getByRole('button', { name: /算例 B/i }));
    fillCaseAnswers({
      req: '8',
      itotal: '1.5',
      uparallel: '6',
      p1: '3',
      p2: '6',
      p3: '9',
      powerRatio: '0.5',
    });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 B】计算/i }));
    expect(screen.getByText('2 / 2')).toBeTruthy();
    expect(screen.getAllByText('✓ 已达成')).toHaveLength(2);

    // 3. 切回算例 A，确认算例 A 的已通过状态依然保留
    fireEvent.click(screen.getByRole('button', { name: /算例 A/i }));
    expect(screen.getByText('2 / 2')).toBeTruthy();
    expect(screen.getByText(/✓ 该算例已核算通过/i)).toBeTruthy();

    // 4. 修改算例 A 的任一输入值，达成状态应立即撤销
    fireEvent.change(screen.getByLabelText(/1\. 总等效电阻 Req/i), { target: { value: '6.5' } });
    expect(screen.getByText('1 / 2')).toBeTruthy();
    expect(screen.queryByText(/✓ 该算例已核算通过/i)).toBeNull();
    expect(screen.getAllByText('✓ 已达成')).toHaveLength(1);
    expect(screen.getAllByText('未完成')).toHaveLength(2);
    expect(screen.getByText('未选择')).toBeTruthy();
  });

  it('完整实训全链路：算例 A/B、旁路仿真与判断、节点题，提交后锁定控件并发出完整证据包', () => {
    const { onStepComplete, onProcessEvent } = setupStep3Scene();

    // 1. 算例 A 正确录入
    fillCaseAnswers({
      req: '6',
      itotal: '2',
      uparallel: '8',
      p1: '10.67',
      p2: '5.33',
      p3: '8',
      powerRatio: '2',
    });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 A】计算/i }));

    // 2. 算例 B 正确录入
    fireEvent.click(screen.getByRole('button', { name: /算例 B/i }));
    fillCaseAnswers({
      req: '8',
      itotal: '1.5',
      uparallel: '6',
      p1: '3',
      p2: '6',
      p3: '9',
      powerRatio: '0.5',
    });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 B】计算/i }));

    // 3. 旁路仿真：先测试若未点击仿真直接选判断
    const bypassOptCorrect = screen.getByLabelText(/并联组两端电压为零（R1 与 R2 被旁路），R3 仍串联限流，总电流增至 6A/i);
    fireEvent.click(bypassOptCorrect);
    fireEvent.click(screen.getByRole('button', { name: /验证旁路判断/i }));
    expect(screen.getByText(/请先点击“教学仿真：短接 A–B 节点”/i)).toBeTruthy();

    // 点击仿真按钮
    fireEvent.click(screen.getByRole('button', { name: /教学仿真：短接 A–B 节点/i }));
    // 再次提交判断
    fireEvent.click(screen.getByRole('button', { name: /验证旁路判断/i }));
    expect(screen.getByText(/判断完全正确！短路导线将 A–B 等电位跨接/i)).toBeTruthy();

    // 4. 选择节点本质辨析工单 OPT_A
    fireEvent.click(screen.getByLabelText(/A\. 说法错误：串联与并联的物理本质由“电气节点”决定/i));

    // 5. 此时已达到 4/4，提交按钮激活
    const submitBtn = screen.getByRole('button', { name: '提交混联分析工单' });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(submitBtn);

    // 验证发出完整的证据包
    expect(onStepComplete).toHaveBeenCalledTimes(1);
    const [stepKey, evidence] = onStepComplete.mock.calls[0] as [string, Record<string, unknown>];
    expect(stepKey).toBe('COMPOUND_SHORT_BYPASS');
    expect(evidence.nodeTheoryConfirmed).toBe(true);
    expect(evidence.choice).toBe('OPT_A');
    expect(evidence.shortBypassTested).toBe(true);

    const cases = evidence.compoundCases as CompoundCaseRecord[];
    expect(cases).toHaveLength(2);
    expect(cases[0].caseId).toBe('A');
    expect(cases[0].studentAnswers.req).toBe(6);
    expect(cases[0].studentAnswers.p1).toBe(10.67);
    expect(cases[0].expected.p1).toBeCloseTo(32 / 3, 4);
    expect(cases[0].expected.powerRatio).toBe(2);

    expect(cases[1].caseId).toBe('B');
    expect(cases[1].studentAnswers.req).toBe(8);
    expect(cases[1].expected.powerRatio).toBe(0.5);

    const bypass = evidence.bypassRecord as BypassRecord;
    expect(bypass.caseId).toBe('A');
    expect(bypass.simulationTested).toBe(true);
    expect(bypass.normalValues.req).toBe(6);
    expect(bypass.normalValues.itotal).toBe(2);
    expect(bypass.bypassedValues.req).toBe(2);
    expect(bypass.bypassedValues.itotal).toBe(6);
    expect(bypass.bypassedValues.uab).toBe(0);
    expect(bypass.bypassedValues.p3).toBe(72);
    expect(bypass.isCorrect).toBe(true);

    // 验证提交后控件锁定
    expect(screen.getByText('（已提交工单，控件锁定）')).toBeTruthy();
    expect((screen.getByLabelText(/1\. 总等效电阻 Req/i) as HTMLInputElement).disabled).toBe(true);

    // 验证未产生多余的扣分
    expect(onProcessEvent).not.toHaveBeenCalled();
  });

  it('旁路选项改选或验证错误立即撤销达成记录与门槛，重新验证正确才恢复', () => {
    const { onProcessEvent } = setupStep3Scene();

    // 先完成算例 A
    fillCaseAnswers({
      req: '6',
      itotal: '2',
      uparallel: '8',
      p1: '10.67',
      p2: '5.33',
      p3: '8',
      powerRatio: '2',
    });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 A】计算/i }));

    // 点击仿真
    fireEvent.click(screen.getByRole('button', { name: /教学仿真：短接 A–B 节点/i }));
    // 选择正确项并验证
    const bypassOptCorrect = screen.getByLabelText(/并联组两端电压为零（R1 与 R2 被旁路），R3 仍串联限流，总电流增至 6A/i);
    fireEvent.click(bypassOptCorrect);
    fireEvent.click(screen.getByRole('button', { name: /验证旁路判断/i }));
    expect(screen.getByText(/判断完全正确！短路导线将 A–B 等电位跨接/i)).toBeTruthy();

    // 关键回归 1：改选错误单选项，立即撤销通过记录与反馈
    const bypassOptWrong = screen.getByLabelText(/全回路等效电阻降为零，总电流变为无限大/i);
    fireEvent.click(bypassOptWrong);
    expect(screen.queryByText(/判断完全正确/i)).toBeNull();

    // 关键回归 2：验证错误项，触发 1 次 wrong 扣分，且保持未达成
    fireEvent.click(screen.getByRole('button', { name: /验证旁路判断/i }));
    expect(onProcessEvent).toHaveBeenCalledTimes(1);
    expect(onProcessEvent).toHaveBeenCalledWith('wrong');
    expect(screen.getByText(/判断有误：短路直接拉低了整个 A–B 节点两端电压/i)).toBeTruthy();

    // 关键回归 3：重新选对并验证，恢复达成状态
    fireEvent.click(bypassOptCorrect);
    fireEvent.click(screen.getByRole('button', { name: /验证旁路判断/i }));
    expect(screen.getByText(/判断完全正确！短路导线将 A–B 等电位跨接/i)).toBeTruthy();
  });

  it('前置完成后选择错误节点答案允许点击提交，扣一次 wrong 且阻止完成；选择正确项提交后才完成', () => {
    const { onStepComplete, onProcessEvent } = setupStep3Scene();

    // 完成算例 A
    fillCaseAnswers({
      req: '6',
      itotal: '2',
      uparallel: '8',
      p1: '10.67',
      p2: '5.33',
      p3: '8',
      powerRatio: '2',
    });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 A】计算/i }));

    // 完成算例 B
    fireEvent.click(screen.getByRole('button', { name: /算例 B/i }));
    fillCaseAnswers({
      req: '8',
      itotal: '1.5',
      uparallel: '6',
      p1: '3',
      p2: '6',
      p3: '9',
      powerRatio: '0.5',
    });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 B】计算/i }));

    // 完成旁路验证
    fireEvent.click(screen.getByRole('button', { name: /教学仿真：短接 A–B 节点/i }));
    fireEvent.click(screen.getByLabelText(/并联组两端电压为零（R1 与 R2 被旁路），R3 仍串联限流，总电流增至 6A/i));
    fireEvent.click(screen.getByRole('button', { name: /验证旁路判断/i }));

    // 关键行为：选择错误节点项 B，此时前置齐备，提交工单按钮必须处于 ENABLED 状态（防零成本试答案）
    const optB = screen.getByLabelText(/B\. 说法正确：排在一条直线上的元器件必定是串联/i);
    fireEvent.click(optB);

    const submitBtn = screen.getByRole('button', { name: '提交混联分析工单' });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);

    // 点击提交：扣分 1 次 wrong，阻止完成，显示错误提示
    fireEvent.click(submitBtn);
    expect(onProcessEvent).toHaveBeenCalledTimes(1);
    expect(onProcessEvent).toHaveBeenCalledWith('wrong');
    expect(onStepComplete).not.toHaveBeenCalled();
    expect(screen.getByText(/分析有误：不要被图纸上线条排在同一水平还是上下层误导/i)).toBeTruthy();

    // 改选正确项 A 并提交：成功完成，不产生新的 wrong 扣分
    const optA = screen.getByLabelText(/A\. 说法错误：串联与并联的物理本质由“电气节点”决定/i);
    fireEvent.click(optA);
    fireEvent.click(submitBtn);
    expect(onStepComplete).toHaveBeenCalledTimes(1);
    expect(onProcessEvent).toHaveBeenCalledTimes(1); // 依然只有前面的 1 次扣分
  });

  it('从算例 B 触发旁路仿真自动切回算例 A 图示，切回算例 B 恢复正常拓扑不叠加 A 短路态', () => {
    setupStep3Scene();

    // 完成算例 A
    fillCaseAnswers({
      req: '6',
      itotal: '2',
      uparallel: '8',
      p1: '10.67',
      p2: '5.33',
      p3: '8',
      powerRatio: '2',
    });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 A】计算/i }));

    // 切换到算例 B
    fireEvent.click(screen.getByRole('button', { name: /算例 B/i }));
    expect(screen.getByText('R3 = 4Ω')).toBeTruthy();

    // 从算例 B 触发旁路仿真 -> 自动切回算例 A 图示
    fireEvent.click(screen.getByRole('button', { name: /教学仿真：短接 A–B 节点/i }));
    expect(screen.getByText('R3 = 2Ω')).toBeTruthy();
    expect(screen.getByText(/算例 A 旁路实验 \(A–B 导线短接\)/i)).toBeTruthy();
    expect(screen.getByText(/0Ω 导线直接短接 A–B/i)).toBeTruthy();

    // 切回算例 B -> 自动恢复算例 B 正常图示，不包含 A 的短路跨接线
    fireEvent.click(screen.getByRole('button', { name: /算例 B/i }));
    expect(screen.getByText('R3 = 4Ω')).toBeTruthy();
    expect(screen.queryByText(/0Ω 导线直接短接 A–B/i)).toBeNull();
  });

  it('关卡重新开始后重新走到步骤 3，所有算例与旁路门槛完全归零', () => {
    render(<B02Experience onReturnLobby={vi.fn()} />);

    // 步骤 1：闭合开关 -> 拧下灯泡1 -> 进入下一步
    fireEvent.click(screen.getByRole('button', { name: /闭合开关/i }));
    fireEvent.click(screen.getByRole('button', { name: /拧下灯泡1/i }));
    fireEvent.click(screen.getByRole('button', { name: /进入下一步/i }));

    // 步骤 2：拆卸灯泡1 -> 进入下一步
    fireEvent.click(screen.getByRole('button', { name: /拆卸灯泡1/i }));
    fireEvent.click(screen.getByRole('button', { name: /进入下一步/i }));

    // 已经到达步骤 3：完成算例 A
    expect(screen.getByText(/阶段 3 \/ 5 · 混联短路旁路与电路电气节点本质辨析/i)).toBeTruthy();
    fillCaseAnswers({
      req: '6',
      itotal: '2',
      uparallel: '8',
      p1: '10.67',
      p2: '5.33',
      p3: '8',
      powerRatio: '2',
    });
    fireEvent.click(screen.getByRole('button', { name: /验证【算例 A】计算/i }));
    expect(screen.getByText(/完成进度: 1 \/ 4/i)).toBeTruthy();

    // 点击底部功能栏的“重新开始”
    fireEvent.click(screen.getByRole('button', { name: /重新开始/i }));

    // 回到步骤 1
    expect(screen.getByText(/阶段 1 \/ 5 · 串联负载分压暗淡与相互制约缺陷验证/i)).toBeTruthy();

    // 再次重新推进到步骤 3
    fireEvent.click(screen.getByRole('button', { name: /闭合开关/i }));
    fireEvent.click(screen.getByRole('button', { name: /拧下灯泡1/i }));
    fireEvent.click(screen.getByRole('button', { name: /进入下一步/i }));
    fireEvent.click(screen.getByRole('button', { name: /拆卸灯泡1/i }));
    fireEvent.click(screen.getByRole('button', { name: /进入下一步/i }));

    // 关键断言：步骤 3 内部状态已彻底重置，达成进度归零 (0/4)，算例 A 输入框为空
    expect(screen.getByText(/完成进度: 0 \/ 4/i)).toBeTruthy();
    const reqInput = screen.getByLabelText(/1\. 总等效电阻 Req/i) as HTMLInputElement;
    expect(reqInput.value).toBe('');
  });
});
