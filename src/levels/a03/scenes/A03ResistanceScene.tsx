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
import { A03Step } from '../a03Training';

interface A03ResistanceSceneProps {
  currentStep: A03Step;
  practiceMode?: PracticeMode;
  onStepComplete: (step: A03Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

export interface ColorBandInfo {
  name: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  value: number;
}

export interface StandardResistor {
  id: string;
  name: string;
  bands: [ColorBandInfo, ColorBandInfo, ColorBandInfo, ColorBandInfo];
  nominal: number;
  tolerance: number; // 5 or 10
  expectedMin: number;
  expectedMax: number;
  sampleAValue: number;
  sampleBValue: number;
}

export const STANDARD_RESISTOR_POOL: readonly StandardResistor[] = [
  {
    id: 'RES_220_G',
    name: '红·红·棕·金 (标称 220Ω ±5%)',
    bands: [
      { name: '红', color: '#dc2626', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', value: 2 },
      { name: '红', color: '#dc2626', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', value: 2 },
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '金', color: '#eab308', textColor: 'text-amber-800', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', value: 5 },
    ],
    nominal: 220,
    tolerance: 5,
    expectedMin: 209,
    expectedMax: 231,
    sampleAValue: 224.0,
    sampleBValue: 330.0,
  },
  {
    id: 'RES_330_S',
    name: '橙·橙·棕·银 (标称 330Ω ±10%)',
    bands: [
      { name: '橙', color: '#ea580c', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', value: 3 },
      { name: '橙', color: '#ea580c', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', value: 3 },
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '银', color: '#94a3b8', textColor: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 10 },
    ],
    nominal: 330,
    tolerance: 10,
    expectedMin: 297,
    expectedMax: 363,
    sampleAValue: 338.0,
    sampleBValue: 490.0,
  },
  {
    id: 'RES_100_G',
    name: '棕·黑·棕·金 (标称 100Ω ±5%)',
    bands: [
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '黑', color: '#0f172a', textColor: 'text-slate-800', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 0 },
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '金', color: '#eab308', textColor: 'text-amber-800', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', value: 5 },
    ],
    nominal: 100,
    tolerance: 5,
    expectedMin: 95,
    expectedMax: 105,
    sampleAValue: 99.0,
    sampleBValue: 155.0,
  },
  {
    id: 'RES_470_S',
    name: '黄·紫·棕·银 (标称 470Ω ±10%)',
    bands: [
      { name: '黄', color: '#ca8a04', textColor: 'text-yellow-800', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300', value: 4 },
      { name: '紫', color: '#7c3aed', textColor: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-300', value: 7 },
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '银', color: '#94a3b8', textColor: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 10 },
    ],
    nominal: 470,
    tolerance: 10,
    expectedMin: 423,
    expectedMax: 517,
    sampleAValue: 480.0,
    sampleBValue: 680.0,
  },
  {
    id: 'RES_1000_G',
    name: '棕·黑·红·金 (标称 1000Ω ±5%)',
    bands: [
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '黑', color: '#0f172a', textColor: 'text-slate-800', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 0 },
      { name: '红', color: '#dc2626', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', value: 2 },
      { name: '金', color: '#eab308', textColor: 'text-amber-800', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', value: 5 },
    ],
    nominal: 1000,
    tolerance: 5,
    expectedMin: 950,
    expectedMax: 1050,
    sampleAValue: 1015.0,
    sampleBValue: 1450.0,
  },
  {
    id: 'RES_680_G',
    name: '蓝·灰·棕·金 (标称 680Ω ±5%)',
    bands: [
      { name: '蓝', color: '#2563eb', textColor: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', value: 6 },
      { name: '灰', color: '#64748b', textColor: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 8 },
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '金', color: '#eab308', textColor: 'text-amber-800', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', value: 5 },
    ],
    nominal: 680,
    tolerance: 5,
    expectedMin: 646,
    expectedMax: 714,
    sampleAValue: 688.0,
    sampleBValue: 950.0,
  },
  {
    id: 'RES_240_G',
    name: '红·黄·棕·金 (标称 240Ω ±5%)',
    bands: [
      { name: '红', color: '#dc2626', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', value: 2 },
      { name: '黄', color: '#ca8a04', textColor: 'text-yellow-800', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300', value: 4 },
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '金', color: '#eab308', textColor: 'text-amber-800', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', value: 5 },
    ],
    nominal: 240,
    tolerance: 5,
    expectedMin: 228,
    expectedMax: 252,
    sampleAValue: 243.0,
    sampleBValue: 360.0,
  },
  {
    id: 'RES_1000_S',
    name: '棕·黑·红·银 (标称 1000Ω ±10%)',
    bands: [
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '黑', color: '#0f172a', textColor: 'text-slate-800', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 0 },
      { name: '红', color: '#dc2626', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', value: 2 },
      { name: '银', color: '#94a3b8', textColor: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 10 },
    ],
    nominal: 1000,
    tolerance: 10,
    expectedMin: 900,
    expectedMax: 1100,
    sampleAValue: 1040.0,
    sampleBValue: 1550.0,
  },
];

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

  // Step 2: DMM states & sample measurement
  const [dial, setDial] = useState<MultimeterDialMode>('RESISTANCE');
  const [selectedSample, setSelectedSample] = useState<'A' | 'B' | 'C'>('A');
  const [isPowerAppliedToSample, setIsPowerAppliedToSample] = useState(false);
  const [sampleEvaluations, setSampleEvaluations] = useState<Record<string, string>>({});
  const [v05Triggered, setV05Triggered] = useState(false);

  // Step 3: Potentiometer testing
  const [potKnobRatio, setPotKnobRatio] = useState<number>(0.5);
  const [potProbePair, setPotProbePair] = useState<'1-3' | '1-2' | '2-3'>('1-3');
  const [potRecordedPoints, setPotRecordedPoints] = useState<Set<string>>(new Set());

  // Step 4 / Transfer: NTC Coolant Temperature Sensor
  const [coolantTemp, setCoolantTemp] = useState<number>(20); // 20°C to 80°C
  const [transferDecision, setTransferDecision] = useState<string | null>(null);

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

    if (currentStep === 'TRANSFER_SORTING') {
      if (practiceMode === 'transfer') {
        // NTC sensor resistance: R(T) = 2500 * exp(-0.035 * (T - 20))
        const ntcR = Math.round(2500 * Math.exp(-0.035 * (coolantTemp - 20)));
        return dmm.measure({
          isCircuitPowered: false,
          isolatedResistance: ntcR,
        });
      } else {
        return dmm.measure({
          isCircuitPowered: false,
          isolatedResistance: 985.0,
        });
      }
    }

    return dmm.measure({});
  }, [dial, currentStep, selectedSample, activeSamples, isPowerAppliedToSample, potProbePair, potKnobRatio, coolantTemp, practiceMode]);

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

  // Step 2: Record sample classification
  const handleClassifySample = (sampleId: 'A' | 'B' | 'C', classification: string) => {
    sounds.click();
    const newEvals = { ...sampleEvaluations, [sampleId]: classification };
    setSampleEvaluations(newEvals);

    if (newEvals.A === 'QUALIFIED' && newEvals.B === 'UNQUALIFIED' && newEvals.C === 'BROKEN') {
      sounds.success();
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

  // Step 4: Transfer decision submit
  const handleTransferDecision = (key: string) => {
    sounds.click();
    setTransferDecision(key);
    if (key === 'NTC_NORMAL' || key === '985_QUALIFIED') {
      sounds.success();
      onStepComplete('TRANSFER_SORTING', {
        mode: practiceMode,
        decision: key,
        passed: true,
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
    (currentStep === 'TRANSFER_SORTING' &&
      (transferDecision === 'NTC_NORMAL' || transferDecision === '985_QUALIFIED'));

  return (
    <div className="w-full flex flex-col gap-4 text-slate-800">
      {/* Station Top Step Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isStepAdvanceReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-xs font-black text-slate-800 tracking-wider">
              {currentStep === 'COLOR_CODE_CALC' && '阶段 1 / 4 · 色环识别与合格区间推算'}
              {currentStep === 'SAMPLE_MEASUREMENT' && '阶段 2 / 4 · 断电测阻与带电拒测防呆 (V05)'}
              {currentStep === 'POTENTIOMETER_TEST' && '阶段 3 / 4 · 调光电位器特性与阻值互补验证'}
              {currentStep === 'TRANSFER_SORTING' &&
                (practiceMode === 'transfer'
                  ? '阶段 4 / 4 · 实车水温传感器 NTC 温度特性排查'
                  : '阶段 4 / 4 · 复杂工况电阻盲检与单位换算')}
            </span>
          </div>

          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            {practiceMode === 'guided'
              ? '跟练模式 · 步骤引导'
              : practiceMode === 'independent'
              ? '独立模式 · 自主盲检'
              : '迁移模式 · 实车排故'}
          </span>
        </div>

        {isStepAdvanceReady && (
          <Button
            size="sm"
            onClick={onAdvanceStep}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 px-4 shadow-sm cursor-pointer"
          >
            <span>{currentStep === 'TRANSFER_SORTING' ? '查看通关报告' : '进入下一步'}</span>
            <ArrowRight size={16} />
          </Button>
        )}
      </div>

      {/* STEP 1: Color Band Reading & Calculation (Zero spoiler, interactive magnifier, random switch) */}
      {currentStep === 'COLOR_CODE_CALC' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 7 Cols: Optical Resistor Viewer */}
          <div className="lg:col-span-7 flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles size={15} className="text-amber-500" />
                  四色环电阻光学放大检测台
                </span>
                <span className="text-[11px] text-slate-400">点击色环可高亮对应环位</span>
              </div>
              <button
                type="button"
                onClick={handleRandomizeResistor}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-all cursor-pointer shadow-xs"
                title="随机更换另一颗色环电阻进行识别练习"
              >
                <Shuffle size={13} />
                <span>随机切换电阻</span>
              </button>
            </div>

            {/* Realistic Resistor SVG Viewer */}
            <div className="w-full h-44 bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <div className="absolute top-2 left-3 text-[10px] text-slate-400 font-mono">
                OPTICAL_ZOOM: 15X · {activeResistor.name}
              </div>

              <svg viewBox="0 0 420 100" className="w-full max-w-sm drop-shadow-lg">
                {/* Leads */}
                <line x1="20" y1="50" x2="100" y2="50" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
                <line x1="320" y1="50" x2="400" y2="50" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />

                {/* Resistor body */}
                <rect x="100" y="20" width="220" height="60" rx="14" fill="#cbd5e1" stroke="#64748b" strokeWidth="3" />
                <rect x="108" y="16" width="30" height="68" rx="8" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
                <rect x="282" y="16" width="30" height="68" rx="8" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />

                {/* Color Band 1 */}
                <g onClick={() => setActiveBandIndex(1)} className="cursor-pointer">
                  <rect x="135" y="16" width="18" height="68" fill={activeResistor.bands[0].color} rx="2" />
                  {activeBandIndex === 1 && <rect x="132" y="13" width="24" height="74" fill="none" stroke="#fef08a" strokeWidth="3" rx="4" />}
                </g>

                {/* Color Band 2 */}
                <g onClick={() => setActiveBandIndex(2)} className="cursor-pointer">
                  <rect x="175" y="20" width="18" height="60" fill={activeResistor.bands[1].color} rx="2" />
                  {activeBandIndex === 2 && <rect x="172" y="17" width="24" height="66" fill="none" stroke="#fef08a" strokeWidth="3" rx="4" />}
                </g>

                {/* Color Band 3 */}
                <g onClick={() => setActiveBandIndex(3)} className="cursor-pointer">
                  <rect x="215" y="20" width="18" height="60" fill={activeResistor.bands[2].color} rx="2" />
                  {activeBandIndex === 3 && <rect x="212" y="17" width="24" height="66" fill="none" stroke="#fef08a" strokeWidth="3" rx="4" />}
                </g>

                {/* Color Band 4 */}
                <g onClick={() => setActiveBandIndex(4)} className="cursor-pointer">
                  <rect x="275" y="16" width="18" height="68" fill={activeResistor.bands[3].color} rx="2" />
                  {activeBandIndex === 4 && <rect x="272" y="13" width="24" height="74" fill="none" stroke="#fef08a" strokeWidth="3" rx="4" />}
                </g>
              </svg>
            </div>

            {/* Interactive Color Guide Strip */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
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
                    className={`p-2 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? `${band.bgColor} ${band.borderColor} ring-2 ring-amber-300`
                        : 'bg-slate-50 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <span className={`font-bold ${band.textColor} block`}>
                      第{ringNum === 1 ? '一' : ringNum === 2 ? '二' : ringNum === 3 ? '三' : '四'}环：{band.name}
                    </span>
                    <span className="text-slate-600 text-[11px]">{roleText}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick decode reference card */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <span className="font-bold shrink-0">色标基准：</span>
              <p className="leading-relaxed">
                色环口诀：黑0 棕1 红2 橙3 黄4 绿5 蓝6 紫7 灰8 白9；倍率：黑×10⁰，棕×10¹，红×10²；误差：金±5%，银±10%。
              </p>
            </div>
          </div>

          {/* Right 5 Cols: Inspection Calculation Worksheet */}
          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                实训工单 · 阻值解码与公差预测记录卡
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                当前样品：{activeResistor.bands.map((b) => b.name).join('·')}
              </span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700">1. 解码标称阻值：</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="请输入计算得到的标称值"
                    value={nominalInput}
                    onChange={(e) => setNominalInput(e.target.value)}
                    className="flex-1 p-2 bg-white border border-slate-300 rounded text-slate-900 font-bold"
                  />
                  <span className="font-bold text-slate-700">Ω</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">2. 判定第 4 环允许公差：</span>
                  <span className="text-[11px] text-slate-500">（观察末环颜色自主判断）</span>
                </div>
                <select
                  value={toleranceInput}
                  onChange={(e) => setToleranceInput(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded text-slate-900 font-bold cursor-pointer"
                >
                  <option value="">-- 请观察第4环颜色自主选择允许误差 --</option>
                  <option value="5">±5%（金色环 · 汽车电子常用）</option>
                  <option value="10">±10%（银色环 · 普通等级）</option>
                  <option value="1">±1%（棕色环 · 精密等级）</option>
                  <option value="2">±2%（红色环 · 高精等级）</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700">3. 推算允许公差合格区间：</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 shrink-0">下限：</span>
                  <input
                    type="number"
                    placeholder="请输入下限"
                    value={minBoundInput}
                    onChange={(e) => setMinBoundInput(e.target.value)}
                    className="w-24 p-2 bg-white border border-slate-300 rounded text-center text-slate-900 font-bold"
                  />
                  <span>~ 上限：</span>
                  <input
                    type="number"
                    placeholder="请输入上限"
                    value={maxBoundInput}
                    onChange={(e) => setMaxBoundInput(e.target.value)}
                    className="w-24 p-2 bg-white border border-slate-300 rounded text-center text-slate-900 font-bold"
                  />
                  <span className="font-bold text-slate-700">Ω</span>
                </div>
              </div>

              <Button
                onClick={handleVerifyCalc}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 cursor-pointer shadow-sm"
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
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-2.5">
              <span className="text-xs font-bold text-slate-700">
                当前夹接：{activeSamples[selectedSample].name} · 根据测量示数出具判定：
              </span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClassifySample(selectedSample, 'QUALIFIED')}
                  className="text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                >
                  判定为：合格品
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClassifySample(selectedSample, 'UNQUALIFIED')}
                  className="text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50 cursor-pointer"
                >
                  判定为：超差不合格
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClassifySample(selectedSample, 'BROKEN')}
                  className="text-xs font-bold text-red-700 border-red-300 hover:bg-red-50 cursor-pointer"
                >
                  判定为：断路件
                </Button>
              </div>
            </div>

            {/* V05 Alarm Banner */}
            {dmmResult.status === 'REFUSED_LIVE_CIRCUIT' && (
              <div className="p-3 bg-red-100 border-2 border-red-400 rounded-xl text-xs text-red-900 flex items-start gap-2.5 animate-bounce">
                <AlertTriangle size={20} className="text-red-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sm">安全防护拦截 (基准 V05 · 带电测阻严禁！)</strong>
                  <p className="mt-1 leading-relaxed text-red-800">
                    检测到带电网络！万用表欧姆挡内部有测量电池，若接触外部供电会导致瞬间过流烧表。系统已强制拒绝测量并锁定保护！请先断开电源！
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right 5 Cols: Bench Digital Multimeter (Active Tool) */}
          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Gauge size={16} />
                车规级数字万用表
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                COM / VΩ 已接入
              </span>
            </div>

            {/* LCD Screen */}
            <div className="flex flex-col justify-between h-24 p-3 bg-emerald-950 border-4 border-slate-800 rounded-lg shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-75">
                <span>AUTO RANGE</span>
                <span>{dmmResult.status === 'REFUSED_LIVE_CIRCUIT' ? 'LIVE REFUSED' : 'RESISTANCE'}</span>
              </div>
              <div className="text-3xl font-black text-right tracking-widest text-emerald-300">
                {dmmResult.displayText || 'O.L'}
              </div>
              <div className="flex items-center justify-between text-[11px] opacity-75">
                <span>{dmmResult.status}</span>
                <span>{dmmResult.unit}</span>
              </div>
            </div>

            {/* Dial Gear */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-slate-300">仪表挡位选择：</span>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['OFF', 'DC_V', 'RESISTANCE', 'DC_A', 'CONTINUITY'] as MultimeterDialMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setDial(mode);
                      sounds.click();
                    }}
                    className={`py-1.5 rounded font-bold transition-all cursor-pointer ${
                      dial === mode
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {mode === 'RESISTANCE' && '电阻 (Ω)'}
                    {mode === 'DC_V' && '直流电压 (V)'}
                    {mode === 'DC_A' && '直流电流 (A)'}
                    {mode === 'CONTINUITY' && '蜂鸣 (🔔)'}
                    {mode === 'OFF' && '关机'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto p-2.5 bg-slate-800/80 rounded-lg text-[11px] text-slate-300 leading-relaxed border border-slate-700">
              提示：合格区间为 209Ω ~ 231Ω。样品实测若超出上限为超差件；若显示 O.L 则为内部断路件。
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
            <div className="w-full h-44 bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl flex flex-col items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 320 110" className="w-64 drop-shadow-md">
                {/* Circular Body */}
                <circle cx="160" cy="55" r="42" fill="#1e293b" stroke="#e2e8f0" strokeWidth="2.5" />
                <circle cx="160" cy="55" r="34" fill="#0f172a" />

                {/* Knob Rotary Pointer */}
                <line
                  x1="160"
                  y1="55"
                  x2={160 + 28 * Math.cos((potKnobRatio * 240 - 120) * (Math.PI / 180))}
                  y2={55 + 28 * Math.sin((potKnobRatio * 240 - 120) * (Math.PI / 180))}
                  stroke="#f59e0b"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <circle cx="160" cy="55" r="8" fill="#f59e0b" />

                {/* Three Terminals */}
                <circle cx="90" cy="95" r="7" fill={potProbePair === '1-3' || potProbePair === '1-2' ? '#ef4444' : '#64748b'} />
                <text x="90" y="107" fill="#cbd5e1" fontSize="9" textAnchor="middle">1 (固定A)</text>

                <circle cx="160" cy="95" r="7" fill={potProbePair === '1-2' || potProbePair === '2-3' ? '#f59e0b' : '#64748b'} />
                <text x="160" y="107" fill="#fde68a" fontSize="9" textAnchor="middle">2 (动片W)</text>

                <circle cx="230" cy="95" r="7" fill={potProbePair === '1-3' || potProbePair === '2-3' ? '#3b82f6' : '#64748b'} />
                <text x="230" y="107" fill="#cbd5e1" fontSize="9" textAnchor="middle">3 (固定B)</text>
              </svg>

              <span className="text-xs text-amber-300 font-mono mt-1">
                旋钮转角：{(potKnobRatio * 100).toFixed(0)}%
              </span>
            </div>

            {/* Interactive Rotary Control */}
            <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Sliders size={15} className="text-amber-600" />
                  拖动调节电位器转角：
                </span>
                <span className="text-amber-700 font-mono font-black">{(potKnobRatio * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={potKnobRatio}
                onChange={(e) => setPotKnobRatio(parseFloat(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Probe Target Selector */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">万用表表笔夹接：</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPotProbePair('1-3');
                    sounds.click();
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
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
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
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
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    potProbePair === '2-3' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700'
                  }`}
                >
                  测 2-3 端 (动片-B)
                </button>
              </div>
            </div>

            {/* Record Action */}
            <div className="flex items-center justify-between pt-1">
              <Button size="sm" onClick={handleRecordPotPoint} className="cursor-pointer bg-amber-600 hover:bg-amber-700 text-white font-bold">
                记录当前测点数据 ({potRecordedPoints.size}/4)
              </Button>
              <span className="text-xs text-slate-500">
                已记录测点：{Array.from(potRecordedPoints).join(', ') || '暂无'}
              </span>
            </div>
          </div>

          {/* Right 5 Cols: Bench DMM */}
          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Gauge size={16} />
                数字万用表 · 电阻测量
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 border border-emerald-700">
                端子已导通
              </span>
            </div>

            <div className="flex flex-col justify-between h-24 p-3 bg-emerald-950 border-4 border-slate-800 rounded-lg shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-75">
                <span>AUTO RANGE</span>
                <span>{potProbePair} 端测阻</span>
              </div>
              <div className="text-3xl font-black text-right tracking-widest text-emerald-300">
                {dmmResult.displayText}
              </div>
              <div className="flex items-center justify-between text-[11px] opacity-75">
                <span>NORMAL</span>
                <span>{dmmResult.unit}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-lg text-xs text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1">电位器核心物理规律：</strong>
              <p>1. 固定端 1-3 总阻值恒等于标称阻值 10kΩ，与旋钮角度无关。</p>
              <p>2. 动片 1-2 与 2-3 阻值互补变化，无论旋钮在何处，R(1-2) + R(2-3) 恒等于 10kΩ！</p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Transfer Challenge (NTC Coolant Sensor vs Independent 1kΩ) */}
      {currentStep === 'TRANSFER_SORTING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {practiceMode === 'transfer' ? (
            <>
              {/* Left 7 Cols: Coolant Passage & Temp Slider */}
              <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Thermometer size={16} className="text-blue-600" />
                    实车发动机冷却液水道 · 水温传感器 (NTC)
                  </span>
                  <span className="text-xs text-slate-500 font-mono">ECT_SENSOR_NTC</span>
                </div>

                <div className="w-full h-40 bg-slate-900 rounded-xl flex items-center justify-around p-4 relative border border-slate-800">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold transition-all ${
                        coolantTemp < 40 ? 'bg-blue-600 shadow-blue-500/30' : coolantTemp < 70 ? 'bg-amber-600 shadow-amber-500/30' : 'bg-red-600 shadow-red-500/30'
                      }`}
                    >
                      <Thermometer size={32} />
                    </div>
                    <span className="text-xs font-bold text-slate-300">当前水温：{coolantTemp} ℃</span>
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-slate-300">
                    <p>工况：{coolantTemp <= 30 ? '冷车静置状态' : coolantTemp <= 60 ? '发动机暖机阶段' : '正常热车工作水温'}</p>
                    <p>传感器类型：负温度系数 (NTC 热敏电阻)</p>
                    <p className="text-amber-400">规律：温度上升，阻值反向下降</p>
                  </div>
                </div>

                {/* Temperature slider */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>模拟发动机水温调节：</span>
                    <span className="font-mono text-blue-700">{coolantTemp} ℃</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="85"
                    step="5"
                    value={coolantTemp}
                    onChange={(e) => setCoolantTemp(parseInt(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Diagnostic Question */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-2 text-xs">
                  <span className="font-bold text-slate-800">
                    维修决策：根据实测阻值随温度下降曲线（20℃约2.5kΩ → 80℃约300Ω），该水温传感器是否正常？
                  </span>
                  <div className="flex flex-col gap-2 mt-1">
                    <label className="flex items-center gap-2 p-2 rounded border bg-white cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="ntc_diag"
                        checked={transferDecision === 'NTC_NORMAL'}
                        onChange={() => handleTransferDecision('NTC_NORMAL')}
                      />
                      <span className="font-bold text-emerald-800">
                        A. 性能良好：呈现典型负温度系数 (NTC) 特性，热态阻值降低，传感器正常
                      </span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded border bg-white cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="ntc_diag"
                        checked={transferDecision === 'NTC_FAIL'}
                        onChange={() => handleTransferDecision('NTC_FAIL')}
                      />
                      <span>B. 存在故障：热车时阻值变小属于阻值衰减失效，应更换传感器</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Bench DMM */}
              <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Gauge size={16} />
                    万用表实时阻值
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    ECT 传感器端子
                  </span>
                </div>

                <div className="flex flex-col justify-between h-24 p-3 bg-emerald-950 border-4 border-slate-800 rounded-lg shadow-inner font-mono text-emerald-400">
                  <div className="flex items-center justify-between text-xs opacity-75">
                    <span>NTC THERMISTOR</span>
                    <span>{coolantTemp} ℃</span>
                  </div>
                  <div className="text-3xl font-black text-right tracking-widest text-emerald-300">
                    {dmmResult.displayText}
                  </div>
                  <div className="flex items-center justify-between text-[11px] opacity-75">
                    <span>NORMAL</span>
                    <span>{dmmResult.unit}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-lg text-xs text-slate-300 leading-relaxed border border-slate-700">
                  实车水温传感器技术基准：冷态 (20℃) 约 2~3kΩ，热车 (80~90℃) 降至 200~400Ω。若温度升高阻值不变或开路，将导致发动机冷启动困难或风扇长转。
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Independent Mode: 1kΩ Blind Check */}
              <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <span className="text-xs font-bold text-slate-700">实训工单 · 1kΩ 规格件独立盲检</span>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-700">
                  <p className="font-bold mb-2">任务描述：</p>
                  <p>
                    汽车进气压力传感器内部常备 1kΩ ± 5% 规格偏置电阻。仓库领出待检件，经数字万用表实测为 0.985 kΩ (即 985 Ω)。
                    请问该待检件是否在允许公差范围内？
                  </p>
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  <label className="flex items-center gap-2 p-3 rounded-lg border bg-white cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="trans_indep"
                      checked={transferDecision === '985_QUALIFIED'}
                      onChange={() => handleTransferDecision('985_QUALIFIED')}
                    />
                    <span className="font-bold text-emerald-800">
                      A. 合格品：标称 1kΩ=1000Ω，±5% 允许范围为 950Ω ~ 1050Ω，实测 985Ω 落在合格范围内
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-lg border bg-white cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="trans_indep"
                      checked={transferDecision === '985_OUT'}
                      onChange={() => handleTransferDecision('985_OUT')}
                    />
                    <span>B. 超差品：985Ω 小于标称值 1000Ω，属于欠阻不合格</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-lg border bg-white cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="trans_indep"
                      checked={transferDecision === '985_BROKEN'}
                      onChange={() => handleTransferDecision('985_BROKEN')}
                    />
                    <span>C. 损坏件：阻值不为整数，应直接报废</span>
                  </label>
                </div>
              </div>

              {/* Right 5 Cols: Bench DMM */}
              <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Gauge size={16} />
                  万用表实测读数
                </span>
                <div className="flex flex-col justify-between h-24 p-3 bg-emerald-950 border-4 border-slate-800 rounded-lg shadow-inner font-mono text-emerald-400">
                  <div className="flex items-center justify-between text-xs opacity-75">
                    <span>1kΩ SAMPLE</span>
                    <span>STABLE</span>
                  </div>
                  <div className="text-3xl font-black text-right tracking-widest text-emerald-300">
                    985.0
                  </div>
                  <div className="flex items-center justify-between text-[11px] opacity-75">
                    <span>NORMAL</span>
                    <span>Ω</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
