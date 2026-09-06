'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { type D03Step } from './d03Training';

interface D03AlternatorSceneProps {
  currentStep: D03Step;
  onStepComplete: (step: D03Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onComplete?: (result: LevelAssessmentResult) => void;
  hintRequested?: boolean;
}

interface AlternatorBlindCase {
  id: string;
  vehicleName: string;
  symptom: string;
  faultType: 'ROTOR_OPEN' | 'BRUSH_WORN' | 'STATOR_PHASE_LOST';
  faultName: string;
  bPlusVoltage: number; // 11.8V (no charging)
  rotorResistance: number; // Normal: 3.0Ω, Fault: OL
  statorSymmVoltage: string; // "三相平衡" or "U相缺失 (0V)"
  explanation: string;
}

const ALTERNATOR_BLIND_CASES: AlternatorBlindCase[] = [
  {
    id: 'CASE_ROTOR_OPEN',
    vehicleName: '家用轿车 #103 (行驶中电瓶灯常亮)',
    symptom: '仪表充电红灯报警，全车耗光蓄电池后熄火停驶。',
    faultType: 'ROTOR_OPEN',
    faultName: '转子励磁绕组内部断路开路',
    bPlusVoltage: 11.8,
    rotorResistance: 999999, // OL
    statorSymmVoltage: '三相对称 (均为0V无励磁)',
    explanation: '两滑环间电阻测得 OL，励磁绕组断路无法建立旋转磁场，发电机输出为零！',
  },
  {
    id: 'CASE_BRUSH_WORN',
    vehicleName: '营运网约车 #205 (高速偶发不发电)',
    symptom: '低速偶尔有电，高速行驶时充电指示灯闪烁并常亮。',
    faultType: 'BRUSH_WORN',
    faultName: '发电机电刷严重磨损见底、弹簧疲软接触不良',
    bPlusVoltage: 11.9,
    rotorResistance: 65.0, // High unstable resistance (normal 3.0Ω)
    statorSymmVoltage: '三相电压微弱且剧烈抖动',
    explanation: '碳刷磨损极限导致接触电阻飙升至 65Ω，励磁电流严重不足，发电机失灵。',
  },
  {
    id: 'CASE_STATOR_PHASE_LOST',
    vehicleName: '轻型厢货 #307 (发电机带载呜呜异响且发热)',
    symptom: '怠速电压仅 12.3V，开大灯后发电机发出呜呜电磁蜂鸣并严重发烫。',
    faultType: 'STATOR_PHASE_LOST',
    faultName: '定子 U 相绕组引出线断路缺相',
    bPlusVoltage: 12.3,
    rotorResistance: 3.0, // Normal rotor
    statorSymmVoltage: 'U相 0.0V (缺相失衡), V/W相 14.5V',
    explanation: '定子三相中 U 相断路缺相，三相平衡被打破，输出直流纹波剧增且电磁转矩严重抖动发热！',
  },
];

export function D03AlternatorScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onComplete,
  hintRequested,
}: D03AlternatorSceneProps) {
  const assessment = useLevelAssessment('D03');

  useEffect(() => {
    if (hintRequested) {
      const stageMap: Record<D03Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
        FARADAY_INDUCTION_AND_RIGHT_HAND_RULE: 'cognition',
        SINE_AC_WAVEFORM_AND_THREE_ELEMENTS: 'standard',
        SPEED_CHARACTERISTIC_AND_ROTATION: 'calculation',
        BLIND_ALTERNATOR_FAULT_DIAGNOSIS: 'blind_test',
        ENGINEERING_REPAIR_AND_CHARGING_ACCEPTANCE: 'transfer',
      };
      assessment.requestHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, assessment]);

  // Multimeter Knob: 'OFF' | 'DCV_20' | 'ACV_200' | 'OHM_200'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'DCV_20' | 'ACV_200' | 'OHM_200'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Step 1: Cutting Wire & Right-Hand Rule
  const [s1CutDirection, setS1CutDirection] = useState<'RIGHT' | 'LEFT' | 'STOP'>('STOP');
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Step 2: Sine Wave & Counterexample Trap (DCV vs ACV)
  const [s2MeterTested, setS2MeterTested] = useState<boolean>(false);
  const [s2Choice, setS2Choice] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: Speed Characteristics
  const [engineRpm, setEngineRpm] = useState<number>(2000);
  const [s3Choice, setS3Choice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Step 4: Blind Fault
  const [blindIndex, setBlindIndex] = useState<number>(0);
  const [s4TestTarget, setS4TestTarget] = useState<'B_PLUS' | 'ROTOR_RES' | 'STATOR_PHASE'>('B_PLUS');
  const [s4Choice, setS4Choice] = useState<string | null>(null);
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Step 5: Engineering Repair
  const [s5Repaired, setS5Repaired] = useState<boolean>(false);
  const [s5EngineRunning, setS5EngineRunning] = useState<boolean>(false);
  const [s5HighLoadOn, setS5HighLoadOn] = useState<boolean>(false);
  const [s5WorkOrderSigned, setS5WorkOrderSigned] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  const activeBlind = ALTERNATOR_BLIND_CASES[blindIndex];

  // Frequency calculation f = p * n / 60 (p=6)
  const calcFrequency = (rpm: number) => Math.round((6 * rpm) / 60);

  // Guard
  const requireMeterPowered = (expected: 'DCV_20' | 'ACV_200' | 'OHM_200'): boolean => {
    const stageMap: Record<D03Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
      FARADAY_INDUCTION_AND_RIGHT_HAND_RULE: 'cognition',
      SINE_AC_WAVEFORM_AND_THREE_ELEMENTS: 'standard',
      SPEED_CHARACTERISTIC_AND_ROTATION: 'calculation',
      BLIND_ALTERNATOR_FAULT_DIAGNOSIS: 'blind_test',
      ENGINEERING_REPAIR_AND_CHARGING_ACCEPTANCE: 'transfer',
    };
    if (meterKnob === 'OFF') {
      sounds.warningBuzz();
      setMeterWarning('⚠️ 万用表处于关机 OFF 状态！请先拨动旋钮开机再进行测量。');
      assessment.recordMeterBlocked(stageMap[currentStep]);
      return false;
    }
    if (meterKnob !== expected) {
      sounds.warningBuzz();
      setMeterWarning(`⚠️ 量程不匹配！当前测量需使用 ${expected} 挡位。`);
      assessment.recordMeterBlocked(stageMap[currentStep]);
      return false;
    }
    setMeterWarning(null);
    return true;
  };

  return (
    <div className="flex flex-col flex-1 min-h-[580px] w-full bg-slate-900 text-white rounded-xl p-4 lg:p-6 shadow-2xl border border-slate-800 space-y-6">
      {/* Warning Toast */}
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left: Alternator & Sine Waveform Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-400 animate-pulse" />
              <span className="font-semibold text-slate-200">汽车交流发电机与电磁感应实验台</span>
            </div>
            <div className="text-xs px-2.5 py-1 bg-slate-800 text-teal-300 rounded font-mono">
              {currentStep === 'FARADAY_INDUCTION_AND_RIGHT_HAND_RULE' && '步骤1: 右手定则切割'}
              {currentStep === 'SINE_AC_WAVEFORM_AND_THREE_ELEMENTS' && '步骤2: 交流正弦波三要素'}
              {currentStep === 'SPEED_CHARACTERISTIC_AND_ROTATION' && '步骤3: 发电机转速特性'}
              {currentStep === 'BLIND_ALTERNATOR_FAULT_DIAGNOSIS' && `步骤4: 盲测排故 (${blindIndex + 1}/3)`}
              {currentStep === 'ENGINEERING_REPAIR_AND_CHARGING_ACCEPTANCE' && '步骤5: 碳刷换新与稳压交车'}
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="my-4 relative flex items-center justify-center min-h-[300px]">
            <svg
              className="w-full h-72 lg:h-80 select-none"
              viewBox="0 0 700 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Defs */}
              <defs>
                <pattern id="d03-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="1" />
                </pattern>
                <linearGradient id="scopeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#042f2e" />
                  <stop offset="100%" stopColor="#022c22" />
                </linearGradient>
              </defs>
              <rect width="700" height="320" fill="url(#d03-grid)" rx="8" />

              {/* Step 1: Cutting Conductor */}
              {currentStep === 'FARADAY_INDUCTION_AND_RIGHT_HAND_RULE' && (
                <g>
                  {/* North & South Poles */}
                  <rect x="100" y="40" width="120" height="45" rx="6" fill="#ef4444" />
                  <text x="160" y="68" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">
                    N 极
                  </text>
                  <rect x="100" y="235" width="120" height="45" rx="6" fill="#3b82f6" />
                  <text x="160" y="263" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">
                    S 极
                  </text>

                  {/* Magnetic Flux Lines */}
                  <g stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6">
                    <line x1="120" y1="85" x2="120" y2="235" />
                    <line x1="160" y1="85" x2="160" y2="235" />
                    <line x1="200" y1="85" x2="200" y2="235" />
                  </g>

                  {/* Moving Conductor Rod */}
                  {(() => {
                    let posX = 160;
                    if (s1CutDirection === 'RIGHT') posX = 200;
                    if (s1CutDirection === 'LEFT') posX = 120;
                    return (
                      <g transform={`translate(${posX}, 160)`} className="transition-all duration-300">
                        <circle cx="0" cy="0" r="18" fill="#eab308" stroke="#b45309" strokeWidth="3" />
                        {s1CutDirection === 'RIGHT' ? (
                          // Right-hand rule: Palm faces up (towards N), thumb points RIGHT, fingers point OUT of page (dot)
                          <circle cx="0" cy="0" r="5" fill="#0f172a" />
                        ) : s1CutDirection === 'LEFT' ? (
                          // Thumb points LEFT, fingers point INTO page (cross)
                          <path d="M -6 -6 L 6 6 M -6 6 L 6 -6" stroke="#0f172a" strokeWidth="2.5" />
                        ) : (
                          <circle cx="0" cy="0" r="2" fill="#475569" />
                        )}
                        {/* Direction arrow */}
                        {s1CutDirection === 'RIGHT' && (
                          <g>
                            <line x1="22" y1="0" x2="60" y2="0" stroke="#10b981" strokeWidth="4" />
                            <polygon points="55,-6 68,0 55,6" fill="#10b981" />
                            <text x="75" y="5" fill="#10b981" fontSize="12" fontWeight="bold">
                              切割速度 v ⟶
                            </text>
                          </g>
                        )}
                        {s1CutDirection === 'LEFT' && (
                          <g>
                            <line x1="-22" y1="0" x2="-60" y2="0" stroke="#10b981" strokeWidth="4" />
                            <polygon points="-55,-6 -68,0 -55,6" fill="#10b981" />
                            <text x="-75" y="5" textAnchor="end" fill="#10b981" fontSize="12" fontWeight="bold">
                              ⟵ 切割速度 v
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })()}

                  {/* Galvanometer on Right */}
                  <g transform="translate(420, 90)">
                    <rect x="0" y="0" width="180" height="140" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="3" />
                    <text x="90" y="30" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold">
                      高灵敏度检流计 (G)
                    </text>
                    {/* Meter scale */}
                    <path d="M 40 100 A 60 60 0 0 1 140 100" stroke="#64748b" strokeWidth="2" fill="none" />
                    <line x1="90" y1="90" x2="90" y2="100" stroke="#94a3b8" strokeWidth="2" />
                    <text x="90" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">
                      0
                    </text>
                    <text x="40" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">
                      -G
                    </text>
                    <text x="140" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">
                      +G
                    </text>
                    {/* Pointer */}
                    {(() => {
                      let pointerAngle = 0;
                      if (s1CutDirection === 'RIGHT') pointerAngle = 35;
                      if (s1CutDirection === 'LEFT') pointerAngle = -35;
                      return (
                        <line
                          x1="90"
                          y1="100"
                          x2={90 + 45 * Math.sin((pointerAngle * Math.PI) / 180)}
                          y2={100 - 45 * Math.cos((pointerAngle * Math.PI) / 180)}
                          stroke="#ef4444"
                          strokeWidth="3"
                          strokeLinecap="round"
                          className="transition-all duration-300"
                        />
                      );
                    })()}
                  </g>
                </g>
              )}

              {/* Steps 2 - 5: Digital Oscilloscope Screen (Capturing Sine Wave) */}
              {currentStep !== 'FARADAY_INDUCTION_AND_RIGHT_HAND_RULE' && (
                <g>
                  {/* Oscilloscope Chassis */}
                  <rect x="40" y="30" width="400" height="250" rx="10" fill="url(#scopeGrad)" stroke="#0d9488" strokeWidth="3" />
                  <rect x="55" y="45" width="370" height="200" rx="6" fill="#042f2e" stroke="#115e59" strokeWidth="1.5" />

                  {/* Oscilloscope Grid */}
                  <g stroke="#134e4a" strokeWidth="1" strokeDasharray="2 2">
                    <line x1="55" y1="145" x2="425" y2="145" stroke="#14b8a6" strokeWidth="1.5" strokeDasharray="none" />
                    <line x1="240" y1="45" x2="240" y2="245" stroke="#14b8a6" strokeWidth="1.5" strokeDasharray="none" />
                    <line x1="55" y1="95" x2="425" y2="95" />
                    <line x1="55" y1="195" x2="425" y2="195" />
                    <line x1="147" y1="45" x2="147" y2="245" />
                    <line x1="332" y1="45" x2="332" y2="245" />
                  </g>

                  {/* Live Animated Sine Wave */}
                  {(() => {
                    const freq = calcFrequency(engineRpm);
                    const isStatorPhaseLost =
                      currentStep === 'BLIND_ALTERNATOR_FAULT_DIAGNOSIS' && activeBlind.faultType === 'STATOR_PHASE_LOST';
                    const isNoGen =
                      currentStep === 'BLIND_ALTERNATOR_FAULT_DIAGNOSIS' && activeBlind.faultType === 'ROTOR_OPEN';

                    // Sine wave amplitude
                    let amp = 50;
                    if (engineRpm === 800) amp = 32;
                    if (engineRpm === 2000) amp = 50;
                    if (engineRpm === 3000) amp = 68;
                    if (isNoGen) amp = 0;

                    // Compute path
                    const points: string[] = [];
                    const cycles = Math.max(2, Math.round(freq / 40));
                    for (let x = 55; x <= 425; x += 3) {
                      const t = (x - 55) / (425 - 55);
                      let y = 145 - amp * Math.sin(t * cycles * 2 * Math.PI);
                      if (isStatorPhaseLost && Math.sin(t * cycles * 2 * Math.PI) < 0) {
                        y = 145; // clipped negative half wave due to missing phase
                      }
                      points.push(`${x},${y.toFixed(1)}`);
                    }

                    return (
                      <polyline
                        fill="none"
                        stroke="#2dd4bf"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        points={points.join(' ')}
                      />
                    );
                  })()}

                  {/* Scope Readout OSD */}
                  <text x="65" y="65" fill="#5eead4" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    CH1: 5.0V/DIV | TIME: 5ms/DIV
                  </text>
                  <text x="65" y="80" fill="#facc15" fontSize="11" fontFamily="monospace">
                    Vp-p: {(2 * (engineRpm / 2000) * 19.8).toFixed(1)}V | Vrms: {((engineRpm / 2000) * 14.0).toFixed(1)}V
                  </text>
                  <text x="320" y="65" fill="#5eead4" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    FREQ: {calcFrequency(engineRpm)} Hz
                  </text>

                  {/* Right Side: Car Alternator Assembly Graphic & Instrument Cluster */}
                  <g transform="translate(470, 35)">
                    {/* Alternator Housing Cylinder */}
                    <rect x="0" y="0" width="190" height="150" rx="16" fill="#0f172a" stroke="#475569" strokeWidth="3" />
                    <text x="95" y="26" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold">
                      汽车交流发电机总成
                    </text>

                    {/* Rotor Claw Poles & Pulley */}
                    <circle cx="95" cy="85" r="45" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                    <circle cx="95" cy="85" r="22" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
                    {/* Rotating claws animation */}
                    <g
                      className={engineRpm > 0 ? 'animate-spin' : ''}
                      style={{
                        transformOrigin: '95px 85px',
                        animationDuration: `${(1500 / engineRpm).toFixed(2)}s`,
                      }}
                    >
                      <path d="M 95 45 L 105 75 L 85 75 Z" fill="#eab308" />
                      <path d="M 95 125 L 105 95 L 85 95 Z" fill="#eab308" />
                      <path d="M 55 85 L 85 95 L 85 75 Z" fill="#eab308" />
                      <path d="M 135 85 L 105 95 L 105 75 Z" fill="#eab308" />
                    </g>

                    {/* Drive Belt */}
                    <line x1="0" y1="85" x2="50" y2="85" stroke="#000000" strokeWidth="6" />

                    {/* Dashboard Warning Lamp (Red Battery) */}
                    <g transform="translate(40, 175)">
                      <rect x="0" y="0" width="110" height="60" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                      {(() => {
                        const isBatteryLampLit =
                          (currentStep === 'SPEED_CHARACTERISTIC_AND_ROTATION' && engineRpm < 1000) ||
                          (currentStep === 'BLIND_ALTERNATOR_FAULT_DIAGNOSIS' && activeBlind.bPlusVoltage < 12.6) ||
                          (currentStep === 'ENGINEERING_REPAIR_AND_CHARGING_ACCEPTANCE' && !s5EngineRunning);
                        return (
                          <g>
                            <circle cx="30" cy="30" r="14" fill={isBatteryLampLit ? '#ef4444' : '#334155'} />
                            <text x="30" y="34" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                              -+
                            </text>
                            <text
                              x="52"
                              y="34"
                              fill={isBatteryLampLit ? '#ef4444' : '#64748b'}
                              fontSize="11"
                              fontWeight="bold"
                            >
                              {isBatteryLampLit ? '充电故障' : '充电正常'}
                            </text>
                          </g>
                        );
                      })()}
                    </g>
                  </g>
                </g>
              )}
            </svg>
          </div>

          {/* Interactive Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg">
            {currentStep === 'FARADAY_INDUCTION_AND_RIGHT_HAND_RULE' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sounds.zap();
                    setS1CutDirection('RIGHT');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-bold text-white"
                >
                  向右垂直切割 (磁感线向上穿手心)
                </button>
                <button
                  onClick={() => {
                    sounds.zap();
                    setS1CutDirection('LEFT');
                  }}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 rounded text-xs font-bold text-white"
                >
                  向左垂直切割 (速度反向)
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS1CutDirection('STOP');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300"
                >
                  导线静止 (停转)
                </button>
              </div>
            )}

            {currentStep === 'SINE_AC_WAVEFORM_AND_THREE_ELEMENTS' && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">万用表打表陷阱对比:</span>
                <button
                  onClick={() => {
                    sounds.warningBuzz();
                    setMeterKnob('DCV_20');
                    setS2MeterTested(true);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold ${
                    meterKnob === 'DCV_20' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  用 DCV 直流挡测 (反例: 误显 0.00V)
                </button>
                <button
                  onClick={() => {
                    sounds.success();
                    setMeterKnob('ACV_200');
                    setS2MeterTested(true);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold ${
                    meterKnob === 'ACV_200' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  用 ACV 交流挡测 (规范: 读取有效值 14.0V)
                </button>
              </div>
            )}

            {currentStep === 'SPEED_CHARACTERISTIC_AND_ROTATION' && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">发动机转速:</span>
                <button
                  onClick={() => {
                    sounds.click();
                    setEngineRpm(800);
                  }}
                  className={`px-3 py-1 rounded text-xs ${engineRpm === 800 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  800 rpm (怠速充电不足)
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setEngineRpm(2000);
                  }}
                  className={`px-3 py-1 rounded text-xs ${engineRpm === 2000 ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  2000 rpm (中速满额输出)
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setEngineRpm(3000);
                  }}
                  className={`px-3 py-1 rounded text-xs ${engineRpm === 3000 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  3000 rpm (高速恒压输出)
                </button>
              </div>
            )}

            {currentStep === 'BLIND_ALTERNATOR_FAULT_DIAGNOSIS' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">测量项目:</span>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4TestTarget('B_PLUS');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${s4TestTarget === 'B_PLUS' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  B+ 输出直流电压
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4TestTarget('ROTOR_RES');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${s4TestTarget === 'ROTOR_RES' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  转子滑环励磁电阻
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4TestTarget('STATOR_PHASE');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${s4TestTarget === 'STATOR_PHASE' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  定子三相对称电压
                </button>
              </div>
            )}

            {currentStep === 'ENGINEERING_REPAIR_AND_CHARGING_ACCEPTANCE' && (
              <div className="flex items-center gap-3">
                <button
                  disabled={s5Repaired}
                  onClick={() => {
                    sounds.success();
                    setS5Repaired(true);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${
                    s5Repaired ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/50' : 'bg-teal-600 hover:bg-teal-500 text-white'
                  }`}
                >
                  {s5Repaired ? '✅ 碳刷调节器总成已换新' : '🔧 更换碳刷调节器并打磨滑环'}
                </button>
                {s5Repaired && (
                  <>
                    <button
                      onClick={() => {
                        sounds.zap();
                        setS5EngineRunning(!s5EngineRunning);
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-semibold ${
                        s5EngineRunning ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {s5EngineRunning ? '发动机运转中 (怠速 850rpm)' : '起动发动机测试'}
                    </button>
                    {s5EngineRunning && (
                      <button
                        onClick={() => {
                          sounds.click();
                          setS5HighLoadOn(!s5HighLoadOn);
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-semibold ${
                          s5HighLoadOn ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {s5HighLoadOn ? '大灯+空调重载开 (14.0V)' : '开启重载测试'}
                      </button>
                    )}
                  </>
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
                  : meterKnob === 'ACV_200'
                  ? 'AC VOLTAGE (200V)'
                  : meterKnob === 'OHM_200'
                  ? 'RESISTANCE (200Ω)'
                  : 'POWER OFF'}
              </div>
              <div className="text-4xl lg:text-5xl font-mono font-black text-emerald-400 tracking-tight">
                {(() => {
                  if (meterKnob === 'OFF') return '----';
                  if (meterKnob === 'DCV_20') {
                    if (currentStep === 'SINE_AC_WAVEFORM_AND_THREE_ELEMENTS') {
                      return '0.00 V'; // TRAP! DC meter on symmetric AC yields 0V!
                    }
                    if (currentStep === 'BLIND_ALTERNATOR_FAULT_DIAGNOSIS') {
                      if (s4TestTarget === 'B_PLUS') return `${activeBlind.bPlusVoltage.toFixed(2)} V`;
                    }
                    if (currentStep === 'ENGINEERING_REPAIR_AND_CHARGING_ACCEPTANCE') {
                      if (!s5EngineRunning) return '12.40 V';
                      return s5HighLoadOn ? '14.02 V' : '14.22 V';
                    }
                    return '14.20 V';
                  }
                  if (meterKnob === 'ACV_200') {
                    if (currentStep === 'SINE_AC_WAVEFORM_AND_THREE_ELEMENTS') {
                      return '14.0 V~'; // True RMS
                    }
                    if (currentStep === 'SPEED_CHARACTERISTIC_AND_ROTATION') {
                      return `${((engineRpm / 2000) * 14.0).toFixed(1)} V~`;
                    }
                    if (currentStep === 'BLIND_ALTERNATOR_FAULT_DIAGNOSIS') {
                      return activeBlind.faultType === 'ROTOR_OPEN' ? '0.0 V~' : '14.5 V~';
                    }
                    return '14.2 V~';
                  }
                  if (meterKnob === 'OHM_200') {
                    if (currentStep === 'BLIND_ALTERNATOR_FAULT_DIAGNOSIS') {
                      if (s4TestTarget === 'ROTOR_RES') {
                        return activeBlind.rotorResistance > 1000 ? 'O.L (开路)' : `${activeBlind.rotorResistance.toFixed(1)} Ω`;
                      }
                    }
                    if (currentStep === 'ENGINEERING_REPAIR_AND_CHARGING_ACCEPTANCE') {
                      return s5Repaired ? '3.0 Ω' : '65.0 Ω';
                    }
                    return '3.0 Ω';
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
                  setMeterKnob('ACV_200');
                  setMeterWarning(null);
                }}
                className={`py-1.5 px-1 text-xs rounded font-mono font-bold ${
                  meterKnob === 'ACV_200' ? 'bg-teal-600 text-white ring-2 ring-teal-400' : 'bg-slate-800 text-slate-300'
                }`}
              >
                ACV 200V
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
            </div>
          </div>

          {/* Form & Assessment Panel (Zero-spoiler!) */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            {/* Step 1 Question */}
            {currentStep === 'FARADAY_INDUCTION_AND_RIGHT_HAND_RULE' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-teal-300">
                  【步骤1定则判定】导体在垂直向下磁场中向右切割时，根据右手定则得出的感应电流方向为？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'OUT', text: '垂直纸面向外 (右手手心向上迎磁力线，大拇指向右，四指指向纸外)' },
                    { id: 'IN', text: '垂直纸面向里 (沿磁感线反向流动)' },
                    { id: 'ZERO', text: '电流为零 (直流磁场中切割无法发电)' },
                  ].map((opt) => {
                    const isSelected = s1Choice === opt.id;
                    const isCorrect = opt.id === 'OUT';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s1Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-teal-500 bg-teal-950/40 text-teal-200';
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
                      if (s1Choice === 'OUT') {
                        sounds.success();
                        setS1Submitted(true);
                        onStepComplete('FARADAY_INDUCTION_AND_RIGHT_HAND_RULE', { choice: s1Choice });
                      } else {
                        sounds.warningBuzz();
                        setS1Submitted(true);
                        assessment.recordWrong('cognition');
                      }
                    }}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-xs font-semibold py-2"
                  >
                    提交感应电流方向判定
                  </Button>
                ) : s1Choice === 'OUT' ? (
                  <Button
                    onClick={() => {
                      assessment.completeStage('cognition');
                      assessment.startStage('standard');
                      onAdvanceStep();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    完全正确！进入正弦交流电三要素实训 <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
                    重新根据右手定则推导
                  </Button>
                )}
              </div>
            )}

            {/* Step 2 Question */}
            {currentStep === 'SINE_AC_WAVEFORM_AND_THREE_ELEMENTS' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-teal-300">
                  【步骤2打表反例辨析】用万用表直流挡(DCV)测交流发电机输出显示 0.00V，为什么？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '交流电正负半周对称抵消，直流平均值为零；必须切至 ACV 挡测量其发热有效值(14.0V)' },
                    { id: 'B', text: '发电机已经损坏，没有输出任何电能' },
                    { id: 'C', text: '万用表表笔正负极插反，触发了保护闭锁' },
                  ].map((opt) => {
                    const isSelected = s2Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s2Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-teal-500 bg-teal-950/40 text-teal-200';
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
                    disabled={!s2Choice || !s2MeterTested}
                    onClick={() => {
                      if (s2Choice === 'A') {
                        sounds.success();
                        setS2Submitted(true);
                        onStepComplete('SINE_AC_WAVEFORM_AND_THREE_ELEMENTS', { choice: s2Choice });
                      } else {
                        sounds.warningBuzz();
                        setS2Submitted(true);
                        assessment.recordWrong('standard');
                      }
                    }}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-xs font-semibold py-2"
                  >
                    {!s2MeterTested ? '请先在左下方对比 DCV 与 ACV 挡位显示' : '提交有效值原理分析'}
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
                    深刻破除仪表误区！进入转速特性实验 <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
            {currentStep === 'SPEED_CHARACTERISTIC_AND_ROTATION' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-teal-300">
                  【步骤3转速特性规律】发动机转速从 800rpm 升至 2000rpm 时，发电机输出信号的变化规律是？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '切割磁通速率提高，感应电动势幅值增大，输出交变频率线性升高 (f = p·n/60 从 80Hz 升至 200Hz)' },
                    { id: 'B', text: '输出频率保持不变，只有电压幅值成倍升高' },
                    { id: 'C', text: '电压和频率均保持不变' },
                  ].map((opt) => {
                    const isSelected = s3Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s3Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-teal-500 bg-teal-950/40 text-teal-200';
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
                    disabled={!s3Choice}
                    onClick={() => {
                      if (s3Choice === 'A') {
                        sounds.success();
                        setS3Submitted(true);
                        onStepComplete('SPEED_CHARACTERISTIC_AND_ROTATION', { choice: s3Choice });
                      } else {
                        sounds.warningBuzz();
                        setS3Submitted(true);
                        assessment.recordWrong('calculation');
                      }
                    }}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-xs font-semibold py-2"
                  >
                    提交转速特性总结
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
                    规律准确！进入独立盲测排故 <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
            {currentStep === 'BLIND_ALTERNATOR_FAULT_DIAGNOSIS' && (
              <div className="space-y-3">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded text-xs">
                  <div className="font-bold text-teal-300">{activeBlind.vehicleName}</div>
                  <div className="text-slate-400">{activeBlind.symptom}</div>
                </div>
                <div className="text-xs font-semibold text-teal-300">
                  结合打表测得的数据，判定故障真因：
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'ROTOR_OPEN', text: '转子励磁线圈内部断路开路 (滑环阻值显示无穷大 OL)' },
                    { id: 'BRUSH_WORN', text: '电刷磨损极限接触不良 (滑环接触电阻飙升至 65Ω)' },
                    { id: 'STATOR_PHASE_LOST', text: '定子 U 相断路缺相 (三相失衡，U相电压为 0V)' },
                  ].map((opt) => {
                    const isSelected = s4Choice === opt.id;
                    const isCorrect = opt.id === activeBlind.faultType;
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s4Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-teal-500 bg-teal-950/40 text-teal-200';
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
                      if (meterKnob === 'OFF') {
                        requireMeterPowered('DCV_20');
                        return;
                      }
                      if (s4Choice === activeBlind.faultType) {
                        sounds.success();
                        setS4Submitted(true);
                        onStepComplete('BLIND_ALTERNATOR_FAULT_DIAGNOSIS', { caseId: activeBlind.id, choice: s4Choice });
                      } else {
                        sounds.warningBuzz();
                        setS4Submitted(true);
                        assessment.recordWrong('blind_test');
                      }
                    }}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-xs font-semibold py-2"
                  >
                    提交盲测诊断结论
                  </Button>
                ) : s4Choice === activeBlind.faultType ? (
                  <Button
                    onClick={() => {
                      if (blindIndex < ALTERNATOR_BLIND_CASES.length - 1) {
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
                    {blindIndex < ALTERNATOR_BLIND_CASES.length - 1 ? '正确！进入下一个发电机案例' : '盲测通关！进入实车修复与交车'}
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
            {currentStep === 'ENGINEERING_REPAIR_AND_CHARGING_ACCEPTANCE' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-teal-300">
                  【步骤5交付验收】换新碳刷调节器并打磨滑环后，实车通电复验：
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>1. 转子滑环静态直流电阻:</span>
                    <span className="font-mono text-emerald-400 font-bold">3.0 Ω (标称 2.8Ω~3.2Ω 合格)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>2. 发动机怠速充电电压 (B+):</span>
                    <span className="font-mono text-emerald-400 font-bold">14.22 V (电瓶指示灯熄灭)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>3. 大灯+空调大负荷稳压电压:</span>
                    <span className="font-mono text-emerald-400 font-bold">14.02 V (稳压调节器性能优异)</span>
                  </div>
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={s5WorkOrderSigned}
                      onChange={(e) => setS5WorkOrderSigned(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500"
                    />
                    <span>确认发电机三项性能指标完全达标，签署交付工单</span>
                  </label>
                </div>
                {!s5Submitted ? (
                  <Button
                    disabled={!s5Repaired || !s5EngineRunning || !s5WorkOrderSigned}
                    onClick={() => {
                      sounds.success();
                      setS5Submitted(true);
                      onStepComplete('ENGINEERING_REPAIR_AND_CHARGING_ACCEPTANCE', {
                        repaired: true,
                        idleVoltage: 14.22,
                        signed: true,
                      });
                      assessment.completeStage('transfer');
                      const finalResult = assessment.completeLevel();
                      onComplete?.(finalResult);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    {!s5Repaired ? '请先更换碳刷调节器' : !s5EngineRunning ? '请起动发动机测试' : !s5WorkOrderSigned ? '请勾选签署交付工单' : '完成交车验收'}
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>恭喜！D03 交流发电机认知与电磁感应实训圆满闭环完成！</span>
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
