// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { D05TransformerScene } from '@/src/levels/d05/D05TransformerScene';
import { D05Experience } from '@/src/levels/d05/D05Experience';
import type { WindingReadingRecord, WindingEvidenceInspection } from '@/src/levels/d05/d05Winding';

// Mock audio sounds
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

// Mock useLevelAssessment
const mockAssessment = {
  requestHint: vi.fn(),
  recordWrong: vi.fn(),
  recordUnsafeAction: vi.fn(),
  recordMeterBlocked: vi.fn(),
  startStage: vi.fn(),
  completeStage: vi.fn(),
  completeLevel: vi.fn().mockReturnValue({
    schemaVersion: 1,
    levelId: 'D05',
    rubricVersion: 'v2',
    startedAt: 1000,
    completedAt: 2000,
    stages: [],
  }),
  retryStage: vi.fn(),
  currentStage: 'cognition',
  stageScores: { cognition: 100 },
  stageAttempts: {},
  mistakeHistory: [],
  isStageCompleted: vi.fn().mockReturnValue(false),
  hasUnsavedChanges: false,
};

vi.mock('@/src/assessment/useLevelAssessment', () => ({
  useLevelAssessment: () => mockAssessment,
}));

describe('D05 步骤 1 变压器断电绕组初检行为与安全门槛测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const setupScene = () => {
    const onStepComplete = vi.fn();
    const onAdvanceStep = vi.fn();
    const renderResult = render(
      <D05TransformerScene
        currentStep="STRUCTURE_AND_MAGNETIC_FLUX"
        onStepComplete={onStepComplete}
        onAdvanceStep={onAdvanceStep}
      />
    );
    return { onStepComplete, onAdvanceStep, ...renderResult };
  };

  it('初始状态防剧透：仅展示匿名样本 A/B/C，无答案透露，未完成前禁止进入步骤 2', () => {
    const { onAdvanceStep, onStepComplete } = setupScene();

    expect(screen.getByRole('button', { name: /^样本 A/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^样本 B/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^样本 C/i })).toBeTruthy();

    // 初始状态下，绝不能出现“【诊断通过】”等预先通过或剧透状态
    expect(screen.queryByText(/该样本已通过判定/i)).toBeNull();

    // 未完成前，“完成步骤1，进入步骤2”按钮不可见
    expect(screen.queryByRole('button', { name: /完成步骤1，进入步骤2/i })).toBeNull();
    expect(onStepComplete).not.toHaveBeenCalled();
    expect(onAdvanceStep).not.toHaveBeenCalled();
  });

  it('安全保护：通电状态下发起测阻调用 recordUnsafeAction 并拦截；错误量程调用 recordMeterBlocked 并拦截', () => {
    setupScene();

    // 初始状态下 s1AcExcited 为 true（交流电激励已开启）
    // 切换到 OHM_200 挡位发起测量
    const ohm200Btn = screen.getByRole('button', { name: /Ω 200Ω/i });
    fireEvent.click(ohm200Btn);

    // 尝试点击测量按钮
    const measureBtn = screen.getByRole('button', { name: /执行测量并记录/i });
    fireEvent.click(measureBtn);

    // 必须被拦截，并记录 recordUnsafeAction
    expect(mockAssessment.recordUnsafeAction).toHaveBeenCalledWith('cognition');
    expect(screen.getByText(/严禁带电测量电阻/i)).toBeTruthy();

    // 将初级断电
    fireEvent.click(screen.getByRole('button', { name: /初级输入交流激励/i }));

    // 将仪表切至 OFF 关机挡再测量
    const offBtn = screen.getByRole('button', { name: /OFF 关机/i });
    fireEvent.click(offBtn);
    fireEvent.click(measureBtn);
    expect(mockAssessment.recordMeterBlocked).toHaveBeenCalledWith('cognition');
  });

  it('准备工作防错：已断电但未隔离/未确认无电压/未自检表笔时，拦截并给出缺项提示，但不误扣概念分', () => {
    setupScene();

    // 1. 关闭交流激励断电
    const powerBtn = screen.getByRole('button', { name: /初级输入交流激励/i });
    fireEvent.click(powerBtn); // 切为断电

    // 仪表切至 OHM_200
    fireEvent.click(screen.getByRole('button', { name: /Ω 200Ω/i }));

    // 未执行“隔离外部接线”就尝试测量
    const measureBtn = screen.getByRole('button', { name: /执行测量并记录/i });
    fireEvent.click(measureBtn);
    expect(screen.getByText(/请先执行“隔离外部接线”/i)).toBeTruthy();

    // 隔离接线
    fireEvent.click(screen.getByRole('button', { name: /隔离外部接线/i }));
    // 未验电就测量
    fireEvent.click(measureBtn);
    expect(screen.getByText(/请先点击“确认台架无电压”/i)).toBeTruthy();

    // 验电
    fireEvent.click(screen.getByRole('button', { name: /确认台架无电压/i }));
    // 未自检表笔就测量
    fireEvent.click(measureBtn);
    expect(screen.getByText(/请先进行“表笔短接自检”/i)).toBeTruthy();

    // 整个过程不应误扣 wrong 概念分
    expect(mockAssessment.recordWrong).not.toHaveBeenCalled();
  });

  it('门槛互锁：仅回答原交变磁通认知题无法推进步骤 1，必须 13 项测量与全部判断全齐', () => {
    const { onStepComplete } = setupScene();

    // 点击选择原认知题 A
    const fluxRadio = screen.getByLabelText(/初级交流电在闭合铁芯中激发出交变磁通/i);
    fireEvent.click(fluxRadio);

    // 尝试提交
    const submitBtn = screen.getByRole('button', { name: /提交步骤1工单/i });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
    expect(onStepComplete).not.toHaveBeenCalled();
  });

  it('样本诊断提交：选错项扣 1 次 wrong 分；改选答案立即撤销通过；重新测该样本即撤销该样本旧判断', () => {
    setupScene();

    // 准备流程
    fireEvent.click(screen.getByRole('button', { name: /初级输入交流激励/i })); // 断电
    fireEvent.click(screen.getByRole('button', { name: /隔离外部接线/i })); // 隔离
    fireEvent.click(screen.getByRole('button', { name: /确认台架无电压/i })); // 验电
    fireEvent.click(screen.getByRole('button', { name: /Ω 200Ω/i })); // 电阻挡
    fireEvent.click(screen.getByRole('button', { name: /表笔短接自检/i })); // 自检

    // 针对样本 A，依次测量 1-2, 3-4, 1-3, 1-K
    const measureBtn = screen.getByRole('button', { name: /执行测量并记录/i });

    // 1-2
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 2/i }));
    fireEvent.click(measureBtn);

    // 3-4
    fireEvent.click(screen.getByRole('button', { name: /端子 3 – 4/i }));
    fireEvent.click(measureBtn);

    // 1-3
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 3/i }));
    fireEvent.click(measureBtn);

    // 1-K
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 铁芯 K/i }));
    fireEvent.click(measureBtn);

    // 此时样本 A 4项测量齐备，尝试勾选错误诊断选项（例如选“初级疑似断路”）
    const wrongRadio = screen.getByLabelText(/初级疑似断路/i);
    fireEvent.click(wrongRadio);

    const submitSampleABtn = screen.getByRole('button', { name: /提交【样本 A】诊断工单/i });
    fireEvent.click(submitSampleABtn);

    // 选错扣 1 次 wrong 分
    expect(mockAssessment.recordWrong).toHaveBeenCalledWith('cognition');
    expect(screen.getByText(/诊断不准确/i)).toBeTruthy();
    expect(screen.queryByText(/该样本已通过判定/i)).toBeNull();

    // 改选正确选项：“两绕组通路正常 (未见断路)”
    const correctRadio = screen.getByLabelText(/两绕组通路正常 \(未见断路\)/i);
    fireEvent.click(correctRadio);
    fireEvent.click(submitSampleABtn);

    // 判定通过
    expect(screen.getByText(/该样本已通过判定/i)).toBeTruthy();

    // 1. 改选选项，立即撤销通过
    fireEvent.click(wrongRadio);
    expect(screen.queryByText(/该样本已通过判定/i)).toBeNull();

    // 重新选回正确并提交
    fireEvent.click(correctRadio);
    fireEvent.click(submitSampleABtn);
    expect(screen.getByText(/该样本已通过判定/i)).toBeTruthy();

    // 2. 对样本 A 重新发起一次测量（如重新测 1-2），必须立即撤销该样本旧通过状态
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 2/i }));
    fireEvent.click(measureBtn);
    expect(screen.queryByText(/该样本已通过判定/i)).toBeNull();
    expect(screen.getByText(/该样本产生了新测量记录/i)).toBeTruthy();
  });

  it('重新接通交流激励，清空所有本轮测量记录与诊断判断', () => {
    setupScene();

    // 准备
    fireEvent.click(screen.getByRole('button', { name: /初级输入交流激励/i }));
    fireEvent.click(screen.getByRole('button', { name: /隔离外部接线/i }));
    fireEvent.click(screen.getByRole('button', { name: /确认台架无电压/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ω 200Ω/i }));
    fireEvent.click(screen.getByRole('button', { name: /表笔短接自检/i }));

    // 测一次 1-2
    const measureBtn = screen.getByRole('button', { name: /执行测量并记录/i });
    fireEvent.click(measureBtn);
    expect(screen.getByText(/总测量记录：/i).textContent).toContain('1 / 13');

    // 重新开启交流激励（重新通电）
    const powerBtn = screen.getByRole('button', { name: /初级断电/i });
    fireEvent.click(powerBtn);

    // 确认测量记录全部被清空为 0 / 13
    expect(screen.getByText(/总测量记录：/i).textContent).toContain('0 / 13');
    expect(screen.getByText(/交流激励已重新接通/i)).toBeTruthy();
  });

  it('完整实训全链路：完成 13 项测量、3 个样本诊断、边界题与认知题，提交后锁定并发出完整证据包', () => {
    const { onStepComplete } = setupScene();

    // 1. 安全准备
    fireEvent.click(screen.getByRole('button', { name: /初级输入交流激励/i })); // 断电
    fireEvent.click(screen.getByRole('button', { name: /隔离外部接线/i })); // 隔离
    fireEvent.click(screen.getByRole('button', { name: /确认台架无电压/i })); // 验电
    fireEvent.click(screen.getByRole('button', { name: /Ω 200Ω/i })); // 200Ω 挡
    fireEvent.click(screen.getByRole('button', { name: /表笔短接自检/i })); // 自检

    const measureBtn = screen.getByRole('button', { name: /执行测量并记录/i });

    // 2. 测量样本 A (4条)
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 2/i }));
    fireEvent.click(measureBtn);
    fireEvent.click(screen.getByRole('button', { name: /端子 3 – 4/i }));
    fireEvent.click(measureBtn);
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 3/i }));
    fireEvent.click(measureBtn);
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 铁芯 K/i }));
    fireEvent.click(measureBtn);

    // 提交样本 A 诊断：两绕组通路正常
    fireEvent.click(screen.getByLabelText(/两绕组通路正常 \(未见断路\)/i));
    fireEvent.click(screen.getByRole('button', { name: /提交【样本 A】诊断工单/i }));

    // 3. 测量样本 B (5条: 1-2低量程, 1-2高量程, 3-4, 1-3, 1-K)
    fireEvent.click(screen.getByRole('button', { name: /^样本 B/i }));
    // 1-2 (Ω 200Ω)
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 2/i }));
    fireEvent.click(measureBtn);
    // 1-2 (Ω 200kΩ 高量程复核)
    fireEvent.click(screen.getByRole('button', { name: /Ω 200kΩ/i }));
    fireEvent.click(measureBtn);
    // 换回 Ω 200Ω 测 3-4, 1-3, 1-K
    fireEvent.click(screen.getByRole('button', { name: /Ω 200Ω/i }));
    fireEvent.click(screen.getByRole('button', { name: /端子 3 – 4/i }));
    fireEvent.click(measureBtn);
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 3/i }));
    fireEvent.click(measureBtn);
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 铁芯 K/i }));
    fireEvent.click(measureBtn);

    // 提交样本 B 诊断：初级疑似断路
    fireEvent.click(screen.getByLabelText(/初级疑似断路/i));
    fireEvent.click(screen.getByRole('button', { name: /提交【样本 B】诊断工单/i }));

    // 4. 测量样本 C (4条)
    fireEvent.click(screen.getByRole('button', { name: /^样本 C/i }));
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 2/i }));
    fireEvent.click(measureBtn);
    fireEvent.click(screen.getByRole('button', { name: /端子 3 – 4/i }));
    fireEvent.click(measureBtn);
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 3/i }));
    fireEvent.click(measureBtn);
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 铁芯 K/i }));
    fireEvent.click(measureBtn);

    // 提交样本 C 诊断：两绕组低阻
    fireEvent.click(screen.getByLabelText(/两绕组低阻 \(需结合基准复核\)/i));
    fireEvent.click(screen.getByRole('button', { name: /提交【样本 C】诊断工单/i }));

    // 确认 13 条记录已全部集齐
    expect(screen.getByText(/总测量记录：/i).textContent).toContain('13 / 13');

    // 5. 提交共享边界题
    fireEvent.click(
      screen.getByLabelText(/1–3与1–K在普通万用表下显示OL，仅表示在当前量程\/测试电压下未检出导通/i)
    );
    fireEvent.click(screen.getByRole('button', { name: /提交边界辨析/i }));

    // 6. 选择原交变磁通认知题 A
    fireEvent.click(screen.getByLabelText(/初级交流电在闭合铁芯中激发出交变磁通/i));

    // 7. 提交步骤 1 总工单
    const finalSubmitBtn = screen.getByRole('button', { name: /提交步骤1工单/i });
    expect((finalSubmitBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(finalSubmitBtn);

    // 验证锁定与证据包发出
    expect(screen.getByText(/步骤 1 绕组初检与交变磁通工单已锁定提交！/i)).toBeTruthy();
    expect(onStepComplete).toHaveBeenCalledTimes(1);

    const [stepKey, evidence] = onStepComplete.mock.calls[0] as [string, Record<string, unknown>];
    expect(stepKey).toBe('STRUCTURE_AND_MAGNETIC_FLUX');
    expect(evidence.coreFluxObserved).toBe(true);
    expect(evidence.choice).toBe('A');

    const winding = evidence.windingInspection as WindingEvidenceInspection;
    expect(winding.modelVersion).toBe('1.0.0');
    expect(winding.deviceType).toBe('isolated_dual_winding_training_model');
    expect(winding.samples).toHaveLength(13);
    expect(winding.judgments).toHaveLength(3);
    expect(winding.boundaryJudgment.isCorrect).toBe(true);

    // 核对样本 A 读数
    const a12Rec = winding.samples.find(
      (r: WindingReadingRecord) => r.sampleId === 'A' && r.pair === 'PAIR_1_2'
    );
    expect(a12Rec).toBeDefined();
    expect(a12Rec?.rawOhm).toBe(32.2);
    expect(a12Rec?.compensatedOhm).toBe(32.0);

    // 核对样本 B 高量程复核读数
    const b12High = winding.samples.find(
      (r: WindingReadingRecord) =>
        r.sampleId === 'B' && r.pair === 'PAIR_1_2' && r.meterRange === 'OHM_200K'
    );
    expect(b12High).toBeDefined();
    expect(b12High?.displayText).toBe('OL');
    expect(b12High?.modelReason).toBe('open_circuit');

    // 核对步骤 2 推进按钮可见
    expect(screen.getByRole('button', { name: /完成步骤1，进入步骤2/i })).toBeTruthy();
  });

  it('重新开始关卡：通过 D05Experience 点击“重新开始”，步骤 1 门槛与测量记录彻底归零', () => {
    const onReturnLobby = vi.fn();
    render(<D05Experience onReturnLobby={onReturnLobby} />);

    // 先做一次准备与一次测量
    fireEvent.click(screen.getByRole('button', { name: /初级输入交流激励/i }));
    fireEvent.click(screen.getByRole('button', { name: /隔离外部接线/i }));
    fireEvent.click(screen.getByRole('button', { name: /确认台架无电压/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ω 200Ω/i }));
    fireEvent.click(screen.getByRole('button', { name: /表笔短接自检/i }));

    const measureBtn = screen.getByRole('button', { name: /执行测量并记录/i });
    fireEvent.click(measureBtn);
    expect(screen.getByText(/总测量记录：/i).textContent).toContain('1 / 13');

    // 点击底部“重新开始”
    const restartBtn = screen.getByRole('button', { name: /重新开始/i });
    fireEvent.click(restartBtn);

    // 验证门槛与记录彻底清空归零 (0/13)
    expect(screen.getByText(/总测量记录：/i).textContent).toContain('0 / 13');
    expect(screen.getByText(/0 \/ 6 达成/i)).toBeTruthy();
  });

  it('P1-2/P2-3 仪表读数清除与防剧透：测前看板显示“绕组待测”，切样本/端对/档位撤销液晶屏读数重置为“未测量”，历史表保留', () => {
    setupScene();

    // 1. 测前看板绝对防剧透
    const board = screen.getByTestId('d05-winding-board');
    expect(board.textContent).toContain('绕组待测');
    expect(board.textContent).toContain('绝缘初检待测');
    expect(board.textContent).not.toContain('32.0 Ω');
    expect(board.textContent).not.toContain('0.40 Ω');
    expect(board.textContent).not.toContain('开路 (待复核)');

    // 2. 准备并测量样本 A 端子 1-2
    fireEvent.click(screen.getByRole('button', { name: /初级输入交流激励/i }));
    fireEvent.click(screen.getByRole('button', { name: /隔离外部接线/i }));
    fireEvent.click(screen.getByRole('button', { name: /确认台架无电压/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ω 200Ω/i }));
    fireEvent.click(screen.getByRole('button', { name: /表笔短接自检/i }));

    const measureBtn = screen.getByRole('button', { name: /执行测量并记录/i });
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 2/i }));
    fireEvent.click(measureBtn);

    // 仪表液晶屏显示读数 32.20 Ω
    const lcd = screen.getByTestId('multimeter-lcd');
    expect(lcd.textContent).toBe('32.20 Ω');

    // 路径 1: 切换到样本 B -> 液晶屏必须重置为“未测量”，但记录表中历史记录仍在
    fireEvent.click(screen.getByRole('button', { name: /^样本 B/i }));
    expect(lcd.textContent).toBe('未测量');

    // 切回样本 A，再测 1-2
    fireEvent.click(screen.getByRole('button', { name: /^样本 A/i }));
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 2/i }));
    fireEvent.click(measureBtn);
    expect(lcd.textContent).toBe('32.20 Ω');

    // 路径 2: 切换端对 1-2 -> 1-3 -> 液晶屏必须重置为“未测量”
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 3/i }));
    expect(lcd.textContent).toBe('未测量');

    // 重新测 1-2
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 2/i }));
    fireEvent.click(measureBtn);
    expect(lcd.textContent).toBe('32.20 Ω');

    // 路径 3: 切换量程 Ω 200Ω -> Ω 200kΩ -> 液晶屏必须重置为“未测量”
    fireEvent.click(screen.getByRole('button', { name: /Ω 200kΩ/i }));
    expect(lcd.textContent).toBe('未测量');

    // 确认历史记录表中仍保留该记录
    expect(screen.getByText(/总测量记录：/i).textContent).toContain('1 / 13');
  });

  it('P2-4 样本 B 局部门槛：仅测高量程复核（缺 Ω200 基础量程）不能提交样本 B 诊断工单', () => {
    setupScene();

    // 准备工作
    fireEvent.click(screen.getByRole('button', { name: /初级输入交流激励/i }));
    fireEvent.click(screen.getByRole('button', { name: /隔离外部接线/i }));
    fireEvent.click(screen.getByRole('button', { name: /确认台架无电压/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ω 200Ω/i }));
    fireEvent.click(screen.getByRole('button', { name: /表笔短接自检/i }));

    const measureBtn = screen.getByRole('button', { name: /执行测量并记录/i });

    // 切到样本 B
    fireEvent.click(screen.getByRole('button', { name: /^样本 B/i }));

    // 仅在 Ω 200kΩ 高量程下测 1-2（故意不做 Ω200 基础量程）
    fireEvent.click(screen.getByRole('button', { name: /Ω 200kΩ/i }));
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 2/i }));
    fireEvent.click(measureBtn);

    // 测 3-4, 1-3, 1-K (在 200Ω 下)
    fireEvent.click(screen.getByRole('button', { name: /Ω 200Ω/i }));
    fireEvent.click(screen.getByRole('button', { name: /端子 3 – 4/i }));
    fireEvent.click(measureBtn);
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 3/i }));
    fireEvent.click(measureBtn);
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 铁芯 K/i }));
    fireEvent.click(measureBtn);

    // 此时虽然有 4 条记录且包含高量程，但缺少 1-2 的 Ω200 基础量程
    fireEvent.click(screen.getByLabelText(/初级疑似断路/i));
    const submitSampleBBtn = screen.getByRole('button', { name: /提交【样本 B】诊断工单/i });
    fireEvent.click(submitSampleBBtn);

    // 必须被拦截并提示缺低量程，绝不能通过
    expect(screen.getByText(/初级 1–2 必须在 Ω200 基础量程下测量/i)).toBeTruthy();
    expect(screen.queryByText(/该样本已通过判定/i)).toBeNull();

    // 补充 Ω 200Ω 测量后，方能成功提交
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 2/i }));
    fireEvent.click(measureBtn);
    fireEvent.click(submitSampleBBtn);
    expect(screen.getByText(/该样本已通过判定/i)).toBeTruthy();
  });

  it('P2-4 扣分优先级与计数精确断言：关机 OFF 点击自检/测量只记 meterBlocked；仅实际电阻档通电时记 unsafe', () => {
    setupScene();

    // 初始状态：s1AcExcited=true (通电中), meterKnob=OFF (关机)
    const measureBtn = screen.getByRole('button', { name: /执行测量并记录/i });
    const leadTestBtn = screen.getByRole('button', { name: /表笔短接自检/i });

    // 1. OFF 状态下点击表笔自检 -> 记 meterBlocked，绝不误报 unsafe
    fireEvent.click(leadTestBtn);
    expect(mockAssessment.recordMeterBlocked).toHaveBeenCalledTimes(1);
    expect(mockAssessment.recordMeterBlocked).toHaveBeenCalledWith('cognition');
    expect(mockAssessment.recordUnsafeAction).not.toHaveBeenCalled();

    // 2. OFF 状态下点击测量 -> 记 meterBlocked，绝不误报 unsafe
    fireEvent.click(measureBtn);
    expect(mockAssessment.recordMeterBlocked).toHaveBeenCalledTimes(2);
    expect(mockAssessment.recordUnsafeAction).not.toHaveBeenCalled();

    // 3. 通电状态下打到 DCV_20 电压档测阻 -> 档位不匹配，记 meterBlocked，不记 unsafe
    fireEvent.click(screen.getByRole('button', { name: /DCV 20V/i }));
    fireEvent.click(measureBtn);
    expect(mockAssessment.recordMeterBlocked).toHaveBeenCalledTimes(3);
    expect(mockAssessment.recordUnsafeAction).not.toHaveBeenCalled();

    // 4. 只有当打在电阻档 (Ω 200Ω) 且初级交流激励通电中，点击测量才触发 unsafe
    fireEvent.click(screen.getByRole('button', { name: /Ω 200Ω/i }));
    fireEvent.click(measureBtn);
    expect(mockAssessment.recordUnsafeAction).toHaveBeenCalledTimes(1);
    expect(mockAssessment.recordUnsafeAction).toHaveBeenCalledWith('cognition');
    // meterBlocked 计数不再增加
    expect(mockAssessment.recordMeterBlocked).toHaveBeenCalledTimes(3);
  });

  it('P1-2/P2-4 认知题主动提交防试探：前置齐备下选错认知题按钮可用，提交扣 1 次 wrong 分且不推进；改选 A 提交后锁定且 completeStage 和 onStepComplete 各仅 1 次', () => {
    const { onStepComplete, onAdvanceStep } = setupScene();

    // 准备并测完样本 A/B/C 全部 13 项，通过 3 项诊断与边界题
    fireEvent.click(screen.getByRole('button', { name: /初级输入交流激励/i }));
    fireEvent.click(screen.getByRole('button', { name: /隔离外部接线/i }));
    fireEvent.click(screen.getByRole('button', { name: /确认台架无电压/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ω 200Ω/i }));
    fireEvent.click(screen.getByRole('button', { name: /表笔短接自检/i }));

    const measureBtn = screen.getByRole('button', { name: /执行测量并记录/i });

    // 测 A
    fireEvent.click(screen.getByRole('button', { name: /^样本 A/i }));
    for (const pairName of [/端子 1 – 2/i, /端子 3 – 4/i, /端子 1 – 3/i, /端子 1 – 铁芯 K/i]) {
      fireEvent.click(screen.getByRole('button', { name: pairName }));
      fireEvent.click(measureBtn);
    }
    fireEvent.click(screen.getByLabelText(/两绕组通路正常 \(未见断路\)/i));
    fireEvent.click(screen.getByRole('button', { name: /提交【样本 A】诊断工单/i }));

    // 测 B
    fireEvent.click(screen.getByRole('button', { name: /^样本 B/i }));
    fireEvent.click(screen.getByRole('button', { name: /端子 1 – 2/i }));
    fireEvent.click(measureBtn);
    fireEvent.click(screen.getByRole('button', { name: /Ω 200kΩ/i }));
    fireEvent.click(measureBtn);
    fireEvent.click(screen.getByRole('button', { name: /Ω 200Ω/i }));
    for (const pairName of [/端子 3 – 4/i, /端子 1 – 3/i, /端子 1 – 铁芯 K/i]) {
      fireEvent.click(screen.getByRole('button', { name: pairName }));
      fireEvent.click(measureBtn);
    }
    fireEvent.click(screen.getByLabelText(/初级疑似断路/i));
    fireEvent.click(screen.getByRole('button', { name: /提交【样本 B】诊断工单/i }));

    // 测 C
    fireEvent.click(screen.getByRole('button', { name: /^样本 C/i }));
    for (const pairName of [/端子 1 – 2/i, /端子 3 – 4/i, /端子 1 – 3/i, /端子 1 – 铁芯 K/i]) {
      fireEvent.click(screen.getByRole('button', { name: pairName }));
      fireEvent.click(measureBtn);
    }
    fireEvent.click(screen.getByLabelText(/两绕组低阻 \(需结合基准复核\)/i));
    fireEvent.click(screen.getByRole('button', { name: /提交【样本 C】诊断工单/i }));

    // 提交边界题
    fireEvent.click(screen.getByLabelText(/1–3与1–K在普通万用表下显示OL，仅表示在当前量程\/测试电压下未检出导通/i));
    fireEvent.click(screen.getByRole('button', { name: /提交边界辨析/i }));

    // 此时前置条件已齐备，门槛显示交变磁通题待选择
    expect(screen.getByText(/交变磁通耦合认知题 \(待选择\)/i)).toBeTruthy();

    // 故意选择错误认知选项 B（变压器内部有天线）
    fireEvent.click(screen.getByLabelText(/变压器绝缘层内部有微小的无线电发射天线/i));
    expect(screen.getByText(/交变磁通耦合认知题 \(已选择\)/i)).toBeTruthy();

    // 提交按钮必须是启用的（允许主动提交）
    const submitBtn = screen.getByRole('button', { name: /提交步骤1工单/i });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);

    // 点击提交：必须拦截并扣 1 次 wrong 分
    fireEvent.click(submitBtn);
    expect(mockAssessment.recordWrong).toHaveBeenCalledTimes(1);
    expect(mockAssessment.recordWrong).toHaveBeenCalledWith('cognition');
    expect(screen.getByText(/交变磁通原理认知判断错误/i)).toBeTruthy();
    expect(onStepComplete).not.toHaveBeenCalled();

    // 改选正确选项 A
    fireEvent.click(screen.getByLabelText(/初级交流电在闭合铁芯中激发出交变磁通/i));
    fireEvent.click(submitBtn);

    // 提交成功并锁定
    expect(screen.getByText(/步骤 1 绕组初检与交变磁通工单已锁定提交！/i)).toBeTruthy();
    expect(onStepComplete).toHaveBeenCalledTimes(1);
    expect(mockAssessment.completeStage).toHaveBeenCalledTimes(1);
    expect(mockAssessment.completeStage).toHaveBeenCalledWith('cognition');

    // 点击进入步骤 2 按钮：只能调用 startStage('standard')，不得重复调用 completeStage
    const advanceBtn = screen.getByRole('button', { name: /完成步骤1，进入步骤2/i });
    fireEvent.click(advanceBtn);
    expect(mockAssessment.completeStage).toHaveBeenCalledTimes(1);
    expect(mockAssessment.startStage).toHaveBeenCalledWith('standard');
    expect(onAdvanceStep).toHaveBeenCalledTimes(1);
  });

  it('P1-1 阶段 4 同名端提交安全量程拦截：OFF 和 DCV_20 挡拦截并记录 meterBlocked，ACV_750 挡才可通过', () => {
    const onStepComplete = vi.fn();
    const onAdvanceStep = vi.fn();
    render(
      <D05TransformerScene
        currentStep="POLARITY_AND_SAME_NAME_TERMINALS"
        onStepComplete={onStepComplete}
        onAdvanceStep={onAdvanceStep}
      />
    );

    // 选择同名端正确答案 A
    fireEvent.click(screen.getByRole('button', { name: /总电压为两绕组电压相消相减/i }));
    const submitBtn = screen.getByRole('button', { name: /提交同名端判定分析/i });

    // 1. 仪表初始处于 OFF 关机状态 -> 拦截并记 meterBlocked
    fireEvent.click(submitBtn);
    expect(mockAssessment.recordMeterBlocked).toHaveBeenCalledWith('blind_test');
    expect(onStepComplete).not.toHaveBeenCalled();

    // 2. 拨到 DCV_20 档 -> 拦截并记 meterBlocked
    fireEvent.click(screen.getByRole('button', { name: /DCV 20V/i }));
    fireEvent.click(submitBtn);
    expect(mockAssessment.recordMeterBlocked).toHaveBeenCalledTimes(2);
    expect(onStepComplete).not.toHaveBeenCalled();

    // 3. 拨到 ACV_750 档 -> 成功通过
    fireEvent.click(screen.getByRole('button', { name: /ACV 750V/i }));
    fireEvent.click(submitBtn);
    expect(onStepComplete).toHaveBeenCalledTimes(1);
    expect(onStepComplete).toHaveBeenCalledWith('POLARITY_AND_SAME_NAME_TERMINALS', { choice: 'A' });
  });

  it('P1-1 阶段 5 交付验收安全量程拦截与证据保留：OFF 和 DCV_20 挡拦截，ACV_750 挡才可通过并发出 acVoltage 与 signed 兼容证据', () => {
    const onStepComplete = vi.fn();
    const onAdvanceStep = vi.fn();
    const onComplete = vi.fn();
    render(
      <D05TransformerScene
        currentStep="ONBOARD_INVERTER_STEP_UP_DELIVERY"
        onStepComplete={onStepComplete}
        onAdvanceStep={onAdvanceStep}
        onComplete={onComplete}
      />
    );

    // 开启逆变器、接入负载、签署工单
    fireEvent.click(screen.getByRole('button', { name: /开启车载逆变器开关/i }));
    fireEvent.click(screen.getByRole('button', { name: /接入 100W 笔记本充电器/i }));
    fireEvent.click(screen.getByLabelText(/我已核验车载逆变升压系统输出交流电压与带载性能达标/i));

    const submitBtn = screen.getByRole('button', { name: /签署交付并完成实训/i });

    // 1. 仪表初始处于 OFF 关机状态 -> 拦截并记 meterBlocked
    fireEvent.click(submitBtn);
    expect(mockAssessment.recordMeterBlocked).toHaveBeenCalledWith('transfer');
    expect(onStepComplete).not.toHaveBeenCalled();

    // 2. 拨到 DCV_20 档 -> 拦截并记 meterBlocked
    fireEvent.click(screen.getByRole('button', { name: /DCV 20V/i }));
    fireEvent.click(submitBtn);
    expect(mockAssessment.recordMeterBlocked).toHaveBeenCalledTimes(2);
    expect(onStepComplete).not.toHaveBeenCalled();

    // 3. 拨到 ACV_750 档 -> 成功交付，并发出完整包含原有 acVoltage 与 signed 的证据
    fireEvent.click(screen.getByRole('button', { name: /ACV 750V/i }));
    fireEvent.click(submitBtn);
    expect(onStepComplete).toHaveBeenCalledTimes(1);
    const [stepKey, evidence] = onStepComplete.mock.calls[0] as [string, Record<string, unknown>];
    expect(stepKey).toBe('ONBOARD_INVERTER_STEP_UP_DELIVERY');
    expect(evidence.acVoltage).toBe(219.8);
    expect(evidence.signed).toBe(true);
    expect(evidence.inverterVerified).toBe(true);
    expect(evidence.loadPlugged).toBe(true);
    expect(evidence.workOrderSigned).toBe(true);
    expect(mockAssessment.completeStage).toHaveBeenCalledWith('transfer');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
