'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Footprints,
  Info,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/src/components/visuals/SoundEffects';

interface ShockSimulationLabProps {
  knowledgeIndex: number;
  onComplete: () => void;
}

export function ShockSimulationLab({ knowledgeIndex, onComplete }: ShockSimulationLabProps) {
  // Scenario 0: Shock Risk loop state (微实验 1/5 互动)
  const [isHandTouchingWire, setIsHandTouchingWire] = useState(false);
  const [groundCondition, setGroundCondition] = useState<'CONDUCTIVE_EARTH' | 'INSULATED_MAT'>('INSULATED_MAT');
  const [exp0TestedMat, setExp0TestedMat] = useState(true);

  // Scenario 1: Single Phase state (微实验 2/5 互动)
  const [wearingInsulatedShoes, setWearingInsulatedShoes] = useState(true);
  const [exp1WornShoes, setExp1WornShoes] = useState(true);

  // Scenario 2: Two Phase state (微实验 3/5 互动)
  const [leftTouchPhaseA, setLeftTouchPhaseA] = useState(false);
  const [rightTouchPhaseB, setRightTouchPhaseB] = useState(false);
  const [wearInsulatedGloves, setWearInsulatedGloves] = useState(true);
  const testInsulatedShoesInTwoPhase = true;
  const [exp2ConfirmedLockout, setExp2ConfirmedLockout] = useState(false);

  // Scenario 3: Step Voltage state (微实验 4/5 互动)
  const [strideLength, setStrideLength] = useState<'LARGE' | 'HOP'>('HOP');
  const [exp3TestedHop, setExp3TestedHop] = useState(true);

  // Scenario 4: Wet environment state (微实验 5/5 互动)
  const [isWet, setIsWet] = useState(false);
  const [exp4TestedWet, setExp4TestedWet] = useState(false);

  // Computed states for Scenario 0
  const isLoopClosedExp0 = isHandTouchingWire && groundCondition === 'CONDUCTIVE_EARTH';
  const exp0ObservedBreak = !isHandTouchingWire || groundCondition === 'INSULATED_MAT';
  const isExp0Done = exp0ObservedBreak && exp0TestedMat;

  // Computed states for Scenario 1
  const isExp1Done = exp1WornShoes;

  // Computed states for Scenario 2
  const bothHandsContactExp2 = leftTouchPhaseA && rightTouchPhaseB;
  const isTwoPhaseShockExp2 = bothHandsContactExp2 && !wearInsulatedGloves;
  const isExp2Done = exp2ConfirmedLockout || wearInsulatedGloves || !bothHandsContactExp2;

  // Computed states for Scenario 3
  const isExp3Done = exp3TestedHop;

  // Computed states for Scenario 4
  const isExp4Done = exp4TestedWet;

  // Master gatekeeper: is current micro-experiment completed?
  const isCurrentExpCompleted =
    knowledgeIndex === 0
      ? isExp0Done
      : knowledgeIndex === 1
      ? isExp1Done
      : knowledgeIndex === 2
      ? isExp2Done
      : knowledgeIndex === 3
      ? isExp3Done
      : isExp4Done;

  return (
    <div className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-xl flex flex-col justify-between my-auto animate-in fade-in duration-300">
      {/* 5-Step Lock & Progress Bar */}
      <div className="w-full mb-3 pb-3 border-b border-slate-200">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          {[
            { id: 0, label: '1. 回路原理' },
            { id: 1, label: '2. 单相绝缘' },
            { id: 2, label: '3. 两相触电' },
            { id: 3, label: '4. 跨步电压' },
            { id: 4, label: '5. 安全电压' },
          ].map((step) => {
            const isDone = step.id < knowledgeIndex;
            const isCurrent = step.id === knowledgeIndex;
            return (
              <div
                key={step.id}
                className={`flex-1 py-1.5 px-1.5 sm:px-2.5 rounded-xl text-center text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  isDone
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : isCurrent
                    ? 'bg-sky-50 text-sky-800 border-sky-400 ring-2 ring-sky-500/20 shadow-xs'
                    : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                ) : isCurrent ? (
                  <Zap size={15} className="text-sky-600 shrink-0 animate-pulse" />
                ) : (
                  <Lock size={14} className="text-slate-400 shrink-0" />
                )}
                <span className="truncate">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Experiment 0: SHOCK_RISK (触电回路原理 - 案例认知与安全决策) */}
      {knowledgeIndex === 0 && (
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs sm:text-sm font-bold mb-1.5">
            <Zap size={15} /> 触电微实验 1/5 · 人体回路形成机理
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-1.5">电是怎样通过人体的？</h3>
          <p className="text-slate-600 text-xs sm:text-sm max-w-3xl mb-3">
            触电必须同时具备两个物理条件：<strong>存在电位差（电压）</strong>，且<strong>经人体形成闭合通路</strong>。观察断路与绝缘隔离如何切断回路！
          </p>

          {/* Interactive Closed Loop Diagram */}
          <div className="relative w-full rounded-2xl bg-slate-900 border-2 border-slate-700 p-4 sm:p-5 flex flex-col items-center justify-between shadow-inner mb-3">
            {/* Top Status Header */}
            <div className="flex flex-wrap items-center justify-between w-full px-2 text-xs sm:text-sm font-mono gap-2 mb-2">
              <span className="text-rose-400 font-bold bg-rose-950/80 px-3 py-1 rounded-lg border border-rose-800">
                220V 供电相线 (L)
              </span>
              <span
                className={`font-bold px-3 py-1 rounded border ${
                  isLoopClosedExp0
                    ? 'text-rose-300 bg-rose-950/90 border-rose-600 animate-pulse'
                    : 'text-emerald-300 bg-emerald-950/80 border-emerald-700'
                }`}
              >
                人体回路状态:{' '}
                {isLoopClosedExp0
                  ? '≈ 147 mA (远超50mA心室颤动阈值 · 致命危险!)'
                  : !isHandTouchingWire
                  ? '断路无电流 (空气间隙断开 · 未形成回路)'
                  : '微安级漏电/阻断 (绝缘安全胶垫阻断对地回路)'}
              </span>
            </div>

            {/* SVG Visual Stage */}
            <div className="relative w-full h-[200px] sm:h-[240px] lg:h-[280px] xl:h-[320px] max-w-3xl flex items-center justify-center my-2">
              <svg viewBox="0 0 460 210" className="w-full h-full select-none">
                {/* 220V Live Wire Terminal on Left */}
                <g transform="translate(45, 65)">
                  <rect x="-35" y="-30" width="70" height="60" rx="12" fill="#be123c" stroke="#f43f5e" strokeWidth="2" className="shadow-lg" />
                  <text x="0" y="-8" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">相线 (L)</text>
                  <text x="0" y="12" fill="#fecdd3" fontSize="10" fontFamily="monospace" textAnchor="middle">220V 高电位</text>
                  <circle cx="35" cy="0" r="7" fill={isHandTouchingWire ? "#facc15" : "#ef4444"} stroke="#ffffff" strokeWidth="2" />
                  {isHandTouchingWire && (
                    <circle cx="35" cy="0" r="14" fill="none" stroke="#facc15" strokeWidth="2" className="animate-ping" />
                  )}
                </g>

                {/* Wire Lead reaching from terminal toward hand */}
                <line
                  x1="80"
                  y1="65"
                  x2={isHandTouchingWire ? "170" : "120"}
                  y2={isHandTouchingWire ? "65" : "65"}
                  stroke={isLoopClosedExp0 ? "#ef4444" : isHandTouchingWire ? "#f59e0b" : "#64748b"}
                  strokeWidth="4"
                  strokeDasharray={isLoopClosedExp0 ? "6,6" : "none"}
                />

                {/* Air Gap Indicator when disconnected */}
                {!isHandTouchingWire && (
                  <g transform="translate(145, 65)">
                    <text x="0" y="-8" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">安全空气绝缘间隙</text>
                    <line x1="-15" y1="0" x2="15" y2="0" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3,3" />
                  </g>
                )}

                {/* Human Figure in Center */}
                <g transform="translate(210, 30)">
                  {/* Head */}
                  <circle cx="0" cy="18" r="16" fill="#fed7aa" stroke="#cbd5e1" strokeWidth="2" />
                  {/* Torso */}
                  <line
                    x1="0"
                    y1="34"
                    x2="0"
                    y2="95"
                    stroke={isLoopClosedExp0 ? "#ef4444" : "#94a3b8"}
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Left Hand */}
                  {isHandTouchingWire ? (
                    <line
                      x1="0"
                      y1="48"
                      x2="-40"
                      y2="35"
                      stroke={isLoopClosedExp0 ? "#ef4444" : "#f59e0b"}
                      strokeWidth="5.5"
                      strokeLinecap="round"
                    />
                  ) : (
                    <line
                      x1="0"
                      y1="48"
                      x2="-28"
                      y2="78"
                      stroke="#94a3b8"
                      strokeWidth="5.5"
                      strokeLinecap="round"
                    />
                  )}
                  {/* Right Hand */}
                  <line x1="0" y1="48" x2="28" y2="78" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
                  {/* Legs */}
                  <line
                    x1="0"
                    y1="95"
                    x2="-18"
                    y2="135"
                    stroke={isLoopClosedExp0 ? "#ef4444" : "#94a3b8"}
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="0"
                    y1="95"
                    x2="18"
                    y2="135"
                    stroke={isLoopClosedExp0 ? "#ef4444" : "#94a3b8"}
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />

                  {/* Heart Indicator */}
                  {isLoopClosedExp0 ? (
                    <g transform="translate(0, 56)">
                      <circle cx="0" cy="0" r="12" fill="#f43f5e" className="animate-ping" opacity="0.75" />
                      <circle cx="0" cy="0" r="7" fill="#dc2626" />
                      <text x="0" y="3" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">⚡</text>
                    </g>
                  ) : (
                    <circle cx="0" cy="56" r="5" fill="#10b981" />
                  )}

                  {/* Equivalent Resistance Tag */}
                  <rect x="-42" y="100" width="84" height="18" rx="9" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                  <text x="0" y="112" fill="#facc15" fontSize="9" fontWeight="bold" textAnchor="middle">R人 ≈ 1500Ω</text>

                  {/* Ground Interface Under Feet */}
                  {groundCondition === 'INSULATED_MAT' ? (
                    <g transform="translate(-50, 137)">
                      <rect x="0" y="0" width="100" height="14" rx="4" fill="#065f46" stroke="#10b981" strokeWidth="2" />
                      <text x="50" y="10" fill="#ecfdf5" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                        10kV 绝缘耐压胶垫 (阻断对地回路)
                      </text>
                    </g>
                  ) : (
                    <g transform="translate(-50, 137)">
                      <rect x="0" y="0" width="100" height="10" rx="2" fill="#334155" stroke="#475569" strokeWidth="1.5" />
                      <text x="50" y="8" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">
                        导电地面 (对地闭合通路)
                      </text>
                    </g>
                  )}
                </g>

                {/* Ground Line to GND Terminal */}
                {groundCondition === 'CONDUCTIVE_EARTH' ? (
                  <path
                    d="M 260 172 L 350 172 L 350 95"
                    stroke={isLoopClosedExp0 ? "#ef4444" : "#475569"}
                    strokeWidth="3.5"
                    strokeDasharray={isLoopClosedExp0 ? "6,6" : "none"}
                    fill="none"
                  />
                ) : (
                  <g transform="translate(305, 172)">
                    <line x1="-20" y1="0" x2="20" y2="0" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />
                    <text x="0" y="-6" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle">对地回路切断</text>
                  </g>
                )}

                {/* Ground Terminal on Right */}
                <g transform="translate(390, 65)">
                  <rect x="-35" y="-30" width="70" height="60" rx="12" fill="#065f46" stroke="#10b981" strokeWidth="2" />
                  <text x="0" y="-8" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">大地 (GND)</text>
                  <text x="0" y="12" fill="#a7f3d0" fontSize="10" fontFamily="monospace" textAnchor="middle">0V 参考地</text>
                  <circle cx="-35" cy="0" r="7" fill={isLoopClosedExp0 ? "#facc15" : "#10b981"} stroke="#ffffff" strokeWidth="2" />
                </g>
              </svg>
            </div>

            {/* Analysis & Condition Checklist Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-4xl text-left my-2">
              <div className="bg-slate-800/90 p-3 sm:p-3.5 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-semibold mb-0.5">物理要素 ①：接触带电导体</span>
                  <span className={`text-xs sm:text-sm font-bold ${isHandTouchingWire ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isHandTouchingWire ? '模拟触碰相线 (危险案例演示)' : '保持安全距离 (空气间隙断开)'}
                  </span>
                </div>
                {isHandTouchingWire ? <AlertTriangle size={22} className="text-rose-400 shrink-0" /> : <ShieldCheck size={22} className="text-emerald-400 shrink-0" />}
              </div>

              <div className="bg-slate-800/90 p-3 sm:p-3.5 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-semibold mb-0.5">物理要素 ②：闭合电流回路</span>
                  <span className={`text-xs sm:text-sm font-bold ${groundCondition === 'CONDUCTIVE_EARTH' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {groundCondition === 'CONDUCTIVE_EARTH' ? '足底导电入地 (闭合通路存在)' : '垫上10kV绝缘胶垫 (切断对地通路)'}
                  </span>
                </div>
                {groundCondition === 'CONDUCTIVE_EARTH' ? <AlertTriangle size={22} className="text-rose-400 shrink-0" /> : <ShieldCheck size={22} className="text-emerald-400 shrink-0" />}
              </div>
            </div>

            {/* Safety Disclaimer Banner */}
            <div className="w-full max-w-4xl bg-amber-950/60 border border-amber-600/50 rounded-xl p-3 sm:p-3.5 text-left my-2 flex items-start gap-2.5 text-amber-200 text-xs sm:text-sm">
              <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>安全专业警示：</strong>绝缘用具在额定耐压范围内提供高阻抗阻隔，属于工程被动防护。现实操作中<strong>严禁主动接触任何带电裸露导体</strong>，作业必须先停电验电！
              </span>
            </div>

            {/* Experiment 0 Goal Checklist */}
            <div className={`w-full max-w-4xl p-3 rounded-xl border text-left my-2 transition-all ${
              isExp0Done ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' : 'bg-slate-800/90 border-amber-500/60 text-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  <Zap size={15} /> 本实验认知目标：
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isExp0Done ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-900 text-amber-200'}`}>
                  {isExp0Done ? '✓ 认知达标' : '待完成'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="p-2 rounded-lg flex items-center gap-2 bg-emerald-900/60 text-emerald-300">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>① 识别空气绝缘间隙（断开回路）</span>
                </div>
                <div className={`p-2 rounded-lg flex items-center gap-2 ${exp0TestedMat ? 'bg-emerald-900/60 text-emerald-300' : 'bg-slate-700/60 text-slate-400'}`}>
                  {exp0TestedMat ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> : <div className="w-4 h-4 rounded-full border border-slate-500 shrink-0" />}
                  <span>② 确认绝缘胶垫阻断对地回路原理</span>
                </div>
              </div>
            </div>

            {/* Interactive Control Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-4xl mt-2">
              <Button
                size="sm"
                variant="outline"
                className={`flex-1 h-11 sm:h-12 text-xs sm:text-sm font-bold transition-all ${
                  isHandTouchingWire
                    ? 'bg-rose-950 text-rose-200 border-2 border-rose-600 shadow-md'
                    : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'
                }`}
                onClick={() => {
                  const next = !isHandTouchingWire;
                  setIsHandTouchingWire(next);
                  if (next && groundCondition === 'CONDUCTIVE_EARTH') {
                    sounds.zap();
                  } else {
                    sounds.click();
                  }
                }}
              >
                <Zap size={16} className={`mr-1.5 ${isHandTouchingWire ? 'text-rose-400' : 'text-amber-400'}`} />
                手部状态：{isHandTouchingWire ? '脱离带电体 (保持安全间距)' : '观察意外触碰案例 (模拟险情)'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className={`flex-1 h-11 sm:h-12 text-xs sm:text-sm font-bold transition-all ${
                  groundCondition === 'INSULATED_MAT'
                    ? 'bg-emerald-950 text-emerald-200 border-2 border-emerald-600 shadow-md'
                    : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'
                }`}
                onClick={() => {
                  const nextCond = groundCondition === 'CONDUCTIVE_EARTH' ? 'INSULATED_MAT' : 'CONDUCTIVE_EARTH';
                  setGroundCondition(nextCond);
                  if (nextCond === 'INSULATED_MAT') setExp0TestedMat(true);
                  if (isHandTouchingWire && nextCond === 'CONDUCTIVE_EARTH') {
                    sounds.zap();
                  } else {
                    sounds.success();
                  }
                }}
              >
                <Shield size={16} className={`mr-1.5 ${groundCondition === 'INSULATED_MAT' ? 'text-emerald-400' : 'text-slate-400'}`} />
                足底介质：{groundCondition === 'INSULATED_MAT' ? '10kV 绝缘耐压胶垫 (切断对地回路)' : '导电地面 (对地闭合回路)'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Experiment 1: SINGLE_PHASE (单相触电与绝缘鞋实验) */}
      {knowledgeIndex === 1 && (
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-sky-100 text-sky-800 text-xs sm:text-sm font-bold mb-1.5">
            <Shield size={15} /> 触电微实验 2/5 · 单相触电与对地绝缘
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-1.5">人只碰了一根线，为什么会触电？</h3>
          <p className="text-slate-600 text-xs sm:text-sm max-w-3xl mb-3">
            单相触电是人体接触相线，电流通过人体流向大地形成回路。观察<strong>绝缘安全鞋</strong>对对地电流的阻断模型与限度！
          </p>

          <div className="relative w-full rounded-2xl bg-slate-900 border-2 border-slate-700 p-4 sm:p-5 flex flex-col items-center justify-between shadow-inner mb-3">
            {/* Top Status Header */}
            <div className="flex flex-wrap items-center justify-between w-full px-2 text-xs sm:text-sm font-mono gap-2 mb-2">
              <span className="text-rose-400 font-bold bg-rose-950/80 px-3 py-1 rounded-lg border border-rose-800">
                220V 供电相线
              </span>
              <span
                className={`font-bold px-3.5 py-1 rounded-lg border ${
                  wearingInsulatedShoes
                    ? 'text-emerald-300 bg-emerald-950/80 border-emerald-700'
                    : 'text-rose-300 bg-rose-950/80 border-rose-700 animate-pulse'
                }`}
              >
                人体对地电流: {wearingInsulatedShoes ? '对地回路阻断 (绝缘鞋提供超高对地阻抗)' : '≈ 146 mA (远超50mA致死危险!)'}
              </span>
            </div>

            {/* Illustration */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 my-3 w-full max-w-3xl">
              <div className="relative flex flex-col items-center shrink-0">
                <svg viewBox="0 0 90 120" className="w-32 h-44 sm:w-40 sm:h-52 lg:w-48 lg:h-60 drop-shadow-lg">
                  <circle cx="45" cy="20" r="12" fill="#fed7aa" stroke="#cbd5e1" strokeWidth="2" />
                  <line
                    x1="45"
                    y1="32"
                    x2="45"
                    y2="78"
                    stroke={wearingInsulatedShoes ? '#94a3b8' : '#ef4444'}
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <line
                    x1="45"
                    y1="42"
                    x2="14"
                    y2="14"
                    stroke={wearingInsulatedShoes ? '#94a3b8' : '#ef4444'}
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="45"
                    y1="78"
                    x2="28"
                    y2="108"
                    stroke={wearingInsulatedShoes ? '#94a3b8' : '#ef4444'}
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="45"
                    y1="78"
                    x2="62"
                    y2="108"
                    stroke={wearingInsulatedShoes ? '#94a3b8' : '#ef4444'}
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  {/* Shoes */}
                  <rect
                    x="20"
                    y="106"
                    width="16"
                    height="10"
                    rx="4"
                    fill={wearingInsulatedShoes ? '#10b981' : '#64748b'}
                  />
                  <rect
                    x="54"
                    y="106"
                    width="16"
                    height="10"
                    rx="4"
                    fill={wearingInsulatedShoes ? '#10b981' : '#64748b'}
                  />
                </svg>
              </div>

              <div className="text-left flex-1 space-y-2 bg-slate-800/90 p-4 sm:p-5 rounded-2xl border border-slate-700 text-xs sm:text-sm">
                <div className="text-slate-300 font-semibold">
                  当前足底绝缘状态：
                  <strong className={wearingInsulatedShoes ? 'text-emerald-400' : 'text-rose-400'}>
                    {wearingInsulatedShoes ? '耐压绝缘安全鞋 (对地高阻隔)' : '普通鞋底 / 潮湿地面 (导电)'}
                  </strong>
                </div>
                <div className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  {wearingInsulatedShoes
                    ? '✓ 绝缘鞋在额定耐压范围内切断了常规对地回路。注意：绝缘老化、受潮或超耐压时存在击穿风险，绝不能视作随意碰电的借口！'
                    : '⚠ 大地具备导电性。未做绝缘防护时，相线电压直接作用于人体与大地之间，形成严重单相触电！'}
                </div>
              </div>
            </div>

            {/* Experiment 1 Goal Checklist */}
            <div className={`w-full max-w-3xl p-3 rounded-xl border text-left my-2 transition-all ${
              isExp1Done ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' : 'bg-slate-800/90 border-amber-500/60 text-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  <Shield size={15} /> 本实验认知目标：
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isExp1Done ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-900 text-amber-200'}`}>
                  {isExp1Done ? '✓ 认知达标' : '待完成'}
                </span>
              </div>
              <div className="p-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm bg-emerald-900/60 text-emerald-300">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>掌握绝缘鞋切断对地回路原理及防护局限性</span>
              </div>
            </div>

            {/* Toggle Button inside Experiment */}
            <Button
              size="sm"
              variant="outline"
              className="bg-slate-800 text-white border-2 border-slate-600 hover:bg-slate-700 h-11 sm:h-12 px-6 text-xs sm:text-sm font-bold shadow-md mt-2 w-full max-w-3xl"
              onClick={() => {
                sounds.click();
                const next = !wearingInsulatedShoes;
                setWearingInsulatedShoes(next);
                if (next) setExp1WornShoes(true);
              }}
            >
              <Shield size={16} className="mr-1.5 text-sky-400" />
              切换对比：{wearingInsulatedShoes ? '查看普通导电鞋底下的单相回路' : '穿戴合规绝缘鞋 (观察对地阻断)'}
            </Button>
          </div>
        </div>
      )}

      {/* Experiment 2: TWO_PHASE (两相触电 380V - 路径认知与安全挂锁决策) */}
      {knowledgeIndex === 2 && (
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs sm:text-sm font-bold mb-1.5">
            <AlertTriangle size={15} /> 触电微实验 3/5 · 两相触电 (380V 线电压)
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-1.5">为什么两相触电危险性最大？</h3>
          <p className="text-slate-600 text-xs sm:text-sm max-w-3xl mb-3">
            两相触电承受 <strong>380V 线电压</strong>，电流横贯胸膛直达心脏！电流经由相间闭合，<strong>绝缘鞋完全无法防护</strong>！
          </p>

          <div className="relative w-full rounded-2xl bg-slate-900 border-2 border-slate-700 p-4 sm:p-5 flex flex-col items-center justify-between shadow-inner mb-3">
            {/* Top Status Bar with 380V Readout */}
            <div className="flex flex-wrap items-center justify-between w-full px-2 text-xs sm:text-sm font-mono gap-2 mb-2">
              <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1 rounded-lg border border-yellow-500/50">
                <span className={`w-3 h-3 rounded-full bg-yellow-400 ${leftTouchPhaseA ? 'animate-ping' : ''}`} />
                <span className="text-yellow-300 font-bold">A相 (380V)</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-rose-400 font-mono font-bold bg-rose-950 px-3 py-1 rounded-lg border border-rose-600">
                  U = 380V
                </span>
                <span
                  className={`font-bold px-3.5 py-1 rounded-lg border ${
                    isTwoPhaseShockExp2
                      ? 'text-rose-300 bg-rose-950/90 border-rose-600 animate-pulse'
                      : 'text-emerald-300 bg-emerald-950/80 border-emerald-700'
                  }`}
                >
                  相间回路状态:{' '}
                  {isTwoPhaseShockExp2
                    ? '≈ 253 mA (380V线电压横贯胸膛 · 极度致命!)'
                    : bothHandsContactExp2 && wearInsulatedGloves
                    ? '相间回路阻断 (绝缘手套阻断相间电流)'
                    : '未构成相间回路 (保持安全绝缘)'}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-lg border border-green-500/50">
                <span className={`w-3 h-3 rounded-full bg-green-400 ${rightTouchPhaseB ? 'animate-ping' : ''}`} />
                <span className="text-green-300 font-bold">B相 (380V)</span>
              </div>
            </div>

            {/* Current path across the arms through chest */}
            <div className="relative flex items-center justify-center w-full my-2">
              <svg viewBox="0 0 380 130" className="w-full max-w-2xl lg:max-w-3xl h-[180px] sm:h-[220px] lg:h-[260px] xl:h-[300px] select-none">
                {/* A Phase Terminal (Yellow) */}
                <circle cx="40" cy="30" r="14" fill="#854d0e" stroke="#eab308" strokeWidth="2.5" />
                <text x="40" y="34" fill="#fef08a" fontSize="10" fontWeight="bold" textAnchor="middle">A相</text>

                {/* B Phase Terminal (Green) */}
                <circle cx="340" cy="30" r="14" fill="#14532d" stroke="#22c55e" strokeWidth="2.5" />
                <text x="340" y="34" fill="#bbf7d0" fontSize="10" fontWeight="bold" textAnchor="middle">B相</text>

                {/* Head */}
                <circle cx="190" cy="36" r="14" fill="#fed7aa" stroke="#cbd5e1" strokeWidth="2" />

                {/* Torso */}
                <line
                  x1="190"
                  y1="50"
                  x2="190"
                  y2="105"
                  stroke={isTwoPhaseShockExp2 ? "#ef4444" : "#94a3b8"}
                  strokeWidth="7"
                  strokeLinecap="round"
                />

                {/* Left Arm to A Phase */}
                <line
                  x1="190"
                  y1="60"
                  x2={leftTouchPhaseA ? "45" : "120"}
                  y2={leftTouchPhaseA ? "32" : "90"}
                  stroke={isTwoPhaseShockExp2 ? "#ef4444" : leftTouchPhaseA ? "#f59e0b" : "#94a3b8"}
                  strokeWidth="5.5"
                  strokeLinecap="round"
                />

                {/* Right Arm to B Phase */}
                <line
                  x1="190"
                  y1="60"
                  x2={rightTouchPhaseB ? "335" : "260"}
                  y2={rightTouchPhaseB ? "32" : "90"}
                  stroke={isTwoPhaseShockExp2 ? "#ef4444" : rightTouchPhaseB ? "#22c55e" : "#94a3b8"}
                  strokeWidth="5.5"
                  strokeLinecap="round"
                />

                {/* Insulated Gloves Indication */}
                {wearInsulatedGloves && (
                  <>
                    <circle cx={leftTouchPhaseA ? "45" : "120"} cy={leftTouchPhaseA ? "32" : "90"} r="8" fill="#ea580c" stroke="#fed7aa" strokeWidth="2" />
                    <circle cx={rightTouchPhaseB ? "335" : "260"} cy={rightTouchPhaseB ? "32" : "90"} r="8" fill="#ea580c" stroke="#fed7aa" strokeWidth="2" />
                  </>
                )}

                {/* Heart in chest */}
                {isTwoPhaseShockExp2 ? (
                  <>
                    <line
                      x1="45"
                      y1="32"
                      x2="335"
                      y2="32"
                      stroke="#ef4444"
                      strokeWidth="3.5"
                      strokeDasharray="6,6"
                      strokeLinecap="round"
                      className="animate-pulse"
                    />
                    <circle cx="190" cy="68" r="16" fill="#f43f5e" className="animate-ping" opacity="0.6" />
                    <circle cx="190" cy="68" r="9" fill="#dc2626" />
                    <text x="190" y="72" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">⚡</text>
                  </>
                ) : (
                  <circle cx="190" cy="68" r="5" fill="#10b981" />
                )}

                {/* Legs (feet with shoes) */}
                <line x1="190" y1="105" x2="165" y2="128" stroke="#94a3b8" strokeWidth="4" />
                <line x1="190" y1="105" x2="215" y2="128" stroke="#94a3b8" strokeWidth="4" />
                {testInsulatedShoesInTwoPhase ? (
                  <>
                    <rect x="156" y="125" width="14" height="5" rx="2" fill="#10b981" />
                    <rect x="210" y="125" width="14" height="5" rx="2" fill="#10b981" />
                  </>
                ) : (
                  <>
                    <rect x="156" y="125" width="14" height="5" rx="2" fill="#64748b" />
                    <rect x="210" y="125" width="14" height="5" rx="2" fill="#64748b" />
                  </>
                )}
              </svg>
            </div>

            {/* Misconception Buster / Safety Alert Box */}
            <div className="w-full max-w-4xl my-2">
              <div className="bg-slate-800/90 p-3.5 sm:p-4 rounded-xl border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium text-left shadow-md">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-xs sm:text-base mb-1">
                  <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                  【核心认知】两相触电路径流经胸部，绝缘鞋完全无法防护！
                </div>
                <p className="leading-relaxed text-slate-300 text-xs sm:text-sm">
                  两相触电电流路径为<strong>【A相 → 手臂 → 胸部心脏 → 手臂 → B相】</strong>，<strong>不流经双脚大地</strong>！
                  因此即便脚穿绝缘鞋也<strong>完全无用</strong>！现场防范首要原则是：<strong>严格停电、验电、挂锁挂牌（LOTO）</strong>。
                </p>
              </div>
            </div>

            {/* Experiment 2 Goal Checklist */}
            <div className={`w-full max-w-4xl p-3 rounded-xl border text-left my-2 transition-all ${
              isExp2Done ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' : 'bg-slate-800/90 border-amber-500/60 text-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle size={15} /> 本实验认知目标：
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isExp2Done ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-900 text-amber-200'}`}>
                  {isExp2Done ? '✓ 认知达标' : '待完成'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="p-2 rounded-lg flex items-center gap-2 bg-emerald-900/60 text-emerald-300">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>① 辨识胸膛横贯路径与绝缘鞋局限性</span>
                </div>
                <div className="p-2 rounded-lg flex items-center gap-2 bg-emerald-900/60 text-emerald-300">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>② 确认先断电验电挂锁的核心防范决策</span>
                </div>
              </div>
            </div>

            {/* Interactive Decision & Toggle Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-4xl mt-2">
              <Button
                size="sm"
                variant="outline"
                className={`h-11 sm:h-12 text-xs sm:text-sm font-bold transition-all ${
                  wearInsulatedGloves
                    ? 'bg-emerald-950 text-emerald-200 border-2 border-emerald-500 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
                }`}
                onClick={() => {
                  const next = !wearInsulatedGloves;
                  setWearInsulatedGloves(next);
                  if (next) {
                    sounds.success();
                  } else {
                    sounds.click();
                  }
                }}
              >
                <Shield size={15} className="mr-1.5 text-emerald-400" />
                绝缘防护：{wearInsulatedGloves ? '已佩戴高压绝缘手套' : '未佩戴手套 (高危)'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700 h-11 sm:h-12 text-xs sm:text-sm font-bold"
                onClick={() => {
                  sounds.click();
                  const nextA = !leftTouchPhaseA;
                  const nextB = !rightTouchPhaseB;
                  setLeftTouchPhaseA(nextA);
                  setRightTouchPhaseB(nextB);
                  if (nextA && nextB && !wearInsulatedGloves) {
                    sounds.zap();
                  }
                }}
              >
                <Zap size={15} className="mr-1.5 text-amber-400" />
                {bothHandsContactExp2 ? '脱开导体 (恢复安全间隙)' : '查看相间闭合模拟案例'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className={`h-11 sm:h-12 text-xs sm:text-sm font-bold transition-all ${
                  exp2ConfirmedLockout
                    ? 'bg-sky-950 text-sky-200 border-2 border-sky-500'
                    : 'bg-slate-800 text-amber-300 border-amber-600/60 hover:bg-slate-700'
                }`}
                onClick={() => {
                  sounds.success();
                  setExp2ConfirmedLockout(true);
                }}
              >
                <Lock size={15} className="mr-1.5 text-sky-400" />
                {exp2ConfirmedLockout ? '✓ 已确认先停电验电挂锁' : '确认安全规程：断电验电挂锁'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Experiment 3: STEP_VOLTAGE (跨步电压与等电位逃生) */}
      {knowledgeIndex === 3 && (
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-purple-100 text-purple-800 text-xs sm:text-sm font-bold mb-1.5">
            <Footprints size={15} /> 触电微实验 4/5 · 跨步电压与等电位逃生
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-1.5">高压线落地，怎样逃生才安全？</h3>
          <p className="text-slate-600 text-xs sm:text-sm max-w-3xl mb-3">
            高压导线落地后以落地点为中心形成<strong>同心圆电位衰减分布（8米危险区）</strong>。双脚跨步电位差越小越安全！
          </p>

          <div className="relative w-full rounded-2xl bg-slate-900 border-2 border-slate-700 p-4 sm:p-5 flex flex-col items-center justify-between shadow-inner mb-3">
            {/* Concentric equipotential circles visualization */}
            <div className="relative w-full h-[200px] sm:h-[240px] lg:h-[280px] xl:h-[320px] max-w-3xl flex items-center justify-center my-2">
              <svg viewBox="0 0 440 200" className="w-full h-full select-none">
                {/* Fallen wire at left */}
                <circle cx="50" cy="100" r="160" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4,4" fill="none" opacity="0.35" />
                <circle cx="50" cy="100" r="120" stroke="#fb923c" strokeWidth="2" strokeDasharray="4,4" fill="none" opacity="0.55" />
                <circle cx="50" cy="100" r="75" stroke="#facc15" strokeWidth="2.5" strokeDasharray="4,4" fill="none" opacity="0.75" />
                <circle cx="50" cy="100" r="30" stroke="#ef4444" strokeWidth="3.5" fill="#dc2626" opacity="0.95" />

                {/* Ground Zero Wire Spark */}
                <text x="50" y="105" fill="#fff" fontSize="12" textAnchor="middle" fontWeight="bold">⚡落地点</text>

                {/* Equipotential Labels */}
                <text x="115" y="55" fill="#facc15" fontSize="12" fontWeight="bold">800V</text>
                <text x="160" y="55" fill="#fb923c" fontSize="12" fontWeight="bold">500V</text>
                <text x="200" y="55" fill="#f43f5e" fontSize="12" fontWeight="bold">200V</text>

                {/* Student Feet Visualization */}
                {strideLength === 'LARGE' ? (
                  <g transform="translate(150, 90)">
                    <circle cx="0" cy="10" r="8" fill="#ef4444" className="animate-ping" />
                    <circle cx="0" cy="10" r="7" fill="#f43f5e" />
                    <text x="0" y="28" fill="#fca5a5" fontSize="11" textAnchor="middle" fontWeight="bold">左脚 600V</text>

                    <circle cx="65" cy="10" r="8" fill="#ef4444" className="animate-ping" />
                    <circle cx="65" cy="10" r="7" fill="#f43f5e" />
                    <text x="65" y="28" fill="#fca5a5" fontSize="11" textAnchor="middle" fontWeight="bold">右脚 300V</text>

                    <line x1="8" y1="10" x2="57" y2="10" stroke="#ef4444" strokeWidth="4" strokeDasharray="4,4" />
                  </g>
                ) : (
                  <g transform="translate(180, 90)">
                    <circle cx="0" cy="10" r="7" fill="#10b981" />
                    <circle cx="14" cy="10" r="7" fill="#10b981" />
                    <text x="7" y="28" fill="#6ee7b7" fontSize="11" textAnchor="middle" fontWeight="bold">并步跳 ≈400V</text>
                  </g>
                )}
              </svg>
            </div>

            {/* Readout Status Bar */}
            <div className="flex items-center justify-between w-full max-w-4xl px-4 py-2 bg-slate-950/80 rounded-xl border border-slate-700 text-xs sm:text-sm my-2">
              <span className="text-slate-300 font-semibold">两脚跨步电位差 ΔU：</span>
              <strong
                className={`font-mono text-xs sm:text-base px-3.5 py-1 rounded-lg font-black ${
                  strideLength === 'LARGE'
                    ? 'bg-rose-950 text-rose-300 border border-rose-600 animate-pulse'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                }`}
              >
                {strideLength === 'LARGE' ? 'ΔU = 300V (跨步电压险情!)' : 'ΔU ≈ 0V (双脚等电位逃生 · 避免跨步电压)'}
              </strong>
            </div>

            {/* Experiment 3 Goal Checklist */}
            <div className="w-full max-w-4xl p-3 rounded-xl border text-left my-2 bg-emerald-950/90 border-emerald-500 text-emerald-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  <Footprints size={15} /> 本实验认知目标：
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-800 text-emerald-100">
                  ✓ 认知达标
                </span>
              </div>
              <div className="p-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm bg-emerald-900/60 text-emerald-300">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>掌握双脚并拢跳 / 单脚跳等电位逃生原理，并跳出 8 米以上危险区</span>
              </div>
            </div>

            {/* Interactive Toggle Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-4xl pt-2">
              <Button
                size="sm"
                variant="outline"
                className={`flex-1 h-11 sm:h-12 text-xs sm:text-sm font-bold transition-all ${
                  strideLength === 'LARGE'
                    ? 'bg-rose-900/80 text-rose-100 border-2 border-rose-500 shadow-md'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
                onClick={() => {
                  sounds.zap();
                  setStrideLength('LARGE');
                }}
              >
                迈大步逃跑 (步幅跨过不同等电位面 · 危险)
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={`flex-1 h-11 sm:h-12 text-xs sm:text-sm font-bold transition-all ${
                  strideLength === 'HOP'
                    ? 'bg-emerald-900/80 text-emerald-100 border-2 border-emerald-500 shadow-md'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
                onClick={() => {
                  sounds.success();
                  setStrideLength('HOP');
                  setExp3TestedHop(true);
                }}
              >
                双脚并拢跳 / 单脚跳 (处于同一等电位线 · 安全撤离)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Experiment 4: SAFE_VOLTAGE (环境与安全电压五个等级) */}
      {knowledgeIndex === 4 && (
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold mb-1.5">
            <ShieldAlert size={15} /> 触电微实验 5/5 · 安全电压等级标准
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-1.5">安全电压永远是 36V 吗？</h3>
          <p className="text-slate-600 text-xs sm:text-sm max-w-3xl mb-3">
            国家标准规定安全电压额定值为<strong>42V、36V、24V、12V、6V</strong>五个等级。环境潮湿狭窄时，人体阻抗骤降，安全电压上限显著降低！
          </p>

          <div className="relative w-full rounded-2xl bg-slate-900 border-2 border-slate-700 p-4 sm:p-5 flex flex-col items-center justify-around shadow-inner mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-4xl text-left">
              <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700">
                <span className="text-xs sm:text-sm text-slate-400 font-semibold">当前车间工况环境</span>
                <strong className="block text-sm sm:text-base text-white font-bold mt-1">
                  {isWet ? '地沟积水 / 潮湿狭小环境' : '干燥车间 / 常规通风良好'}
                </strong>
              </div>
              <div className="bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-700">
                <span className="text-xs sm:text-sm text-slate-400 font-semibold">适用安全电压上限</span>
                <strong className={`block text-sm sm:text-base font-bold mt-1 ${isWet ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {isWet ? '12V 或 6V (必须使用特低电压)' : '36V 或 24V (常规工况)'}
                </strong>
              </div>
            </div>

            {/* Voltage Ladder Visualization */}
            <div className="flex items-center justify-around w-full max-w-4xl px-2 py-4">
              {['42V', '36V', '24V', '12V', '6V'].map((val, idx) => (
                <div key={val} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center font-mono font-black text-sm sm:text-base shadow-md ${
                      isWet && idx < 3
                        ? 'bg-rose-950 text-rose-400 border-2 border-rose-700 line-through opacity-40'
                        : 'bg-emerald-900 text-emerald-300 border-2 border-emerald-500'
                    }`}
                  >
                    {val}
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">
                    {idx === 1 ? '常规车间' : idx === 3 ? '潮湿狭窄' : ''}
                  </span>
                </div>
              ))}
            </div>

            {/* Experiment 4 Goal Checklist */}
            <div className={`w-full max-w-4xl p-3 rounded-xl border text-left my-2 transition-all ${
              isExp4Done ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' : 'bg-slate-800/90 border-amber-500/60 text-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert size={15} /> 本实验认知目标：
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isExp4Done ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-900 text-amber-200'}`}>
                  {isExp4Done ? '✓ 认知达标' : '待完成'}
                </span>
              </div>
              <div className={`p-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm ${exp4TestedWet ? 'bg-emerald-900/60 text-emerald-300' : 'bg-slate-700/60 text-slate-400'}`}>
                {exp4TestedWet ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> : <div className="w-4 h-4 rounded-full border border-slate-500 shrink-0" />}
                <span>切换为“模拟地沟积水/潮湿工况”，观察安全电压上限下调至 12V/6V</span>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="bg-slate-800 text-white border-2 border-slate-600 hover:bg-slate-700 h-11 sm:h-12 px-6 text-xs sm:text-sm font-bold shadow-md mt-2 w-full max-w-4xl"
              onClick={() => {
                sounds.click();
                const next = !isWet;
                setIsWet(next);
                if (next) setExp4TestedWet(true);
              }}
            >
              切换工况环境：{isWet ? '恢复干燥车间工况 (常规 36V/24V)' : '模拟地沟积水/潮湿狭窄工况 (降至 12V/6V)'}
            </Button>
          </div>
        </div>
      )}

      {/* Sequential Completion Gatekeeper Button */}
      <div className="pt-3 flex flex-col items-center gap-2 border-t border-slate-200 mt-2 w-full max-w-4xl mx-auto">
        <Button
          size="lg"
          disabled={!isCurrentExpCompleted}
          className={`w-full font-bold h-12 sm:h-14 rounded-2xl text-sm sm:text-base shadow-lg transition-all ${
            isCurrentExpCompleted
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-[0.99] cursor-pointer animate-pulse'
              : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-75'
          }`}
          onClick={() => {
            if (!isCurrentExpCompleted) return;
            sounds.success();
            onComplete();
          }}
        >
          {isCurrentExpCompleted ? (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle2 size={20} className="text-white" />
              {knowledgeIndex === 4
                ? '全部微实验认知达成！进入人员应急处置 →'
                : `微实验 ${knowledgeIndex + 1} 认知达标 · 进入下一个微实验 →`}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <Lock size={16} className="text-slate-400 shrink-0" />
              {knowledgeIndex === 0
                ? '未达标：请观察空气绝缘间隙与绝缘胶垫阻断原理'
                : knowledgeIndex === 1
                ? '未达标：请掌握绝缘鞋切断对地回路原理'
                : knowledgeIndex === 2
                ? '未达标：请辨识相间回路并确认停电验电决策'
                : knowledgeIndex === 3
                ? '未达标：请掌握等电位逃生动作要领'
                : '未达标：请点击切换为“地沟积水/潮湿工况”观察安全电压变化'}
            </span>
          )}
        </Button>

        {!isCurrentExpCompleted ? (
          <p className="text-xs text-amber-700 font-bold flex items-center gap-1.5 animate-pulse">
            <Lock size={14} />
            教学约束：必须先完成当前微实验的认知观察后，才允许进入下一个微实验。
          </p>
        ) : (
          <p className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            认知达标：当前微实验核心原理已明确，可点击上方按钮继续推进！
          </p>
        )}
      </div>
    </div>
  );
}
