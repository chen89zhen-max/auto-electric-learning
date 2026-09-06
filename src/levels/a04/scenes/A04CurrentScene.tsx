'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Sparkles,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Multimeter, MultimeterDialMode } from '@/src/game/instruments/Multimeter';
import { ClampMeter } from '@/src/game/instruments/ClampMeter';
import { DCSolver } from '@/src/circuit/solver/DCSolver';

export type A04Step =
  | 'SERIES_MEASUREMENT'
  | 'SHORT_CIRCUIT_INTERCEPT'
  | 'CLAMP_METER_TASK'
  | 'BATTERY_DISPOSAL'
  | 'TRANSFER_PARALLEL_KCL';

interface A04CurrentSceneProps {
  currentStep: A04Step;
  onStepComplete: (step: A04Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

export function A04CurrentScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
}: A04CurrentSceneProps) {
  // Multimeter states
  const dial: MultimeterDialMode = 'DC_A';
  const redJack: 'A_10A' | 'V_OHM' = 'A_10A';
  const [meterPlacement, setMeterPlacement] = useState<'DISCONNECTED' | 'IN_SERIES' | 'PARALLEL_BRIDGE'>('DISCONNECTED');
  const [isSwitchClosed, setIsSwitchClosed] = useState<boolean>(true);

  // Clamp meter states
  const clampDial: 'OFF' | 'DC_A' = 'DC_A';
  const [clampedOption, setClampedOption] = useState<'NONE' | 'SINGLE_FEED' | 'DUAL_WIRES'>('NONE');

  // Battery disposal state
  const [batteryTested, setBatteryTested] = useState<boolean>(false);
  const [batteryDisposed, setBatteryDisposed] = useState<boolean>(false);

  // Transfer challenge state
  const [kclAnswer, setKclAnswer] = useState<string | null>(null);

  // Step completion flags
  const [v06InterceptObserved, setV06InterceptObserved] = useState<boolean>(false);
  const [seriesMeasured, setSeriesMeasured] = useState<boolean>(false);
  const [clampSingleMeasured, setClampSingleMeasured] = useState<boolean>(false);
  const [clampDualMeasured, setClampDualMeasured] = useState<boolean>(false);

  // DC Solver calculation for circuit
  const simulation = useMemo(() => {
    const solver = new DCSolver('0');
    solver.addVoltageSource({ id: 'BAT', nodePos: '1', nodeNeg: '0', voltage: 12.0 });

    if (meterPlacement === 'IN_SERIES') {
      // 10A Ammeter inserted in series between switch and lamp (internal shunt 0.01Ω)
      solver.addSwitch({ id: 'SW1', nodeA: '1', nodeB: '2', closed: isSwitchClosed });
      solver.addResistor({ id: 'R_AMMETER', nodeA: '2', nodeB: '3', resistance: 0.01 });
      solver.addResistor({ id: 'R_LAMP', nodeA: '3', nodeB: '0', resistance: 6.0 });
    } else {
      // Direct connection without meter in series
      solver.addSwitch({ id: 'SW1', nodeA: '1', nodeB: '2', closed: isSwitchClosed });
      solver.addResistor({ id: 'R_LAMP', nodeA: '2', nodeB: '0', resistance: 6.0 });
    }

    return solver.solve();
  }, [meterPlacement, isSwitchClosed]);

  // Multimeter measurement evaluation
  const dmmResult = useMemo(() => {
    const dmm = new Multimeter();
    dmm.setDial(dial);
    dmm.setRedProbeJack(redJack);
    dmm.setBlackProbeJack('COM');

    if (meterPlacement === 'PARALLEL_BRIDGE') {
      // V06: Dangerous direct bridge across 12V battery terminals!
      return dmm.measure({
        isDirectBatteryBridge: true,
      });
    }

    if (meterPlacement === 'IN_SERIES') {
      const current = isSwitchClosed ? simulation.branchCurrents.get('R_AMMETER') ?? 0 : 0;
      return dmm.measure({
        branchCurrent: current,
      });
    }

    return dmm.measure({ branchCurrent: 0 });
  }, [dial, redJack, meterPlacement, isSwitchClosed, simulation]);

  // Clamp meter evaluation
  const clampResult = useMemo(() => {
    const clamp = new ClampMeter();
    clamp.setDial(clampDial);

    const circuitCurrent = isSwitchClosed ? 2.0 : 0.0;
    if (clampedOption === 'SINGLE_FEED') {
      return clamp.clampWires([
        { id: 'W_FEED', name: '检修灯供电火线', current: circuitCurrent, direction: 'FEED' },
      ]);
    } else if (clampedOption === 'DUAL_WIRES') {
      return clamp.clampWires([
        { id: 'W_FEED', name: '供电火线', current: circuitCurrent, direction: 'FEED' },
        { id: 'W_RETURN', name: '搭铁地线', current: circuitCurrent, direction: 'RETURN' },
      ]);
    }

    return clamp.clampWires([]);
  }, [clampDial, clampedOption, isSwitchClosed]);

  const handleMeterPlacement = (placement: 'DISCONNECTED' | 'IN_SERIES' | 'PARALLEL_BRIDGE') => {
    setMeterPlacement(placement);
    if (placement === 'IN_SERIES' && isSwitchClosed) {
      setSeriesMeasured(true);
      onStepComplete('SERIES_MEASUREMENT', {
        seriesCurrent: 2.0,
        meterInsertedCorrectly: true,
      });
    }
    if (placement === 'PARALLEL_BRIDGE') {
      setV06InterceptObserved(true);
      onStepComplete('SHORT_CIRCUIT_INTERCEPT', {
        v06Passed: true,
        interceptedDanger: true,
        fuseBlownAvoided: true,
      });
    }
  };

  const handleSwitchToggle = () => {
    const nextClosed = !isSwitchClosed;
    setIsSwitchClosed(nextClosed);
    if (nextClosed && meterPlacement === 'IN_SERIES') {
      setSeriesMeasured(true);
      onStepComplete('SERIES_MEASUREMENT', {
        seriesCurrent: 2.0,
        meterInsertedCorrectly: true,
      });
    }
  };

  const handleClampOption = (option: 'SINGLE_FEED' | 'DUAL_WIRES') => {
    setClampedOption(option);
    let singleDone = clampSingleMeasured;
    let dualDone = clampDualMeasured;
    if (option === 'SINGLE_FEED') {
      singleDone = true;
      setClampSingleMeasured(true);
    }
    if (option === 'DUAL_WIRES') {
      dualDone = true;
      setClampDualMeasured(true);
    }
    if (singleDone && dualDone) {
      onStepComplete('CLAMP_METER_TASK', {
        clampSingleCurrent: 2.0,
        clampDualCancellationCurrent: 0.0,
        fluxCancellationObserved: true,
      });
    }
  };

  const handleBatteryDisposal = () => {
    setBatteryDisposed(true);
    onStepComplete('BATTERY_DISPOSAL', {
      loadVoltage: 9.2,
      isDepleted: true,
      hazardousDisposalConfirmed: true,
    });
  };

  const handleKclAnswer = (ans: string) => {
    setKclAnswer(ans);
    if (ans === 'KCL_CORRECT') {
      onStepComplete('TRANSFER_PARALLEL_KCL', {
        kclVerified: true,
        totalCurrent: 9.0,
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-slate-800 bg-white rounded-xl shadow-xs border border-slate-200">
      {/* Top Banner Guide */}
      <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-red-600" size={20} />
          <div>
            <h3 className="text-sm font-bold text-red-900">
              {currentStep === 'SERIES_MEASUREMENT' && '阶段 1（串联接入）：万用表 10A 电流挡串联接入测量规范'}
              {currentStep === 'SHORT_CIRCUIT_INTERCEPT' && '阶段 2（安全拦截）：电流挡严禁并联跨接电源 (基准 V06)'}
              {currentStep === 'CLAMP_METER_TASK' && '阶段 3（微任务）：汽车非接触式钳形电流表测量与双线反例'}
              {currentStep === 'BATTERY_DISPOSAL' && '阶段 4（环保微任务）：废旧蓄电池带载检测与规范归集'}
              {currentStep === 'TRANSFER_PARALLEL_KCL' && '阶段 5（迁移）：双大灯并联支路电流与总电流 KCL 验证'}
            </h3>
            <p className="text-xs text-red-700">
              {currentStep === 'SERIES_MEASUREMENT' && '学习目标：红表笔选 10A 孔，断开电路供电线，将表笔串联接入闭合回路中测得工作电流。'}
              {currentStep === 'SHORT_CIRCUIT_INTERCEPT' && '学习目标：验证基准 V06，体验电流挡误并联跨接电源时系统的执行前强制拦截机制。'}
              {currentStep === 'CLAMP_METER_TASK' && '学习目标：使用钳形表非接触测流，观察同时钳入单导线与双导线时的磁通抵消现象。'}
              {currentStep === 'BATTERY_DISPOSAL' && '学习目标：测试老化电池带载端电压（9.2V），规范归入危废回收箱。'}
              {currentStep === 'TRANSFER_PARALLEL_KCL' && '学习目标：在双路负载中验证支路电流之和等于总干路电流。'}
            </p>
          </div>
        </div>

        {/* Step Progression Button */}
        {((currentStep === 'SERIES_MEASUREMENT' && seriesMeasured) ||
          (currentStep === 'SHORT_CIRCUIT_INTERCEPT' && v06InterceptObserved) ||
          (currentStep === 'CLAMP_METER_TASK' && clampSingleMeasured && clampDualMeasured) ||
          (currentStep === 'BATTERY_DISPOSAL' && batteryTested && batteryDisposed) ||
          (currentStep === 'TRANSFER_PARALLEL_KCL' && kclAnswer === 'KCL_CORRECT')) && (
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
        {/* Left 7 Columns: Work Bench / Wiring Experiment */}
        <div className="lg:col-span-7 flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          {/* Steps 1 & 2: Multimeter Series & Short Circuit Scene */}
          {(currentStep === 'SERIES_MEASUREMENT' || currentStep === 'SHORT_CIRCUIT_INTERCEPT') && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  实训台检修灯回路 · 电流表接法操作区
                </span>
                <button
                  type="button"
                  onClick={handleSwitchToggle}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    isSwitchClosed ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {isSwitchClosed ? '回路开关：已接通' : '回路开关：已断开'}
                </button>
              </div>

              {/* Circuit Schematic SVG */}
              <div className="relative w-full h-56 bg-slate-900 rounded-lg p-3 flex items-center justify-center overflow-hidden">
                <svg viewBox="0 0 460 180" className="w-full h-full">
                  {/* Battery */}
                  <rect x="20" y="50" width="50" height="80" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                  <text x="45" y="95" fill="#bae6fd" fontSize="10" textAnchor="middle">12V 源</text>
                  <circle cx="45" cy="50" r="4" fill="#ef4444" />
                  <text x="45" y="42" fill="#ef4444" fontSize="9" textAnchor="middle">+</text>
                  <circle cx="45" cy="130" r="4" fill="#38bdf8" />
                  <text x="45" y="145" fill="#38bdf8" fontSize="9" textAnchor="middle">-</text>

                  {/* Switch */}
                  <line x1="45" y1="50" x2="130" y2="50" stroke="#38bdf8" strokeWidth="2.5" />
                  <rect x="130" y="35" width="50" height="30" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
                  <line x1="140" y1="50" x2={isSwitchClosed ? '170' : '160'} y2={isSwitchClosed ? '50' : '35'} stroke="#38bdf8" strokeWidth="3" />

                  {/* Meter Insertion Gap */}
                  {meterPlacement === 'IN_SERIES' ? (
                    <g>
                      <line x1="180" y1="50" x2="220" y2="50" stroke="#ef4444" strokeWidth="2.5" />
                      <rect x="220" y="30" width="70" height="40" rx="6" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2" />
                      <text x="255" y="55" fill="#fca5a5" fontSize="11" fontWeight="bold" textAnchor="middle">串联 A 表</text>
                      <line x1="290" y1="50" x2="340" y2="50" stroke="#0284c7" strokeWidth="2.5" />
                    </g>
                  ) : meterPlacement === 'PARALLEL_BRIDGE' ? (
                    <g>
                      <line x1="180" y1="50" x2="340" y2="50" stroke="#38bdf8" strokeWidth="2.5" />
                      {/* Dangerous Direct Bridge wires */}
                      <path d="M 45 50 Q 180 15 250 80" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="4 2" />
                      <path d="M 45 130 Q 180 165 250 80" fill="none" stroke="#38bdf8" strokeWidth="3" strokeDasharray="4 2" />
                      <rect x="230" y="60" width="80" height="40" rx="6" fill="#b91c1c" stroke="#fca5a5" strokeWidth="2" />
                      <text x="270" y="85" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">跨接短路!</text>
                    </g>
                  ) : (
                    <g>
                      {/* Broken circuit gap */}
                      <line x1="180" y1="50" x2="230" y2="50" stroke="#38bdf8" strokeWidth="2.5" />
                      <circle cx="230" cy="50" r="5" fill="#f59e0b" />
                      <text x="230" y="38" fill="#fde68a" fontSize="9" textAnchor="middle">切断口 A</text>
                      <circle cx="290" cy="50" r="5" fill="#f59e0b" />
                      <text x="290" y="38" fill="#fde68a" fontSize="9" textAnchor="middle">切断口 B</text>
                      <line x1="290" y1="50" x2="340" y2="50" stroke="#38bdf8" strokeWidth="2.5" />
                    </g>
                  )}

                  {/* Lamp */}
                  <rect x="340" y="35" width="60" height="80" rx="6" fill="#1e293b" stroke="#eab308" strokeWidth="2" />
                  <circle
                    cx="370"
                    cy="75"
                    r="18"
                    fill={isSwitchClosed && meterPlacement === 'IN_SERIES' ? '#facc15' : '#475569'}
                    opacity={isSwitchClosed && meterPlacement === 'IN_SERIES' ? 1 : 0.2}
                  />
                  <text x="370" y="80" fill="#0f172a" fontSize="10" fontWeight="bold" textAnchor="middle">
                    6Ω 灯
                  </text>

                  {/* Return ground */}
                  <line x1="370" y1="115" x2="45" y2="130" stroke="#64748b" strokeWidth="2.5" />
                </svg>
              </div>

              {/* Meter Placement Selection */}
              <div className="flex flex-col gap-2 p-3 bg-white border border-slate-200 rounded-lg text-xs">
                <span className="font-bold text-slate-800">操作万用表表笔接线：</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleMeterPlacement('DISCONNECTED')}
                    className={`p-2 rounded font-bold transition-all cursor-pointer ${
                      meterPlacement === 'DISCONNECTED'
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    断开表笔 (未接入)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMeterPlacement('IN_SERIES')}
                    className={`p-2 rounded font-bold transition-all cursor-pointer ${
                      meterPlacement === 'IN_SERIES'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    规范接法：串联接入切口两端
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMeterPlacement('PARALLEL_BRIDGE')}
                    className={`p-2 rounded font-bold transition-all cursor-pointer ${
                      meterPlacement === 'PARALLEL_BRIDGE'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-50 text-red-800 border border-red-300 hover:bg-red-100'
                    }`}
                  >
                    危险测试：并联直接跨接电源两端 (V06)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Clamp meter task */}
          {currentStep === 'CLAMP_METER_TASK' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                汽车非接触式钳形电流表实训
              </span>
              <div className="w-full h-44 bg-slate-900 rounded-lg p-4 flex flex-col items-center justify-center relative">
                {/* Visual Wires & Clamp SVG */}
                <svg viewBox="0 0 360 120" className="w-full">
                  {/* Feed wire (red) */}
                  <line x1="20" y1="40" x2="340" y2="40" stroke="#ef4444" strokeWidth="5" />
                  <text x="30" y="30" fill="#fca5a5" fontSize="10">供电火线 (I = 2.0A →)</text>

                  {/* Return wire (black) */}
                  <line x1="20" y1="80" x2="340" y2="80" stroke="#38bdf8" strokeWidth="5" />
                  <text x="30" y="100" fill="#bae6fd" fontSize="10">搭铁回路 (← I = 2.0A)</text>

                  {/* Clamp Jaws representation */}
                  {clampedOption === 'SINGLE_FEED' && (
                    <ellipse cx="180" cy="40" rx="30" ry="18" fill="none" stroke="#f59e0b" strokeWidth="6" strokeDasharray="6 3" />
                  )}
                  {clampedOption === 'DUAL_WIRES' && (
                    <ellipse cx="180" cy="60" rx="35" ry="38" fill="none" stroke="#f59e0b" strokeWidth="6" strokeDasharray="6 3" />
                  )}
                </svg>

                <div className="text-xs text-slate-300 mt-1">
                  {clampedOption === 'NONE' && '钳口未夹入任何导线'}
                  {clampedOption === 'SINGLE_FEED' && '钳口已夹入：供电火线（单根导线）'}
                  {clampedOption === 'DUAL_WIRES' && '钳口已夹入：供电火线 + 搭铁地线（双线同钳）'}
                </div>
              </div>

              {/* Clamp Selection buttons */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Button
                  variant="outline"
                  onClick={() => handleClampOption('SINGLE_FEED')}
                  className={`font-bold cursor-pointer ${
                    clampedOption === 'SINGLE_FEED' ? 'bg-amber-100 border-amber-500 text-amber-900' : ''
                  }`}
                >
                  操作 1：单独钳入供电火线
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleClampOption('DUAL_WIRES')}
                  className={`font-bold cursor-pointer ${
                    clampedOption === 'DUAL_WIRES' ? 'bg-amber-100 border-amber-500 text-amber-900' : ''
                  }`}
                >
                  操作 2：同时钳入火线与搭铁线（反例）
                </Button>
              </div>

              {clampResult.educationalNote && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 font-medium">
                  {clampResult.educationalNote}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Battery disposal micro-task */}
          {currentStep === 'BATTERY_DISPOSAL' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                废旧蓄电池规范归集与带载电压检测
              </span>
              <div className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col gap-3 text-xs">
                <p className="text-slate-700">
                  维修工位更换下一只标称 12V 铅酸蓄电池。按车间电工安全规程，须先进行带载测量评估，再分类投放。
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={() => setBatteryTested(true)}
                    className="cursor-pointer bg-blue-600 hover:bg-blue-700"
                  >
                    施加测试负载测量端电压
                  </Button>
                  {batteryTested && (
                    <span className="font-bold text-amber-800">
                      实测带载端电压：9.20 V（严重亏电且无法保持容量，判定为报废件）
                    </span>
                  )}
                </div>

                {batteryTested && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">规范归集处理：</span>
                    <Button
                      size="sm"
                      onClick={handleBatteryDisposal}
                      className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                    >
                      <Trash2 size={15} />
                      <span>放入专用废蓄电池危废回收箱</span>
                    </Button>
                  </div>
                )}
                {batteryDisposed && (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={15} /> 已完成环保规范分类归集！不可随意弃置或随生活垃圾丢弃。
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Transfer Parallel KCL */}
          {currentStep === 'TRANSFER_PARALLEL_KCL' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                独立迁移题 · 双大灯并联支路电流与总电流 KCL 验证
              </span>
              <div className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col gap-3 text-xs">
                <p className="text-slate-700 font-bold">
                  工单情境：汽车左前大灯支路电流 I₁ = 4.5A，右前大灯支路电流 I₂ = 4.5A。
                  若在总供电保险丝后测总电流，预期读数应为多少？
                </p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="kcl_transfer"
                      checked={kclAnswer === 'KCL_CORRECT'}
                      onChange={() => handleKclAnswer('KCL_CORRECT')}
                    />
                    <span className="font-bold text-emerald-800">
                      A. 9.0 A (基尔霍夫电流定律 KCL：流入节点的总电流等于流出各支路电流之和 4.5 + 4.5 = 9.0A)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="kcl_transfer"
                      checked={kclAnswer === 'KCL_WRONG_1'}
                      onChange={() => handleKclAnswer('KCL_WRONG_1')}
                    />
                    <span>B. 4.5 A (并联各处电流相等)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="kcl_transfer"
                      checked={kclAnswer === 'KCL_WRONG_2'}
                      onChange={() => handleKclAnswer('KCL_WRONG_2')}
                    />
                    <span>C. 2.25 A (电流被平分折半)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Columns: Multimeter / Instrument Display */}
        <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Gauge size={16} className="text-amber-600" />
              {currentStep === 'CLAMP_METER_TASK' ? '数字钳形电流表 (Clamp Meter)' : '数字万用表 · 10A 电流挡'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              10A FUSED
            </span>
          </div>

          {/* LCD Screen */}
          <div className="flex flex-col justify-between h-24 p-3 bg-emerald-950 border-4 border-slate-700 rounded-lg shadow-inner font-mono text-emerald-400">
            <div className="flex items-center justify-between text-xs opacity-70">
              <span>{currentStep === 'CLAMP_METER_TASK' ? 'CLAMP DC' : 'DC 10A'}</span>
              <span>{dmmResult.status === 'REFUSED_SHORT_CIRCUIT' ? 'INTERCEPT' : 'AUTO'}</span>
            </div>
            <div className="text-3xl font-black text-right tracking-widest text-emerald-300">
              {currentStep === 'CLAMP_METER_TASK' ? clampResult.displayText || '0.00 A' : dmmResult.displayText || '0.00 A'}
            </div>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span>{currentStep === 'CLAMP_METER_TASK' ? 'HALL FLUX' : dmmResult.status}</span>
              <span>A</span>
            </div>
          </div>

          {/* V06 Warning Message Banner */}
          {dmmResult.status === 'REFUSED_SHORT_CIRCUIT' && (
            <div className="p-2.5 bg-red-100 border border-red-300 rounded text-xs text-red-900 font-bold flex items-start gap-2">
              <ShieldAlert size={18} className="text-red-700 shrink-0 mt-0.5" />
              <div>
                <p>安全规则强制拦截 (基准 V06)：</p>
                <p className="font-normal text-red-800">
                  {dmmResult.warningMessage}
                </p>
              </div>
            </div>
          )}

          {/* Jacks & Dial reminder */}
          <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs flex flex-col gap-1.5">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <Sparkles size={14} className="text-amber-500" />
              电流测量核心规程
            </span>
            <p className="text-slate-600">
              1. <strong>串联接入</strong>：电流表内阻极小，必须串接在被测支路中，让电流流过表体内部采样电阻。
            </p>
            <p className="text-slate-600">
              2. <strong>严禁并联跨接电源 (V06)</strong>：若将表笔直接并联在 12V 蓄电池正负极，瞬间将产生数百安培短路短接电流，导致表内熔丝爆炸熔断或损坏车辆元器件。
            </p>
            <p className="text-slate-600">
              3. <strong>钳形表单线原则</strong>：非接触钳测只夹单根导线；双线同钳将发生磁场抵消导致示数归零。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
