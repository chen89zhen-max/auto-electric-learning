'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  HelpCircle,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DCSolver } from '@/src/circuit/solver/DCSolver';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { type B02Step } from './b02Training';

function solveLampCircuit(voltage: number, lampResistance: number, connection: 'series' | 'parallel') {
  const solver = new DCSolver('0');
  solver.addVoltageSource({ id: 'BATTERY', nodePos: 'P', nodeNeg: '0', voltage });
  if (connection === 'series') {
    solver.addResistor({ id: 'L1', nodeA: 'P', nodeB: 'M', resistance: lampResistance });
    solver.addResistor({ id: 'L2', nodeA: 'M', nodeB: '0', resistance: lampResistance });
  } else {
    solver.addResistor({ id: 'L1', nodeA: 'P', nodeB: '0', resistance: lampResistance });
    solver.addResistor({ id: 'L2', nodeA: 'P', nodeB: '0', resistance: lampResistance });
  }
  return solver.solve();
}

export function compareB02LampConnections(voltage: number, lampOneResistance: number, lampTwoResistance: number) {
  const series = solveLampCircuit(voltage, lampOneResistance, 'series');
  const parallel = solveLampCircuit(voltage, lampTwoResistance, 'parallel');
  return {
    series: {
      lampVoltage: series.branchVoltages.get('L1') ?? 0,
      totalCurrent: series.branchCurrents.get('BATTERY') ?? 0,
    },
    parallel: {
      lampVoltage: parallel.branchVoltages.get('L1') ?? 0,
      totalCurrent: parallel.branchCurrents.get('BATTERY') ?? 0,
      removingOneLampKeepsOtherOn: true,
    },
  };
}

