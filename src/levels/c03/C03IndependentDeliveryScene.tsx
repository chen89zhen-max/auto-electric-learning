'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Sparkles,
  UserCheck,
  Vibrate,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { type C03Step } from './c03Training';
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult, TrainingStageId } from '@/src/assessment/assessmentTypes';
import { evaluateMeterGuard } from '@/src/game/instruments/meterGuard';

interface C03IndependentDeliverySceneProps {
  currentStep: C03Step;
  onStepComplete: (step: C03Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onComplete?: (result: LevelAssessmentResult) => void;
  hintRequested?: boolean;
}

export function C03IndependentDeliveryScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onComplete,
  hintRequested,
}: C03IndependentDeliverySceneProps) {
  const assessment = useLevelAssessment('C03');

  React.useEffect(() => {
    if (hintRequested) {
      const stageMap: Record<C03Step, TrainingStageId> = {
        WORK_ORDER_INTAKE: 'cognition',
        INDEPENDENT_STRATEGY: 'standard',
        NON_DESTRUCTIVE_EXEC: 'calculation',
        SOP_REPAIR_AND_REINSPECT: 'blind_test',
        OWNER_DEFENSE_DELIVERY: 'transfer',
      };
      assessment.requestHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, assessment]);

  // Multimeter knob: 'OFF' | 'DCV_20' | 'OHM'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'DCV_20' | 'OHM'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Wiggle test animation state
  const [isWiggling, setIsWiggling] = useState<boolean>(false);
  const [wiggleFaultRevealed, setWiggleFaultRevealed] = useState<boolean>(false);

  // Step 1: Work order intake
  const [s1Hypothesis, setS1Hypothesis] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Step 2: Diagnostic strategy
  const [s2Strategy, setS2Strategy] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: Non-destructive execution
  const [s3Evidence, setS3Evidence] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Step 4: Repair & Re-inspect
  const [repairPinReformed, setRepairPinReformed] = useState<boolean>(false);
  const [repairTpaInstalled, setRepairTpaInstalled] = useState<boolean>(false);
  const [reinspectDone, setReinspectDone] = useState<boolean>(false);
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Step 5: Owner defense delivery
  const [s5Defense, setS5Defense] = useState<string | null>(null);
  const [s5Signed, setS5Signed] = useState<boolean>(false);

  // Handle knob turn
  const handleTurnKnob = (knob: 'OFF' | 'DCV_20' | 'OHM') => {
    sounds.click();
    setMeterKnob(knob);
    setMeterWarning(null);
  };

  const requireMeterPowered = (expected: 'DCV_20' | 'OHM' = 'DCV_20'): boolean => {
    const stageMap: Record<C03Step, TrainingStageId> = {
      WORK_ORDER_INTAKE: 'cognition',
      INDEPENDENT_STRATEGY: 'standard',
      NON_DESTRUCTIVE_EXEC: 'calculation',
      SOP_REPAIR_AND_REINSPECT: 'blind_test',
      OWNER_DEFENSE_DELIVERY: 'transfer',
    };
    const guard = evaluateMeterGuard({
      currentMode: meterKnob,
      expectedMode: expected,
      circuitPowered: true,
      resistanceMeasurement: meterKnob === 'OHM',
    });
    if (!guard.allowed) {
      sounds.warningBuzz();
      assessment.recordMeterBlocked(stageMap[currentStep]);
      setMeterWarning(guard.message);
      return false;
    }
    setMeterWarning(null);
    return true;
  };

  // Perform harness wiggle test
  const triggerWiggleTest = () => {
    sounds.click();
    if (!requireMeterPowered('DCV_20')) {
      return;
    }
    setIsWiggling(true);
    setTimeout(() => {
      setIsWiggling(false);
      if (!repairPinReformed) {
        setWiggleFaultRevealed(true);
        sounds.warningBuzz();
      } else {
        sounds.success();
      }
    }, 1200);
  };

  // Voltage calculation
  const getDmmReadout = () => {
    if (meterKnob === 'OFF') {
      return { value: '----', unit: 'OFF', color: 'text-slate-400' };
    }

    if (currentStep === 'WORK_ORDER_INTAKE' || currentStep === 'INDEPENDENT_STRATEGY') {
      return { value: '11.85', unit: 'V (静止静止工况正常)', color: 'text-emerald-400' };
    }

    if (currentStep === 'NON_DESTRUCTIVE_EXEC') {
      if (isWiggling) {
        return { value: '0.00', unit: 'V ⚠ (瞬态晃动跳变为0V！)', color: 'text-rose-400' };
      }
      if (wiggleFaultRevealed) {
        return { value: '0.00', unit: 'V (插针松旷脱落失电)', color: 'text-rose-400' };
      }
      return { value: '11.85', unit: 'V (点击下方晃动测试)', color: 'text-amber-400' };
    }

    if (currentStep === 'SOP_REPAIR_AND_REINSPECT') {
      if (reinspectDone) {
        return { value: '11.95', unit: 'V (全负荷抗震稳态达标)', color: 'text-emerald-400' };
      }
      return { value: '11.90', unit: 'V (待执行闭环复检)', color: 'text-amber-400' };
    }

    if (currentStep === 'OWNER_DEFENSE_DELIVERY') {
      return { value: '11.95', unit: 'V (压降仅0.03V 优于新件)', color: 'text-emerald-400' };
    }

    return { value: '11.95', unit: 'V', color: 'text-emerald-400' };
  };

  const dmmDisplay = getDmmReadout();

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-[580px] p-2 text-slate-800">
      {/* 5-Stage Step Navigation Header */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-100/90 rounded-xl border border-slate-200 text-xs font-bold">
        {[
          { key: 'WORK_ORDER_INTAKE', label: '1. 独立接车问诊' },
          { key: 'INDEPENDENT_STRATEGY', label: '2. 自主排故策略' },
          { key: 'NON_DESTRUCTIVE_EXEC', label: '3. 动态无损排查' },
          { key: 'SOP_REPAIR_AND_REINSPECT', label: '4. 修复与闭环复验' },
          { key: 'OWNER_DEFENSE_DELIVERY', label: '5. 答辩与独立交车' },
        ].map((item, idx) => {
          const isActive = currentStep === item.key;
          return (
            <div
              key={item.key}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-amber-600 text-white shadow-sm font-black'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              <span>{item.label}</span>
              {idx < 4 && <span className="text-slate-300 ml-1">›</span>}
            </div>
          );
        })}
      </div>

      {/* Main Workspace: Left Circuit SVG + Right Instrument Display */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Circuit Visual Canvas */}
        <div className="xl:col-span-8 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <strong className="text-slate-100 font-bold text-sm">
                客户车辆实车前照灯线束工位 (红旗 E-HS9 试验台实车环境)
              </strong>
            </div>
            <span className="text-amber-400 font-mono font-semibold">
              接插件状态：
              {repairPinReformed && repairTpaInstalled
                ? '已锁紧 (加装二次TPA锁片)'
                : wiggleFaultRevealed
                ? '2号端子退针脱开 (失电)'
                : '静止接触 (颠簸易脱落)'}
            </span>
          </div>

          {/* SVG Visual Canvas */}
          <div className="p-3 flex items-center justify-center bg-slate-950/40">
            <svg
              viewBox="0 0 540 180"
              className={`w-full h-60 lg:h-64 select-none drop-shadow-md ${isWiggling ? 'animate-bounce' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="c03Grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.4" />
                </pattern>
                <filter id="c03Glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <rect width="540" height="180" fill="url(#c03Grid)" />

              {/* Main Wires (6px) */}
              <path d="M 50 60 L 50 40 L 130 40" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
              <path d="M 180 40 L 240 40" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
              <path d="M 310 40 L 370 40 L 370 70" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
              <path d="M 410 70 L 410 140 L 50 140 L 50 110" fill="none" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />

              {/* 12V Battery */}
              <g transform="translate(25, 60)">
                <rect x="0" y="0" width="50" height="50" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                <text x="25" y="28" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">12V 蓄电池</text>
                <circle cx="25" cy="0" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="25" cy="50" r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
              </g>

              {/* 15A Fuse */}
              <g transform="translate(130, 25)">
                <rect x="0" y="0" width="50" height="30" rx="4" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
                <line x1="5" y1="15" x2="45" y2="15" stroke="#fbbf24" strokeWidth="3" />
                <text x="25" y="20" fill="#f1f5f9" fontSize="10" fontWeight="bold" textAnchor="middle">15A 保险</text>
              </g>

              {/* Headlamp Harness Connector Module (The focus of C03: Pin Back-out fault) */}
              <g transform="translate(230, 15)">
                <rect
                  x="0"
                  y="0"
                  width="80"
                  height="48"
                  rx="6"
                  fill="#1e293b"
                  stroke={
                    repairPinReformed && repairTpaInstalled
                      ? '#10b981'
                      : wiggleFaultRevealed
                      ? '#ef4444'
                      : '#f59e0b'
                  }
                  strokeWidth="2.5"
                />
                <text x="40" y="16" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">
                  前照灯主插头
                </text>
                {/* Pin terminal visual */}
                <rect
                  x={wiggleFaultRevealed && !repairPinReformed ? '48' : '32'}
                  y="26"
                  width="18"
                  height="12"
                  rx="2"
                  fill={
                    repairPinReformed && repairTpaInstalled
                      ? '#10b981'
                      : wiggleFaultRevealed
                      ? '#f43f5e'
                      : '#fbbf24'
                  }
                />
                <text x="40" y="36" fill="#0f172a" fontSize="9" fontWeight="black" textAnchor="middle">
                  #2针
                </text>
                <text
                  x="40"
                  y="58"
                  fill={
                    repairPinReformed && repairTpaInstalled
                      ? '#34d399'
                      : wiggleFaultRevealed
                      ? '#f87171'
                      : '#94a3b8'
                  }
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {repairPinReformed && repairTpaInstalled
                    ? '已加装TPA锁死'
                    : wiggleFaultRevealed
                    ? '倒刺折断退针'
                    : '弹片疲劳'}
                </text>
              </g>

              {/* Headlamp Load */}
              <g transform="translate(360, 45)">
                <circle
                  cx="30"
                  cy="35"
                  r={
                    (!wiggleFaultRevealed && currentStep !== 'NON_DESTRUCTIVE_EXEC') ||
                    (currentStep === 'SOP_REPAIR_AND_REINSPECT' && reinspectDone) ||
                    currentStep === 'OWNER_DEFENSE_DELIVERY'
                      ? 36
                      : 0
                  }
                  fill="#fef08a"
                  opacity="0.6"
                  filter="url(#c03Glow)"
                />
                <circle
                  cx="30"
                  cy="35"
                  r="24"
                  fill={
                    (!wiggleFaultRevealed && currentStep !== 'NON_DESTRUCTIVE_EXEC') ||
                    (currentStep === 'SOP_REPAIR_AND_REINSPECT' && reinspectDone) ||
                    currentStep === 'OWNER_DEFENSE_DELIVERY'
                      ? '#ffffff'
                      : '#475569'
                  }
                  stroke="#cbd5e1"
                  strokeWidth="2.5"
                />
                <path
                  d="M 22 45 L 26 28 L 30 40 L 34 28 L 38 45"
                  fill="none"
                  stroke={
                    (!wiggleFaultRevealed && currentStep !== 'NON_DESTRUCTIVE_EXEC') ||
                    (currentStep === 'SOP_REPAIR_AND_REINSPECT' && reinspectDone) ||
                    currentStep === 'OWNER_DEFENSE_DELIVERY'
                      ? '#eab308'
                      : '#64748b'
                  }
                  strokeWidth="2.5"
                />
                <text x="30" y="72" fill="#e2e8f0" fontSize="11" fontWeight="bold" textAnchor="middle">
                  {(!wiggleFaultRevealed && currentStep !== 'NON_DESTRUCTIVE_EXEC') ||
                  (currentStep === 'SOP_REPAIR_AND_REINSPECT' && reinspectDone) ||
                  currentStep === 'OWNER_DEFENSE_DELIVERY'
                    ? '24W 大灯 (满额稳定)'
                    : '24W 大灯 (颠簸熄灭)'}
                </text>
              </g>

              {/* Ground Bolt */}
              <g transform="translate(390, 130)">
                <circle cx="20" cy="10" r="8" fill="#334155" stroke="#38bdf8" strokeWidth="2" />
                <path d="M 12 24 L 28 24 M 15 28 L 25 28 M 18 32 L 22 32" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <text x="20" y="-4" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">车身搭铁</text>
              </g>
            </svg>
          </div>

          {/* Bottom Interactive Toolbar */}
          <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">动态实操动作：</span>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500 text-amber-300 hover:bg-slate-800 cursor-pointer"
                onClick={triggerWiggleTest}
              >
                <Vibrate size={15} className="mr-1" />
                模拟路面颠簸·线束摇晃测试 (Wiggle Test)
              </Button>
            </div>

            {currentStep === 'SOP_REPAIR_AND_REINSPECT' && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={repairPinReformed}
                  variant={repairPinReformed ? 'default' : 'outline'}
                  className={repairPinReformed ? 'bg-emerald-700 text-white' : 'border-amber-500 text-amber-300 cursor-pointer'}
                  onClick={() => {
                    sounds.click();
                    setRepairPinReformed(true);
                  }}
                >
                  1. 挑出端子修复金属锁止弹片 {repairPinReformed && '✓'}
                </Button>
                <Button
                  size="sm"
                  disabled={!repairPinReformed || repairTpaInstalled}
                  variant={repairTpaInstalled ? 'default' : 'outline'}
                  className={repairTpaInstalled ? 'bg-emerald-700 text-white' : 'border-amber-500 text-amber-300 cursor-pointer'}
                  onClick={() => {
                    sounds.click();
                    setRepairTpaInstalled(true);
                  }}
                >
                  2. 插入插座并加装二次锁片 (TPA) {repairTpaInstalled && '✓'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right DMM Panel */}
        <div className="xl:col-span-4 flex flex-col justify-between bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gauge size={20} className="text-amber-400" />
                <span className="text-sm font-black tracking-wider text-slate-100">
                  FLUKE-DMM 汽车高级诊断表
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-emerald-400 font-mono">
                PEAK-CAPTURE
              </span>
            </div>

            {/* LCD Readout (h-32) */}
            <div className="relative h-32 bg-slate-950 rounded-xl p-3 border-2 border-slate-900 flex flex-col justify-between shadow-inner">
              <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                <span>DYNAMIC SAMPLING</span>
                <span>{meterKnob === 'OFF' ? 'POWER OFF' : 'DC VOLTAGE'}</span>
              </div>

              <div className="flex items-baseline justify-end gap-2 pr-2">
                <span className={`text-4xl lg:text-5xl font-black font-mono tracking-wider ${dmmDisplay.color}`}>
                  {dmmDisplay.value}
                </span>
                <span className="text-lg font-bold text-slate-400">V</span>
              </div>

              <div className="text-right text-xs font-mono text-slate-400 truncate">
                {dmmDisplay.unit}
              </div>
            </div>

            {meterWarning && (
              <div className="mt-2 text-xs font-bold text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-800 flex items-center gap-1.5 animate-bounce">
                <AlertTriangle size={14} />
                <span>{meterWarning}</span>
              </div>
            )}
          </div>

          {/* Rotary Knob Controls */}
          <div className="mt-3 pt-3 border-t border-slate-700 flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400">万用表功能旋钮挡位：</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: 'OFF', label: '关机 (OFF)' },
                { key: 'DCV_20', label: '电压 DC 20V' },
                { key: 'OHM', label: '电阻 Ω' },
              ].map((knobItem) => {
                const isSelected = meterKnob === knobItem.key;
                return (
                  <button
                    key={knobItem.key}
                    type="button"
                    onClick={() => handleTurnKnob(knobItem.key as typeof meterKnob)}
                    className={`px-2 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-center ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {knobItem.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Interactive Work Order / Defense Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        {/* Step 1 Work Order */}
        {currentStep === 'WORK_ORDER_INTAKE' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  实训工单 · 独立接车问诊
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 1：车主反馈“夜间过减速带车灯闪烁熄灭，此前已换过两个新灯泡”，最合理的排查假说是？
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {[
                { key: 'HARNESS_LOOSE', text: '假说 A：插头插针弹片疲劳退针或接触不良，颠簸时瞬态脱开断路' },
                { key: 'LAMP_QUALITY', text: '假说 B：连续三个灯泡出厂批次质量均不合格' },
                { key: 'BATTERY_LOOSE', text: '假说 C：蓄电池电解液在颠簸时溢出断电' },
                { key: 'FUSE_MELT', text: '假说 D：保险丝在颠簸时瞬间熔断然后又自行愈合' },
              ].map((opt) => {
                const isSelected = s1Hypothesis === opt.key;
                const isCorrect = opt.key === 'HARNESS_LOOSE';
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (!s1Submitted) {
                        sounds.click();
                        setS1Hypothesis(opt.key);
                      }
                    }}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      s1Submitted
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : isSelected
                          ? 'border-rose-400 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                        : isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {s1Submitted ? '✓ 问诊假设建立完成。进入步骤 2 规划排查策略。' : '根据车主问诊信息确认排查假说'}
              </span>
              {!s1Submitted ? (
                <Button
                  disabled={!s1Hypothesis}
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    if (!s1Hypothesis) return;
                    if (s1Hypothesis === 'HARNESS_LOOSE') {
                      sounds.success();
                    } else {
                      sounds.warningBuzz();
                      assessment.recordWrong('cognition');
                    }
                    setS1Submitted(true);
                    onStepComplete('WORK_ORDER_INTAKE', {
                      hypothesis: s1Hypothesis,
                      passed: s1Hypothesis === 'HARNESS_LOOSE',
                    });
                  }}
                >
                  <CheckCircle2 size={16} className="mr-1" />
                  提交初检问诊单
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={() => {
                    assessment.completeStage('cognition');
                    assessment.startStage('standard');
                    onAdvanceStep();
                  }}
                >
                  进入步骤 2：自主排故策略 <ArrowRight size={16} className="ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 2 Strategy */}
        {currentStep === 'INDEPENDENT_STRATEGY' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  实训工单 · 策略规划
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 2：面对偶发颠簸断电故障，主修技师最科学规范的排查策略是？
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {[
                { key: 'WIGGLE_TEST', text: '策略 A：带载通电状态下开展线束摇晃测试 (Wiggle Test)，万用表捕捉瞬态电压跌落锁定接插件' },
                { key: 'CUT_HARNESS', text: '策略 B：直接将整根前照灯线束剪断全部重新穿线' },
                { key: 'REPLACE_ALL', text: '策略 C：继续换第三只灯泡和继电器看运气' },
                { key: 'FORCE_POWER', text: '策略 D：直接从蓄电池正极飞一根明线绑在大灯上' },
              ].map((opt) => {
                const isSelected = s2Strategy === opt.key;
                const isCorrect = opt.key === 'WIGGLE_TEST';
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (!s2Submitted) {
                        sounds.click();
                        setS2Strategy(opt.key);
                      }
                    }}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      s2Submitted
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : isSelected
                          ? 'border-rose-400 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                        : isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {s2Submitted ? '✓ 策略审批通过。进入步骤 3 执行动态无损排查。' : '确立科学排查方案后提交'}
              </span>
              {!s2Submitted ? (
                <Button
                  disabled={!s2Strategy}
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    if (!s2Strategy) return;
                    if (s2Strategy === 'WIGGLE_TEST') {
                      sounds.success();
                    } else {
                      sounds.warningBuzz();
                      assessment.recordWrong('standard');
                    }
                    setS2Submitted(true);
                    onStepComplete('INDEPENDENT_STRATEGY', {
                      strategy: s2Strategy,
                      passed: s2Strategy === 'WIGGLE_TEST',
                    });
                  }}
                >
                  <CheckCircle2 size={16} className="mr-1" />
                  提交排故策略方案
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={() => {
                    assessment.completeStage('standard');
                    assessment.startStage('calculation');
                    onAdvanceStep();
                  }}
                >
                  进入步骤 3：动态无损排查执行 <ArrowRight size={16} className="ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3 Non-destructive Execution */}
        {currentStep === 'NON_DESTRUCTIVE_EXEC' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  实训工单 · 动态排故证据
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 3：在上方执行线束摇晃测试，观察万用表读数变化，确凿证据是？
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {[
                { key: 'PIN_BACKOUT', text: '证据 A：晃动插头时电压瞬间从 11.8V 跌落至 0V，拆检发现 2号插针金属倒刺折断退针' },
                { key: 'FUSE_BLOWN', text: '证据 B：晃动插头导致 15A 保险丝当场熔断' },
                { key: 'FILAMENT_BROKEN', text: '证据 C：晃动导致灯泡内部灯丝断开' },
                { key: 'BATTERY_DROP', text: '证据 D：蓄电池端电压跌至 2V' },
              ].map((opt) => {
                const isSelected = s3Evidence === opt.key;
                const isCorrect = opt.key === 'PIN_BACKOUT';
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (!s3Submitted) {
                        sounds.click();
                        setS3Evidence(opt.key);
                      }
                    }}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      s3Submitted
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : isSelected
                          ? 'border-rose-400 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                        : isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {s3Submitted ? '✓ 退针证据确凿！进入步骤 4 执行标准端子修复。' : '在上方点击“线束摇晃测试”后勾选实测证据'}
              </span>
              {!s3Submitted ? (
                <Button
                  disabled={!s3Evidence}
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    if (!s3Evidence) return;
                    if (s3Evidence === 'PIN_BACKOUT') {
                      sounds.success();
                    } else {
                      sounds.warningBuzz();
                      assessment.recordWrong('calculation');
                    }
                    setS3Submitted(true);
                    onStepComplete('NON_DESTRUCTIVE_EXEC', {
                      evidence: s3Evidence,
                      passed: s3Evidence === 'PIN_BACKOUT',
                    });
                  }}
                >
                  <CheckCircle2 size={16} className="mr-1" />
                  确认故障定位证据
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={() => {
                    assessment.completeStage('calculation');
                    assessment.startStage('blind_test');
                    onAdvanceStep();
                  }}
                >
                  进入步骤 4：标准修复与闭环复验 <ArrowRight size={16} className="ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 4 Repair & Re-inspect */}
        {currentStep === 'SOP_REPAIR_AND_REINSPECT' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  实训工单 · 标准修复与闭环复验
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 4：执行插针金属锁舌挑针修复，加装二次锁止片 (TPA) 并完成闭环抗震复检
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-white ${repairPinReformed ? 'bg-emerald-600' : 'bg-slate-400'}`}>1</span>
                <span>端子挑舌修复：金属弹片恢复 15N 锁止保持力 {repairPinReformed && '✓'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-white ${repairTpaInstalled ? 'bg-emerald-600' : 'bg-slate-400'}`}>2</span>
                <span>二次锁止片 (TPA)：加装防脱锁片防止颠簸滑脱 {repairTpaInstalled && '✓'}</span>
              </div>
            </div>

            {repairPinReformed && repairTpaInstalled && !reinspectDone && (
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-sm font-bold text-amber-900">
                  锁止机构加固完毕！必须闭合电源执行全负荷持续抗震复验。
                </span>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    sounds.zap();
                    setReinspectDone(true);
                  }}
                >
                  <Sparkles size={16} className="mr-1" />
                  通电全负荷抗震复验
                </Button>
              </div>
            )}

            {reinspectDone && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-sm flex flex-col gap-2">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span>闭环全负荷复验数据单：</span>
                  <span className="text-xs bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">完全达标</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-700">
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    稳态工作电压：<strong className="text-emerald-700 text-sm">11.95 V</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    线路总电压降：<strong className="text-emerald-700 text-sm">0.03 V</strong> (极优)
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    晃动电压波动：<strong className="text-emerald-700 text-sm">0.00 V</strong> (恒定零波动)
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    发光工作功率：<strong className="text-emerald-700 text-sm">24.0 W</strong> (白炽满额)
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {s4Submitted ? '✓ 复检验收合格。进入步骤 5 独立交车答辩。' : '完成工艺加固并通电复验后提交'}
              </span>
              <Button
                disabled={!reinspectDone || s4Submitted}
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                onClick={() => {
                  sounds.success();
                  setS4Submitted(true);
                  onStepComplete('SOP_REPAIR_AND_REINSPECT', {
                    pinReformed: repairPinReformed,
                    tpaInstalled: repairTpaInstalled,
                    voltageDrop: 0.03,
                    passed: true,
                  });
                  assessment.completeStage('blind_test');
                  assessment.startStage('transfer', 'transfer');
                  onAdvanceStep();
                }}
              >
                <CheckCircle2 size={16} className="mr-1" />
                提交复验证据单
              </Button>
            </div>
          </div>
        )}

        {/* Step 5 Owner Defense Delivery */}
        {currentStep === 'OWNER_DEFENSE_DELIVERY' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  交车答辩 · 客户交付闭环
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 5：车主询问“为什么之前换灯泡管用了一两天，后来又颠灭了？”，请向车主做专业答辩：
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {[
                { key: 'A', text: '答辩 A：因为换灯泡拔插动作碰巧把退针向前顶了一点暂时恢复，但金属卡片已折断，颠簸两天后在重力与振动下再次滑脱断路' },
                { key: 'B', text: '答辩 B：因为汽车电脑有记忆效应，两天后才发现新灯泡不兼容' },
                { key: 'C', text: '答辩 C：因为之前换的灯泡发热把保险丝热胀冷缩了' },
                { key: 'D', text: '答辩 D：纯属巧合，建议车主以后少走颠簸路' },
              ].map((opt) => {
                const isSelected = s5Defense === opt.key;
                const isCorrect = opt.key === 'A';
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (!s5Signed) {
                        sounds.click();
                        setS5Defense(opt.key);
                      }
                    }}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      s5Signed
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : isSelected
                          ? 'border-rose-400 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                        : isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {s5Signed
                  ? '✓ 《新能源汽车电器维修竣工交车单》已签署！客户高度认可，首次独立交车圆满闭环！'
                  : '做出专业技术答辩并签署竣工交车单'}
              </span>
              <Button
                disabled={!s5Defense || s5Signed}
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                onClick={() => {
                  if (s5Defense === 'A') {
                    sounds.success();
                  } else {
                    sounds.warningBuzz();
                    assessment.recordWrong('transfer');
                  }
                  setS5Signed(true);
                  onStepComplete('OWNER_DEFENSE_DELIVERY', {
                    defenseChoice: s5Defense,
                    passed: s5Defense === 'A',
                  });
                  assessment.completeStage('transfer');
                  const finalResult = assessment.completeLevel();
                  onComplete?.(finalResult);
                  onAdvanceStep();
                }}
              >
                <UserCheck size={16} className="mr-1" />
                签署交车单并交付车主
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
