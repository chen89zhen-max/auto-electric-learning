'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  HelpCircle,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DCSolver } from '@/src/circuit/solver/DCSolver';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { type B02Step } from './b02Training';
import {
  COMPOUND_CASES,
  calculateCompoundCircuit,
  calculateBypassCircuitA,
  validateCompoundSubmission,
  type CompoundCaseRecord,
  type BypassRecord,
  type StudentAnswersRaw,
} from './b02Compound';

function solveLampCircuit(voltage: number, lampResistance: number, connection: 'series' | 'parallel') {
  const solver = new DCSolver('0');
  solver.addVoltageSource({ id: 'BATTERY', nodePos: 'P', nodeNeg: '0', voltage });
  if (connection === 'series') {
    solver.addResistor({ id: 'L1', nodeA: 'P', nodeB: 'M', resistance: lampResistance });
    solver.addResistor({ id: 'L2', nodeA: 'M', nodeB: '0', resistance: lampResistance });
  } else {
    solver.addResistor({ id: 'L1', nodeA: 'P', nodeB: '0', resistance: lampResistance });
    solver.addResistor({ id: 'L2', nodeA: 'P', nodeB: '0', resistance: lampResistance });
  }
  return solver.solve();
}

export function compareB02LampConnections(voltage: number, lampOneResistance: number, lampTwoResistance: number) {
  const series = solveLampCircuit(voltage, lampOneResistance, 'series');
  const parallel = solveLampCircuit(voltage, lampTwoResistance, 'parallel');
  return {
    series: {
      lampVoltage: series.branchVoltages.get('L1') ?? 0,
      totalCurrent: series.branchCurrents.get('BATTERY') ?? 0,
    },
    parallel: {
      lampVoltage: parallel.branchVoltages.get('L1') ?? 0,
      totalCurrent: parallel.branchCurrents.get('BATTERY') ?? 0,
      removingOneLampKeepsOtherOn: true,
    },
  };
}

