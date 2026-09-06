'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Sparkles,
  Sliders,
  ShieldAlert,
  Thermometer,
  Shuffle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Multimeter, MultimeterDialMode } from '@/src/game/instruments/Multimeter';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { PracticeMode } from '@/src/types/evidence';
import { A03Step, STANDARD_RESISTOR_POOL } from '../a03Training';

interface A03ResistanceSceneProps {
  currentStep: A03Step;
  practiceMode?: PracticeMode;
  onStepComplete: (step: A03Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

export function A03ResistanceScene({
  currentStep,
  practiceMode = 'guided',
  onStepComplete,
  onAdvanceStep,
}: A03ResistanceSceneProps) {
  // Step 1: Resistor selection & inputs
  const [resistorIndex, setResistorIndex] = useState(0);
  const activeResistor = STANDARD_RESISTOR_POOL[resistorIndex];

  const [nominalInput, setNominalInput] = useState('');
  const [toleranceInput, setToleranceInput] = useState('');
  const [minBoundInput, setMinBoundInput] = useState('');
  const [maxBoundInput, setMaxBoundInput] = useState('');
  const [activeBandIndex, setActiveBandIndex] = useState<number | null>(null);
  const [calcVerified, setCalcVerified] = useState(false);
  const [calcFeedback, setCalcFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Switch to another random resistor in Step 1
  const handleRandomizeResistor = () => {
    sounds.click();
    setResistorIndex((prev) => {
      let next = Math.floor(Math.random() * STANDARD_RESISTOR_POOL.length);
      if (next === prev) {
        next = (prev + 1) % STANDARD_RESISTOR_POOL.length;
      }
      return next;
    });
    setNominalInput('');
    setToleranceInput('');
    setMinBoundInput('');
    setMaxBoundInput('');
    setActiveBandIndex(null);
    setCalcVerified(false);
    setCalcFeedback(null);
  };

  // Step 2: Dynamic samples derived from the active resistor
  const activeSamples = useMemo(() => {
    return {
      A: {
        id: 'A' as const,
        name: `样品 A (精密膜电阻 · 标称${activeResistor.nominal}Ω)`,
        trueR: activeResistor.sampleAValue,
        expected: 'QUALIFIED' as const,
      },
      B: {
        id: 'B' as const,
        name: `样品 B (老化超差件 · 标称${activeResistor.nominal}Ω)`,
        trueR: activeResistor.sampleBValue,
        expected: 'UNQUALIFIED' as const,
      },
      C: {
        id: 'C' as const,
        name: '样品 C (烧毁开路件)',
        trueR: 1e9,
        expected: 'BROKEN' as const,
      },
    };
  }, [activeResistor]);

  // Step 2: DMM states & sample measurement (Default OFF compliant with user request)
  const [dial, setDial] = useState<MultimeterDialMode>('OFF');
  const [selectedSample, setSelectedSample] = useState<'A' | 'B' | 'C'>('A');
  const [isPowerAppliedToSample, setIsPowerAppliedToSample] = useState(false);
  const [sampleEvaluations, setSampleEvaluations] = useState<Record<string, string>>({});
  const [v05Triggered, setV05Triggered] = useState(false);
  const [step2Feedback, setStep2Feedback] = useState<{ type: 'warning' | 'success'; message: string } | null>(null);

  // Step 3: Potentiometer testing
  const [potKnobRatio, setPotKnobRatio] = useState<number>(0.5);
  const [potProbePair, setPotProbePair] = useState<'1-3' | '1-2' | '2-3'>('1-3');
  const [potRecordedPoints, setPotRecordedPoints] = useState<Set<string>>(new Set());

  // Step 4: Independent 985Ω blind check (Strictly zero spoiler, neutral initial state)
  const [independentChoice, setIndependentChoice] = useState<string | null>(null);
  const [independentSubmitted, setIndependentSubmitted] = useState<boolean>(false);
  const [independentFeedback, setIndependentFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Step 5: Transfer NTC Coolant Temperature Sensor (Strictly zero spoiler, neutral initial state)
  const [coolantTemp, setCoolantTemp] = useState<number>(20); // 20°C to 80°C
  const [ntcChoice, setNtcChoice] = useState<string | null>(null);
  const [ntcSubmitted, setNtcSubmitted] = useState<boolean>(false);
  const [ntcFeedback, setNtcFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // DMM Solver evaluation
  const dmmResult = useMemo(() => {
    const dmm = new Multimeter();
    dmm.setDial(dial);
    dmm.setRedProbeJack('V_OHM');
    dmm.setBlackProbeJack('COM');

    if (currentStep === 'SAMPLE_MEASUREMENT') {
      const activeSample = activeSamples[selectedSample];
      return dmm.measure({
        isCircuitPowered: isPowerAppliedToSample,
        isolatedResistance: activeSample.trueR,
      });
    }

    if (currentStep === 'POTENTIOMETER_TEST') {
      let r = 10000;
      if (potProbePair === '1-3') {
        r = 10000;
      } else if (potProbePair === '1-2') {
        r = 10000 * potKnobRatio;
      } else if (potProbePair === '2-3') {
        r = 10000 * (1 - potKnobRatio);
      }
      return dmm.measure({
        isCircuitPowered: false,
        isolatedResistance: Math.max(0.1, r),
      });
    }

    if (currentStep === 'INDEPENDENT_EVAL') {
      return dmm.measure({
        isCircuitPowered: false,
        isolatedResistance: 985.0,
      });
    }

    if (currentStep === 'TRANSFER_NTC') {
      // NTC sensor resistance: R(T) = 2500 * exp(-0.035 * (T - 20))
      const ntcR = Math.round(2500 * Math.exp(-0.035 * (coolantTemp - 20)));
      return dmm.measure({
        isCircuitPowered: false,
        isolatedResistance: ntcR,
      });
    }

    return dmm.measure({});
  }, [dial, currentStep, selectedSample, activeSamples, isPowerAppliedToSample, potProbePair, potKnobRatio, coolantTemp]);

  // Step 1: Verify calculation without giving away answers (user must judge tolerance independently)
  const handleVerifyCalc = () => {
    sounds.click();
    const nomVal = parseFloat(nominalInput.trim());
    const tolVal = parseFloat(toleranceInput.trim());
    const minVal = parseFloat(minBoundInput.trim());
    const maxVal = parseFloat(maxBoundInput.trim());

    if (isNaN(nomVal) || isNaN(tolVal) || isNaN(minVal) || isNaN(maxVal)) {
      setCalcFeedback({
        type: 'error',
        message: '请完整填写标称阻值、第4环允许误差选择以及允许上下限数值！',
      });
      return;
    }

    if (nomVal !== activeResistor.nominal) {
      const b1 = activeResistor.bands[0];
      const b2 = activeResistor.bands[1];
      const b3 = activeResistor.bands[2];
      setCalcFeedback({
        type: 'error',
        message: `标称阻值有误（输入为 ${nomVal}Ω）：第1环${b1.name}(${b1.value})、第2环${b2.name}(${b2.value})组成前两位有效数字 ${b1.value}${b2.value}；第3环${b3.name}为倍率 ×10^${b3.value}。标称值应为 ${activeResistor.nominal} Ω。`,
      });
      return;
    }

    if (tolVal !== activeResistor.tolerance) {
      const b4 = activeResistor.bands[3];
      setCalcFeedback({
        type: 'error',
        message: `第4环允许误差判断有误（选择为 ±${tolVal}%）：当前电阻第4环为【${b4.name}色】，对应的允许公差应为 ±${activeResistor.tolerance}%！请参考下方色标基准口诀。`,
      });
      return;
    }

    if (minVal >= maxVal) {
      setCalcFeedback({
        type: 'error',
        message: '公差区间逻辑有误：允许下限必须严格小于允许上限！',
      });
      return;
    }

    const delta = activeResistor.nominal * (activeResistor.tolerance / 100);
    const expectedMin = activeResistor.expectedMin;
    const expectedMax = activeResistor.expectedMax;

    if (Math.abs(minVal - expectedMin) < 1 && Math.abs(maxVal - expectedMax) < 1) {
      setCalcVerified(true);
      sounds.success();
      setCalcFeedback({
        type: 'success',
        message: `✓ 色环解码与公差推算完全正确！标称阻值 ${activeResistor.nominal}Ω，第4环${activeResistor.bands[3].name}色公差 ±${activeResistor.tolerance}%（公差幅度 ±${delta}Ω），合格区间为 [${expectedMin}Ω, ${expectedMax}Ω]。已达成第一阶段目标！`,
      });
      onStepComplete('COLOR_CODE_CALC', {
        resistorId: activeResistor.id,
        resistorName: activeResistor.name,
        nominal: activeResistor.nominal,
        tolerance: activeResistor.tolerance,
        min: expectedMin,
        max: expectedMax,
        mode: practiceMode,
      });
    } else {
      setCalcFeedback({
        type: 'error',
        message: `公差区间计算有误（当前输入 [${minVal}Ω, ${maxVal}Ω]）：标称值 ${activeResistor.nominal}Ω，第4环${activeResistor.bands[3].name}色公差为 ±${activeResistor.tolerance}%，公差幅度 = ${activeResistor.nominal} × ${activeResistor.tolerance}% = ${delta}Ω。请重新计算下限 (${activeResistor.nominal} - ${delta}) 与上限 (${activeResistor.nominal} + ${delta})！`,
      });
    }
  };

  // Step 2: Handle live network power toggle with V05 interception
  const handleTogglePower = () => {
    const nextState = !isPowerAppliedToSample;
    setIsPowerAppliedToSample(nextState);
    if (nextState) {
      setV05Triggered(true);
      sounds.warningBuzz();
    } else {
      sounds.click();
    }
  };

  // Step 2: Record sample classification (with meter power-off interception)
  const handleClassifySample = (sampleId: 'A' | 'B' | 'C', classification: string) => {
    sounds.click();

    // Check if multimeter is turned on to RESISTANCE gear
    if (dial !== 'RESISTANCE') {
      sounds.warningBuzz();
      setStep2Feedback({
        type: 'warning',
        message: '万用表当前处于【关机】或非测阻挡位！无法读取有效阻值。请先在右侧仪表盘旋转/点击选择【电阻 (Ω)】挡位开机读数后再分类！',
      });
      return;
    }

    setStep2Feedback(null);
    const newEvals = { ...sampleEvaluations, [sampleId]: classification };
    setSampleEvaluations(newEvals);

    if (newEvals.A === 'QUALIFIED' && newEvals.B === 'UNQUALIFIED' && newEvals.C === 'BROKEN') {
      sounds.success();
      setStep2Feedback({
        type: 'success',
        message: '✓ 3件待检样品全部完成精准判定分类！断电测量规范符合汽车维修工艺要求。',
      });
      onStepComplete('SAMPLE_MEASUREMENT', {
        sampleA: activeResistor.sampleAValue,
        sampleB: activeResistor.sampleBValue,
        sampleC: 'O.L',
        v04Passed: true,
        v05Encountered: v05Triggered,
        mode: practiceMode,
      });
    }
  };

  // Step 3: Record potentiometer test points
  const handleRecordPotPoint = () => {
    sounds.click();
    const pointKey = `${potProbePair}@${(potKnobRatio * 100).toFixed(0)}%`;
    const newSet = new Set(potRecordedPoints);
    newSet.add(pointKey);
    setPotRecordedPoints(newSet);

    if (newSet.size >= 4) {
      sounds.success();
      onStepComplete('POTENTIOMETER_TEST', {
        totalResistance: 10000,
        recordedPoints: Array.from(newSet),
        v04PotentiometerPassed: true,
        mode: practiceMode,
      });
    }
  };

  // Step 4: Independent 985Ω Submit
  const handleIndependentSubmit = () => {
    sounds.click();
    if (!independentChoice) {
      setIndependentFeedback({
        type: 'error',
        message: '请先仔细阅读工单并观察右侧万用表读数，选择一项判定结论后再提交工单！',
      });
      return;
    }

    setIndependentSubmitted(true);
    if (independentChoice === '985_QUALIFIED') {
      sounds.success();
      setIndependentFeedback({
        type: 'success',
        message: '✓ 判定完全正确！标称 1kΩ = 1000Ω，±5% 允许公差范围为 950Ω ~ 1050Ω。万用表实测 985.0Ω 稳稳落在公差区间内，符合汽车进气压力传感器偏置技术规范，属于合格品！',
      });
      onStepComplete('INDEPENDENT_EVAL', {
        choice: independentChoice,
        measured: 985.0,
        passed: true,
        mode: practiceMode,
      });
    } else {
      sounds.warningBuzz();
      setIndependentFeedback({
        type: 'error',
        message: '判定有误：请注意标称 1kΩ (1000Ω) 在 ±5% 允许公差下的合格区间是 950Ω ~ 1050Ω。实测 985Ω 落在该合格区间之内，并非超差或损坏！请重新思考并选择。',
      });
    }
  };

  // Step 5: Transfer NTC Submit
  const handleNtcSubmit = () => {
    sounds.click();
    if (!ntcChoice) {
      setNtcFeedback({
        type: 'error',
        message: '请先拖动水温滑块观察实测阻值变化，选择一项维修结论后再提交报告！',
      });
      return;
    }

    setNtcSubmitted(true);
    if (ntcChoice === 'NTC_NORMAL') {
      sounds.success();
      setNtcFeedback({
        type: 'success',
        message: '✓ 诊断完全正确！汽车发动机水温传感器为负温度系数 (NTC) 热敏电阻，工作规律为“水温上升、电阻反向下降”。冷态 20℃ 阻值约 2.5kΩ，热车 80℃ 阻值降至 300Ω，特性曲线连续平稳，该传感器性能良好！',
      });
      onStepComplete('TRANSFER_NTC', {
        choice: ntcChoice,
        passed: true,
        coolantTemp,
        mode: practiceMode,
      });
    } else {
      sounds.warningBuzz();
      setNtcFeedback({
        type: 'error',
        message: '诊断有误：汽车发动机水温传感器为负温度系数 (NTC) 热敏电阻，热态阻值变小是其固有的物理特性，并不是阻值衰减或失效！请重新判断。',
      });
    }
  };

  // Check if current step is ready to advance
  const isStepAdvanceReady =
    (currentStep === 'COLOR_CODE_CALC' && calcVerified) ||
    (currentStep === 'SAMPLE_MEASUREMENT' &&
      sampleEvaluations.A === 'QUALIFIED' &&
      sampleEvaluations.B === 'UNQUALIFIED' &&
      sampleEvaluations.C === 'BROKEN') ||
    (currentStep === 'POTENTIOMETER_TEST' && potRecordedPoints.size >= 4) ||
    (currentStep === 'INDEPENDENT_EVAL' && independentSubmitted && independentChoice === '985_QUALIFIED') ||
    (currentStep === 'TRANSFER_NTC' && ntcSubmitted && ntcChoice === 'NTC_NORMAL');

  return (
    <div className="w-full flex-1 min-h-[580px] flex flex-col gap-4 text-slate-800">
      {/* Station Top Step Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isStepAdvanceReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-sm font-black text-slate-800 tracking-wide">
              {currentStep === 'COLOR_CODE_CALC' && '阶段 1 / 5 · 四色环电阻识读与合格公差推算'}
              {currentStep === 'SAMPLE_MEASUREMENT' && '阶段 2 / 5 · 万用表断电测阻与带电拒测防呆 (V05)'}
              {currentStep === 'POTENTIOMETER_TEST' && '阶段 3 / 5 · 调光电位器特性与阻值互补验证'}
              {currentStep === 'INDEPENDENT_EVAL' && '阶段 4 / 5 · 进气压力传感器偏置电阻盲检与公差判定'}
              {currentStep === 'TRANSFER_NTC' && '阶段 5 / 5 · 迁移实战——实车水温传感器 (NTC) 特性排查'}
            </span>
          </div>

          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            一体化阶段实训
          </span>
        </div>

        {isStepAdvanceReady && (
          <Button
            size="sm"
            onClick={onAdvanceStep}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 px-4 py-2 shadow-sm cursor-pointer text-sm"
          >
            <span>{currentStep === 'TRANSFER_NTC' ? '查看能力报告' : '进入下一步'}</span>
            <ArrowRight size={17} />
          </Button>
        )}
      </div>

      {/* STEP 1: Color Band Reading & Calculation (Zero spoiler, interactive magnifier, random switch) */}
      {/* STEP 1: Color Band Reading & Calculation (Zero spoiler, interactive magnifier, random switch) */}
      {currentStep === 'COLOR_CODE_CALC' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
          {/* Left 7 Cols: Optical Resistor Viewer */}
          <div className="lg:col-span-7 flex flex-col gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  四色环电阻光学放大检测台
                </span>
                <span className="text-xs text-slate-500">点击色环可高亮对应环位</span>
              </div>
              <button
                type="button"
                onClick={handleRandomizeResistor}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-all cursor-pointer shadow-xs"
                title="随机更换另一颗色环电阻进行识别练习"
              >
                <Shuffle size={14} />
                <span>随机切换电阻</span>
              </button>
            </div>

            {/* Realistic Resistor SVG Viewer (Expanded height and size) */}
            <div className="w-full h-52 bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <div className="absolute top-2.5 left-3 text-xs text-slate-400 font-mono">
                OPTICAL_ZOOM: 20X · {activeResistor.name}
              </div>

              <svg viewBox="0 0 440 110" className="w-full max-w-md drop-shadow-xl">
                {/* Leads */}
                <line x1="20" y1="55" x2="100" y2="55" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />
                <line x1="340" y1="55" x2="420" y2="55" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />

                {/* Resistor body */}
                <rect x="100" y="20" width="240" height="70" rx="16" fill="#cbd5e1" stroke="#64748b" strokeWidth="3" />
                <rect x="108" y="15" width="34" height="80" rx="10" fill="#cbd5e1" stroke="#64748b" strokeWidth="2.5" />
                <rect x="298" y="15" width="34" height="80" rx="10" fill="#cbd5e1" stroke="#64748b" strokeWidth="2.5" />

                {/* Color Band 1 */}
                <g onClick={() => setActiveBandIndex(1)} className="cursor-pointer">
                  <rect x="140" y="15" width="20" height="80" fill={activeResistor.bands[0].color} rx="3" />
                  {activeBandIndex === 1 && <rect x="136" y="11" width="28" height="88" fill="none" stroke="#fef08a" strokeWidth="3.5" rx="5" />}
                </g>

                {/* Color Band 2 */}
                <g onClick={() => setActiveBandIndex(2)} className="cursor-pointer">
                  <rect x="185" y="20" width="20" height="70" fill={activeResistor.bands[1].color} rx="3" />
                  {activeBandIndex === 2 && <rect x="181" y="16" width="28" height="78" fill="none" stroke="#fef08a" strokeWidth="3.5" rx="5" />}
                </g>

                {/* Color Band 3 */}
                <g onClick={() => setActiveBandIndex(3)} className="cursor-pointer">
                  <rect x="230" y="20" width="20" height="70" fill={activeResistor.bands[2].color} rx="3" />
                  {activeBandIndex === 3 && <rect x="226" y="16" width="28" height="78" fill="none" stroke="#fef08a" strokeWidth="3.5" rx="5" />}
                </g>

                {/* Color Band 4 */}
                <g onClick={() => setActiveBandIndex(4)} className="cursor-pointer">
                  <rect x="290" y="15" width="20" height="80" fill={activeResistor.bands[3].color} rx="3" />
                  {activeBandIndex === 4 && <rect x="286" y="11" width="28" height="88" fill="none" stroke="#fef08a" strokeWidth="3.5" rx="5" />}
                </g>
              </svg>
            </div>

            {/* Interactive Color Guide Strip */}
            <div className="grid grid-cols-4 gap-2.5 text-center">
              {activeResistor.bands.map((band, idx) => {
                const ringNum = idx + 1;
                const isSelected = activeBandIndex === ringNum;
                const roleText =
                  ringNum === 1
                    ? '第1位有效数字'
                    : ringNum === 2
                    ? '第2位有效数字'
                    : ringNum === 3
                    ? '倍率 (10ⁿ)'
                    : '允许公差误差';

                return (
                  <button
                    key={ringNum}
                    type="button"
                    onClick={() => setActiveBandIndex(ringNum)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? `${band.bgColor} ${band.borderColor} ring-2 ring-amber-400`
                        : 'bg-slate-50 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <span className={`font-bold text-sm ${band.textColor} block`}>
                      第{ringNum === 1 ? '一' : ringNum === 2 ? '二' : ringNum === 3 ? '三' : '四'}环：{band.name}
                    </span>
                    <span className="text-slate-600 text-xs">{roleText}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick decode reference card */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 flex items-start gap-2.5">
              <span className="font-bold shrink-0">色标基准口诀：</span>
              <p className="leading-relaxed">
                黑0 棕1 红2 橙3 黄4 绿5 蓝6 紫7 灰8 白9；倍率：黑×10⁰，棕×10¹，红×10²；末环公差：金±5%，银±10%。
              </p>
            </div>
          </div>

          {/* Right 5 Cols: Inspection Calculation Worksheet */}
          <div className="lg:col-span-5 flex flex-col gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-800 uppercase tracking-wide">
                实训工单 · 阻值解码与公差预测记录卡
              </span>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                当前样品：{activeResistor.bands.map((b) => b.name).join('·')}
              </span>
            </div>

            <div className="flex flex-col gap-3.5 text-sm">
              <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700">1. 解码标称阻值：</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="请输入标称值"
                    value={nominalInput}
                    onChange={(e) => setNominalInput(e.target.value)}
                    className="flex-1 p-2.5 bg-white border border-slate-300 rounded text-slate-900 font-bold text-base"
                  />
                  <span className="font-bold text-slate-700 text-base">Ω</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">2. 判定第 4 环允许公差：</span>
                  <span className="text-xs text-slate-500">（根据末环颜色自主判断）</span>
                </div>
                <select
                  value={toleranceInput}
                  onChange={(e) => setToleranceInput(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-900 font-bold text-sm cursor-pointer"
                >
                  <option value="">-- 请观察第4环颜色自主选择允许误差 --</option>
                  <option value="5">±5%（金色环 · 汽车电子常用）</option>
                  <option value="10">±10%（银色环 · 普通等级）</option>
                  <option value="1">±1%（棕色环 · 精密等级）</option>
                  <option value="2">±2%（红色环 · 高精等级）</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700">3. 推算允许公差合格区间：</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-600 shrink-0">下限：</span>
                  <input
                    type="number"
                    placeholder="下限"
                    value={minBoundInput}
                    onChange={(e) => setMinBoundInput(e.target.value)}
                    className="w-28 p-2 bg-white border border-slate-300 rounded text-center text-slate-900 font-bold text-base"
                  />
                  <span>~ 上限：</span>
                  <input
                    type="number"
                    placeholder="上限"
                    value={maxBoundInput}
                    onChange={(e) => setMaxBoundInput(e.target.value)}
                    className="w-28 p-2 bg-white border border-slate-300 rounded text-center text-slate-900 font-bold text-base"
                  />
                  <span className="font-bold text-slate-700 text-base">Ω</span>
                </div>
              </div>

              <Button
                onClick={handleVerifyCalc}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 cursor-pointer shadow-sm text-sm"
              >
                校验并提交工单
              </Button>

              {/* Feedback Banner */}
              {calcFeedback && (
                <div
                  className={`p-3 rounded-lg border flex items-start gap-2 ${
                    calcFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-red-50 border-red-300 text-red-900'
                  }`}
                >
                  {calcFeedback.type === 'success' ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <p className="leading-relaxed font-semibold">{calcFeedback.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Sample Measurement Workbench with DMM & V05 Lockout */}
      {currentStep === 'SAMPLE_MEASUREMENT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 7 Cols: Resistor Test Fixture & Safety Switch */}
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">待检电阻样品夹持工位</span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  基准：{activeResistor.nominal}Ω (合格区间: {activeResistor.expectedMin}~{activeResistor.expectedMax}Ω)
                </span>
              </div>

              {/* V05 Live Circuit Toggle */}
              <button
                type="button"
                onClick={handleTogglePower}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  isPowerAppliedToSample
                    ? 'bg-red-600 text-white ring-2 ring-red-400'
                    : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                }`}
              >
                <ShieldAlert size={15} />
                <span>{isPowerAppliedToSample ? '12V 带电回路闭合 (危险状态)' : '已彻底断电隔离 (规范安全)'}</span>
              </button>
            </div>

            {/* Three Sample Slots */}
            <div className="grid grid-cols-3 gap-3">
              {(['A', 'B', 'C'] as const).map((id) => {
                const sample = activeSamples[id];
                const isSelected = selectedSample === id;
                const evaluated = sampleEvaluations[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSelectedSample(id);
                      sounds.click();
                    }}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-2 text-left ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/60 shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">
                        {practiceMode === 'independent' ? `样品 ${id} (盲测)` : sample.name.split(' ')[0] + ' ' + sample.name.split(' ')[1]}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                          表笔已夹接
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {practiceMode === 'independent' ? '外壳标注已遮蔽，需实测' : sample.name}
                    </span>

                    {/* Result Badge */}
                    {evaluated && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded mt-auto text-center ${
                          evaluated === 'QUALIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : evaluated === 'UNQUALIFIED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {evaluated === 'QUALIFIED' && '合格品'}
                        {evaluated === 'UNQUALIFIED' && '超差不合格'}
                        {evaluated === 'BROKEN' && '断路损坏件'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Classification Actions */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-3">
              <span className="text-sm font-bold text-slate-700">
                当前夹接：{activeSamples[selectedSample].name} · 根据仪表读数判定分类：
              </span>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClassifySample(selectedSample, 'QUALIFIED')}
                  className="text-sm font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer py-2.5"
                >
                  判定为：合格品
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClassifySample(selectedSample, 'UNQUALIFIED')}
                  className="text-sm font-bold text-amber-700 border-amber-300 hover:bg-amber-50 cursor-pointer py-2.5"
                >
                  判定为：超差不合格
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClassifySample(selectedSample, 'BROKEN')}
                  className="text-sm font-bold text-red-700 border-red-300 hover:bg-red-50 cursor-pointer py-2.5"
                >
                  判定为：断路件
                </Button>
              </div>
            </div>

            {/* Feedback / Interception banner */}
            {step2Feedback && (
              <div
                className={`p-3.5 rounded-lg border text-sm flex items-start gap-2.5 ${
                  step2Feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                {step2Feedback.type === 'success' ? (
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                )}
                <p className="font-semibold leading-relaxed">{step2Feedback.message}</p>
              </div>
            )}

            {/* V05 Alarm Banner */}
            {dmmResult.status === 'REFUSED_LIVE_CIRCUIT' && (
              <div className="p-4 bg-red-100 border-2 border-red-400 rounded-xl text-sm text-red-900 flex items-start gap-3 animate-bounce">
                <AlertTriangle size={22} className="text-red-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sm font-bold">安全防护拦截 (基准 V05 · 严禁带电测阻！)</strong>
                  <p className="mt-1 leading-relaxed text-red-800">
                    检测到带电网络！万用表欧姆挡内部有测量电池，若接触外部供电会导致瞬间过流烧表。系统已强制拒绝测量并锁定保护！请先断开电源！
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right 5 Cols: Bench Digital Multimeter (Active Tool, Default OFF) */}
          <div className="lg:col-span-5 flex flex-col gap-3.5 p-5 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Gauge size={18} />
                车规级数字万用表
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                COM / VΩ 表笔插口已连接
              </span>
            </div>

            {/* LCD Screen: Expanded to h-32 with text-4xl/5xl */}
            {dial === 'OFF' ? (
              <div className="flex flex-col justify-between h-32 p-3.5 bg-slate-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-slate-500">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>DMM-6000 AUTO</span>
                  <span>POWER OFF</span>
                </div>
                <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-slate-700">
                  ----
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>已关机 (请选电阻挡开机)</span>
                  <span>STANDBY</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-between h-32 p-3.5 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
                <div className="flex items-center justify-between text-xs opacity-80">
                  <span>DMM-6000 AUTO</span>
                  <span>{dmmResult.status === 'REFUSED_LIVE_CIRCUIT' ? 'LIVE REFUSED' : 'RESISTANCE'}</span>
                </div>
                <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                  {dmmResult.displayText || 'O.L'}
                </div>
                <div className="flex items-center justify-between text-xs opacity-80">
                  <span>{dmmResult.status}</span>
                  <span>{dmmResult.unit}</span>
                </div>
              </div>
            )}

            {/* Dial Gear Selection */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-300">仪表挡位选择（初始默认关机）：</span>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {(['OFF', 'DC_V', 'RESISTANCE', 'DC_A', 'CONTINUITY'] as MultimeterDialMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setDial(mode);
                      sounds.click();
                    }}
                    className={`py-2 rounded font-bold transition-all cursor-pointer ${
                      dial === mode
                        ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {mode === 'RESISTANCE' && '电阻 (Ω)'}
                    {mode === 'DC_V' && '直流电压 (V)'}
                    {mode === 'DC_A' && '直流电流 (A)'}
                    {mode === 'CONTINUITY' && '蜂鸣 (🔔)'}
                    {mode === 'OFF' && '关机 (OFF)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto p-3 bg-slate-800/80 rounded-lg text-xs text-slate-300 leading-relaxed border border-slate-700">
              提示：若万用表在关机状态，屏幕显示 “----” 且无法测阻。请先点击【电阻 (Ω)】旋钮开机读数。
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Potentiometer Test (Interactive Knob + Dial) */}
      {currentStep === 'POTENTIOMETER_TEST' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 7 Cols: Rotary Potentiometer Visual Component */}
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-slate-700">
              10kΩ 旋转电位器三引脚阻值规律测试
            </span>

            {/* 3D-styled Potentiometer Graphic */}
            <div className="w-full h-52 bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl flex flex-col items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 340 120" className="w-72 drop-shadow-md">
                {/* Circular Body */}
                <circle cx="170" cy="55" r="46" fill="#1e293b" stroke="#e2e8f0" strokeWidth="3" />
                <circle cx="170" cy="55" r="36" fill="#0f172a" />

                {/* Knob Rotary Pointer */}
                <line
                  x1="170"
                  y1="55"
                  x2={170 + 32 * Math.cos((potKnobRatio * 240 - 120) * (Math.PI / 180))}
                  y2={55 + 32 * Math.sin((potKnobRatio * 240 - 120) * (Math.PI / 180))}
                  stroke="#f59e0b"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                />
                <circle cx="170" cy="55" r="9" fill="#f59e0b" />

                {/* Three Terminals */}
                <circle cx="95" cy="100" r="8" fill={potProbePair === '1-3' || potProbePair === '1-2' ? '#ef4444' : '#64748b'} />
                <text x="95" y="113" fill="#cbd5e1" fontSize="11" textAnchor="middle" fontWeight="bold">1(固定A)</text>

                <circle cx="170" cy="100" r="8" fill={potProbePair === '1-2' || potProbePair === '2-3' ? '#f59e0b' : '#64748b'} />
                <text x="170" y="113" fill="#fde68a" fontSize="11" textAnchor="middle" fontWeight="bold">2(动片W)</text>

                <circle cx="245" cy="100" r="8" fill={potProbePair === '1-3' || potProbePair === '2-3' ? '#3b82f6' : '#64748b'} />
                <text x="245" y="113" fill="#cbd5e1" fontSize="11" textAnchor="middle" fontWeight="bold">3(固定B)</text>
              </svg>

              <span className="text-sm text-amber-300 font-mono mt-1 font-bold">
                当前旋钮转角：{(potKnobRatio * 100).toFixed(0)}%
              </span>
            </div>

            {/* Interactive Rotary Control */}
            <div className="flex flex-col gap-2 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span className="flex items-center gap-2">
                  <Sliders size={16} className="text-amber-600" />
                  拖动调节电位器转角：
                </span>
                <span className="text-amber-700 font-mono font-black text-base">{(potKnobRatio * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={potKnobRatio}
                onChange={(e) => setPotKnobRatio(parseFloat(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer h-2.5"
              />
            </div>

            {/* Probe Target Selector */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-sm flex-wrap gap-2">
              <span className="font-bold text-slate-700">万用表表笔夹接：</span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPotProbePair('1-3');
                    sounds.click();
                  }}
                  className={`px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    potProbePair === '1-3' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700'
                  }`}
                >
                  测 1-3 固定端总阻
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPotProbePair('1-2');
                    sounds.click();
                  }}
                  className={`px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    potProbePair === '1-2' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700'
                  }`}
                >
                  测 1-2 端 (A-动片)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPotProbePair('2-3');
                    sounds.click();
                  }}
                  className={`px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    potProbePair === '2-3' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700'
                  }`}
                >
                  测 2-3 端 (动片-B)
                </button>
              </div>
            </div>

            {/* Record Action */}
            <div className="flex items-center justify-between pt-1">
              <Button size="sm" onClick={handleRecordPotPoint} className="cursor-pointer bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 text-sm">
                记录当前测点数据 ({potRecordedPoints.size}/4)
              </Button>
              <span className="text-xs text-slate-500 font-medium">
                已记录测点：{Array.from(potRecordedPoints).join(', ') || '暂无'}
              </span>
            </div>
          </div>

          {/* Right 5 Cols: Bench DMM */}
          <div className="lg:col-span-5 flex flex-col gap-4 p-5 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Gauge size={18} />
                数字万用表 · 电阻测量
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-900 text-emerald-300 border border-emerald-700">
                端子已导通
              </span>
            </div>

            <div className="flex flex-col justify-between h-32 p-3.5 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>DMM-6000 AUTO</span>
                <span>{potProbePair} 端测阻</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {dmmResult.displayText}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>NORMAL</span>
                <span>{dmmResult.unit}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">电位器核心物理规律：</strong>
              <p>1. 固定端 1-3 总阻值恒等于标称阻值 10kΩ，与旋钮角度无关。</p>
              <p>2. 动片 1-2 与 2-3 阻值互补变化，无论旋钮在何处，R(1-2) + R(2-3) 恒等于 10kΩ！</p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Independent Evaluation 1kΩ Blind Check (Zero spoiler!) */}
      {currentStep === 'INDEPENDENT_EVAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
          {/* Left 7 Cols: Task Order & Question without spoilers */}
          <div className="lg:col-span-7 flex flex-col gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-800">
              实训工单 · 汽车进气压力传感器偏置电阻盲检考核
            </span>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm leading-relaxed text-slate-700">
              <p className="font-bold mb-1.5 text-slate-900">实车故障情境与规格要求：</p>
              <p>
                汽车进气压力传感器电路常备标称 <strong>1kΩ ± 5%</strong> 规格的偏置电阻。仓库领出待检件，万用表实测为 <strong>0.985 kΩ (即 985.0 Ω)</strong>。
                请结合允许公差范围，独立分析该电阻是否合格并提交判定：
              </p>
            </div>

            {/* Zero Spoiler Multiple Choice Options */}
            <div className="flex flex-col gap-3 text-sm">
              {[
                {
                  id: '985_QUALIFIED',
                  label: 'A. 合格品：标称 1kΩ=1000Ω，±5% 允许范围为 950Ω ~ 1050Ω，实测 985Ω 落在合格公差带内',
                },
                {
                  id: '985_OUT',
                  label: 'B. 超差品：实测 985Ω 小于标称阻值 1000Ω，属于阻值偏低不合格',
                },
                {
                  id: '985_BROKEN',
                  label: 'C. 损坏件：阻值带有小数且偏离整数，属于内部击穿断路件',
                },
              ].map((opt) => {
                const isSelected = independentChoice === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 text-slate-900 ring-2 ring-amber-300'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="independent_opt"
                      checked={isSelected}
                      onChange={() => {
                        setIndependentChoice(opt.id);
                        sounds.click();
                      }}
                      className="mt-1 accent-amber-600"
                    />
                    <span className="font-medium leading-relaxed">{opt.label}</span>
                  </label>
                );
              })}
            </div>

            <Button
              onClick={handleIndependentSubmit}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 cursor-pointer shadow-sm text-sm"
            >
              提交判定并核验工单
            </Button>

            {independentFeedback && (
              <div
                className={`p-3.5 rounded-lg border text-sm flex items-start gap-2.5 ${
                  independentFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}
              >
                {independentFeedback.type === 'success' ? (
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                )}
                <p className="font-semibold leading-relaxed">{independentFeedback.message}</p>
              </div>
            )}
          </div>

          {/* Right 5 Cols: Bench DMM Ammeter */}
          <div className="lg:col-span-5 flex flex-col gap-4 p-5 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Gauge size={18} />
                万用表实测读数
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                1kΩ 待测电阻样品
              </span>
            </div>

            <div className="flex flex-col justify-between h-32 p-3.5 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>DMM-6000 AUTO</span>
                <span>RESISTANCE STABLE</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                985.0
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>NORMAL</span>
                <span>Ω</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">盲检要求：</strong>
              根据标称值 1kΩ (1000Ω) 与允许误差 ±5%，先自主计算允许公差的上下限。若万用表读数在上下限闭区间内，即为合格良品。
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Transfer NTC Coolant Temp Sensor (Zero spoiler!) */}
      {currentStep === 'TRANSFER_NTC' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
          {/* Left 7 Cols: Coolant Passage & Temp Slider */}
          <div className="lg:col-span-7 flex flex-col gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Thermometer size={18} className="text-blue-600" />
                实车发动机冷却液水道 · 水温传感器 (NTC)
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">ECT_SENSOR_NTC</span>
            </div>

            <div className="w-full h-44 bg-slate-900 rounded-xl flex items-center justify-around p-4 relative border border-slate-800">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold transition-all ${
                    coolantTemp < 40 ? 'bg-blue-600 shadow-blue-500/30' : coolantTemp < 70 ? 'bg-amber-600 shadow-amber-500/30' : 'bg-red-600 shadow-red-500/30'
                  }`}
                >
                  <Thermometer size={34} />
                </div>
                <span className="text-sm font-bold text-slate-300">当前冷却液水温：{coolantTemp} ℃</span>
              </div>

              <div className="flex flex-col gap-1.5 text-xs text-slate-300">
                <p>工况阶段：{coolantTemp <= 30 ? '冷车静置状态' : coolantTemp <= 60 ? '发动机暖机阶段' : '正常热车工作水温'}</p>
                <p>元件属性：负温度系数 (NTC 热敏电阻)</p>
                <p className="text-amber-400 font-bold">物理特性：温度升高，阻值反向降低</p>
              </div>
            </div>

            {/* Temperature slider */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span>模拟发动机冷却液温度调节：</span>
                <span className="font-mono text-blue-700 text-base font-black">{coolantTemp} ℃</span>
              </div>
              <input
                type="range"
                min="20"
                max="85"
                step="5"
                value={coolantTemp}
                onChange={(e) => setCoolantTemp(parseInt(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2.5"
              />
            </div>

            {/* Diagnostic Question (Zero Spoiler!) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-3 text-sm">
              <span className="font-bold text-slate-800">
                维修决策判定：观察右侧万用表实测阻值（20℃约2.5kΩ → 80℃约300Ω），该水温传感器性能是否正常？
              </span>
              <div className="flex flex-col gap-2.5">
                {[
                  {
                    id: 'NTC_NORMAL',
                    label: 'A. 性能良好：呈现典型负温度系数 (NTC) 特性，热态阻值降低平稳，传感器工作正常',
                  },
                  {
                    id: 'NTC_FAIL',
                    label: 'B. 存在故障：热车时阻值大幅变小属于阻值衰减失效，应更换新水温传感器',
                  },
                ].map((opt) => {
                  const isSelected = ntcChoice === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 text-slate-900 ring-2 ring-blue-300'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="ntc_diag_opt"
                        checked={isSelected}
                        onChange={() => {
                          setNtcChoice(opt.id);
                          sounds.click();
                        }}
                        className="mt-1 accent-blue-600"
                      />
                      <span className="font-medium leading-relaxed">{opt.label}</span>
                    </label>
                  );
                })}
              </div>

              <Button
                onClick={handleNtcSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 cursor-pointer shadow-sm text-sm mt-1"
              >
                提交实车维修诊断结论
              </Button>

              {ntcFeedback && (
                <div
                  className={`p-3.5 rounded-lg border text-sm flex items-start gap-2.5 ${
                    ntcFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-red-50 border-red-300 text-red-900'
                  }`}
                >
                  {ntcFeedback.type === 'success' ? (
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <p className="font-semibold leading-relaxed">{ntcFeedback.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right 5 Cols: Bench DMM */}
          <div className="lg:col-span-5 flex flex-col gap-4 p-5 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Gauge size={18} />
                万用表实时阻值
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-800">
                ECT 传感器端子
              </span>
            </div>

            <div className="flex flex-col justify-between h-32 p-3.5 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>NTC THERMISTOR</span>
                <span>{coolantTemp} ℃</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {dmmResult.displayText}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>NORMAL</span>
                <span>{dmmResult.unit}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">实车水温传感器技术基准：</strong>
              冷态 (20℃) 约 2~3kΩ，热车 (80~90℃) 降至 200~400Ω。若温度升高阻值不变或开路，将导致发动机冷启动困难、动力下降或电子风扇常转。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
