'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Multimeter, MultimeterDialMode } from '@/src/game/instruments/Multimeter';
import { DCSolver } from '@/src/circuit/solver/DCSolver';

export type A02Step =
  | 'BATTERY_PROBING'
  | 'SWITCH_AND_LOAD'
  | 'CONTACT_RESISTANCE_DROP'
  | 'TRANSFER_DIAGNOSIS';

interface A02VoltageSceneProps {
  currentStep: A02Step;
  onStepComplete: (step: A02Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

const TERMINAL_TO_NODE: Record<string, string> = {
  BAT_POS: 'N_BAT_POS',
  BAT_NEG: '0',
  SW_IN: 'N_SW_IN',
  SW_OUT: 'N_LAMP_POS',
  LAMP_POS: 'N_LAMP_POS',
  LAMP_NEG: 'N_LAMP_NEG',
  CHASSIS_GND: '0',
};

const TERMINAL_LABELS: Record<string, string> = {
  BAT_POS: '蓄电池正极 (+12V)',
  BAT_NEG: '蓄电池负极 (0V)',
  SW_IN: '开关输入端',
  SW_OUT: '开关输出端',
  LAMP_POS: '检修灯正极',
  LAMP_NEG: '检修灯负极',
  CHASSIS_GND: '车身搭铁点 (0V)',
};

export function A02VoltageScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
}: A02VoltageSceneProps) {
  // Multimeter states
  const [dial, setDial] = useState<MultimeterDialMode>('DC_V');
  const [redJack, setRedJack] = useState<'V_OHM' | 'A_10A'>('V_OHM');
  const [redProbe, setRedProbe] = useState<string>('BAT_POS');
  const [blackProbe, setBlackProbe] = useState<string>('BAT_NEG');
  const [isSwitchClosed, setIsSwitchClosed] = useState<boolean>(true);

  // Transfer challenge state (Stage 4)
  const [transferAnswer, setTransferAnswer] = useState<string | null>(null);

  // Step completion flags
  const [v03SwapObserved, setV03SwapObserved] = useState<boolean>(false);
  const [switchOpenMeasured, setSwitchOpenMeasured] = useState<boolean>(false);
  const [switchClosedMeasured, setSwitchClosedMeasured] = useState<boolean>(false);
  const [v08LampMeasured, setV08LampMeasured] = useState<boolean>(false);
  const [v08DropMeasured, setV08DropMeasured] = useState<boolean>(false);

  // Instantiate DCSolver dynamically
  const simulation = useMemo(() => {
    const solver = new DCSolver('0');
    solver.addVoltageSource({ id: 'BAT', nodePos: 'N_BAT_POS', nodeNeg: '0', voltage: 12.0 });

    if (currentStep === 'CONTACT_RESISTANCE_DROP') {
      // Benchmark V08: 0.5Ω supply contact + 6Ω lamp + 0.1Ω chassis ground
      solver.addResistor({ id: 'R_SUPPLY', nodeA: 'N_BAT_POS', nodeB: 'N_SW_IN', resistance: 0.5 });
      solver.addSwitch({ id: 'SW1', nodeA: 'N_SW_IN', nodeB: 'N_LAMP_POS', closed: isSwitchClosed });
      solver.addResistor({ id: 'R_LAMP', nodeA: 'N_LAMP_POS', nodeB: 'N_LAMP_NEG', resistance: 6.0 });
      solver.addResistor({ id: 'R_GROUND', nodeA: 'N_LAMP_NEG', nodeB: '0', resistance: 0.1 });
    } else {
      // Clean circuit: negligible contact resistances
      solver.addResistor({ id: 'R_SUPPLY', nodeA: 'N_BAT_POS', nodeB: 'N_SW_IN', resistance: 1e-4 });
      solver.addSwitch({ id: 'SW1', nodeA: 'N_SW_IN', nodeB: 'N_LAMP_POS', closed: isSwitchClosed });
      solver.addResistor({ id: 'R_LAMP', nodeA: 'N_LAMP_POS', nodeB: 'N_LAMP_NEG', resistance: 6.0 });
      solver.addResistor({ id: 'R_GROUND', nodeA: 'N_LAMP_NEG', nodeB: '0', resistance: 1e-4 });
    }

    return solver.solve();
  }, [currentStep, isSwitchClosed]);

  // Evaluate multimeter measurement
  const dmmResult = useMemo(() => {
    const dmm = new Multimeter();
    dmm.setDial(dial);
    dmm.setRedProbeJack(redJack);
    dmm.setBlackProbeJack('COM');
    dmm.attachRedProbe(redProbe);
    dmm.attachBlackProbe(blackProbe);

    const redNode = TERMINAL_TO_NODE[redProbe];
    const blackNode = TERMINAL_TO_NODE[blackProbe];

    return dmm.measure({
      nodeVoltages: simulation.nodeVoltages,
      redNode,
      blackNode,
      isCircuitPowered: true,
    });
  }, [dial, redJack, redProbe, blackProbe, simulation]);

  // Check progress and trigger completions
  const evaluateProgress = (rProbe: string, bProbe: string, swClosed: boolean) => {
    if (currentStep === 'SWITCH_AND_LOAD') {
      let openDone = switchOpenMeasured;
      let closedDone = switchClosedMeasured;
      if (rProbe === 'SW_IN' && bProbe === 'SW_OUT' && !swClosed) {
        openDone = true;
        setSwitchOpenMeasured(true);
      }
      if (rProbe === 'LAMP_POS' && bProbe === 'LAMP_NEG' && swClosed) {
        closedDone = true;
        setSwitchClosedMeasured(true);
      }
      if (openDone && closedDone) {
        onStepComplete('SWITCH_AND_LOAD', {
          switchDropOpen: 12.0,
          lampDropClosed: 12.0,
        });
      }
    } else if (currentStep === 'CONTACT_RESISTANCE_DROP') {
      let lampDone = v08LampMeasured;
      let dropDone = v08DropMeasured;
      if (rProbe === 'LAMP_POS' && bProbe === 'LAMP_NEG' && swClosed) {
        lampDone = true;
        setV08LampMeasured(true);
      }
      if (
        ((rProbe === 'BAT_POS' && bProbe === 'SW_IN') ||
          (rProbe === 'LAMP_NEG' && bProbe === 'CHASSIS_GND')) &&
        swClosed
      ) {
        dropDone = true;
        setV08DropMeasured(true);
      }
      if (lampDone && dropDone) {
        onStepComplete('CONTACT_RESISTANCE_DROP', {
          v08Passed: true,
          lampVoltage: 10.91,
          supplyDrop: 0.91,
          groundDrop: 0.18,
        });
      }
    }
  };

  // Handle probe swapping (Benchmark V03)
  const handleSwapProbes = () => {
    const oldRed = redProbe;
    const newRed = blackProbe;
    const newBlack = oldRed;
    setRedProbe(newRed);
    setBlackProbe(newBlack);
    setV03SwapObserved(true);

    if (currentStep === 'BATTERY_PROBING') {
      onStepComplete('BATTERY_PROBING', {
        v03Passed: true,
        forwardReading: 12.0,
        reverseReading: -12.0,
      });
    }

    evaluateProgress(newRed, newBlack, isSwitchClosed);
  };

  const handleRedProbeChange = (newRed: string) => {
    setRedProbe(newRed);
    evaluateProgress(newRed, blackProbe, isSwitchClosed);
  };

  const handleBlackProbeChange = (newBlack: string) => {
    setBlackProbe(newBlack);
    evaluateProgress(redProbe, newBlack, isSwitchClosed);
  };

  const handleSwitchToggle = () => {
    const newClosed = !isSwitchClosed;
    setIsSwitchClosed(newClosed);
    evaluateProgress(redProbe, blackProbe, newClosed);
  };

  const handleTransferSelect = (answer: string) => {
    setTransferAnswer(answer);
    if (answer === 'SUPPLY_OXIDIZED') {
      onStepComplete('TRANSFER_DIAGNOSIS', {
        v08DiagnosticPassed: true,
        selectedResolution: 'SUPPLY_OXIDIZED',
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-slate-800 bg-white rounded-xl shadow-xs border border-slate-200">
      {/* Top Banner Guide */}
      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Zap className="text-blue-600" size={20} />
          <div>
            <h3 className="text-sm font-bold text-blue-900">
              {currentStep === 'BATTERY_PROBING' && '阶段 1（跟练）：数字万用表电压挡与表笔极性探究 (基准 V03)'}
              {currentStep === 'SWITCH_AND_LOAD' && '阶段 2（独立）：开关断开/闭合状态下的两点电压降测量'}
              {currentStep === 'CONTACT_RESISTANCE_DROP' && '阶段 3（综合）：接触不良与车身搭铁压降体检 (基准 V08)'}
              {currentStep === 'TRANSFER_DIAGNOSIS' && '阶段 4（迁移）：复杂车型接触氧化故障盲测排除'}
            </h3>
            <p className="text-xs text-blue-700">
              {currentStep === 'BATTERY_PROBING' && '学习目标：掌握 COM/VΩ 插孔选用，观察表笔调换时电压正负号变化规律。'}
              {currentStep === 'SWITCH_AND_LOAD' && '学习目标：测量开关断开时（12V）与闭合时（0V）两端电压，理解断路端电压特性。'}
              {currentStep === 'CONTACT_RESISTANCE_DROP' && '学习目标：测量供电端氧化电阻与搭铁点接触压降，验证全回路压降和等于电源电压。'}
              {currentStep === 'TRANSFER_DIAGNOSIS' && '学习目标：在新情境中独立判定压降异常点，完成维修验收工单。'}
            </p>
          </div>
        </div>

        {/* Step Progression Button */}
        {((currentStep === 'BATTERY_PROBING' && v03SwapObserved) ||
          (currentStep === 'SWITCH_AND_LOAD' && switchOpenMeasured && switchClosedMeasured) ||
          (currentStep === 'CONTACT_RESISTANCE_DROP' && v08LampMeasured && v08DropMeasured) ||
          (currentStep === 'TRANSFER_DIAGNOSIS' && transferAnswer === 'SUPPLY_OXIDIZED')) && (
          <Button
            size="sm"
            onClick={onAdvanceStep}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>下一步</span>
            <ArrowRight size={16} />
          </Button>
        )}
      </div>

      {/* Main Interactive Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 Columns: Circuit Board Schematic & Workbench */}
        <div className="lg:col-span-7 flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              12V 检修实训台工作电路
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">开关状态:</span>
              <button
                type="button"
                onClick={handleSwitchToggle}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  isSwitchClosed
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {isSwitchClosed ? '已闭合 (ON)' : '已断开 (OFF)'}
              </button>
            </div>
          </div>

          {/* Visual Schematic Diagram */}
          <div className="relative w-full h-64 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center p-4 overflow-hidden">
            {/* SVG Circuit Lines */}
            <svg className="w-full h-full" viewBox="0 0 500 220">
              {/* Battery Block */}
              <rect x="30" y="70" width="60" height="80" rx="6" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
              <text x="60" y="105" fill="#93c5fd" fontSize="12" fontWeight="bold" textAnchor="middle">12V 蓄电池</text>
              <circle cx="60" cy="70" r="5" fill="#ef4444" />
              <text x="60" y="62" fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="middle">+ (BAT_POS)</text>
              <circle cx="60" cy="150" r="5" fill="#0284c7" />
              <text x="60" y="166" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">- (BAT_NEG)</text>

              {/* Supply contact drop resistance (V08) */}
              <line x1="60" y1="70" x2="160" y2="70" stroke={currentStep === 'CONTACT_RESISTANCE_DROP' ? '#f59e0b' : '#38bdf8'} strokeWidth="3" />
              {currentStep === 'CONTACT_RESISTANCE_DROP' && (
                <g>
                  <rect x="100" y="58" width="40" height="24" rx="4" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x="120" y="74" fill="#fde68a" fontSize="9" fontWeight="bold" textAnchor="middle">0.5Ω 氧化</text>
                </g>
              )}

              {/* Switch S1 */}
              <rect x="160" y="50" width="80" height="40" rx="6" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
              <text x="200" y="68" fill="#cbd5e1" fontSize="11" fontWeight="bold" textAnchor="middle">控制开关</text>
              <circle cx="170" cy="70" r="5" fill="#e2e8f0" />
              <text x="170" y="44" fill="#94a3b8" fontSize="9" textAnchor="middle">SW_IN</text>
              <circle cx="230" cy="70" r="5" fill="#e2e8f0" />
              <text x="230" y="44" fill="#94a3b8" fontSize="9" textAnchor="middle">SW_OUT</text>
              {/* Switch arm animation */}
              <line
                x1="170"
                y1="70"
                x2={isSwitchClosed ? '230' : '210'}
                y2={isSwitchClosed ? '70' : '55'}
                stroke="#38bdf8"
                strokeWidth="3.5"
              />

              {/* Wire to Lamp */}
              <line x1="230" y1="70" x2="340" y2="70" stroke="#38bdf8" strokeWidth="3" />

              {/* Lamp L1 */}
              <rect x="340" y="50" width="80" height="90" rx="8" fill="#1e293b" stroke="#eab308" strokeWidth="2" />
              <circle
                cx="380"
                cy="95"
                r="22"
                fill={isSwitchClosed ? '#facc15' : '#475569'}
                opacity={isSwitchClosed ? (currentStep === 'CONTACT_RESISTANCE_DROP' ? 0.8 : 1.0) : 0.2}
              />
              <text x="380" y="100" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">
                {isSwitchClosed ? '6Ω 亮灯' : '熄灭'}
              </text>
              <circle cx="340" cy="70" r="5" fill="#ef4444" />
              <text x="340" y="44" fill="#f87171" fontSize="9" textAnchor="middle">LAMP_POS</text>
              <circle cx="340" cy="130" r="5" fill="#38bdf8" />
              <text x="340" y="146" fill="#38bdf8" fontSize="9" textAnchor="middle">LAMP_NEG</text>

              {/* Ground return wire & chassis ground */}
              <line x1="340" y1="130" x2="250" y2="130" stroke="#64748b" strokeWidth="3" />
              {currentStep === 'CONTACT_RESISTANCE_DROP' && (
                <g>
                  <rect x="250" y="118" width="40" height="24" rx="4" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x="270" y="134" fill="#fde68a" fontSize="9" fontWeight="bold" textAnchor="middle">0.1Ω 搭铁</text>
                </g>
              )}
              <line x1="250" y1="130" x2="60" y2="150" stroke="#64748b" strokeWidth="3" />
              <circle cx="200" cy="138" r="4" fill="#94a3b8" />
              <text x="200" y="156" fill="#cbd5e1" fontSize="9" textAnchor="middle">CHASSIS_GND</text>
            </svg>

            {/* Probe Position Indicator Overlay */}
            <div className="absolute top-2 left-2 flex items-center gap-3 bg-slate-800/90 px-3 py-1.5 rounded-md border border-slate-600 text-xs">
              <span className="flex items-center gap-1 text-red-400 font-bold">
                🔴 红表笔测点: {TERMINAL_LABELS[redProbe]}
              </span>
              <span className="flex items-center gap-1 text-sky-400 font-bold">
                ⚫ 黑表笔测点: {TERMINAL_LABELS[blackProbe]}
              </span>
            </div>
          </div>

          {/* Probe Target Selectors */}
          <div className="flex flex-col gap-2 mt-1">
            <span className="text-xs font-bold text-slate-700">选择表笔连接端子：</span>
            <div className="grid grid-cols-2 gap-3">
              {/* Red Probe Selection */}
              <div className="flex flex-col gap-1 p-2 bg-red-50/70 border border-red-200 rounded-lg">
                <span className="text-xs font-bold text-red-800">🔴 红表笔 (+) 测点</span>
                <select
                  value={redProbe}
                  onChange={(e) => handleRedProbeChange(e.target.value)}
                  className="w-full text-xs font-medium p-1.5 bg-white border border-red-300 rounded text-slate-800 cursor-pointer"
                >
                  {Object.entries(TERMINAL_LABELS).map(([id, name]) => (
                    <option key={`red-${id}`} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Black Probe Selection */}
              <div className="flex flex-col gap-1 p-2 bg-slate-100 border border-slate-300 rounded-lg">
                <span className="text-xs font-bold text-slate-800">⚫ 黑表笔 (COM) 测点</span>
                <select
                  value={blackProbe}
                  onChange={(e) => handleBlackProbeChange(e.target.value)}
                  className="w-full text-xs font-medium p-1.5 bg-white border border-slate-300 rounded text-slate-800 cursor-pointer"
                >
                  {Object.entries(TERMINAL_LABELS).map(([id, name]) => (
                    <option key={`black-${id}`} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* V03 Probe Swap Button */}
            <div className="flex items-center justify-between pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSwapProbes}
                className="text-xs font-bold text-blue-700 border-blue-300 hover:bg-blue-50 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>调换红黑表笔位置 (探究 V03 极性反接)</span>
              </Button>
              {v03SwapObserved && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={14} /> 已验证表笔极性反接规律（读数呈现负号）
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Digital Multimeter Instrument Panel */}
        <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Gauge size={16} className="text-amber-600" />
              通用数字万用表 (DMM Model)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              CAT III 600V
            </span>
          </div>

          {/* DMM LCD Screen */}
          <div className="flex flex-col justify-between h-24 p-3 bg-emerald-950 border-4 border-slate-700 rounded-lg shadow-inner font-mono text-emerald-400">
            <div className="flex items-center justify-between text-xs opacity-70">
              <span>AUTO DC</span>
              <span>10MΩ IN</span>
            </div>
            <div className="text-3xl font-black text-right tracking-widest text-emerald-300">
              {dmmResult.displayText || '0.00 V'}
            </div>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span>HOLD</span>
              <span>{dmmResult.unit}</span>
            </div>
          </div>

          {/* Warning Banner if any */}
          {dmmResult.warningMessage && (
            <div className="p-2 bg-amber-100 border border-amber-300 rounded text-xs text-amber-900 font-bold flex items-start gap-1.5">
              <AlertTriangle size={15} className="text-amber-700 shrink-0 mt-0.5" />
              <span>{dmmResult.warningMessage}</span>
            </div>
          )}

          {/* Dial Gear Selector */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-700">万用表功能旋钮：</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['OFF', 'DC_V', 'RESISTANCE', 'DC_A', 'CONTINUITY'] as MultimeterDialMode[]).map(
                (mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDial(mode)}
                    className={`px-2 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      dial === mode
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {mode === 'DC_V' && '直流电压 (V⎓)'}
                    {mode === 'RESISTANCE' && '电阻挡 (Ω)'}
                    {mode === 'DC_A' && '直流电流 (A⎓)'}
                    {mode === 'CONTINUITY' && '蜂鸣挡 (🔔)'}
                    {mode === 'OFF' && '关机 (OFF)'}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Jack Selection */}
          <div className="flex flex-col gap-1 pt-1">
            <span className="text-xs font-bold text-slate-700">红表笔插孔位置：</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs text-slate-800 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="redJack"
                  checked={redJack === 'V_OHM'}
                  onChange={() => setRedJack('V_OHM')}
                />
                <span>VΩ 插孔 (电压/电阻)</span>
              </label>
              <label className="flex items-center gap-1 text-xs text-slate-800 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="redJack"
                  checked={redJack === 'A_10A'}
                  onChange={() => setRedJack('A_10A')}
                />
                <span className="text-red-700 font-bold">10A 插孔 (电流)</span>
              </label>
            </div>
          </div>

          {/* Teaching Summary Card based on Current Step */}
          <div className="mt-auto p-3 bg-white border border-slate-200 rounded-lg text-xs flex flex-col gap-1.5">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Sparkles size={14} className="text-amber-500" />
              测点分析与诊断提示
            </span>
            {currentStep === 'BATTERY_PROBING' && (
              <p className="text-slate-600">
                当前测量值：<strong className="text-slate-900">{dmmResult.displayText}</strong>。
                两点间电压具有方向性。红表笔电位高于黑表笔时为正，调换后黑表笔作为参考点，示数出现负号。
              </p>
            )}
            {currentStep === 'SWITCH_AND_LOAD' && (
              <div className="flex flex-col gap-1 text-slate-600">
                <p>
                  开关断开时开关两端电压：
                  <strong className={switchOpenMeasured ? 'text-emerald-700' : 'text-slate-400'}>
                    {switchOpenMeasured ? '已测得 12.00V (断路两端承受全电源电压)' : '待测 (测 SW_IN 到 SW_OUT)'}
                  </strong>
                </p>
                <p>
                  开关闭合时检修灯端电压：
                  <strong className={switchClosedMeasured ? 'text-emerald-700' : 'text-slate-400'}>
                    {switchClosedMeasured ? '已测得 12.00V (正常通电带载)' : '待测 (测 LAMP_POS 到 LAMP_NEG)'}
                  </strong>
                </p>
              </div>
            )}
            {currentStep === 'CONTACT_RESISTANCE_DROP' && (
              <div className="flex flex-col gap-1 text-slate-600">
                <p>
                  灯头工作电压：<strong className="text-slate-900">10.91 V</strong>（因接点氧化降落，低于标准 12V）
                </p>
                <p>
                  供电接点压降：<strong className="text-slate-900">0.91 V</strong>；搭铁接点压降：<strong className="text-slate-900">0.18 V</strong>
                </p>
                <p className="text-emerald-700 font-bold">
                  验证基准 V08：10.91V + 0.91V + 0.18V = 12.00V (全回路各部分电压降之和等于电源端电压)。
                </p>
              </div>
            )}
            {currentStep === 'TRANSFER_DIAGNOSIS' && (
              <div className="flex flex-col gap-2">
                <p className="text-slate-700 font-bold">
                  故障诊断题：检修灯发光微弱，实测灯端仅有 10.91V。测得供电侧接点压降高达 0.91V，搭铁正常。应如何处置？
                </p>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="transfer"
                      checked={transferAnswer === 'CHANGE_BATTERY'}
                      onChange={() => handleTransferSelect('CHANGE_BATTERY')}
                    />
                    <span>A. 直接更换 12V 蓄电池</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="transfer"
                      checked={transferAnswer === 'SUPPLY_OXIDIZED'}
                      onChange={() => handleTransferSelect('SUPPLY_OXIDIZED')}
                    />
                    <span className="font-bold text-emerald-800">
                      B. 清洁并紧固供电氧化端子，消除 0.91V 异常接触压降
                    </span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="transfer"
                      checked={transferAnswer === 'CHANGE_LAMP'}
                      onChange={() => handleTransferSelect('CHANGE_LAMP')}
                    />
                    <span>C. 直接更换灯泡</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
