'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  HelpCircle,
  Network,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DCSolver } from '@/src/circuit/solver/DCSolver';
import { verifyKCL, verifyKVL } from '@/src/circuit/solver/DCAnalysisUtils';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { type B03Step } from './b03Training';

function solveReference(ground: string) {
  const solver = new DCSolver(ground);
  solver.addVoltageSource({ id: 'BAT', nodePos: 'P', nodeNeg: 'N', voltage: 12 });
  solver.addResistor({ id: 'R1', nodeA: 'P', nodeB: 'N', resistance: 6 });
  solver.addResistor({ id: 'R2', nodeA: 'P', nodeB: 'N', resistance: 3 });
  return solver.solve();
}

export function inspectB03NodeAndLoop() {
  const originalResult = solveReference('N');
  const shiftedResult = solveReference('P');
  const original = {
    nodeA: originalResult.nodeVoltages.get('P') ?? 0,
    nodeB: originalResult.nodeVoltages.get('N') ?? 0,
    voltageAB: (originalResult.nodeVoltages.get('P') ?? 0) - (originalResult.nodeVoltages.get('N') ?? 0),
  };
  const referencedToB = {
    nodeA: shiftedResult.nodeVoltages.get('P') ?? 0,
    nodeB: shiftedResult.nodeVoltages.get('N') ?? 0,
    voltageAB: (shiftedResult.nodeVoltages.get('P') ?? 0) - (shiftedResult.nodeVoltages.get('N') ?? 0),
  };
  return {
    original,
    referencedToB,
    kclClosed: verifyKCL([6], [2, 4]),
    kvlClosed: verifyKVL([12, -12]),
  };
}

