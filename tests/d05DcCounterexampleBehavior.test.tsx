// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { D05TransformerScene } from '@/src/levels/d05/D05TransformerScene';
import { D05Experience } from '@/src/levels/d05/D05Experience';
import {
  validateDcCounterexample,
  buildDcCounterexampleEvidence,
  DC_TEACHING_CONFIG,
  TRANSIENT_STEADY_QUESTION,
  PROTECTION_QUESTION,
  INVERTER_QUESTION,
} from '@/src/levels/d05/d05DcCounterexample';
import { D05_STAGE_CONTENT } from '@/src/levels/d05/d05Training';

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
  currentStage: 'calculation',
  stageScores: { calculation: 100 },
  stageAttempts: {},
  mistakeHistory: [],
  isStageCompleted: vi.fn().mockReturnValue(false),
  hasUnsavedChanges: false,
};

vi.mock('@/src/assessment/useLevelAssessment', () => ({
  useLevelAssessment: () => mockAssessment,
}));

describe('D05 步骤 3 恒定直流误接反例专业行为与评估验证', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. 纯模型校验函数 validateDcCounterexample 边界与容差测试', () => {
    it('标准正确值 40.0A 及容差范围 ±0.1A 内的有限数值应全部通过', () => {
      const validCases = ['40', '40.0', '40.05', '39.9', '40.1'];
      for (const val of validCases) {
        const res = validateDcCounterexample(
          'steady_observed',
          val,
          TRANSIENT_STEADY_QUESTION.correctOptionId,
          PROTECTION_QUESTION.correctOptionId,
          INVERTER_QUESTION.correctOptionId
        );
        expect(res.isAllCorrect).toBe(true);
        expect(res.isCurrentValid).toBe(true);
        expect(res.errorCategories).toEqual([]);
      }
    });

    it('超出容差(39.8A, 40.2A)、无效数值(NaN, Infinity, 负数, 非法字符)提交时应判定电流错误', () => {
      const invalidFilledCases = ['39.8', '40.2', 'NaN', 'Infinity', '-40', 'abc'];
      for (const val of invalidFilledCases) {
        const res = validateDcCounterexample(
          'steady_observed',
          val,
          TRANSIENT_STEADY_QUESTION.correctOptionId,
          PROTECTION_QUESTION.correctOptionId,
          INVERTER_QUESTION.correctOptionId
        );
        expect(res.isAllCorrect).toBe(false);
        expect(res.isCurrentCorrect).toBe(false);
        expect(res.errorCategories).toContain('电流估算偏差：请根据理想稳态欧姆定律估算（I = U/R = 12 / 0.30）');
      }
    });

    it('空白未填视为未完成表单，不产生错误扣分分类', () => {
      const blankCases = ['', '   '];
      for (const val of blankCases) {
        const res = validateDcCounterexample(
          'steady_observed',
          val,
          TRANSIENT_STEADY_QUESTION.correctOptionId,
          PROTECTION_QUESTION.correctOptionId,
          INVERTER_QUESTION.correctOptionId
        );
        expect(res.isAllCorrect).toBe(false);
        expect(res.isFilled).toBe(false);
        expect(res.errorCategories).toEqual([]);
      }
    });

    it('错误选项应在 errorCategories 中精准反馈对应分类', () => {
      const res = validateDcCounterexample(
        'steady_observed',
        '40.0',
        'OPT_TS_ALWAYS_ZERO',
        'OPT_PROT_IMMEDIATE_BLOW',
        'OPT_INV_DIRECT_BATTERY'
      );
      expect(res.isAllCorrect).toBe(false);
      expect(res.isCurrentValid).toBe(true);
      expect(res.isTransientCorrect).toBe(false);
      expect(res.isProtectionCorrect).toBe(false);
      expect(res.isInverterCorrect).toBe(false);
      expect(res.errorCategories).toHaveLength(3);
    });

    it('buildDcCounterexampleEvidence 产出的证据对象完全满足 schemaVersion 2 规范', () => {
      const ev = buildDcCounterexampleEvidence(
        40.0,
        TRANSIENT_STEADY_QUESTION.correctOptionId,
        PROTECTION_QUESTION.correctOptionId,
        INVERTER_QUESTION.correctOptionId
      );
      expect(ev.schemaVersion).toBe(2);
      expect(ev.choice).toBe('A');
      expect(ev.modelKind).toBe('qualitative_dc_counterexample');
      expect(ev.supplyVoltage).toBe(12);
      expect(ev.primaryResistanceOhm).toBe(0.3);
      expect(ev.estimatedCurrentA).toBe(40.0);
      expect(ev.observationStagesCompleted).toEqual(['transient', 'steady']);
      expect(ev.protectionOutcome).toBe('not_simulated');
      expect(ev.assumptions).toEqual(DC_TEACHING_CONFIG.assumptions);
      expect(typeof ev.validatedAt).toBe('number');
    });
  });

  describe('2. 交互门槛：未观察或仅观察暂态不可提交，必须完整两阶段观察', () => {
    it('未开始观察时，填写四项后提交按钮仍然禁用，且提示缺少观察', () => {
      const onStepComplete = vi.fn();
      const onAdvanceStep = vi.fn();

      render(
        <D05TransformerScene
          currentStep="DC_INPUT_DISASTER_COUNTEREXAMPLE"
          onStepComplete={onStepComplete}
          onAdvanceStep={onAdvanceStep}
        />
      );

      // 填写全部 4 项
      fireEvent.change(screen.getByPlaceholderText('输入估算值'), {
        target: { value: '40.0' },
      });
      fireEvent.click(
        screen.getByLabelText(/接通时可能有瞬态感应，理想稳态无持续感应输出/)
      );
      fireEvent.click(
        screen.getByLabelText(/存在过流风险，信息不足以断言熔断时刻/)
      );
      fireEvent.click(
        screen.getByLabelText(/经开关电路变为适当的时变激励后驱动变压器/)
      );

      // 观察尚未开始
      expect(screen.getByText(/提交前提：请先在上方完成“接通暂态”与“理想稳态”两阶段观察/)).toBeTruthy();
      const submitBtn = screen.getByRole('button', { name: '提交直流误接分析工单' });
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // 仅完成阶段 1 观察（暂态）
      fireEvent.click(screen.getByRole('button', { name: '观察恒定直流误接（虚拟演示）' }));
      expect(screen.getByText(/接通暂态：电流与磁通经历变化/)).toBeTruthy();
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // 完成阶段 2 观察（稳态）
      fireEvent.click(screen.getByRole('button', { name: '查看理想稳态与风险' }));
      expect(screen.getByText(/已完成两阶段观察（暂态与稳态）/)).toBeTruthy();
      expect(screen.queryByText(/提交前提：请先在上方完成“接通暂态”与“理想稳态”两阶段观察/)).toBeNull();

      // 现在提交按钮应该启用
      expect(submitBtn.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('3. 判错机制与单次扣分：单次提交无论错几项均且仅记一次 wrong 分', () => {
    it('提交四项全错，仅调用一次 assessment.recordWrong("calculation") 并显示分类报错', () => {
      const onStepComplete = vi.fn();
      const onAdvanceStep = vi.fn();

      render(
        <D05TransformerScene
          currentStep="DC_INPUT_DISASTER_COUNTEREXAMPLE"
          onStepComplete={onStepComplete}
          onAdvanceStep={onAdvanceStep}
        />
      );

      // 完成两阶段观察
      fireEvent.click(screen.getByRole('button', { name: '观察恒定直流误接（虚拟演示）' }));
      fireEvent.click(screen.getByRole('button', { name: '查看理想稳态与风险' }));

      // 填入错误内容
      fireEvent.change(screen.getByPlaceholderText('输入估算值'), {
        target: { value: '999' },
      });
      fireEvent.click(screen.getByLabelText(/整个过程副边始终零电压/));
      fireEvent.click(screen.getByLabelText(/只要发生过流，熔断器就会立即熔断/));
      fireEvent.click(screen.getByLabelText(/电池直接接原边就能持续升压/));

      // 点击提交
      const submitBtn = screen.getByRole('button', { name: '提交直流误接分析工单' });
      fireEvent.click(submitBtn);

      // 验证仅扣分一次
      expect(mockAssessment.recordWrong).toHaveBeenCalledTimes(1);
      expect(mockAssessment.recordWrong).toHaveBeenCalledWith('calculation');

      // 验证未产生完成事件
      expect(onStepComplete).not.toHaveBeenCalled();

      // 验证显示具体错误提示
      const alertBox = screen.getByRole('alert');
      expect(alertBox.textContent).toContain('已记入 1 次计算阶段错误扣分');
      expect(alertBox.textContent).toContain('电流估算偏差');
      expect(alertBox.textContent).toContain('暂态与稳态机理判断有误');
      expect(alertBox.textContent).toContain('保护动作判定不科学');
      expect(alertBox.textContent).toContain('逆变器原理理解有误');
    });

    it('修改任何输入项立即清除旧报错，重试提交前不重复扣分', () => {
      const onStepComplete = vi.fn();
      const onAdvanceStep = vi.fn();

      render(
        <D05TransformerScene
          currentStep="DC_INPUT_DISASTER_COUNTEREXAMPLE"
          onStepComplete={onStepComplete}
          onAdvanceStep={onAdvanceStep}
        />
      );

      // 推进观察
      fireEvent.click(screen.getByRole('button', { name: '观察恒定直流误接（虚拟演示）' }));
      fireEvent.click(screen.getByRole('button', { name: '查看理想稳态与风险' }));

      // 填错并提交
      fireEvent.change(screen.getByPlaceholderText('输入估算值'), { target: { value: '0' } });
      fireEvent.click(screen.getByLabelText(/整个过程副边始终零电压/));
      fireEvent.click(screen.getByLabelText(/只要发生过流，熔断器就会立即熔断/));
      fireEvent.click(screen.getByLabelText(/电池直接接原边就能持续升压/));
      fireEvent.click(screen.getByRole('button', { name: '提交直流误接分析工单' }));

      expect(screen.getByRole('alert')).toBeTruthy();

      // 修改输入框
      fireEvent.change(screen.getByPlaceholderText('输入估算值'), { target: { value: '40' } });
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('4. 重置本步演示功能测试', () => {
    it('点击“重置本步演示”清空观察阶段、输入与选项，未通过前可重新观察', () => {
      const onStepComplete = vi.fn();
      const onAdvanceStep = vi.fn();

      render(
        <D05TransformerScene
          currentStep="DC_INPUT_DISASTER_COUNTEREXAMPLE"
          onStepComplete={onStepComplete}
          onAdvanceStep={onAdvanceStep}
        />
      );

      // 观察到暂态并输入
      fireEvent.click(screen.getByRole('button', { name: '观察恒定直流误接（虚拟演示）' }));
      fireEvent.change(screen.getByPlaceholderText('输入估算值'), { target: { value: '40' } });

      // 点击重置
      const resetBtn = screen.getByRole('button', { name: '重置本步演示' });
      fireEvent.click(resetBtn);

      // 验证恢复为初始按钮
      expect(screen.getByRole('button', { name: '观察恒定直流误接（虚拟演示）' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: '查看理想稳态与风险' })).toBeNull();
      // 验证输入已清空
      expect((screen.getByPlaceholderText('输入估算值') as HTMLInputElement).value).toBe('');
    });
  });

  describe('5. 全部正确产出标准 Evidence 且锁定表单，防重复提交', () => {
    it('全部正确后产生包含 schemaVersion: 2 的 evidence，锁定并调用 onStepComplete 一次', () => {
      const onStepComplete = vi.fn();
      const onAdvanceStep = vi.fn();

      render(
        <D05TransformerScene
          currentStep="DC_INPUT_DISASTER_COUNTEREXAMPLE"
          onStepComplete={onStepComplete}
          onAdvanceStep={onAdvanceStep}
        />
      );

      // 完整观察
      fireEvent.click(screen.getByRole('button', { name: '观察恒定直流误接（虚拟演示）' }));
      fireEvent.click(screen.getByRole('button', { name: '查看理想稳态与风险' }));

      // 填入全对答案
      fireEvent.change(screen.getByPlaceholderText('输入估算值'), { target: { value: '40.0' } });
      fireEvent.click(
        screen.getByLabelText(/接通时可能有瞬态感应，理想稳态无持续感应输出/)
      );
      fireEvent.click(
        screen.getByLabelText(/存在过流风险，信息不足以断言熔断时刻/)
      );
      fireEvent.click(
        screen.getByLabelText(/经开关电路变为适当的时变激励后驱动变压器/)
      );

      // 提交工单
      const submitBtn = screen.getByRole('button', { name: '提交直流误接分析工单' });
      fireEvent.click(submitBtn);

      // 验证 onStepComplete 仅被调用一次且参数完全合规
      expect(onStepComplete).toHaveBeenCalledTimes(1);
      const [stepArg, evidenceArg] = onStepComplete.mock.calls[0];
      expect(stepArg).toBe('DC_INPUT_DISASTER_COUNTEREXAMPLE');
      expect(evidenceArg.schemaVersion).toBe(2);
      expect(evidenceArg.choice).toBe('A');
      expect(evidenceArg.modelKind).toBe('qualitative_dc_counterexample');
      expect(evidenceArg.supplyVoltage).toBe(12);
      expect(evidenceArg.primaryResistanceOhm).toBe(0.3);
      expect(evidenceArg.estimatedCurrentA).toBe(40.0);
      expect(evidenceArg.transientSteadyChoice).toBe('OPT_TS_CORRECT');
      expect(evidenceArg.protectionChoice).toBe('OPT_PROT_CORRECT');
      expect(evidenceArg.inverterChoice).toBe('OPT_INV_CORRECT');
      expect(evidenceArg.assumptions).toBeDefined();
      expect(evidenceArg.protectionOutcome).toBe('not_simulated');

      // 验证输入控件已被禁用（锁定状态）
      expect(screen.getByPlaceholderText('输入估算值').hasAttribute('disabled')).toBe(true);

      // 验证展示了理论推导
      expect(screen.getByText(/12V ÷ 0.30Ω = 40.0A/)).toBeTruthy();

      // 验证出现推进按钮并点击
      const advanceBtn = screen.getByRole('button', { name: /进入同名端极性测试/ });
      fireEvent.click(advanceBtn);
      expect(mockAssessment.completeStage).toHaveBeenCalledWith('calculation');
      expect(mockAssessment.startStage).toHaveBeenCalledWith('blind_test');
      expect(onAdvanceStep).toHaveBeenCalledTimes(1);

      // 再次点击不会重复调用
      fireEvent.click(advanceBtn);
      expect(onAdvanceStep).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. 仪表隔离防剧透：步骤 3 隐藏仪表数字区与旋钮，杜绝假读数与熔断模拟', () => {
    it('在步骤 3 中不显示虚假万用表读数和旋钮，展示定性说明卡', () => {
      const onStepComplete = vi.fn();
      const onAdvanceStep = vi.fn();

      render(
        <D05TransformerScene
          currentStep="DC_INPUT_DISASTER_COUNTEREXAMPLE"
          onStepComplete={onStepComplete}
          onAdvanceStep={onAdvanceStep}
        />
      );

      // 仪表卡展示定性说明
      expect(screen.getByText('定性演示／未进行仪表测量')).toBeTruthy();
      expect(
        screen.getByText(/本步骤为恒定直流误接暂态与稳态机理分析，未接入万用表实测/)
      ).toBeTruthy();

      // 确保页面上不包含虚假 40A 万用表读数或已熔断结论
      expect(screen.queryByText('保险丝炸断')).toBeNull();
      expect(screen.queryByText('直流短路灾难')).toBeNull();
      expect(screen.queryByText('半吊子电工')).toBeNull();
    });
  });

  describe('7. 整关重置生命周期保持：重置整关后可重新执行各步骤', () => {
    it('通过 D05Experience 点击“重新开始”后步骤 3 状态完全复位', () => {
      render(<D05Experience onReturnLobby={() => {}} />);

      // 找到“重新开始”按钮并点击
      const restartBtn = screen.getByRole('button', { name: /重新开始/ });
      fireEvent.click(restartBtn);

      // 验证回到步骤 1 初始状态
      expect(screen.getByText(/实训步骤 1：变压器铁芯结构/)).toBeTruthy();
      expect(screen.getByText(/0 \/ 13/)).toBeTruthy();
    });
  });

  describe('8. 严格防剧透与答案防泄露测试（Codex 复核指令 P2 专项）', () => {
    // 匹配如 40A, 40.0A, 40 A, 40.0 A 等答案泄露（不误伤 400V, 40mA, slate-400 等）
    const answerLeakPattern = /(?:^|[^\d.])40(?:\.0+)?\s*A\b/i;

    it('未开始观察状态下，呈现给学生的卡片、题目、选项及带教文本严禁泄露 40A/40.0A 答案', () => {
      const onStepComplete = vi.fn();
      const onAdvanceStep = vi.fn();

      const { container } = render(
        <D05TransformerScene
          currentStep="DC_INPUT_DISASTER_COUNTEREXAMPLE"
          onStepComplete={onStepComplete}
          onAdvanceStep={onAdvanceStep}
        />
      );

      const visibleText = container.textContent || '';
      expect(answerLeakPattern.test(visibleText)).toBe(false);
    });

    it('两阶段观察完成但未提交状态下，呈现给学生的界面文本与选项严禁泄露 40A/40.0A 答案', () => {
      const onStepComplete = vi.fn();
      const onAdvanceStep = vi.fn();

      const { container } = render(
        <D05TransformerScene
          currentStep="DC_INPUT_DISASTER_COUNTEREXAMPLE"
          onStepComplete={onStepComplete}
          onAdvanceStep={onAdvanceStep}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '观察恒定直流误接（虚拟演示）' }));
      fireEvent.click(screen.getByRole('button', { name: '查看理想稳态与风险' }));

      const visibleText = container.textContent || '';
      expect(answerLeakPattern.test(visibleText)).toBe(false);
    });

    it('步骤 3 实训工单配置与教学引导文本中严禁包含 40A/40.0A 答案', () => {
      const s3Content = D05_STAGE_CONTENT.DC_INPUT_DISASTER_COUNTEREXAMPLE;
      const combinedS3Content = [
        s3Content.title,
        s3Content.objective,
        ...s3Content.actions,
        s3Content.mentorPrompt,
        s3Content.hint,
      ].join(' ');

      expect(answerLeakPattern.test(combinedS3Content)).toBe(false);
    });

    it('全对提交并锁定后，成功反馈卡必须正确显示推导公式 12V ÷ 0.30Ω = 40.0A', () => {
      const onStepComplete = vi.fn();
      const onAdvanceStep = vi.fn();

      render(
        <D05TransformerScene
          currentStep="DC_INPUT_DISASTER_COUNTEREXAMPLE"
          onStepComplete={onStepComplete}
          onAdvanceStep={onAdvanceStep}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '观察恒定直流误接（虚拟演示）' }));
      fireEvent.click(screen.getByRole('button', { name: '查看理想稳态与风险' }));

      fireEvent.change(screen.getByPlaceholderText('输入估算值'), { target: { value: '40.0' } });
      fireEvent.click(screen.getByLabelText(/接通时可能有瞬态感应，理想稳态无持续感应输出/));
      fireEvent.click(screen.getByLabelText(/存在过流风险，信息不足以断言熔断时刻/));
      fireEvent.click(screen.getByLabelText(/经开关电路变为适当的时变激励后驱动变压器/));

      fireEvent.click(screen.getByRole('button', { name: '提交直流误接分析工单' }));

      expect(screen.getByText(/12V ÷ 0.30Ω = 40.0A/)).toBeTruthy();
    });
  });
});