interface B02LoadConnectionSceneProps {
  currentStep: B02Step;
  onStepComplete: (step: B02Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onProcessEvent?: (type: 'wrong' | 'unsafe' | 'meter_blocked') => void;
}

export function B02LoadConnectionScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onProcessEvent,
}: B02LoadConnectionSceneProps) {
  // Step 1: Series Circuit state
  const [isSeriesClosed, setIsSeriesClosed] = useState(false);
  const [isSeriesLamp1Removed, setIsSeriesLamp1Removed] = useState(false);

  // Step 2: Parallel Circuit state
  const [isParallelLamp1Removed, setIsParallelLamp1Removed] = useState(false);

  // Step 3: Compound circuit calculation state
  const [compoundCaseId, setCompoundCaseId] = useState<'A' | 'B'>('A');
  const [inputsCaseA, setInputsCaseA] = useState<StudentAnswersRaw>({
    req: '',
    itotal: '',
    uparallel: '',
    p1: '',
    p2: '',
    p3: '',
    powerRatio: '',
  });
  const [inputsCaseB, setInputsCaseB] = useState<StudentAnswersRaw>({
    req: '',
    itotal: '',
    uparallel: '',
    p1: '',
    p2: '',
    p3: '',
    powerRatio: '',
  });
  const [feedbackCaseA, setFeedbackCaseA] = useState<{
    type: 'format' | 'wrong' | 'success';
    text: string;
    invalidKeys?: (keyof StudentAnswersRaw)[];
  } | null>(null);
  const [feedbackCaseB, setFeedbackCaseB] = useState<{
    type: 'format' | 'wrong' | 'success';
    text: string;
    invalidKeys?: (keyof StudentAnswersRaw)[];
  } | null>(null);
  const [caseRecordA, setCaseRecordA] = useState<CompoundCaseRecord | null>(null);
  const [caseRecordB, setCaseRecordB] = useState<CompoundCaseRecord | null>(null);

  // Step 3: Bypass simulation & choice state
  const [bypassSimulationActive, setBypassSimulationActive] = useState<boolean>(false);
  const [bypassTested, setBypassTested] = useState<boolean>(false);
  const [bypassChoice, setBypassChoice] = useState<string | null>(null);
  const [bypassFeedback, setBypassFeedback] = useState<{
    type: 'warning' | 'wrong' | 'success';
    text: string;
  } | null>(null);
  const [bypassRecord, setBypassRecord] = useState<BypassRecord | null>(null);

  // Step 3: Node question & final step submission
  const [step3Choice, setStep3Choice] = useState<string | null>(null);
  const [step3Submitted, setStep3Submitted] = useState<boolean>(false);
  const [step3Feedback, setStep3Feedback] = useState<string | null>(null);

  // Step 4: Quantitative Fog Lamp Prediction
  const [step4Choice, setStep4Choice] = useState<string | null>(null);
  const [step4Submitted, setStep4Submitted] = useState<boolean>(false);
  const [step4Feedback, setStep4Feedback] = useState<string | null>(null);

  // Step 5: Transfer Spotlight Mod Risk & Decision
  const [step5Decision, setStep5Decision] = useState<string | null>(null);
  const [step5Submitted, setStep5Submitted] = useState<boolean>(false);
  const [step5Feedback, setStep5Feedback] = useState<{
    type: 'success' | 'unsafe' | 'wrong';
    text: string;
  } | null>(null);

  // Step 1 operations
  const handleToggleSeriesSwitch = () => {
    sounds.click();
    const next = !isSeriesClosed;
    setIsSeriesClosed(next);
    if (next && isSeriesLamp1Removed) {
      onStepComplete('SERIES_DIVIDER_TEST', {
        seriesDimmingObserved: true,
        seriesCircuitBroken: true,
        lampVoltage: 6.0,
        totalCurrent: 1.0,
      });
    }
  };

  const handleToggleSeriesLamp1 = () => {
    sounds.click();
    const next = !isSeriesLamp1Removed;
    setIsSeriesLamp1Removed(next);
    if (next) {
      sounds.warningBuzz();
      if (isSeriesClosed) {
        onProcessEvent?.('unsafe');
        onStepComplete('SERIES_DIVIDER_TEST', {
          seriesDimmingObserved: true,
          seriesCircuitBroken: true,
          lampVoltage: 6.0,
          totalCurrent: 1.0,
        });
      }
    }
  };

  // Step 2 operations
  const handleToggleParallelLamp1 = () => {
    sounds.click();
    const next = !isParallelLamp1Removed;
    setIsParallelLamp1Removed(next);
    if (next) {
      sounds.success();
      onStepComplete('PARALLEL_INDEPENDENT_TEST', {
        parallelIndependentObserved: true,
        lamp2StaysOn: true,
        fullVoltage12V: true,
        totalCurrent: 4.0,
        equivalentResistance: 3.0,
      });
    }
  };

  // Step 3 operations
  const handleCompoundInputChange = (key: keyof StudentAnswersRaw, value: string) => {
    if (step3Submitted) return;
    if (compoundCaseId === 'A') {
      setInputsCaseA((prev) => ({ ...prev, [key]: value }));
      if (caseRecordA) setCaseRecordA(null);
      if (feedbackCaseA) setFeedbackCaseA(null);
    } else {
      setInputsCaseB((prev) => ({ ...prev, [key]: value }));
      if (caseRecordB) setCaseRecordB(null);
      if (feedbackCaseB) setFeedbackCaseB(null);
    }
  };

  const handleVerifyCurrentCase = () => {
    if (step3Submitted) return;
    sounds.click();
    const currentParams = COMPOUND_CASES[compoundCaseId];
    const currentInputs = compoundCaseId === 'A' ? inputsCaseA : inputsCaseB;
    const expected = calculateCompoundCircuit(
      currentParams.u,
      currentParams.r1,
      currentParams.r2,
      currentParams.r3
    );
    if (!expected) return;

    const validation = validateCompoundSubmission(currentInputs, expected);
    if (!validation.allValidFormat) {
      sounds.warningBuzz();
      const feedback = {
        type: 'format' as const,
        text: '请填写全部 7 项有效正数数值答案（支持最多两位小数），输入不能为空或 0！',
        invalidKeys: validation.invalidFields,
      };
      if (compoundCaseId === 'A') setFeedbackCaseA(feedback);
      else setFeedbackCaseB(feedback);
      return;
    }

    if (!validation.allCorrect) {
      sounds.warningBuzz();
      onProcessEvent?.('wrong');
      const invalidKeys = (Object.keys(validation.fieldResults!) as (keyof StudentAnswersRaw)[]).filter(
        (k) => !validation.fieldResults![k].isCorrect
      );
      const feedback = {
        type: 'wrong' as const,
        text: `【${currentParams.name}】存在计算偏差，请核对标记红色的字段。提示：先求并联阻值 Rp=(R1×R2)/(R1+R2)，Req=R3+Rp，总电流 Itotal=U/Req，并联电压 Up=Itotal×Rp，各支路功率 P=Up²/R，串联电阻功率 P3=Itotal²×R3。`,
        invalidKeys,
      };
      if (compoundCaseId === 'A') setFeedbackCaseA(feedback);
      else setFeedbackCaseB(feedback);
      return;
    }

    // All correct
    sounds.success();
    const record: CompoundCaseRecord = {
      caseId: compoundCaseId,
      topologyId: 'R3_SERIES_R1_PARALLEL_R2',
      params: {
        u: currentParams.u,
        r1: currentParams.r1,
        r2: currentParams.r2,
        r3: currentParams.r3,
      },
      expected,
      studentAnswers: validation.parsedAnswers!,
      fieldResults: validation.fieldResults!,
      isCorrect: true,
      validatedAt: Date.now(),
    };

    if (compoundCaseId === 'A') {
      setCaseRecordA(record);
      setFeedbackCaseA({
        type: 'success',
        text: '算例 A 核算完全正确！Req=6.0Ω, Itotal=2.0A, Uparallel=8.0V, P1=10.67W, P2=5.33W, P3=8.0W, P1/P2=2.0。数据已录入。',
      });
    } else {
      setCaseRecordB(record);
      setFeedbackCaseB({
        type: 'success',
        text: '算例 B 核算完全正确！Req=8.0Ω, Itotal=1.5A, Uparallel=6.0V, P1=3.0W, P2=6.0W, P3=9.0W, P1/P2=0.5。数据已录入。',
      });
    }
  };

  const handleSwitchCase = (caseId: 'A' | 'B') => {
    if (step3Submitted) return;
    sounds.click();
    setCompoundCaseId(caseId);
    if (caseId === 'B') {
      // 切至算例 B 时，自动恢复正常拓扑图示，避免将算例 A 的短路旁路状态套到算例 B
      setBypassSimulationActive(false);
    }
  };

  const handleTriggerBypassSimulation = () => {
    if (step3Submitted) return;
    if (!caseRecordA || !caseRecordA.isCorrect) {
      sounds.warningBuzz();
      return;
    }
    sounds.zap();
    sounds.warningBuzz();
    // 触发旁路时明确切换显示至算例 A，使电路图与参数严格对应算例 A
    setCompoundCaseId('A');
    setBypassSimulationActive(true);
    setBypassTested(true);
  };

  const handleRestoreNormalCircuit = () => {
    if (step3Submitted) return;
    sounds.click();
    setBypassSimulationActive(false);
  };

  const handleBypassChoiceChange = (choiceId: string) => {
    if (step3Submitted) return;
    setBypassChoice(choiceId);
    // 旁路选项改变时立即撤销旧正确记录与反馈，必须重新主动验证
    setBypassRecord(null);
    setBypassFeedback(null);
  };

  const handleVerifyBypassChoice = () => {
    if (step3Submitted) return;
    sounds.click();
    if (!bypassTested) {
      sounds.warningBuzz();
      setBypassFeedback({
        type: 'warning',
        text: '请先点击“教学仿真：短接 A–B 节点”实际观察物理现象，再提交判断！',
      });
      return;
    }
    if (!bypassChoice) {
      sounds.warningBuzz();
      setBypassFeedback({
        type: 'warning',
        text: '请先选择一个旁路物理现象判断选项！',
      });
      return;
    }
    if (bypassChoice === 'OPT_BYPASS_CORRECT') {
      sounds.success();
      const bypassData = calculateBypassCircuitA();
      setBypassRecord({
        caseId: 'A',
        simulationTested: true,
        normalValues: bypassData.normal,
        bypassedValues: bypassData.bypassed,
        studentChoice: bypassChoice,
        isCorrect: true,
        testedAt: Date.now(),
      });
      setBypassFeedback({
        type: 'success',
        text: '判断完全正确！短路导线将 A–B 等电位跨接，并联负载两端电压降为 0V 被完全旁路；但串联电阻 R3 仍在回路中起限流作用（Req=2Ω），总电流受控为 6A（P3=72W），并非无穷大！',
      });
    } else {
      sounds.warningBuzz();
      onProcessEvent?.('wrong');
      // 错误验证时明确清空旧正确记录，保持未达成
      setBypassRecord(null);
      setBypassFeedback({
        type: 'wrong',
        text: '判断有误：短路直接拉低了整个 A–B 节点两端电压，但串联电阻 R3 依然接入电源回路提供 2Ω 阻值，总电流受控为 6A，并非零阻值或无限大电流！',
      });
    }
  };

  // 前置操作齐备且已选择节点辨析项（可启用工单提交按钮，不因选错而禁用）
  const isStep3ReadyToSubmit =
    caseRecordA !== null &&
    caseRecordA.isCorrect &&
    caseRecordB !== null &&
    caseRecordB.isCorrect &&
    bypassRecord !== null &&
    bypassRecord.isCorrect &&
    bypassRecord.studentChoice === bypassChoice &&
    Boolean(step3Choice);

  const handleSubmitStep3 = () => {
    sounds.click();
    if (step3Submitted) return;

    if (!isStep3ReadyToSubmit) {
      sounds.warningBuzz();
      setStep3Feedback('无法提交：请先录齐算例 A、算例 B、旁路仿真判断并选择节点辨析选项！');
      return;
    }

    // 节点辨析判定：若选择错误选项，扣一次 wrong 且阻止完成
    if (step3Choice !== 'OPT_A') {
      sounds.warningBuzz();
      onProcessEvent?.('wrong');
      setStep3Feedback(
        '分析有误：不要被图纸上线条排在同一水平还是上下层误导！只有节点等电位连接关系才是判定拓扑的唯一物理依据。请重新辨析！'
      );
      return;
    }

    sounds.success();
    setStep3Submitted(true);
    setStep3Feedback(
      '分析完全正确！混联电路定量计算、短路旁路与电气节点本质辨析全部通过！只要元件两端跨接在同一对等电位节点上，就承受相同电压并构成并联；串联限流电阻在并联组短路时仍发挥关键限流保护作用。'
    );
    onStepComplete('COMPOUND_SHORT_BYPASS', {
      nodeTheoryConfirmed: true,
      choice: step3Choice,
      shortBypassTested: true,
      compoundCases: [caseRecordA, caseRecordB],
      bypassRecord,
    });
  };

  // Step 4 operations
  const handleSubmitStep4 = () => {
    sounds.click();
    if (!step4Choice) return;
    setStep4Submitted(true);
    if (step4Choice === 'OPT_12_10') {
      sounds.success();
      setStep4Feedback(
        '推算完全精准！并联等效电阻计算：R_总 = (2.0 × 3.0) / (2.0 + 3.0) = 1.2Ω。在 12V 供电下，总干路工作电流 I_总 = 12.0V ÷ 1.2Ω = 10.0A。汽车改装加装并联电器时，总电流随等效阻值骤降而激增，必须依此核选保险丝与线径！'
      );
      onStepComplete('QUANTITATIVE_FOG_PREDICT', {
        predictedEquivalentResistance: 1.2,
        predictedTotalCurrent: 10.0,
        calculationAccurate: true,
      });
    } else {
      sounds.warningBuzz();
      onProcessEvent?.('wrong');
      setStep4Feedback('计算有误：并联电阻是“越并越小”，不能直接相加！请使用并联并联公式 (R1×R2)/(R1+R2) 重新计算。');
    }
  };

  // Step 5 operations
  const handleSubmitStep5 = () => {
    sounds.click();
    if (!step5Decision || (step5Submitted && step5Decision === 'OPT_A')) return;
    setStep5Submitted(true);
    if (step5Decision === 'OPT_A') {
      sounds.success();
      setStep5Feedback({
        type: 'success',
        text: '决策完全符合专业规范！在 12V/400W 指定工作点，新增负载电流估算约 33.3A，已超原 15A 熔断器标称额定电流，提示严重过载风险。不能在未经核对回路和保护配合时直接增大熔断器额定值；正确处置是停止使用该加装接法，取得车型与灯具资料，核对电源容量、导线载流和压降、连接器与控制器件、环境及熔断器保护配合后决定是否允许加装，以及是否需要专用回路。当前信息不足以批准具体线径和熔断器选型。',
      });
      onStepComplete('TRANSFER_SPOTLIGHT_MOD_RISK', {
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
    } else if (step5Decision === 'OPT_B' || step5Decision === 'OPT_C') {
      sounds.warningBuzz();
      onProcessEvent?.('unsafe');
      setStep5Feedback({
        type: 'unsafe',
        text:
          step5Decision === 'OPT_B'
            ? '危险方案：未经核对回路与保护配合直接换插 40A 熔断器，可能使原回路得不到适当的过载保护，极易导致导线过热；大功率负载绝不能盲目加大熔断器应付使用。'
            : '危险方案：不查灯具技术资料擅自改接串联不可行。汽车照明常规严禁串联，各灯分压不足将无法正常工作，且无法解决系统整体匹配问题。',
      });
    } else {
      sounds.warningBuzz();
      onProcessEvent?.('wrong');
      setStep5Feedback({
        type: 'wrong',
        text: '诊断推断错误：熔断器熔断仅表明曾发生超额定过载或故障电流，在未进行测量诊断前，不能仅凭熔断现象直接断定灯具内部短路。',
      });
    }
  };

  // Step advance ready check
  const isStepAdvanceReady =
    (currentStep === 'SERIES_DIVIDER_TEST' && isSeriesClosed && isSeriesLamp1Removed) ||
    (currentStep === 'PARALLEL_INDEPENDENT_TEST' && isParallelLamp1Removed) ||
    (currentStep === 'COMPOUND_SHORT_BYPASS' &&
      step3Submitted &&
      caseRecordA?.isCorrect &&
      caseRecordB?.isCorrect &&
      bypassRecord?.isCorrect &&
      bypassRecord?.studentChoice === bypassChoice &&
      step3Choice === 'OPT_A') ||
    (currentStep === 'QUANTITATIVE_FOG_PREDICT' && step4Submitted && step4Choice === 'OPT_12_10') ||
    (currentStep === 'TRANSFER_SPOTLIGHT_MOD_RISK' && step5Submitted && step5Decision === 'OPT_A');

  return (
    <div className="w-full flex-1 flex flex-col gap-4 text-slate-800 min-h-[580px]">
      {/* Top Step Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isStepAdvanceReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-xs sm:text-sm font-black text-slate-800 tracking-wider">
              {currentStep === 'SERIES_DIVIDER_TEST' && '阶段 1 / 5 · 串联负载分压暗淡与相互制约缺陷验证'}
              {currentStep === 'PARALLEL_INDEPENDENT_TEST' && '阶段 2 / 5 · 并联独立供电与等效电阻骤降 (汽车标准接法)'}
              {currentStep === 'COMPOUND_SHORT_BYPASS' && '阶段 3 / 5 · 混联短路旁路与电路电气节点本质辨析'}
              {currentStep === 'QUANTITATIVE_FOG_PREDICT' && '阶段 4 / 5 · 加装并联雾灯组等效阻值与总电流推算'}
              {currentStep === 'TRANSFER_SPOTLIGHT_MOD_RISK' && '阶段 5 / 5 · 加装射灯熔断器熔断风险评估与处置决策'}
            </span>
          </div>

          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            5阶段综合实训
          </span>
        </div>

        {isStepAdvanceReady && (
          <Button
            size="sm"
            onClick={onAdvanceStep}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 px-4 shadow-sm cursor-pointer"
          >
            <span>{currentStep === 'TRANSFER_SPOTLIGHT_MOD_RISK' ? '查看通关报告' : '进入下一步'}</span>
            <ArrowRight size={16} />
          </Button>
        )}
      </div>

      {/* STEP 1: Series Divider & Dimming (Counterexample) */}
      {currentStep === 'SERIES_DIVIDER_TEST' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                双车灯串联实验台 · 串联分压与断路联动反例
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-600">
                回路状态：{isSeriesClosed ? (!isSeriesLamp1Removed ? '闭合通电' : '灯1拧下断开') : '开关断开'}
              </span>
            </div>

            {/* Circuit Diagram Visual SVG */}
            <div className="w-full h-60 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 460 140" className="w-full h-full max-w-lg">
                {/* 12V Battery */}
                <rect x="25" y="40" width="60" height="50" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
                <text x="55" y="65" fill="#93c5fd" fontSize="13" textAnchor="middle" fontWeight="bold">12V 蓄电池</text>
                <text x="55" y="80" fill="#60a5fa" fontSize="10" textAnchor="middle">电源端</text>

                {/* Wire to Switch */}
                <line x1="85" y1="65" x2="140" y2="65" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* Switch */}
                <circle cx="140" cy="65" r="5" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                <line
                  x1="140"
                  y1="65"
                  x2={isSeriesClosed ? 180 : 172}
                  y2={isSeriesClosed ? 65 : 42}
                  stroke="#38bdf8"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <circle cx="180" cy="65" r="5" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />

                {/* Wire to Lamp 1 */}
                <line x1="180" y1="65" x2="220" y2="65" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* Lamp 1 (6Ω) */}
                {!isSeriesLamp1Removed ? (
                  <g>
                    <circle
                      cx="245"
                      cy="65"
                      r="22"
                      fill={isSeriesClosed ? '#ca8a04' : '#334155'}
                      stroke="#eab308"
                      strokeWidth="2.5"
                      className={isSeriesClosed ? 'filter drop-shadow-[0_0_8px_rgba(202,138,4,0.6)]' : ''}
                    />
                    <text x="245" y="69" fill={isSeriesClosed ? '#fef08a' : '#94a3b8'} fontSize="11" textAnchor="middle" fontWeight="bold">
                      灯1 (6Ω)
                    </text>
                    <text x="245" y="100" fill="#facc15" fontSize="10" textAnchor="middle">
                      {isSeriesClosed ? '分压 6.0V (暗)' : '0V'}
                    </text>
                  </g>
                ) : (
                  <g>
                    <circle cx="230" cy="65" r="6" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
                    <circle cx="260" cy="65" r="6" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
                    <text x="245" y="55" fill="#f87171" fontSize="10" textAnchor="middle" fontWeight="bold">断口 (灯1拔出)</text>
                  </g>
                )}

                {/* Series Wire between Lamp 1 and Lamp 2 */}
                <line x1="267" y1="65" x2="310" y2="65" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* Lamp 2 (6Ω) */}
                <circle
                  cx="335"
                  cy="65"
                  r="22"
                  fill={isSeriesClosed && !isSeriesLamp1Removed ? '#ca8a04' : '#334155'}
                  stroke="#eab308"
                  strokeWidth="2.5"
                  className={isSeriesClosed && !isSeriesLamp1Removed ? 'filter drop-shadow-[0_0_8px_rgba(202,138,4,0.6)]' : ''}
                />
                <text
                  x="335"
                  y="69"
                  fill={isSeriesClosed && !isSeriesLamp1Removed ? '#fef08a' : '#94a3b8'}
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  灯2 (6Ω)
                </text>
                <text x="335" y="100" fill="#facc15" fontSize="10" textAnchor="middle">
                  {isSeriesClosed && !isSeriesLamp1Removed ? '分压 6.0V (暗)' : '0V (熄灭)'}
                </text>

                {/* Wire to 10A Ammeter */}
                <line x1="357" y1="65" x2="390" y2="65" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* Return Ground */}
                <line x1="390" y1="65" x2="425" y2="65" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="425" y1="65" x2="425" y2="120" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="425" y1="120" x2="55" y2="120" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="55" y1="120" x2="55" y2="90" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Operator Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1 text-sm">
              <Button
                onClick={handleToggleSeriesSwitch}
                className={`font-bold py-3 cursor-pointer ${
                  isSeriesClosed ? 'bg-slate-700 hover:bg-slate-800 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                1. {isSeriesClosed ? '断开电路开关' : '闭合开关通电观察两灯'}
              </Button>
              <Button
                onClick={handleToggleSeriesLamp1}
                className={`font-bold py-3 cursor-pointer ${
                  isSeriesLamp1Removed
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                2. {isSeriesLamp1Removed ? '重新旋入灯泡1' : '拧下灯泡1 (模拟单灯烧断)'}
              </Button>
            </div>

            {isSeriesClosed && !isSeriesLamp1Removed && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-900 font-semibold flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <span>串联分压现象：两盏 6Ω 灯串联分得总电压（各 6.0V），亮度严重衰减变暗！请继续点击“拧下灯泡1”测试相互影响。</span>
              </div>
            )}

            {isSeriesLamp1Removed && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>串联致命制约验证：拧下灯泡1形成开路断点，灯泡2也瞬间熄灭（全回路电流为 0）！严格验证了串联回路“一断俱断”缺陷。</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <Gauge size={18} />
                串联回路万用表示数
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-900 text-amber-200 border border-amber-700">
                串联总阻：12.0Ω
              </span>
            </div>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">SERIES CIRCUIT</span>
                <span className="font-bold text-amber-300">
                  {isSeriesClosed ? (!isSeriesLamp1Removed ? '6V PER LAMP' : 'BROKEN') : 'OPEN'}
                </span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {isSeriesClosed && !isSeriesLamp1Removed ? '1.00 A' : '0.00 A'}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>TOTAL RESISTANCE: 12Ω</span>
                <span className="font-bold">DC AMPERES</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">汽车电工认知铁律：</strong>
              串联负载互相制约：U_总 = U1 + U2，R_总 = R1 + R2。若汽车灯光采用串联，一旦一只灯丝烧断，另一侧大灯也会同时熄灭，将导致夜间行车瞬间失明！因此汽车用电设备<strong>严禁常规照明串联</strong>。
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Parallel Independent Circuit (Standard Automotive Wiring) */}
      {currentStep === 'PARALLEL_INDEPENDENT_TEST' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                汽车标准双大灯并联实验台 · 独立供电与等效电阻骤降
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800">
                标准并联架构：节点 P 与 0
              </span>
            </div>

            {/* Circuit Diagram Visual SVG */}
            <div className="w-full h-60 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 460 140" className="w-full h-full max-w-lg">
                {/* 12V Battery */}
                <rect x="25" y="45" width="60" height="50" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
                <text x="55" y="70" fill="#93c5fd" fontSize="13" textAnchor="middle" fontWeight="bold">12V 蓄电池</text>
                <text x="55" y="85" fill="#60a5fa" fontSize="10" textAnchor="middle">电源母线</text>

                {/* Positive Bus */}
                <line x1="85" y1="70" x2="160" y2="70" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
                <circle cx="160" cy="70" r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
                <text x="160" y="55" fill="#fca5a5" fontSize="11" textAnchor="middle" fontWeight="bold">节点 P (+12V)</text>

                {/* Branch 1 (Upper) */}
                <path d="M 160 70 L 160 35 L 220 35" fill="none" stroke="#ef4444" strokeWidth="4" />
                {!isParallelLamp1Removed ? (
                  <g>
                    <circle
                      cx="250"
                      cy="35"
                      r="22"
                      fill="#facc15"
                      stroke="#eab308"
                      strokeWidth="2.5"
                      className="filter drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]"
                    />
                    <text x="250" y="39" fill="#713f12" fontSize="11" textAnchor="middle" fontWeight="black">
                      灯1 (6Ω)
                    </text>
                    <path d="M 272 35 L 340 35 L 340 70" fill="none" stroke="#64748b" strokeWidth="4" />
                  </g>
                ) : (
                  <g>
                    <circle cx="230" cy="35" r="5" fill="#ef4444" />
                    <circle cx="270" cy="35" r="5" fill="#ef4444" />
                    <text x="250" y="24" fill="#f87171" fontSize="10" textAnchor="middle" fontWeight="bold">支路1断开</text>
                  </g>
                )}

                {/* Branch 2 (Lower) */}
                <path d="M 160 70 L 160 105 L 220 105" fill="none" stroke="#ef4444" strokeWidth="4" />
                <circle
                  cx="250"
                  cy="105"
                  r="22"
                  fill="#facc15"
                  stroke="#eab308"
                  strokeWidth="2.5"
                  className="filter drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]"
                />
                <text x="250" y="109" fill="#713f12" fontSize="11" textAnchor="middle" fontWeight="black">
                  灯2 (6Ω)
                </text>
                <path d="M 272 105 L 340 105 L 340 70" fill="none" stroke="#64748b" strokeWidth="4" />

                {/* Common Return Node 0 */}
                <circle cx="340" cy="70" r="6" fill="#64748b" stroke="#fff" strokeWidth="2" />
                <text x="340" y="55" fill="#cbd5e1" fontSize="11" textAnchor="middle" fontWeight="bold">节点 0 (GND)</text>

                {/* Main Return Wire */}
                <line x1="340" y1="70" x2="425" y2="70" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="425" y1="70" x2="425" y2="130" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="425" y1="130" x2="55" y2="130" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="55" y1="130" x2="55" y2="95" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Operator Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1 text-sm">
              <Button
                variant="outline"
                disabled
                className="bg-slate-100 text-slate-700 font-bold py-3 cursor-default"
              >
                并联支路电压：12.0 V (满额高亮)
              </Button>
              <Button
                onClick={handleToggleParallelLamp1}
                className={`font-bold py-3 cursor-pointer ${
                  isParallelLamp1Removed
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isParallelLamp1Removed ? '重新接入灯泡1' : '拆卸灯泡1 (观察灯泡2是否受影响)'}
              </Button>
            </div>

            {isParallelLamp1Removed ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>并联独立工作验证：灯泡1拆下后，灯泡2两端依然承受 12.0V 节点电压，保持全亮发光！总干路电流由 4.0A 降至 2.0A，各支路互不干扰。</span>
              </div>
            ) : (
              <div className="p-3.5 bg-blue-50 border border-blue-300 rounded-lg text-sm text-blue-900 font-semibold flex items-center gap-2">
                <Lightbulb size={18} className="text-blue-600 shrink-0" />
                <span>并联等效阻值骤降：两个 6Ω 灯泡并联，等效电阻仅为 3.0Ω！总电流激增至 4.0A。请点击“拆卸灯泡1”测试独立性。</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <Gauge size={18} />
                总干路主电流表读数
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-900 text-emerald-200 border border-emerald-700">
                并联等效：3.0Ω
              </span>
            </div>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">PARALLEL MAIN FEED</span>
                <span className="font-bold text-amber-300">
                  {isParallelLamp1Removed ? 'SINGLE BRANCH (2A)' : 'DUAL BRANCH (4A)'}
                </span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {isParallelLamp1Removed ? '2.00 A' : '4.00 A'}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>VOLTAGE: 12.00 V</span>
                <span className="font-bold">DC AMPERES</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">并联核心公式：</strong>
              1/R_并 = 1/R1 + 1/R2 ⇒ R_并 = (6 × 6) / (6 + 6) = 3.0 Ω。<br />
              并联支路越多，总等效电阻越小，总干路电流越大（I_总 = I1 + I2）！
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Compound Calculation, Short Bypass & Node Theory Question */}
      {currentStep === 'COMPOUND_SHORT_BYPASS' && (() => {
        const activeCase = COMPOUND_CASES[compoundCaseId];
        const currentInputs = compoundCaseId === 'A' ? inputsCaseA : inputsCaseB;
        const currentFeedback = compoundCaseId === 'A' ? feedbackCaseA : feedbackCaseB;
        const currentCaseRecord = compoundCaseId === 'A' ? caseRecordA : caseRecordB;
        const isBypassValid = Boolean(bypassRecord?.isCorrect && bypassRecord?.studentChoice === bypassChoice);
        const completedPrereqs = [
          Boolean(caseRecordA),
          Boolean(caseRecordB),
          isBypassValid,
          Boolean(step3Choice),
        ].filter(Boolean).length;

        const inputFieldsConfig: {
          key: keyof StudentAnswersRaw;
          label: string;
          unit: string;
          placeholder: string;
          hint: string;
        }[] = [
          { key: 'req', label: '1. 总等效电阻 Req', unit: 'Ω', placeholder: '请输入计算结果', hint: 'Req = R3 + (R1×R2)/(R1+R2)' },
          { key: 'itotal', label: '2. 总回路电流 Itotal', unit: 'A', placeholder: '请输入计算结果', hint: 'Itotal = U / Req' },
          { key: 'uparallel', label: '3. 并联节点电压 Uparallel', unit: 'V', placeholder: '请输入计算结果', hint: 'Uparallel = Itotal × Rp' },
          { key: 'p1', label: '4. 电阻 R1 消耗功率 P1', unit: 'W', placeholder: '请输入计算结果', hint: 'P1 = Uparallel² / R1' },
          { key: 'p2', label: '5. 电阻 R2 消耗功率 P2', unit: 'W', placeholder: '请输入计算结果', hint: 'P2 = Uparallel² / R2' },
          { key: 'p3', label: '6. 串联电阻 R3 功率 P3', unit: 'W', placeholder: '请输入计算结果', hint: 'P3 = Itotal² × R3' },
          { key: 'powerRatio', label: '7. 功率分配比值 P1 / P2', unit: '无单位', placeholder: '请输入比值结果', hint: '比值 = P1 / P2' },
        ];

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Interactive Workspace */}
            <div className="lg:col-span-7 flex flex-col gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-sm font-bold text-slate-800">
                    混联电路定量计算与短路旁路分析
                  </span>
                  <span className="block text-sm text-slate-500 mt-0.5">
                    教学恒阻模型，不模拟灯丝温升及真实电源内阻
                  </span>
                </div>
                {step3Submitted && (
                  <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    （已提交工单，控件锁定）
                  </span>
                )}
              </div>

              {/* 5.1 混联电路拓扑 SVG */}
              <div className="w-full bg-slate-900 rounded-xl p-3 border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between text-sm text-slate-300 pb-2 border-b border-slate-800">
                  <span className="font-bold text-amber-400">
                    拓扑结构：R3 串联 (R1 ∥ R2) · {bypassSimulationActive && compoundCaseId === 'A' ? '算例 A 旁路实验 (A–B 导线短接)' : `当前：${activeCase.name}`}
                  </span>
                  <span className="text-slate-400 font-mono">供电：12.0V DC</span>
                </div>

                <div className="w-full h-56 flex items-center justify-center relative overflow-hidden">
                  <svg viewBox="0 0 520 200" className="w-full h-full max-w-lg">
                    {/* 12V Battery on Left */}
                    <rect x="20" y="65" width="55" height="70" rx="6" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
                    <text x="47" y="98" fill="#93c5fd" fontSize="13" textAnchor="middle" fontWeight="bold">12V 电源</text>
                    <text x="47" y="118" fill="#60a5fa" fontSize="10" textAnchor="middle">理想直流</text>

                    {/* Positive Terminal P */}
                    <line x1="75" y1="100" x2="115" y2="100" stroke="#ef4444" strokeWidth="4" />
                    <circle cx="115" cy="100" r="5" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                    <text x="115" y="85" fill="#fca5a5" fontSize="11" textAnchor="middle" fontWeight="bold">节点 P (+12V)</text>

                    {/* Series Resistor R3 */}
                    <line x1="115" y1="100" x2="155" y2="100" stroke="#ef4444" strokeWidth="4" />
                    <rect x="155" y="84" width="70" height="32" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                    <text x="190" y="104" fill="#fef08a" fontSize="12" textAnchor="middle" fontWeight="bold">
                      R3 = {activeCase.r3}Ω
                    </text>
                    <text x="190" y="75" fill="#cbd5e1" fontSize="10" textAnchor="middle">
                      串联限流 (Itotal →)
                    </text>

                    {/* Wire to Node A */}
                    <line x1="225" y1="100" x2="270" y2="100" stroke="#ef4444" strokeWidth="4" />
                    <circle cx="270" cy="100" r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
                    <text x="270" y="82" fill="#fca5a5" fontSize="12" textAnchor="middle" fontWeight="black">节点 A</text>

                    {/* Parallel Branch 1 (Upper): R1 */}
                    <path d="M 270 100 L 270 50 L 320 50" fill="none" stroke="#ef4444" strokeWidth="3.5" />
                    <rect
                      x="320"
                      y="34"
                      width="70"
                      height="32"
                      rx="4"
                      fill="#0f172a"
                      stroke={bypassSimulationActive && compoundCaseId === 'A' ? '#64748b' : '#38bdf8'}
                      strokeWidth="2"
                    />
                    <text x="355" y="54" fill={bypassSimulationActive && compoundCaseId === 'A' ? '#94a3b8' : '#e0f2fe'} fontSize="12" textAnchor="middle" fontWeight="bold">
                      R1 = {activeCase.r1}Ω
                    </text>
                    <text x="355" y="26" fill="#94a3b8" fontSize="10" textAnchor="middle">
                      {bypassSimulationActive && compoundCaseId === 'A' ? '已旁路 (0V)' : '支路1 (I1 →)'}
                    </text>
                    <path d="M 390 50 L 440 50 L 440 100" fill="none" stroke="#64748b" strokeWidth="3.5" />

                    {/* Parallel Branch 2 (Lower): R2 */}
                    <path d="M 270 100 L 270 150 L 320 150" fill="none" stroke="#ef4444" strokeWidth="3.5" />
                    <rect
                      x="320"
                      y="134"
                      width="70"
                      height="32"
                      rx="4"
                      fill="#0f172a"
                      stroke={bypassSimulationActive && compoundCaseId === 'A' ? '#64748b' : '#a855f7'}
                      strokeWidth="2"
                    />
                    <text x="355" y="154" fill={bypassSimulationActive && compoundCaseId === 'A' ? '#94a3b8' : '#f3e8ff'} fontSize="12" textAnchor="middle" fontWeight="bold">
                      R2 = {activeCase.r2}Ω
                    </text>
                    <text x="355" y="180" fill="#94a3b8" fontSize="10" textAnchor="middle">
                      {bypassSimulationActive && compoundCaseId === 'A' ? '已旁路 (0V)' : '支路2 (I2 →)'}
                    </text>
                    <path d="M 390 150 L 440 150 L 440 100" fill="none" stroke="#64748b" strokeWidth="3.5" />

                    {/* Node B (GND) */}
                    <circle cx="440" cy="100" r="6" fill="#64748b" stroke="#fff" strokeWidth="2" />
                    <text x="440" y="82" fill="#cbd5e1" fontSize="12" textAnchor="middle" fontWeight="black">节点 B (GND)</text>

                    {/* Return Path to Battery Negative */}
                    <line x1="440" y1="100" x2="490" y2="100" stroke="#64748b" strokeWidth="4" />
                    <line x1="490" y1="100" x2="490" y2="185" stroke="#64748b" strokeWidth="4" />
                    <line x1="490" y1="185" x2="47" y2="185" stroke="#64748b" strokeWidth="4" />
                    <line x1="47" y1="185" x2="47" y2="135" stroke="#64748b" strokeWidth="4" />

                    {/* Short Circuit Bypass Line between Node A and Node B */}
                    {bypassSimulationActive && compoundCaseId === 'A' && (
                      <g>
                        <line x1="270" y1="100" x2="440" y2="100" stroke="#ef4444" strokeWidth="6" strokeDasharray="6 3" />
                        <rect x="290" y="90" width="130" height="20" rx="4" fill="#ef4444" />
                        <text x="355" y="104" fill="#ffffff" fontSize="11" textAnchor="middle" fontWeight="bold">
                          0Ω 导线直接短接 A–B
                        </text>
                      </g>
                    )}
                  </svg>
                </div>

                {/* 电路核心参数与节点 HTML 标注（在手机等小屏视口保证 >=14px 清晰可读） */}
                <div
                  data-testid="b02-circuit-board"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2.5 mt-2 border-t border-slate-800 text-sm"
                >
                  <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700 text-slate-200">
                    <span className="text-amber-400 font-bold block text-sm">干路限流电阻 R3</span>
                    <span className="font-mono text-white font-bold text-base">{activeCase.r3} Ω</span>
                    <span className="block text-sm text-slate-300 mt-0.5">流向: +12V → 节点 A</span>
                  </div>
                  <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700 text-slate-200">
                    <span className="text-sky-400 font-bold block text-sm">并联支路 1 (R1)</span>
                    <span className="font-mono text-white font-bold text-base">{activeCase.r1} Ω</span>
                    <span className="block text-sm text-slate-300 mt-0.5">跨接于 A–B 节点之间</span>
                  </div>
                  <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700 text-slate-200">
                    <span className="text-purple-400 font-bold block text-sm">并联支路 2 (R2)</span>
                    <span className="font-mono text-white font-bold text-base">{activeCase.r2} Ω</span>
                    <span className="block text-sm text-slate-300 mt-0.5">跨接于 A–B 节点之间</span>
                  </div>
                  <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700 text-slate-200">
                    <span className="text-emerald-400 font-bold block text-sm">电气节点定义</span>
                    <span className="text-slate-100 font-bold text-sm">节点 A (前端) / B (地)</span>
                    <span className="block text-sm text-slate-300 mt-0.5">
                      {bypassSimulationActive && compoundCaseId === 'A' ? 'A–B 已被 0Ω 导线短接' : '双支路正常并联'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5.1 算例切换与 7 项输入表单 */}
              <div className="flex flex-col gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700">切换参数算例：</span>
                    <button
                      type="button"
                      disabled={step3Submitted}
                      onClick={() => handleSwitchCase('A')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition-colors ${
                        compoundCaseId === 'A'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      算例 A (6Ω / 12Ω / 2Ω) {caseRecordA ? '✓' : ''}
                    </button>
                    <button
                      type="button"
                      disabled={step3Submitted}
                      onClick={() => handleSwitchCase('B')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition-colors ${
                        compoundCaseId === 'B'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      算例 B (12Ω / 6Ω / 4Ω) {caseRecordB ? '✓' : ''}
                    </button>
                  </div>

                  <span className="text-sm font-bold text-slate-600">
                    核算进度：
                    <span className="font-mono font-bold text-blue-600 ml-1">
                      {(caseRecordA ? 1 : 0) + (caseRecordB ? 1 : 0)} / 2
                    </span>
                  </span>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-sm text-blue-900 leading-relaxed">
                  <strong>当前算例参数：</strong>供电 U = 12.0V，并联电阻 R1 = {activeCase.r1}Ω、R2 = {activeCase.r2}Ω，串联电阻 R3 = {activeCase.r3}Ω。
                  请独立推算下列 7 项电参数（支持最多两位小数，统一绝对容差 ±0.02）：
                </div>

                {/* 7 个数值输入项（单列自适应） */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inputFieldsConfig.map((field) => {
                    const isFieldInvalid = currentFeedback?.invalidKeys?.includes(field.key);
                    const isFieldPassed = currentCaseRecord?.fieldResults[field.key]?.isCorrect;

                    return (
                      <div key={field.key} className="flex flex-col gap-1">
                        <label htmlFor={`compound-input-${field.key}`} className="text-sm font-bold text-slate-700">
                          {field.label} ({field.unit})
                        </label>
                        <div className="relative">
                          <input
                            id={`compound-input-${field.key}`}
                            type="number"
                            step="any"
                            disabled={step3Submitted}
                            value={currentInputs[field.key]}
                            onChange={(e) => handleCompoundInputChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className={`w-full p-2.5 rounded-lg border text-sm font-mono text-slate-900 bg-white transition-colors ${
                              isFieldInvalid
                                ? 'border-rose-500 bg-rose-50/60 focus:border-rose-600'
                                : isFieldPassed
                                  ? 'border-emerald-500 bg-emerald-50/40'
                                  : 'border-slate-300 focus:border-blue-500'
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                          />
                          {isFieldPassed && (
                            <span className="absolute right-2.5 top-2.5 text-xs font-bold text-emerald-600">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-slate-500">{field.hint}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    onClick={handleVerifyCurrentCase}
                    disabled={step3Submitted}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    验证【{activeCase.name.split('·')[0].trim()}】计算
                  </Button>

                  {currentCaseRecord && (
                    <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      ✓ 该算例已核算通过 (功率比 P1/P2 = {currentCaseRecord.expected.powerRatio})
                    </span>
                  )}
                </div>

                {currentFeedback && (
                  <div
                    className={`p-3 rounded-xl text-sm flex items-start gap-2 leading-relaxed ${
                      currentFeedback.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                        : currentFeedback.type === 'format'
                          ? 'bg-amber-50 border border-amber-300 text-amber-900'
                          : 'bg-rose-50 border border-rose-300 text-rose-900'
                    }`}
                  >
                    {currentFeedback.type === 'success' ? (
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{currentFeedback.text}</span>
                  </div>
                )}
              </div>

              {/* 5.2 算例 A 旁路实验（仅在算例 A 达标后开放） */}
              <div className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-sm font-bold text-slate-800">
                    算例 A 旁路实验（基于算例 A 拓扑）
                  </span>
                  {caseRecordA ? (
                    <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      已解锁
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                      需算例 A 达标后解锁
                    </span>
                  )}
                </div>

                {!caseRecordA ? (
                  <div className="p-3.5 bg-slate-100 border border-dashed border-slate-300 rounded-xl text-sm text-slate-600 leading-relaxed">
                    实训考核门槛：需先完成【算例 A】全部 7 项数值核算达标，方可解锁 A–B 节点短路旁路仿真实验。
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={step3Submitted}
                        onClick={handleTriggerBypassSimulation}
                        className={`text-sm font-bold px-4 py-2.5 cursor-pointer shadow-xs ${
                          bypassSimulationActive
                            ? 'bg-red-700 text-white hover:bg-red-800'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        教学仿真：短接 A–B 节点 (观察并联旁路)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={step3Submitted || !bypassSimulationActive}
                        onClick={handleRestoreNormalCircuit}
                        className="text-sm border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        恢复正常拓扑
                      </Button>
                      <span className="text-sm text-slate-500 self-center">
                        （虚拟教学仿真，非实车操作指令）
                      </span>
                    </div>

                    {/* 正常 vs 旁路对照面板 */}
                    <div className="p-3.5 bg-white border border-slate-300 rounded-xl space-y-2 text-sm leading-relaxed">
                      <div className="font-bold text-slate-800">电路状态参数对照：</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                          <strong className="text-slate-700 block">正常算例 A：</strong>
                          Req = 6.0Ω，Itotal = 2.0A，UAB = 8.0V，P1 = 10.67W，P2 = 5.33W，P3 = 8.0W。
                        </div>
                        <div className="p-2.5 bg-red-50 rounded-lg border border-red-200 text-red-950">
                          <strong className="text-red-700 block">A–B 导线短接后：</strong>
                          UAB = 0V (R1/R2 被旁路，I1=I2=0A)；R3 仍串在回路中限流，Req = 2.0Ω，Itotal = 6.0A，P3 = 72.0W。
                        </div>
                      </div>
                      <p className="text-slate-600 mt-1">
                        注：全回路等效电阻不为零（R3 仍限流），总电流受控为 6A，非无限大电流；本模型未提供熔断器安秒特性曲线，不模拟熔断结论，实际保护动作依具体保护元件定值而定。
                      </p>
                    </div>

                    {/* 旁路物理机理辨析单选 */}
                    <div className="space-y-2 pt-1">
                      <div className="text-sm font-bold text-slate-800 block">
                        旁路机理辨析题：当 A–B 节点发生金属性短路时，回路物理量如何变化？
                      </div>
                      <div className="space-y-2">
                        {[
                          {
                            id: 'OPT_BYPASS_CORRECT',
                            text: '并联组两端电压为零（R1 与 R2 被旁路），R3 仍串联限流，总电流增至 6A',
                          },
                          {
                            id: 'OPT_BYPASS_WRONG_ZERO',
                            text: '全回路等效电阻降为零，总电流变为无限大，全电路所有元件全部烧毁',
                          },
                          {
                            id: 'OPT_BYPASS_WRONG_PARTIAL',
                            text: '只有支路 R2 受影响，支路 R1 两端电压依然维持 8V 不变',
                          },
                        ].map((opt) => (
                          <label
                            key={opt.id}
                            className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm transition-colors cursor-pointer ${
                              bypassChoice === opt.id
                                ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-bold'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="bypass_choice"
                              value={opt.id}
                              disabled={step3Submitted}
                              checked={bypassChoice === opt.id}
                              onChange={() => handleBypassChoiceChange(opt.id)}
                              className="mt-1 cursor-pointer"
                            />
                            <span className="leading-relaxed">{opt.text}</span>
                          </label>
                        ))}
                      </div>

                      <div className="pt-1">
                        <Button
                          type="button"
                          disabled={step3Submitted || !bypassChoice}
                          onClick={handleVerifyBypassChoice}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          验证旁路判断
                        </Button>
                      </div>

                      {bypassFeedback && (
                        <div
                          className={`p-3 rounded-xl text-sm flex items-start gap-2 leading-relaxed ${
                            bypassFeedback.type === 'success'
                              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                              : 'bg-rose-50 border border-rose-300 text-rose-900'
                          }`}
                        >
                          {bypassFeedback.type === 'success' ? (
                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <span>{bypassFeedback.text}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 5.3 电气节点本质辨析工单 */}
              <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 flex flex-col gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <HelpCircle size={18} className="text-blue-600" />
                  <strong className="text-sm font-bold text-slate-800">
                    电路拓扑深度认知辨析工单
                  </strong>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">
                  学徒小李在看汽车电路原理图时认为：<em>“判断两个元器件是串联还是并联，只要看电路图纸上它们是不是排在同一条水平线上。”</em> 作为带教技师，你的正确指引是：
                </p>

                <div className="flex flex-col gap-2.5">
                  {[
                    {
                      id: 'OPT_A',
                      text: 'A. 说法错误：串联与并联的物理本质由“电气节点”决定，而非图纸绘制形状。只要元件两端分别跨接在同一对等电位电气节点之间（承受同一电压），在电气上就是并联；若元件顺次首尾相连中间无分支节点（流过相同电流），就是串联。',
                    },
                    {
                      id: 'OPT_B',
                      text: 'B. 说法正确：排在一条直线上的元器件必定是串联，分在上下层画出的必定是并联。',
                    },
                    {
                      id: 'OPT_C',
                      text: 'C. 说法正确：只要电路中有三根导线交汇，无论如何连接所有元件都会自动变成混联。',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-sm ${
                        step3Choice === opt.id
                          ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-medium'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="step3_opt"
                        value={opt.id}
                        disabled={step3Submitted}
                        checked={step3Choice === opt.id}
                        onChange={() => {
                          sounds.click();
                          setStep3Choice(opt.id);
                          if (step3Feedback) setStep3Feedback(null);
                        }}
                        className="mt-1 cursor-pointer"
                      />
                      <span className="flex-1 leading-relaxed">{opt.text}</span>
                    </label>
                  ))}
                </div>

                {step3Feedback && (
                  <div
                    className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                      step3Submitted || step3Choice === 'OPT_A'
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border border-rose-300 text-rose-900'
                    }`}
                  >
                    {step3Submitted || step3Choice === 'OPT_A' ? (
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{step3Feedback}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: State Monitor & Overall Submit */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Monitor Card */}
              <div className="flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
                <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert size={18} />
                  混联拓扑与电气节点监控
                </span>

                <div className="flex flex-col justify-between h-32 p-4 bg-slate-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
                  <div className="flex items-center justify-between text-sm opacity-80">
                    <span className="font-bold">TOPOLOGY MONITOR</span>
                    <span className="font-bold text-amber-300">
                      {bypassSimulationActive ? 'A-B SHORT BYPASSED' : 'NORMAL EQUIVALENT'}
                    </span>
                  </div>
                  <div className="text-3xl lg:text-4xl font-black text-right tracking-wider text-emerald-300">
                    {bypassSimulationActive ? '0.00 V (BYPASS)' : '12.00 V (SUPPLY)'}
                  </div>
                  <div className="flex items-center justify-between text-sm opacity-80">
                    <span>STATUS: {bypassSimulationActive ? 'R3_LIMITING (6A)' : 'DUAL_BRANCH_ACTIVE'}</span>
                    <span className="font-bold">STATUS_OK</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700 space-y-2">
                  <strong className="block text-amber-300 font-bold">混联分析要诀：</strong>
                  <p>
                    1. 串联支路与并联支路遵循各自规律，总等效电阻 Req = R3 + (R1∥R2)。
                  </p>
                  <p>
                    2. 不等阻值并联支路中，电阻小的支路分得更大电流与更大功率（P = U²/R，功率与阻值成反比）。
                  </p>
                  <p>
                    3. 并联负载两端短路时，并联组被完全旁路，但串联在干路上的 R3 依然接入回路发挥限流作用。
                  </p>
                </div>
              </div>

              {/* 实训通过门槛清单与工单提交卡片 */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                <strong className="text-sm font-bold text-slate-800 block">
                  步骤 3 实训考核达成门槛 (完成进度: {completedPrereqs} / 4)
                </strong>

                <div className="space-y-2 text-sm">
                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    caseRecordA ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <span>1. 算例 A 不等阻值计算</span>
                    <span className="font-bold">{caseRecordA ? '✓ 已达成' : '未完成'}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    caseRecordB ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <span>2. 算例 B 参数变式计算</span>
                    <span className="font-bold">{caseRecordB ? '✓ 已达成' : '未完成'}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    isBypassValid ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <span>3. 算例 A 旁路仿真与机理分析</span>
                    <span className="font-bold">{isBypassValid ? '✓ 已达成' : '未完成'}</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    step3Submitted && step3Choice === 'OPT_A'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                      : step3Choice
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <span>4. 电路拓扑节点本质辨析</span>
                    <span className="font-bold">
                      {step3Submitted && step3Choice === 'OPT_A'
                        ? '✓ 已判定通过'
                        : step3Choice
                        ? '已选择 (待提交工单判定)'
                        : '未选择'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-2">
                  {!step3Submitted ? (
                    <Button
                      disabled={!isStep3ReadyToSubmit}
                      onClick={handleSubmitStep3}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isStep3ReadyToSubmit ? '提交混联分析工单' : `须先录齐前置实训与辨析选项 (${completedPrereqs}/4)`}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <span className="font-bold">分析工单已提交！混联计算与短路旁路全面达标！</span>
                      </div>
                      <Button
                        onClick={onAdvanceStep}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span>进入步骤 4：加装雾灯组推算</span>
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* STEP 4: Quantitative Fog Lamp Prediction */}
      {currentStep === 'QUANTITATIVE_FOG_PREDICT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              加装并联雾灯组等效阻值与总电流推算 · 独立盲测工单
            </span>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">工程改装情境：</strong>
              原车前部已有一对并联示宽灯（单灯等效电阻 4.0Ω，并联后等效电阻为 <span className="font-bold text-blue-700">2.0Ω</span>，原总电流 6.0A）。现车主加装一对前雾灯（单灯 6.0Ω，并联后等效电阻为 <span className="font-bold text-purple-700">3.0Ω</span>），两组车灯均并联在 12.0V 电源母线上。
            </div>

            <div className="w-full h-56 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative border border-slate-800 shadow-inner">
              <div className="flex flex-col items-center gap-2 text-center text-white">
                <div className="flex items-center gap-4">
                  <div className="w-28 h-20 rounded-xl bg-blue-950 border-2 border-blue-500 flex flex-col items-center justify-center p-2">
                    <span className="text-xs text-blue-300">示宽灯组</span>
                    <span className="text-sm font-bold text-white">R1 = 2.0 Ω</span>
                  </div>
                  <span className="text-lg text-amber-400 font-black">∥ 并联 ∥</span>
                  <div className="w-28 h-20 rounded-xl bg-purple-950 border-2 border-purple-500 flex flex-col items-center justify-center p-2">
                    <span className="text-xs text-purple-300">加装雾灯组</span>
                    <span className="text-sm font-bold text-white">R2 = 3.0 Ω</span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-2">
                  系统母线供电电压：12.00 V
                </div>
              </div>
            </div>

            {/* Answer Options: NO SPOILER */}
            <div className="flex flex-col gap-2.5">
              {[
                {
                  id: 'OPT_12_10',
                  text: 'A. 总等效电阻 1.2 Ω，总干路电流 10.0 A (推算：R_总 = (2.0×3.0)/(2.0+3.0) = 1.2Ω，I_总 = 12V ÷ 1.2Ω = 10.0A)',
                },
                {
                  id: 'OPT_50_24',
                  text: 'B. 总等效电阻 5.0 Ω，总干路电流 2.4 A (推算：R_总 = 2.0 + 3.0 = 5.0Ω，I_总 = 12V ÷ 5.0Ω = 2.4A)',
                },
                {
                  id: 'OPT_08_15',
                  text: 'C. 总等效电阻 0.8 Ω，总干路电流 15.0 A',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-sm ${
                    step4Choice === opt.id
                      ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-medium'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="step4_opt"
                    value={opt.id}
                    checked={step4Choice === opt.id}
                    onChange={() => {
                      sounds.click();
                      setStep4Choice(opt.id);
                      setStep4Submitted(false);
                      setStep4Feedback(null);
                    }}
                    className="mt-1 cursor-pointer"
                  />
                  <span className="flex-1 leading-relaxed">{opt.text}</span>
                </label>
              ))}
            </div>

            <Button
              disabled={!step4Choice}
              onClick={handleSubmitStep4}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 cursor-pointer text-sm shadow-sm"
            >
              提交加装并联定量计算工单
            </Button>

            {step4Feedback && (
              <div
                className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                  step4Choice === 'OPT_12_10'
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border border-red-300 text-red-900'
                }`}
              >
                {step4Choice === 'OPT_12_10' ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{step4Feedback}</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Gauge size={18} />
              总负荷分析仪读数
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">TOTAL EQUIVALENT: 1.20 Ω</span>
                <span className="font-bold text-amber-300">U = 12.00 V</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                10.00 A
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>TOTAL PARALLEL LOAD</span>
                <span className="font-bold">DC AMPERES</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">改装线束校核法则：</strong>
              新增负载后的总电流需与原回路能力及保护资料核对；若原熔断器标称7.5A，10A负荷提示超额定风险，不能据此断言立即熔断，也不能直接指定换15A和1.5mm²导线。具体方案需校核。
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Transfer Spotlight Mod Risk & Decision */}
      {currentStep === 'TRANSFER_SPOTLIGHT_MOD_RISK' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              加装射灯熔断器熔断风险评估与处置决策
            </span>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">教学案例：</strong>
              加装负载后原回路熔断器曾熔断，现已停用，待评估。车主在原车标称 15A 熔断器回路上加装 4 盏 100W 越野射灯（在 12V 工作点总电气输入功率为 <span className="font-bold text-amber-700">400W</span>）。
              <div className="mt-1 flex flex-wrap gap-3 text-xs sm:text-sm font-bold text-slate-800">
                <span>12V 工作点新增负载电流估算：I = 400W ÷ 12V ≈ 33.3 A（已超原回路 15A 熔断器标称额定电流，提示过载风险）</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <strong className="text-sm font-bold text-slate-800">
                  车间安全决策：车主建议直接把 15A 熔断器换为 40A 熔断器继续使用。作为主修技师，你的规范处置方案是：
                </strong>
              </div>

              {/* Options: NO SPOILER */}
              <div className="flex flex-col gap-2.5">
                {[
                  {
                    id: 'OPT_A',
                    text: 'A. 停用当前接法，先核对车型与灯具资料及回路保护配合，再确定可行方案。',
                  },
                  {
                    id: 'OPT_B',
                    text: 'B. 先把15A熔断器换为40A，保留原线路继续使用。',
                  },
                  {
                    id: 'OPT_C',
                    text: 'C. 不查灯具资料，直接把四盏灯改串联后继续使用。',
                  },
                  {
                    id: 'OPT_D',
                    text: 'D. 仅凭熔断就认定灯具内部短路，换同款灯后继续使用。',
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-sm ${
                      step5Decision === opt.id
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-medium'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    } ${step5Submitted && step5Decision === 'OPT_A' ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="step5_opt"
                      value={opt.id}
                      disabled={step5Submitted && step5Decision === 'OPT_A'}
                      checked={step5Decision === opt.id}
                      onChange={() => {
                        if (step5Submitted && step5Decision === 'OPT_A') return;
                        sounds.click();
                        setStep5Decision(opt.id);
                        setStep5Submitted(false);
                        setStep5Feedback(null);
                      }}
                      className="mt-1 cursor-pointer"
                    />
                    <span className="flex-1 leading-relaxed">{opt.text}</span>
                  </label>
                ))}
              </div>

              <Button
                disabled={!step5Decision || (step5Submitted && step5Decision === 'OPT_A')}
                onClick={handleSubmitStep5}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 cursor-pointer text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step5Submitted && step5Decision === 'OPT_A' ? '决策工单已提交锁定' : '提交改装安全整改工单'}
              </Button>

              {step5Feedback && (
                <div
                  className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                    step5Feedback.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border border-rose-300 text-rose-900'
                  }`}
                >
                  {step5Feedback.type === 'success' ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{step5Feedback.text}</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <ShieldAlert size={18} />
              教学工况与负荷估算
            </span>

            {/* 普通 HTML 教学工况与负荷估算卡 */}
            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 space-y-3 text-slate-200 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-900/80 rounded border border-slate-700">
                  <span className="text-slate-400 block">供电基准电压</span>
                  <span className="font-mono text-emerald-400 font-bold text-base">12 V</span>
                </div>
                <div className="p-2 bg-slate-900/80 rounded border border-slate-700">
                  <span className="text-slate-400 block">新增负载总功率</span>
                  <span className="font-mono text-amber-400 font-bold text-base">400 W</span>
                </div>
                <div className="p-2 bg-slate-900/80 rounded border border-slate-700">
                  <span className="text-slate-400 block">原回路熔断器标称值</span>
                  <span className="font-mono text-sky-400 font-bold text-base">15 A</span>
                </div>
                <div className="p-2 bg-slate-900/80 rounded border border-slate-700">
                  <span className="text-slate-400 block">题设回路历史记录</span>
                  <span className="text-rose-400 font-bold text-xs mt-0.5 block">曾发生熔断 (已停用)</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs space-y-1">
                <div className="text-slate-400 font-sans font-bold">12V工作点负荷估算公式：</div>
                <div className="text-emerald-300 font-bold text-sm">
                  I = P ÷ U = 400W ÷ 12V ≈ 33.3 A
                </div>
                <div className="text-amber-400 text-[11px] pt-1 border-t border-slate-800">
                  估算，非实测；熔断时间与具体选型未确定
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700 space-y-2">
              <strong className="block text-amber-300 font-bold">风险评估要则：</strong>
              <p className="text-xs sm:text-sm">
                1. 估算电流 33.3A 远超原回路 15A 熔断器标称值，提示显著过载风险。
              </p>
              <p className="text-xs sm:text-sm">
                2. 熔断器动作受时间—电流安秒特性曲线控制，在缺乏线束规格、敷设环境与保护曲线等具体资料前，不能断言熔断时刻或温升时间，也不能盲目增大熔断器。
              </p>
              <p className="text-xs sm:text-sm">
                3. 正确处置是停用当前接法，取得车型与灯具技术资料，核对回路保护配合后再行决策。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
