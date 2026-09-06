'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  RotateCw,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateVoltageDropCircuit } from '@/src/circuit/solver/DCAnalysisUtils';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { type C01Step } from './c01Training';
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult, TrainingStageId } from '@/src/assessment/assessmentTypes';

interface C01VoltageDropSceneProps {
  currentStep: C01Step;
  onStepComplete: (step: C01Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onComplete?: (result: LevelAssessmentResult) => void;
  hintRequested?: boolean;
}

// Stage 4 Blind Cases
interface BlindCase {
  id: string;
  vehicleName: string;
  description: string;
  faultLocation: 'RELAY' | 'GROUND' | 'FUSE';
  faultName: string;
  rFuse: number;
  rRelay: number;
  rLamp: number;
  rGround: number;
  explanation: string;
}

const BLIND_CASES: BlindCase[] = [
  {
    id: 'CASE_RELAY',
    vehicleName: '实车案例 A (新能源试验车 #103)',
    description: '前照灯昏暗发红，仪表无故障码。学员需通过跨接测量定位高阻点。',
    faultLocation: 'RELAY',
    faultName: '供电继电器内部常开触点氧化碳化',
    rFuse: 0.05,
    rRelay: 0.75, // 0.75Ω high resistance
    rLamp: 6.0,
    rGround: 0.08,
    explanation: '继电器触点跨接电压降高达 1.29V（行业标准触点压降 ≤ 0.1V），严重超标12倍！',
  },
  {
    id: 'CASE_GROUND',
    vehicleName: '实车案例 B (售后返修车 #208)',
    description: '前照灯弱光，车身曾有钣金修复史。需排查回路接地情况。',
    faultLocation: 'GROUND',
    faultName: '左前翼子板车身主搭铁螺栓生锈松动',
    rFuse: 0.04,
    rRelay: 0.06,
    rLamp: 6.0,
    rGround: 0.85, // 0.85Ω high resistance
    explanation: '车灯负极至蓄电池负极搭铁跨接压降高达 1.47V（标准搭铁压降 ≤ 0.1V），螺栓氧化严重！',
  },
  {
    id: 'CASE_FUSE',
    vehicleName: '实车案例 C (路测验证车 #312)',
    description: '前照灯发黄且偶发闪烁，线束插头无异常。需逐级打表。',
    faultLocation: 'FUSE',
    faultName: '前照灯主保险丝插座簧片退火松旷氧化',
    rFuse: 0.70, // 0.70Ω high resistance
    rRelay: 0.05,
    rLamp: 6.0,
    rGround: 0.06,
    explanation: '保险丝两端跨接电压降测得 1.23V（标准保险丝压降 ≤ 0.05V），插座簧片夹紧力不足！',
  },
];

export function C01VoltageDropScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onComplete,
  hintRequested,
}: C01VoltageDropSceneProps) {
  const assessment = useLevelAssessment('C01');

  React.useEffect(() => {
    if (hintRequested) {
      const stageMap: Record<C01Step, TrainingStageId> = {
        SYMPTOM_AND_HYPOTHESIS: 'cognition',
        LOADED_VOLTAGE_DROP_TEST: 'standard',
        UNLOADED_COUNTEREXAMPLE: 'calculation',
        BLIND_FAULT_ISOLATION: 'blind_test',
        REPAIR_AND_CLOSED_LOOP: 'transfer',
      };
      assessment.requestHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, assessment]);

  // Multimeter global knob state: 'OFF' | 'DCV_20' | 'DCV_2' | 'OHM'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'DCV_20' | 'DCV_2' | 'OHM'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Stage 1: Symptom & Hypothesis
  const [s1IsLoaded, setS1IsLoaded] = useState<boolean>(true);
  const [s1Hypothesis, setS1Hypothesis] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Stage 2: Loaded Voltage Drop Test
  const [s2ProbeMode, setS2ProbeMode] = useState<'SUPPLY' | 'GROUND' | 'BATTERY' | 'LAMP'>('SUPPLY');
  const [s2Decision, setS2Decision] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Stage 3: Unloaded Counterexample
  const [s3IsLoaded, setS3IsLoaded] = useState<boolean>(false);
  const [s3CounterDecision, setS3CounterDecision] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Stage 4: Blind Fault Isolation
  const [blindCaseIndex, setBlindCaseIndex] = useState<number>(0);
  const [redProbeNode, setRedProbeNode] = useState<string>('BAT_POS');
  const [blackProbeNode, setBlackProbeNode] = useState<string>('LAMP_POS');
  const [s4Decision, setS4Decision] = useState<string | null>(null);
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Stage 5: Repair & Closed Loop
  const [repairCleaned, setRepairCleaned] = useState<boolean>(false);
  const [repairPolished, setRepairPolished] = useState<boolean>(false);
  const [repairTightened, setRepairTightened] = useState<boolean>(false);
  const [retestPerformed, setRetestPerformed] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  // Helper for meter knob interaction
  const handleTurnKnob = (knob: 'OFF' | 'DCV_20' | 'DCV_2' | 'OHM') => {
    sounds.click();
    setMeterKnob(knob);
    setMeterWarning(null);
  };

  const requireMeterPowered = () => {
    if (meterKnob === 'OFF') {
      sounds.warningBuzz();
      const stageMap: Record<C01Step, TrainingStageId> = {
        SYMPTOM_AND_HYPOTHESIS: 'cognition',
        LOADED_VOLTAGE_DROP_TEST: 'standard',
        UNLOADED_COUNTEREXAMPLE: 'calculation',
        BLIND_FAULT_ISOLATION: 'blind_test',
        REPAIR_AND_CLOSED_LOOP: 'transfer',
      };
      assessment.recordMeterBlocked(stageMap[currentStep]);
      setMeterWarning('万用表尚未开机！请先将旋钮旋至直流电压挡 (DCV 20V)！');
      return false;
    }
    return true;
  };

  // Base physics calculation for benchmark stages (Stage 1, 2, 3, 5 pre-repair)
  // 12V, 6Ω load, 0.5Ω supply drop, 0.1Ω ground drop
  const basePreRepair = calculateVoltageDropCircuit({
    sourceVoltage: 12.0,
    loadResistance: 6.0,
    supplyDropResistance: 0.5,
    groundDropResistance: 0.1,
    isLoaded: currentStep === 'SYMPTOM_AND_HYPOTHESIS' ? s1IsLoaded : currentStep === 'UNLOADED_COUNTEREXAMPLE' ? s3IsLoaded : true,
  });

  // Post repair physics calculation (supply contact repaired to 0.01Ω)
  const basePostRepair = calculateVoltageDropCircuit({
    sourceVoltage: 12.0,
    loadResistance: 6.0,
    supplyDropResistance: 0.01,
    groundDropResistance: 0.08,
    isLoaded: true,
  });

  // Stage 4 Blind Case calculations
  const activeBlindCase = BLIND_CASES[blindCaseIndex];
  const blindTotalR = activeBlindCase.rFuse + activeBlindCase.rRelay + activeBlindCase.rLamp + activeBlindCase.rGround;
  const blindCurrent = 12.0 / blindTotalR;
  const blindPotentials: Record<string, number> = {
    BAT_POS: 12.0,
    FUSE_OUT: 12.0 - (blindCurrent * activeBlindCase.rFuse),
    RELAY_OUT: 12.0 - (blindCurrent * (activeBlindCase.rFuse + activeBlindCase.rRelay)),
    LAMP_POS: 12.0 - (blindCurrent * (activeBlindCase.rFuse + activeBlindCase.rRelay)),
    LAMP_NEG: blindCurrent * activeBlindCase.rGround,
    GND_STUD: 0.0,
    BAT_NEG: 0.0,
  };

  // Compute DMM Readout text based on step and settings
  const getDmmReadout = () => {
    if (meterKnob === 'OFF') {
      return { value: '----', unit: 'OFF', color: 'text-slate-400' };
    }

    if (currentStep === 'SYMPTOM_AND_HYPOTHESIS') {
      if (!s1IsLoaded) {
        return { value: '12.00', unit: 'V DC (空载开路)', color: 'text-emerald-400' };
      }
      return { value: basePreRepair.lampVoltage.toFixed(2), unit: 'V DC (带载跌落)', color: 'text-amber-400' };
    }

    if (currentStep === 'LOADED_VOLTAGE_DROP_TEST') {
      if (s2ProbeMode === 'SUPPLY') {
        return { value: basePreRepair.supplyVoltageDrop.toFixed(2), unit: 'V (供电跨接压降 ⚠超标)', color: 'text-rose-400' };
      }
      if (s2ProbeMode === 'GROUND') {
        return { value: basePreRepair.groundVoltageDrop.toFixed(2), unit: 'V (搭铁跨接压降 正常)', color: 'text-emerald-400' };
      }
      if (s2ProbeMode === 'BATTERY') {
        return { value: '12.00', unit: 'V (蓄电池带载端压)', color: 'text-emerald-400' };
      }
      return { value: basePreRepair.lampVoltage.toFixed(2), unit: 'V (车灯实际电压)', color: 'text-amber-400' };
    }

    if (currentStep === 'UNLOADED_COUNTEREXAMPLE') {
      if (!s3IsLoaded) {
        return { value: '0.00', unit: 'V (空载I=0 压降消失)', color: 'text-cyan-400' };
      }
      return { value: '0.91', unit: 'V (带载I=1.82A 压降现形)', color: 'text-rose-400' };
    }

    if (currentStep === 'BLIND_FAULT_ISOLATION') {
      const vRed = blindPotentials[redProbeNode] ?? 12.0;
      const vBlack = blindPotentials[blackProbeNode] ?? 0.0;
      const vDiff = Math.abs(vRed - vBlack);
      const isOver = vDiff > 0.3 && (redProbeNode !== 'BAT_POS' || blackProbeNode !== 'BAT_NEG');
      return {
        value: vDiff.toFixed(2),
        unit: `V DC (${redProbeNode} ↔ ${blackProbeNode})`,
        color: isOver ? 'text-rose-400' : 'text-emerald-400',
      };
    }

    if (currentStep === 'REPAIR_AND_CLOSED_LOOP') {
      if (!retestPerformed) {
        return { value: '0.91', unit: 'V (修复前供电侧压降)', color: 'text-rose-400' };
      }
      return { value: basePostRepair.supplyVoltageDrop.toFixed(2), unit: 'V (修复后压降 <0.1V合格)', color: 'text-emerald-400' };
    }

    return { value: '0.00', unit: 'V', color: 'text-emerald-400' };
  };

  const dmmDisplay = getDmmReadout();

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-[580px] p-2 text-slate-800">
      {/* 5-Stage Step Navigation Header */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-100/90 rounded-xl border border-slate-200 text-xs font-bold">
        {[
          { key: 'SYMPTOM_AND_HYPOTHESIS', label: '1. 故障复现与假设' },
          { key: 'LOADED_VOLTAGE_DROP_TEST', label: '2. 规范带载压降测试' },
          { key: 'UNLOADED_COUNTEREXAMPLE', label: '3. 空载误区反例突破' },
          { key: 'BLIND_FAULT_ISOLATION', label: '4. 实车未知高阻盲测' },
          { key: 'REPAIR_AND_CLOSED_LOOP', label: '5. 接触面修复与闭环交车' },
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

      {/* Main Workspace Grid: Left Visual Circuit (SVG) + Right DMM Multimeter */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Visual Circuit Stage Canvas (h-60 / h-64) */}
        <div className="xl:col-span-8 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <strong className="text-slate-100 font-bold text-sm">
                汽车前照灯供电与压降实训台 (12V DC / 24W 纯电阻负载教学线束)
              </strong>
            </div>
            <span className="text-amber-400 font-mono font-semibold">
              回路状态：
              {currentStep === 'REPAIR_AND_CLOSED_LOOP' && retestPerformed
                ? '已修复 (满功率 23.2W)'
                : (currentStep === 'SYMPTOM_AND_HYPOTHESIS' && !s1IsLoaded) ||
                  (currentStep === 'UNLOADED_COUNTEREXAMPLE' && !s3IsLoaded)
                ? '空载断开 (I = 0A)'
                : '带载点亮 (I = 1.82A / 偏暗 19.8W)'}
            </span>
          </div>

          {/* SVG Visual Canvas */}
          <div className="p-3 flex items-center justify-center bg-slate-950/40">
            <svg
              viewBox="0 0 540 180"
              className="w-full h-60 lg:h-64 select-none drop-shadow-md"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Grid backdrop */}
              <defs>
                <pattern id="circuitGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.4" />
                </pattern>
                <filter id="lampGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <rect width="540" height="180" fill="url(#circuitGrid)" />

              {/* Main Wires (Thick 6px lines) */}
              {/* Positive Supply Path (Red): Bat+ (50, 90) -> Fuse (120, 90) -> Switch/Connector (220, 90) -> Lamp+ (360, 90) */}
              <path
                d="M 50 60 L 50 40 L 120 40"
                fill="none"
                stroke="#ef4444"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M 170 40 L 230 40"
                fill="none"
                stroke="#ef4444"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M 290 40 L 370 40 L 370 70"
                fill="none"
                stroke="#ef4444"
                strokeWidth="6"
                strokeLinecap="round"
              />

              {/* Ground Return Path (Blue/Gray): Lamp- (410, 70) -> Ground Bolt (410, 140) -> Bat- (50, 140) -> Bat- (50, 110) */}
              <path
                d="M 410 70 L 410 140 L 50 140 L 50 110"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={
                  (currentStep === 'SYMPTOM_AND_HYPOTHESIS' && !s1IsLoaded) ||
                  (currentStep === 'UNLOADED_COUNTEREXAMPLE' && !s3IsLoaded)
                    ? '6,6'
                    : 'none'
                }
              />

              {/* 12V Battery Module */}
              <g transform="translate(25, 60)">
                <rect x="0" y="0" width="50" height="50" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                <text x="25" y="28" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">12V 蓄电池</text>
                {/* Terminals */}
                <circle cx="25" cy="0" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                <text x="35" y="8" fill="#ef4444" fontSize="12" fontWeight="bold">+</text>
                <circle cx="25" cy="50" r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                <text x="35" y="48" fill="#38bdf8" fontSize="14" fontWeight="bold">-</text>
              </g>

              {/* Main Fuse Module (120, 25) */}
              <g transform="translate(120, 25)">
                <rect x="0" y="0" width="50" height="30" rx="4" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
                <line x1="5" y1="15" x2="45" y2="15" stroke="#fbbf24" strokeWidth="3" />
                <text x="25" y="20" fill="#f1f5f9" fontSize="10" fontWeight="bold" textAnchor="middle">10A 保险</text>
              </g>

              {/* Contact/Connector/Relay Module (230, 20) with fault indicator */}
              <g transform="translate(230, 18)">
                <rect
                  x="0"
                  y="0"
                  width="60"
                  height="44"
                  rx="6"
                  fill="#1e293b"
                  stroke={
                    currentStep === 'REPAIR_AND_CLOSED_LOOP' && retestPerformed
                      ? '#10b981'
                      : '#f43f5e'
                  }
                  strokeWidth="2"
                />
                <text x="30" y="18" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">
                  供电插头/触点
                </text>
                <text
                  x="30"
                  y="34"
                  fill={
                    currentStep === 'REPAIR_AND_CLOSED_LOOP' && retestPerformed
                      ? '#34d399'
                      : '#fb7185'
                  }
                  fontSize="11"
                  fontWeight="black"
                  textAnchor="middle"
                >
                  {currentStep === 'REPAIR_AND_CLOSED_LOOP' && retestPerformed
                    ? 'R ≈ 0.01Ω (良)'
                    : 'R ≈ 0.5Ω (虚接)'}
                </text>
              </g>

              {/* Headlamp Load Module (360, 45) */}
              <g transform="translate(360, 45)">
                {/* Glow ring */}
                <circle
                  cx="30"
                  cy="35"
                  r={
                    currentStep === 'REPAIR_AND_CLOSED_LOOP' && retestPerformed
                      ? 36
                      : (currentStep === 'SYMPTOM_AND_HYPOTHESIS' && !s1IsLoaded) ||
                        (currentStep === 'UNLOADED_COUNTEREXAMPLE' && !s3IsLoaded)
                      ? 0
                      : 26
                  }
                  fill={
                    currentStep === 'REPAIR_AND_CLOSED_LOOP' && retestPerformed
                      ? '#fef08a'
                      : '#f97316'
                  }
                  opacity={
                    currentStep === 'REPAIR_AND_CLOSED_LOOP' && retestPerformed
                      ? '0.6'
                      : '0.35'
                  }
                  filter="url(#lampGlow)"
                />
                {/* Lamp Bulb Body */}
                <circle
                  cx="30"
                  cy="35"
                  r="24"
                  fill={
                    currentStep === 'REPAIR_AND_CLOSED_LOOP' && retestPerformed
                      ? '#ffffff'
                      : (currentStep === 'SYMPTOM_AND_HYPOTHESIS' && !s1IsLoaded) ||
                        (currentStep === 'UNLOADED_COUNTEREXAMPLE' && !s3IsLoaded)
                      ? '#475569'
                      : '#fed7aa'
                  }
                  stroke="#cbd5e1"
                  strokeWidth="2.5"
                />
                {/* Filament */}
                <path
                  d="M 22 45 L 26 28 L 30 40 L 34 28 L 38 45"
                  fill="none"
                  stroke={
                    currentStep === 'REPAIR_AND_CLOSED_LOOP' && retestPerformed
                      ? '#eab308'
                      : (currentStep === 'SYMPTOM_AND_HYPOTHESIS' && !s1IsLoaded) ||
                        (currentStep === 'UNLOADED_COUNTEREXAMPLE' && !s3IsLoaded)
                      ? '#64748b'
                      : '#ea580c'
                  }
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text x="30" y="72" fill="#e2e8f0" fontSize="11" fontWeight="bold" textAnchor="middle">
                  {currentStep === 'REPAIR_AND_CLOSED_LOOP' && retestPerformed
                    ? '24W / 23.2W (耀眼白光)'
                    : (currentStep === 'SYMPTOM_AND_HYPOTHESIS' && !s1IsLoaded) ||
                      (currentStep === 'UNLOADED_COUNTEREXAMPLE' && !s3IsLoaded)
                    ? '24W 前照灯 (已熄灭)'
                    : '24W / 19.8W (昏暗发黄)'}
                </text>
              </g>

              {/* Ground Stud Module (410, 140) */}
              <g transform="translate(390, 130)">
                <circle cx="20" cy="10" r="8" fill="#334155" stroke="#38bdf8" strokeWidth="2" />
                <path d="M 12 24 L 28 24 M 15 28 L 25 28 M 18 32 L 22 32" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <text x="20" y="-4" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">车身搭铁点</text>
              </g>

              {/* Test Lead Indicators */}
              {currentStep === 'LOADED_VOLTAGE_DROP_TEST' && s2ProbeMode === 'SUPPLY' && (
                <g>
                  {/* Red Probe at Bat + (50, 60) */}
                  <circle cx="50" cy="60" r="7" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                  <text x="50" y="52" fill="#ef4444" fontSize="11" fontWeight="black" textAnchor="middle">红表笔(+)</text>
                  {/* Black Probe at Lamp + (370, 40) */}
                  <circle cx="370" cy="40" r="7" fill="#000000" stroke="#ffffff" strokeWidth="2" />
                  <text x="370" y="32" fill="#ffffff" fontSize="11" fontWeight="black" textAnchor="middle">黑表笔(-)</text>
                  {/* Spanning arrow */}
                  <path d="M 55 20 Q 210 -10 365 20" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="5,5" />
                  <rect x="180" y="-2" width="100" height="22" rx="4" fill="#be123c" />
                  <text x="230" y="13" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                    供电压降 0.91V ⚠
                  </text>
                </g>
              )}

              {currentStep === 'LOADED_VOLTAGE_DROP_TEST' && s2ProbeMode === 'GROUND' && (
                <g>
                  {/* Red Probe at Lamp - (410, 70) */}
                  <circle cx="410" cy="70" r="7" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                  <text x="410" y="62" fill="#ef4444" fontSize="11" fontWeight="black" textAnchor="middle">红表笔(+)</text>
                  {/* Black Probe at Bat - (50, 110) */}
                  <circle cx="50" cy="110" r="7" fill="#000000" stroke="#ffffff" strokeWidth="2" />
                  <text x="50" y="130" fill="#ffffff" fontSize="11" fontWeight="black" textAnchor="middle">黑表笔(-)</text>
                  {/* Spanning arrow */}
                  <path d="M 405 160 Q 230 185 55 160" fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="5,5" />
                  <rect x="180" y="160" width="100" height="20" rx="4" fill="#047857" />
                  <text x="230" y="174" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                    搭铁压降 0.18V
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Quick interactive circuit controls bar */}
          <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">实训测量控制：</span>
              {currentStep === 'SYMPTOM_AND_HYPOTHESIS' && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={s1IsLoaded ? 'default' : 'outline'}
                    className={s1IsLoaded ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer' : 'text-slate-300 border-slate-700 cursor-pointer'}
                    onClick={() => {
                      sounds.click();
                      setS1IsLoaded(true);
                      if (meterKnob === 'OFF') setMeterKnob('DCV_20');
                    }}
                  >
                    <Zap size={14} className="mr-1" />
                    插上车灯 (带载 10.9V 发黄)
                  </Button>
                  <Button
                    size="sm"
                    variant={!s1IsLoaded ? 'default' : 'outline'}
                    className={!s1IsLoaded ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' : 'text-slate-300 border-slate-700 cursor-pointer'}
                    onClick={() => {
                      sounds.click();
                      setS1IsLoaded(false);
                      if (meterKnob === 'OFF') setMeterKnob('DCV_20');
                    }}
                  >
                    拔下插头 (空载开路 12.0V)
                  </Button>
                </div>
              )}

              {currentStep === 'LOADED_VOLTAGE_DROP_TEST' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={s2ProbeMode === 'SUPPLY' ? 'default' : 'outline'}
                    className={s2ProbeMode === 'SUPPLY' ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer' : 'text-slate-300 border-slate-700 cursor-pointer'}
                    onClick={() => {
                      sounds.click();
                      setS2ProbeMode('SUPPLY');
                      if (meterKnob === 'OFF') setMeterKnob('DCV_20');
                    }}
                  >
                    供电侧跨接压降 (0.91V ⚠超标)
                  </Button>
                  <Button
                    size="sm"
                    variant={s2ProbeMode === 'GROUND' ? 'default' : 'outline'}
                    className={s2ProbeMode === 'GROUND' ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' : 'text-slate-300 border-slate-700 cursor-pointer'}
                    onClick={() => {
                      sounds.click();
                      setS2ProbeMode('GROUND');
                      if (meterKnob === 'OFF') setMeterKnob('DCV_20');
                    }}
                  >
                    搭铁侧跨接压降 (0.18V 正常)
                  </Button>
                  <Button
                    size="sm"
                    variant={s2ProbeMode === 'BATTERY' ? 'default' : 'outline'}
                    className={s2ProbeMode === 'BATTERY' ? 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer' : 'text-slate-300 border-slate-700 cursor-pointer'}
                    onClick={() => {
                      sounds.click();
                      setS2ProbeMode('BATTERY');
                      if (meterKnob === 'OFF') setMeterKnob('DCV_20');
                    }}
                  >
                    蓄电池带载端压 (12.00V 正常)
                  </Button>
                </div>
              )}

              {currentStep === 'UNLOADED_COUNTEREXAMPLE' && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={!s3IsLoaded ? 'default' : 'outline'}
                    className={!s3IsLoaded ? 'bg-cyan-600 hover:bg-cyan-700 text-white cursor-pointer' : 'text-slate-300 border-slate-700 cursor-pointer'}
                    onClick={() => {
                      sounds.click();
                      setS3IsLoaded(false);
                      if (meterKnob === 'OFF') setMeterKnob('DCV_20');
                    }}
                  >
                    断开负载 (空载 I=0A / 压降为0V)
                  </Button>
                  <Button
                    size="sm"
                    variant={s3IsLoaded ? 'default' : 'outline'}
                    className={s3IsLoaded ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer' : 'text-slate-300 border-slate-700 cursor-pointer'}
                    onClick={() => {
                      sounds.click();
                      setS3IsLoaded(true);
                      if (meterKnob === 'OFF') setMeterKnob('DCV_20');
                    }}
                  >
                    闭合带载 (电流流过 / 压降 0.91V 现形)
                  </Button>
                </div>
              )}

              {currentStep === 'BLIND_FAULT_ISOLATION' && (
                <div className="flex items-center gap-2">
                  <span className="text-amber-300 font-bold">盲盒案例：</span>
                  <span className="text-slate-200">{activeBlindCase.vehicleName}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 text-amber-400 hover:bg-slate-800 cursor-pointer"
                    onClick={() => {
                      sounds.click();
                      setBlindCaseIndex((prev) => (prev + 1) % BLIND_CASES.length);
                      setS4Decision(null);
                      setS4Submitted(false);
                      if (meterKnob === 'OFF') setMeterKnob('DCV_20');
                    }}
                  >
                    <RotateCw size={13} className="mr-1" />
                    🎲 切换排查案例
                  </Button>
                </div>
              )}

              {currentStep === 'REPAIR_AND_CLOSED_LOOP' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    disabled={repairCleaned}
                    variant={repairCleaned ? 'default' : 'outline'}
                    className={repairCleaned ? 'bg-emerald-700 text-white' : 'border-amber-500 text-amber-300 hover:bg-slate-800 cursor-pointer'}
                    onClick={() => {
                      sounds.click();
                      setRepairCleaned(true);
                    }}
                  >
                    1. 喷涂电子触点清洗剂 {repairCleaned && '✓'}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!repairCleaned || repairPolished}
                    variant={repairPolished ? 'default' : 'outline'}
                    className={repairPolished ? 'bg-emerald-700 text-white' : 'border-amber-500 text-amber-300 hover:bg-slate-800 cursor-pointer'}
                    onClick={() => {
                      sounds.click();
                      setRepairPolished(true);
                    }}
                  >
                    2. 1000目细砂纸打磨氧化层 {repairPolished && '✓'}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!repairPolished || repairTightened}
                    variant={repairTightened ? 'default' : 'outline'}
                    className={repairTightened ? 'bg-emerald-700 text-white' : 'border-amber-500 text-amber-300 hover:bg-slate-800 cursor-pointer'}
                    onClick={() => {
                      sounds.click();
                      setRepairTightened(true);
                    }}
                  >
                    3. 紧固插针并涂导电脂 {repairTightened && '✓'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Digital Multimeter Panel (LCD h-32, text-4xl lg:text-5xl font-black) */}
        <div className="xl:col-span-4 flex flex-col justify-between bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gauge size={20} className="text-amber-400" />
                <span className="text-sm font-black tracking-wider text-slate-100">
                  FLUKE-DMM 汽车数字万用表
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                CAT III 600V
              </span>
            </div>

            {/* Big High-Visibility LCD Screen (h-32) */}
            <div className="relative h-32 bg-slate-950 rounded-xl p-3 border-2 border-slate-900 flex flex-col justify-between shadow-inner">
              <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                <span>AUTO RANGE</span>
                <span>{meterKnob === 'OFF' ? 'POWER OFF' : 'DC VOLTAGE'}</span>
              </div>

              {/* Huge Readout (text-4xl lg:text-5xl font-black) */}
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
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { key: 'OFF', label: '关机 (OFF)' },
                { key: 'DCV_20', label: 'DC 20V' },
                { key: 'DCV_2', label: 'DC 2V' },
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

            {/* Stage 4 Probe Selectors */}
            {currentStep === 'BLIND_FAULT_ISOLATION' && (
              <div className="mt-2 p-2 bg-slate-900 rounded-lg border border-slate-700 text-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-rose-400 font-bold">红表笔测点：</span>
                  <select
                    value={redProbeNode}
                    onChange={(e) => {
                      sounds.click();
                      requireMeterPowered();
                      setRedProbeNode(e.target.value);
                    }}
                    className="bg-slate-800 text-slate-200 border border-slate-600 rounded px-2 py-1 text-xs"
                  >
                    <option value="BAT_POS">蓄电池正极柱 (+12V)</option>
                    <option value="FUSE_OUT">保险丝输出端</option>
                    <option value="RELAY_OUT">继电器输出端</option>
                    <option value="LAMP_POS">车灯插头供电引脚</option>
                    <option value="LAMP_NEG">车灯插头搭铁引脚</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-bold">黑表笔测点：</span>
                  <select
                    value={blackProbeNode}
                    onChange={(e) => {
                      sounds.click();
                      requireMeterPowered();
                      setBlackProbeNode(e.target.value);
                    }}
                    className="bg-slate-800 text-slate-200 border border-slate-600 rounded px-2 py-1 text-xs"
                  >
                    <option value="LAMP_POS">车灯插头供电引脚</option>
                    <option value="RELAY_OUT">继电器输出端</option>
                    <option value="FUSE_OUT">保险丝输出端</option>
                    <option value="LAMP_NEG">车灯插头搭铁引脚</option>
                    <option value="GND_STUD">车身主搭铁螺栓 (0V)</option>
                    <option value="BAT_NEG">蓄电池负极柱 (0V)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Interactive Work Order & Decision Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        {/* Stage 1 Work Order */}
        {currentStep === 'SYMPTOM_AND_HYPOTHESIS' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  实训工单 · 假设建立
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 1 诊断决策：对比拔插开路 12.00V 与插头带载 10.91V，确立首选排查假设
                </h3>
              </div>
              <div className="text-right text-xs text-slate-500">
                空载电压：<strong className="text-slate-800">12.00V</strong> ｜ 带载端压：<strong className="text-rose-600">10.91V</strong>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              前照灯在试验台可达满额 24.0W，但在车上实际功率仅 19.8W。拔下插头测得 12V，说明电源开路电动势正常。请根据电气原理确立首选排查假设：
            </p>

            {/* Anti-spoiler options: neutral borders, choice = null */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {[
                { key: 'A', text: '假设 A：供电侧线束或接触件存在高阻虚接，带载产生过大压降 (V=I·R)' },
                { key: 'B', text: '假设 B：车灯灯泡自身损坏，等效电阻变大导致发热不足' },
                { key: 'C', text: '假设 C：蓄电池电解液干涸导致带载失效' },
                { key: 'D', text: '假设 D：车身搭铁彻底开路断开' },
              ].map((opt) => {
                const isSelected = s1Hypothesis === opt.key;
                const isCorrect = opt.key === 'A';
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
                {s1Submitted
                  ? '✓ 假设分析已提交。请进入第2阶段进行跨接压降定量验证。'
                  : '请选择首选排查假设后点击提交工单'}
              </span>
              {!s1Submitted ? (
                <Button
                  disabled={!s1Hypothesis}
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    if (!s1Hypothesis) return;
                    if (s1Hypothesis === 'A') {
                      sounds.success();
                    } else {
                      sounds.warningBuzz();
                      assessment.recordWrong('cognition');
                    }
                    setS1Submitted(true);
                    onStepComplete('SYMPTOM_AND_HYPOTHESIS', {
                      hypothesis: s1Hypothesis,
                      unloadedVoltage: 12.0,
                      loadedVoltage: 10.91,
                      passed: s1Hypothesis === 'A',
                    });
                  }}
                >
                  <CheckCircle2 size={16} className="mr-1" />
                  提交假设分析
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={() => {
                    assessment.completeStage('cognition');
                    assessment.startStage('standard', 'guided');
                    onAdvanceStep();
                  }}
                >
                  进入步骤 2：规范带载跨接测试 <ArrowRight size={16} className="ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stage 2 Work Order */}
        {currentStep === 'LOADED_VOLTAGE_DROP_TEST' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  实训工单 · 跨接压降测量定位
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 2：比对供电侧与搭铁侧跨接压降，判定主要虚接故障区段
                </h3>
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-3">
                <span>供电侧压降：<strong className="text-rose-600 font-bold">0.91 V</strong></span>
                <span>搭铁侧压降：<strong className="text-emerald-600 font-bold">0.18 V</strong></span>
                <span>标准限值：<strong>≤ 0.20 V</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {[
                { key: 'SUPPLY_HIGH', text: '结论 A：供电侧线束插头存在严重接触不良 (0.91V > 0.2V 容限)，为主要故障源' },
                { key: 'GROUND_HIGH', text: '结论 B：搭铁侧存在断路故障，需彻底更换搭铁线' },
                { key: 'BATTERY_FAIL', text: '结论 C：蓄电池带载性能衰退，需申请报废更换' },
                { key: 'NORMAL_ALL', text: '结论 D：两侧压降均在正常范围，灯泡属于正常发黄' },
              ].map((opt) => {
                const isSelected = s2Decision === opt.key;
                const isCorrect = opt.key === 'SUPPLY_HIGH';
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (!s2Submitted) {
                        sounds.click();
                        setS2Decision(opt.key);
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
                {s2Submitted
                  ? '✓ 供电侧 0.91V 压降超标证据确凿。请进入第3阶段探究空载反例。'
                  : '在左侧测量供电侧与搭铁侧压降后，选出确切排查结论'}
              </span>
              {!s2Submitted ? (
                <Button
                  disabled={!s2Decision}
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    if (!s2Decision) return;
                    if (s2Decision === 'SUPPLY_HIGH') {
                      sounds.success();
                    } else {
                      sounds.warningBuzz();
                      assessment.recordWrong('standard');
                    }
                    setS2Submitted(true);
                    onStepComplete('LOADED_VOLTAGE_DROP_TEST', {
                      decision: s2Decision,
                      supplyDrop: 0.91,
                      groundDrop: 0.18,
                      standardLimit: 0.20,
                      passed: s2Decision === 'SUPPLY_HIGH',
                    });
                  }}
                >
                  <CheckCircle2 size={16} className="mr-1" />
                  提交压降诊断工单
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={() => {
                    assessment.completeStage('standard');
                    assessment.startStage('calculation', 'guided');
                    onAdvanceStep();
                  }}
                >
                  进入步骤 3：反例探究突破 <ArrowRight size={16} className="ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stage 3 Work Order */}
        {currentStep === 'UNLOADED_COUNTEREXAMPLE' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                  反例突破 · 物理本质辨析
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 3：为什么拔下插头测得 12.00V 开路电压，绝不能证明供电线路完好？
                </h3>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              在左侧点击“断开负载”与“闭合带载”，观察压降由 0.00V 暴增至 0.91V 的剧变。根据闭合回路欧姆定律与公式 ΔV = I · R 选出科学解释：
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {[
                { key: 'CURRENT_ZERO', text: '解释 A：拔下插头回路电流为0(I=0)，根据ΔV=I·R，无论接触电阻多大压降皆为0，插头呈现12V虚假电位' },
                { key: 'METER_OFFSET', text: '解释 B：万用表电压挡内阻过小导致读数失真' },
                { key: 'LAMP_INDUCTANCE', text: '解释 C：车灯内部产生反向感应电动势抵消了电压' },
                { key: 'GROUND_FALLACY', text: '解释 D：必须使用试灯才能检测到接地开路' },
              ].map((opt) => {
                const isSelected = s3CounterDecision === opt.key;
                const isCorrect = opt.key === 'CURRENT_ZERO';
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (!s3Submitted) {
                        sounds.click();
                        setS3CounterDecision(opt.key);
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
                {s3Submitted
                  ? '✓ 物理反例解析完成：“无载无降，带载现形”。进入第4阶段独立盲测。'
                  : '切换左侧带载与空载状态后，完成反例辨析'}
              </span>
              {!s3Submitted ? (
                <Button
                  disabled={!s3CounterDecision}
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    if (!s3CounterDecision) return;
                    if (s3CounterDecision === 'CURRENT_ZERO') {
                      sounds.success();
                    } else {
                      sounds.warningBuzz();
                      assessment.recordWrong('calculation');
                    }
                    setS3Submitted(true);
                    onStepComplete('UNLOADED_COUNTEREXAMPLE', {
                      decision: s3CounterDecision,
                      passed: s3CounterDecision === 'CURRENT_ZERO',
                    });
                  }}
                >
                  <CheckCircle2 size={16} className="mr-1" />
                  提交反例理解工单
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={() => {
                    assessment.completeStage('calculation');
                    assessment.startStage('blind_test', 'independent');
                    onAdvanceStep();
                  }}
                >
                  进入步骤 4：独立实车盲测 <ArrowRight size={16} className="ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stage 4 Work Order */}
        {currentStep === 'BLIND_FAULT_ISOLATION' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  独立盲测 · 实车案例自主定损
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 4：当前排查对象【{activeBlindCase.vehicleName}】，自主跨接打表定位故障元器件
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                标准：继电器触点压降≤0.1V / 保险丝≤0.05V / 车身搭铁≤0.1V
              </span>
            </div>

            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs text-purple-900">
              <p className="font-semibold">{activeBlindCase.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {[
                { id: 'RELAY', label: '继电器内部触点碳化高阻', desc: '触点氧化导致严重供电侧压降' },
                { id: 'GROUND', label: '车身主搭铁螺栓生锈松动', desc: '搭铁不良导致搭铁侧压降超标' },
                { id: 'FUSE', label: '主保险丝插座退火松旷', desc: '夹紧簧片氧化导致保险两端压降过大' },
              ].map((opt) => {
                const isSelected = s4Decision === opt.id;
                const isCorrect = opt.id === activeBlindCase.faultLocation;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={s4Submitted}
                    onClick={() => {
                      sounds.click();
                      setS4Decision(opt.id);
                    }}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      s4Submitted
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : isSelected
                          ? 'border-rose-400 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                        : isSelected
                        ? 'border-purple-500 bg-purple-50 text-purple-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <strong className="block text-xs">{opt.label}</strong>
                    <span className="text-[11px] text-slate-500">{opt.desc}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {s4Submitted
                  ? `✓ 盲测定位结论已提交：${activeBlindCase.explanation}`
                  : '在左侧移动红黑表笔进行跨接测量，选出损坏部件后提交'}
              </span>
              {!s4Submitted ? (
                <Button
                  disabled={!s4Decision}
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    if (!s4Decision) return;
                    const passed = s4Decision === activeBlindCase.faultLocation;
                    if (passed) {
                      sounds.success();
                    } else {
                      sounds.warningBuzz();
                      assessment.recordWrong('blind_test');
                    }
                    setS4Submitted(true);
                    onStepComplete('BLIND_FAULT_ISOLATION', {
                      caseId: activeBlindCase.id,
                      decision: s4Decision,
                      correctLocation: activeBlindCase.faultLocation,
                      passed,
                    });
                  }}
                >
                  <CheckCircle2 size={16} className="mr-1" />
                  提交独立盲测结论
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={() => {
                    assessment.completeStage('blind_test');
                    assessment.startStage('transfer', 'transfer');
                    onAdvanceStep();
                  }}
                >
                  进入步骤 5：接触面修复与交车 <ArrowRight size={16} className="ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stage 5 Work Order */}
        {currentStep === 'REPAIR_AND_CLOSED_LOOP' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  实训工单 · 修复工艺与闭环验收
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 5：执行接触端子三步标准修复工艺，复测带载压降与恢复功率
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-white ${repairCleaned ? 'bg-emerald-600' : 'bg-slate-400'}`}>1</span>
                <span className={repairCleaned ? 'text-emerald-800 font-bold' : 'text-slate-600'}>触点清洗剂除硫化</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-white ${repairPolished ? 'bg-emerald-600' : 'bg-slate-400'}`}>2</span>
                <span className={repairPolished ? 'text-emerald-800 font-bold' : 'text-slate-600'}>1000目细砂纸打磨氧化</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-white ${repairTightened ? 'bg-emerald-600' : 'bg-slate-400'}`}>3</span>
                <span className={repairTightened ? 'text-emerald-800 font-bold' : 'text-slate-600'}>针脚微变形校正夹紧</span>
              </div>
            </div>

            {repairCleaned && repairPolished && repairTightened && !retestPerformed && (
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-sm font-bold text-amber-900">
                  工艺实施完毕！必须闭合电源重新通电，复测供电侧压降与车灯亮度。
                </span>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    sounds.zap();
                    setRetestPerformed(true);
                    if (meterKnob === 'OFF') setMeterKnob('DCV_20');
                  }}
                >
                  <Sparkles size={16} className="mr-1" />
                  通电闭环复测
                </Button>
              </div>
            )}

            {retestPerformed && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-xs text-emerald-950 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <Sparkles size={16} /> 修复后通电复验结果（带载闭环达成）：
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    供电侧跨接压降：<strong className="text-emerald-700 text-sm">0.02 V</strong> (符合 ≤0.2V 标准)
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    回路工作电流：<strong className="text-emerald-700 text-sm">1.97 A</strong> (修复前 1.82A)
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    车灯恢复功率：<strong className="text-emerald-700 text-sm">23.2 W</strong> (恢复额定白光)
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {s5Submitted
                  ? '✓ 《新能源汽车电器维修竣工检验单》已签署，整车合格交付！'
                  : '完成三步工艺并通电复测合格后，签署竣工单'}
              </span>
              <Button
                disabled={!retestPerformed || s5Submitted}
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                onClick={() => {
                  sounds.success();
                  setS5Submitted(true);
                  onStepComplete('REPAIR_AND_CLOSED_LOOP', {
                    cleaned: repairCleaned,
                    polished: repairPolished,
                    tightened: repairTightened,
                    postRepairDrop: 0.02,
                    postRepairPower: 23.2,
                    passed: true,
                  });
                  assessment.completeStage('transfer');
                  const finalResult = assessment.completeLevel();
                  onComplete?.(finalResult);
                  onAdvanceStep();
                }}
              >
                <Wrench size={16} className="mr-1" />
                签署竣工检验单并交付车辆
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
