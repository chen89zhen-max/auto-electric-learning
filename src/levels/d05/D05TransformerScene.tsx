'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { type D05Step } from './d05Training';

interface D05TransformerSceneProps {
  currentStep: D05Step;
  onStepComplete: (step: D05Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

export function D05TransformerScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
}: D05TransformerSceneProps) {
  // Multimeter Knob: 'OFF' | 'DCV_20' | 'ACV_750' | 'OHM_200'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'DCV_20' | 'ACV_750' | 'OHM_200'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Step 1: Magnetic Flux Coupling
  const [s1AcExcited, setS1AcExcited] = useState<boolean>(true);
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Step 2: Voltage & Current Ratio
  const [s2TurnsMode, setS2TurnsMode] = useState<'STEP_DOWN' | 'STEP_UP'>('STEP_DOWN');
  const [s2Choice, setS2Choice] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: DC Input Disaster Trap
  const [s3FuseBlown, setS3FuseBlown] = useState<boolean>(false);
  const [s3Choice, setS3Choice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Step 4: Same-Name Terminals (Polarity)
  const [s4Connection, setS4Connection] = useState<'SUBTRACTIVE' | 'ADDITIVE'>('SUBTRACTIVE');
  const [s4Choice, setS4Choice] = useState<string | null>(null);
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Step 5: Onboard Inverter Delivery
  const [s5InverterOn, setS5InverterOn] = useState<boolean>(false);
  const [s5LoadPlugged, setS5LoadPlugged] = useState<boolean>(false);
  const [s5WorkOrderSigned, setS5WorkOrderSigned] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  // Guard
  const requireMeterPowered = (expected: 'DCV_20' | 'ACV_750' | 'OHM_200'): boolean => {
    if (meterKnob === 'OFF') {
      sounds.warningBuzz();
      setMeterWarning('⚠️ 万用表处于关机 OFF 状态！请先拨动旋钮开机再进行测量。');
      return false;
    }
    if (meterKnob !== expected) {
      sounds.warningBuzz();
      setMeterWarning(`⚠️ 量程不匹配！当前测试需使用 ${expected} 挡位。`);
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
        {/* Left: Transformer Core Visualizer (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400 animate-pulse" />
              <span className="font-semibold text-slate-200">单相变压器与车载逆变升压实验台</span>
              <span className="text-xs bg-purple-900/60 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                ⭐ 选学拓展
              </span>
            </div>
            <div className="text-xs px-2.5 py-1 bg-slate-800 text-purple-300 rounded font-mono">
              {currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX' && '步骤1: 铁芯与交变磁通'}
              {currentStep === 'VOLTAGE_AND_CURRENT_RATIO' && '步骤2: 变压比与变流比'}
              {currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE' && '步骤3: 直流短路反例'}
              {currentStep === 'POLARITY_AND_SAME_NAME_TERMINALS' && '步骤4: 同名端极性测试'}
              {currentStep === 'ONBOARD_INVERTER_STEP_UP_DELIVERY' && '步骤5: 逆变220V交车'}
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
                <pattern id="d05-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="1" />
                </pattern>
                <linearGradient id="ironCoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="50%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
              </defs>
              <rect width="700" height="320" fill="url(#d05-grid)" rx="8" />

              {/* Step 1 to 4: Transformer Closed Iron Core */}
              {currentStep !== 'ONBOARD_INVERTER_STEP_UP_DELIVERY' && (
                <g transform="translate(160, 40)">
                  {/* Outer Core Frame */}
                  <rect x="0" y="0" width="360" height="240" rx="14" fill="url(#ironCoreGrad)" stroke="#64748b" strokeWidth="3" />
                  {/* Inner Core Window Hole */}
                  <rect x="75" y="55" width="210" height="130" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="2" />

                  {/* Magnetic Flux Path (Animated Green Dashes inside the core) */}
                  {s1AcExcited && !s3FuseBlown && (
                    <rect
                      x="35"
                      y="26"
                      width="290"
                      height="188"
                      rx="10"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeDasharray="8 6"
                      className="animate-pulse"
                    />
                  )}

                  {/* Core Label */}
                  <text x="180" y="115" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">
                    硅钢片叠压闭合铁芯
                  </text>
                  <text x="180" y="135" textAnchor="middle" fill="#64748b" fontSize="10">
                    交变磁通回路 Φ(t)
                  </text>

                  {/* Primary Winding on Left Leg (x: -10 to 60) */}
                  <g transform="translate(0, 50)">
                    <rect x="-10" y="0" width="70" height="140" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                    {/* Primary coils */}
                    <g stroke="#f59e0b" strokeWidth="3" fill="none">
                      <path d="M -10 20 C 50 20, 50 35, -10 35" />
                      <path d="M -10 40 C 50 40, 50 55, -10 55" />
                      <path d="M -10 60 C 50 60, 50 75, -10 75" />
                      <path d="M -10 80 C 50 80, 50 95, -10 95" />
                      <path d="M -10 100 C 50 100, 50 115, -10 115" />
                    </g>
                    <text x="25" y="155" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">
                      初级原边 N1
                    </text>
                    <text x="25" y="170" textAnchor="middle" fill="#94a3b8" fontSize="9">
                      {s2TurnsMode === 'STEP_DOWN' ? '1100 匝 (细线)' : '60 匝 (粗线)'}
                    </text>
                  </g>

                  {/* Secondary Winding on Right Leg (x: 295 to 365) */}
                  <g transform="translate(295, 50)">
                    <rect x="0" y="0" width="70" height="140" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                    {/* Secondary coils */}
                    <g stroke="#38bdf8" strokeWidth="4.5" fill="none">
                      <path d="M 0 30 C 60 30, 60 50, 0 50" />
                      <path d="M 0 60 C 60 60, 60 80, 0 80" />
                      <path d="M 0 90 C 60 90, 60 110, 0 110" />
                    </g>
                    <text x="35" y="155" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
                      次级副边 N2
                    </text>
                    <text x="35" y="170" textAnchor="middle" fill="#94a3b8" fontSize="9">
                      {s2TurnsMode === 'STEP_DOWN' ? '60 匝 (大电流粗线)' : '1100 匝 (细线)'}
                    </text>
                  </g>

                  {/* DC Disaster Short-Circuit / Blown Fuse animation in Step 3 */}
                  {currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE' && s3FuseBlown && (
                    <g transform="translate(-80, 80)">
                      <circle cx="20" cy="20" r="28" fill="#ef4444" opacity="0.3" className="animate-ping" />
                      <rect x="0" y="10" width="40" height="20" rx="4" fill="#0f172a" stroke="#ef4444" strokeWidth="2" />
                      <path d="M 5 20 L 15 15 L 25 25 L 35 20" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 2" />
                      <text x="20" y="45" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="black">
                        💥 熔丝炸断！(I=40A)
                      </text>
                      <text x="20" y="60" textAnchor="middle" fill="#f87171" fontSize="10">
                        初级直流短路
                      </text>
                    </g>
                  )}

                  {/* Polarity markers (Dot symbols •) in Step 4 */}
                  {currentStep === 'POLARITY_AND_SAME_NAME_TERMINALS' && (
                    <g>
                      {/* Terminal 1 & 3 Dots */}
                      <circle cx="2" cy="65" r="5" fill="#facc15" />
                      <text x="2" y="55" textAnchor="middle" fill="#facc15" fontSize="10" fontWeight="black">
                        1 •
                      </text>
                      <text x="2" y="195" textAnchor="middle" fill="#94a3b8" fontSize="10">
                        2
                      </text>

                      <circle cx="300" cy="65" r="5" fill="#facc15" />
                      <text x="300" y="55" textAnchor="middle" fill="#facc15" fontSize="10" fontWeight="black">
                        3 •
                      </text>
                      <text x="300" y="195" textAnchor="middle" fill="#94a3b8" fontSize="10">
                        4
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* Step 5: Onboard Inverter (12V DC -> H-Bridge Chopper -> High-Frequency Step-Up Transformer -> 220V Pure Sine Output) */}
              {currentStep === 'ONBOARD_INVERTER_STEP_UP_DELIVERY' && (
                <g transform="translate(60, 40)">
                  {/* Car 12V Battery Block */}
                  <rect x="0" y="60" width="90" height="110" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                  <text x="45" y="110" textAnchor="middle" fill="#38bdf8" fontSize="14" fontWeight="bold">
                    12V DC
                  </text>
                  <text x="45" y="130" textAnchor="middle" fill="#94a3b8" fontSize="11">
                    车载蓄电池
                  </text>

                  {/* Wire to Inverter */}
                  <line x1="90" y1="115" x2="140" y2="115" stroke="#ef4444" strokeWidth="4" />

                  {/* Inverter Box (Chassis) */}
                  <rect x="140" y="30" width="310" height="180" rx="14" fill="#0f172a" stroke="#8b5cf6" strokeWidth="3" />
                  <text x="295" y="55" textAnchor="middle" fill="#c084fc" fontSize="13" fontWeight="bold">
                    车载纯正弦波逆变电源 (12V DC ⟼ 220V AC)
                  </text>

                  {/* Internal Stages inside Inverter */}
                  {/* 1. H-bridge Chopper */}
                  <rect x="160" y="80" width="75" height="90" rx="6" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
                  <text x="197" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">
                    H桥斩波逆变
                  </text>
                  <text x="197" y="135" textAnchor="middle" fill="#38bdf8" fontSize="9">
                    12V 50Hz AC
                  </text>

                  {/* 2. Step-up Transformer */}
                  <rect x="250" y="75" width="95" height="100" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                  <text x="297" y="110" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">
                    升压变压器
                  </text>
                  <text x="297" y="130" textAnchor="middle" fill="#fbbf24" fontSize="10">
                    1:20 匝比升压
                  </text>

                  {/* 3. Output Filter & 220V Socket */}
                  <rect x="360" y="80" width="70" height="90" rx="6" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="395" y="115" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">
                    220V 插孔
                  </text>
                  <circle cx="387" cy="140" r="3" fill="#f8fafc" />
                  <circle cx="403" cy="140" r="3" fill="#f8fafc" />

                  {/* Laptop Load on Right */}
                  <g transform="translate(480, 50)">
                    <rect x="0" y="30" width="100" height="70" rx="4" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
                    <polygon points="-10,100 110,100 100,110 0,110" fill="#475569" />
                    <text x="50" y="70" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
                      {s5LoadPlugged ? '100W 充电中' : '待接入'}
                    </text>
                    {s5InverterOn && s5LoadPlugged && (
                      <circle cx="50" cy="45" r="4" fill="#10b981" className="animate-ping" />
                    )}
                  </g>
                </g>
              )}
            </svg>
          </div>

          {/* Interactive Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg">
            {currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sounds.click();
                    setS1AcExcited(!s1AcExcited);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold ${
                    s1AcExcited ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {s1AcExcited ? '初级输入交流激励 (产生交变磁通)' : '初级断电 (磁通归零)'}
                </button>
                <span className="text-xs text-slate-400">
                  原副边无铜丝直连，完全依靠铁芯交变磁通传导能量
                </span>
              </div>
            )}

            {currentStep === 'VOLTAGE_AND_CURRENT_RATIO' && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">匝比模式:</span>
                <button
                  onClick={() => {
                    sounds.click();
                    setS2TurnsMode('STEP_DOWN');
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold ${
                    s2TurnsMode === 'STEP_DOWN' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  降压模式 (1100:60 匝 ⟼ 220V:12V, 0.27A:5A)
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS2TurnsMode('STEP_UP');
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold ${
                    s2TurnsMode === 'STEP_UP' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  升压模式 (60:1100 匝 ⟼ 12V:220V)
                </button>
              </div>
            )}

            {currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sounds.warningBuzz();
                    setS3FuseBlown(true);
                  }}
                  className={`px-4 py-1.5 rounded text-xs font-bold ${
                    s3FuseBlown ? 'bg-rose-700 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  {s3FuseBlown ? '⚠️ 直流接入短路！熔丝已炸断 (I=40A)' : '尝试接入 12V 直流电源 (反例演示)'}
                </button>
                {s3FuseBlown && (
                  <button
                    onClick={() => {
                      sounds.click();
                      setS3FuseBlown(false);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300"
                  >
                    更换新保险丝重置
                  </button>
                )}
              </div>
            )}

            {currentStep === 'POLARITY_AND_SAME_NAME_TERMINALS' && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">端子串联方式:</span>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4Connection('SUBTRACTIVE');
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold ${
                    s4Connection === 'SUBTRACTIVE' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  1 与 3 短接 (同名端相消差动: U24 = 12-4 = 8.0V)
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4Connection('ADDITIVE');
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold ${
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
                  onClick={() => {
                    sounds.zap();
                    setS5InverterOn(!s5InverterOn);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold ${
                    s5InverterOn ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {s5InverterOn ? '逆变电源运转中 (输出 220V)' : '开启车载逆变器开关'}
                </button>
                {s5InverterOn && (
                  <button
                    onClick={() => {
                      sounds.click();
                      setS5LoadPlugged(!s5LoadPlugged);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-semibold ${
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
                  : meterKnob === 'ACV_750'
                  ? 'AC VOLTAGE (750V)'
                  : meterKnob === 'OHM_200'
                  ? 'RESISTANCE (200Ω)'
                  : 'POWER OFF'}
              </div>
              <div className="text-4xl lg:text-5xl font-mono font-black text-emerald-400 tracking-tight">
                {(() => {
                  if (meterKnob === 'OFF') return '----';
                  if (meterKnob === 'ACV_750') {
                    if (currentStep === 'VOLTAGE_AND_CURRENT_RATIO') {
                      return s2TurnsMode === 'STEP_DOWN' ? '12.0 V~' : '220.0 V~';
                    }
                    if (currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE') {
                      return '0.0 V~'; // DC yields 0 on secondary
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
                    if (currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE') {
                      return s3FuseBlown ? '0.00 V' : '12.00 V';
                    }
                    return '12.00 V';
                  }
                  if (meterKnob === 'OHM_200') {
                    return '0.3 Ω';
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
                  setMeterKnob('ACV_750');
                  setMeterWarning(null);
                }}
                className={`py-1.5 px-1 text-xs rounded font-mono font-bold ${
                  meterKnob === 'ACV_750' ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-slate-800 text-slate-300'
                }`}
              >
                ACV 750V
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
            {currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-300">
                  【步骤1结构与原理】变压器初级绕组与次级绕组之间没有任何导线连接，电能是如何传递到次级的？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '初级交流电在闭合铁芯中激发出交变磁通，磁通穿过次级绕组产生电磁感应电能' },
                    { id: 'B', text: '变压器绝缘层内部有微小的无线电发射天线' },
                    { id: 'C', text: '硅钢片是超导体，能直接导电到次级' },
                  ].map((opt) => {
                    const isSelected = s1Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s1Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-purple-500 bg-purple-950/40 text-purple-200';
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
                      if (s1Choice === 'A') {
                        sounds.success();
                        setS1Submitted(true);
                        onStepComplete('STRUCTURE_AND_MAGNETIC_FLUX', { choice: s1Choice });
                      } else {
                        sounds.warningBuzz();
                        setS1Submitted(true);
                      }
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-xs font-semibold py-2"
                  >
                    提交磁耦合原理分析
                  </Button>
                ) : s1Choice === 'A' ? (
                  <Button onClick={onAdvanceStep} className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2">
                    分析透彻！进入变压比与变流比实验 <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
                    重新思考
                  </Button>
                )}
              </div>
            )}

            {/* Step 2 Question */}
            {currentStep === 'VOLTAGE_AND_CURRENT_RATIO' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-300">
                  【步骤2变压比与变流比】若变压器将 220V 降至 12V 供车载 60W 负载(5A)使用，关于初次级导线的判断：
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '次级电流(5A)远大于初级电流(0.27A)，根据焦耳热规律次级绕组必须采用截面积粗得多的导线' },
                    { id: 'B', text: '初级电压高，所以初级导线必须比次级粗得多' },
                    { id: 'C', text: '初次级电流相等，导线粗细完全一致' },
                  ].map((opt) => {
                    const isSelected = s2Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s2Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-purple-500 bg-purple-950/40 text-purple-200';
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
                        onStepComplete('VOLTAGE_AND_CURRENT_RATIO', { choice: s2Choice });
                      } else {
                        sounds.warningBuzz();
                        setS2Submitted(true);
                      }
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-xs font-semibold py-2"
                  >
                    提交变比与线径分析
                  </Button>
                ) : s2Choice === 'A' ? (
                  <Button onClick={onAdvanceStep} className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2">
                    规律准确！进入直流短路灾难反例 <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
            {currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-300">
                  【步骤3直流反例警示】为什么严禁将直流电直接接入变压器？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '直流磁通恒定(dΦ/dt=0)副边无感应输出；且初级感抗为零仅存 0.3Ω 铜阻，导致 40A 严重短路过流烧毁' },
                    { id: 'B', text: '直流电会导致变压器输出电压变成超高频微波' },
                    { id: 'C', text: '直流电只能通过铝导线，无法通过变压器的铜线' },
                  ].map((opt) => {
                    const isSelected = s3Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s3Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-purple-500 bg-purple-950/40 text-purple-200';
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
                    disabled={!s3Choice || !s3FuseBlown}
                    onClick={() => {
                      if (s3Choice === 'A') {
                        sounds.success();
                        setS3Submitted(true);
                        onStepComplete('DC_INPUT_DISASTER_COUNTEREXAMPLE', { choice: s3Choice });
                      } else {
                        sounds.warningBuzz();
                        setS3Submitted(true);
                      }
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-xs font-semibold py-2"
                  >
                    {!s3FuseBlown ? '请先在左侧点击接入直流触发反例' : '提交直流短路原理分析'}
                  </Button>
                ) : s3Choice === 'A' ? (
                  <Button onClick={onAdvanceStep} className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2">
                    反例警示深刻！进入同名端测试 <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
            {currentStep === 'POLARITY_AND_SAME_NAME_TERMINALS' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-300">
                  【步骤4同名端交流测试】将端子 1 与 3 短接，测得端子 2 与 4 电压为 8.0V (12V - 4V)，结论是？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '端子 1 与端子 3 为同名端 (感应电动势方向相同，串接后反向抵消为差动减法)' },
                    { id: 'B', text: '端子 1 与端子 4 为同名端' },
                    { id: 'C', text: '副边绕组已经开路' },
                  ].map((opt) => {
                    const isSelected = s4Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s4Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-purple-500 bg-purple-950/40 text-purple-200';
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
                      if (!requireMeterPowered('ACV_750')) return;
                      if (s4Choice === 'A') {
                        sounds.success();
                        setS4Submitted(true);
                        onStepComplete('POLARITY_AND_SAME_NAME_TERMINALS', { choice: s4Choice });
                      } else {
                        sounds.warningBuzz();
                        setS4Submitted(true);
                      }
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-xs font-semibold py-2"
                  >
                    提交同名端判定
                  </Button>
                ) : s4Choice === 'A' ? (
                  <Button onClick={onAdvanceStep} className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2">
                    判定准确！进入车载逆变升压综合交付 <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
                    重新思考
                  </Button>
                )}
              </div>
            )}

            {/* Step 5 Question */}
            {currentStep === 'ONBOARD_INVERTER_STEP_UP_DELIVERY' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-300">
                  【步骤5交付验收】车载 12V 转 220V 纯正弦波逆变电源性能复验：
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>1. 空载输出正弦交流电压:</span>
                    <span className="font-mono text-emerald-400 font-bold">220.5 V~ (50.0 Hz)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>2. 接入 100W 笔记本电脑带载电压:</span>
                    <span className="font-mono text-emerald-400 font-bold">219.8 V~ (压降 ≤ 1% 极优)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>3. 逆变温升与波形纯净度:</span>
                    <span className="font-mono text-emerald-400 font-bold">高频滤波无谐波杂散</span>
                  </div>
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={s5WorkOrderSigned}
                      onChange={(e) => setS5WorkOrderSigned(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-purple-500 focus:ring-purple-500"
                    />
                    <span>确认车载逆变升压变压器系统验收合格，签署工单</span>
                  </label>
                </div>
                {!s5Submitted ? (
                  <Button
                    disabled={!s5InverterOn || !s5LoadPlugged || !s5WorkOrderSigned}
                    onClick={() => {
                      sounds.success();
                      setS5Submitted(true);
                      onStepComplete('ONBOARD_INVERTER_STEP_UP_DELIVERY', {
                        acVoltage: 219.8,
                        signed: true,
                      });
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    {!s5InverterOn
                      ? '请开启逆变器电源'
                      : !s5LoadPlugged
                      ? '请接入 100W 负载'
                      : !s5WorkOrderSigned
                      ? '请勾选签署交付工单'
                      : '完成选学交车验收'}
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>恭喜！D05 变压器实验室选学实训圆满闭环完成！</span>
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
