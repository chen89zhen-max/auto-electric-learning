'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/src/components/visuals/SoundEffects';
import {
  type D02Step,
  STARTER_MOTOR_COMPONENTS,
  MAGNETIC_FIELD_COMPARISON,
} from './d02Training';
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult, TrainingStageId } from '@/src/assessment/assessmentTypes';
import { evaluateMeterGuard } from '@/src/game/instruments/meterGuard';

interface D02DcMotorSceneProps {
  currentStep: D02Step;
  onStepComplete: (step: D02Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onComplete?: (result: LevelAssessmentResult) => void;
  hintRequested?: boolean;
}

interface MotorBlindCase {
  id: string;
  vehicleName: string;
  symptom: string;
  faultType: 'RELAY_A_OXIDIZED' | 'BRUSH_WORN' | 'TRACK_JAM';
  faultName: string;
  terminal1Voltage: number; // Normal: 12V when UP
  motorResistance: number; // Normal: 2.2Ω
  loadedCurrent: number; // Normal: 3.2A
  explanation: string;
}

const MOTOR_BLIND_CASES: MotorBlindCase[] = [
  {
    id: 'CASE_RELAY_A_OXIDIZED',
    vehicleName: '商务车 #102 (车窗只降不升)',
    symptom: '降窗正常顺畅；按升窗开关时无任何动作，电机完全不转。',
    faultType: 'RELAY_A_OXIDIZED',
    faultName: '升窗继电器 A 常开触点严重烧蚀氧化 (断路/高阻)',
    terminal1Voltage: 0.2, // 0.2V when commanded UP
    motorResistance: 2.2, // Motor itself is completely healthy
    loadedCurrent: 0.0,
    explanation: '按升窗时电机端子 1 电压仅 0.2V，供电严重缺失，拔下打表继电器 A 触点开路！',
  },
  {
    id: 'CASE_BRUSH_WORN',
    vehicleName: '网约出租车 #206 (电机偶发停转运转无力)',
    symptom: '升降车窗速度极其缓慢发飘，敲击门板偶尔又能运转。',
    faultType: 'BRUSH_WORN',
    faultName: '直流电机石墨电刷磨损见底、碳粉堆积虚接',
    terminal1Voltage: 12.0,
    motorResistance: 48.5, // abnormally high resistance (normal ~2.2Ω)
    loadedCurrent: 0.25,
    explanation: '断电测得电机内阻高达 48.5Ω，电刷与换向器接触不良，电流严重受阻无法产生额定转矩！',
  },
  {
    id: 'CASE_TRACK_JAM',
    vehicleName: '越野SUV #309 (车窗上升半途卡死发烫)',
    symptom: '升窗到一半剧烈卡滞停下，门板内升窗开关发烫，保险丝发热。',
    faultType: 'TRACK_JAM',
    faultName: '车窗升降机械导轨严重进沙卡死堵转',
    terminal1Voltage: 12.0,
    motorResistance: 2.2,
    loadedCurrent: 16.8, // 16.8A stall current!
    explanation: '电机带载电流骤升至 16.8A 堵转状态！电气回路完全正常，实为导轨泥槽异物严重机械卡滞！',
  },
];

export function D02DcMotorScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onComplete,
  hintRequested,
}: D02DcMotorSceneProps) {
  const assessment = useLevelAssessment('D02');

  React.useEffect(() => {
    if (hintRequested) {
      const stageMap: Record<D02Step, TrainingStageId> = {
        LORENTZ_FORCE_AND_LEFT_HAND_RULE: 'cognition',
        COMMUTATOR_AND_CONTINUOUS_ROTATION: 'standard',
        H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL: 'calculation',
        BLIND_DC_MOTOR_FAULT_ISOLATION: 'blind_test',
        ENGINEERING_REPAIR_AND_COMMISSIONING: 'transfer',
      };
      assessment.requestHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, assessment]);

  // Multimeter Knob: 'OFF' | 'DCV_20' | 'OHM_200' | 'DCA_20'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'DCV_20' | 'OHM_200' | 'DCA_20'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Step 1: Lorentz Force & Left Hand Rule
  const [s1MagnetNTop, setS1MagnetNTop] = useState<boolean>(true);
  const [s1CurrentOut, setS1CurrentOut] = useState<boolean>(true);
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Step 2: Commutator & Starter Structure & Rotating Field
  const [s2HasCommutator, setS2HasCommutator] = useState<boolean>(false);
  const [s2SubTab, setS2SubTab] = useState<'EXPERIMENT' | 'STARTER_MAP' | 'ROTATING_FIELD'>('EXPERIMENT');
  const [s2Choice, setS2Choice] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: H-Bridge Control
  const [s3BridgeMode, setS3BridgeMode] = useState<'STOP' | 'UP' | 'DOWN' | 'BRAKE'>('STOP');
  const [s3Observed, setS3Observed] = useState<boolean>(false);
  const [s3Choice, setS3Choice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Step 4: Blind Fault
  const [blindIndex, setBlindIndex] = useState<number>(0);
  const [s4TestTarget, setS4TestTarget] = useState<'VOLT' | 'RES' | 'CURR'>('VOLT');
  const [s4Choice, setS4Choice] = useState<string | null>(null);
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Step 5: Engineering Repair
  const [s5Repaired, setS5Repaired] = useState<boolean>(false);
  const [s5TestDir, setS5TestDir] = useState<'UP' | 'DOWN'>('UP');
  const [s5WorkOrderSigned, setS5WorkOrderSigned] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  const activeBlind = MOTOR_BLIND_CASES[blindIndex];

  // Multimeter Anti-misoperation guard
  const requireMeterPowered = (expected: 'DCV_20' | 'OHM_200' | 'DCA_20'): boolean => {
    const stageMap: Record<D02Step, TrainingStageId> = {
      LORENTZ_FORCE_AND_LEFT_HAND_RULE: 'cognition',
      COMMUTATOR_AND_CONTINUOUS_ROTATION: 'standard',
      H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL: 'calculation',
      BLIND_DC_MOTOR_FAULT_ISOLATION: 'blind_test',
      ENGINEERING_REPAIR_AND_COMMISSIONING: 'transfer',
    };
    const guard = evaluateMeterGuard({
      currentMode: meterKnob,
      expectedMode: expected,
      circuitPowered: expected !== 'OHM_200',
      resistanceMeasurement: expected === 'OHM_200',
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

  return (
    <div className="flex flex-col flex-1 min-h-[580px] w-full bg-slate-900 text-white rounded-xl p-4 lg:p-6 shadow-2xl border border-slate-800 space-y-6">
      {/* Warning toast */}
      {meterWarning && (
        <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{meterWarning}</span>
          </div>
          <button
            onClick={() => setMeterWarning(null)}
            className="text-xs px-2 py-1 bg-amber-500/30 hover:bg-amber-500/50 rounded text-amber-100"
          >
            知道了
          </button>
        </div>
      )}

      {/* Main interactive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left: Motor Physics & H-Bridge Visualizer (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <RotateCw className="w-5 h-5 text-sky-400 animate-spin" />
              <span className="font-semibold text-slate-200">直流电动机受力、换向与 H 桥控制实验台</span>
            </div>
            <div className="text-xs px-2.5 py-1 bg-slate-800 text-sky-300 rounded font-mono">
              {currentStep === 'LORENTZ_FORCE_AND_LEFT_HAND_RULE' && '步骤1: 左手定则与受力'}
              {currentStep === 'COMMUTATOR_AND_CONTINUOUS_ROTATION' && '步骤2: 换向器与连续旋转'}
              {currentStep === 'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL' && '步骤3: H桥正反转'}
              {currentStep === 'BLIND_DC_MOTOR_FAULT_ISOLATION' && `步骤4: 盲测排故 (${blindIndex + 1}/3)`}
              {currentStep === 'ENGINEERING_REPAIR_AND_COMMISSIONING' && '步骤5: 工程修复与交车'}
            </div>
          </div>

          {/* SVG Visual Canvas */}
          <div className="my-4 relative flex items-center justify-center min-h-[300px]">
            <svg
              className="w-full h-72 lg:h-80 select-none"
              viewBox="0 0 700 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Defs */}
              <defs>
                <pattern id="d02-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="1" />
                </pattern>
                <linearGradient id="nMagnet" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
                <linearGradient id="sMagnet" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              <rect width="700" height="320" fill="url(#d02-grid)" rx="8" />

              {/* Step 1 & 2 Motor Physical Core (Left/Center: 80 - 450) */}
              {/* Permanent Stator Magnets */}
              <g>
                {/* Upper Pole */}
                <path
                  d="M 120 40 L 260 40 C 260 70 230 85 190 85 C 150 85 120 70 120 40 Z"
                  fill={s1MagnetNTop ? 'url(#nMagnet)' : 'url(#sMagnet)'}
                />
                <text x="190" y="65" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">
                  {s1MagnetNTop ? 'N 极' : 'S 极'}
                </text>

                {/* Magnetic Flux Lines (from N to S) */}
                <g stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6">
                  <line x1="150" y1="85" x2="150" y2="235" />
                  <line x1="190" y1="85" x2="190" y2="235" />
                  <line x1="230" y1="85" x2="230" y2="235" />
                </g>

                {/* Lower Pole */}
                <path
                  d="M 120 280 L 260 280 C 260 250 230 235 190 235 C 150 235 120 250 120 280 Z"
                  fill={s1MagnetNTop ? 'url(#sMagnet)' : 'url(#nMagnet)'}
                />
                <text x="190" y="265" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">
                  {s1MagnetNTop ? 'S 极' : 'N 极'}
                </text>
              </g>

              {/* Armature Rotor and Coil */}
              <g transform="translate(190, 160)">
                {/* Armature Cylinder */}
                <circle cx="0" cy="0" r="50" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                <circle cx="0" cy="0" r="14" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />

                {/* Step 1 Conductor Simulation */}
                {currentStep === 'LORENTZ_FORCE_AND_LEFT_HAND_RULE' && (
                  <g>
                    {/* Conductor cross section */}
                    <circle cx="0" cy="0" r="22" fill="#eab308" stroke="#ca8a04" strokeWidth="3" />
                    {s1CurrentOut ? (
                      // Dot for current coming OUT of page (towards observer)
                      <circle cx="0" cy="0" r="6" fill="#0f172a" />
                    ) : (
                      // Cross for current going INTO page
                      <path d="M -8 -8 L 8 8 M -8 8 L 8 -8" stroke="#0f172a" strokeWidth="3" />
                    )}
                    {/* Lorentz force arrow */}
                    {(() => {
                      // If N on top, B is DOWN.
                      // If current OUT, left hand palm faces UP (to meet N), fingers point OUT, thumb points RIGHT.
                      // If current IN, thumb points LEFT.
                      // If S on top, B is UP.
                      // If current OUT, palm faces DOWN, fingers OUT, thumb points LEFT.
                      const forceRight = (s1MagnetNTop && s1CurrentOut) || (!s1MagnetNTop && !s1CurrentOut);
                      return (
                        <g>
                          <line
                            x1="0"
                            y1="0"
                            x2={forceRight ? '70' : '-70'}
                            y2="0"
                            stroke="#10b981"
                            strokeWidth="5"
                            markerEnd="url(#arrow)"
                          />
                          <polygon
                            points={forceRight ? '65,-8 80,0 65,8' : '-65,-8 -80,0 -65,8'}
                            fill="#10b981"
                          />
                          <text
                            x={forceRight ? '85' : '-85'}
                            y="5"
                            textAnchor={forceRight ? 'start' : 'end'}
                            fill="#10b981"
                            fontSize="13"
                            fontWeight="black"
                          >
                            安培力 F
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}

                {/* Step 2 Commutator & Continuous Rotation Simulation */}
                {currentStep === 'COMMUTATOR_AND_CONTINUOUS_ROTATION' && (
                  <g>
                    {/* Coil loop */}
                    <line x1="-35" y1="0" x2="35" y2="0" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
                    <circle cx="-35" cy="0" r="7" fill="#ef4444" />
                    <circle cx="35" cy="0" r="7" fill="#38bdf8" />
                    {/* Rotation indicator or stall wobble */}
                    {s2HasCommutator ? (
                      <g className="animate-spin" style={{ transformOrigin: '0px 0px', animationDuration: '1.2s' }}>
                        <path d="M 0 -35 A 35 35 0 0 1 35 0" stroke="#10b981" strokeWidth="3" fill="none" />
                        <polygon points="32,-5 42,3 32,8" fill="#10b981" />
                      </g>
                    ) : (
                      <g>
                        <text x="0" y="70" textAnchor="middle" fill="#f43f5e" fontSize="12" fontWeight="bold">
                          ⚠️ 无换向器: 平衡位置转矩反向卡滞振荡！
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* Steps 3, 4, 5: Spinning in H-bridge */}
                {['H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL', 'BLIND_DC_MOTOR_FAULT_ISOLATION', 'ENGINEERING_REPAIR_AND_DELIVERY'].includes(
                  currentStep
                ) && (
                  <g>
                    {/* Rotor coil segments */}
                    <line x1="-32" y1="-20" x2="32" y2="20" stroke="#f59e0b" strokeWidth="4" />
                    <line x1="-32" y1="20" x2="32" y2="-20" stroke="#f59e0b" strokeWidth="4" />
                    {/* Dynamic spin based on H-bridge mode */}
                    {(() => {
                      const isUp =
                        (currentStep === 'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL' && s3BridgeMode === 'UP') ||
                        (currentStep === 'ENGINEERING_REPAIR_AND_COMMISSIONING' && s5Repaired && s5TestDir === 'UP');
                      const isDown =
                        (currentStep === 'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL' && s3BridgeMode === 'DOWN') ||
                        (currentStep === 'ENGINEERING_REPAIR_AND_COMMISSIONING' && s5Repaired && s5TestDir === 'DOWN');

                      if (isUp) {
                        return (
                          <g className="animate-spin" style={{ transformOrigin: '0px 0px', animationDuration: '0.8s' }}>
                            <path d="M -30 0 A 30 30 0 0 1 0 -30" stroke="#38bdf8" strokeWidth="4" fill="none" />
                            <polygon points="-3, -35 8, -28 -3, -22" fill="#38bdf8" />
                          </g>
                        );
                      }
                      if (isDown) {
                        return (
                          <g className="animate-spin" style={{ transformOrigin: '0px 0px', animationDuration: '0.8s', animationDirection: 'reverse' }}>
                            <path d="M 0 -30 A 30 30 0 0 1 30 0" stroke="#eab308" strokeWidth="4" fill="none" />
                            <polygon points="35, -3 28, 8 22, -3" fill="#eab308" />
                          </g>
                        );
                      }
                      return null;
                    })()}
                  </g>
                )}
              </g>

              {/* Right Side: Car Window Simulation Frame (x: 480 - 660) */}
              <g transform="translate(480, 40)">
                {/* Window door frame */}
                <rect x="0" y="0" width="180" height="240" rx="10" fill="#0f172a" stroke="#334155" strokeWidth="4" />
                <rect x="15" y="15" width="150" height="150" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                <text x="90" y="210" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">
                  车门电动车窗滑轨
                </text>

                {/* Window glass panel (animated position) */}
                {(() => {
                  let glassY = 70; // middle
                  if (currentStep === 'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL') {
                    if (s3BridgeMode === 'UP') glassY = 15;
                    else if (s3BridgeMode === 'DOWN') glassY = 115;
                  } else if (currentStep === 'ENGINEERING_REPAIR_AND_COMMISSIONING') {
                    if (s5TestDir === 'UP') glassY = 15;
                    else if (s5TestDir === 'DOWN') glassY = 115;
                  } else if (currentStep === 'BLIND_DC_MOTOR_FAULT_ISOLATION' && activeBlind.faultType === 'TRACK_JAM') {
                    glassY = 65; // stuck halfway
                  }
                  return (
                    <g>
                      <rect
                        x="20"
                        y={glassY}
                        width="140"
                        height="100"
                        rx="3"
                        fill="#38bdf8"
                        fillOpacity="0.25"
                        stroke="#0284c7"
                        strokeWidth="2"
                        className="transition-all duration-700 ease-in-out"
                      />
                      <line x1="30" y1={glassY + 25} x2="80" y2={glassY + 75} stroke="#ffffff" strokeWidth="2" strokeOpacity="0.4" />
                      <line x1="90" y1={glassY + 20} x2="130" y2={glassY + 60} stroke="#ffffff" strokeWidth="2" strokeOpacity="0.4" />
                    </g>
                  );
                })()}

                {/* Mechanical Obstacle / Jam icon in stage 4 */}
                {currentStep === 'BLIND_DC_MOTOR_FAULT_ISOLATION' && activeBlind.faultType === 'TRACK_JAM' && (
                  <g transform="translate(145, 60)">
                    <circle cx="8" cy="8" r="10" fill="#ef4444" />
                    <text x="8" y="12" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="black">
                      !
                    </text>
                  </g>
                )}
              </g>

              {/* Bottom Wiring / H-Bridge labels */}
              <text x="350" y="295" textAnchor="middle" fill="#64748b" fontSize="12">
                端子1 (正极/负极切换) ⟵ 直流电机电枢绕组 (2.2Ω) ⟶ 端子2 (负极/正极切换)
              </text>
            </svg>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg">
            {currentStep === 'LORENTZ_FORCE_AND_LEFT_HAND_RULE' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sounds.click();
                    setS1MagnetNTop(!s1MagnetNTop);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-sky-200"
                >
                  翻转磁极 (当前: {s1MagnetNTop ? '上N下S' : '上S下N'})
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS1CurrentOut(!s1CurrentOut);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-amber-200"
                >
                  翻转电流 (当前: {s1CurrentOut ? '由内向外 ⊙' : '由外向内 ⊗'})
                </button>
              </div>
            )}

            {currentStep === 'COMMUTATOR_AND_CONTINUOUS_ROTATION' && (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-400 font-semibold">认知维度:</span>
                  {[
                    { key: 'EXPERIMENT', label: '1. 换向器仿真实验' },
                    { key: 'STARTER_MAP', label: '2. 实车起动机6大结构' },
                    { key: 'ROTATING_FIELD', label: '3. 单相 vs 三相旋转磁场' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        sounds.click();
                        setS2SubTab(tab.key as any);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                        s2SubTab === tab.key
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {s2SubTab === 'EXPERIMENT' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        sounds.click();
                        setS2HasCommutator(false);
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-bold ${
                        !s2HasCommutator ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      无换向器反例 (平衡位置卡滞)
                    </button>
                    <button
                      onClick={() => {
                        sounds.zap();
                        setS2HasCommutator(true);
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-bold ${
                        s2HasCommutator ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      装配换向器与电刷 (单向连续运转)
                    </button>
                  </div>
                )}

                {s2SubTab === 'STARTER_MAP' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-slate-900/90 rounded-lg border border-slate-800 text-xs">
                    {STARTER_MOTOR_COMPONENTS.map((comp) => (
                      <div key={comp.id} className="p-2 bg-slate-950/70 rounded border border-slate-800 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sky-300">{comp.name}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1 py-0.5 rounded">{comp.location}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">{comp.role}</p>
                      </div>
                    ))}
                  </div>
                )}

                {s2SubTab === 'ROTATING_FIELD' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs">
                    <div className="p-2.5 bg-slate-950/70 rounded border border-slate-800 flex flex-col gap-1.5">
                      <span className="font-bold text-rose-400">{MAGNETIC_FIELD_COMPARISON.singlePhase.name}</span>
                      <p className="text-[11px] text-slate-300">{MAGNETIC_FIELD_COMPARISON.singlePhase.description}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.5 bg-rose-950/60 text-rose-300 rounded border border-rose-900">
                          不能自起动
                        </span>
                        <span>必须借机械电刷/电容</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-950/70 rounded border border-slate-800 flex flex-col gap-1.5">
                      <span className="font-bold text-emerald-400">{MAGNETIC_FIELD_COMPARISON.threePhase.name}</span>
                      <p className="text-[11px] text-slate-300">{MAGNETIC_FIELD_COMPARISON.threePhase.description}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.5 bg-emerald-950/60 text-emerald-300 rounded border border-emerald-900">
                          120° 空间对称
                        </span>
                        <span>无电刷天然平滑旋转</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">H桥控制:</span>
                <button
                  onClick={() => {
                    sounds.click();
                    setS3BridgeMode('STOP');
                    setS3Observed(true);
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${s3BridgeMode === 'STOP' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  00 停止 (均接地)
                </button>
                <button
                  onClick={() => {
                    sounds.zap();
                    setS3BridgeMode('UP');
                    setS3Observed(true);
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${s3BridgeMode === 'UP' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-300'}`}
                >
                  10 升窗 (正转)
                </button>
                <button
                  onClick={() => {
                    sounds.zap();
                    setS3BridgeMode('DOWN');
                    setS3Observed(true);
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${s3BridgeMode === 'DOWN' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-800 text-slate-300'}`}
                >
                  01 降窗 (反转)
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS3BridgeMode('BRAKE');
                    setS3Observed(true);
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${s3BridgeMode === 'BRAKE' ? 'bg-rose-700 text-white font-bold' : 'bg-slate-800 text-slate-300'}`}
                >
                  11 制动停转 (等电位)
                </button>
              </div>
            )}

            {currentStep === 'BLIND_DC_MOTOR_FAULT_ISOLATION' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">测量项目:</span>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4TestTarget('VOLT');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${s4TestTarget === 'VOLT' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  升窗端子1电压
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4TestTarget('RES');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${s4TestTarget === 'RES' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  电机线圈静态阻值
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4TestTarget('CURR');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${s4TestTarget === 'CURR' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  运转工作电流
                </button>
              </div>
            )}

            {currentStep === 'ENGINEERING_REPAIR_AND_COMMISSIONING' && (
              <div className="flex items-center gap-3">
                <button
                  disabled={s5Repaired}
                  onClick={() => {
                    sounds.success();
                    setS5Repaired(true);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${
                    s5Repaired ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/50' : 'bg-sky-600 hover:bg-sky-500 text-white'
                  }`}
                >
                  {s5Repaired ? '✅ 电刷/继电器/滑轨润滑已完成' : '🔧 执行综合工程修复'}
                </button>
                {s5Repaired && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        sounds.click();
                        setS5TestDir('UP');
                      }}
                      className={`px-2.5 py-1 rounded text-xs ${s5TestDir === 'UP' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                    >
                      测试升窗
                    </button>
                    <button
                      onClick={() => {
                        sounds.click();
                        setS5TestDir('DOWN');
                      }}
                      className={`px-2.5 py-1 rounded text-xs ${s5TestDir === 'DOWN' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                    >
                      测试降窗
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Multimeter & Stage Form (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Universal Multimeter */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-300">工业级万用表 (VC890D)</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                旋钮: {meterKnob === 'OFF' ? '关机 OFF' : meterKnob}
              </span>
            </div>

            {/* LCD Display */}
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-lg p-3 my-3 text-center">
              <div className="text-[10px] text-emerald-400/70 font-mono tracking-widest uppercase mb-1">
                {meterKnob === 'DCV_20'
                  ? 'DC VOLTAGE (20V)'
                  : meterKnob === 'OHM_200'
                  ? 'RESISTANCE (200Ω)'
                  : meterKnob === 'DCA_20'
                  ? 'DC CURRENT (20A)'
                  : 'POWER OFF'}
              </div>
              <div className="text-4xl lg:text-5xl font-mono font-black text-emerald-400 tracking-tight">
                {(() => {
                  if (meterKnob === 'OFF') return '----';
                  if (meterKnob === 'DCV_20') {
                    if (currentStep === 'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL') {
                      if (s3BridgeMode === 'UP') return '+12.02 V';
                      if (s3BridgeMode === 'DOWN') return '-12.02 V';
                      return '0.00 V';
                    }
                    if (currentStep === 'BLIND_DC_MOTOR_FAULT_ISOLATION') {
                      if (s4TestTarget === 'VOLT') return `${activeBlind.terminal1Voltage.toFixed(2)} V`;
                    }
                    return '12.00 V';
                  }
                  if (meterKnob === 'OHM_200') {
                    if (currentStep === 'BLIND_DC_MOTOR_FAULT_ISOLATION') {
                      if (s4TestTarget === 'RES') return `${activeBlind.motorResistance.toFixed(1)} Ω`;
                    }
                    return '2.2 Ω';
                  }
                  if (meterKnob === 'DCA_20') {
                    if (currentStep === 'BLIND_DC_MOTOR_FAULT_ISOLATION') {
                      if (s4TestTarget === 'CURR') return `${activeBlind.loadedCurrent.toFixed(2)} A`;
                    }
                    if (currentStep === 'ENGINEERING_REPAIR_AND_COMMISSIONING') {
                      return s5Repaired ? (s5TestDir === 'UP' ? '3.20 A' : '2.80 A') : '0.00 A';
                    }
                    return '3.20 A';
                  }
                  return '0.00';
                })()}
              </div>
            </div>

            {/* Multimeter Knob Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => {
                  sounds.click();
                  setMeterKnob('OFF');
                }}
                className={`py-1.5 px-1 text-xs rounded font-mono font-bold ${
                  meterKnob === 'OFF' ? 'bg-rose-700 text-white ring-2 ring-rose-400' : 'bg-slate-800 text-slate-300'
                }`}
              >
                OFF 关机
              </button>
              <button
                onClick={() => {
                  sounds.click();
                  setMeterKnob('DCV_20');
                  setMeterWarning(null);
                }}
                className={`py-1.5 px-1 text-xs rounded font-mono font-bold ${
                  meterKnob === 'DCV_20' ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-slate-800 text-slate-300'
                }`}
              >
                DCV 20V
              </button>
              <button
                onClick={() => {
                  sounds.click();
                  setMeterKnob('OHM_200');
                  setMeterWarning(null);
                }}
                className={`py-1.5 px-1 text-xs rounded font-mono font-bold ${
                  meterKnob === 'OHM_200' ? 'bg-amber-600 text-white ring-2 ring-amber-400' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Ω 200Ω
              </button>
              <button
                onClick={() => {
                  sounds.click();
                  setMeterKnob('DCA_20');
                  setMeterWarning(null);
                }}
                className={`py-1.5 px-1 text-xs rounded font-mono font-bold ${
                  meterKnob === 'DCA_20' ? 'bg-sky-600 text-white ring-2 ring-sky-400' : 'bg-slate-800 text-slate-300'
                }`}
              >
                DCA 20A
              </button>
            </div>
          </div>

          {/* Form & Assessment Panel (Zero-spoiler!) */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            {/* Step 1 Question */}
            {currentStep === 'LORENTZ_FORCE_AND_LEFT_HAND_RULE' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-sky-300">
                  【步骤1定则判定】在当前上 N 下 S、电流由内向外 (⊙) 的状态下，左手定则得出的安培力方向是？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'RIGHT', text: '向右 (手心向上对准N极，四指指向纸外，大拇指指向右侧)' },
                    { id: 'LEFT', text: '向左 (磁场对电流向左排斥)' },
                    { id: 'UP', text: '向上 (沿磁力线方向运动)' },
                  ].map((opt) => {
                    const isSelected = s1Choice === opt.id;
                    const isCorrect = opt.id === 'RIGHT';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s1Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-sky-500 bg-sky-950/40 text-sky-200';
                    }
                    return (
                      <button
                        key={opt.id}
                        disabled={s1Submitted}
                        onClick={() => {
                          sounds.click();
                          setS1Choice(opt.id);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${borderClass}`}
                      >
                        <span className="font-bold mr-1.5">•</span> {opt.text}
                      </button>
                    );
                  })}
                </div>
                {!s1Submitted ? (
                  <Button
                    disabled={!s1Choice}
                    onClick={() => {
                      if (s1Choice === 'RIGHT') {
                        sounds.success();
                        setS1Submitted(true);
                        onStepComplete('LORENTZ_FORCE_AND_LEFT_HAND_RULE', { choice: s1Choice });
                      } else {
                        sounds.warningBuzz();
                        assessment.recordWrong('cognition');
                        setS1Submitted(true);
                      }
                    }}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-xs font-semibold py-2"
                  >
                    提交受力方向判别
                  </Button>
                ) : s1Choice === 'RIGHT' ? (
                  <Button
                    onClick={() => {
                      assessment.completeStage('cognition');
                      assessment.startStage('standard');
                      onAdvanceStep();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    完全正确！进入换向器与连续旋转实训 <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setS1Submitted(false);
                      setS1Choice(null);
                    }}
                    variant="outline"
                    className="w-full text-xs"
                  >
                    重新根据左手定则分析
                  </Button>
                )}
              </div>
            )}

            {/* Step 2 Question */}
            {currentStep === 'COMMUTATOR_AND_CONTINUOUS_ROTATION' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-sky-300">
                  【步骤2换向器作用】为什么直流电动机必须装配半圆铜环换向器和电刷？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '当线圈刚转过平衡位置时自动反转线圈电流方向，使电磁转矩始终保持同向，维持连续旋转' },
                    { id: 'B', text: '换向器是为了增加电机的内部电阻以节省电量' },
                    { id: 'C', text: '换向器是为了把直流电变成三相高压交流电' },
                  ].map((opt) => {
                    const isSelected = s2Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s2Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-sky-500 bg-sky-950/40 text-sky-200';
                    }
                    return (
                      <button
                        key={opt.id}
                        disabled={s2Submitted}
                        onClick={() => {
                          sounds.click();
                          setS2Choice(opt.id);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${borderClass}`}
                      >
                        <span className="font-bold mr-1.5">•</span> {opt.text}
                      </button>
                    );
                  })}
                </div>
                {!s2Submitted ? (
                  <Button
                    disabled={!s2Choice}
                    onClick={() => {
                      if (s2Choice === 'A') {
                        sounds.success();
                        setS2Submitted(true);
                        onStepComplete('COMMUTATOR_AND_CONTINUOUS_ROTATION', { choice: s2Choice });
                      } else {
                        sounds.warningBuzz();
                        assessment.recordWrong('standard');
                        setS2Submitted(true);
                      }
                    }}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-xs font-semibold py-2"
                  >
                    提交换向原理分析
                  </Button>
                ) : s2Choice === 'A' ? (
                  <Button
                    onClick={() => {
                      assessment.completeStage('standard');
                      assessment.startStage('calculation');
                      onAdvanceStep();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    分析透彻！进入双继电器 H 桥控制实战 <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setS2Submitted(false);
                      setS2Choice(null);
                    }}
                    variant="outline"
                    className="w-full text-xs"
                  >
                    重新思考
                  </Button>
                )}
              </div>
            )}

            {/* Step 3 Question */}
            {currentStep === 'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-sky-300">
                  【步骤3车窗控制】双继电器 H 桥实现升窗与降窗的电路本质是？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '通过切换继电器触点，翻转施加在电机两端的电压极性 (+12V/GND 与 GND/+12V)，使转矩反向' },
                    { id: 'B', text: '继电器吸合改变了电机的电阻，导致转速变化' },
                    { id: 'C', text: '继电器吸合改变了车身搭铁参考点' },
                  ].map((opt) => {
                    const isSelected = s3Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s3Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-sky-500 bg-sky-950/40 text-sky-200';
                    }
                    return (
                      <button
                        key={opt.id}
                        disabled={s3Submitted}
                        onClick={() => {
                          sounds.click();
                          setS3Choice(opt.id);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${borderClass}`}
                      >
                        <span className="font-bold mr-1.5">•</span> {opt.text}
                      </button>
                    );
                  })}
                </div>
                {!s3Submitted ? (
                  <Button
                    disabled={!s3Choice || !s3Observed}
                    onClick={() => {
                      if (s3Choice === 'A') {
                        sounds.success();
                        setS3Submitted(true);
                        onStepComplete('H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL', { choice: s3Choice });
                      } else {
                        sounds.warningBuzz();
                        assessment.recordWrong('calculation');
                        setS3Submitted(true);
                      }
                    }}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-xs font-semibold py-2"
                  >
                    {!s3Observed ? '请先在左侧操作升窗/降窗按钮' : '提交 H 桥极性分析'}
                  </Button>
                ) : s3Choice === 'A' ? (
                  <Button
                    onClick={() => {
                      assessment.completeStage('calculation');
                      assessment.startStage('blind_test');
                      onAdvanceStep();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    逻辑严谨！进入独立盲测排故 <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setS3Submitted(false);
                      setS3Choice(null);
                    }}
                    variant="outline"
                    className="w-full text-xs"
                  >
                    重新思考
                  </Button>
                )}
              </div>
            )}

            {/* Step 4 Question */}
            {currentStep === 'BLIND_DC_MOTOR_FAULT_ISOLATION' && (
              <div className="space-y-3">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded text-xs">
                  <div className="font-bold text-sky-300">{activeBlind.vehicleName}</div>
                  <div className="text-slate-400">{activeBlind.symptom}</div>
                </div>
                <div className="text-xs font-semibold text-sky-300">
                  结合打表测得的数据，判定故障真因：
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'RELAY_A_OXIDIZED', text: '升窗继电器 A 触点严重氧化 (升窗端子1无供电电压 0.2V)' },
                    { id: 'BRUSH_WORN', text: '电机石墨电刷磨损见底、碳粉积碳 (内阻飙升至 48.5Ω，电流微弱)' },
                    { id: 'TRACK_JAM', text: '机械滑轨异物严重卡死 (电机堵转，电流狂飙至 16.8A 发烫)' },
                  ].map((opt) => {
                    const isSelected = s4Choice === opt.id;
                    const isCorrect = opt.id === activeBlind.faultType;
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s4Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-sky-500 bg-sky-950/40 text-sky-200';
                    }
                    return (
                      <button
                        key={opt.id}
                        disabled={s4Submitted}
                        onClick={() => {
                          sounds.click();
                          setS4Choice(opt.id);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${borderClass}`}
                      >
                        <span className="font-bold mr-1.5">•</span> {opt.text}
                      </button>
                    );
                  })}
                </div>
                {!s4Submitted ? (
                  <Button
                    disabled={!s4Choice}
                    onClick={() => {
                      const expectedMode = activeBlind.faultType === 'BRUSH_WORN' ? 'OHM_200' : activeBlind.faultType === 'TRACK_JAM' ? 'DCA_20' : 'DCV_20';
                      if (!requireMeterPowered(expectedMode)) {
                        return;
                      }
                      if (s4Choice === activeBlind.faultType) {
                        sounds.success();
                        setS4Submitted(true);
                        onStepComplete('BLIND_DC_MOTOR_FAULT_ISOLATION', { caseId: activeBlind.id, choice: s4Choice });
                      } else {
                        sounds.warningBuzz();
                        assessment.recordWrong('blind_test');
                        setS4Submitted(true);
                      }
                    }}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-xs font-semibold py-2"
                  >
                    提交盲测诊断结论
                  </Button>
                ) : s4Choice === activeBlind.faultType ? (
                  <Button
                    onClick={() => {
                      if (blindIndex < MOTOR_BLIND_CASES.length - 1) {
                        setBlindIndex(blindIndex + 1);
                        setS4Choice(null);
                        setS4Submitted(false);
                      } else {
                        assessment.completeStage('blind_test');
                        assessment.startStage('transfer', 'transfer');
                        onAdvanceStep();
                      }
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    {blindIndex < MOTOR_BLIND_CASES.length - 1 ? '正确！进入下一个电机盲测案例' : '盲测全通！进入实车修复与交车'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setS4Submitted(false);
                      setS4Choice(null);
                    }}
                    variant="outline"
                    className="w-full text-xs"
                  >
                    重新打表排查
                  </Button>
                )}
              </div>
            )}

            {/* Step 5 Question */}
            {currentStep === 'ENGINEERING_REPAIR_AND_COMMISSIONING' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-sky-300">
                  【步骤5交付验收】修复后通电试车，核验各项标准：
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>1. 电机升窗带载工作电流:</span>
                    <span className="font-mono text-emerald-400 font-bold">3.20 A (标准 2.5A~4.0A 合格)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>2. 电机静态线圈绕组电阻:</span>
                    <span className="font-mono text-emerald-400 font-bold">2.2 Ω (符合标称)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>3. 玻璃滑轨升降阻力测试:</span>
                    <span className="font-mono text-emerald-400 font-bold">平顺无异响卡顿</span>
                  </div>
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={s5WorkOrderSigned}
                      onChange={(e) => setS5WorkOrderSigned(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500"
                    />
                    <span>确认上述三项指标全部复验达标，签署交付工单</span>
                  </label>
                </div>
                {!s5Submitted ? (
                  <Button
                    disabled={!s5Repaired || !s5WorkOrderSigned}
                    onClick={() => {
                      sounds.success();
                      setS5Submitted(true);
                      onStepComplete('ENGINEERING_REPAIR_AND_COMMISSIONING', {
                        repaired: true,
                        current: 3.2,
                        signed: true,
                      });
                      assessment.completeStage('transfer');
                      const finalResult = assessment.completeLevel();
                      onComplete?.(finalResult);
                      onAdvanceStep();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    {!s5Repaired ? '请先执行工程修复' : !s5WorkOrderSigned ? '请勾选签署交付工单' : '完成交车验收'}
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>恭喜！D02 直流电动机认知与控制实训圆满闭环完成！</span>
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
