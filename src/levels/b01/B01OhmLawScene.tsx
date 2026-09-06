'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  HelpCircle,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DCSolver } from '@/src/circuit/solver/DCSolver';
import { calculateOhmsLaw } from '@/src/circuit/solver/DCAnalysisUtils';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { type B01Step } from './b01Training';

export function buildB01OhmLawReadings(
  sourceVoltage: number,
  fixedResistance: number,
  measuredUnknownCurrent: number
) {
  const fixedResistanceRows = [3, 6, 9, 12].map((voltage) => {
    const solver = new DCSolver('0');
    solver.addVoltageSource({ id: 'SOURCE', nodePos: '1', nodeNeg: '0', voltage });
    solver.addResistor({ id: 'R_FIXED', nodeA: '1', nodeB: '0', resistance: fixedResistance });
    const solved = solver.solve();
    return {
      voltage,
      resistance: fixedResistance,
      current: solved.branchCurrents.get('R_FIXED') ?? 0,
    };
  });
  const fixedVoltage = [2, 4, 6, 8].map((resistance) => ({
    ...calculateOhmsLaw({ voltage: sourceVoltage, resistance }),
  }));
  return {
    fixedResistance: fixedResistanceRows,
    fixedVoltage,
    unknownResistance: calculateOhmsLaw({
      voltage: sourceVoltage,
      current: measuredUnknownCurrent,
    }).resistance,
  };
}

