'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Flame,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { type D04Step } from './d04Training';

interface D04InductanceSceneProps {
  currentStep: D04Step;
  onStepComplete: (step: D04Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

interface IgnitionBlindCase {
  id: string;
  vehicleName: string;
  symptom: string;
  faultType: 'PRIMARY_OPEN' | 'SECONDARY_SHORT' | 'DRIVER_STUCK_ON';
  faultName: string;
  primaryRes: number; // Normal: 1.0Ω (0.6 ~ 1.5)
  secondaryRes: number; // Normal: 9.5kΩ (6.0 ~ 12.0)
  sparkQuality: string; // "强劲蓝火" or "无火花" or "暗红微弱"
  explanation: string;
}

const IGNITION_BLIND_CASES: IgnitionBlindCase[] = [
  {
    id: 'CASE_PRIMARY_OPEN',
    vehicleName: '涡轮增压轿车 #104 (1缸完全缺火)',
    symptom: '冷车热车均失火，读取故障码 P0301，1缸火花塞完全不跳火。',
    faultType: 'PRIMARY_OPEN',
    faultName: '点火线圈初级低压绕组内部烧损断路',
    primaryRes: 999999, // OL
    secondaryRes: 9.5, // Secondary is ok
    sparkQuality: '完全无火花',
    explanation: '初级线圈阻值测得开路无穷大 OL，无法通电充磁蓄能，次级毫无感应高压！',
  },
  {
    id: 'CASE_SECONDARY_SHORT',
    vehicleName: '混合动力车 #207 (急加速偶发顿挫失火)',
    symptom: '急加速大负荷时 1 缸失火，火花塞跳火呈暗红散乱微弱状。',
    faultType: 'SECONDARY_SHORT',
    faultName: '次级高压绕组内部绝缘漆层击穿匝间短路',
    primaryRes: 1.0,
    secondaryRes: 0.85, // Only 0.85kΩ (severely shorted, normal ~9.5kΩ)
    sparkQuality: '暗红散乱无力，极易熄灭',
    explanation: '次级绕组阻值仅 0.85kΩ（正常应在 6~12kΩ），高压匝间击穿短路，无法产生 20kV 击穿电压！',
  },
  {
    id: 'CASE_DRIVER_STUCK_ON',
    vehicleName: '商用皮卡 #310 (点火线圈严重发烫发胀)',
    symptom: '打开钥匙门但未打马达，1缸点火线圈几分钟内烫手发胀，不跳火。',
    faultType: 'DRIVER_STUCK_ON',
    faultName: '点火驱动功率管击穿短路常通 (无法快速切断)',
    primaryRes: 1.0,
    secondaryRes: 9.5,
    sparkQuality: '完全无火花 (初级恒通无变化)',
    explanation: '初级电流一直常通流过，没有急剧断开的 Δi/Δt，次级感应电压恒为零！且初级大电流导致线圈严重过热烧蚀！',
  },
];

export function D04InductanceScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
}: D04InductanceSceneProps) {
  // Multimeter Knob: 'OFF' | 'DCV_20' | 'OHM_200' | 'OHM_20K'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'DCV_20' | 'OHM_200' | 'OHM_20K'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Step 1: Self Inductance Spark
  const [s1SwitchClosed, setS1SwitchClosed] = useState<boolean>(false);
  const [s1SparkOccurred, setS1SparkOccurred] = useState<boolean>(false);
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Step 2: Freewheeling Diode
  const [s2DiodeConnected, setS2DiodeConnected] = useState<boolean>(false);
  const [s2Observed, setS2Observed] = useState<boolean>(false);
  const [s2Choice, setS2Choice] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: Mutual Inductance & Ignition Coil
  const [s3IgnitionTriggered, setS3IgnitionTriggered] = useState<boolean>(false);
  const [s3Choice, setS3Choice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Step 4: Blind Fault
  const [blindIndex, setBlindIndex] = useState<number>(0);
  const [s4TestTarget, setS4TestTarget] = useState<'PRIMARY' | 'SECONDARY' | 'SPARK'>('PRIMARY');
  const [s4Choice, setS4Choice] = useState<string | null>(null);
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Step 5: Engineering Repair
  const [s5Repaired, setS5Repaired] = useState<boolean>(false);
  const [s5GapAdjusted, setS5GapAdjusted] = useState<boolean>(false);
  const [s5SparkTested, setS5SparkTested] = useState<boolean>(false);
  const [s5WorkOrderSigned, setS5WorkOrderSigned] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  const activeBlind = IGNITION_BLIND_CASES[blindIndex];

  // Guard
  const requireMeterPowered = (expected: 'DCV_20' | 'OHM_200' | 'OHM_20K'): boolean => {
    if (meterKnob === 'OFF') {
      sounds.warningBuzz();
      setMeterWarning('⚠️ 万用表处于关机 OFF 状态！请先拨动旋钮开机再进行打表。');
      return false;
    }
    if (meterKnob !== expected) {
      sounds.warningBuzz();
      setMeterWarning(`⚠️ 量程不匹配！当前测试需打到 ${expected} 挡。`);
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
        {/* Left: Circuit & High-Voltage Spark Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
              <span className="font-semibold text-slate-200">自感瞬态反峰与点火互感升压实验台</span>
            </div>
            <div className="text-xs px-2.5 py-1 bg-slate-800 text-orange-300 rounded font-mono">
              {currentStep === 'SELF_INDUCTANCE_AND_TRANSIENT_SPARK' && '步骤1: 自感高压电弧'}
              {currentStep === 'FREEWHEELING_DIODE_PROTECTION' && '步骤2: 续流二极管消弧'}
              {currentStep === 'MUTUAL_INDUCTANCE_IGNITION_COIL' && '步骤3: 互感点火升压'}
              {currentStep === 'BLIND_IGNITION_FAULT_ISOLATION' && `步骤4: 盲测排故 (${blindIndex + 1}/3)`}
              {currentStep === 'ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE' && '步骤5: 点火复验交车'}
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
                <pattern id="d04-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="1" />
                </pattern>
                <radialGradient id="sparkGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
                  <stop offset="60%" stopColor="#2563eb" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="700" height="320" fill="url(#d04-grid)" rx="8" />

              {/* Step 1 & 2: Self-Inductance Coil & Knife Switch Setup */}
              {['SELF_INDUCTANCE_AND_TRANSIENT_SPARK', 'FREEWHEELING_DIODE_PROTECTION'].includes(currentStep) && (
                <g>
                  {/* DC 12V Battery */}
                  <rect x="50" y="110" width="70" height="85" rx="6" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                  <text x="85" y="145" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold">
                    12V
                  </text>
                  <text x="85" y="165" textAnchor="middle" fill="#64748b" fontSize="11">
                    直流源
                  </text>

                  {/* Knife Switch (Animated open/close) */}
                  <g transform="translate(190, 80)">
                    <circle cx="0" cy="0" r="5" fill="#ef4444" />
                    <circle cx="50" cy="0" r="5" fill="#ef4444" />
                    {/* Blade */}
                    <line
                      x1="0"
                      y1="0"
                      x2={s1SwitchClosed ? '50' : '35'}
                      y2={s1SwitchClosed ? '0' : '-35'}
                      stroke="#f8fafc"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <text x="25" y="22" textAnchor="middle" fill="#94a3b8" fontSize="11">
                      断开开关
                    </text>
                    {/* Spark arc on knife switch gap if spark occurred */}
                    {s1SparkOccurred && !s2DiodeConnected && (
                      <g transform="translate(35, -15)">
                        <circle cx="0" cy="0" r="16" fill="url(#sparkGlow)" className="animate-ping" />
                        <path d="M -5 -8 L 4 -2 L -2 5 L 8 10" stroke="#fef08a" strokeWidth="3" fill="none" />
                        <text x="20" y="0" fill="#facc15" fontSize="11" fontWeight="bold">
                          ⚡ 450V 电离火花！
                        </text>
                      </g>
                    )}
                  </g>

                  {/* Inductor Coil with Iron Core (x: 320, y: 70) */}
                  <g transform="translate(320, 70)">
                    <rect x="0" y="0" width="130" height="150" rx="10" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                    <rect x="55" y="20" width="20" height="110" rx="4" fill="#475569" />
                    {/* Windings */}
                    <g stroke="#f59e0b" strokeWidth="3.5" fill="none">
                      <path d="M 30 40 C 90 40, 90 55, 30 55" />
                      <path d="M 30 55 C 90 55, 90 70, 30 70" />
                      <path d="M 30 70 C 90 70, 90 85, 30 85" />
                      <path d="M 30 85 C 90 85, 90 100, 30 100" />
                      <path d="M 30 100 C 90 100, 90 115, 30 115" />
                    </g>
                    <text x="65" y="140" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">
                      大电感线圈 (L=2.0H)
                    </text>
                  </g>

                  {/* Freewheeling Diode (In Step 2) */}
                  {currentStep === 'FREEWHEELING_DIODE_PROTECTION' && s2DiodeConnected && (
                    <g transform="translate(480, 110)">
                      <rect x="0" y="0" width="110" height="70" rx="8" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
                      <text x="55" y="22" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">
                        反向续流二极管
                      </text>
                      {/* Diode Symbol: Cathode top (+), Anode bottom (-) */}
                      <g transform="translate(55, 45) rotate(-90)">
                        <polygon points="-8,-8 8,0 -8,8" fill="#10b981" />
                        <line x1="8" y1="-10" x2="8" y2="10" stroke="#10b981" strokeWidth="2.5" />
                      </g>
                      <text x="55" y="62" textAnchor="middle" fill="#6ee7b7" fontSize="10">
                        钳位反峰 ≤ 0.7V
                      </text>
                    </g>
                  )}

                  {/* Wire Connections */}
                  <path d="M 85 110 L 85 80 L 190 80" stroke="#ef4444" strokeWidth="4" fill="none" />
                  <path d="M 240 80 L 320 80" stroke="#ef4444" strokeWidth="4" fill="none" />
                  <path d="M 450 80 L 530 80 L 530 220 L 85 220 L 85 195" stroke="#38bdf8" strokeWidth="4" fill="none" />
                  {s2DiodeConnected && (
                    <path d="M 530 80 L 530 110 M 530 180 L 530 220" stroke="#10b981" strokeWidth="2" fill="none" />
                  )}
                </g>
              )}

              {/* Steps 3, 4, 5: Automotive Ignition Coil (Primary 200 turns -> Secondary 20000 turns -> Spark Plug) */}
              {!['SELF_INDUCTANCE_AND_TRANSIENT_SPARK', 'FREEWHEELING_DIODE_PROTECTION'].includes(currentStep) && (
                <g>
                  {/* Primary & Secondary Coil Unit */}
                  <g transform="translate(70, 50)">
                    <rect x="0" y="0" width="310" height="210" rx="12" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
                    <text x="155" y="28" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold">
                      汽车独立点火线圈 (12V ⟼ 20kV 互感升压)
                    </text>

                    {/* Laminated Silicon Steel Core */}
                    <rect x="135" y="45" width="40" height="145" rx="4" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
                    <text x="155" y="125" textAnchor="middle" fill="#94a3b8" fontSize="11">
                      铁芯
                    </text>

                    {/* Primary Coil (Left: N1=200, 1.0Ω) */}
                    <g transform="translate(20, 50)">
                      <rect x="0" y="0" width="105" height="135" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                      <text x="52" y="25" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">
                        初级线圈 (N1)
                      </text>
                      <text x="52" y="42" textAnchor="middle" fill="#94a3b8" fontSize="10">
                        200 匝 / 1.0 Ω
                      </text>
                      <text x="52" y="60" textAnchor="middle" fill="#94a3b8" fontSize="10">
                        12V 快速切断
                      </text>
                    </g>

                    {/* Secondary Coil (Right: N2=20000, 10kΩ) */}
                    <g transform="translate(185, 50)">
                      <rect x="0" y="0" width="105" height="135" rx="6" fill="#1e293b" stroke="#ec4899" strokeWidth="2" />
                      <text x="52" y="25" textAnchor="middle" fill="#ec4899" fontSize="11" fontWeight="bold">
                        次级线圈 (N2)
                      </text>
                      <text x="52" y="42" textAnchor="middle" fill="#94a3b8" fontSize="10">
                        20,000 匝 / 9.5 kΩ
                      </text>
                      <text x="52" y="60" textAnchor="middle" fill="#f472b6" fontSize="10" fontWeight="bold">
                        20,000 伏高压输出
                      </text>
                    </g>
                  </g>

                  {/* Spark Plug & Gap (Right: x: 450 - 660) */}
                  <g transform="translate(460, 60)">
                    <rect x="0" y="0" width="180" height="190" rx="10" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
                    <text x="90" y="26" textAnchor="middle" fill="#facc15" fontSize="12" fontWeight="bold">
                      火花塞跳火间隙试验 (0.9mm)
                    </text>

                    {/* Spark Plug Ceramic Body */}
                    <rect x="75" y="45" width="30" height="70" rx="4" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="75" y1="65" x2="105" y2="65" stroke="#cbd5e1" strokeWidth="2" />
                    <line x1="75" y1="85" x2="105" y2="85" stroke="#cbd5e1" strokeWidth="2" />

                    {/* Center Electrode */}
                    <line x1="90" y1="115" x2="90" y2="145" stroke="#e2e8f0" strokeWidth="4" />

                    {/* Ground Side Electrode */}
                    <path d="M 70 135 L 70 152 L 85 152" stroke="#64748b" strokeWidth="4" fill="none" />

                    {/* Spark Gap Distance indicator */}
                    <line x1="85" y1="145" x2="90" y2="145" stroke="#38bdf8" strokeWidth="1" strokeDasharray="1 1" />
                    <text x="90" y="168" textAnchor="middle" fill="#94a3b8" fontSize="10">
                      标准间隙 0.90 mm
                    </text>

                    {/* Jumping Electric Blue Spark Animation */}
                    {(() => {
                      const isSparking =
                        (currentStep === 'MUTUAL_INDUCTANCE_IGNITION_COIL' && s3IgnitionTriggered) ||
                        (currentStep === 'ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE' && s5SparkTested && s5Repaired);
                      if (isSparking) {
                        return (
                          <g transform="translate(87, 148)">
                            <circle cx="0" cy="0" r="14" fill="url(#sparkGlow)" className="animate-ping" />
                            <path d="M -3 -3 L 2 1 L -1 3 L 3 4" stroke="#ffffff" strokeWidth="3" fill="none" />
                            <text x="18" y="4" fill="#38bdf8" fontSize="11" fontWeight="bold">
                              ⚡ 20kV 蓝火强劲！
                            </text>
                          </g>
                        );
                      }
                      return null;
                    })()}
                  </g>
                </g>
              )}
            </svg>
          </div>

          {/* Interactive Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg">
            {currentStep === 'SELF_INDUCTANCE_AND_TRANSIENT_SPARK' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sounds.click();
                    setS1SwitchClosed(!s1SwitchClosed);
                    if (s1SwitchClosed) {
                      // Turning off: trigger spark!
                      sounds.zap();
                      setS1SparkOccurred(true);
                    }
                  }}
                  className={`px-4 py-1.5 rounded text-xs font-bold ${
                    s1SwitchClosed ? 'bg-amber-600 text-white' : 'bg-rose-700 hover:bg-rose-600 text-white'
                  }`}
                >
                  {s1SwitchClosed ? '开关已闭合 (电感充磁稳态)' : '瞬间拉开开关 (观察反峰电弧)'}
                </button>
                <span className="text-xs text-slate-400">
                  {s1SparkOccurred ? '⚡ 检测到刀口 450V 强烈电离火花！' : '先闭合开关充磁，然后突然断开'}
                </span>
              </div>
            )}

            {currentStep === 'FREEWHEELING_DIODE_PROTECTION' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sounds.click();
                    setS2DiodeConnected(!s2DiodeConnected);
                    setS2Observed(true);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold ${
                    s2DiodeConnected ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {s2DiodeConnected ? '✅ 续流二极管已反向并联 (0.7V消弧)' : '➕ 在线圈两端加装续流二极管'}
                </button>
                <button
                  onClick={() => {
                    if (!s2DiodeConnected) {
                      sounds.zap();
                      setS1SparkOccurred(true);
                    } else {
                      sounds.click();
                      setS1SparkOccurred(false);
                    }
                    setS2Observed(true);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300"
                >
                  测试瞬间切断开关
                </button>
              </div>
            )}

            {currentStep === 'MUTUAL_INDUCTANCE_IGNITION_COIL' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sounds.zap();
                    setS3IgnitionTriggered(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-lg text-xs font-bold text-white flex items-center gap-2 shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  切断初级回路触发点火跳火 (Δi/Δt)
                </button>
                <span className="text-xs text-slate-400">
                  {s3IgnitionTriggered ? '次级感应 20kV，击穿 0.9mm 间隙电离跳火！' : '点击瞬间切断初级 12V 电流'}
                </span>
              </div>
            )}

            {currentStep === 'BLIND_IGNITION_FAULT_ISOLATION' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">测量项目:</span>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4TestTarget('PRIMARY');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${s4TestTarget === 'PRIMARY' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  初级绕组电阻 (Ω)
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4TestTarget('SECONDARY');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${s4TestTarget === 'SECONDARY' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  次级绕组电阻 (kΩ)
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4TestTarget('SPARK');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${s4TestTarget === 'SPARK' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  跳火试验现象
                </button>
              </div>
            )}

            {currentStep === 'ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE' && (
              <div className="flex items-center gap-3">
                <button
                  disabled={s5Repaired}
                  onClick={() => {
                    sounds.success();
                    setS5Repaired(true);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${
                    s5Repaired ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/50' : 'bg-orange-600 hover:bg-orange-500 text-white'
                  }`}
                >
                  {s5Repaired ? '✅ 原厂点火线圈已换装' : '🔧 更换原厂点火线圈总成'}
                </button>
                {s5Repaired && (
                  <>
                    <button
                      disabled={s5GapAdjusted}
                      onClick={() => {
                        sounds.click();
                        setS5GapAdjusted(true);
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-semibold ${
                        s5GapAdjusted ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {s5GapAdjusted ? '✅ 塞尺已校准 0.90mm' : '📏 塞尺校准火花塞间隙'}
                    </button>
                    <button
                      onClick={() => {
                        sounds.zap();
                        setS5SparkTested(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold text-white"
                    >
                      执行跳火复测
                    </button>
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
                  : meterKnob === 'OHM_200'
                  ? 'RESISTANCE (200Ω)'
                  : meterKnob === 'OHM_20K'
                  ? 'RESISTANCE (20kΩ)'
                  : 'POWER OFF'}
              </div>
              <div className="text-4xl lg:text-5xl font-mono font-black text-emerald-400 tracking-tight">
                {(() => {
                  if (meterKnob === 'OFF') return '----';
                  if (meterKnob === 'OHM_200') {
                    if (currentStep === 'BLIND_IGNITION_FAULT_ISOLATION') {
                      if (s4TestTarget === 'PRIMARY') {
                        return activeBlind.primaryRes > 1000 ? 'O.L (烧断)' : `${activeBlind.primaryRes.toFixed(1)} Ω`;
                      }
                      return '0.0 Ω';
                    }
                    if (currentStep === 'ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE') {
                      return s5Repaired ? '1.0 Ω' : 'O.L';
                    }
                    return '1.0 Ω';
                  }
                  if (meterKnob === 'OHM_20K') {
                    if (currentStep === 'BLIND_IGNITION_FAULT_ISOLATION') {
                      if (s4TestTarget === 'SECONDARY') {
                        return `${activeBlind.secondaryRes.toFixed(2)} kΩ`;
                      }
                      return '0.0 kΩ';
                    }
                    if (currentStep === 'ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE') {
                      return s5Repaired ? '9.50 kΩ' : '0.85 kΩ';
                    }
                    return '9.50 kΩ';
                  }
                  if (meterKnob === 'DCV_20') {
                    if (currentStep === 'FREEWHEELING_DIODE_PROTECTION') {
                      return s2DiodeConnected ? '0.70 V' : '12.00 V';
                    }
                    return '12.00 V';
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
                  setMeterKnob('OHM_20K');
                  setMeterWarning(null);
                }}
                className={`py-1.5 px-1 text-xs rounded font-mono font-bold ${
                  meterKnob === 'OHM_20K' ? 'bg-orange-600 text-white ring-2 ring-orange-400' : 'bg-slate-800 text-slate-300'
                }`}
              >
                kΩ 20kΩ
              </button>
            </div>
          </div>

          {/* Form & Assessment Panel (Zero-spoiler!) */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            {/* Step 1 Question */}
            {currentStep === 'SELF_INDUCTANCE_AND_TRANSIENT_SPARK' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-orange-300">
                  【步骤1反峰机理】为什么 12V 直流回路在断开开关瞬间能产生几百伏电弧火花？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '线圈自感阻止电流突变 (e = -L·di/dt)，断电微秒级瞬间电流骤降产生极高自感反峰电压' },
                    { id: 'B', text: '蓄电池在断电瞬间电压突然放大了几十倍' },
                    { id: 'C', text: '开关断开时空气电阻变小引发了短路' },
                  ].map((opt) => {
                    const isSelected = s1Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s1Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-orange-500 bg-orange-950/40 text-orange-200';
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
                    disabled={!s1Choice || !s1SparkOccurred}
                    onClick={() => {
                      if (s1Choice === 'A') {
                        sounds.success();
                        setS1Submitted(true);
                        onStepComplete('SELF_INDUCTANCE_AND_TRANSIENT_SPARK', { choice: s1Choice });
                      } else {
                        sounds.warningBuzz();
                        setS1Submitted(true);
                      }
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-xs font-semibold py-2"
                  >
                    {!s1SparkOccurred ? '请先在左侧断开开关观察打火' : '提交自感反峰分析'}
                  </Button>
                ) : s1Choice === 'A' ? (
                  <Button onClick={onAdvanceStep} className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2">
                    深刻洞察！进入续流二极管消弧实训 <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
            {currentStep === 'FREEWHEELING_DIODE_PROTECTION' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-orange-300">
                  【步骤2续流二极管作用】在线圈两端反向并联续流二极管后，火花为何彻底消失？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '断电瞬间线圈自感反峰促使二极管正向导通，反峰被钳位在约 0.7V 并在回路中续流吸收' },
                    { id: 'B', text: '二极管彻底吸收了蓄电池的所有电压，使回路变为 0V' },
                    { id: 'C', text: '二极管把交流电转换成了直流电' },
                  ].map((opt) => {
                    const isSelected = s2Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s2Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-orange-500 bg-orange-950/40 text-orange-200';
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
                    disabled={!s2Choice || !s2Observed}
                    onClick={() => {
                      if (s2Choice === 'A') {
                        sounds.success();
                        setS2Submitted(true);
                        onStepComplete('FREEWHEELING_DIODE_PROTECTION', { choice: s2Choice });
                      } else {
                        sounds.warningBuzz();
                        setS2Submitted(true);
                      }
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-xs font-semibold py-2"
                  >
                    {!s2Observed ? '请先在左侧加装二极管测试消弧' : '提交续流钳位原理分析'}
                  </Button>
                ) : s2Choice === 'A' ? (
                  <Button onClick={onAdvanceStep} className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2">
                    原理透彻！进入汽车点火互感升压实训 <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
            {currentStep === 'MUTUAL_INDUCTANCE_IGNITION_COIL' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-orange-300">
                  【步骤3互感升压机理】点火线圈次级产生 20kV 超高压的核心关键物理动作是？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '初级线圈 12V 电流被功率晶体管急剧切断(微秒级)，磁通瞬间崩溃在次级两万匝绕组感应出超高压' },
                    { id: 'B', text: '初级线圈一直通着 12V 稳恒直流电不切断' },
                    { id: 'C', text: '火花塞本身装有升压电池' },
                  ].map((opt) => {
                    const isSelected = s3Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s3Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-orange-500 bg-orange-950/40 text-orange-200';
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
                    disabled={!s3Choice || !s3IgnitionTriggered}
                    onClick={() => {
                      if (s3Choice === 'A') {
                        sounds.success();
                        setS3Submitted(true);
                        onStepComplete('MUTUAL_INDUCTANCE_IGNITION_COIL', { choice: s3Choice });
                      } else {
                        sounds.warningBuzz();
                        setS3Submitted(true);
                      }
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-xs font-semibold py-2"
                  >
                    {!s3IgnitionTriggered ? '请先在左侧点击触发跳火' : '提交点火互感原理分析'}
                  </Button>
                ) : s3Choice === 'A' ? (
                  <Button onClick={onAdvanceStep} className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2">
                    完全正确！进入独立盲测排故 <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
            {currentStep === 'BLIND_IGNITION_FAULT_ISOLATION' && (
              <div className="space-y-3">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded text-xs">
                  <div className="font-bold text-orange-300">{activeBlind.vehicleName}</div>
                  <div className="text-slate-400">{activeBlind.symptom}</div>
                </div>
                <div className="text-xs font-semibold text-orange-300">
                  结合万用表测得的数据，判定点火系统故障根因：
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'PRIMARY_OPEN', text: '初级绕组内部烧损断路 (初级阻值开路无穷大 OL)' },
                    { id: 'SECONDARY_SHORT', text: '次级高压绕组内部绝缘击穿短路 (次级阻值仅 0.85kΩ，无法升压)' },
                    { id: 'DRIVER_STUCK_ON', text: '驱动功率管击穿短路常通 (初级无切断时序，导致严重发烫无火花)' },
                  ].map((opt) => {
                    const isSelected = s4Choice === opt.id;
                    const isCorrect = opt.id === activeBlind.faultType;
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s4Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-orange-500 bg-orange-950/40 text-orange-200';
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
                        requireMeterPowered('OHM_200');
                        return;
                      }
                      if (s4Choice === activeBlind.faultType) {
                        sounds.success();
                        setS4Submitted(true);
                        onStepComplete('BLIND_IGNITION_FAULT_ISOLATION', { caseId: activeBlind.id, choice: s4Choice });
                      } else {
                        sounds.warningBuzz();
                        setS4Submitted(true);
                      }
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-xs font-semibold py-2"
                  >
                    提交盲测诊断结论
                  </Button>
                ) : s4Choice === activeBlind.faultType ? (
                  <Button
                    onClick={() => {
                      if (blindIndex < IGNITION_BLIND_CASES.length - 1) {
                        setBlindIndex(blindIndex + 1);
                        setS4Choice(null);
                        setS4Submitted(false);
                      } else {
                        onAdvanceStep();
                      }
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    {blindIndex < IGNITION_BLIND_CASES.length - 1 ? '正确！进入下一个点火案例' : '盲测全通！进入实车修复与交车'}
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
            {currentStep === 'ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-orange-300">
                  【步骤5交付验收】换新点火线圈与火花塞间隙校准后，实车复测：
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>1. 点火线圈初级绕组电阻:</span>
                    <span className="font-mono text-emerald-400 font-bold">1.0 Ω (标称 0.6Ω~1.5Ω 合格)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>2. 点火线圈次级绕组电阻:</span>
                    <span className="font-mono text-emerald-400 font-bold">9.50 kΩ (标称 6~12kΩ 合格)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>3. 火花塞跳火强度复验:</span>
                    <span className="font-mono text-emerald-400 font-bold">间隙 0.90mm 强劲深蓝火花</span>
                  </div>
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={s5WorkOrderSigned}
                      onChange={(e) => setS5WorkOrderSigned(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500"
                    />
                    <span>确认点火线圈与跳火性能指标全部合格，签署交付工单</span>
                  </label>
                </div>
                {!s5Submitted ? (
                  <Button
                    disabled={!s5Repaired || !s5GapAdjusted || !s5SparkTested || !s5WorkOrderSigned}
                    onClick={() => {
                      sounds.success();
                      setS5Submitted(true);
                      onStepComplete('ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE', {
                        repaired: true,
                        primaryR: 1.0,
                        secondaryR: 9.5,
                        signed: true,
                      });
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    {!s5Repaired
                      ? '请先更换点火线圈'
                      : !s5GapAdjusted
                      ? '请校准火花塞间隙'
                      : !s5SparkTested
                      ? '请执行跳火复测'
                      : !s5WorkOrderSigned
                      ? '请勾选签署交付工单'
                      : '完成交车验收'}
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>恭喜！D04 自感与互感分析实训圆满闭环完成！</span>
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
