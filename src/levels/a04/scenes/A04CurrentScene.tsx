'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  ShieldAlert,
  Trash2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Multimeter } from '@/src/game/instruments/Multimeter';
import { ClampMeter } from '@/src/game/instruments/ClampMeter';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { PracticeMode } from '@/src/types/evidence';
import { A04Step } from '../a04Training';

interface A04CurrentSceneProps {
  currentStep: A04Step;
  practiceMode?: PracticeMode;
  onStepComplete: (step: A04Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

export function A04CurrentScene({
  currentStep,
  practiceMode = 'guided',
  onStepComplete,
  onAdvanceStep,
}: A04CurrentSceneProps) {
  // Step 1 & 2: Series ammeter & switch state
  const [isSwitchClosed, setIsSwitchClosed] = useState(false);
  const [isCircuitBroken, setIsCircuitBroken] = useState(false);
  const [isMeterInsertedInBreak, setIsMeterInsertedInBreak] = useState(false);
  const [isV06BridgeAttempted, setIsV06BridgeAttempted] = useState(false);

  // Step 3: Clamp meter states
  const [clampedMode, setClampedMode] = useState<'NONE' | 'SINGLE' | 'DUAL'>('NONE');
  const [singleObserved, setSingleObserved] = useState(false);
  const [dualObserved, setDualObserved] = useState(false);

  // Step 4: Battery disposal
  const [batteryLoadTested, setBatteryLoadTested] = useState(false);
  const [batteryDisposed, setBatteryDisposed] = useState(false);

  // Step 5: Transfer Parasitic Drain / KCL
  const [pulledFuses, setPulledFuses] = useState<Set<string>>(new Set());
  const [kclAnswer, setKclAnswer] = useState<string | null>(null);

  // Clamp meter instance
  const clampMeter = useMemo(() => {
    const cm = new ClampMeter();
    cm.setDial('DC_A');
    if (clampedMode === 'SINGLE') {
      cm.clampWires([{ id: 'W1', name: '供电导线 (+12V)', current: 2.0, direction: 'FEED' }]);
    } else if (clampedMode === 'DUAL') {
      cm.clampWires([
        { id: 'W1', name: '供电导线 (+12V)', current: 2.0, direction: 'FEED' },
        { id: 'W2', name: '搭铁导线 (GND)', current: 2.0, direction: 'RETURN' },
      ]);
    } else {
      cm.clampWires([]);
    }
    return cm.getState();
  }, [clampedMode]);

  // Multimeter reading evaluation
  const dmmResult = useMemo(() => {
    const dmm = new Multimeter();
    dmm.setDial('DC_A');
    dmm.setRedProbeJack('A_10A');
    dmm.setBlackProbeJack('COM');

    if (currentStep === 'SERIES_MEASUREMENT') {
      if (isMeterInsertedInBreak && isSwitchClosed) {
        return dmm.measure({ branchCurrent: 2.0 });
      }
      return dmm.measure({ branchCurrent: 0.0 });
    }

    if (currentStep === 'SHORT_CIRCUIT_INTERCEPT') {
      if (isV06BridgeAttempted) {
        return dmm.measure({ isDirectBatteryBridge: true });
      }
      return dmm.measure({ branchCurrent: 0.0 });
    }

    if (currentStep === 'TRANSFER_PARALLEL_KCL') {
      if (practiceMode === 'transfer') {
        // Parasitic drain: base 480mA.
        // If F2 (Dashcam) pulled -> drops by 420mA!
        let drain = 480;
        if (pulledFuses.has('F1')) drain -= 15;
        if (pulledFuses.has('F2')) drain -= 420;
        if (pulledFuses.has('F3')) drain -= 25;
        if (pulledFuses.has('F4')) drain -= 20;
        return {
          displayText: `${drain} mA`,
          measuredValue: drain / 1000,
          unit: 'mA',
          status: 'NORMAL',
        };
      } else {
        return dmm.measure({ branchCurrent: 3.0 });
      }
    }

    return dmm.measure({});
  }, [currentStep, isMeterInsertedInBreak, isSwitchClosed, isV06BridgeAttempted, practiceMode, pulledFuses]);

  // Step 1: Handle series operations
  const handleBreakConnector = () => {
    sounds.click();
    setIsCircuitBroken(true);
  };

  const handleInsertMeter = () => {
    sounds.click();
    if (!isCircuitBroken) return;
    setIsMeterInsertedInBreak(true);
  };

  const handleToggleSwitch = () => {
    sounds.click();
    const next = !isSwitchClosed;
    setIsSwitchClosed(next);

    if (next && isMeterInsertedInBreak) {
      sounds.success();
      onStepComplete('SERIES_MEASUREMENT', {
        circuitBrokenFirst: true,
        meterPlugged10A: true,
        seriesCurrent: 2.0,
        mode: practiceMode,
      });
    }
  };

  // Step 2: Handle V06 Short Circuit Bridge Attempt
  const handleAttemptBridge = () => {
    sounds.zap();
    sounds.warningBuzz();
    setIsV06BridgeAttempted(true);
    onStepComplete('SHORT_CIRCUIT_INTERCEPT', {
      v06Intercepted: true,
      dangerDirectBridgeAttempted: true,
      mode: practiceMode,
    });
  };

  // Step 3: Handle Clamp meter
  const handleClampSingle = () => {
    sounds.click();
    setClampedMode('SINGLE');
    setSingleObserved(true);
    if (dualObserved) {
      sounds.success();
      onStepComplete('CLAMP_METER_TASK', {
        singleWireCurrent: 2.0,
        fluxCancellationObserved: true,
        mode: practiceMode,
      });
    }
  };

  const handleClampDual = () => {
    sounds.click();
    setClampedMode('DUAL');
    setDualObserved(true);
    if (singleObserved) {
      sounds.success();
      onStepComplete('CLAMP_METER_TASK', {
        singleWireCurrent: 2.0,
        fluxCancellationObserved: true,
        mode: practiceMode,
      });
    }
  };

  // Step 4: Handle Battery load test & disposal
  const handleBatteryTest = () => {
    sounds.click();
    setBatteryLoadTested(true);
  };

  const handleBatteryRecycle = () => {
    sounds.success();
    setBatteryDisposed(true);
    onStepComplete('BATTERY_DISPOSAL', {
      loadVoltage: 9.2,
      isSeverelySulfated: true,
      hazardousRecycled: true,
      mode: practiceMode,
    });
  };

  // Step 5: Toggle Pulling Fuses
  const handleToggleFuse = (fuseId: string) => {
    sounds.click();
    const next = new Set(pulledFuses);
    if (next.has(fuseId)) {
      next.delete(fuseId);
    } else {
      next.add(fuseId);
    }
    setPulledFuses(next);

    if (next.has('F2')) {
      sounds.success();
      onStepComplete('TRANSFER_PARALLEL_KCL', {
        faultIsolated: 'F2_DASHCAM',
        finalSleepDrainMA: 60,
        mode: practiceMode,
      });
    }
  };

  const handleKclAnswerSubmit = (ans: string) => {
    sounds.click();
    setKclAnswer(ans);
    if (ans === 'KCL_3A') {
      sounds.success();
      onStepComplete('TRANSFER_PARALLEL_KCL', {
        kclAnswer: 'I_TOTAL_3A',
        mode: practiceMode,
      });
    }
  };

  // Step advance ready check
  const isStepAdvanceReady =
    (currentStep === 'SERIES_MEASUREMENT' && isMeterInsertedInBreak && isSwitchClosed) ||
    (currentStep === 'SHORT_CIRCUIT_INTERCEPT' && isV06BridgeAttempted) ||
    (currentStep === 'CLAMP_METER_TASK' && singleObserved && dualObserved) ||
    (currentStep === 'BATTERY_DISPOSAL' && batteryLoadTested && batteryDisposed) ||
    (currentStep === 'TRANSFER_PARALLEL_KCL' &&
      (pulledFuses.has('F2') || kclAnswer === 'KCL_3A'));

  return (
    <div className="w-full flex flex-col gap-4 text-slate-800">
      {/* Station Top Step Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isStepAdvanceReady ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-xs font-black text-slate-800 tracking-wider">
              {currentStep === 'SERIES_MEASUREMENT' && '阶段 1 / 5 · 万用表 10A 电流挡串联断路接入规范'}
              {currentStep === 'SHORT_CIRCUIT_INTERCEPT' && '阶段 2 / 5 · 危险并联跨接短路拦截 (基准 V06)'}
              {currentStep === 'CLAMP_METER_TASK' && '阶段 3 / 5 · 汽车专用钳形表非接触测量与磁通抵消'}
              {currentStep === 'BATTERY_DISPOSAL' && '阶段 4 / 5 · 废旧蓄电池带载检测与环保危废箱分类'}
              {currentStep === 'TRANSFER_PARALLEL_KCL' &&
                (practiceMode === 'transfer'
                  ? '阶段 5 / 5 · 实车整车休眠暗电流排查 (拔保险丝实战)'
                  : '阶段 5 / 5 · 并联双大灯支路电流与总干路 KCL 验证')}
            </span>
          </div>

          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-800 border border-red-200">
            {practiceMode === 'guided'
              ? '跟练模式 · 步骤引导'
              : practiceMode === 'independent'
              ? '独立模式 · 自主实测'
              : '迁移模式 · 实车排故'}
          </span>
        </div>

        {isStepAdvanceReady && (
          <Button
            size="sm"
            onClick={onAdvanceStep}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 px-4 shadow-sm cursor-pointer"
          >
            <span>{currentStep === 'TRANSFER_PARALLEL_KCL' ? '查看通关报告' : '进入下一步'}</span>
            <ArrowRight size={16} />
          </Button>
        )}
      </div>

      {/* STEP 1: Series Insertion Workbench */}
      {currentStep === 'SERIES_MEASUREMENT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 7 Cols: Automotive Circuit Wiring */}
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                12V 检修灯供电回路 · 串联断口接入操作
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                回路状态：{isSwitchClosed ? '开关已闭合 (通电)' : '开关已断开 (断电)'}
              </span>
            </div>

            {/* Circuit Diagram Visual SVG */}
            <div className="w-full h-44 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 380 100" className="w-full max-w-md">
                {/* Battery */}
                <rect x="20" y="30" width="40" height="40" rx="6" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
                <text x="40" y="55" fill="#93c5fd" fontSize="10" textAnchor="middle" fontWeight="bold">12V</text>

                {/* Wire 1 */}
                <line x1="60" y1="50" x2="110" y2="50" stroke="#ef4444" strokeWidth="3" />

                {/* Switch */}
                <circle cx="110" cy="50" r="4" fill="#cbd5e1" />
                <line
                  x1="110"
                  y1="50"
                  x2={isSwitchClosed ? 150 : 142}
                  y2={isSwitchClosed ? 50 : 32}
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                />
                <circle cx="150" cy="50" r="4" fill="#cbd5e1" />

                {/* Break point / Connector */}
                {!isCircuitBroken ? (
                  <g>
                    <line x1="150" y1="50" x2="230" y2="50" stroke="#ef4444" strokeWidth="3" />
                    <rect x="180" y="42" width="20" height="16" rx="3" fill="#64748b" />
                    <text x="190" y="54" fill="#f8fafc" fontSize="8" textAnchor="middle">插头</text>
                  </g>
                ) : isMeterInsertedInBreak ? (
                  <g>
                    {/* Meter inserted in break */}
                    <path d="M 150 50 Q 170 20 190 20" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="4 2" />
                    <path d="M 230 50 Q 210 20 190 20" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeDasharray="4 2" />
                    <rect x="175" y="10" width="30" height="20" rx="4" fill="#b91c1c" stroke="#fca5a5" strokeWidth="1.5" />
                    <text x="190" y="24" fill="#fff" fontSize="9" textAnchor="middle" fontWeight="bold">10A表</text>
                  </g>
                ) : (
                  <g>
                    {/* Open break */}
                    <circle cx="170" cy="50" r="5" fill="#ef4444" />
                    <text x="170" y="65" fill="#fca5a5" fontSize="8" textAnchor="middle">断口A</text>
                    <circle cx="210" cy="50" r="5" fill="#ef4444" />
                    <text x="210" y="65" fill="#fca5a5" fontSize="8" textAnchor="middle">断口B</text>
                  </g>
                )}

                {/* Wire to Lamp */}
                <line x1="230" y1="50" x2="280" y2="50" stroke="#ef4444" strokeWidth="3" />

                {/* Lamp */}
                <circle cx="300" cy="50" r="18" fill={isSwitchClosed && isMeterInsertedInBreak ? '#facc15' : '#334155'} stroke="#eab308" strokeWidth="2" />
                <text x="300" y="54" fill="#1e293b" fontSize="9" textAnchor="middle" fontWeight="bold">灯泡 6Ω</text>

                {/* Ground Return Wire */}
                <line x1="318" y1="50" x2="340" y2="50" stroke="#64748b" strokeWidth="3" />
                <line x1="340" y1="50" x2="340" y2="85" stroke="#64748b" strokeWidth="3" />
                <line x1="340" y1="85" x2="40" y2="85" stroke="#64748b" strokeWidth="3" />
                <line x1="40" y1="85" x2="40" y2="70" stroke="#64748b" strokeWidth="3" />
              </svg>
            </div>

            {/* Step-by-Step Operator Controls */}
            <div className="grid grid-cols-3 gap-2.5 pt-1 text-xs">
              <Button
                variant={isCircuitBroken ? 'secondary' : 'default'}
                disabled={isCircuitBroken}
                onClick={handleBreakConnector}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
              >
                1. 拔开插头形成断口
              </Button>
              <Button
                variant={isMeterInsertedInBreak ? 'secondary' : 'default'}
                disabled={!isCircuitBroken || isMeterInsertedInBreak}
                onClick={handleInsertMeter}
                className="bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
              >
                2. 串联接入 10A 电流表
              </Button>
              <Button
                disabled={!isMeterInsertedInBreak}
                onClick={handleToggleSwitch}
                className={`font-bold text-white cursor-pointer ${
                  isSwitchClosed ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                3. {isSwitchClosed ? '断开开关' : '闭合开关通电'}
              </Button>
            </div>

            {isMeterInsertedInBreak && isSwitchClosed && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>电路已闭合通电！电流表作为回路一部分串入工作，测得正常回路工作电流 2.00A。</span>
              </div>
            )}
          </div>

          {/* Right 5 Cols: Bench DMM Ammeter (Active Tool) */}
          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Gauge size={16} />
                数字万用表 · 10A 电流挡
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-900 text-red-200 border border-red-700">
                10A 插孔 · 串联回路
              </span>
            </div>

            <div className="flex flex-col justify-between h-24 p-3 bg-emerald-950 border-4 border-slate-800 rounded-lg shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-75">
                <span>DC 10A RANGE</span>
                <span>{isMeterInsertedInBreak && isSwitchClosed ? 'CIRCUIT_CLOSED' : 'OPEN'}</span>
              </div>
              <div className="text-3xl font-black text-right tracking-widest text-emerald-300">
                {dmmResult.displayText || '0.00 A'}
              </div>
              <div className="flex items-center justify-between text-[11px] opacity-75">
                <span>SHUNT: 0.01Ω</span>
                <span>DC AMPERES</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-lg text-xs text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1">电流测量铁律：</strong>
              <p>1. 万用表必须断路后【串联】接入，绝不能并联在负载或电源两端！</p>
              <p>2. 红表笔必须插入【10A】专用大电流插孔，避免烧毁 200mA 保险丝。</p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Dangerous Short Circuit Intercept (V06 Counterexample) */}
      {currentStep === 'SHORT_CIRCUIT_INTERCEPT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-slate-700">
              安全教学反例实验台 · 验证基准 V06（电流挡严禁并联跨接）
            </span>

            <div className="w-full h-44 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800">
              <svg viewBox="0 0 320 100" className="w-full max-w-xs">
                {/* 12V Battery */}
                <rect x="50" y="20" width="80" height="60" rx="8" fill="#1e293b" stroke="#ef4444" strokeWidth="2.5" />
                <text x="90" y="55" fill="#fca5a5" fontSize="13" textAnchor="middle" fontWeight="bold">12V 蓄电池</text>

                {/* Probes directly across terminals */}
                <path d="M 65 20 Q 90 -5 160 30" fill="none" stroke="#ef4444" strokeWidth="3" />
                <path d="M 115 20 Q 140 -5 160 30" fill="none" stroke="#334155" strokeWidth="3" />

                {/* Meter */}
                <rect x="160" y="20" width="90" height="55" rx="8" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2" />
                <text x="205" y="45" fill="#fef2f2" fontSize="10" textAnchor="middle" fontWeight="bold">电流表 0.01Ω</text>
                <text x="205" y="62" fill="#fca5a5" fontSize="9" textAnchor="middle">并联跨接</text>

                {/* Arc spark explosion icon if attempted */}
                {isV06BridgeAttempted && (
                  <g className="animate-ping">
                    <circle cx="90" cy="20" r="14" fill="#f59e0b" opacity="0.6" />
                    <circle cx="90" cy="20" r="8" fill="#ef4444" />
                  </g>
                )}
              </svg>
            </div>

            <Button
              onClick={handleAttemptBridge}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 cursor-pointer shadow-sm"
            >
              模拟尝试：将电流表并联跨接在 12V 电源两端
            </Button>

            {isV06BridgeAttempted && (
              <div className="p-3.5 bg-red-100 border-2 border-red-500 rounded-xl text-xs text-red-950 flex items-start gap-2.5">
                <AlertTriangle size={22} className="text-red-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sm block">车间智能安防系统已执行强制拦截 (基准 V06)</strong>
                  <p className="mt-1 leading-relaxed text-red-900">
                    电流表内部阻抗极小（只有 0.01Ω 分流电阻），若直接并联在 12V 蓄电池两端，短路电流可达 1200A！
                    会导致表笔瞬间飞溅电弧爆熔、蓄电池极板损坏！车间电子短路断路器已执行纳秒级保护跳闸，禁止通电！
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
              <ShieldAlert size={16} />
              V06 短路阻断状态
            </span>

            <div className="flex flex-col justify-between h-24 p-3 bg-red-950/80 border-4 border-red-800 rounded-lg shadow-inner font-mono text-red-300">
              <div className="flex items-center justify-between text-xs opacity-75">
                <span>SAFETY INTERLOCK</span>
                <span>V06 ACTIVE</span>
              </div>
              <div className="text-2xl font-black text-right tracking-wider text-red-200">
                {isV06BridgeAttempted ? 'SHORT INTERCEPT' : 'READY'}
              </div>
              <div className="flex items-center justify-between text-[11px] opacity-75">
                <span>CIRCUIT TRIPPED</span>
                <span>0.00 A (BLOCKED)</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-lg text-xs text-slate-300 leading-relaxed border border-slate-700">
              考核要求：理解为什么电压表可以并联（内阻高达 10MΩ，分流几乎为 0），而电流表绝对不能并联（内阻接近 0Ω，相当于一根纯铜线短路）！
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Clamp Meter Non-Contact & Flux Cancellation */}
      {currentStep === 'CLAMP_METER_TASK' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">汽车专用数字钳形电流表工位</span>
              <span className="text-xs font-mono text-amber-600 font-bold">NON_CONTACT_INDUCTION</span>
            </div>

            {/* Wire harness visual */}
            <div className="w-full h-44 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative border border-slate-800">
              <svg viewBox="0 0 320 100" className="w-full max-w-xs">
                {/* Red wire (+2A) */}
                <line x1="30" y1="35" x2="290" y2="35" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
                <text x="45" y="25" fill="#fca5a5" fontSize="9">供电母线 (+2.0A)</text>

                {/* Black wire (-2A) */}
                <line x1="30" y1="65" x2="290" y2="65" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />
                <text x="45" y="85" fill="#cbd5e1" fontSize="9">搭铁回路 (-2.0A)</text>

                {/* Clamp Jaw graphic */}
                {clampedMode === 'SINGLE' && (
                  <g>
                    <rect x="150" y="20" width="30" height="30" rx="8" fill="none" stroke="#f59e0b" strokeWidth="4" />
                    <rect x="180" y="28" width="40" height="14" rx="3" fill="#f59e0b" />
                    <text x="200" y="39" fill="#1e293b" fontSize="8" textAnchor="middle" fontWeight="bold">钳口</text>
                  </g>
                )}

                {clampedMode === 'DUAL' && (
                  <g>
                    <rect x="150" y="18" width="30" height="64" rx="8" fill="none" stroke="#f59e0b" strokeWidth="4" />
                    <rect x="180" y="42" width="40" height="14" rx="3" fill="#f59e0b" />
                    <text x="200" y="53" fill="#1e293b" fontSize="8" textAnchor="middle" fontWeight="bold">双线卡入</text>
                  </g>
                )}
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={clampedMode === 'SINGLE' ? 'default' : 'outline'}
                onClick={handleClampSingle}
                className="font-bold py-2.5 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white"
              >
                1. 钳形表卡入【单根供电线】
              </Button>
              <Button
                variant={clampedMode === 'DUAL' ? 'default' : 'outline'}
                onClick={handleClampDual}
                className="font-bold py-2.5 cursor-pointer bg-slate-700 hover:bg-slate-800 text-white"
              >
                2. 钳形表同时卡入【双导线并行】
              </Button>
            </div>

            {clampMeter.educationalNote && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 leading-relaxed font-semibold">
                {clampMeter.educationalNote}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Gauge size={16} />
              数字钳形表屏幕显示
            </span>

            <div className="flex flex-col justify-between h-24 p-3 bg-emerald-950 border-4 border-slate-800 rounded-lg shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-75">
                <span>NON-CONTACT CLAMP</span>
                <span>{clampedMode === 'DUAL' ? 'FLUX CANCELLED' : 'MEASURING'}</span>
              </div>
              <div className="text-3xl font-black text-right tracking-widest text-emerald-300">
                {clampMeter.displayText || '0.00 A'}
              </div>
              <div className="flex items-center justify-between text-[11px] opacity-75">
                <span>HALL_EFFECT</span>
                <span>DC AMPERES</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-lg text-xs text-slate-300 leading-relaxed border border-slate-700">
              <strong className="text-amber-300 block mb-1">安培环路定律教学精要：</strong>
              钳形表通过内部霍尔传感器感应导线周围的环形磁场。若同时钳入前进与回流双线，两根线产生的反向磁场大小相等方向相反，净磁通量为零，示数归零！因此在实车排故中，必须只钳单根电线！
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Battery Load Testing & Hazardous Recycling */}
      {currentStep === 'BATTERY_DISPOSAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-slate-700">
              实车退役 12V 铅酸蓄电池 · 负荷测试与环保归集
            </span>

            <div className="w-full h-44 bg-slate-900 rounded-xl flex items-center justify-around p-4 relative border border-slate-800">
              {/* Battery */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-20 bg-slate-800 border-2 border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-300 font-bold shadow-md">
                  <Zap size={20} className="text-amber-400 mb-1" />
                  <span className="text-xs">12V 60Ah</span>
                  <span className="text-[10px] text-red-400">退役蓄电池</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="text-slate-500 font-bold text-xs flex flex-col items-center">
                <span>带载复核后</span>
                <span>→ 环保分类</span>
              </div>

              {/* Hazard Recycling Bin */}
              <div
                className={`w-28 h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                  batteryDisposed
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-yellow-950/60 border-yellow-500 text-yellow-300'
                }`}
              >
                <Trash2 size={24} />
                <span className="text-[11px] font-bold text-center">防酸耐腐蚀危废箱</span>
                <span className="text-[9px] opacity-75">{batteryDisposed ? '已入箱保存' : '待归集'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleBatteryTest}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 cursor-pointer"
              >
                1. 带载 100A 放电测试端电压
              </Button>
              <Button
                disabled={!batteryLoadTested || batteryDisposed}
                onClick={handleBatteryRecycle}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 cursor-pointer"
              >
                2. 确认报废并归集入危废箱
              </Button>
            </div>

            {batteryDisposed && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>废旧蓄电池已安全归入专用防泄漏危废箱，避免酸液重金属污染，完成车间环保闭环。</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Gauge size={16} />
              负荷测试仪读数
            </span>

            <div className="flex flex-col justify-between h-24 p-3 bg-emerald-950 border-4 border-slate-800 rounded-lg shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-75">
                <span>LOAD TEST (100A)</span>
                <span>{batteryLoadTested ? 'TEST_COMPLETED' : 'STANDBY'}</span>
              </div>
              <div className="text-3xl font-black text-right tracking-widest text-emerald-300">
                {batteryLoadTested ? '9.20 V' : '---'}
              </div>
              <div className="flex items-center justify-between text-[11px] opacity-75">
                <span>{batteryLoadTested ? 'BELOW 10.5V THRESHOLD' : 'STANDBY'}</span>
                <span>FAIL_REPLACE</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-lg text-xs text-slate-300 leading-relaxed border border-slate-700">
              车间标准：蓄电池在 100A 负荷放电 15 秒后，端电压必须保持在 10.5V 以上。本电池骤降至 9.2V，证明极板已严重硫化失效，禁止继续装车，必须按危险废弃物合规回收。
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Transfer Parasitic Drain / KCL */}
      {currentStep === 'TRANSFER_PARALLEL_KCL' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {practiceMode === 'transfer' ? (
            <>
              {/* Parasitic Drain Hunt */}
              <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    实车停放亏电排查 · 拔保险丝法排查整车休眠暗电流
                  </span>
                  <span className="text-xs text-amber-600 font-mono font-bold">SLEEP_DRAIN_DIAG</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed">
                  <strong>故障情境：</strong>
                  车主反映车辆停放 2 天后蓄电池亏电无法点火。拔掉钥匙并等待车辆进入休眠，万用表电流挡串联在蓄电池负极搭铁线上，测得休眠暗电流高达 480mA（正常标准应小于 50mA）。请逐个拔出保险丝排查漏电支路！
                </div>

                {/* Fuse box UI */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'F1', name: 'F1 (10A) · 组合仪表', drain: 15 },
                    { id: 'F2', name: 'F2 (15A) · 后装行车记录仪', drain: 420 },
                    { id: 'F3', name: 'F3 (20A) · 车身电脑 BCM', drain: 25 },
                    { id: 'F4', name: 'F4 (15A) · 顶灯与天窗模块', drain: 20 },
                  ].map((fuse) => {
                    const isPulled = pulledFuses.has(fuse.id);
                    return (
                      <button
                        key={fuse.id}
                        type="button"
                        onClick={() => handleToggleFuse(fuse.id)}
                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-1 text-left ${
                          isPulled
                            ? 'border-red-500 bg-red-50/70 text-red-900 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{fuse.name}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isPulled ? 'bg-red-200 text-red-900' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isPulled ? '已拔出断开' : '在位插接'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {isPulled ? `回路已断开（消除约 ${fuse.drain}mA 负荷）` : '点击拔出此保险丝观察电流'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {pulledFuses.has('F2') && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 font-semibold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>拔下 F2（加装行车记录仪）后，休眠电流从 480mA 骤降至 60mA，成功锁定漏电元凶！</span>
                  </div>
                )}
              </div>

              {/* Right 5 Cols: Bench DMM Ammeter */}
              <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Gauge size={16} />
                  电瓶负极串联暗电流示数
                </span>

                <div className="flex flex-col justify-between h-24 p-3 bg-emerald-950 border-4 border-slate-800 rounded-lg shadow-inner font-mono text-emerald-400">
                  <div className="flex items-center justify-between text-xs opacity-75">
                    <span>BATTERY GND SERIES</span>
                    <span>{pulledFuses.has('F2') ? 'NORMAL_SLEEP' : 'EXCESSIVE_DRAIN'}</span>
                  </div>
                  <div className="text-3xl font-black text-right tracking-widest text-emerald-300">
                    {dmmResult.displayText}
                  </div>
                  <div className="flex items-center justify-between text-[11px] opacity-75">
                    <span>THRESHOLD: &lt;50mA</span>
                    <span>STANDBY</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-lg text-xs text-slate-300 leading-relaxed border border-slate-700">
                  排故诊断结论：后装行车记录仪常电接法错误，未随钥匙关闭休眠，导致车辆持续放电。维修方案应将供电线改接至 ACC 档受控保险丝。
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Independent Mode: KCL Parallel Dual Headlamps */}
              <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                <span className="text-xs font-bold text-slate-700">并联双前大灯支路基尔霍夫电流定律 (KCL) 验证</span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-700">
                  实车双大灯并联供电。经万用表测量：左前大灯支路电流 I₁ = 1.50A，右前大灯支路电流 I₂ = 1.50A。
                  根据基尔霍夫电流定律（节点流入电流等于流出电流之和），总保险丝主干路电流为多少？
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  <label className="flex items-center gap-2 p-3 rounded-lg border bg-white cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="kcl_opt"
                      checked={kclAnswer === 'KCL_3A'}
                      onChange={() => handleKclAnswerSubmit('KCL_3A')}
                    />
                    <span className="font-bold text-emerald-800">
                      A. 3.00A：总干路电流等于各并联支路电流之和 (I_总 = 1.5A + 1.5A = 3.0A)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-lg border bg-white cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="kcl_opt"
                      checked={kclAnswer === 'KCL_15A'}
                      onChange={() => handleKclAnswerSubmit('KCL_15A')}
                    />
                    <span>B. 1.50A：并联各处电流相等</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-lg border bg-white cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="kcl_opt"
                      checked={kclAnswer === 'KCL_075A'}
                      onChange={() => handleKclAnswerSubmit('KCL_075A')}
                    />
                    <span>C. 0.75A：总电流被两灯平分衰减</span>
                  </label>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Gauge size={16} />
                  总干路实测读数
                </span>
                <div className="flex flex-col justify-between h-24 p-3 bg-emerald-950 border-4 border-slate-800 rounded-lg shadow-inner font-mono text-emerald-400">
                  <div className="flex items-center justify-between text-xs opacity-75">
                    <span>MAIN FEED FUSE</span>
                    <span>KCL VERIFIED</span>
                  </div>
                  <div className="text-3xl font-black text-right tracking-widest text-emerald-300">
                    3.00 A
                  </div>
                  <div className="flex items-center justify-between text-[11px] opacity-75">
                    <span>TOTAL CURRENT</span>
                    <span>DC AMPERES</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
