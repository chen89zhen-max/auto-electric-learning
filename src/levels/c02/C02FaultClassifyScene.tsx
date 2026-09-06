'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  RotateCw,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type DiagnosticFaultType } from '@/src/circuit/solver/DCAnalysisUtils';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { type C02Step } from './c02Training';

interface C02FaultClassifySceneProps {
  currentStep: C02Step;
  onStepComplete: (step: C02Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

interface BlindCaseC02 {
  id: string;
  vehicleName: string;
  description: string;
  actualFaultType: DiagnosticFaultType;
  faultLocationText: string;
  faultExplanation: string;
  nodeVoltages: {
    fuseIn: number;
    fuseOut: number;
    switchIn: number;
    switchOut: number;
    lampPos: number;
    lampNeg: number;
  };
  resistanceToGround: number; // Ω
  fuseState: 'INTACT' | 'BLOWN';
}

const C02_BLIND_CASES: BlindCaseC02[] = [
  {
    id: 'CASE_OPEN',
    vehicleName: '盲测案例 1 (试验车 #108)',
    description: '前照灯完全不亮，保险丝完好。需排查回路是否存在断路。',
    actualFaultType: 'OPEN_CIRCUIT',
    faultLocationText: '开关输出端插头内部退针断路',
    faultExplanation: '试灯在开关前亮起、开关后熄灭；万用表跨接在开关两端测得 12.00V 全部电源电压，确诊开路！',
    nodeVoltages: {
      fuseIn: 12.0,
      fuseOut: 12.0,
      switchIn: 12.0,
      switchOut: 0.0,
      lampPos: 0.0,
      lampNeg: 0.0,
    },
    resistanceToGround: Infinity,
    fuseState: 'INTACT',
  },
  {
    id: 'CASE_SHORT',
    vehicleName: '盲测案例 2 (试验车 #205)',
    description: '闭合开关瞬间冒出电弧，10A 主保险丝当场熔断发黑。',
    actualFaultType: 'SHORT_TO_GROUND',
    faultLocationText: '车灯供电线在翼子板钣金毛刺处绝缘层磨破对地死短路',
    faultExplanation: '断电后使用万用表电阻挡测得供电线对地电阻仅 0.05Ω（直接短路到车身），大电流瞬间烧毁保险丝！',
    nodeVoltages: {
      fuseIn: 12.0,
      fuseOut: 0.0,
      switchIn: 0.0,
      switchOut: 0.0,
      lampPos: 0.0,
      lampNeg: 0.0,
    },
    resistanceToGround: 0.05,
    fuseState: 'BLOWN',
  },
  {
    id: 'CASE_HIGH_R',
    vehicleName: '盲测案例 3 (试验车 #309)',
    description: '前照灯完全不亮，保险丝完好，但拔下插头测得 12V 虚假电位。',
    actualFaultType: 'HIGH_RESISTANCE',
    faultLocationText: '前照灯接地线束螺栓严重生锈氧化形成 50Ω 高阻虚接',
    faultExplanation: '带载测试时车灯仅分得 1.28V 极低电压无法点亮，而搭铁点承受 10.72V 巨大电压降，确诊严重虚接！',
    nodeVoltages: {
      fuseIn: 12.0,
      fuseOut: 12.0,
      switchIn: 12.0,
      switchOut: 12.0,
      lampPos: 12.0,
      lampNeg: 10.72,
    },
    resistanceToGround: 56.0,
    fuseState: 'INTACT',
  },
];

export function C02FaultClassifyScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
}: C02FaultClassifySceneProps) {
  // Selected diagnostic tool: 'TEST_LIGHT' or 'MULTIMETER'
  const [activeTool, setActiveTool] = useState<'TEST_LIGHT' | 'MULTIMETER'>('TEST_LIGHT');

  // Multimeter knob: 'OFF' | 'DCV_20' | 'OHM'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'DCV_20' | 'OHM'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Probe touch node: 'FUSE_IN' | 'FUSE_OUT' | 'SWITCH_IN' | 'SWITCH_OUT' | 'LAMP_POS' | 'LAMP_NEG'
  const [touchedNode, setTouchedNode] = useState<string>('SWITCH_IN');

  // Stage 1 Decisions
  const [s1Decision, setS1Decision] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Stage 2 Open Circuit Decisions
  const [s2Decision, setS2Decision] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Stage 3 Short Circuit Decisions
  const [s3Decision, setS3Decision] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Stage 4 Blind Cases
  const [blindIndex, setBlindIndex] = useState<number>(0);
  const [s4Decision, setS4Decision] = useState<string | null>(null);
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Stage 5 Repair
  const [repairInsulated, setRepairInsulated] = useState<boolean>(false);
  const [repairCorrugated, setRepairCorrugated] = useState<boolean>(false);
  const [repairFuseReplaced, setRepairFuseReplaced] = useState<boolean>(false);
  const [retestDone, setRetestDone] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  const activeBlind = C02_BLIND_CASES[blindIndex];

  // Knob switcher
  const handleTurnKnob = (knob: 'OFF' | 'DCV_20' | 'OHM') => {
    sounds.click();
    setMeterKnob(knob);
    setMeterWarning(null);
  };

  const requireMeterPowered = () => {
    if (meterKnob === 'OFF') {
      sounds.warningBuzz();
      setMeterWarning('万用表尚未开机！请先将功能旋钮旋转至正确挡位！');
      return false;
    }
    return true;
  };

  // Node voltage calculations for stages 1, 2, 3
  const getSimulatedVoltages = () => {
    if (currentStep === 'SYMPTOM_AND_TOOLS') {
      // General open circuit presentation
      return {
        fuseIn: 12.0,
        fuseOut: 12.0,
        switchIn: 12.0,
        switchOut: 0.0,
        lampPos: 0.0,
        lampNeg: 0.0,
      };
    }
    if (currentStep === 'OPEN_CIRCUIT_ISOLATION') {
      // Open at switch
      return {
        fuseIn: 12.0,
        fuseOut: 12.0,
        switchIn: 12.0,
        switchOut: 0.0,
        lampPos: 0.0,
        lampNeg: 0.0,
      };
    }
    if (currentStep === 'SHORT_CIRCUIT_FUSE_BLOWN') {
      // Blown fuse
      return {
        fuseIn: 12.0,
        fuseOut: 0.0,
        switchIn: 0.0,
        switchOut: 0.0,
        lampPos: 0.0,
        lampNeg: 0.0,
      };
    }
    if (currentStep === 'BLIND_THREE_FAULT_ISOLATION') {
      return activeBlind.nodeVoltages;
    }
    // Stage 5 post repair
    if (retestDone) {
      return {
        fuseIn: 12.0,
        fuseOut: 12.0,
        switchIn: 12.0,
        switchOut: 12.0,
        lampPos: 12.0,
        lampNeg: 0.0,
      };
    }
    return {
      fuseIn: 12.0,
      fuseOut: 0.0,
      switchIn: 0.0,
      switchOut: 0.0,
      lampPos: 0.0,
      lampNeg: 0.0,
    };
  };

  const currentVoltages = getSimulatedVoltages();
  const touchedVoltage = currentVoltages[touchedNode as keyof typeof currentVoltages] ?? 0;

  // Test light illumination
  const testLightGlow = touchedVoltage >= 9.0 ? 'BRIGHT' : touchedVoltage >= 2.0 ? 'DIM' : 'DARK';

  // DMM Readout
  const getDmmReadout = () => {
    if (meterKnob === 'OFF') {
      return { value: '----', unit: 'OFF', color: 'text-slate-400' };
    }
    if (meterKnob === 'OHM') {
      if (currentStep === 'SHORT_CIRCUIT_FUSE_BLOWN') {
        return { value: '0.05', unit: 'Ω (供电线对地短路！)', color: 'text-rose-400' };
      }
      if (currentStep === 'BLIND_THREE_FAULT_ISOLATION') {
        if (activeBlind.resistanceToGround < 1.0) {
          return { value: activeBlind.resistanceToGround.toFixed(2), unit: 'Ω (对地短路！)', color: 'text-rose-400' };
        }
        if (activeBlind.resistanceToGround > 1000) {
          return { value: '0.L', unit: 'MΩ (绝缘良好/开路)', color: 'text-emerald-400' };
        }
        return { value: activeBlind.resistanceToGround.toFixed(1), unit: 'Ω (对地回路电阻)', color: 'text-amber-400' };
      }
      return { value: '0.L', unit: 'MΩ (开路/无短路)', color: 'text-emerald-400' };
    }

    // DCV_20
    if (currentStep === 'OPEN_CIRCUIT_ISOLATION') {
      if (touchedNode === 'SWITCH_OUT') {
        return { value: '12.00', unit: 'V (开关两端跨接吃全压)', color: 'text-rose-400' };
      }
    }
    return {
      value: touchedVoltage.toFixed(2),
      unit: `V DC (${touchedNode})`,
      color: touchedVoltage > 9.0 ? 'text-emerald-400' : touchedVoltage > 1.0 ? 'text-amber-400' : 'text-slate-400',
    };
  };

  const dmmDisplay = getDmmReadout();

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-[580px] p-2 text-slate-800">
      {/* 5-Stage Step Navigation Header */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-100/90 rounded-xl border border-slate-200 text-xs font-bold">
        {[
          { key: 'SYMPTOM_AND_TOOLS', label: '1. 现象与工具认知' },
          { key: 'OPEN_CIRCUIT_ISOLATION', label: '2. 典型一：回路断路排查' },
          { key: 'SHORT_CIRCUIT_FUSE_BLOWN', label: '3. 典型二：短路烧保险排查' },
          { key: 'BLIND_THREE_FAULT_ISOLATION', label: '4. 独立实车盲测' },
          { key: 'FAULT_REPAIR_AND_PREVENTION', label: '5. 规范修复与防磨验收' },
        ].map((item, idx) => {
          const isActive = currentStep === item.key;
          return (
            <div
              key={item.key}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-amber-600 text-white shadow-sm font-black'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              <span>{item.label}</span>
              {idx < 4 && <span className="text-slate-300 ml-1">›</span>}
            </div>
          );
        })}
      </div>

      {/* Main Workspace: Left Circuit SVG + Right Instrument Display */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Circuit Visual Canvas */}
        <div className="xl:col-span-8 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <strong className="text-slate-100 font-bold text-sm">
                汽车电气典型故障排查台 (断路 / 短路 / 高阻虚接)
              </strong>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">当前测试工具：</span>
              <button
                type="button"
                onClick={() => {
                  sounds.click();
                  setActiveTool('TEST_LIGHT');
                }}
                className={`px-2.5 py-1 rounded cursor-pointer font-bold ${
                  activeTool === 'TEST_LIGHT' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                汽车试灯 (定性)
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.click();
                  setActiveTool('MULTIMETER');
                  requireMeterPowered();
                }}
                className={`px-2.5 py-1 rounded cursor-pointer font-bold ${
                  activeTool === 'MULTIMETER' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                数字万用表 (定量)
              </button>
            </div>
          </div>

          {/* SVG Visual Canvas */}
          <div className="p-3 flex items-center justify-center bg-slate-950/40">
            <svg
              viewBox="0 0 540 180"
              className="w-full h-60 lg:h-64 select-none drop-shadow-md"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Circuit Grid */}
              <defs>
                <pattern id="c02Grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.4" />
                </pattern>
                <filter id="c02Glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <rect width="540" height="180" fill="url(#c02Grid)" />

              {/* Red Positive Supply Wires (6px) */}
              <path d="M 50 60 L 50 40 L 120 40" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
              <path d="M 170 40 L 220 40" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
              <path d="M 280 40 L 370 40 L 370 70" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />

              {/* Blue Ground Wires */}
              <path d="M 410 70 L 410 140 L 50 140 L 50 110" fill="none" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />

              {/* Battery */}
              <g transform="translate(25, 60)">
                <rect x="0" y="0" width="50" height="50" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                <text x="25" y="28" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">12V 蓄电池</text>
                <circle cx="25" cy="0" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="25" cy="50" r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
              </g>

              {/* 10A Fuse Module */}
              <g transform="translate(120, 25)">
                <rect
                  x="0"
                  y="0"
                  width="50"
                  height="30"
                  rx="4"
                  fill="#334155"
                  stroke={
                    currentStep === 'SHORT_CIRCUIT_FUSE_BLOWN' ||
                    (currentStep === 'BLIND_THREE_FAULT_ISOLATION' && activeBlind.fuseState === 'BLOWN')
                      ? '#ef4444'
                      : '#94a3b8'
                  }
                  strokeWidth="2"
                />
                <line
                  x1="5"
                  y1="15"
                  x2="45"
                  y2="15"
                  stroke={
                    currentStep === 'SHORT_CIRCUIT_FUSE_BLOWN' ||
                    (currentStep === 'BLIND_THREE_FAULT_ISOLATION' && activeBlind.fuseState === 'BLOWN')
                      ? '#475569'
                      : '#fbbf24'
                  }
                  strokeWidth="3"
                  strokeDasharray={
                    currentStep === 'SHORT_CIRCUIT_FUSE_BLOWN' ||
                    (currentStep === 'BLIND_THREE_FAULT_ISOLATION' && activeBlind.fuseState === 'BLOWN')
                      ? '4,4'
                      : 'none'
                  }
                />
                <text x="25" y="20" fill="#f1f5f9" fontSize="10" fontWeight="bold" textAnchor="middle">
                  {currentStep === 'SHORT_CIRCUIT_FUSE_BLOWN' ||
                  (currentStep === 'BLIND_THREE_FAULT_ISOLATION' && activeBlind.fuseState === 'BLOWN')
                    ? '10A (已熔断)'
                    : '10A 熔断器'}
                </text>
              </g>

              {/* Switch / Break Point */}
              <g transform="translate(220, 20)">
                <rect x="0" y="0" width="60" height="40" rx="6" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
                <text x="30" y="18" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">控制开关</text>
                {/* Switch lever */}
                <line
                  x1="15"
                  y1="28"
                  x2={
                    currentStep === 'OPEN_CIRCUIT_ISOLATION' ||
                    (currentStep === 'BLIND_THREE_FAULT_ISOLATION' && activeBlind.actualFaultType === 'OPEN_CIRCUIT')
                      ? '35'
                      : '45'
                  }
                  y2={
                    currentStep === 'OPEN_CIRCUIT_ISOLATION' ||
                    (currentStep === 'BLIND_THREE_FAULT_ISOLATION' && activeBlind.actualFaultType === 'OPEN_CIRCUIT')
                      ? '18'
                      : '28'
                  }
                  stroke={
                    currentStep === 'OPEN_CIRCUIT_ISOLATION' ||
                    (currentStep === 'BLIND_THREE_FAULT_ISOLATION' && activeBlind.actualFaultType === 'OPEN_CIRCUIT')
                      ? '#f43f5e'
                      : '#10b981'
                  }
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="15" cy="28" r="3" fill="#cbd5e1" />
                <circle cx="45" cy="28" r="3" fill="#cbd5e1" />
              </g>

              {/* Lamp Load */}
              <g transform="translate(360, 45)">
                {/* Glow ring */}
                <circle
                  cx="30"
                  cy="35"
                  r={retestDone ? 36 : 0}
                  fill="#fef08a"
                  opacity={retestDone ? '0.6' : '0'}
                  filter="url(#c02Glow)"
                />
                <circle
                  cx="30"
                  cy="35"
                  r="24"
                  fill={retestDone ? '#ffffff' : '#475569'}
                  stroke="#cbd5e1"
                  strokeWidth="2.5"
                />
                <path
                  d="M 22 45 L 26 28 L 30 40 L 34 28 L 38 45"
                  fill="none"
                  stroke={retestDone ? '#eab308' : '#64748b'}
                  strokeWidth="2.5"
                />
                <text x="30" y="72" fill="#e2e8f0" fontSize="11" fontWeight="bold" textAnchor="middle">
                  {retestDone ? '24W 工作灯 (点亮正常)' : '24W 工作灯 (不亮)'}
                </text>
              </g>

              {/* Ground Bolt */}
              <g transform="translate(390, 130)">
                <circle cx="20" cy="10" r="8" fill="#334155" stroke="#38bdf8" strokeWidth="2" />
                <path d="M 12 24 L 28 24 M 15 28 L 25 28 M 18 32 L 22 32" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <text x="20" y="-4" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">车身搭铁</text>
              </g>

              {/* Probe / Touch point indication */}
              {touchedNode === 'FUSE_IN' && <circle cx="120" cy="40" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />}
              {touchedNode === 'FUSE_OUT' && <circle cx="170" cy="40" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />}
              {touchedNode === 'SWITCH_IN' && <circle cx="220" cy="40" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />}
              {touchedNode === 'SWITCH_OUT' && <circle cx="280" cy="40" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />}
              {touchedNode === 'LAMP_POS' && <circle cx="370" cy="70" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />}
              {touchedNode === 'LAMP_NEG' && <circle cx="410" cy="70" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />}
            </svg>
          </div>

          {/* Quick Node Selector Toolbar */}
          <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">探针试触测点：</span>
              {[
                { key: 'FUSE_IN', label: '1. 保险丝前' },
                { key: 'FUSE_OUT', label: '2. 保险丝后' },
                { key: 'SWITCH_IN', label: '3. 开关输入端' },
                { key: 'SWITCH_OUT', label: '4. 开关输出端' },
                { key: 'LAMP_POS', label: '5. 灯泡正极' },
                { key: 'LAMP_NEG', label: '6. 灯泡负极' },
              ].map((node) => {
                const isSelected = touchedNode === node.key;
                return (
                  <button
                    key={node.key}
                    type="button"
                    onClick={() => {
                      sounds.click();
                      setTouchedNode(node.key);
                    }}
                    className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                      isSelected ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {node.label}
                  </button>
                );
              })}
            </div>

            {currentStep === 'BLIND_THREE_FAULT_ISOLATION' && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 text-amber-400 hover:bg-slate-800 cursor-pointer"
                onClick={() => {
                  sounds.click();
                  setBlindIndex((prev) => (prev + 1) % C02_BLIND_CASES.length);
                  setS4Decision(null);
                  setS4Submitted(false);
                }}
              >
                <RotateCw size={13} className="mr-1" />
                🎲 切换盲盒案例
              </Button>
            )}
          </div>
        </div>

        {/* Right Instrument Panel (Test Light or DMM) */}
        <div className="xl:col-span-4 flex flex-col justify-between bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xl">
          {activeTool === 'TEST_LIGHT' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap size={20} className="text-amber-400" />
                  <span className="text-sm font-black tracking-wider text-slate-100">
                    汽车专用电气试灯 (12V)
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-mono">
                  定性寻电
                </span>
              </div>

              {/* Test Light Visualizer Card */}
              <div className="h-32 bg-slate-950 rounded-xl p-3 border-2 border-slate-900 flex flex-col items-center justify-center gap-2 shadow-inner">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                    testLightGlow === 'BRIGHT'
                      ? 'bg-amber-400 border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.9)] animate-pulse'
                      : testLightGlow === 'DIM'
                      ? 'bg-amber-700/60 border-amber-600'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <Zap
                    size={26}
                    className={
                      testLightGlow === 'BRIGHT'
                        ? 'text-slate-950'
                        : testLightGlow === 'DIM'
                        ? 'text-amber-300'
                        : 'text-slate-600'
                    }
                  />
                </div>
                <span className="text-xs font-bold text-slate-300">
                  {testLightGlow === 'BRIGHT'
                    ? '试灯耀眼发光 (供电正常 ≥9V)'
                    : testLightGlow === 'DIM'
                    ? '试灯微弱发红 (存在严重虚接/分压)'
                    : '试灯熄灭 (该点失电 / 断路 0V)'}
                </span>
              </div>

              <div className="mt-3 p-3 bg-slate-900/90 rounded-xl border border-slate-700 text-xs text-slate-400 space-y-1">
                <p><strong>搭铁夹位置：</strong> 蓄电池负极柱 / 车身搭铁</p>
                <p><strong>探针接触点：</strong> {touchedNode}</p>
                <p className="text-amber-300">
                  提示：试灯只能粗略判断有无电源电压，无法测出具体压降与毫欧电阻。
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Gauge size={20} className="text-amber-400" />
                  <span className="text-sm font-black tracking-wider text-slate-100">
                    数字万用表 (DMM)
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                  定量精测
                </span>
              </div>

              {/* Large LCD (h-32) */}
              <div className="relative h-32 bg-slate-950 rounded-xl p-3 border-2 border-slate-900 flex flex-col justify-between shadow-inner">
                <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                  <span>AUTO RANGE</span>
                  <span>{meterKnob === 'OFF' ? 'POWER OFF' : meterKnob === 'OHM' ? 'RESISTANCE' : 'DC VOLTAGE'}</span>
                </div>

                <div className="flex items-baseline justify-end gap-2 pr-2">
                  <span className={`text-4xl lg:text-5xl font-black font-mono tracking-wider ${dmmDisplay.color}`}>
                    {dmmDisplay.value}
                  </span>
                  <span className="text-lg font-bold text-slate-400">
                    {meterKnob === 'OHM' ? 'Ω' : 'V'}
                  </span>
                </div>

                <div className="text-right text-xs font-mono text-slate-400 truncate">
                  {dmmDisplay.unit}
                </div>
              </div>

              {meterWarning && (
                <div className="mt-2 text-xs font-bold text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-800 flex items-center gap-1.5 animate-bounce">
                  <AlertTriangle size={14} />
                  <span>{meterWarning}</span>
                </div>
              )}
            </div>
          )}

          {/* Instrument Controls */}
          <div className="mt-3 pt-3 border-t border-slate-700 flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400">万用表功能旋钮挡位：</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: 'OFF', label: '关机 (OFF)' },
                { key: 'DCV_20', label: '电压 DC 20V' },
                { key: 'OHM', label: '电阻 Ω' },
              ].map((knobItem) => {
                const isSelected = meterKnob === knobItem.key;
                return (
                  <button
                    key={knobItem.key}
                    type="button"
                    onClick={() => {
                      handleTurnKnob(knobItem.key as typeof meterKnob);
                      setActiveTool('MULTIMETER');
                    }}
                    className={`px-2 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-center ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {knobItem.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Interactive Decision Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        {/* Stage 1 Work Order */}
        {currentStep === 'SYMPTOM_AND_TOOLS' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  实训工单 · 现象与工具认知
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 1：车灯闭合开关后完全不亮，关于试灯与万用表的适用特点，何者正确？
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {[
                { key: 'A', text: '选项 A：试灯直观快速逐点查通断，万用表精测压降与短路阻抗，二者互补不可互相替代' },
                { key: 'B', text: '选项 B：只要有试灯就完全不需要万用表' },
                { key: 'C', text: '选项 C：灯不亮说明灯丝必然烧断，直接换新即可' },
                { key: 'D', text: '选项 D：试灯可以直接替代保险丝测试短路' },
              ].map((opt) => {
                const isSelected = s1Decision === opt.key;
                const isCorrect = opt.key === 'A';
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (!s1Submitted) {
                        sounds.click();
                        setS1Decision(opt.key);
                      }
                    }}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      s1Submitted
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : isSelected
                          ? 'border-rose-400 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                        : isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {s1Submitted ? '✓ 工具认知完成。进入步骤 2 排查回路断路。' : '选择判断结论后提交工单'}
              </span>
              {!s1Submitted ? (
                <Button
                  disabled={!s1Decision}
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    if (!s1Decision) return;
                    if (s1Decision === 'A') {
                      sounds.success();
                    } else {
                      sounds.warningBuzz();
                    }
                    setS1Submitted(true);
                    onStepComplete('SYMPTOM_AND_TOOLS', {
                      decision: s1Decision,
                      passed: s1Decision === 'A',
                    });
                  }}
                >
                  <CheckCircle2 size={16} className="mr-1" />
                  提交工具认知工单
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={onAdvanceStep}
                >
                  进入步骤 2：断路故障排查 <ArrowRight size={16} className="ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stage 2 Work Order */}
        {currentStep === 'OPEN_CIRCUIT_ISOLATION' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  断路排查 · 跨接测压
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 2：试灯在开关前亮、开关后灭，万用表跨接在开关两端测得 12.00V，说明什么？
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {[
                { key: 'SWITCH_OPEN', text: '结论 A：开关内部触点断开/退针（断路），开路断点两侧承受整车 12V 电动势' },
                { key: 'LAMP_SHORT', text: '结论 B：车灯灯丝发生了对地死短路' },
                { key: 'BATTERY_FAIL', text: '结论 C：蓄电池内部发生极板断裂' },
                { key: 'GROUND_OPEN', text: '结论 D：搭铁回路完全正常，故障在电源桩头' },
              ].map((opt) => {
                const isSelected = s2Decision === opt.key;
                const isCorrect = opt.key === 'SWITCH_OPEN';
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (!s2Submitted) {
                        sounds.click();
                        setS2Decision(opt.key);
                      }
                    }}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      s2Submitted
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : isSelected
                          ? 'border-rose-400 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                        : isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {s2Submitted ? '✓ 断路证据确凿（跨接吃全压）。进入步骤 3 排查短路。' : '根据测量证据提交结论'}
              </span>
              {!s2Submitted ? (
                <Button
                  disabled={!s2Decision}
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    if (!s2Decision) return;
                    if (s2Decision === 'SWITCH_OPEN') {
                      sounds.success();
                    } else {
                      sounds.warningBuzz();
                    }
                    setS2Submitted(true);
                    onStepComplete('OPEN_CIRCUIT_ISOLATION', {
                      decision: s2Decision,
                      passed: s2Decision === 'SWITCH_OPEN',
                    });
                  }}
                >
                  <CheckCircle2 size={16} className="mr-1" />
                  提交断路诊断工单
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={onAdvanceStep}
                >
                  进入步骤 3：短路烧保险排查 <ArrowRight size={16} className="ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stage 3 Work Order */}
        {currentStep === 'SHORT_CIRCUIT_FUSE_BLOWN' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  短路排查 · 安全红线
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 3：保险丝装上就烧断，万用表电阻挡测供电线对地仅 0.05Ω，最严厉的违规禁忌是？
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {[
                { key: 'BLIND_BIG_FUSE', text: '禁忌 A：严禁私自换装 30A 大保险丝或铜丝短接，这会直接引燃线束导致自燃！' },
                { key: 'DISCONNECT_BATTERY', text: '禁忌 B：严禁在排查前关闭蓄电池电源' },
                { key: 'USE_OHM_METER', text: '禁忌 C：严禁在断电状态下使用电阻挡测阻抗' },
                { key: 'CHECK_HARNESS', text: '禁忌 D：严禁顺着线束查找绝缘皮破损处' },
              ].map((opt) => {
                const isSelected = s3Decision === opt.key;
                const isCorrect = opt.key === 'BLIND_BIG_FUSE';
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (!s3Submitted) {
                        sounds.click();
                        setS3Decision(opt.key);
                      }
                    }}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      s3Submitted
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : isSelected
                          ? 'border-rose-400 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                        : isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {s3Submitted ? '✓ 短路安全红线确立。进入步骤 4 独立实车盲测。' : '根据安全规范选择后提交工单'}
              </span>
              {!s3Submitted ? (
                <Button
                  disabled={!s3Decision}
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    if (!s3Decision) return;
                    if (s3Decision === 'BLIND_BIG_FUSE') {
                      sounds.success();
                    } else {
                      sounds.warningBuzz();
                    }
                    setS3Submitted(true);
                    onStepComplete('SHORT_CIRCUIT_FUSE_BLOWN', {
                      decision: s3Decision,
                      passed: s3Decision === 'BLIND_BIG_FUSE',
                    });
                  }}
                >
                  <CheckCircle2 size={16} className="mr-1" />
                  提交短路诊断工单
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={onAdvanceStep}
                >
                  进入步骤 4：独立实车盲测 <ArrowRight size={16} className="ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stage 4 Work Order */}
        {currentStep === 'BLIND_THREE_FAULT_ISOLATION' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  独立实车盲测 · 三类典型故障定位
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 4：当前排查对象【{activeBlind.vehicleName}】，自主测验并判定故障本质
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              {[
                { key: 'OPEN_CIRCUIT', text: '故障 A：回路断路（导线断脱/开关开路，开路点吃全压）' },
                { key: 'SHORT_TO_GROUND', text: '故障 B：供电线对地短路（蹭破搭铁，保险丝反复烧毁）' },
                { key: 'HIGH_RESISTANCE', text: '故障 C：接触不良高阻虚接（氧化锈蚀吃掉电压，灯光极暗）' },
              ].map((opt) => {
                const isSelected = s4Decision === opt.key;
                const isCorrect = opt.key === activeBlind.actualFaultType;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      if (!s4Submitted) {
                        sounds.click();
                        setS4Decision(opt.key);
                      }
                    }}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      s4Submitted
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : isSelected
                          ? 'border-rose-400 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                        : isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {s4Submitted ? `✓ 盲测定位正确！${activeBlind.faultExplanation}` : '使用试灯与万用表打表后选定故障本质'}
              </span>
              {!s4Submitted ? (
                <Button
                  disabled={!s4Decision}
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    if (!s4Decision) return;
                    const passed = s4Decision === activeBlind.actualFaultType;
                    if (passed) {
                      sounds.success();
                    } else {
                      sounds.warningBuzz();
                    }
                    setS4Submitted(true);
                    onStepComplete('BLIND_THREE_FAULT_ISOLATION', {
                      caseId: activeBlind.id,
                      decision: s4Decision,
                      correctType: activeBlind.actualFaultType,
                      passed,
                    });
                  }}
                >
                  <CheckCircle2 size={16} className="mr-1" />
                  提交独立盲测结论
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  onClick={onAdvanceStep}
                >
                  进入步骤 5：修复整改与交车 <ArrowRight size={16} className="ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Stage 5 Work Order */}
        {currentStep === 'FAULT_REPAIR_AND_PREVENTION' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  实训工单 · 规范修复工艺与防磨防护
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  步骤 5：执行线束焊接绝缘、加装波纹管防磨、换装 10A 原厂保险并通电复测
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <Button
                disabled={repairInsulated}
                variant={repairInsulated ? 'default' : 'outline'}
                className={repairInsulated ? 'bg-emerald-700 text-white' : 'border-amber-500 text-amber-900 cursor-pointer'}
                onClick={() => {
                  sounds.click();
                  setRepairInsulated(true);
                }}
              >
                1. 剥线焊接+带胶热缩管绝缘 {repairInsulated && '✓'}
              </Button>
              <Button
                disabled={!repairInsulated || repairCorrugated}
                variant={repairCorrugated ? 'default' : 'outline'}
                className={repairCorrugated ? 'bg-emerald-700 text-white' : 'border-amber-500 text-amber-900 cursor-pointer'}
                onClick={() => {
                  sounds.click();
                  setRepairCorrugated(true);
                }}
              >
                2. 加装汽车阻燃耐磨波纹管 {repairCorrugated && '✓'}
              </Button>
              <Button
                disabled={!repairCorrugated || repairFuseReplaced}
                variant={repairFuseReplaced ? 'default' : 'outline'}
                className={repairFuseReplaced ? 'bg-emerald-700 text-white' : 'border-amber-500 text-amber-900 cursor-pointer'}
                onClick={() => {
                  sounds.click();
                  setRepairFuseReplaced(true);
                }}
              >
                3. 换装原厂规格 10A 保险丝 {repairFuseReplaced && '✓'}
              </Button>
            </div>

            {repairInsulated && repairCorrugated && repairFuseReplaced && !retestDone && (
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-sm font-bold text-amber-900">
                  工艺实施完毕！闭合前照灯电源开关，复测通电发光与工作电流。
                </span>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  onClick={() => {
                    sounds.zap();
                    setRetestDone(true);
                  }}
                >
                  <Sparkles size={16} className="mr-1" />
                  通电闭环复验
                </Button>
              </div>
            )}

            {retestDone && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-sm flex flex-col gap-2">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span>竣工检验单 (合格准予出厂)：</span>
                  <span className="text-xs bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">验收合格</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-700">
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    工作电压：<strong className="text-emerald-700 text-sm">12.00 V</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    工作电流：<strong className="text-emerald-700 text-sm">2.00 A</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    工作功率：<strong className="text-emerald-700 text-sm">24.0 W</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    对地电阻：<strong className="text-emerald-700 text-sm">&gt; 10 MΩ</strong> (绝缘正常)
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {s5Submitted
                  ? '✓ 《电气系统故障修复验收合格单》已签署，整车合格交付！'
                  : '三步工艺修复并通电复验合格后交付'}
              </span>
              <Button
                disabled={!retestDone || s5Submitted}
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                onClick={() => {
                  sounds.success();
                  setS5Submitted(true);
                  onStepComplete('FAULT_REPAIR_AND_PREVENTION', {
                    insulated: repairInsulated,
                    corrugated: repairCorrugated,
                    fuseReplaced: repairFuseReplaced,
                    passed: true,
                  });
                  onAdvanceStep();
                }}
              >
                <Wrench size={16} className="mr-1" />
                签署验收单并完成交车
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
