'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Gauge,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { evaluateMeterGuard } from '@/src/game/instruments/meterGuard';
import { type D05Step } from './d05Training';
import {
  type WindingSampleId,
  type WindingTerminalPair,
  type WindingReadingRecord,
  type WindingJudgmentRecord,
  type WindingJudgmentChoice,
  WINDING_SAMPLES,
  TERMINAL_PAIR_META,
  SAMPLE_JUDGMENT_OPTIONS,
  BOUNDARY_QUESTION,
  evaluateSampleTerminalPair,
  checkSampleReadingsComplete,
  checkAll13ReadingsCollected,
  isD05Step1PrerequisitesReady,
  LEAD_ZERO_RESISTANCE_OHM,
} from './d05Winding';
import {
  type DcObservationStage,
  DC_TEACHING_CONFIG,
  TRANSIENT_STEADY_QUESTION,
  PROTECTION_QUESTION,
  INVERTER_QUESTION,
  validateDcCounterexample,
  buildDcCounterexampleEvidence,
} from './d05DcCounterexample';

interface D05TransformerSceneProps {
  currentStep: D05Step;
  onStepComplete: (step: D05Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onComplete?: (result: LevelAssessmentResult) => void;
  hintRequested?: boolean;
}

export function D05TransformerScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onComplete,
  hintRequested,
}: D05TransformerSceneProps) {
  const assessment = useLevelAssessment('D05');
  const requestAssessmentHint = assessment.requestHint;

  useEffect(() => {
    if (hintRequested) {
      const stageMap: Record<D05Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
        STRUCTURE_AND_MAGNETIC_FLUX: 'cognition',
        VOLTAGE_AND_CURRENT_RATIO: 'standard',
        DC_INPUT_DISASTER_COUNTEREXAMPLE: 'calculation',
        POLARITY_AND_SAME_NAME_TERMINALS: 'blind_test',
        ONBOARD_INVERTER_STEP_UP_DELIVERY: 'transfer',
      };
      requestAssessmentHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, requestAssessmentHint]);

  // Multimeter Knob: 'OFF' | 'DCV_20' | 'ACV_750' | 'OHM_200' | 'OHM_200K'
  type MultimeterKnob = 'OFF' | 'DCV_20' | 'ACV_750' | 'OHM_200' | 'OHM_200K';
  const [meterKnob, setMeterKnob] = useState<MultimeterKnob>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);
  const [lastWindingReadingText, setLastWindingReadingText] = useState<string | null>(null);

  // ==================== Step 1: Magnetic Flux & Winding Inspection ====================
  const [s1AcExcited, setS1AcExcited] = useState<boolean>(true);
  const [s1Isolated, setS1Isolated] = useState<boolean>(false);
  const [s1VoltageConfirmed, setS1VoltageConfirmed] = useState<boolean>(false);
  const [s1LeadResistanceTested, setS1LeadResistanceTested] = useState<boolean>(false);
  const [s1LeadTestFeedback, setS1LeadTestFeedback] = useState<string | null>(null);

  // Active Sample & Terminal Pair
  const [s1ActiveSample, setS1ActiveSample] = useState<WindingSampleId>('A');
  const [s1ActivePair, setS1ActivePair] = useState<WindingTerminalPair>('PAIR_1_2');
  const [s1CurrentMeasurementFeedback, setS1CurrentMeasurementFeedback] = useState<string | null>(null);

  // 13 Readings Record Store
  const [windingReadings, setWindingReadings] = useState<WindingReadingRecord[]>([]);

  // Sample Judgments & Choices
  const [sampleChoiceMap, setSampleChoiceMap] = useState<Record<WindingSampleId, WindingJudgmentChoice | null>>({
    A: null,
    B: null,
    C: null,
  });
  const [sampleJudgments, setSampleJudgments] = useState<Record<WindingSampleId, WindingJudgmentRecord | null>>({
    A: null,
    B: null,
    C: null,
  });
  const [sampleFeedbackMap, setSampleFeedbackMap] = useState<
    Record<WindingSampleId, { isCorrect: boolean; text: string } | null>
  >({
    A: null,
    B: null,
    C: null,
  });

  // Boundary Question
  const [boundaryChoice, setBoundaryChoice] = useState<string | null>(null);
  const [boundaryJudgment, setBoundaryJudgment] = useState<{ isCorrect: boolean; text: string; validatedAt: number } | null>(null);

  // Original Cognitive Flux Question
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // ==================== Step 2: Voltage & Current Ratio ====================
  const [s2TurnsMode, setS2TurnsMode] = useState<'STEP_DOWN' | 'STEP_UP'>('STEP_DOWN');
  const [s2Choice, setS2Choice] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // ==================== Step 3: DC Input Counterexample ====================
  const [s3ObservationStage, setS3ObservationStage] = useState<DcObservationStage>('not_started');
  const [s3CurrentInput, setS3CurrentInput] = useState<string>('');
  const [s3TransientChoice, setS3TransientChoice] = useState<string | null>(null);
  const [s3ProtectionChoice, setS3ProtectionChoice] = useState<string | null>(null);
  const [s3InverterChoice, setS3InverterChoice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);
  const [s3FeedbackErrors, setS3FeedbackErrors] = useState<string[] | null>(null);
  const [s3IsAdvancing, setS3IsAdvancing] = useState<boolean>(false);

  // ==================== Step 4: Same-Name Terminals (Polarity) ====================
  const [s4Connection, setS4Connection] = useState<'SUBTRACTIVE' | 'ADDITIVE'>('SUBTRACTIVE');
  const [s4Choice, setS4Choice] = useState<string | null>(null);
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // ==================== Step 5: Onboard Inverter Delivery ====================
  const [s5InverterOn, setS5InverterOn] = useState<boolean>(false);
  const [s5LoadPlugged, setS5LoadPlugged] = useState<boolean>(false);
  const [s5WorkOrderSigned, setS5WorkOrderSigned] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  // Guard for Stages 2-5
  const requireMeterPowered = (
    expected: MultimeterKnob,
    stage?: 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'
  ): boolean => {
    const stageMap: Record<D05Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
      STRUCTURE_AND_MAGNETIC_FLUX: 'cognition',
      VOLTAGE_AND_CURRENT_RATIO: 'standard',
      DC_INPUT_DISASTER_COUNTEREXAMPLE: 'calculation',
      POLARITY_AND_SAME_NAME_TERMINALS: 'blind_test',
      ONBOARD_INVERTER_STEP_UP_DELIVERY: 'transfer',
    };
    const targetStage = stage || stageMap[currentStep];
    const isResistance = expected === 'OHM_200' || expected === 'OHM_200K';
    const guard = evaluateMeterGuard({
      currentMode: meterKnob,
      expectedMode: expected,
      circuitPowered: isResistance ? s1AcExcited : true,
      resistanceMeasurement: isResistance,
    });
    if (!guard.allowed) {
      sounds.warningBuzz();
      setMeterWarning(guard.message);
      if (guard.code === 'LIVE_RESISTANCE') {
        assessment.recordUnsafeAction(targetStage);
      } else {
        assessment.recordMeterBlocked(targetStage);
      }
      return false;
    }
    setMeterWarning(null);
    return true;
  };

  // -------------------------------------------------------------
  // Safety & Power Reset Handlers
  // -------------------------------------------------------------
  const handleToggleAcPower = () => {
    if (s1Submitted) return;
    const nextPower = !s1AcExcited;
    sounds.click();
    setS1AcExcited(nextPower);

    // 如果重新接通电源，必须清空本轮所有断电绕组测量与判断！
    if (nextPower) {
      sounds.warningBuzz();
      setS1VoltageConfirmed(false);
      setWindingReadings([]);
      setSampleJudgments({ A: null, B: null, C: null });
      setSampleFeedbackMap({ A: null, B: null, C: null });
      setLastWindingReadingText(null);
      setS1CurrentMeasurementFeedback(
        '⚠️ 警告：交流激励已重新接通！为确保安全，此前所有断电绕组测量数据与判断已全部作废，需重新进行安全隔离与验电！'
      );
    } else {
      setS1CurrentMeasurementFeedback('交流激励已断开。请继续执行外部接线隔离与验电。');
    }
  };

  const handleToggleIsolation = () => {
    if (s1Submitted) return;
    const nextIso = !s1Isolated;
    sounds.click();
    setS1Isolated(nextIso);

    // 如果解除隔离，同样清空当前无电压确认与测量数据
    if (!nextIso) {
      sounds.warningBuzz();
      setS1VoltageConfirmed(false);
      setWindingReadings([]);
      setSampleJudgments({ A: null, B: null, C: null });
      setSampleFeedbackMap({ A: null, B: null, C: null });
      setLastWindingReadingText(null);
      setS1CurrentMeasurementFeedback(
        '⚠️ 警告：外部接线隔离已解除！为确保安全，此前断电初检数据已作废，需重新隔离与验电！'
      );
    }
  };

  const handleConfirmNoVoltage = () => {
    if (s1Submitted) return;
    if (s1AcExcited) {
      sounds.warningBuzz();
      setMeterWarning('⚠️ 台架带电！初级交流激励尚未断开，严禁判定无电压！');
      return;
    }
    if (!s1Isolated) {
      sounds.warningBuzz();
      setMeterWarning('⚠️ 外部接线未隔离！可能存在外部反送电风险，请先隔离外部接线！');
      return;
    }
    sounds.success();
    setS1VoltageConfirmed(true);
    setMeterWarning(null);
    setS1CurrentMeasurementFeedback('✅ 状态确认完成：已确认断电且外部接线隔离后的模拟台架状态无残留电压。');
  };

  const handlePerformLeadZeroTest = () => {
    if (s1Submitted) return;
    // 仪表安全保护检查（严格遵循 evaluateMeterGuard 优先级）
    const guard = evaluateMeterGuard<MultimeterKnob>({
      currentMode: meterKnob,
      expectedMode: ['OHM_200', 'OHM_200K'],
      circuitPowered: s1AcExcited,
      resistanceMeasurement: false,
    });
    if (!guard.allowed) {
      sounds.warningBuzz();
      setMeterWarning(guard.message);
      if (guard.code === 'LIVE_RESISTANCE') {
        assessment.recordUnsafeAction('cognition');
      } else {
        assessment.recordMeterBlocked('cognition');
      }
      return;
    }

    sounds.click();
    setS1LeadResistanceTested(true);
    setLastWindingReadingText('0.20 Ω');
    setS1LeadTestFeedback(
      '表笔短接自检完成：基准引线内阻 0.20Ω（教学设定值），后续测量将自动扣除该补偿值。'
    );
  };

  // -------------------------------------------------------------
  // Measurement Handler
  // -------------------------------------------------------------
  const handlePerformMeasurement = () => {
    if (s1Submitted) return;

    // 1. 仪表安全保护检查（严格遵循 evaluateMeterGuard 优先级：关机/错误档记 meterBlocked；电阻档通电记 unsafe）
    const guard = evaluateMeterGuard<MultimeterKnob>({
      currentMode: meterKnob,
      expectedMode: ['OHM_200', 'OHM_200K'],
      circuitPowered: s1AcExcited,
      resistanceMeasurement: false,
    });
    if (!guard.allowed) {
      sounds.warningBuzz();
      setMeterWarning(guard.message);
      if (guard.code === 'LIVE_RESISTANCE') {
        assessment.recordUnsafeAction('cognition');
      } else {
        assessment.recordMeterBlocked('cognition');
      }
      return;
    }
    if (meterKnob !== 'OHM_200' && meterKnob !== 'OHM_200K') return;

    // 2. 准备动作缺项检查（不误扣概念分）
    if (!s1Isolated) {
      sounds.warningBuzz();
      setS1CurrentMeasurementFeedback('请先执行“隔离外部接线”模拟操作，脱离输入电源与次级负载后再测量！');
      return;
    }
    if (!s1VoltageConfirmed) {
      sounds.warningBuzz();
      setS1CurrentMeasurementFeedback('请先点击“确认台架无电压”执行断电且隔离后的模拟台架状态确认！');
      return;
    }
    if (!s1LeadResistanceTested) {
      sounds.warningBuzz();
      setS1CurrentMeasurementFeedback('请先进行“表笔短接自检”测得基准表笔引线电阻（0.20Ω）！');
      return;
    }

    // 4. 执行纯解算
    const reading = evaluateSampleTerminalPair(
      s1ActiveSample,
      s1ActivePair,
      meterKnob,
      LEAD_ZERO_RESISTANCE_OHM
    );
    if (!reading) return;

    sounds.zap();
    setLastWindingReadingText(reading.displayText);

    const newRecord: WindingReadingRecord = {
      sampleId: s1ActiveSample,
      pair: s1ActivePair,
      meterRange: meterKnob,
      powered: false,
      isolated: true,
      voltageConfirmed: true,
      leadResistanceOhm: LEAD_ZERO_RESISTANCE_OHM,
      readingKind: reading.readingKind,
      rawOhm: reading.rawOhm,
      compensatedOhm: reading.compensatedOhm,
      displayText: reading.displayText,
      modelReason: reading.modelReason,
      measuredAt: Date.now(),
    };

    // 更新记录池（同样本、同端对、同挡位覆盖，不同挡位并存以支持 B 的高量程复核）
    setWindingReadings((prev) => {
      const filtered = prev.filter(
        (r) =>
          !(
            r.sampleId === s1ActiveSample &&
            r.pair === s1ActivePair &&
            r.meterRange === meterKnob
          )
      );
      return [...filtered, newRecord];
    });

    // 发生新测量后，撤销该样本历史诊断判断（需重新提交判定）
    if (sampleJudgments[s1ActiveSample]) {
      setSampleJudgments((prev) => ({ ...prev, [s1ActiveSample]: null }));
      setSampleFeedbackMap((prev) => ({
        ...prev,
        [s1ActiveSample]: { isCorrect: false, text: '该样本产生了新测量记录，请重新审核并提交诊断结论！' },
      }));
    }

    const pairLabel = TERMINAL_PAIR_META[s1ActivePair].label;
    const compDesc =
      reading.readingKind === 'finite'
        ? `（已扣除 0.20Ω 表笔阻值，本体阻值约 ${reading.compensatedOhm}Ω）`
        : '（当前量程或测试电压下呈开路特性）';
    setS1CurrentMeasurementFeedback(
      `测量成功：${WINDING_SAMPLES[s1ActiveSample].name} [${pairLabel}] 实测读数 ${reading.displayText} ${compDesc}`
    );
  };

  // -------------------------------------------------------------
  // Sample Judgment Handler
  // -------------------------------------------------------------
  const handleSampleChoiceChange = (sampleId: WindingSampleId, choice: WindingJudgmentChoice) => {
    if (s1Submitted) return;
    setSampleChoiceMap((prev) => ({ ...prev, [sampleId]: choice }));
    // 改变选项立即撤销旧通过记录
    if (sampleJudgments[sampleId]) {
      setSampleJudgments((prev) => ({ ...prev, [sampleId]: null }));
      setSampleFeedbackMap((prev) => ({ ...prev, [sampleId]: null }));
    }
  };

  const handleVerifySampleJudgment = (sampleId: WindingSampleId) => {
    if (s1Submitted) return;
    const choice = sampleChoiceMap[sampleId];

    // 检查记录是否齐备
    const status = checkSampleReadingsComplete(sampleId, windingReadings);
    if (!status.isComplete) {
      sounds.warningBuzz();
      setSampleFeedbackMap((prev) => ({
        ...prev,
        [sampleId]: {
          isCorrect: false,
          text: `测量尚未齐备：${status.missingRequirements.join('；')}。请先完成全部指定端对测量！`,
        },
      }));
      return;
    }

    if (!choice) {
      sounds.warningBuzz();
      setSampleFeedbackMap((prev) => ({
        ...prev,
        [sampleId]: { isCorrect: false, text: '请先勾选符合该样本现象与证据边界的诊断结论！' },
      }));
      return;
    }

    const expected = WINDING_SAMPLES[sampleId].expectedJudgment;
    if (choice === expected) {
      sounds.success();
      const judgmentRecord: WindingJudgmentRecord = {
        sampleId,
        studentChoice: choice,
        isCorrect: true,
        requiredPairKeys: status.matchedRecords.map((r) => `${r.pair}_${r.meterRange}`),
        validatedAt: Date.now(),
      };
      setSampleJudgments((prev) => ({ ...prev, [sampleId]: judgmentRecord }));
      setSampleFeedbackMap((prev) => ({
        ...prev,
        [sampleId]: { isCorrect: true, text: `✓ 诊断完全正确！已核实${WINDING_SAMPLES[sampleId].name}实测证据链。` },
      }));
    } else {
      sounds.warningBuzz();
      assessment.recordWrong('cognition');
      setSampleJudgments((prev) => ({ ...prev, [sampleId]: null }));
      setSampleFeedbackMap((prev) => ({
        ...prev,
        [sampleId]: {
          isCorrect: false,
          text: '诊断不准确！请结合实测数据与边界思考：直流低阻不等于短路，单次 OL 需高量程复核。已记入 1 次诊断错误。',
        },
      }));
    }
  };

  // -------------------------------------------------------------
  // Boundary Judgment Handler
  // -------------------------------------------------------------
  const handleBoundaryChoiceChange = (optId: string) => {
    if (s1Submitted) return;
    setBoundaryChoice(optId);
    setBoundaryJudgment(null);
  };

  const handleVerifyBoundaryJudgment = () => {
    if (s1Submitted) return;
    if (!boundaryChoice) return;

    if (boundaryChoice === 'OPT_BOUNDARY_CORRECT') {
      sounds.success();
      setBoundaryJudgment({
        isCorrect: true,
        text: '✓ 判定精准！深刻理解万用表电阻挡 OL 的局限性与直流低阻的物理本质，绝缘耐压需专业试验！',
        validatedAt: Date.now(),
      });
    } else {
      sounds.warningBuzz();
      assessment.recordWrong('cognition');
      setBoundaryJudgment({
        isCorrect: false,
        text: '理解有误！万用表低压 OL 绝不等于绝缘耐压合格，且绕组本身直流铜阻即可能低至零点几欧。已记入 1 次辨析错误。',
        validatedAt: Date.now(),
      });
    }
  };

  // -------------------------------------------------------------
  // Final Step 1 Submission Handler
  // -------------------------------------------------------------
  const isStep1PrerequisitesReadyState = isD05Step1PrerequisitesReady(
    windingReadings,
    sampleJudgments,
    Boolean(boundaryJudgment?.isCorrect),
    s1Choice
  );

  const handleStep1FinalSubmit = () => {
    if (s1Submitted) return;

    if (!isStep1PrerequisitesReadyState) {
      sounds.warningBuzz();
      setMeterWarning('⚠️ 请先完成 13 项测量、3 项样本诊断、边界辨析并选择交变磁通认知题！');
      return;
    }

    // 检查原认知题（若选择非正确项，扣 1 次 wrong 分并阻止通过）
    if (s1Choice !== 'A') {
      sounds.warningBuzz();
      assessment.recordWrong('cognition');
      setMeterWarning('⚠️ 交变磁通原理认知判断错误！变压器初次级无电气直连，依靠闭合铁芯中的交变磁通互感传能。已计入 1 次错误。');
      return;
    }

    // 全部达成！提交工单并锁定
    sounds.success();
    setS1Submitted(true);
    assessment.completeStage('cognition');

    const evidence = {
      coreFluxObserved: true,
      choice: s1Choice,
      windingInspection: {
        modelVersion: '1.0.0',
        deviceType: 'isolated_dual_winding_training_model',
        samples: windingReadings,
        judgments: [sampleJudgments.A!, sampleJudgments.B!, sampleJudgments.C!],
        boundaryJudgment: {
          studentChoice: boundaryChoice!,
          isCorrect: true,
          validatedAt: boundaryJudgment?.validatedAt ?? Date.now(),
        },
      },
    };

    onStepComplete('STRUCTURE_AND_MAGNETIC_FLUX', evidence);
  };

  // -------------------------------------------------------------
  // Step 3: DC Counterexample Handlers
  // -------------------------------------------------------------
  const handleResetStep3Demo = () => {
    if (s3Submitted) return;
    sounds.click();
    setS3ObservationStage('not_started');
    setS3CurrentInput('');
    setS3TransientChoice(null);
    setS3ProtectionChoice(null);
    setS3InverterChoice(null);
    setS3FeedbackErrors(null);
  };

  const handleStep3Submit = () => {
    if (s3Submitted) return;
    const validation = validateDcCounterexample(
      s3ObservationStage,
      s3CurrentInput,
      s3TransientChoice,
      s3ProtectionChoice,
      s3InverterChoice
    );
    if (!validation.isObservationComplete || !validation.isFilled) {
      sounds.warningBuzz();
      return;
    }

    if (validation.isAllCorrect) {
      sounds.success();
      setS3Submitted(true);
      setS3FeedbackErrors(null);
      const evidence = buildDcCounterexampleEvidence(
        validation.parsedCurrent!,
        s3TransientChoice!,
        s3ProtectionChoice!,
        s3InverterChoice!
      );
      onStepComplete('DC_INPUT_DISASTER_COUNTEREXAMPLE', evidence as unknown as Record<string, unknown>);
    } else {
      sounds.warningBuzz();
      assessment.recordWrong('calculation');
      setS3FeedbackErrors(validation.errorCategories);
    }
  };

  const handleAdvanceFromStep3 = () => {
    if (s3IsAdvancing) return;
    setS3IsAdvancing(true);
    sounds.click();
    assessment.completeStage('calculation');
    assessment.startStage('blind_test');
    onAdvanceStep();
  };

  return (
    <div className="d05-training-scene flex flex-col flex-1 min-h-[580px] w-full bg-slate-50 text-slate-800 rounded-xl p-4 lg:p-6 shadow-sm border border-slate-200 space-y-6">
      {/* Warning Toast */}
      {meterWarning && (
        <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-900 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="font-semibold">{meterWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setMeterWarning(null)}
            className="text-sm px-3 py-1 bg-amber-500/30 hover:bg-amber-500/50 rounded text-amber-900 font-bold cursor-pointer"
          >
            知道了
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left: Transformer Core Visualizer & Winding Circuit Board (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400 animate-pulse" />
              <span className="font-semibold text-slate-200">单相双绕组变压器与逆变升压实验台</span>
              <span className="text-sm bg-purple-900/60 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full font-bold">
                课程拓展／重庆2027备考必学
              </span>
            </div>
            <div className="text-sm px-2.5 py-1 bg-slate-800 text-purple-300 rounded font-mono">
              {currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX' && '步骤1: 铁芯磁通与断电绕组初检'}
              {currentStep === 'VOLTAGE_AND_CURRENT_RATIO' && '步骤2: 变压比与变流比'}
              {currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE' && '步骤3: 恒定直流误接：暂态与过流风险'}
              {currentStep === 'POLARITY_AND_SAME_NAME_TERMINALS' && '步骤4: 同名端极性测试'}
              {currentStep === 'ONBOARD_INVERTER_STEP_UP_DELIVERY' && '步骤5: 逆变220V交车'}
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="my-4 relative flex items-center justify-center min-h-[260px]">
            <svg
              className="w-full h-64 lg:h-72 select-none"
              viewBox="0 0 700 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="d05-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="1" />
                </pattern>
                <linearGradient id="ironCoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="50%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
              </defs>
              <rect width="700" height="300" fill="url(#d05-grid)" rx="8" />

              {/* Transformer Closed Iron Core */}
              {currentStep !== 'ONBOARD_INVERTER_STEP_UP_DELIVERY' && (
                <g transform="translate(160, 30)">
                  <rect
                    x="0"
                    y="0"
                    width="360"
                    height="230"
                    rx="14"
                    fill="url(#ironCoreGrad)"
                    stroke="#64748b"
                    strokeWidth="3"
                  />
                  <rect
                    x="75"
                    y="50"
                    width="210"
                    height="130"
                    rx="8"
                    fill="#0f172a"
                    stroke="#475569"
                    strokeWidth="2"
                  />

                  {/* Magnetic Flux Path */}
                  {((currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX' && s1AcExcited) ||
                    currentStep === 'VOLTAGE_AND_CURRENT_RATIO' ||
                    (currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE' && s3ObservationStage === 'transient_observed') ||
                    currentStep === 'POLARITY_AND_SAME_NAME_TERMINALS') && (
                    <rect
                      x="35"
                      y="24"
                      width="290"
                      height="182"
                      rx="10"
                      fill="none"
                      stroke={currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE' ? '#f59e0b' : '#10b981'}
                      strokeWidth="2.5"
                      strokeDasharray={currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE' ? '4 4' : '8 6'}
                      className={currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE' ? 'animate-bounce' : 'animate-pulse'}
                    />
                  )}

                  {/* Core Label */}
                  <text x="180" y="110" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">
                    硅钢片叠压闭合铁芯 (外壳接地端 K)
                  </text>
                  <text x="180" y="130" textAnchor="middle" fill="#64748b" fontSize="11">
                    {(() => {
                      if (currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX') {
                        return s1AcExcited ? '交变磁通回路 Φ(t) 运转中' : '初级已断电 · 磁通已归零';
                      }
                      if (currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE') {
                        if (s3ObservationStage === 'not_started') return '等待演示 · 初级尚未接入直流';
                        if (s3ObservationStage === 'transient_observed') return '接通暂态 · 磁通经历变化 (dΦ/dt ≠ 0)';
                        return '理想稳态 · 恒定直流磁通无时间变化率 (dΦ/dt = 0)';
                      }
                      return '交变磁通回路 Φ(t) 运转中';
                    })()}
                  </text>

                  {/* Primary Winding (1-2) */}
                  <g transform="translate(0, 45)">
                    <rect
                      x="-10"
                      y="0"
                      width="70"
                      height="140"
                      rx="6"
                      fill="#1e293b"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />
                    <g stroke="#f59e0b" strokeWidth="3" fill="none">
                      <path d="M -10 20 C 50 20, 50 35, -10 35" />
                      <path d="M -10 40 C 50 40, 50 55, -10 55" />
                      <path d="M -10 60 C 50 60, 50 75, -10 75" />
                      <path d="M -10 80 C 50 80, 50 95, -10 95" />
                      <path d="M -10 100 C 50 100, 50 115, -10 115" />
                    </g>
                    <text x="25" y="155" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold">
                      初级原边 1–2
                    </text>
                    <text x="25" y="170" textAnchor="middle" fill="#94a3b8" fontSize="10">
                      N1 绕组 (端子 1 / 端子 2)
                    </text>
                  </g>

                  {/* Secondary Winding (3-4) */}
                  <g transform="translate(295, 45)">
                    <rect
                      x="0"
                      y="0"
                      width="70"
                      height="140"
                      rx="6"
                      fill="#1e293b"
                      stroke="#38bdf8"
                      strokeWidth="2"
                    />
                    <g stroke="#38bdf8" strokeWidth="4.5" fill="none">
                      <path d="M 0 30 C 60 30, 60 50, 0 50" />
                      <path d="M 0 60 C 60 60, 60 80, 0 80" />
                      <path d="M 0 90 C 60 90, 60 110, 0 110" />
                    </g>
                    <text x="35" y="155" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="bold">
                      次级副边 3–4
                    </text>
                    <text x="35" y="170" textAnchor="middle" fill="#94a3b8" fontSize="10">
                      N2 绕组 (端子 3 / 端子 4)
                    </text>
                  </g>
                </g>
              )}
            </svg>
          </div>

          {/* HTML Responsive Circuit Board: 保证所有字号 >= 14px */}
          {currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX' && (
            <div
              data-testid="d05-winding-board"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2.5 mt-2 border-t border-slate-800 text-sm"
            >
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-700 text-slate-200">
                <span className="text-amber-400 font-bold block text-sm">初级原边端子 1–2</span>
                <span className="font-mono text-white font-bold text-base">
                  {(() => {
                    const rec = windingReadings
                      .slice()
                      .reverse()
                      .find((r) => r.sampleId === s1ActiveSample && r.pair === 'PAIR_1_2');
                    return rec ? rec.displayText : '绕组待测';
                  })()}
                </span>
                <span className="block text-sm text-slate-300 mt-0.5">实测反映 (高阻/低阻/开路)</span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-700 text-slate-200">
                <span className="text-sky-400 font-bold block text-sm">次级副边端子 3–4</span>
                <span className="font-mono text-white font-bold text-base">
                  {(() => {
                    const rec = windingReadings
                      .slice()
                      .reverse()
                      .find((r) => r.sampleId === s1ActiveSample && r.pair === 'PAIR_3_4');
                    return rec ? rec.displayText : '绕组待测';
                  })()}
                </span>
                <span className="block text-sm text-slate-300 mt-0.5">实测反映 (次级副边测量)</span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-700 text-slate-200">
                <span className="text-purple-400 font-bold block text-sm">绝缘初检端对 (1–3 / 1–K)</span>
                <span className="text-slate-100 font-bold text-sm">
                  {(() => {
                    const isoRecs = windingReadings.filter(
                      (r) =>
                        r.sampleId === s1ActiveSample &&
                        (r.pair === 'PAIR_1_3' || r.pair === 'PAIR_1_K')
                    );
                    if (isoRecs.length === 0) return '绝缘初检待测';
                    return isoRecs.map((r) => `${TERMINAL_PAIR_META[r.pair].label}:${r.displayText}`).join(' / ');
                  })()}
                </span>
                <span className="block text-sm text-slate-300 mt-0.5">普通表 OL ≠ 绝缘耐压合格</span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-700 text-slate-200">
                <span className="text-emerald-400 font-bold block text-sm">台架安全与自检状态</span>
                <span className="text-slate-100 font-bold text-sm">
                  {s1AcExcited
                    ? '⚠️ 交流激励通电中'
                    : !s1Isolated
                    ? '已断电 (未隔离接线)'
                    : !s1VoltageConfirmed
                    ? '已隔离 (待验电确认)'
                    : !s1LeadResistanceTested
                    ? '已验电 (待表笔自检)'
                    : '安全准备就绪 (0.20Ω已补偿)'}
                </span>
                <span className="block text-sm text-slate-300 mt-0.5">
                  当前样本: {WINDING_SAMPLES[s1ActiveSample].name}
                </span>
              </div>
            </div>
          )}

          {/* Step 1 Control Strip: Safety Preparation & Sample Switching */}
          {currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX' && (
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
              {/* Row 1: Power & Safety Prep Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={s1Submitted}
                  onClick={handleToggleAcPower}
                  className={`px-3 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors ${
                    s1AcExcited
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {s1AcExcited ? '初级输入交流激励 (产生交变磁通)' : '初级断电 (磁通归零)'}
                </button>

                <button
                  type="button"
                  disabled={s1Submitted}
                  onClick={handleToggleIsolation}
                  className={`px-3 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors ${
                    s1Isolated
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {s1Isolated ? '✓ 外部接线已隔离' : '隔离外部接线 (脱离负载)'}
                </button>

                <button
                  type="button"
                  disabled={s1Submitted || s1VoltageConfirmed}
                  onClick={handleConfirmNoVoltage}
                  className={`px-3 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors ${
                    s1VoltageConfirmed
                      ? 'bg-emerald-700 text-emerald-100 cursor-default'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {s1VoltageConfirmed ? '✓ 已确认台架无电压与断电隔离 (模拟台架状态确认)' : '确认台架无电压与断电隔离 (模拟台架状态确认)'}
                </button>

                <button
                  type="button"
                  disabled={s1Submitted}
                  onClick={handlePerformLeadZeroTest}
                  className={`px-3 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors ${
                    s1LeadResistanceTested
                      ? 'bg-amber-700 text-amber-100'
                      : 'bg-amber-600 text-white hover:bg-amber-500'
                  }`}
                >
                  {s1LeadResistanceTested ? '✓ 表笔已自检 (0.20Ω)' : '表笔短接自检 (取得0.20Ω)'}
                </button>
              </div>

              {s1LeadTestFeedback && (
                <div className="text-sm text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-800/60">
                  {s1LeadTestFeedback}
                </div>
              )}

              {/* Row 2: Anonymous Sample Selection */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-300">切换测试样本：</span>
                  {(['A', 'B', 'C'] as WindingSampleId[]).map((sId) => {
                    const sampleReadings = windingReadings.filter((r) => r.sampleId === sId);
                    const isJudged = sampleJudgments[sId]?.isCorrect;
                    return (
                      <button
                        key={sId}
                        type="button"
                        disabled={s1Submitted}
                        onClick={() => {
                          sounds.click();
                          setS1ActiveSample(sId);
                          setLastWindingReadingText(null);
                          setS1CurrentMeasurementFeedback(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition-colors ${
                          s1ActiveSample === sId
                            ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {WINDING_SAMPLES[sId].name}
                        <span className="ml-1 text-sm font-mono opacity-80">
                          ({sampleReadings.length}/{sId === 'B' ? 5 : 4})
                        </span>
                        {isJudged && <span className="ml-1 text-emerald-400">✓</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="text-sm font-bold text-slate-400">
                  总测量记录：
                  <span className="font-mono text-purple-400 font-bold ml-1">
                    {checkAll13ReadingsCollected(windingReadings).completedCount} / 13
                  </span>
                </div>
              </div>

              {/* Row 3: Terminal Pair Selection & Measurement Action */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2.5">
                <div className="text-sm font-semibold text-slate-300">
                  请选择测量目标端对（万用表红黑表笔跨接）：
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      'PAIR_1_2',
                      'PAIR_3_4',
                      'PAIR_1_3',
                      'PAIR_1_K',
                    ] as WindingTerminalPair[]
                  ).map((pair) => {
                    const meta = TERMINAL_PAIR_META[pair];
                    const isSelected = s1ActivePair === pair;
                    const hasTested = windingReadings.some(
                      (r) => r.sampleId === s1ActiveSample && r.pair === pair
                    );
                    return (
                      <button
                        key={pair}
                        type="button"
                        disabled={s1Submitted}
                        onClick={() => {
                          sounds.click();
                          setS1ActivePair(pair);
                          setLastWindingReadingText(null);
                          setS1CurrentMeasurementFeedback(null);
                        }}
                        className={`p-2 text-left rounded border text-sm font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-900/60 border-purple-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{meta.label}</span>
                          {hasTested && <span className="text-emerald-400 text-sm">已测</span>}
                        </div>
                        <div className="text-sm text-slate-400 mt-0.5 truncate">{meta.name}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                  <div className="text-sm text-slate-300">
                    当前选定：
                    <span className="font-bold text-amber-400 ml-1">
                      {WINDING_SAMPLES[s1ActiveSample].name} · {TERMINAL_PAIR_META[s1ActivePair].label}
                    </span>
                    <span className="text-slate-400 ml-2">
                      ({TERMINAL_PAIR_META[s1ActivePair].purpose})
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={s1Submitted}
                    onClick={handlePerformMeasurement}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Zap className="w-4 h-4" /> 执行测量并记录
                  </button>
                </div>

                {s1CurrentMeasurementFeedback && (
                  <div className="p-2.5 bg-slate-800 rounded border border-slate-700 text-sm text-slate-200">
                    {s1CurrentMeasurementFeedback}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Steps 2 to 5 Existing Interactive Buttons */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            {currentStep === 'VOLTAGE_AND_CURRENT_RATIO' && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-300 font-medium">匝比模式:</span>
                <button
                  type="button"
                  onClick={() => {
                    sounds.click();
                    setS2TurnsMode('STEP_DOWN');
                  }}
                  className={`px-3.5 py-2 rounded text-sm font-bold cursor-pointer ${
                    s2TurnsMode === 'STEP_DOWN' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  降压模式 (1100:60 匝 ⟼ 220V:12V, 0.27A:5A)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.click();
                    setS2TurnsMode('STEP_UP');
                  }}
                  className={`px-3.5 py-2 rounded text-sm font-bold cursor-pointer ${
                    s2TurnsMode === 'STEP_UP' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  升压模式 (60:1100 匝 ⟼ 12V:220V)
                </button>
              </div>
            )}

            {currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE' && (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-3 flex-wrap">
                  {s3ObservationStage === 'not_started' && (
                    <button
                      type="button"
                      onClick={() => {
                        sounds.click();
                        setS3ObservationStage('transient_observed');
                      }}
                      className="px-4 py-2 rounded text-sm font-bold cursor-pointer bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                    >
                      观察恒定直流误接（虚拟演示）
                    </button>
                  )}
                  {s3ObservationStage === 'transient_observed' && (
                    <button
                      type="button"
                      onClick={() => {
                        sounds.click();
                        setS3ObservationStage('steady_observed');
                      }}
                      className="px-4 py-2 rounded text-sm font-bold cursor-pointer bg-purple-600 hover:bg-purple-500 text-white shadow-xs"
                    >
                      查看理想稳态与风险
                    </button>
                  )}
                  {s3ObservationStage === 'steady_observed' && (
                    <div className="px-3 py-1.5 rounded bg-slate-800 text-sm font-semibold text-emerald-300 border border-emerald-500/40">
                      ✓ 已完成两阶段观察（暂态与稳态）
                    </div>
                  )}
                  {!s3Submitted && s3ObservationStage !== 'not_started' && (
                    <button
                      type="button"
                      onClick={handleResetStep3Demo}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300 cursor-pointer border border-slate-700"
                    >
                      重置本步演示
                    </button>
                  )}
                </div>
                {s3ObservationStage === 'transient_observed' && (
                  <p className="text-sm text-amber-300/90 leading-relaxed m-0 font-medium">
                    接通暂态：电流与磁通经历变化；副边可能出现瞬态感应电压，本演示未计算波形。
                  </p>
                )}
                {s3ObservationStage === 'steady_observed' && (
                  <p className="text-sm text-slate-300 leading-relaxed m-0 font-medium">
                    理想稳态：副边无持续感应输出。原边仅由纯电阻限流，存在严重过热风险。
                  </p>
                )}
              </div>
            )}

            {currentStep === 'POLARITY_AND_SAME_NAME_TERMINALS' && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-300 font-medium">端子串联方式:</span>
                <button
                  type="button"
                  onClick={() => {
                    sounds.click();
                    setS4Connection('SUBTRACTIVE');
                  }}
                  className={`px-3.5 py-2 rounded text-sm font-bold cursor-pointer ${
                    s4Connection === 'SUBTRACTIVE' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  1 与 3 短接 (同名端相消差动: U24 = 12-4 = 8.0V)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.click();
                    setS4Connection('ADDITIVE');
                  }}
                  className={`px-3.5 py-2 rounded text-sm font-bold cursor-pointer ${
                    s4Connection === 'ADDITIVE' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  1 与 4 短接 (异名端顺动加法: U23 = 12+4 = 16.0V)
                </button>
              </div>
            )}

            {currentStep === 'ONBOARD_INVERTER_STEP_UP_DELIVERY' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    sounds.zap();
                    setS5InverterOn(!s5InverterOn);
                  }}
                  className={`px-3.5 py-2 rounded text-sm font-bold cursor-pointer ${
                    s5InverterOn ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {s5InverterOn ? '逆变电源运转中 (输出 220V)' : '开启车载逆变器开关'}
                </button>
                {s5InverterOn && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.click();
                      setS5LoadPlugged(!s5LoadPlugged);
                    }}
                    className={`px-3.5 py-2 rounded text-sm font-semibold cursor-pointer ${
                      s5LoadPlugged ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {s5LoadPlugged ? '拔出 100W 负载' : '接入 100W 笔记本充电器'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Multimeter & Step 1 Winding Assessment Form (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Universal Multimeter */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-slate-300">工业级万用表 (VC890D)</span>
              </div>
              <span className="text-sm font-mono text-slate-300">
                {currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE'
                  ? '本步不使用仪表'
                  : `旋钮: ${meterKnob === 'OFF' ? '关机 OFF' : meterKnob}`}
              </span>
            </div>

            {currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE' ? (
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 my-3 text-center">
                <div className="text-sm font-bold text-slate-300 mb-1">定性演示／未进行仪表测量</div>
                <div className="text-sm text-slate-400 leading-relaxed">
                  本步骤为恒定直流误接暂态与稳态机理分析，未接入万用表实测。相关参数来自理论估算假设，不作为仪表测量记录。
                </div>
              </div>
            ) : (
              <>
                {/* LCD Display */}
                <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-lg p-3 my-3 text-center">
                  <div className="text-sm text-emerald-400/70 font-mono tracking-widest uppercase mb-1">
                    {meterKnob === 'DCV_20'
                      ? 'DC VOLTAGE (20V)'
                      : meterKnob === 'ACV_750'
                      ? 'AC VOLTAGE (750V)'
                      : meterKnob === 'OHM_200'
                      ? 'RESISTANCE (200Ω)'
                      : meterKnob === 'OHM_200K'
                      ? 'RESISTANCE (200kΩ)'
                      : 'POWER OFF'}
                  </div>
                  <div
                    data-testid="multimeter-lcd"
                    className="text-4xl lg:text-5xl font-mono font-black text-emerald-400 tracking-tight"
                  >
                    {(() => {
                      if (meterKnob === 'OFF') return '----';
                      if (meterKnob === 'ACV_750') {
                        if (currentStep === 'VOLTAGE_AND_CURRENT_RATIO') {
                          return s2TurnsMode === 'STEP_DOWN' ? '12.0 V~' : '220.0 V~';
                        }
                        if (currentStep === 'POLARITY_AND_SAME_NAME_TERMINALS') {
                          return s4Connection === 'SUBTRACTIVE' ? '8.0 V~' : '16.0 V~';
                        }
                        if (currentStep === 'ONBOARD_INVERTER_STEP_UP_DELIVERY') {
                          if (!s5InverterOn) return '0.0 V~';
                          return s5LoadPlugged ? '219.8 V~' : '220.5 V~';
                        }
                        return '220.0 V~';
                      }
                      if (meterKnob === 'DCV_20') {
                        return '12.00 V';
                      }
                      if (meterKnob === 'OHM_200' || meterKnob === 'OHM_200K') {
                        if (currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX') {
                          return lastWindingReadingText ?? '未测量';
                        }
                        return '0.3 Ω';
                      }
                      return '0.00';
                    })()}
                  </div>
                </div>

                {/* Multimeter Knob Buttons (支持 OHM_200 与 OHM_200K) */}
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    disabled={currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX' && s1Submitted}
                    onClick={() => {
                      sounds.click();
                      setMeterKnob('OFF');
                      setLastWindingReadingText(null);
                      setS1CurrentMeasurementFeedback(null);
                    }}
                    className={`py-2 px-1 text-sm rounded font-mono font-bold cursor-pointer text-center ${
                      meterKnob === 'OFF'
                        ? 'bg-rose-700 text-white ring-2 ring-rose-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    OFF 关机
                  </button>
                  <button
                    type="button"
                    disabled={currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX' && s1Submitted}
                    onClick={() => {
                      sounds.click();
                      setMeterKnob('DCV_20');
                      setMeterWarning(null);
                      setLastWindingReadingText(null);
                      setS1CurrentMeasurementFeedback(null);
                    }}
                    className={`py-2 px-1 text-sm rounded font-mono font-bold cursor-pointer text-center ${
                      meterKnob === 'DCV_20'
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    DCV 20V
                  </button>
                  <button
                    type="button"
                    disabled={currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX' && s1Submitted}
                    onClick={() => {
                      sounds.click();
                      setMeterKnob('ACV_750');
                      setMeterWarning(null);
                      setLastWindingReadingText(null);
                      setS1CurrentMeasurementFeedback(null);
                    }}
                    className={`py-2 px-1 text-sm rounded font-mono font-bold cursor-pointer text-center ${
                      meterKnob === 'ACV_750'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    ACV 750V
                  </button>
                  <button
                    type="button"
                    disabled={currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX' && s1Submitted}
                    onClick={() => {
                      sounds.click();
                      setMeterKnob('OHM_200');
                      setMeterWarning(null);
                      setLastWindingReadingText(null);
                      setS1CurrentMeasurementFeedback(null);
                    }}
                    className={`py-2 px-1 text-sm rounded font-mono font-bold cursor-pointer text-center ${
                      meterKnob === 'OHM_200'
                        ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Ω 200Ω
                  </button>
                  <button
                    type="button"
                    disabled={currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX' && s1Submitted}
                    onClick={() => {
                      sounds.click();
                      setMeterKnob('OHM_200K');
                      setMeterWarning(null);
                      setLastWindingReadingText(null);
                      setS1CurrentMeasurementFeedback(null);
                    }}
                    className={`py-2 px-1 text-sm rounded font-mono font-bold cursor-pointer text-center ${
                      meterKnob === 'OHM_200K'
                        ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Ω 200kΩ
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Form & Assessment Panel */}
          <div className="d05-assessment flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-4">
            {/* Step 1 Comprehensive Sub-Tasks */}
            {currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX' && (
              <div className="space-y-4">
                {/* 1. Sample Diagnostic Section */}
                <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-purple-900">
                      当前诊断对象：{WINDING_SAMPLES[s1ActiveSample].name}
                    </span>
                    <span className="text-sm font-semibold text-purple-700">
                      实测项: {windingReadings.filter((r) => r.sampleId === s1ActiveSample).length}/
                      {s1ActiveSample === 'B' ? 5 : 4}
                    </span>
                  </div>

                  {/* Readings Table for Active Sample */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="border-b border-purple-200 text-purple-950 font-bold">
                          <th className="py-1 px-1.5">端对</th>
                          <th className="py-1 px-1.5">挡位</th>
                          <th className="py-1 px-1.5">读数 (教学模型)</th>
                          <th className="py-1 px-1.5">补偿值</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(['PAIR_1_2', 'PAIR_3_4', 'PAIR_1_3', 'PAIR_1_K'] as WindingTerminalPair[]).map(
                          (pair) => {
                            const recs = windingReadings.filter(
                              (r) => r.sampleId === s1ActiveSample && r.pair === pair
                            );
                            if (recs.length === 0) {
                              return (
                                <tr key={pair} className="border-b border-purple-100 text-slate-400">
                                  <td className="py-1 px-1.5 font-medium">
                                    {TERMINAL_PAIR_META[pair].label}
                                  </td>
                                  <td className="py-1 px-1.5">--</td>
                                  <td className="py-1 px-1.5 italic">未测量</td>
                                  <td className="py-1 px-1.5">--</td>
                                </tr>
                              );
                            }
                            return recs.map((rec, idx) => (
                              <tr
                                key={`${pair}_${idx}`}
                                className="border-b border-purple-100 text-slate-700"
                              >
                                <td className="py-1 px-1.5 font-bold">
                                  {TERMINAL_PAIR_META[pair].label}
                                </td>
                                <td className="py-1 px-1.5 font-mono">{rec.meterRange}</td>
                                <td className="py-1 px-1.5 font-mono font-bold text-purple-700">
                                  {rec.displayText}
                                </td>
                                <td className="py-1 px-1.5 font-mono text-slate-600">
                                  {rec.readingKind === 'finite' ? `${rec.compensatedOhm} Ω` : 'OL'}
                                </td>
                              </tr>
                            ));
                          }
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Sample Choice Radio Options */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-sm font-semibold text-slate-700">
                      请选择最符合【{WINDING_SAMPLES[s1ActiveSample].name}】实测现象及证据边界的结论：
                    </div>
                    {SAMPLE_JUDGMENT_OPTIONS.map((opt) => {
                      const isSelected = sampleChoiceMap[s1ActiveSample] === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-sm cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-100/90 border-purple-500 text-purple-950 font-medium'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`sample_choice_${s1ActiveSample}`}
                            value={opt.id}
                            disabled={s1Submitted}
                            checked={isSelected}
                            onChange={() => handleSampleChoiceChange(s1ActiveSample, opt.id)}
                            className="mt-1"
                          />
                          <div className="leading-tight">
                            <strong className="block font-bold">{opt.label}</strong>
                            {opt.description}
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      disabled={s1Submitted}
                      onClick={() => handleVerifySampleJudgment(s1ActiveSample)}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm py-1.5 px-3 rounded cursor-pointer"
                    >
                      提交【{WINDING_SAMPLES[s1ActiveSample].name}】诊断工单
                    </Button>
                    {sampleJudgments[s1ActiveSample]?.isCorrect && (
                      <span className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> 该样本已通过判定
                      </span>
                    )}
                  </div>

                  {sampleFeedbackMap[s1ActiveSample] && (
                    <div
                      className={`text-sm p-2 rounded font-semibold ${
                        sampleFeedbackMap[s1ActiveSample]!.isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {sampleFeedbackMap[s1ActiveSample]!.text}
                    </div>
                  )}
                </div>

                {/* 2. Shared Boundary Question */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="text-sm font-semibold text-slate-800">
                    {BOUNDARY_QUESTION.title}
                  </div>
                  <div className="space-y-1.5">
                    {BOUNDARY_QUESTION.options.map((opt) => {
                      const isSelected = boundaryChoice === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-sm cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-950 font-medium'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="boundary_question"
                            value={opt.id}
                            disabled={s1Submitted}
                            checked={isSelected}
                            onChange={() => handleBoundaryChoiceChange(opt.id)}
                            className="mt-1"
                          />
                          <div className="leading-snug">{opt.text}</div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      disabled={s1Submitted || !boundaryChoice}
                      onClick={handleVerifyBoundaryJudgment}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-1.5 px-3 rounded cursor-pointer"
                    >
                      提交边界辨析
                    </Button>
                    {boundaryJudgment?.isCorrect && (
                      <span className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> 证据边界已核准
                      </span>
                    )}
                  </div>

                  {boundaryJudgment && (
                    <div
                      className={`text-sm p-2 rounded font-semibold ${
                        boundaryJudgment.isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {boundaryJudgment.text}
                    </div>
                  )}
                </div>

                {/* 3. Original Core Flux Question */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-sm font-semibold text-slate-800">
                    【原原理辨析】初级与次级无导线连接，电能是如何传递到次级的？
                  </div>
                  <div className="space-y-1">
                    {[
                      {
                        id: 'A',
                        text: '初级交流电在闭合铁芯中激发出交变磁通，磁通穿过次级绕组产生电磁感应电能',
                      },
                      { id: 'B', text: '变压器绝缘层内部有微小的无线电发射天线' },
                      { id: 'C', text: '硅钢片是超导体，能直接导电到次级' },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-2 p-2 rounded-lg border text-sm cursor-pointer transition-all ${
                          s1Choice === opt.id
                            ? 'bg-purple-50 border-purple-500 text-purple-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="flux_question"
                          value={opt.id}
                          disabled={s1Submitted}
                          checked={s1Choice === opt.id}
                          onChange={() => setS1Choice(opt.id)}
                          className="mt-0.5"
                        />
                        <span className="leading-snug">{opt.text}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 4. Threshold Summary & Final Submit */}
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-300 space-y-2 text-sm">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>步骤 1 实训考核门槛清单</span>
                    <span className="font-mono text-purple-700">
                      {[
                        checkAll13ReadingsCollected(windingReadings).is13Complete,
                        sampleJudgments.A?.isCorrect,
                        sampleJudgments.B?.isCorrect,
                        sampleJudgments.C?.isCorrect,
                        boundaryJudgment?.isCorrect,
                        Boolean(s1Choice),
                      ].filter(Boolean).length}{' '}
                      / 6 达成
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          checkAll13ReadingsCollected(windingReadings).is13Complete
                            ? 'text-emerald-600 font-bold'
                            : 'text-slate-400'
                        }
                      >
                        {checkAll13ReadingsCollected(windingReadings).is13Complete ? '✓' : '○'}
                      </span>
                      <span>
                        13 项指定端对测量 (
                        {checkAll13ReadingsCollected(windingReadings).completedCount}/13)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          sampleJudgments.A?.isCorrect
                            ? 'text-emerald-600 font-bold'
                            : 'text-slate-400'
                        }
                      >
                        {sampleJudgments.A?.isCorrect ? '✓' : '○'}
                      </span>
                      <span>样本 A 诊断判定 ({sampleJudgments.A ? '已通过' : '待提交'})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          sampleJudgments.B?.isCorrect
                            ? 'text-emerald-600 font-bold'
                            : 'text-slate-400'
                        }
                      >
                        {sampleJudgments.B?.isCorrect ? '✓' : '○'}
                      </span>
                      <span>样本 B 高量程复核与诊断 ({sampleJudgments.B ? '已通过' : '待提交'})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          sampleJudgments.C?.isCorrect
                            ? 'text-emerald-600 font-bold'
                            : 'text-slate-400'
                        }
                      >
                        {sampleJudgments.C?.isCorrect ? '✓' : '○'}
                      </span>
                      <span>样本 C 低阻边界与诊断 ({sampleJudgments.C ? '已通过' : '待提交'})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          boundaryJudgment?.isCorrect
                            ? 'text-emerald-600 font-bold'
                            : 'text-slate-400'
                        }
                      >
                        {boundaryJudgment?.isCorrect ? '✓' : '○'}
                      </span>
                      <span>测量与绝缘证据边界题 ({boundaryJudgment?.isCorrect ? '已通过' : '待提交'})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          s1Choice ? 'text-emerald-600 font-bold' : 'text-slate-400'
                        }
                      >
                        {s1Choice ? '✓' : '○'}
                      </span>
                      <span>交变磁通耦合认知题 ({s1Choice ? '已选择' : '待选择'})</span>
                    </div>
                  </div>

                  {!s1Submitted ? (
                    <Button
                      type="button"
                      disabled={!isStep1PrerequisitesReadyState}
                      onClick={handleStep1FinalSubmit}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-lg cursor-pointer mt-2 text-sm"
                    >
                      提交步骤1工单
                    </Button>
                  ) : (
                    <div className="space-y-2 mt-2">
                      <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-sm font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>步骤 1 绕组初检与交变磁通工单已锁定提交！</span>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          assessment.startStage('standard');
                          onAdvanceStep();
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg cursor-pointer text-sm"
                      >
                        完成步骤1，进入步骤2 <ArrowRight className="w-4 h-4 ml-1 inline" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2 Question */}
            {currentStep === 'VOLTAGE_AND_CURRENT_RATIO' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-700">
                  【步骤2变压比与变流比】若变压器将 220V 降至 12V 供车载 60W 负载(5A)使用，关于初次级导线的判断：
                </div>
                <div className="space-y-2">
                  {[
                    {
                      id: 'A',
                      text: '次级电流(5A)远大于初级电流(0.27A)，根据焦耳热规律次级绕组必须采用截面积粗得多的导线',
                    },
                    { id: 'B', text: '初级电压高，所以初级导线必须比次级粗得多' },
                    { id: 'C', text: '初次级电流相等，导线粗细完全一致' },
                  ].map((opt) => {
                    const isSelected = s2Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass =
                      'border-slate-200 bg-slate-50 text-slate-700 hover:border-purple-300';
                    if (s2Submitted) {
                      if (isSelected && isCorrect)
                        borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect)
                        borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect)
                        borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-purple-500 bg-purple-950/40 text-purple-200';
                    }
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={s2Submitted}
                        onClick={() => {
                          sounds.click();
                          setS2Choice(opt.id);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border text-sm transition-all cursor-pointer ${borderClass}`}
                      >
                        <span className="font-bold mr-1.5">•</span> {opt.text}
                      </button>
                    );
                  })}
                </div>
                {!s2Submitted ? (
                  <Button
                    type="button"
                    disabled={!s2Choice}
                    onClick={() => {
                      if (s2Choice === 'A') {
                        sounds.success();
                        setS2Submitted(true);
                        onStepComplete('VOLTAGE_AND_CURRENT_RATIO', { choice: s2Choice });
                      } else {
                        sounds.warningBuzz();
                        setS2Submitted(true);
                        assessment.recordWrong('standard');
                      }
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-sm font-semibold py-2"
                  >
                    提交变比与线径分析
                  </Button>
                ) : s2Choice === 'A' ? (
                  <Button
                    type="button"
                    onClick={() => {
                      assessment.completeStage('standard');
                      assessment.startStage('calculation');
                      onAdvanceStep();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold py-2"
                  >
                    规律准确！进入恒定直流误接反例分析 <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      setS2Submitted(false);
                      setS2Choice(null);
                    }}
                    variant="outline"
                    className="w-full text-sm"
                  >
                    重新思考
                  </Button>
                )}
              </div>
            )}

            {/* Step 3: DC Counterexample Analysis Form */}
            {currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE' && (
              <div className="space-y-4" data-testid="d05-dc-counterexample-card">
                {/* 1. Teaching Parameters & Assumptions Card */}
                <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 text-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-purple-900">
                      教学参数与理论估算假设 (独立展示 · 非仪表测量记录)
                    </span>
                    <span className="text-sm bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded font-semibold">
                      理论估算
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-700 bg-white/70 p-2 rounded-lg border border-purple-100">
                    <div>
                      电源电压：<strong className="text-slate-900">{DC_TEACHING_CONFIG.supplyVoltage}V 恒定直流</strong>
                    </div>
                    <div>
                      原边线圈电阻：<strong className="text-slate-900">{DC_TEACHING_CONFIG.primaryResistanceOhm.toFixed(2)}Ω</strong>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed space-y-0.5 pt-1">
                    <div className="font-semibold text-purple-800">适用假设：</div>
                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                      {DC_TEACHING_CONFIG.assumptions.map((ass, idx) => (
                        <li key={idx}>{ass}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 2. Current Estimation Input */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label htmlFor="s3-current-input" className="block text-sm font-semibold text-slate-800">
                    1. 稳态电流估算值填报（在上述假设下，原边仅由纯电阻限流）：
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="s3-current-input"
                      type="text"
                      disabled={s3Submitted}
                      placeholder="输入估算值"
                      value={s3CurrentInput}
                      onChange={(e) => {
                        setS3CurrentInput(e.target.value);
                        setS3FeedbackErrors(null);
                      }}
                      className="w-40 px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white font-mono text-slate-900 disabled:bg-slate-100"
                    />
                    <span className="text-sm font-bold text-slate-600">A (安培)</span>
                  </div>
                </div>

                {/* 3. Transient / Steady State Judgment */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-sm font-semibold text-slate-800">
                    2. {TRANSIENT_STEADY_QUESTION.title}
                  </div>
                  <div className="space-y-1.5">
                    {TRANSIENT_STEADY_QUESTION.options.map((opt) => {
                      const isSelected = s3TransientChoice === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border text-sm cursor-pointer transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50/70 text-purple-900 font-medium'
                              : 'border-slate-200 bg-white hover:border-purple-200 text-slate-700'
                          } ${s3Submitted ? 'cursor-default' : ''}`}
                        >
                          <input
                            type="radio"
                            name="s3-transient-steady"
                            value={opt.id}
                            disabled={s3Submitted}
                            checked={isSelected}
                            onChange={() => {
                              if (s3Submitted) return;
                              setS3TransientChoice(opt.id);
                              setS3FeedbackErrors(null);
                            }}
                            className="mt-1 text-purple-600 focus:ring-purple-500"
                          />
                          <span>{opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Protection Risk Judgment */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-sm font-semibold text-slate-800">
                    3. {PROTECTION_QUESTION.title}
                  </div>
                  <div className="space-y-1.5">
                    {PROTECTION_QUESTION.options.map((opt) => {
                      const isSelected = s3ProtectionChoice === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border text-sm cursor-pointer transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50/70 text-purple-900 font-medium'
                              : 'border-slate-200 bg-white hover:border-purple-200 text-slate-700'
                          } ${s3Submitted ? 'cursor-default' : ''}`}
                        >
                          <input
                            type="radio"
                            name="s3-protection"
                            value={opt.id}
                            disabled={s3Submitted}
                            checked={isSelected}
                            onChange={() => {
                              if (s3Submitted) return;
                              setS3ProtectionChoice(opt.id);
                              setS3FeedbackErrors(null);
                            }}
                            className="mt-1 text-purple-600 focus:ring-purple-500"
                          />
                          <span>{opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Inverter Distinction */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-sm font-semibold text-slate-800">
                    4. {INVERTER_QUESTION.title}
                  </div>
                  <div className="space-y-1.5">
                    {INVERTER_QUESTION.options.map((opt) => {
                      const isSelected = s3InverterChoice === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border text-sm cursor-pointer transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50/70 text-purple-900 font-medium'
                              : 'border-slate-200 bg-white hover:border-purple-200 text-slate-700'
                          } ${s3Submitted ? 'cursor-default' : ''}`}
                        >
                          <input
                            type="radio"
                            name="s3-inverter"
                            value={opt.id}
                            disabled={s3Submitted}
                            checked={isSelected}
                            onChange={() => {
                              if (s3Submitted) return;
                              setS3InverterChoice(opt.id);
                              setS3FeedbackErrors(null);
                            }}
                            className="mt-1 text-purple-600 focus:ring-purple-500"
                          />
                          <span>{opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Error Feedback Display */}
                {s3FeedbackErrors && s3FeedbackErrors.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 text-sm space-y-1.5" role="alert">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>分析未通过，发现以下问题（已记入 1 次计算阶段错误扣分）：</span>
                    </div>
                    <ul className="list-disc list-inside text-sm space-y-1 pl-1 text-rose-800 font-medium">
                      {s3FeedbackErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Submission & Action Buttons */}
                {!s3Submitted ? (
                  <div className="space-y-2">
                    {s3ObservationStage !== 'steady_observed' && (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 font-medium m-0">
                        ⚠️ 提交前提：请先在上方完成“接通暂态”与“理想稳态”两阶段观察，方可解锁提交工单。
                      </p>
                    )}
                    <Button
                      type="button"
                      disabled={
                        s3ObservationStage !== 'steady_observed' ||
                        !s3CurrentInput.trim() ||
                        !s3TransientChoice ||
                        !s3ProtectionChoice ||
                        !s3InverterChoice
                      }
                      onClick={handleStep3Submit}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-sm font-semibold py-2.5"
                    >
                      提交直流误接分析工单
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-sm space-y-1">
                      <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>✓ 直流误接机理分析与稳态估算通过！工单已锁定。</span>
                      </div>
                      <div className="text-sm text-slate-700">
                        <strong>理论推导：</strong>稳态电流估算值 I = U / R = 12V ÷ 0.30Ω = 40.0A。
                      </div>
                      <div className="text-sm text-slate-500 leading-relaxed">
                        适用假设：忽略内阻与温升的纯电阻限流稳态。真实物理过程受电感接通暂态、铁芯磁饱和非线性及保护器件安秒特性制约。
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleAdvanceFromStep3}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold py-2.5 shadow-xs"
                    >
                      进入同名端极性测试 <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4 Question */}
            {currentStep === 'POLARITY_AND_SAME_NAME_TERMINALS' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-700">
                  【步骤4同名端判定】当将初级端子1与次级端子3短接，测得端子2与4总电压为 8.0V (12V - 4V) 时：
                </div>
                <div className="space-y-2">
                  {[
                    {
                      id: 'A',
                      text: '总电压为两绕组电压相消相减(U24 = U1 - U2)，说明端子 1 与端子 3 是同名端',
                    },
                    { id: 'B', text: '总电压变小说明次级线圈绝缘击穿损坏' },
                    { id: 'C', text: '电压变小说明端子 1 与端子 4 是同名端' },
                  ].map((opt) => {
                    const isSelected = s4Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass =
                      'border-slate-200 bg-slate-50 text-slate-700 hover:border-purple-300';
                    if (s4Submitted) {
                      if (isSelected && isCorrect)
                        borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect)
                        borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect)
                        borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-purple-500 bg-purple-950/40 text-purple-200';
                    }
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={s4Submitted}
                        onClick={() => {
                          sounds.click();
                          setS4Choice(opt.id);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border text-sm transition-all cursor-pointer ${borderClass}`}
                      >
                        <span className="font-bold mr-1.5">•</span> {opt.text}
                      </button>
                    );
                  })}
                </div>
                {!s4Submitted ? (
                  <Button
                    type="button"
                    disabled={!s4Choice}
                    onClick={() => {
                      if (!requireMeterPowered('ACV_750', 'blind_test')) return;
                      if (s4Choice === 'A') {
                        sounds.success();
                        setS4Submitted(true);
                        onStepComplete('POLARITY_AND_SAME_NAME_TERMINALS', { choice: s4Choice });
                      } else {
                        sounds.warningBuzz();
                        setS4Submitted(true);
                        assessment.recordWrong('blind_test');
                      }
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-sm font-semibold py-2"
                  >
                    提交同名端判定分析
                  </Button>
                ) : s4Choice === 'A' ? (
                  <Button
                    type="button"
                    onClick={() => {
                      assessment.completeStage('blind_test');
                      assessment.startStage('transfer');
                      onAdvanceStep();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold py-2"
                  >
                    同名端判定精准！进入车载逆变升压交车 <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      setS4Submitted(false);
                      setS4Choice(null);
                    }}
                    variant="outline"
                    className="w-full text-sm"
                  >
                    重新思考
                  </Button>
                )}
              </div>
            )}

            {/* Step 5 Question */}
            {currentStep === 'ONBOARD_INVERTER_STEP_UP_DELIVERY' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-700">
                  【步骤5车载逆变交车】车载 12V 蓄电池直流电是如何转化为 220V 交流电的？
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-200/60 text-sm space-y-1">
                    <div className="font-bold text-purple-950">车载逆变升压实测数据：</div>
                    <div className="text-slate-700 font-mono">
                      • 空载输出电压: 220.5 V~ (50.0 Hz)
                    </div>
                    <div className="text-slate-700 font-mono">
                      • 接入 100W 负载电压: 219.8 V~ (稳压率优异)
                    </div>
                  </div>
                  <label className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm cursor-pointer hover:border-purple-300">
                    <input
                      type="checkbox"
                      disabled={s5Submitted}
                      checked={s5WorkOrderSigned}
                      onChange={(e) => setS5WorkOrderSigned(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="text-slate-700 font-medium">
                      我已核验车载逆变升压系统输出交流电压与带载性能达标，签署验收交付工单。
                    </span>
                  </label>
                </div>
                {!s5Submitted ? (
                  <Button
                    type="button"
                    disabled={!s5InverterOn || !s5LoadPlugged || !s5WorkOrderSigned}
                    onClick={() => {
                      if (!requireMeterPowered('ACV_750', 'transfer')) return;
                      sounds.success();
                      setS5Submitted(true);
                      assessment.completeStage('transfer');
                      onStepComplete('ONBOARD_INVERTER_STEP_UP_DELIVERY', {
                        acVoltage: 219.8,
                        signed: true,
                        inverterVerified: true,
                        loadPlugged: true,
                        workOrderSigned: true,
                      });
                      if (onComplete) {
                        onComplete(assessment.completeLevel());
                      }
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold py-2"
                  >
                    签署交付并完成实训
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>D05 变压器实验室全部实训合格，交付报告已生成！</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