interface B02LoadConnectionSceneProps {
  currentStep: B02Step;
  onStepComplete: (step: B02Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

export function B02LoadConnectionScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
}: B02LoadConnectionSceneProps) {
  // Step 1: Series Circuit state
  const [isSeriesClosed, setIsSeriesClosed] = useState(false);
  const [isSeriesLamp1Removed, setIsSeriesLamp1Removed] = useState(false);

  // Step 2: Parallel Circuit state
  const [isParallelLamp1Removed, setIsParallelLamp1Removed] = useState(false);

  // Step 3: Compound circuit short bypass & Node question
  const [shortBypassAttempted, setShortBypassAttempted] = useState(false);
  const [step3Choice, setStep3Choice] = useState<string | null>(null);
  const [step3Submitted, setStep3Submitted] = useState<boolean>(false);
  const [step3Feedback, setStep3Feedback] = useState<string | null>(null);

  // Step 4: Quantitative Fog Lamp Prediction
  const [step4Choice, setStep4Choice] = useState<string | null>(null);
  const [step4Submitted, setStep4Submitted] = useState<boolean>(false);
  const [step4Feedback, setStep4Feedback] = useState<string | null>(null);

  // Step 5: Transfer Spotlight Mod Risk & Decision
  const [step5Decision, setStep5Decision] = useState<string | null>(null);
  const [step5Submitted, setStep5Submitted] = useState<boolean>(false);
  const [step5Feedback, setStep5Feedback] = useState<string | null>(null);

  // Step 1 operations
  const handleToggleSeriesSwitch = () => {
    sounds.click();
    const next = !isSeriesClosed;
    setIsSeriesClosed(next);
    if (next && isSeriesLamp1Removed) {
      onStepComplete('SERIES_DIVIDER_TEST', {
        seriesDimmingObserved: true,
        seriesCircuitBroken: true,
        lampVoltage: 6.0,
        totalCurrent: 1.0,
      });
    }
  };

  const handleToggleSeriesLamp1 = () => {
    sounds.click();
    const next = !isSeriesLamp1Removed;
    setIsSeriesLamp1Removed(next);
    if (next) {
      sounds.warningBuzz();
      if (isSeriesClosed) {
        onStepComplete('SERIES_DIVIDER_TEST', {
          seriesDimmingObserved: true,
          seriesCircuitBroken: true,
          lampVoltage: 6.0,
          totalCurrent: 1.0,
        });
      }
    }
  };

  // Step 2 operations
  const handleToggleParallelLamp1 = () => {
    sounds.click();
    const next = !isParallelLamp1Removed;
    setIsParallelLamp1Removed(next);
    if (next) {
      sounds.success();
      onStepComplete('PARALLEL_INDEPENDENT_TEST', {
        parallelIndependentObserved: true,
        lamp2StaysOn: true,
        fullVoltage12V: true,
        totalCurrent: 4.0,
        equivalentResistance: 3.0,
      });
    }
  };

  // Step 3 operations
  const handleAttemptShortBypass = () => {
    sounds.zap();
    sounds.warningBuzz();
    setShortBypassAttempted(true);
  };

  const handleSubmitStep3 = () => {
    sounds.click();
    if (!step3Choice) return;
    setStep3Submitted(true);
    if (step3Choice === 'OPT_A') {
      sounds.success();
      setStep3Feedback(
        '分析完全正确！串联与并联的根本区别取决于元件端子的“电气节点”拓扑连接，与原理图如何排版绘图毫无关系。只要元件两端跨接在同一对等电位节点上，它们就承受相同电压并构成并联回路！'
      );
      onStepComplete('COMPOUND_SHORT_BYPASS', {
        nodeTheoryConfirmed: true,
        choice: step3Choice,
        shortBypassTested: shortBypassAttempted,
      });
    } else {
      sounds.warningBuzz();
      setStep3Feedback(
        '分析有误：不要被图纸上线条排在同一水平还是上下层误导！只有节点等电位连接关系才是判定拓扑的唯一物理依据。请重新辨析！'
      );
    }
  };

  // Step 4 operations
  const handleSubmitStep4 = () => {
    sounds.click();
    if (!step4Choice) return;
    setStep4Submitted(true);
    if (step4Choice === 'OPT_12_10') {
      sounds.success();
      setStep4Feedback(
        '推算完全精准！并联等效电阻计算：R_总 = (2.0 × 3.0) / (2.0 + 3.0) = 1.2Ω。在 12V 供电下，总干路工作电流 I_总 = 12.0V ÷ 1.2Ω = 10.0A。汽车改装加装并联电器时，总电流随等效阻值骤降而激增，必须依此核选保险丝与线径！'
      );
      onStepComplete('QUANTITATIVE_FOG_PREDICT', {
        predictedEquivalentResistance: 1.2,
        predictedTotalCurrent: 10.0,
        calculationAccurate: true,
      });
    } else {
      sounds.warningBuzz();
      setStep4Feedback('计算有误：并联电阻是“越并越小”，不能直接相加！请使用并联并联公式 (R1×R2)/(R1+R2) 重新计算。');
    }
  };

  // Step 5 operations
  const handleSubmitStep5 = () => {
    sounds.click();
    if (!step5Decision) return;
    setStep5Submitted(true);
    if (step5Decision === 'OPT_A') {
      sounds.success();
      setStep5Feedback(
        '技师决策极其专业！400W 越野射灯在 12V 下工作电流高达 33.3A（冷态冲击电流更超 45A）。原车备用电源回路仅按 15A（1.0mm² 线束）设计，换插 40A 保险丝将彻底丧失熔断保护，导致细线束在数分钟内绝缘皮烧毁甚至引燃全车！规范改装工艺必须铺设 6.0mm² 专用耐热粗线，加装 40A 独立主保险盒，并由大电流继电器隔离控制。'
      );
      onStepComplete('TRANSFER_SPOTLIGHT_MOD_RISK', {
        spotlightCurrentCalculated: 33.3,
        overloadRiskRecognized: true,
        modificationDecision: 'OPT_A',
      });
    } else {
      sounds.warningBuzz();
      setStep5Feedback(
        '决策不合规：盲目加大保险丝是引发汽车电气自燃的第一大祸根！原车线束过细会形成极高电阻发热点，请重新审视大功率改装的线径与继电器规范！'
      );
    }
  };

  // Step advance ready check
  const isStepAdvanceReady =
    (currentStep === 'SERIES_DIVIDER_TEST' && isSeriesClosed && isSeriesLamp1Removed) ||
    (currentStep === 'PARALLEL_INDEPENDENT_TEST' && isParallelLamp1Removed) ||
    (currentStep === 'COMPOUND_SHORT_BYPASS' && step3Submitted && step3Choice === 'OPT_A') ||
    (currentStep === 'QUANTITATIVE_FOG_PREDICT' && step4Submitted && step4Choice === 'OPT_12_10') ||
    (currentStep === 'TRANSFER_SPOTLIGHT_MOD_RISK' && step5Submitted && step5Decision === 'OPT_A');

  return (
    <div className="w-full flex-1 flex flex-col gap-4 text-slate-800 min-h-[580px]">
      {/* Top Step Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isStepAdvanceReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-xs sm:text-sm font-black text-slate-800 tracking-wider">
              {currentStep === 'SERIES_DIVIDER_TEST' && '阶段 1 / 5 · 串联负载分压暗淡与相互制约缺陷验证'}
              {currentStep === 'PARALLEL_INDEPENDENT_TEST' && '阶段 2 / 5 · 并联独立供电与等效电阻骤降 (汽车标准接法)'}
              {currentStep === 'COMPOUND_SHORT_BYPASS' && '阶段 3 / 5 · 混联短路旁路与电路电气节点本质辨析'}
              {currentStep === 'QUANTITATIVE_FOG_PREDICT' && '阶段 4 / 5 · 加装并联雾灯组等效阻值与总电流推算'}
              {currentStep === 'TRANSFER_SPOTLIGHT_MOD_RISK' && '阶段 5 / 5 · 越野射灯私改保险丝熔断故障排查与决策'}
            </span>
          </div>

          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            5阶段综合实训
          </span>
        </div>

        {isStepAdvanceReady && (
          <Button
            size="sm"
            onClick={onAdvanceStep}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 px-4 shadow-sm cursor-pointer"
          >
            <span>{currentStep === 'TRANSFER_SPOTLIGHT_MOD_RISK' ? '查看通关报告' : '进入下一步'}</span>
            <ArrowRight size={16} />
          </Button>
        )}
      </div>

      {/* STEP 1: Series Divider & Dimming (Counterexample) */}
      {currentStep === 'SERIES_DIVIDER_TEST' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                双车灯串联实验台 · 串联分压与断路联动反例
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-600">
                回路状态：{isSeriesClosed ? (!isSeriesLamp1Removed ? '闭合通电' : '灯1拧下断开') : '开关断开'}
              </span>
            </div>

            {/* Circuit Diagram Visual SVG */}
            <div className="w-full h-60 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 460 140" className="w-full h-full max-w-lg">
                {/* 12V Battery */}
                <rect x="25" y="40" width="60" height="50" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
                <text x="55" y="65" fill="#93c5fd" fontSize="13" textAnchor="middle" fontWeight="bold">12V 蓄电池</text>
                <text x="55" y="80" fill="#60a5fa" fontSize="10" textAnchor="middle">电源端</text>

                {/* Wire to Switch */}
                <line x1="85" y1="65" x2="140" y2="65" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* Switch */}
                <circle cx="140" cy="65" r="5" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                <line
                  x1="140"
                  y1="65"
                  x2={isSeriesClosed ? 180 : 172}
                  y2={isSeriesClosed ? 65 : 42}
                  stroke="#38bdf8"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <circle cx="180" cy="65" r="5" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />

                {/* Wire to Lamp 1 */}
                <line x1="180" y1="65" x2="220" y2="65" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* Lamp 1 (6Ω) */}
                {!isSeriesLamp1Removed ? (
                  <g>
                    <circle
                      cx="245"
                      cy="65"
                      r="22"
                      fill={isSeriesClosed ? '#ca8a04' : '#334155'}
                      stroke="#eab308"
                      strokeWidth="2.5"
                      className={isSeriesClosed ? 'filter drop-shadow-[0_0_8px_rgba(202,138,4,0.6)]' : ''}
                    />
                    <text x="245" y="69" fill={isSeriesClosed ? '#fef08a' : '#94a3b8'} fontSize="11" textAnchor="middle" fontWeight="bold">
                      灯1 (6Ω)
                    </text>
                    <text x="245" y="100" fill="#facc15" fontSize="10" textAnchor="middle">
                      {isSeriesClosed ? '分压 6.0V (暗)' : '0V'}
                    </text>
                  </g>
                ) : (
                  <g>
                    <circle cx="230" cy="65" r="6" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
                    <circle cx="260" cy="65" r="6" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
                    <text x="245" y="55" fill="#f87171" fontSize="10" textAnchor="middle" fontWeight="bold">断口 (灯1拔出)</text>
                  </g>
                )}

                {/* Series Wire between Lamp 1 and Lamp 2 */}
                <line x1="267" y1="65" x2="310" y2="65" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* Lamp 2 (6Ω) */}
                <circle
                  cx="335"
                  cy="65"
                  r="22"
                  fill={isSeriesClosed && !isSeriesLamp1Removed ? '#ca8a04' : '#334155'}
                  stroke="#eab308"
                  strokeWidth="2.5"
                  className={isSeriesClosed && !isSeriesLamp1Removed ? 'filter drop-shadow-[0_0_8px_rgba(202,138,4,0.6)]' : ''}
                />
                <text
                  x="335"
                  y="69"
                  fill={isSeriesClosed && !isSeriesLamp1Removed ? '#fef08a' : '#94a3b8'}
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  灯2 (6Ω)
                </text>
                <text x="335" y="100" fill="#facc15" fontSize="10" textAnchor="middle">
                  {isSeriesClosed && !isSeriesLamp1Removed ? '分压 6.0V (暗)' : '0V (熄灭)'}
                </text>

                {/* Wire to 10A Ammeter */}
                <line x1="357" y1="65" x2="390" y2="65" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* Return Ground */}
                <line x1="390" y1="65" x2="425" y2="65" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="425" y1="65" x2="425" y2="120" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="425" y1="120" x2="55" y2="120" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="55" y1="120" x2="55" y2="90" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Operator Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1 text-sm">
              <Button
                onClick={handleToggleSeriesSwitch}
                className={`font-bold py-3 cursor-pointer ${
                  isSeriesClosed ? 'bg-slate-700 hover:bg-slate-800 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                1. {isSeriesClosed ? '断开电路开关' : '闭合开关通电观察两灯'}
              </Button>
              <Button
                onClick={handleToggleSeriesLamp1}
                className={`font-bold py-3 cursor-pointer ${
                  isSeriesLamp1Removed
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                2. {isSeriesLamp1Removed ? '重新旋入灯泡1' : '拧下灯泡1 (模拟单灯烧断)'}
              </Button>
            </div>

            {isSeriesClosed && !isSeriesLamp1Removed && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-900 font-semibold flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <span>串联分压现象：两盏 6Ω 灯串联分得总电压（各 6.0V），亮度严重衰减变暗！请继续点击“拧下灯泡1”测试相互影响。</span>
              </div>
            )}

            {isSeriesLamp1Removed && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>串联致命制约验证：拧下灯泡1形成开路断点，灯泡2也瞬间熄灭（全回路电流为 0）！严格验证了串联回路“一断俱断”缺陷。</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <Gauge size={18} />
                串联回路万用表示数
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-900 text-amber-200 border border-amber-700">
                串联总阻：12.0Ω
              </span>
            </div>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">SERIES CIRCUIT</span>
                <span className="font-bold text-amber-300">
                  {isSeriesClosed ? (!isSeriesLamp1Removed ? '6V PER LAMP' : 'BROKEN') : 'OPEN'}
                </span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {isSeriesClosed && !isSeriesLamp1Removed ? '1.00 A' : '0.00 A'}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>TOTAL RESISTANCE: 12Ω</span>
                <span className="font-bold">DC AMPERES</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">汽车电工认知铁律：</strong>
              串联负载互相制约：U_总 = U1 + U2，R_总 = R1 + R2。若汽车灯光采用串联，一旦一只灯丝烧断，另一侧大灯也会同时熄灭，将导致夜间行车瞬间失明！因此汽车用电设备<strong>严禁常规照明串联</strong>。
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Parallel Independent Circuit (Standard Automotive Wiring) */}
      {currentStep === 'PARALLEL_INDEPENDENT_TEST' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                汽车标准双大灯并联实验台 · 独立供电与等效电阻骤降
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800">
                标准并联架构：节点 P 与 0
              </span>
            </div>

            {/* Circuit Diagram Visual SVG */}
            <div className="w-full h-60 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 460 140" className="w-full h-full max-w-lg">
                {/* 12V Battery */}
                <rect x="25" y="45" width="60" height="50" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
                <text x="55" y="70" fill="#93c5fd" fontSize="13" textAnchor="middle" fontWeight="bold">12V 蓄电池</text>
                <text x="55" y="85" fill="#60a5fa" fontSize="10" textAnchor="middle">电源母线</text>

                {/* Positive Bus */}
                <line x1="85" y1="70" x2="160" y2="70" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
                <circle cx="160" cy="70" r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
                <text x="160" y="55" fill="#fca5a5" fontSize="11" textAnchor="middle" fontWeight="bold">节点 P (+12V)</text>

                {/* Branch 1 (Upper) */}
                <path d="M 160 70 L 160 35 L 220 35" fill="none" stroke="#ef4444" strokeWidth="4" />
                {!isParallelLamp1Removed ? (
                  <g>
                    <circle
                      cx="250"
                      cy="35"
                      r="22"
                      fill="#facc15"
                      stroke="#eab308"
                      strokeWidth="2.5"
                      className="filter drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]"
                    />
                    <text x="250" y="39" fill="#713f12" fontSize="11" textAnchor="middle" fontWeight="black">
                      灯1 (6Ω)
                    </text>
                    <path d="M 272 35 L 340 35 L 340 70" fill="none" stroke="#64748b" strokeWidth="4" />
                  </g>
                ) : (
                  <g>
                    <circle cx="230" cy="35" r="5" fill="#ef4444" />
                    <circle cx="270" cy="35" r="5" fill="#ef4444" />
                    <text x="250" y="24" fill="#f87171" fontSize="10" textAnchor="middle" fontWeight="bold">支路1断开</text>
                  </g>
                )}

                {/* Branch 2 (Lower) */}
                <path d="M 160 70 L 160 105 L 220 105" fill="none" stroke="#ef4444" strokeWidth="4" />
                <circle
                  cx="250"
                  cy="105"
                  r="22"
                  fill="#facc15"
                  stroke="#eab308"
                  strokeWidth="2.5"
                  className="filter drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]"
                />
                <text x="250" y="109" fill="#713f12" fontSize="11" textAnchor="middle" fontWeight="black">
                  灯2 (6Ω)
                </text>
                <path d="M 272 105 L 340 105 L 340 70" fill="none" stroke="#64748b" strokeWidth="4" />

                {/* Common Return Node 0 */}
                <circle cx="340" cy="70" r="6" fill="#64748b" stroke="#fff" strokeWidth="2" />
                <text x="340" y="55" fill="#cbd5e1" fontSize="11" textAnchor="middle" fontWeight="bold">节点 0 (GND)</text>

                {/* Main Return Wire */}
                <line x1="340" y1="70" x2="425" y2="70" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="425" y1="70" x2="425" y2="130" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="425" y1="130" x2="55" y2="130" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="55" y1="130" x2="55" y2="95" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Operator Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1 text-sm">
              <Button
                variant="outline"
                disabled
                className="bg-slate-100 text-slate-700 font-bold py-3 cursor-default"
              >
                并联支路电压：12.0 V (满额高亮)
              </Button>
              <Button
                onClick={handleToggleParallelLamp1}
                className={`font-bold py-3 cursor-pointer ${
                  isParallelLamp1Removed
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isParallelLamp1Removed ? '重新接入灯泡1' : '拆卸灯泡1 (观察灯泡2是否受影响)'}
              </Button>
            </div>

            {isParallelLamp1Removed ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>并联独立工作验证：灯泡1拆下后，灯泡2两端依然承受 12.0V 节点电压，保持全亮发光！总干路电流由 4.0A 降至 2.0A，各支路互不干扰。</span>
              </div>
            ) : (
              <div className="p-3.5 bg-blue-50 border border-blue-300 rounded-lg text-sm text-blue-900 font-semibold flex items-center gap-2">
                <Lightbulb size={18} className="text-blue-600 shrink-0" />
                <span>并联等效阻值骤降：两个 6Ω 灯泡并联，等效电阻仅为 3.0Ω！总电流激增至 4.0A。请点击“拆卸灯泡1”测试独立性。</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <Gauge size={18} />
                总干路主电流表读数
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-900 text-emerald-200 border border-emerald-700">
                并联等效：3.0Ω
              </span>
            </div>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">PARALLEL MAIN FEED</span>
                <span className="font-bold text-amber-300">
                  {isParallelLamp1Removed ? 'SINGLE BRANCH (2A)' : 'DUAL BRANCH (4A)'}
                </span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {isParallelLamp1Removed ? '2.00 A' : '4.00 A'}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>VOLTAGE: 12.00 V</span>
                <span className="font-bold">DC AMPERES</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">并联核心公式：</strong>
              1/R_并 = 1/R1 + 1/R2 ⇒ R_并 = (6 × 6) / (6 + 6) = 3.0 Ω。<br />
              并联支路越多，总等效电阻越小，总干路电流越大（I_总 = I1 + I2）！
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Compound Short Bypass & Node Theory Question */}
      {currentStep === 'COMPOUND_SHORT_BYPASS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              混联电路拓扑分析 · 短路旁路反例与电气节点本质辨析
            </span>

            <Button
              onClick={handleAttemptShortBypass}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 text-sm cursor-pointer shadow-sm"
            >
              模拟测试：支路2发生金属搭铁短路 (观察并联负载旁路效应)
            </Button>

            {shortBypassAttempted && (
              <div className="p-3.5 bg-red-100 border-2 border-red-500 rounded-xl text-sm text-red-950 flex items-start gap-2.5">
                <AlertTriangle size={24} className="text-red-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sm block font-bold">并联短路旁路危害警示：</strong>
                  <p className="mt-1 leading-relaxed text-red-900">
                    并联支路2发生 0Ω 短路时，整个并联节点的等效电阻瞬间降为 0Ω！电流全部经由短路点直接回流，将其他并联支路全部“旁路”（两端电压跌为 0V 全部熄灭），并引发数百安培短路电流烧断主保险丝！
                  </p>
                </div>
              </div>
            )}

            {/* Theory Question: NO SPOILERS */}
            <div className="mt-1 p-4 rounded-xl border border-slate-300 bg-slate-50 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-600" />
                <strong className="text-sm font-bold text-slate-800">
                  电路拓扑深度认知辨析工单
                </strong>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">
                学徒小李在看汽车电路原理图时认为：<em>“判断两个元器件是串联还是并联，只要看电路图纸上它们是不是排在同一条水平线上。”</em> 作为带教技师，你的正确指引是：
              </p>

              <div className="flex flex-col gap-2.5">
                {[
                  {
                    id: 'OPT_A',
                    text: 'A. 说法错误：串联与并联的物理本质由“电气节点”决定，而非图纸绘制形状。只要元件两端分别跨接在同一对等电位电气节点之间（承受同一电压），在电气上就是并联；若元件顺次首尾相连中间无分支节点（流过相同电流），就是串联。',
                  },
                  {
                    id: 'OPT_B',
                    text: 'B. 说法正确：排在一条直线上的元器件必定是串联，分在上下层画出的必定是并联。',
                  },
                  {
                    id: 'OPT_C',
                    text: 'C. 说法正确：只要电路中有三根导线交汇，无论如何连接所有元件都会自动变成混联。',
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
                提交拓扑辨析工单
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
              电气节点与短路旁路状态
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-slate-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">NODE TOPOLOGY MONITOR</span>
                <span className="font-bold text-amber-300">
                  {shortBypassAttempted ? 'SHORT BYPASS TRIPPED' : 'NORMAL EQUIVALENT'}
                </span>
              </div>
              <div className="text-3xl lg:text-4xl font-black text-right tracking-wider text-emerald-300">
                {shortBypassAttempted ? '0.00 V (BYPASS)' : '12.00 V (NODE)'}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>R_EQ: {shortBypassAttempted ? '0.00 Ω' : '3.00 Ω'}</span>
                <span className="font-bold">STATUS_OK</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">节点法分析要决：</strong>
              在同一根理想导线上的所有分支点都是同一个“等电位节点”。只要两个负载的两端分别连接在相同的两个节点之间，无论导线绕多少个弯，它们都是标准的并联！
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Quantitative Fog Lamp Prediction */}
      {currentStep === 'QUANTITATIVE_FOG_PREDICT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              加装并联雾灯组等效阻值与总电流推算 · 独立盲测工单
            </span>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">工程改装情境：</strong>
              原车前部已有一对并联示宽灯（单灯等效电阻 4.0Ω，并联后等效电阻为 <span className="font-bold text-blue-700">2.0Ω</span>，原总电流 6.0A）。现车主加装一对前雾灯（单灯 6.0Ω，并联后等效电阻为 <span className="font-bold text-purple-700">3.0Ω</span>），两组车灯均并联在 12.0V 电源母线上。
            </div>

            <div className="w-full h-56 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative border border-slate-800 shadow-inner">
              <div className="flex flex-col items-center gap-2 text-center text-white">
                <div className="flex items-center gap-4">
                  <div className="w-28 h-20 rounded-xl bg-blue-950 border-2 border-blue-500 flex flex-col items-center justify-center p-2">
                    <span className="text-xs text-blue-300">示宽灯组</span>
                    <span className="text-sm font-bold text-white">R1 = 2.0 Ω</span>
                  </div>
                  <span className="text-lg text-amber-400 font-black">∥ 并联 ∥</span>
                  <div className="w-28 h-20 rounded-xl bg-purple-950 border-2 border-purple-500 flex flex-col items-center justify-center p-2">
                    <span className="text-xs text-purple-300">加装雾灯组</span>
                    <span className="text-sm font-bold text-white">R2 = 3.0 Ω</span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-2">
                  系统母线供电电压：12.00 V
                </div>
              </div>
            </div>

            {/* Answer Options: NO SPOILER */}
            <div className="flex flex-col gap-2.5">
              {[
                {
                  id: 'OPT_12_10',
                  text: 'A. 总等效电阻 1.2 Ω，总干路电流 10.0 A (推算：R_总 = (2.0×3.0)/(2.0+3.0) = 1.2Ω，I_总 = 12V ÷ 1.2Ω = 10.0A)',
                },
                {
                  id: 'OPT_50_24',
                  text: 'B. 总等效电阻 5.0 Ω，总干路电流 2.4 A (推算：R_总 = 2.0 + 3.0 = 5.0Ω，I_总 = 12V ÷ 5.0Ω = 2.4A)',
                },
                {
                  id: 'OPT_08_15',
                  text: 'C. 总等效电阻 0.8 Ω，总干路电流 15.0 A',
                },
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
              提交加装并联定量计算工单
            </Button>

            {step4Feedback && (
              <div
                className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                  step4Choice === 'OPT_12_10'
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border border-red-300 text-red-900'
                }`}
              >
                {step4Choice === 'OPT_12_10' ? (
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
              总负荷分析仪读数
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">TOTAL EQUIVALENT: 1.20 Ω</span>
                <span className="font-bold text-amber-300">U = 12.00 V</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                10.00 A
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>TOTAL PARALLEL LOAD</span>
                <span className="font-bold">DC AMPERES</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">改装线束校核法则：</strong>
              原回路电流从 6.0A 骤增至 10.0A。若原车保险丝为 7.5A 则会熔断；必须将干路保险丝匹配升级至 15A，并校核主电源进线截面积（不小于 1.5mm²），防止线束温升超标！
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Transfer Spotlight Mod Risk & Decision */}
      {currentStep === 'TRANSFER_SPOTLIGHT_MOD_RISK' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              越野射灯私改保险丝熔断故障排查与合规决策
            </span>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">实车故障情境：</strong>
              车主私自网购 4 盏 100W 越野车顶射灯（总功率高达 <span className="font-bold text-red-600">400W</span>），直接并联搭接在原车 15A 备用点烟器线路上。开启瞬间 15A 保险丝立即爆断！
              <div className="mt-1 flex flex-wrap gap-3 text-xs sm:text-sm font-bold text-red-700">
                <span>12V 稳态工作电流：I = 400W ÷ 12V ≈ 33.3 A (严重超载！)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <strong className="text-sm font-bold text-slate-800">
                  车间安全决策：车主建议直接换插 40A 大保险丝应付使用。作为车间主修技师，你的合规方案是：
                </strong>
              </div>

              {/* Options: NO SPOILER */}
              <div className="flex flex-col gap-2.5">
                {[
                  {
                    id: 'OPT_A',
                    text: 'A. 严厉制止并合规整改：400W 射灯电流超 33A，原车细线束（1.0mm² 最大安全载流仅 15A）在 33A 持续发热下极易自燃！换 40A 保险丝将丧失短路过载保护。必须重新从蓄电池铺设 6.0mm² 专用耐热粗电缆，串入独立 40A 保险盒，并加装专用大电流汽车继电器由中控开关弱电信号触发控制。',
                  },
                  {
                    id: 'OPT_B',
                    text: 'B. 同意车主方案：只需将熔断的 15A 保险丝直接换成 40A 大保险丝，原车线束足够粗壮无须改动。',
                  },
                  {
                    id: 'OPT_C',
                    text: 'C. 改为串联安装：将 4 盏 100W 射灯全部串联接入原车回路以降低总电流。',
                  },
                  {
                    id: 'OPT_D',
                    text: 'D. 判定为射灯内部灯珠出厂击穿短路，建议车主退货更换同款 400W 射灯。',
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
                提交改装安全整改工单
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
              射灯超载负荷监测示数
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-red-950/80 border-4 border-red-800 rounded-xl shadow-inner font-mono text-red-300">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">400W SPOTLIGHT LOAD</span>
                <span className="font-bold text-red-200">FUSE 15A BLOWN</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-red-200">
                33.33 A
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>SAFE LIMIT: 15A</span>
                <span className="font-bold text-amber-300">FIRE_HAZARD</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">改装安全防线：</strong>
              汽车加装大功率电气设备（如绞盘、大功率低音炮、车顶射灯）必须遵循“<strong>独立粗电缆、专用主保险、继电器控制</strong>”三要素。盲目换大保险丝是典型的违规致命操作！
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