interface B01OhmLawSceneProps {
  currentStep: B01Step;
  onStepComplete: (step: B01Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

export function B01OhmLawScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
}: B01OhmLawSceneProps) {
  // Step 1: Fixed R=6Ω, adjust Voltage (3V, 6V, 9V, 12V)
  const [step1Voltage, setStep1Voltage] = useState<number>(3);
  const [step1Recorded, setStep1Recorded] = useState<Set<number>>(new Set());

  // Step 2: Fixed V=12V, adjust Resistance (2Ω, 4Ω, 6Ω, 12Ω)
  const [step2Resistance, setStep2Resistance] = useState<number>(2);
  const [step2Recorded, setStep2Recorded] = useState<Set<number>>(new Set());

  // Step 3: Counterexample Limit Test & Theory Question
  const [shortAttempted, setShortAttempted] = useState<boolean>(false);
  const [openAttempted, setOpenAttempted] = useState<boolean>(false);
  const [step3Choice, setStep3Choice] = useState<string | null>(null);
  const [step3Submitted, setStep3Submitted] = useState<boolean>(false);
  const [step3Feedback, setStep3Feedback] = useState<string | null>(null);

  // Step 4: Unknown Resistor Prediction (12V, 0.5A)
  const [step4Choice, setStep4Choice] = useState<string | null>(null);
  const [step4Submitted, setStep4Submitted] = useState<boolean>(false);
  const [step4Feedback, setStep4Feedback] = useState<string | null>(null);

  // Step 5: Transfer Automotive Headlamp Power & Mod Decision
  const [step5Decision, setStep5Decision] = useState<string | null>(null);
  const [step5Submitted, setStep5Submitted] = useState<boolean>(false);
  const [step5Feedback, setStep5Feedback] = useState<string | null>(null);

  // Current calculations
  const step1Current = (step1Voltage / 6).toFixed(2);
  const step2Current = (12 / step2Resistance).toFixed(2);

  // Handlers for Step 1
  const handleRecordStep1 = () => {
    sounds.click();
    const next = new Set(step1Recorded);
    next.add(step1Voltage);
    setStep1Recorded(next);

    if (next.size === 4) {
      sounds.success();
      onStepComplete('FIXED_R_CHANGE_V', {
        proportionalityVerified: true,
        recordedVoltages: Array.from(next),
        resistance: 6,
      });
    }
  };

  // Handlers for Step 2
  const handleRecordStep2 = () => {
    sounds.click();
    const next = new Set(step2Recorded);
    next.add(step2Resistance);
    setStep2Recorded(next);

    if (next.size === 4) {
      sounds.success();
      onStepComplete('FIXED_V_CHANGE_R', {
        inverseProportionalityVerified: true,
        recordedResistances: Array.from(next),
        voltage: 12,
      });
    }
  };

  // Handlers for Step 3
  const handleSimulateShort = () => {
    sounds.zap();
    sounds.warningBuzz();
    setShortAttempted(true);
  };

  const handleSimulateOpen = () => {
    sounds.click();
    setOpenAttempted(true);
  };

  const handleSubmitStep3 = () => {
    sounds.click();
    if (!step3Choice) return;
    setStep3Submitted(true);
    if (step3Choice === 'OPT_A') {
      sounds.success();
      setStep3Feedback(
        '分析完全正确！电阻是导体自身固有的物理属性，只由导体的材料、长度、截面积与温度决定。欧姆定律变形公式 R = U/I 只是提供了一种测量计算电阻的方法，绝不意味着电阻随电压或电流改变！即使电路断电（U=0, I=0），电阻依然客观存在。'
      );
      onStepComplete('COUNTEREXAMPLE_PHYSICAL_ATTR', {
        conceptPassed: true,
        choice: step3Choice,
        shortTested: shortAttempted,
        openTested: openAttempted,
      });
    } else {
      sounds.warningBuzz();
      setStep3Feedback(
        '分析有误：公式 R = U / I 属于物理量测量关系式，并非决定式。电阻作为导体自身物理属性，不受外加电压和电流大小的影响。请重新梳理物理本质！'
      );
    }
  };

  // Handlers for Step 4
  const handleSubmitStep4 = () => {
    sounds.click();
    if (!step4Choice) return;
    setStep4Submitted(true);
    if (step4Choice === 'OPT_24') {
      sounds.success();
      setStep4Feedback(
        '推算准确！根据欧姆定律公式 R = U / I = 12.0V ÷ 0.50A = 24.0Ω。在实际汽车电路检修中，测得工作电压与支路电流即可迅速推算灯珠或线圈的真实等效内阻！'
      );
      onStepComplete('UNKNOWN_RESISTANCE_PREDICT', {
        predictedValue: 24.0,
        calculationAccurate: true,
      });
    } else {
      sounds.warningBuzz();
      setStep4Feedback('计算有误：请严格按照 R = U / I 列式计算，注意不要误用乘法或颠倒被除数。');
    }
  };

  // Handlers for Step 5
  const handleSubmitStep5 = () => {
    sounds.click();
    if (!step5Decision) return;
    setStep5Submitted(true);
    if (step5Decision === 'OPT_A') {
      sounds.success();
      setStep5Feedback(
        '技师决策正确！原车前照灯线束仅按 55W（4.5A）规格设计。若私自换装 100W 大功率灯泡，单灯电流激增至 8.3A，不仅原车前照灯继电器触点极易拉弧烧结，且原车细线束长期严重发热极易引发全车线束自燃！规范整改方案必须加装带继电器的强化改装线束，或选用合规的高光效原厂总成。'
      );
      onStepComplete('TRANSFER_AUTO_HEADLAMP_POWER', {
        powerCalculatedW: 54,
        hotResistanceOhm: 2.67,
        modificationDecision: 'OPT_A',
      });
    } else {
      sounds.warningBuzz();
      setStep5Feedback(
        '决策不合规：盲目加大保险丝无法保护线束，只会导致细导线在持续大电流下起火燃烧！直接替换存在严重车辆自燃安全隐患，请重新评估工程风险！'
      );
    }
  };

  // Step advance ready check
  const isStepAdvanceReady =
    (currentStep === 'FIXED_R_CHANGE_V' && step1Recorded.size === 4) ||
    (currentStep === 'FIXED_V_CHANGE_R' && step2Recorded.size === 4) ||
    (currentStep === 'COUNTEREXAMPLE_PHYSICAL_ATTR' && step3Submitted && step3Choice === 'OPT_A') ||
    (currentStep === 'UNKNOWN_RESISTANCE_PREDICT' && step4Submitted && step4Choice === 'OPT_24') ||
    (currentStep === 'TRANSFER_AUTO_HEADLAMP_POWER' && step5Submitted && step5Decision === 'OPT_A');

  return (
    <div className="w-full flex-1 flex flex-col gap-4 text-slate-800 min-h-[580px]">
      {/* Top Step Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isStepAdvanceReady ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
              }`}
            />
            <span className="text-xs sm:text-sm font-black text-slate-800 tracking-wider">
              {currentStep === 'FIXED_R_CHANGE_V' && '阶段 1 / 5 · 控制变量实验 A · 固定电阻改变电压 (U-I 正比)'}
              {currentStep === 'FIXED_V_CHANGE_R' && '阶段 2 / 5 · 控制变量实验 B · 固定电压更换电阻 (I-R 反比)'}
              {currentStep === 'COUNTEREXAMPLE_PHYSICAL_ATTR' && '阶段 3 / 5 · 极限工况短路断路与物理本质辨析'}
              {currentStep === 'UNKNOWN_RESISTANCE_PREDICT' && '阶段 4 / 5 · 实车仪表背光回路未知阻值定量推算'}
              {currentStep === 'TRANSFER_AUTO_HEADLAMP_POWER' && '阶段 5 / 5 · 实车大灯功率计算与改装安全决策'}
            </span>
          </div>

          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
            5阶段综合实训
          </span>
        </div>

        {isStepAdvanceReady && (
          <Button
            size="sm"
            onClick={onAdvanceStep}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 px-4 shadow-sm cursor-pointer"
          >
            <span>{currentStep === 'TRANSFER_AUTO_HEADLAMP_POWER' ? '查看通关报告' : '进入下一步'}</span>
            <ArrowRight size={16} />
          </Button>
        )}
      </div>

      {/* STEP 1: Control Variable A (Fixed R=6Ω, adjust Voltage) */}
      {currentStep === 'FIXED_R_CHANGE_V' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 7 Cols: Workbench & Controls */}
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                可调直流稳压电源实验台 · 控制变量 A (定值电阻 R = 6Ω)
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-600">
                数据采集进度：{step1Recorded.size} / 4
              </span>
            </div>

            {/* Circuit Diagram Visual SVG */}
            <div className="w-full h-60 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 460 130" className="w-full h-full max-w-lg">
                {/* Power Supply Box */}
                <rect x="25" y="30" width="65" height="60" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
                <text x="57" y="55" fill="#93c5fd" fontSize="13" textAnchor="middle" fontWeight="bold">DC稳压源</text>
                <text x="57" y="75" fill="#facc15" fontSize="14" textAnchor="middle" fontWeight="black">{step1Voltage} V</text>

                {/* Positive Feed Wire */}
                <line x1="90" y1="60" x2="160" y2="60" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* Switch (Closed) */}
                <circle cx="160" cy="60" r="5" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                <line x1="160" y1="60" x2="210" y2="60" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
                <circle cx="210" cy="60" r="5" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                <text x="185" y="48" fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="bold">开关(闭合)</text>

                {/* Fixed Resistor 6Ω */}
                <line x1="210" y1="60" x2="250" y2="60" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
                <rect x="250" y="46" width="60" height="28" rx="6" fill="#0f766e" stroke="#2dd4bf" strokeWidth="2" />
                <text x="280" y="64" fill="#f0fdfa" fontSize="12" textAnchor="middle" fontWeight="bold">R = 6 Ω</text>
                <line x1="310" y1="60" x2="350" y2="60" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* 10A Ammeter in series */}
                <rect x="350" y="45" width="55" height="30" rx="6" fill="#b91c1c" stroke="#fca5a5" strokeWidth="2" />
                <text x="377" y="64" fill="#fff" fontSize="11" textAnchor="middle" fontWeight="bold">10A表</text>

                {/* Return Wire */}
                <line x1="405" y1="60" x2="425" y2="60" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="425" y1="60" x2="425" y2="110" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="425" y1="110" x2="57" y2="110" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="57" y1="110" x2="57" y2="90" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Voltage Selectors & Record Button */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-slate-600">1. 选择稳压电源输出电压：</span>
              <div className="grid grid-cols-4 gap-2">
                {[3, 6, 9, 12].map((v) => {
                  const isRecorded = step1Recorded.has(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        sounds.click();
                        setStep1Voltage(v);
                      }}
                      className={`py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer border-2 ${
                        step1Voltage === v
                          ? 'bg-blue-600 border-blue-700 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{v} V</span>
                      {isRecorded && <span className="ml-1 text-xs text-emerald-300">✓</span>}
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={handleRecordStep1}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 cursor-pointer text-sm shadow-sm mt-1"
              >
                记录当前实测数据 ({step1Voltage}V ➔ {step1Current}A)
              </Button>
            </div>

            {/* Live Data Table */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2 text-xs">
              <strong className="text-slate-800 text-sm">U-I 实验数据记录表（电阻恒定 R = 6Ω）：</strong>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[3, 6, 9, 12].map((v) => (
                  <div
                    key={v}
                    className={`p-2 rounded-lg border ${
                      step1Recorded.has(v)
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    <div>{v} V</div>
                    <div className="text-sm mt-0.5">
                      {step1Recorded.has(v) ? `${(v / 6).toFixed(2)} A` : '--'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {step1Recorded.size === 4 && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>4 组数据全部记录完成！比值 U / I = 6.0 保持恒定，严格验证了“在电阻一定时，导体中的电流与导体两端电压成正比”！</span>
              </div>
            )}
          </div>

          {/* Right 5 Cols: Bench DMM */}
          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <Gauge size={18} />
                数字万用表 · 电流实测
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-900 text-blue-200 border border-blue-700">
                10A 串联回路
              </span>
            </div>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">DC 10A RANGE</span>
                <span className="font-bold text-amber-300">R_FIXED = 6Ω</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {step1Current} A
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>POWER: {step1Voltage}V</span>
                <span className="font-bold">DC AMPERES</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">控制变量法精义：</strong>
              当电阻 R 不变时，电压越高，推动自由电子定向移动的“电位差压力”越大，单位时间内通过截面的电荷量成正比例增多。这就是伏安特性直线！
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Control Variable B (Fixed V=12V, adjust Resistance) */}
      {currentStep === 'FIXED_V_CHANGE_R' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                恒压 12V 换阻实验台 · 控制变量 B (恒定电压 U = 12V)
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-600">
                数据采集进度：{step2Recorded.size} / 4
              </span>
            </div>

            {/* Circuit Diagram Visual SVG */}
            <div className="w-full h-60 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 460 130" className="w-full h-full max-w-lg">
                {/* 12V Constant Power */}
                <rect x="25" y="30" width="65" height="60" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
                <text x="57" y="55" fill="#93c5fd" fontSize="13" textAnchor="middle" fontWeight="bold">稳压 12V</text>
                <text x="57" y="75" fill="#facc15" fontSize="14" textAnchor="middle" fontWeight="black">恒压源</text>

                {/* Positive Wire */}
                <line x1="90" y1="60" x2="210" y2="60" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* Resistor (Dynamic) */}
                <rect x="210" y="44" width="80" height="32" rx="6" fill="#7c3aed" stroke="#c084fc" strokeWidth="2" />
                <text x="250" y="65" fill="#fdf4ff" fontSize="13" textAnchor="middle" fontWeight="black">R = {step2Resistance} Ω</text>

                {/* Wire to Ammeter */}
                <line x1="290" y1="60" x2="350" y2="60" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* 10A Ammeter in series */}
                <rect x="350" y="45" width="55" height="30" rx="6" fill="#b91c1c" stroke="#fca5a5" strokeWidth="2" />
                <text x="377" y="64" fill="#fff" fontSize="11" textAnchor="middle" fontWeight="bold">10A表</text>

                {/* Return Wire */}
                <line x1="405" y1="60" x2="425" y2="60" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="425" y1="60" x2="425" y2="110" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="425" y1="110" x2="57" y2="110" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="57" y1="110" x2="57" y2="90" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Resistance Selectors */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-slate-600">1. 选择插入不同规格的精密电阻：</span>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 6, 12].map((r) => {
                  const isRecorded = step2Recorded.has(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        sounds.click();
                        setStep2Resistance(r);
                      }}
                      className={`py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer border-2 ${
                        step2Resistance === r
                          ? 'bg-purple-600 border-purple-700 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{r} Ω</span>
                      {isRecorded && <span className="ml-1 text-xs text-emerald-300">✓</span>}
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={handleRecordStep2}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 cursor-pointer text-sm shadow-sm mt-1"
              >
                记录当前实测数据 ({step2Resistance}Ω ➔ {step2Current}A)
              </Button>
            </div>

            {/* Live Data Table */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2 text-xs">
              <strong className="text-slate-800 text-sm">I-R 实验数据记录表（恒定电压 U = 12V）：</strong>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[2, 4, 6, 12].map((r) => (
                  <div
                    key={r}
                    className={`p-2 rounded-lg border ${
                      step2Recorded.has(r)
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    <div>{r} Ω</div>
                    <div className="text-sm mt-0.5">
                      {step2Recorded.has(r) ? `${(12 / r).toFixed(2)} A` : '--'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {step2Recorded.size === 4 && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>4 组数据全部记录完成！电阻由 2Ω 增大到 12Ω 时，电流由 6.0A 衰减到 1.0A，两者的乘积 I × R 恒等于 12V，严格验证了“在电压一定时，导体中的电流与导体电阻成反比”！</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <Gauge size={18} />
                数字万用表 · 电流实测
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-purple-900 text-purple-200 border border-purple-700">
                12V 恒压回路
              </span>
            </div>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">DC 10A RANGE</span>
                <span className="font-bold text-amber-300">U_CONST = 12V</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {step2Current} A
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>LOAD: {step2Resistance}Ω</span>
                <span className="font-bold">DC AMPERES</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">反比例关系精义：</strong>
              当电压保持 12V 不变时，电阻越大，对自由电子定向移动的阻碍效应就越强，电流随之成反比例衰减。欧姆定律标准表达式：I = U / R！
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Counterexample Limit Test & Physical Attribute Question */}
      {currentStep === 'COUNTEREXAMPLE_PHYSICAL_ATTR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              极限工况辨析与反例思考 · 欧姆定律公式物理本质
            </span>

            {/* Interactive limit simulator */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={shortAttempted ? 'secondary' : 'default'}
                onClick={handleSimulateShort}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 text-sm cursor-pointer"
              >
                1. 模拟短路极限 (R ➔ 0Ω)
              </Button>
              <Button
                variant={openAttempted ? 'secondary' : 'default'}
                onClick={handleSimulateOpen}
                className="bg-slate-700 hover:bg-slate-800 text-white font-bold py-3 text-sm cursor-pointer"
              >
                2. 模拟断路极限 (R ➔ ∞)
              </Button>
            </div>

            {shortAttempted && (
              <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-xs sm:text-sm text-red-950 flex items-start gap-2.5">
                <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">短路极限警报：</strong>
                  当 R ➔ 0 时，由 I = U / R 可知回路电流理论趋向无穷大！车间断路器已执行纳秒级保护跳闸。
                </div>
              </div>
            )}

            {openAttempted && (
              <div className="p-3.5 bg-blue-50 border border-blue-300 rounded-xl text-xs sm:text-sm text-blue-950 flex items-start gap-2.5">
                <CheckCircle2 size={20} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">断路极限观测：</strong>
                  当 R ➔ ∞（空气绝缘）时，由 I = U / R 可知电流为 0A。
                </div>
              </div>
            )}

            {/* Theory Question with NO SPOILERS */}
            <div className="mt-1 p-4 rounded-xl border border-slate-300 bg-slate-50 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-600" />
                <strong className="text-sm font-bold text-slate-800">
                  电工理论深度辨析工单
                </strong>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                学徒小王认为：<em>“根据欧姆定律变形公式 R = U / I，导体的电阻与它两端的电压成正比，与通过它的电流成反比。”</em> 作为带教技师，你对该说法的专业评价是：
              </p>

              <div className="flex flex-col gap-2.5">
                {[
                  {
                    id: 'OPT_A',
                    text: 'A. 说法错误：电阻是导体本身的固有物理属性（由材料、长度、截面积与温度决定）。公式 R = U/I 仅为量度计算式，即使电路未通电（U=0, I=0），电阻依然客观存在，并不由外部电压或电流决定。',
                  },
                  {
                    id: 'OPT_B',
                    text: 'B. 说法正确：外加电压越高，对电流的阻碍效应就越强，因而电阻必定随电压等比例增大。',
                  },
                  {
                    id: 'OPT_C',
                    text: 'C. 说法正确：通过导体的电流越大，说明其阻碍作用被削弱，因而电阻必定随电流增大而成反比减小。',
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
                      checked={step3Choice === opt.id}
                      onChange={() => {
                        sounds.click();
                        setStep3Choice(opt.id);
                        setStep3Submitted(false);
                        setStep3Feedback(null);
                      }}
                      className="mt-1 cursor-pointer"
                    />
                    <span className="flex-1 leading-relaxed">{opt.text}</span>
                  </label>
                ))}
              </div>

              <Button
                disabled={!step3Choice}
                onClick={handleSubmitStep3}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 cursor-pointer text-sm shadow-sm"
              >
                提交理论辨析工单
              </Button>

              {step3Feedback && (
                <div
                  className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                    step3Choice === 'OPT_A'
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                      : 'bg-red-50 border border-red-300 text-red-900'
                  }`}
                >
                  {step3Choice === 'OPT_A' ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{step3Feedback}</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <ShieldAlert size={18} />
              基准 V05/V06 安全拦截状态
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-slate-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">CIRCUIT LIMIT MONITOR</span>
                <span className="font-bold text-amber-300">
                  {shortAttempted ? 'BREAKER TRIPPED' : openAttempted ? 'OPEN CIRCUIT' : 'STANDBY'}
                </span>
              </div>
              <div className="text-3xl lg:text-4xl font-black text-right tracking-wider text-emerald-300">
                {shortAttempted ? 'OVERLOAD (V06)' : openAttempted ? '0.00 A' : 'READY'}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>R_LIMIT_TEST</span>
                <span className="font-bold">STATUS_OK</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">考点总结：</strong>
              决定导体电阻大小的物理因素是：<strong>材料电阻率 ρ、长度 L、横截面积 S 和工作温度 T</strong>（电阻定律公式：R = ρ · L / S）。电压与电流只是检验其阻值的外部激励！
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Unknown Resistor Prediction (Real Car Dashboard Lighting 12V 0.5A) */}
      {currentStep === 'UNKNOWN_RESISTANCE_PREDICT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              实车仪表照明灯未知阻值定量推算 · 独立盲测实训
            </span>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">实训情境：</strong>
              车间维修台接入了一组实车仪表盘照明背光总成回路。万用表测得两端工作电压稳定在 <span className="font-bold text-blue-700">12.0V</span>，回路电流表准确测得工作电流为 <span className="font-bold text-emerald-700">0.50A</span>。请运用欧姆定律 $R = U / I$ 计算该总成的等效电阻。
            </div>

            <div className="w-full h-56 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative border border-slate-800 shadow-inner">
              <div className="flex flex-col items-center gap-3 text-center text-white">
                <div className="w-28 h-20 rounded-xl bg-slate-800 border-2 border-slate-600 flex flex-col items-center justify-center shadow-md">
                  <Zap size={24} className="text-amber-400 mb-1" />
                  <span className="text-xs text-slate-400">仪表照明负载</span>
                  <span className="text-sm font-black text-amber-300">Rx = ? Ω</span>
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-4 font-mono">
                  <span>实测端电压: 12.00 V</span>
                  <span>实测回路电流: 0.50 A</span>
                </div>
              </div>
            </div>

            {/* Answer Options: NO SPOILERS */}
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'OPT_24', text: 'A. 24.0 Ω (推算式：R = 12.0V ÷ 0.50A = 24.0Ω)' },
                { id: 'OPT_6', text: 'B. 6.0 Ω (推算式：R = 12.0V × 0.50A = 6.0Ω)' },
                { id: 'OPT_48', text: 'C. 48.0 Ω (推算式：R = 12.0V ÷ 0.25A = 48.0Ω)' },
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
              提交未知阻值定量预测工单
            </Button>

            {step4Feedback && (
              <div
                className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                  step4Choice === 'OPT_24'
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border border-red-300 text-red-900'
                }`}
              >
                {step4Choice === 'OPT_24' ? (
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
              双表联测示数
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">VOLTMETER: 12.00 V</span>
                <span className="font-bold text-amber-300">AMMETER: 0.50 A</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                24.0 Ω
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>PREDICTED_R</span>
                <span className="font-bold">OHMS</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">伏安法测电阻：</strong>
              电压表与待测负载并联测电压 U，电流表与负载串联测电流 I，两者之比即为阻值。此方法是汽车电工检修不可拆卸器件的黄金利器！
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Transfer Automotive Headlamp Power & Mod Decision */}
      {currentStep === 'TRANSFER_AUTO_HEADLAMP_POWER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              实车前大灯功率核算与大功率私自改装安全评估决策
            </span>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">实车工程情境：</strong>
              实测车辆前大灯点亮回路，端电压 12.0V，电流 4.50A。
              <div className="mt-1 flex flex-wrap gap-4 text-xs sm:text-sm font-bold text-blue-900">
                <span>1. 热态工作电阻：R = 12V ÷ 4.5A ≈ 2.67 Ω</span>
                <span>2. 额定工作功率：P = 12V × 4.5A = 54 W (标准55W规格)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <strong className="text-sm font-bold text-slate-800">
                  车间安全决策：车主提出将 55W 原装灯泡直接拔下、插上自购的 100W 大功率灯泡。你的专业技术方案是：
                </strong>
              </div>

              {/* Options: NO SPOILERS */}
              <div className="flex flex-col gap-2.5">
                {[
                  {
                    id: 'OPT_A',
                    text: 'A. 严禁原位直接替换：单只 100W 灯泡工作电流高达 8.33A，原车前大灯细线束无法承受大电流过载发热，极易烧蚀绝缘皮引发全车火灾，且原车继电器触点将迅速烧毁。若车主确需提升亮度，应加装带独立保险与继电器的增亮强化线束组，或建议更换合规的原厂高光效 LED 总成。',
                  },
                  {
                    id: 'OPT_B',
                    text: 'B. 可以直接替换：只需顺便将原车 15A 大灯保险丝更换为 30A 大容量保险丝即可放心使用。',
                  },
                  {
                    id: 'OPT_C',
                    text: 'C. 可以直接替换：汽车 12V 供电系统具有自动恒流稳压特性，大功率灯泡接入不会影响原车电气安全。',
                  },
                  {
                    id: 'OPT_D',
                    text: 'D. 无法安装：100W 灯泡额定电压都是 24V（货车专用规格），乘用车 12V 电压根本无法点亮。',
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-sm ${
                      step5Decision === opt.id
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-medium'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="step5_opt"
                      value={opt.id}
                      checked={step5Decision === opt.id}
                      onChange={() => {
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
                disabled={!step5Decision}
                onClick={handleSubmitStep5}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 cursor-pointer text-sm shadow-sm"
              >
                提交车间维修诊断工单
              </Button>

              {step5Feedback && (
                <div
                  className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                    step5Decision === 'OPT_A'
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                      : 'bg-red-50 border border-red-300 text-red-900'
                  }`}
                >
                  {step5Decision === 'OPT_A' ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{step5Feedback}</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Gauge size={18} />
              原车前大灯实测电参数
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">HEADLAMP (12V)</span>
                <span className="font-bold text-amber-300">R ≈ 2.67Ω</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                54.0 W
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>CURRENT: 4.50A</span>
                <span className="font-bold">WATTS (55W HALOGEN)</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">发热焦耳定律警示：</strong>
              焦耳热与电流平方成正比（$Q = I^2 R t$）。当电流从 4.5A 增大到 8.3A 时，原车线束的发热量将激增至原来的 <strong>3.4 倍</strong>！换大保险丝只会剥夺车辆的过载保护，导致线束引燃车辆！
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
