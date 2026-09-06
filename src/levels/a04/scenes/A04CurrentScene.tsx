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

interface DiagOption {
  id: string;
  text: string;
}

const DIAG_OPTIONS: readonly DiagOption[] = [
  {
    id: 'OPT_A',
    text: 'A. 规范整改布线：将行车记录仪正极电源改接至点火开关受控的 ACC/IGN 保险丝支路，确保熄火拔钥匙后彻底断电。',
  },
  {
    id: 'OPT_B',
    text: 'B. 建议车主更换为 80Ah 大容量 AGM 蓄电池，试图依靠大电量抵抗长电暗电流损耗。',
  },
  {
    id: 'OPT_C',
    text: 'C. 建议直接拆除整车保险盒，将所有常电保险丝全部更换为更大规格 30A 保险丝。',
  },
  {
    id: 'OPT_D',
    text: 'D. 判定为车身电脑 BCM 内部休眠程序逻辑故障，建议直接订货更换 BCM 总成。',
  },
];

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

  // Step 5: Parasitic Drain & Repair Decision
  const [pulledFuses, setPulledFuses] = useState<Set<string>>(new Set());
  const [diagDecision, setDiagDecision] = useState<string | null>(null);
  const [diagSubmitted, setDiagSubmitted] = useState<boolean>(false);
  const [diagFeedback, setDiagFeedback] = useState<string | null>(null);

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
    }

    return dmm.measure({});
  }, [currentStep, isMeterInsertedInBreak, isSwitchClosed, isV06BridgeAttempted, pulledFuses]);

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

  // Step 5: Toggle Pulling Fuses & Decision
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
    }
  };

  const handleDiagSubmit = () => {
    sounds.click();
    if (!diagDecision) return;
    setDiagSubmitted(true);
    if (diagDecision === 'OPT_A') {
      sounds.success();
      setDiagFeedback(
        '诊断正确！加装行车记录仪误接常火线（BATT）导致整车无法休眠。将其改接至点火开关受控的 ACC 回路后，熄火拔钥匙即断开供电，暗电流恢复至标准范围（<50mA）。'
      );
      onStepComplete('TRANSFER_PARALLEL_KCL', {
        faultIsolated: 'F2_DASHCAM',
        finalSleepDrainMA: 60,
        diagDecision: 'OPT_A',
        mode: practiceMode,
      });
    } else {
      sounds.warningBuzz();
      setDiagFeedback(
        '方案不合理：加大蓄电池容量无法解决持续漏电；更换大保险丝有线束过热起火隐患；更换 BCM 属于误判过度维修。请重新分析加装电器的受控逻辑！'
      );
    }
  };

  // Step advance ready check
  const isStepAdvanceReady =
    (currentStep === 'SERIES_MEASUREMENT' && isMeterInsertedInBreak && isSwitchClosed) ||
    (currentStep === 'SHORT_CIRCUIT_INTERCEPT' && isV06BridgeAttempted) ||
    (currentStep === 'CLAMP_METER_TASK' && singleObserved && dualObserved) ||
    (currentStep === 'BATTERY_DISPOSAL' && batteryLoadTested && batteryDisposed) ||
    (currentStep === 'TRANSFER_PARALLEL_KCL' &&
      pulledFuses.has('F2') &&
      diagSubmitted &&
      diagDecision === 'OPT_A');

  return (
    <div className="w-full flex-1 flex flex-col gap-4 text-slate-800 min-h-[580px]">
      {/* Station Top Step Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isStepAdvanceReady ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-xs sm:text-sm font-black text-slate-800 tracking-wider">
              {currentStep === 'SERIES_MEASUREMENT' && '阶段 1 / 5 · 万用表 10A 电流挡串联断路接入规范'}
              {currentStep === 'SHORT_CIRCUIT_INTERCEPT' && '阶段 2 / 5 · 危险并联跨接短路拦截 (基准 V06)'}
              {currentStep === 'CLAMP_METER_TASK' && '阶段 3 / 5 · 汽车专用钳形表非接触测量与磁通抵消'}
              {currentStep === 'BATTERY_DISPOSAL' && '阶段 4 / 5 · 废旧蓄电池带载检测与环保危废箱分类'}
              {currentStep === 'TRANSFER_PARALLEL_KCL' && '阶段 5 / 5 · 实车整车休眠暗电流排查与维修决策'}
            </span>
          </div>

          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-red-50 text-red-800 border border-red-200">
            5阶段综合实训
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
              <span className="text-sm font-bold text-slate-700">
                12V 检修灯供电回路 · 串联断口接入操作
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-600">
                回路状态：{isSwitchClosed ? '开关已闭合 (通电)' : '开关已断开 (断电)'}
              </span>
            </div>

            {/* Circuit Diagram Visual SVG */}
            <div className="w-full h-60 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 460 130" className="w-full h-full max-w-lg">
                {/* Battery */}
                <rect x="25" y="35" width="55" height="50" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
                <text x="52" y="60" fill="#93c5fd" fontSize="13" textAnchor="middle" fontWeight="bold">12V 蓄电池</text>
                <text x="52" y="75" fill="#60a5fa" fontSize="10" textAnchor="middle">电源端</text>

                {/* Wire 1: Battery to Switch */}
                <line x1="80" y1="60" x2="135" y2="60" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* Switch */}
                <circle cx="135" cy="60" r="5" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                <line
                  x1="135"
                  y1="60"
                  x2={isSwitchClosed ? 180 : 170}
                  y2={isSwitchClosed ? 60 : 36}
                  stroke="#38bdf8"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <circle cx="180" cy="60" r="5" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                <text x="157" y={isSwitchClosed ? 82 : 30} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="bold">
                  {isSwitchClosed ? '开关(闭合)' : '开关(断开)'}
                </text>

                {/* Break point / Connector */}
                {!isCircuitBroken ? (
                  <g>
                    <line x1="180" y1="60" x2="275" y2="60" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
                    <rect x="215" y="48" width="30" height="24" rx="4" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
                    <text x="230" y="64" fill="#f8fafc" fontSize="11" textAnchor="middle" fontWeight="bold">插头</text>
                  </g>
                ) : isMeterInsertedInBreak ? (
                  <g>
                    {/* Meter inserted in break */}
                    <path d="M 180 60 Q 205 20 230 20" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="6 3" />
                    <path d="M 275 60 Q 250 20 230 20" fill="none" stroke="#1e293b" strokeWidth="4" strokeDasharray="6 3" />
                    <rect x="210" y="8" width="42" height="26" rx="6" fill="#b91c1c" stroke="#fca5a5" strokeWidth="2" />
                    <text x="231" y="25" fill="#fff" fontSize="11" textAnchor="middle" fontWeight="bold">10A表</text>
                  </g>
                ) : (
                  <g>
                    <line x1="180" y1="60" x2="205" y2="60" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
                    <line x1="250" y1="60" x2="275" y2="60" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="205" cy="60" r="6" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
                    <text x="205" y="80" fill="#fca5a5" fontSize="11" textAnchor="middle" fontWeight="bold">断口A</text>
                    <circle cx="250" cy="60" r="6" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
                    <text x="250" y="80" fill="#fca5a5" fontSize="11" textAnchor="middle" fontWeight="bold">断口B</text>
                  </g>
                )}

                {/* Wire to Lamp */}
                <line x1="275" y1="60" x2="335" y2="60" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />

                {/* Lamp */}
                <circle
                  cx="360"
                  cy="60"
                  r="24"
                  fill={isSwitchClosed && isMeterInsertedInBreak ? '#facc15' : '#334155'}
                  stroke="#eab308"
                  strokeWidth="2.5"
                  className={isSwitchClosed && isMeterInsertedInBreak ? 'filter drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]' : ''}
                />
                <text
                  x="360"
                  y="64"
                  fill={isSwitchClosed && isMeterInsertedInBreak ? '#713f12' : '#94a3b8'}
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  灯泡 6Ω
                </text>

                {/* Ground Return Wire */}
                <line x1="384" y1="60" x2="420" y2="60" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="420" y1="60" x2="420" y2="110" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="420" y1="110" x2="52" y2="110" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                <line x1="52" y1="110" x2="52" y2="85" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Step-by-Step Operator Controls */}
            <div className="grid grid-cols-3 gap-3 pt-1 text-sm">
              <Button
                variant={isCircuitBroken ? 'secondary' : 'default'}
                disabled={isCircuitBroken}
                onClick={handleBreakConnector}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 cursor-pointer"
              >
                1. 拔开插头形成断口
              </Button>
              <Button
                variant={isMeterInsertedInBreak ? 'secondary' : 'default'}
                disabled={!isCircuitBroken || isMeterInsertedInBreak}
                onClick={handleInsertMeter}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 cursor-pointer"
              >
                2. 串联接入 10A 电流表
              </Button>
              <Button
                disabled={!isMeterInsertedInBreak}
                onClick={handleToggleSwitch}
                className={`font-bold text-white py-2.5 cursor-pointer ${
                  isSwitchClosed ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                3. {isSwitchClosed ? '断开开关' : '闭合开关通电'}
              </Button>
            </div>

            {isMeterInsertedInBreak && isSwitchClosed && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>电路已闭合通电！电流表作为回路一部分串入工作，测得正常回路工作电流 2.00A。</span>
              </div>
            )}
          </div>

          {/* Right 5 Cols: Bench DMM Ammeter (Active Tool) */}
          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <Gauge size={18} />
                数字万用表 · 10A 电流挡
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-red-900 text-red-200 border border-red-700">
                10A 插孔 · 串联回路
              </span>
            </div>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">DC 10A RANGE</span>
                <span className="font-bold text-amber-300">
                  {isMeterInsertedInBreak && isSwitchClosed ? 'CIRCUIT_CLOSED' : 'OPEN'}
                </span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {dmmResult.displayText || '0.00 A'}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>SHUNT: 0.01Ω</span>
                <span className="font-bold">DC AMPERES</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">电流测量铁律：</strong>
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
            <span className="text-sm font-bold text-slate-700">
              安全教学反例实验台 · 验证基准 V06（电流挡严禁并联跨接）
            </span>

            <div className="w-full h-56 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 380 120" className="w-full max-w-sm">
                {/* 12V Battery */}
                <rect x="40" y="25" width="100" height="70" rx="10" fill="#1e293b" stroke="#ef4444" strokeWidth="3" />
                <text x="90" y="60" fill="#fca5a5" fontSize="14" textAnchor="middle" fontWeight="bold">12V 蓄电池</text>
                <text x="90" y="78" fill="#f87171" fontSize="11" textAnchor="middle">电源正负极</text>

                {/* Probes directly across terminals */}
                <path d="M 60 25 Q 90 -8 180 35" fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                <path d="M 120 25 Q 150 -8 180 35" fill="none" stroke="#334155" strokeWidth="4" strokeLinecap="round" />

                {/* Meter */}
                <rect x="180" y="25" width="110" height="70" rx="10" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2.5" />
                <text x="235" y="55" fill="#fef2f2" fontSize="12" textAnchor="middle" fontWeight="bold">电流表 0.01Ω</text>
                <text x="235" y="75" fill="#fca5a5" fontSize="11" textAnchor="middle" fontWeight="bold">错误：并联跨接</text>

                {/* Arc spark explosion icon if attempted */}
                {isV06BridgeAttempted && (
                  <g className="animate-ping">
                    <circle cx="90" cy="25" r="18" fill="#f59e0b" opacity="0.7" />
                    <circle cx="90" cy="25" r="10" fill="#ef4444" />
                  </g>
                )}
              </svg>
            </div>

            <Button
              onClick={handleAttemptBridge}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 cursor-pointer shadow-sm text-sm"
            >
              模拟尝试：将电流表并联跨接在 12V 电源两端
            </Button>

            {isV06BridgeAttempted && (
              <div className="p-3.5 bg-red-100 border-2 border-red-500 rounded-xl text-sm text-red-950 flex items-start gap-2.5">
                <AlertTriangle size={24} className="text-red-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sm block font-bold">车间智能安防系统已执行强制拦截 (基准 V06)</strong>
                  <p className="mt-1 leading-relaxed text-red-900">
                    电流表内部阻抗极小（只有 0.01Ω 分流电阻），若直接并联在 12V 蓄电池两端，短路电流可达 1200A！
                    会导致表笔瞬间飞溅电弧爆熔、蓄电池极板损坏！车间电子短路断路器已执行纳秒级保护跳闸，禁止通电！
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-sm font-bold text-red-400 flex items-center gap-1.5">
              <ShieldAlert size={18} />
              V06 短路阻断状态
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-red-950/80 border-4 border-red-800 rounded-xl shadow-inner font-mono text-red-300">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">SAFETY INTERLOCK</span>
                <span className="font-bold text-amber-300">V06 ACTIVE</span>
              </div>
              <div className="text-3xl lg:text-4xl font-black text-right tracking-wider text-red-200">
                {isV06BridgeAttempted ? 'SHORT INTERCEPT' : 'READY'}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>CIRCUIT TRIPPED</span>
                <span className="font-bold text-red-300">0.00 A (BLOCKED)</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">原理深度剖析：</strong>
              电压表内阻高达 10MΩ，并联时分流几乎为 0，对原电路安全无扰；但电流表内阻仅约 0.01Ω，并联相当于用一根粗铜线直接短接电源两极，造成灾难性短路！牢记：<strong>测电压并联，测电流必须串联！</strong>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Clamp Meter Non-Contact & Flux Cancellation */}
      {currentStep === 'CLAMP_METER_TASK' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">汽车专用数字钳形电流表工位</span>
              <span className="text-xs font-mono text-amber-600 font-bold">NON_CONTACT_INDUCTION</span>
            </div>

            {/* Wire harness visual */}
            <div className="w-full h-56 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative border border-slate-800 shadow-inner">
              <svg viewBox="0 0 380 120" className="w-full max-w-sm">
                {/* Red wire (+2A) */}
                <line x1="30" y1="38" x2="350" y2="38" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
                <text x="45" y="26" fill="#fca5a5" fontSize="11" fontWeight="bold">供电母线 (+2.0A 流出)</text>

                {/* Black wire (-2A) */}
                <line x1="30" y1="82" x2="350" y2="82" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
                <text x="45" y="104" fill="#cbd5e1" fontSize="11" fontWeight="bold">搭铁回路 (-2.0A 回流)</text>

                {/* Clamp Jaw graphic */}
                {clampedMode === 'SINGLE' && (
                  <g>
                    <rect x="175" y="20" width="38" height="38" rx="10" fill="none" stroke="#f59e0b" strokeWidth="5" />
                    <rect x="213" y="30" width="50" height="18" rx="4" fill="#f59e0b" />
                    <text x="238" y="43" fill="#1e293b" fontSize="10" textAnchor="middle" fontWeight="bold">单线钳口</text>
                  </g>
                )}

                {clampedMode === 'DUAL' && (
                  <g>
                    <rect x="175" y="16" width="38" height="88" rx="10" fill="none" stroke="#f59e0b" strokeWidth="5" />
                    <rect x="213" y="51" width="50" height="18" rx="4" fill="#f59e0b" />
                    <text x="238" y="64" fill="#1e293b" fontSize="10" textAnchor="middle" fontWeight="bold">双线卡入</text>
                  </g>
                )}
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={clampedMode === 'SINGLE' ? 'default' : 'outline'}
                onClick={handleClampSingle}
                className="font-bold py-3 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white text-sm"
              >
                1. 钳形表卡入【单根供电线】
              </Button>
              <Button
                variant={clampedMode === 'DUAL' ? 'default' : 'outline'}
                onClick={handleClampDual}
                className="font-bold py-3 cursor-pointer bg-slate-700 hover:bg-slate-800 text-white text-sm"
              >
                2. 钳形表同时卡入【双导线并行】
              </Button>
            </div>

            {clampMeter.educationalNote && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-900 leading-relaxed font-semibold">
                {clampMeter.educationalNote}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Gauge size={18} />
              数字钳形表屏幕显示
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">NON-CONTACT CLAMP</span>
                <span className="font-bold text-amber-300">
                  {clampedMode === 'DUAL' ? 'FLUX CANCELLED' : 'MEASURING'}
                </span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {clampMeter.displayText || '0.00 A'}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>HALL_EFFECT</span>
                <span className="font-bold">DC AMPERES</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="text-amber-300 block mb-1 font-bold">安培环路定律教学精要：</strong>
              钳形表通过内部霍尔传感器感应导线周围的环形磁场。若同时钳入前进与回流双线，两根线产生的反向磁场大小相等方向相反，净磁通量为零，示数归零！因此在实车排故中，必须只钳单根电线！
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Battery Load Testing & Hazardous Recycling */}
      {currentStep === 'BATTERY_DISPOSAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              实车退役 12V 铅酸蓄电池 · 负荷测试与环保归集
            </span>

            <div className="w-full h-56 bg-slate-900 rounded-xl flex items-center justify-around p-4 relative border border-slate-800 shadow-inner">
              {/* Battery */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-26 bg-slate-800 border-2 border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-300 font-bold shadow-md p-2">
                  <Zap size={24} className="text-amber-400 mb-1" />
                  <span className="text-sm font-bold">12V 60Ah</span>
                  <span className="text-xs text-red-400 font-semibold">退役蓄电池</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="text-slate-400 font-bold text-sm flex flex-col items-center gap-1">
                <span>带载复核后</span>
                <span className="text-base text-amber-400">➔</span>
                <span>环保分类</span>
              </div>

              {/* Hazard Recycling Bin */}
              <div
                className={`w-36 h-30 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 p-3 transition-all ${
                  batteryDisposed
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-lg'
                    : 'bg-yellow-950/60 border-yellow-500 text-yellow-300'
                }`}
              >
                <Trash2 size={28} />
                <span className="text-xs font-bold text-center leading-tight">防酸耐腐蚀危废箱</span>
                <span className="text-xs opacity-80 font-medium">{batteryDisposed ? '已合规入箱保存' : '待归集'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleBatteryTest}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 cursor-pointer text-sm"
              >
                1. 带载 100A 放电测试端电压
              </Button>
              <Button
                disabled={!batteryLoadTested || batteryDisposed}
                onClick={handleBatteryRecycle}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 cursor-pointer text-sm"
              >
                2. 确认报废并归集入危废箱
              </Button>
            </div>

            {batteryDisposed && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>废旧蓄电池已安全归入专用防泄漏危废箱，避免酸液重金属污染，完成车间环保闭环。</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Gauge size={18} />
              负荷测试仪读数
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">LOAD TEST (100A)</span>
                <span className="font-bold text-amber-300">{batteryLoadTested ? 'TEST_COMPLETED' : 'STANDBY'}</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {batteryLoadTested ? '9.20 V' : '---'}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold text-red-300">{batteryLoadTested ? 'BELOW 10.5V THRESHOLD' : 'STANDBY'}</span>
                <span className="font-bold text-amber-300">FAIL_REPLACE</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">车间技术标准：</strong>
              蓄电池在 100A 额定大负荷放电 15 秒后，端电压必须稳定保持在 10.5V 以上。本电池实测骤降至 9.2V，证明内部极板已发生严重不可逆硫化失效，禁止继续装车，必须按《汽车维修危险废物管理规程》合规分类回收！
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Parasitic Drain Hunt & Diagnostic Decision */}
      {currentStep === 'TRANSFER_PARALLEL_KCL' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 7 Cols: Fuse Box & Diagnosis Form */}
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                实车停放亏电排查 · 拔保险丝法排查整车休眠暗电流
              </span>
              <span className="text-xs text-amber-600 font-mono font-bold">SLEEP_DRAIN_DIAG</span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">故障情境：</strong>
              车主反映车辆停放 2 天后蓄电池亏电无法点火。拔掉钥匙并等待车辆完全进入休眠，万用表电流挡串联在蓄电池负极搭铁线上，测得整车休眠暗电流高达 <span className="font-bold text-red-600">480mA</span>（行业规范正常标准应小于 <span className="font-bold text-emerald-700">50mA</span>）。请逐个点击拔出保险丝排查漏电支路，定位故障并做出规范的维修决策！
            </div>

            {/* Fuse Box Grid */}
            <div className="grid grid-cols-2 gap-3">
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
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-1.5 text-left ${
                      isPulled
                        ? 'border-red-500 bg-red-50/70 text-red-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{fuse.name}</span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isPulled ? 'bg-red-200 text-red-900' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isPulled ? '已拔出断开' : '在位插接'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {isPulled ? `回路已断开（消除约 ${fuse.drain}mA 负荷）` : '点击拔出此保险丝观察暗电流变化'}
                    </span>
                  </button>
                );
              })}
            </div>

            {pulledFuses.has('F2') && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-sm text-emerald-900 font-semibold flex items-center gap-2.5">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <span>拔下 F2（后装行车记录仪）后，整车休眠电流从 480mA 骤降至 60mA，成功锁定漏电支路！请在下方完成工单维修决策：</span>
              </div>
            )}

            {/* Diagnostic Decision Form (Visible once F2 is pulled) */}
            {pulledFuses.has('F2') && (
              <div className="mt-1 p-4 rounded-xl border border-slate-300 bg-slate-50 flex flex-col gap-3.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <strong className="text-sm font-bold text-slate-800">车间维修工单决策 · 漏电故障排除措施</strong>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">
                  经查实，该行车记录仪为车主自行在点烟器后方破线加装。作为车间主修技师，你为该车制定的正确维修整改方案是：
                </p>

                {/* Neutral radio options without spoilers */}
                <div className="flex flex-col gap-2.5">
                  {DIAG_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-sm ${
                        diagDecision === opt.id
                          ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-medium'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="diag_opt"
                        value={opt.id}
                        checked={diagDecision === opt.id}
                        onChange={() => {
                          sounds.click();
                          setDiagDecision(opt.id);
                          setDiagSubmitted(false);
                          setDiagFeedback(null);
                        }}
                        className="mt-1 cursor-pointer"
                      />
                      <span className="flex-1 leading-relaxed">{opt.text}</span>
                    </label>
                  ))}
                </div>

                <Button
                  disabled={!diagDecision}
                  onClick={handleDiagSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 cursor-pointer text-sm shadow-sm"
                >
                  提交维修诊断工单
                </Button>

                {diagFeedback && (
                  <div
                    className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                      diagDecision === 'OPT_A'
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                        : 'bg-red-50 border border-red-300 text-red-900'
                    }`}
                  >
                    {diagDecision === 'OPT_A' ? (
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    )}
                    <span>{diagFeedback}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right 5 Cols: Bench DMM Ammeter */}
          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Gauge size={18} />
              电瓶负极串联暗电流示数
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">BATTERY GND SERIES</span>
                <span className={`font-bold ${pulledFuses.has('F2') ? 'text-emerald-300' : 'text-red-400 animate-pulse'}`}>
                  {pulledFuses.has('F2') ? 'NORMAL_SLEEP' : 'EXCESSIVE_DRAIN'}
                </span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {dmmResult.displayText}
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>THRESHOLD: &lt;50mA</span>
                <span className="font-bold">{pulledFuses.has('F2') ? 'QUALIFIED' : 'DRAIN_ALERT'}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">排故要领与诊断决策：</strong>
              实车暗电流检测必须将万用表串联在电瓶负极搭铁回路。逐个拔除保险丝时，若拔出某保险丝后电流大幅下跌至 50mA 标准线附近，即可确诊该支路存在漏电。加装行车记录仪误接常火线（BATT）未休眠是汽车常见故障，标准工艺应重新布线改接至点火开关 ACC 受控支路！
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