interface B03KclKvlSceneProps {
  currentStep: B03Step;
  onStepComplete: (step: B03Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

export function B03KclKvlScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
}: B03KclKvlSceneProps) {
  // Step 1: KCL Node Current
  const [isKclSwitchClosed, setIsKclSwitchClosed] = useState(false);
  const [branch1Cut, setBranch1Cut] = useState(false);
  const [branch2Cut, setBranch2Cut] = useState(false);

  // Step 2: KVL Closed Loop Voltage Survey
  const [kvlSurveyIndex, setKvlSurveyIndex] = useState<number>(0);

  // Step 3: Reference Ground Switching & Potential vs Voltage Difference
  const [selectedGround, setSelectedGround] = useState<'N' | 'P' | 'M'>('N');
  const [step3Choice, setStep3Choice] = useState<string | null>(null);
  const [step3Submitted, setStep3Submitted] = useState<boolean>(false);
  const [step3Feedback, setStep3Feedback] = useState<string | null>(null);

  // Step 4: Quantitative Branch Blind Test
  const [step4Choice, setStep4Choice] = useState<string | null>(null);
  const [step4Submitted, setStep4Submitted] = useState<boolean>(false);
  const [step4Feedback, setStep4Feedback] = useState<string | null>(null);

  // Step 5: Transfer Ground Fault Diagnosis
  const [isBrakePedalPressed, setIsBrakePedalPressed] = useState<boolean>(false);
  const [meterProbeGroundTarget, setMeterProbeGroundTarget] = useState<'BODY_METAL' | 'TAIL_WIRE'>('TAIL_WIRE');
  const [step5Decision, setStep5Decision] = useState<string | null>(null);
  const [step5Submitted, setStep5Submitted] = useState<boolean>(false);
  const [step5Feedback, setStep5Feedback] = useState<string | null>(null);

  // Handlers for Step 1
  const toggleKclSwitch = () => {
    sounds.click();
    const next = !isKclSwitchClosed;
    setIsKclSwitchClosed(next);
    if (next) {
      onStepComplete('KCL_NODE_CURRENT', {
        inflowCurrent: 6.0,
        branch1Current: 2.0,
        branch2Current: 4.0,
        kclVerified: true,
      });
    }
  };

  // Step 2 KVL Survey advance
  const handleKvlNextSurvey = () => {
    sounds.click();
    const nextIdx = (kvlSurveyIndex + 1) % 5;
    setKvlSurveyIndex(nextIdx);
    if (nextIdx === 4) {
      onStepComplete('KVL_LOOP_VOLTAGE', {
        loopTraversal: ['BATTERY_+12V', 'LINE_DROP_-4V', 'LOAD_DROP_-8V', 'SUM_0V'],
        algebraicSumZero: true,
      });
    }
  };

  // Step 3 Submit
  const handleSubmitStep3 = () => {
    sounds.click();
    setStep3Submitted(true);
    if (step3Choice === 'OPT_SAME') {
      sounds.success();
      setStep3Feedback('回答完全正确！两点间电压差 U_AB = VA - VB 是客观电位差，参考点转移只是整体电位坐标平移，两点相对压差绝对守恒！');
      onStepComplete('REFERENCE_GROUND_INVARIANT', {
        userChoice: step3Choice,
        passed: true,
        referenceVoltageInvariant: true,
      });
    } else {
      sounds.warningBuzz();
      setStep3Feedback('判定有误。参考点（搭铁）只是人为设定的 0V 零基准，就像选择海平面一样，改变零点会改变各点绝对电位，但用电设备两端的电压差 U_AB 永远保持不变！');
    }
  };

  // Step 4 Submit
  const handleSubmitStep4 = () => {
    sounds.click();
    setStep4Submitted(true);
    if (step4Choice === 'OPT_A') {
      sounds.success();
      setStep4Feedback('计算完全正确！由 KCL：8.5A = 3.0A + 2.5A + I4 ⇒ I4 = 3.0A (流出节点)；由电位差 U_AB = VA - VB = 12.0V - 4.8V = 7.2V。');
      onStepComplete('QUANTITATIVE_BRANCH_CALC', {
        userChoice: step4Choice,
        i4Current: 3.0,
        direction: 'OUTFLOW',
        voltageAB: 7.2,
        passed: true,
      });
    } else {
      sounds.warningBuzz();
      setStep4Feedback('计算有误。根据电荷守恒 KCL，流入节点的总电流必等于流出总电流：8.5 = 3.0 + 2.5 + I4，因此 I4 必为 3.0A 且方向流出！');
    }
  };

  // Step 5 Submit
  const handleSubmitStep5 = () => {
    sounds.click();
    setStep5Submitted(true);
    if (step5Decision === 'OPT_CLEAN_GROUND') {
      sounds.success();
      setStep5Feedback('技师方案规范准确！尾灯搭铁点生锈导致虚接电阻，电位浮高 9.2V 形成反向倒灌回路。打磨除锈紧固螺栓彻底消除搭铁电阻，恢复独立回路！');
      onStepComplete('TRANSFER_GROUND_FAULT_DIAG', {
        userChoice: step5Decision,
        faultIdentified: 'GROUND_CORROSION_FLOATING_RETURN',
        remedy: 'GRIND_RUST_RESTORE_CLEAN_GROUND',
        passed: true,
      });
    } else {
      sounds.warningBuzz();
      setStep5Feedback('方案不合规。该故障是典型的车身搭铁不良虚接引起的“借道浮地回流”，更换电脑或灯泡无法解决接触不良，必须清理打磨搭铁触点！');
    }
  };

  // Step 1 currents
  const b1Current = isKclSwitchClosed && !branch1Cut ? 2.0 : 0.0;
  const b2Current = isKclSwitchClosed && !branch2Cut ? 4.0 : 0.0;
  const inFlowCurrent = b1Current + b2Current;

  // Step 3 Potentials & Voltages
  // R1=4Ω, R2=8Ω, U_total=12V -> Drop across R1 is 4V, drop across R2 is 8V
  let vp = 12.0;
  let vm = 8.0;
  let vn = 0.0;
  if (selectedGround === 'P') {
    vp = 0.0;
    vm = -4.0;
    vn = -12.0;
  } else if (selectedGround === 'M') {
    vp = 4.0;
    vm = 0.0;
    vn = -8.0;
  }
  const uPM = vp - vm; // always 4.0V
  const uPN = vp - vn; // always 12.0V

  return (
    <div className="flex flex-col gap-4 w-full h-full min-h-[580px] p-2">
      {/* Top Advance Banner */}
      <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl shadow-md border border-blue-700">
        <div className="flex items-center gap-2">
          <Network className="text-amber-400" size={20} />
          <span className="font-bold text-sm tracking-wide">
            {currentStep === 'KCL_NODE_CURRENT' && '阶段 1：基尔霍夫电流定律 (KCL) 验证 · 电荷守恒与干支分流'}
            {currentStep === 'KVL_LOOP_VOLTAGE' && '阶段 2：基尔霍夫电压定律 (KVL) 验证 · 闭合回路能量守恒'}
            {currentStep === 'REFERENCE_GROUND_INVARIANT' && '阶段 3：反例辨析 · 参考地转移与两点间电压不变性'}
            {currentStep === 'QUANTITATIVE_BRANCH_CALC' && '阶段 4：独立盲测 · 汽车中央电气盒多支路未知量推算'}
            {currentStep === 'TRANSFER_GROUND_FAULT_DIAG' && '阶段 5：迁移任务 · 尾灯搭铁不良借道串电实车排查与决策'}
          </span>
        </div>

        {((currentStep === 'KCL_NODE_CURRENT' && isKclSwitchClosed) ||
          (currentStep === 'KVL_LOOP_VOLTAGE' && kvlSurveyIndex === 4) ||
          (currentStep === 'REFERENCE_GROUND_INVARIANT' && step3Submitted && step3Choice === 'OPT_SAME') ||
          (currentStep === 'QUANTITATIVE_BRANCH_CALC' && step4Submitted && step4Choice === 'OPT_A') ||
          (currentStep === 'TRANSFER_GROUND_FAULT_DIAG' && step5Submitted && step5Decision === 'OPT_CLEAN_GROUND')) && (
          <Button
            size="sm"
            onClick={onAdvanceStep}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 px-4 shadow-sm cursor-pointer"
          >
            <span>{currentStep === 'TRANSFER_GROUND_FAULT_DIAG' ? '查看通关报告' : '进入下一步'}</span>
            <ArrowRight size={16} />
          </Button>
        )}
      </div>

      {/* STEP 1: KCL Node Current Verification */}
      {currentStep === 'KCL_NODE_CURRENT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                汽车中央接线盒节点分流实验台 (KCL: ∑I_入 = ∑I_出)
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-600">
                主回路：{isKclSwitchClosed ? '闭合通电' : '开关断开'}
              </span>
            </div>

            {/* Circuit SVG h-60 */}
            <div className="w-full h-60 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 460 140" className="w-full h-full max-w-lg">
                {/* Main Power Bus */}
                <rect x="20" y="45" width="55" height="50" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
                <text x="47" y="70" fill="#93c5fd" fontSize="12" textAnchor="middle" fontWeight="bold">12V 主电源</text>
                <text x="47" y="85" fill="#60a5fa" fontSize="9" textAnchor="middle">蓄电池/发电机</text>

                {/* Main Switch */}
                <line x1="75" y1="70" x2="110" y2="70" stroke="#38bdf8" strokeWidth="4" />
                <circle cx="110" cy="70" r="4" fill="#38bdf8" />
                <line
                  x1="110"
                  y1="70"
                  x2={isKclSwitchClosed ? 140 : 135}
                  y2={isKclSwitchClosed ? 70 : 50}
                  stroke={isKclSwitchClosed ? '#10b981' : '#f59e0b'}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="140" cy="70" r="4" fill="#38bdf8" />

                {/* Main trunk to Central Node K */}
                <line x1="140" y1="70" x2="210" y2="70" stroke="#38bdf8" strokeWidth="4" />
                {isKclSwitchClosed && inFlowCurrent > 0 && (
                  <path
                    d="M 140 70 L 210 70"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3"
                    strokeDasharray="6 6"
                    className="animate-pulse"
                  />
                )}

                {/* Central Node K Dot */}
                <circle cx="210" cy="70" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="2.5" />
                <text x="210" y="55" fill="#f87171" fontSize="12" textAnchor="middle" fontWeight="bold">节点 K</text>

                {/* Branch 1 wire (Up to Load 1, 6Ω, 2A) */}
                <path d="M 210 70 L 250 35 L 340 35" fill="none" stroke="#38bdf8" strokeWidth="3" />
                {isKclSwitchClosed && !branch1Cut && (
                  <path
                    d="M 210 70 L 250 35 L 340 35"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                    className="animate-pulse"
                  />
                )}
                {/* Branch 1 Load */}
                <rect x="340" y="20" width="60" height="30" rx="6" fill="#1e293b" stroke="#a855f7" strokeWidth="2" />
                <text x="370" y="38" fill="#e9d5ff" fontSize="10" textAnchor="middle" fontWeight="bold">负载1 (6Ω)</text>
                <text x="370" y="47" fill="#c084fc" fontSize="8" textAnchor="middle">I1 = 2.0A</text>

                {/* Branch 2 wire (Down to Load 2, 3Ω, 4A) */}
                <path d="M 210 70 L 250 105 L 340 105" fill="none" stroke="#38bdf8" strokeWidth="3" />
                {isKclSwitchClosed && !branch2Cut && (
                  <path
                    d="M 210 70 L 250 105 L 340 105"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                    className="animate-pulse"
                  />
                )}
                {/* Branch 2 Load */}
                <rect x="340" y="90" width="60" height="30" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                <text x="370" y="108" fill="#bae6fd" fontSize="10" textAnchor="middle" fontWeight="bold">负载2 (3Ω)</text>
                <text x="370" y="117" fill="#7dd3fc" fontSize="8" textAnchor="middle">I2 = 4.0A</text>

                {/* Return Bus to Ground */}
                <path d="M 400 35 L 430 35 L 430 105 L 400 105" fill="none" stroke="#64748b" strokeWidth="3" />
                <line x1="430" y1="70" x2="450" y2="70" stroke="#64748b" strokeWidth="3" />
                <line x1="450" y1="62" x2="450" y2="78" stroke="#64748b" strokeWidth="3" />
                <line x1="454" y1="65" x2="454" y2="75" stroke="#64748b" strokeWidth="2" />
                <line x1="458" y1="68" x2="458" y2="72" stroke="#64748b" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2.5">
              <Button
                onClick={toggleKclSwitch}
                className={`font-bold py-2.5 px-4 cursor-pointer text-sm shadow-xs ${
                  isKclSwitchClosed ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isKclSwitchClosed ? '断开电源主开关' : '闭合电源主开关'}
              </Button>

              <Button
                variant="outline"
                disabled={!isKclSwitchClosed}
                onClick={() => {
                  sounds.click();
                  setBranch1Cut(!branch1Cut);
                }}
                className="cursor-pointer text-sm"
              >
                {branch1Cut ? '接通支路1' : '断开支路1 (6Ω)'}
              </Button>

              <Button
                variant="outline"
                disabled={!isKclSwitchClosed}
                onClick={() => {
                  sounds.click();
                  setBranch2Cut(!branch2Cut);
                }}
                className="cursor-pointer text-sm"
              >
                {branch2Cut ? '接通支路2' : '断开支路2 (3Ω)'}
              </Button>
            </div>

            {isKclSwitchClosed && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>KCL 平衡已达成：总干路流入节点电流 ({inFlowCurrent.toFixed(2)}A) 严格等于支路1 ({b1Current.toFixed(2)}A) 与支路2 ({b2Current.toFixed(2)}A) 流出电流之和！</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <Gauge size={18} />
                节点电流多通道监视器
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-900 text-blue-200 border border-blue-700">
                KCL 验证档
              </span>
            </div>

            {/* LCD Display h-32 */}
            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">TOTAL INFLOW = OUTFLOW</span>
                <span className="font-bold text-amber-300">
                  {isKclSwitchClosed ? 'KCL EQUILIBRIUM' : 'OPEN CIRCUIT'}
                </span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {isKclSwitchClosed ? `${inFlowCurrent.toFixed(2)} A` : '0.00 A'}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>I1: {b1Current.toFixed(2)}A | I2: {b2Current.toFixed(2)}A</span>
                <span className="font-bold">DC AMPERES</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">基尔霍夫电流定律 (KCL) 核心：</strong>
              在任何电气节点上，流入节点的电流之和等于流出节点的电流之和（∑I_入 = ∑I_出）。物理本质是<strong>电荷守恒定律</strong>：节点不会蓄积也不会无端消灭电荷！
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: KVL Loop Voltage Law Verification */}
      {currentStep === 'KVL_LOOP_VOLTAGE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                闭合回路电位巡回巡测台 (KVL: ∑U = 0)
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-100 text-blue-800">
                巡测进度：{kvlSurveyIndex} / 4
              </span>
            </div>

            {/* Loop Visual SVG h-60 */}
            <div className="w-full h-60 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 460 140" className="w-full h-full max-w-lg">
                {/* Outer loop path */}
                <rect x="40" y="25" width="380" height="90" rx="14" fill="none" stroke="#334155" strokeWidth="4" />

                {/* Traversed segment highlight */}
                {kvlSurveyIndex >= 1 && (
                  <path d="M 40 85 L 40 39 Q 40 25 54 25 L 170 25" fill="none" stroke="#10b981" strokeWidth="5" />
                )}
                {kvlSurveyIndex >= 2 && (
                  <path d="M 170 25 L 260 25" fill="none" stroke="#3b82f6" strokeWidth="5" />
                )}
                {kvlSurveyIndex >= 3 && (
                  <path d="M 260 25 L 406 25 Q 420 25 420 39 L 420 101 Q 420 115 406 115 L 230 115" fill="none" stroke="#f59e0b" strokeWidth="5" />
                )}
                {kvlSurveyIndex >= 4 && (
                  <path d="M 230 115 L 54 115 Q 40 115 40 101 L 40 85" fill="none" stroke="#10b981" strokeWidth="5" />
                )}

                {/* 12V Battery on Left */}
                <rect x="20" y="55" width="40" height="40" rx="6" fill="#1e293b" stroke="#10b981" strokeWidth="2.5" />
                <text x="40" y="73" fill="#a7f3d0" fontSize="11" textAnchor="middle" fontWeight="bold">+12V</text>
                <text x="40" y="85" fill="#6ee7b7" fontSize="8" textAnchor="middle">电源升</text>

                {/* Resistor 1 (4V drop) Top */}
                <rect x="180" y="12" width="65" height="26" rx="5" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
                <text x="212" y="27" fill="#93c5fd" fontSize="10" textAnchor="middle" fontWeight="bold">线阻 (-4V)</text>

                {/* Resistor 2 (8V drop) Right */}
                <rect x="390" y="55" width="50" height="35" rx="5" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                <text x="415" y="72" fill="#fde68a" fontSize="10" textAnchor="middle" fontWeight="bold">主载 (-8V)</text>

                {/* Direction arrows in center */}
                <circle cx="230" cy="70" r="22" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
                <path d="M 230 48 L 236 53 L 230 58" fill="#94a3b8" />
                <text x="230" y="74" fill="#94a3b8" fontSize="10" textAnchor="middle">顺时针巡测</text>
              </svg>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleKvlNextSurvey}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 cursor-pointer text-sm shadow-sm flex items-center gap-2"
              >
                <RotateCw size={16} />
                <span>{kvlSurveyIndex === 0 ? '开始顺时针巡测' : kvlSurveyIndex === 4 ? '重新巡测回路' : '巡测下一个元器件压降'}</span>
              </Button>
            </div>

            {kvlSurveyIndex === 4 && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>KVL 验证通过：沿闭合回路巡回一周，电位升高 (+12.0V) 与电位降落 (-4.0V - 8.0V) 的代数和严格恒等于 0.00V！</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <Gauge size={18} />
                回路电位代数和分析仪
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-900 text-emerald-200 border border-emerald-700">
                KVL 累加档
              </span>
            </div>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">
                  {kvlSurveyIndex === 0 && 'READY TO SURVEY'}
                  {kvlSurveyIndex === 1 && 'STEP 1: BATTERY RISE'}
                  {kvlSurveyIndex === 2 && 'STEP 2: LINE DROP'}
                  {kvlSurveyIndex === 3 && 'STEP 3: LOAD DROP'}
                  {kvlSurveyIndex === 4 && 'CIRCUIT CLOSED (LOOP=0)'}
                </span>
                <span className="font-bold text-amber-300">
                  {kvlSurveyIndex === 4 ? '∑U = 0.00 V' : 'ACCUMULATING'}
                </span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {kvlSurveyIndex === 0 && '--- V'}
                {kvlSurveyIndex === 1 && '+12.00 V'}
                {kvlSurveyIndex === 2 && '+8.00 V'}
                {kvlSurveyIndex === 3 && '0.00 V'}
                {kvlSurveyIndex === 4 && '0.00 V'}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>
                  {kvlSurveyIndex === 0 && '等待启动巡测'}
                  {kvlSurveyIndex === 1 && '+12V (电源电动势升)'}
                  {kvlSurveyIndex === 2 && '+12V - 4V = +8V'}
                  {kvlSurveyIndex === 3 && '+8V - 8V = 0V'}
                  {kvlSurveyIndex === 4 && '闭合回路总压降和为0'}
                </span>
                <span className="font-bold">DC VOLTS</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">基尔霍夫电压定律 (KVL) 核心：</strong>
              沿任何闭合回路巡测一周，各段电位差的代数和恒等于零（∑U = 0）。物理本质是<strong>能量守恒定律</strong>：电荷在静电场中绕行闭合一周，电场力做的总功必然为零！
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Reference Ground Invariant & Potential vs Voltage Difference */}
      {currentStep === 'REFERENCE_GROUND_INVARIANT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              参考地 (搭铁) 转移反例实验与电位认知辨析
            </span>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">实验说明：</strong>
              电路两端接 12.0V 蓄电池，串联电阻 R1 (4Ω) 与 R2 (8Ω)。点击下方切换不同的搭铁参考零点（0V），观察各节点绝对电位变化与负载两端电压差。
            </div>

            {/* Ground Switch Buttons */}
            <div className="flex flex-wrap gap-2.5">
              <Button
                variant={selectedGround === 'N' ? 'default' : 'outline'}
                onClick={() => {
                  sounds.click();
                  setSelectedGround('N');
                }}
                className="cursor-pointer text-sm font-bold"
              >
                搭铁在负极 N (常规汽车搭铁)
              </Button>
              <Button
                variant={selectedGround === 'P' ? 'default' : 'outline'}
                onClick={() => {
                  sounds.click();
                  setSelectedGround('P');
                }}
                className="cursor-pointer text-sm font-bold"
              >
                搭铁在正极 P (反向参考地)
              </Button>
              <Button
                variant={selectedGround === 'M' ? 'default' : 'outline'}
                onClick={() => {
                  sounds.click();
                  setSelectedGround('M');
                }}
                className="cursor-pointer text-sm font-bold"
              >
                搭铁在中点 M (悬浮双极性)
              </Button>
            </div>

            {/* Theory Quiz: NO SPOILER */}
            <div className="mt-2 p-4 rounded-xl border border-slate-300 bg-slate-50 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-600" />
                <strong className="text-sm font-bold text-slate-800">
                  技师思考辨析：若将万用表黑表笔（参考零点）从蓄电池负极改接到蓄电池正极，用电设备两端的电压差将：
                </strong>
              </div>

              <div className="flex flex-col gap-2.5">
                {[
                  {
                    id: 'OPT_SAME',
                    text: 'A. 保持完全不变（电压差 U_AB = VA - VB 是客观电位差，与人为选择的搭铁参考零点完全无关）',
                  },
                  {
                    id: 'OPT_REVERSE',
                    text: 'B. 电压数值会直接归零，导致用电设备失去供电而熄灭',
                  },
                  {
                    id: 'OPT_BURN',
                    text: 'C. 改变搭铁点会导致全车电压大幅翻倍剧增，烧坏电脑与保险丝',
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer text-sm ${
                      step3Choice === opt.id
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-medium'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="step3_quiz"
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 cursor-pointer text-sm shadow-sm"
              >
                提交参考地辨析工单
              </Button>

              {step3Feedback && (
                <div
                  className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                    step3Choice === 'OPT_SAME'
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                      : 'bg-red-50 border border-red-300 text-red-900'
                  }`}
                >
                  {step3Choice === 'OPT_SAME' ? (
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
              <Gauge size={18} />
              各点电位与两端电压监视器
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">GROUND: NODE {selectedGround} (0.0V)</span>
                <span className="font-bold text-amber-300">U_PN = {uPN.toFixed(2)} V (INVARIANT)</span>
              </div>
              <div className="text-3xl lg:text-4xl font-black text-right tracking-wider text-emerald-300">
                VP={vp.toFixed(1)}V | VM={vm.toFixed(1)}V | VN={vn.toFixed(1)}V
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>跨接电压差 U_PM = {uPM.toFixed(1)} V</span>
                <span className="font-bold">CONSTANT ΔV</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">电位与电压本质：</strong>
              电位（Potential）是相对量，取决于参考点（搭铁）的选择；而两点间的电压（Voltage Difference: U_AB = VA - VB）是<strong>绝对客观量</strong>，与参考零点的选取毫无关系！
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Quantitative Branch Blind Test */}
      {currentStep === 'QUANTITATIVE_BRANCH_CALC' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              汽车中央配电盒多支路未知量推算 · 独立盲测工单
            </span>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">工程配电拓扑：</strong>
              中央配电盒主母线节点连通 4 条支路：
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:text-sm font-mono text-slate-800">
                <span className="p-1.5 bg-blue-50 rounded border border-blue-200">支路1（发电机主进线）：流入 8.5 A</span>
                <span className="p-1.5 bg-amber-50 rounded border border-amber-200">支路2（电子冷却风扇）：流出 3.0 A</span>
                <span className="p-1.5 bg-purple-50 rounded border border-purple-200">支路3（前大灯驱动组）：流出 2.5 A</span>
                <span className="p-1.5 bg-emerald-50 rounded border border-emerald-200">支路4（ECU发动机控制）：未知 I4 ?</span>
              </div>
              <div className="mt-2 text-xs text-slate-600">
                另已知母线节点 A 电位 VA = 12.0V，受电节点 B 电位 VB = 4.8V。
              </div>
            </div>

            {/* Answer Options: NO SPOILER */}
            <div className="flex flex-col gap-2.5">
              {[
                {
                  id: 'OPT_A',
                  text: 'A. 支路4 电流为 3.0 A（方向流出节点）；跨接电压 U_AB = 7.2 V',
                },
                {
                  id: 'OPT_B',
                  text: 'B. 支路4 电流为 14.0 A（方向流入节点）；跨接电压 U_AB = 16.8 V',
                },
                {
                  id: 'OPT_C',
                  text: 'C. 支路4 电流为 3.0 A（方向流入节点）；跨接电压 U_AB = 4.8 V',
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
                    name="step4_choice"
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
              提交网络未知量核算工单
            </Button>

            {step4Feedback && (
              <div
                className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                  step4Choice === 'OPT_A'
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border border-red-300 text-red-900'
                }`}
              >
                {step4Choice === 'OPT_A' ? (
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
              电气盒节点电流分析仪
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">KCL SOLVER: I_IN = I_OUT</span>
                <span className="font-bold text-amber-300">BALANCE = 8.50 A</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                3.00 A
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>ECU BRANCH: OUTFLOW</span>
                <span className="font-bold">DC AMPERES</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">推算公式：</strong>
              由 KCL 定律：I_入 = I_出 ⇒ 8.5 A = 3.0 A + 2.5 A + I4 ⇒ I4 = 3.0 A (流出)。<br />
              由电位差定义：U_AB = VA - VB = 12.0 V - 4.8 V = 7.2 V。
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Transfer Ground Fault Diagnosis (Floating Ground Trickle Fault) */}
      {currentStep === 'TRANSFER_GROUND_FAULT_DIAG' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              尾灯搭铁不良“借道串电”实车排查与合规决策
            </span>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">实车异常故障复现：</strong>
              车主反映夜间踩下刹车踏板时，后制动刹车灯异常暗淡，且仪表盘示宽灯与车尾示宽灯居然同步诡异微亮！
            </div>

            {/* Interactive Brake pedal test & multimeter */}
            <div className="flex flex-wrap gap-2.5">
              <Button
                onClick={() => {
                  sounds.click();
                  setIsBrakePedalPressed(!isBrakePedalPressed);
                }}
                className={`cursor-pointer font-bold text-sm ${
                  isBrakePedalPressed ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-700 hover:bg-slate-800 text-white'
                }`}
              >
                {isBrakePedalPressed ? '释放制动踏板 (刹车释放)' : '踩下制动踏板 (通电测试)'}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  sounds.click();
                  setMeterProbeGroundTarget(meterProbeGroundTarget === 'BODY_METAL' ? 'TAIL_WIRE' : 'BODY_METAL');
                }}
                className="cursor-pointer text-sm"
              >
                红表笔测点：{meterProbeGroundTarget === 'TAIL_WIRE' ? '尾灯公共地线插头' : '车身裸露金属'}
              </Button>
            </div>

            {/* Visual simulation box */}
            <div className="w-full h-48 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative border border-slate-800 shadow-inner">
              <div className="flex items-center gap-6 text-white text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-xs transition-all ${
                    isBrakePedalPressed ? 'bg-red-900/60 border-red-500 text-red-200 shadow-md shadow-red-500/30' : 'bg-slate-800 border-slate-600 text-slate-400'
                  }`}>
                    {isBrakePedalPressed ? '刹车灯 (暗淡)' : '刹车灯 (灭)'}
                  </div>
                  <span className="text-xs text-slate-400">制动主灯丝</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-mono text-amber-400">公共搭铁虚接 (浮地 9.2V)</span>
                  <span className="text-lg text-red-400 font-black">⚡ 借道反向串电 ⚡</span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-xs transition-all ${
                    isBrakePedalPressed ? 'bg-amber-900/60 border-amber-500 text-amber-200 shadow-md shadow-amber-500/30' : 'bg-slate-800 border-slate-600 text-slate-400'
                  }`}>
                    {isBrakePedalPressed ? '示宽灯 (微亮)' : '示宽灯 (灭)'}
                  </div>
                  <span className="text-xs text-slate-400">示宽副灯丝</span>
                </div>
              </div>
            </div>

            {/* Technician decision options: NO SPOILER */}
            <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <strong className="text-sm font-bold text-slate-800">
                  车间技师决策：测得尾灯地线对车身金属压降高达 9.2V (正常应 &lt; 0.1V)，你的合规根治方案是：
                </strong>
              </div>

              <div className="flex flex-col gap-2.5">
                {[
                  {
                    id: 'OPT_CLEAN_GROUND',
                    text: 'A. 拆卸尾灯车身搭铁螺栓，用钢丝刷与细砂纸彻底打磨搭铁钣金氧化锈蚀层露出金属光泽，涂抹导电防锈膏并更换紧固搭铁螺栓，消除虚接电阻。',
                  },
                  {
                    id: 'OPT_REPLACE_BCM',
                    text: 'B. 判定车身中央控制电脑 (BCM) 内部芯片逻辑被击穿损坏，建议车主直接更换全新 BCM 电脑总成。',
                  },
                  {
                    id: 'OPT_CHANGE_BULB',
                    text: 'C. 仅更换尾灯灯泡，判定为双丝灯泡内部短路，线束无需检修。',
                  },
                  {
                    id: 'OPT_SERIES_WIRE',
                    text: 'D. 将刹车灯与示宽灯线束直接永久并接在一起，图省事应付交车。',
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
                      name="step5_decision"
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
                提交搭铁故障整改工单
              </Button>

              {step5Feedback && (
                <div
                  className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                    step5Decision === 'OPT_CLEAN_GROUND'
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                      : 'bg-red-50 border border-red-300 text-red-900'
                  }`}
                >
                  {step5Decision === 'OPT_CLEAN_GROUND' ? (
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
              搭铁回路电压降测试仪
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-red-950/80 border-4 border-red-800 rounded-xl shadow-inner font-mono text-red-300">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">GROUND DROP: {meterProbeGroundTarget}</span>
                <span className="font-bold text-red-200">
                  {isBrakePedalPressed ? (meterProbeGroundTarget === 'TAIL_WIRE' ? 'SEVERE DROP (FAIL)' : '0.00 V (REF)') : 'PEDAL RELEASED'}
                </span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-red-200">
                {isBrakePedalPressed ? (meterProbeGroundTarget === 'TAIL_WIRE' ? '9.20 V' : '0.02 V') : '0.00 V'}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>STANDARD LIMIT: &lt; 0.10 V</span>
                <span className="font-bold text-amber-300">FLOATING_GROUND</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">搭铁不良“借道串电”原理解析：</strong>
              车尾灯总成共用一根搭铁地线。当搭铁螺栓氧化接触不良时，踩下刹车由于地线不通，尾灯公共地电位被抬高至 9.2V。电流无法入地，只能沿着示宽灯回路<strong>反向倒灌</strong>通过前部示宽灯入地，导致两组灯泡被迫串联分压，出现刹车灯变暗、示宽灯反常微亮的经典故障！
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
