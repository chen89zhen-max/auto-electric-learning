'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { type D01Step } from './d01Training';
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult, TrainingStageId } from '@/src/assessment/assessmentTypes';
import { evaluateMeterGuard } from '@/src/game/instruments/meterGuard';

interface D01RelayControlSceneProps {
  currentStep: D01Step;
  onStepComplete: (step: D01Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onComplete?: (result: LevelAssessmentResult) => void;
  hintRequested?: boolean;
}

interface RelayBlindCase {
  id: string;
  vehicleName: string;
  symptom: string;
  faultType: 'COIL_OPEN' | 'CONTACT_WELDED' | 'CONTACT_OXIDIZED';
  faultName: string;
  coilResistance: number; // 80 normal, 999999 (OL)
  contactResistance: number; // 999999 (OL open), 0.02 (welded), 2.5 (oxidized)
  contactDrop: number; // loaded voltage drop
  explanation: string;
}

const BLIND_CASES: RelayBlindCase[] = [
  {
    id: 'CASE_COIL_OPEN',
    vehicleName: '越野巡查车 #101 (加装顶灯故障)',
    symptom: '按下顶灯开关，继电器无吸合声，大灯完全不亮。',
    faultType: 'COIL_OPEN',
    faultName: '继电器电磁线圈内部断路烧断',
    coilResistance: 999999, // OL
    contactResistance: 999999, // OL
    contactDrop: 0,
    explanation: '85-86 线圈开路 (阻值无穷大 OL)，无法产生磁场吸合衔铁。',
  },
  {
    id: 'CASE_CONTACT_WELDED',
    vehicleName: '物流运输车 #204 (工作灯常亮不灭)',
    symptom: '断开仪表台开关甚至拔出点火钥匙，前工作大灯依然一直常亮，蓄电池严重亏电。',
    faultType: 'CONTACT_WELDED',
    faultName: '继电器触点电弧烧结粘连常通',
    coilResistance: 80,
    contactResistance: 0.02, // shorted closed
    contactDrop: 0.05,
    explanation: '30 与 87 常开触点在重载电弧下粘连熔焊，即使线圈失电依然直通供电！',
  },
  {
    id: 'CASE_CONTACT_OXIDIZED',
    vehicleName: '环卫作业车 #308 (大灯暗淡黄光)',
    symptom: '按下开关听到吸合声，但工作灯发光昏暗微弱，带载发热严重。',
    faultType: 'CONTACT_OXIDIZED',
    faultName: '继电器动静触点表面严重电弧烧蚀碳化',
    coilResistance: 80,
    contactResistance: 2.5, // high resistance
    contactDrop: 3.8, // 3.8V drop!
    explanation: '触点两端带载电压降高达 3.8V，接触电阻严重吃掉供电电压，灯端仅余 8.2V。',
  },
];

export function D01RelayControlScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onComplete,
  hintRequested,
}: D01RelayControlSceneProps) {
  const assessment = useLevelAssessment('D01');

  React.useEffect(() => {
    if (hintRequested) {
      const stageMap: Record<D01Step, TrainingStageId> = {
        COIL_CONTACT_ISOLATION: 'cognition',
        MULTIMETER_PIN_IDENTIFICATION: 'standard',
        RELAY_ENERGIZATION_AND_SWITCH: 'calculation',
        BLIND_RELAY_FAULT_DIAGNOSIS: 'blind_test',
        ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
      };
      assessment.requestHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, assessment]);

  // Multimeter knob: 'OFF' | 'DCV_20' | 'OHM_200'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'DCV_20' | 'OHM_200'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Step 1: Direct vs Relay
  const [s1Mode, setS1Mode] = useState<'DIRECT' | 'RELAY'>('DIRECT');
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Step 2: Pin Identification
  const [s2SelectedPins, setS2SelectedPins] = useState<'85_86' | '30_87' | '85_30'>('85_86');
  const [s2Answer, setS2Answer] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: Energization
  const [s3SwitchClosed, setS3SwitchClosed] = useState<boolean>(false);
  const [s3Observed, setS3Observed] = useState<boolean>(false);
  const [s3Choice, setS3Choice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Step 4: Blind Fault
  const [blindIndex, setBlindIndex] = useState<number>(0);
  const [s4TestTarget, setS4TestTarget] = useState<'COIL' | 'CONTACT' | 'DROP'>('COIL');
  const [s4Choice, setS4Choice] = useState<string | null>(null);
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Step 5: Engineering Repair
  const [s5Repaired, setS5Repaired] = useState<boolean>(false);
  const [s5SwitchOn, setS5SwitchOn] = useState<boolean>(false);
  const [s5WorkOrderSigned, setS5WorkOrderSigned] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  const activeBlind = BLIND_CASES[blindIndex];

  // Multimeter Anti-misoperation guard
  const requireMeterPowered = (expected: 'DCV_20' | 'OHM_200'): boolean => {
    const stageMap: Record<D01Step, TrainingStageId> = {
      COIL_CONTACT_ISOLATION: 'cognition',
      MULTIMETER_PIN_IDENTIFICATION: 'standard',
      RELAY_ENERGIZATION_AND_SWITCH: 'calculation',
      BLIND_RELAY_FAULT_DIAGNOSIS: 'blind_test',
      ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
    };
    const guard = evaluateMeterGuard({
      currentMode: meterKnob,
      expectedMode: expected,
      circuitPowered: expected === 'DCV_20',
      resistanceMeasurement: expected === 'OHM_200',
    });
    if (!guard.allowed) {
      sounds.warningBuzz();
      assessment.recordMeterBlocked(stageMap[currentStep]);
      setMeterWarning(guard.message);
      return false;
    }
    setMeterWarning(null);
    return true;
  };

  return (
    <div className="flex flex-col flex-1 min-h-[580px] w-full bg-slate-900 text-white rounded-xl p-4 lg:p-6 shadow-2xl border border-slate-800 space-y-6">
      {/* Warning toast */}
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

      {/* Main interactive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left: Circuit & Relay Visualizer (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="font-semibold text-slate-200">继电器电磁与主回路可视化实验台</span>
            </div>
            <div className="text-xs px-2.5 py-1 bg-slate-800 text-amber-300 rounded font-mono">
              {currentStep === 'COIL_CONTACT_ISOLATION' && '步骤1: 控/负回路分离'}
              {currentStep === 'MULTIMETER_PIN_IDENTIFICATION' && '步骤2: 引脚万用表辨识'}
              {currentStep === 'RELAY_ENERGIZATION_AND_SWITCH' && '步骤3: 电磁吸合规律'}
              {currentStep === 'BLIND_RELAY_FAULT_DIAGNOSIS' && `步骤4: 盲测排故 (${blindIndex + 1}/3)`}
              {currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' && '步骤5: 工程修复与交车'}
            </div>
          </div>

          {/* SVG Visual Canvas */}
          <div className="my-4 relative flex items-center justify-center min-h-[300px]">
            <svg
              className="w-full h-72 lg:h-80 select-none"
              viewBox="0 0 700 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Grid Background */}
              <defs>
                <pattern id="d01-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="1" />
                </pattern>
                <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#eab308" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="700" height="320" fill="url(#d01-grid)" rx="8" />

              {/* Relay Housing Box */}
              <rect
                x="220"
                y="40"
                width="260"
                height="240"
                rx="12"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeDasharray="6 4"
              />
              <text x="350" y="65" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold">
                标准汽车四脚继电器 (12V 40A)
              </text>

              {/* Electromagnetic Coil Section (85 - 86) */}
              <rect x="240" y="80" width="100" height="180" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
              <text x="290" y="102" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">
                电磁线圈 (85/86)
              </text>

              {/* Coil winding spirals */}
              <g stroke="#f59e0b" strokeWidth="3" fill="none">
                <path d="M 270 120 C 310 120, 310 135, 270 135" />
                <path d="M 270 135 C 310 135, 310 150, 270 150" />
                <path d="M 270 150 C 310 150, 310 165, 270 165" />
                <path d="M 270 165 C 310 165, 310 180, 270 180" />
                <path d="M 270 180 C 310 180, 310 195, 270 195" />
              </g>

              {/* Coil Iron Core */}
              <rect x="285" y="115" width="10" height="85" fill="#475569" rx="2" />

              {/* Coil Magnetic field active indicator */}
              {((currentStep === 'RELAY_ENERGIZATION_AND_SWITCH' && s3SwitchClosed) ||
                (currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' && s5SwitchOn)) && (
                <g stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8">
                  <ellipse cx="290" cy="157" rx="35" ry="60" />
                  <ellipse cx="290" cy="157" rx="45" ry="75" />
                </g>
              )}

              {/* Terminals 85 & 86 */}
              <circle cx="255" cy="240" r="7" fill="#38bdf8" />
              <text x="255" y="258" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">
                85 (+)
              </text>

              <circle cx="325" cy="240" r="7" fill="#38bdf8" />
              <text x="325" y="258" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">
                86 (-)
              </text>

              {/* Main Contact Section (30 - 87) */}
              <rect x="360" y="80" width="105" height="180" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
              <text x="412" y="102" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">
                主触点 (30/87)
              </text>

              {/* Terminal 30 (Common) */}
              <circle cx="380" cy="240" r="7" fill="#ef4444" />
              <text x="380" y="258" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">
                30 (供电)
              </text>

              {/* Terminal 87 (Normally Open) */}
              <circle cx="445" cy="240" r="7" fill="#eab308" />
              <text x="445" y="258" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">
                87 (大灯)
              </text>

              {/* Contact Switch Blade (Animated position) */}
              {(() => {
                const isContactClosed =
                  (currentStep === 'RELAY_ENERGIZATION_AND_SWITCH' && s3SwitchClosed) ||
                  (currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' && s5SwitchOn) ||
                  (currentStep === 'BLIND_RELAY_FAULT_DIAGNOSIS' && activeBlind.faultType === 'CONTACT_WELDED');
                return (
                  <g>
                    {/* Fixed contact pad at 87 */}
                    <circle cx="430" cy="140" r="5" fill="#f59e0b" />
                    {/* Pivot point at 30 */}
                    <circle cx="385" cy="190" r="4" fill="#ef4444" />
                    {/* Moving armature blade */}
                    <line
                      x1="385"
                      y1="190"
                      x2={isContactClosed ? '430' : '405'}
                      y2={isContactClosed ? '140' : '135'}
                      stroke="#f8fafc"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    {isContactClosed && (
                      <circle cx="430" cy="140" r="10" fill="#fef08a" opacity="0.6" className="animate-ping" />
                    )}
                  </g>
                );
              })()}

              {/* Left Side: Battery 12V */}
              <rect x="30" y="110" width="80" height="90" rx="6" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
              <text x="70" y="145" textAnchor="middle" fill="#38bdf8" fontSize="14" fontWeight="bold">
                12V
              </text>
              <text x="70" y="165" textAnchor="middle" fill="#64748b" fontSize="11">
                蓄电池
              </text>
              <circle cx="70" cy="110" r="5" fill="#ef4444" />
              <text x="70" y="103" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">
                +
              </text>
              <circle cx="70" cy="200" r="5" fill="#38bdf8" />
              <text x="70" y="215" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="bold">
                -
              </text>

              {/* Power Wires from Battery to 30 */}
              <path d="M 70 110 L 70 50 L 380 50 L 380 240" stroke="#ef4444" strokeWidth="4" fill="none" />

              {/* Right Side: 55W Work Lamp */}
              <g transform="translate(560, 110)">
                {/* Lamp glow if active */}
                {(() => {
                  const isLampLit =
                    (currentStep === 'COIL_CONTACT_ISOLATION' && s1Mode === 'RELAY') ||
                    (currentStep === 'RELAY_ENERGIZATION_AND_SWITCH' && s3SwitchClosed) ||
                    (currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' && s5SwitchOn && s5Repaired) ||
                    (currentStep === 'BLIND_RELAY_FAULT_DIAGNOSIS' && activeBlind.faultType === 'CONTACT_WELDED');
                  return (
                    <>
                      {isLampLit && <circle cx="40" cy="45" r="55" fill="url(#lampGlow)" />}
                      <circle
                        cx="40"
                        cy="45"
                        r="35"
                        fill={isLampLit ? '#fef08a' : '#1e293b'}
                        stroke={isLampLit ? '#eab308' : '#64748b'}
                        strokeWidth="3"
                      />
                      <path
                        d="M 30 55 L 40 35 L 50 55"
                        stroke={isLampLit ? '#b45309' : '#475569'}
                        strokeWidth="3"
                        fill="none"
                      />
                      <text
                        x="40"
                        y="100"
                        textAnchor="middle"
                        fill={isLampLit ? '#fef08a' : '#94a3b8'}
                        fontSize="12"
                        fontWeight="bold"
                      >
                        55W 工作大灯
                      </text>
                      <text x="40" y="115" textAnchor="middle" fill="#64748b" fontSize="10">
                        {isLampLit ? '工作电流 4.58A' : '未通电 (0A)'}
                      </text>
                    </>
                  );
                })()}
              </g>

              {/* Wire from 87 to Lamp */}
              <path d="M 445 240 L 445 290 L 600 290 L 600 200" stroke="#eab308" strokeWidth="4" fill="none" />

              {/* Ground wire from Lamp */}
              <path d="M 600 110 L 600 60 L 650 60" stroke="#38bdf8" strokeWidth="3" fill="none" />
              <line x1="650" y1="52" x2="650" y2="68" stroke="#38bdf8" strokeWidth="3" />
              <line x1="655" y1="55" x2="655" y2="65" stroke="#38bdf8" strokeWidth="2" />
              <line x1="660" y1="58" x2="660" y2="62" stroke="#38bdf8" strokeWidth="2" />
            </svg>
          </div>

          {/* Interactive Toggle Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg">
            {currentStep === 'COIL_CONTACT_ISOLATION' && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">驱动模式对比:</span>
                <button
                  onClick={() => {
                    sounds.click();
                    setS1Mode('DIRECT');
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${
                    s1Mode === 'DIRECT' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  微动开关直驱 (反例: 严重打火)
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS1Mode('RELAY');
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${
                    s1Mode === 'RELAY' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  继电器规范控制 (以小控大)
                </button>
              </div>
            )}

            {currentStep === 'MULTIMETER_PIN_IDENTIFICATION' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">测量引脚对:</span>
                <button
                  onClick={() => {
                    sounds.click();
                    setS2SelectedPins('85_86');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${
                    s2SelectedPins === '85_86' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  85 与 86 (线圈)
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS2SelectedPins('30_87');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${
                    s2SelectedPins === '30_87' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  30 与 87 (常开触点)
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS2SelectedPins('85_30');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${
                    s2SelectedPins === '85_30' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  85 与 30 (线圈/触点隔离)
                </button>
              </div>
            )}

            {currentStep === 'RELAY_ENERGIZATION_AND_SWITCH' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (!s3SwitchClosed) {
                      sounds.zap();
                    } else {
                      sounds.click();
                    }
                    setS3SwitchClosed(!s3SwitchClosed);
                    setS3Observed(true);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${
                    s3SwitchClosed ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  {s3SwitchClosed ? '控制开关已闭合 (大灯点亮中)' : '点击闭合微动控制开关'}
                </button>
                <span className="text-xs text-slate-400">
                  {s3SwitchClosed ? '磁场吸合衔铁，大灯回路形成' : '线圈未通电，触点处于常开状态'}
                </span>
              </div>
            )}

            {currentStep === 'BLIND_RELAY_FAULT_DIAGNOSIS' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">测量项目:</span>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4TestTarget('COIL');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${
                    s4TestTarget === 'COIL' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  85-86 线圈电阻
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4TestTarget('CONTACT');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${
                    s4TestTarget === 'CONTACT' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  30-87 常开阻值
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setS4TestTarget('DROP');
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${
                    s4TestTarget === 'DROP' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  30-87 触点压降
                </button>
              </div>
            )}

            {currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' && (
              <div className="flex items-center gap-3">
                <button
                  disabled={s5Repaired}
                  onClick={() => {
                    sounds.success();
                    setS5Repaired(true);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${
                    s5Repaired ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/50' : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {s5Repaired ? '✅ 原厂 12V 40A 继电器已换装' : '🔧 领用换装合格新继电器'}
                </button>
                {s5Repaired && (
                  <button
                    onClick={() => {
                      sounds.click();
                      setS5SwitchOn(!s5SwitchOn);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-semibold ${
                      s5SwitchOn ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {s5SwitchOn ? '关闭控制开关' : '通电闭合开关测试'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Multimeter & Stage Form (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Universal Multimeter Instrument */}
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
                {meterKnob === 'DCV_20' ? 'DC VOLTAGE (20V)' : meterKnob === 'OHM_200' ? 'RESISTANCE (200Ω)' : 'POWER OFF'}
              </div>
              <div className="text-4xl lg:text-5xl font-mono font-black text-emerald-400 tracking-tight">
                {(() => {
                  if (meterKnob === 'OFF') return '----';
                  if (meterKnob === 'OHM_200') {
                    if (currentStep === 'MULTIMETER_PIN_IDENTIFICATION') {
                      if (s2SelectedPins === '85_86') return '80.2 Ω';
                      return 'O.L (开路)';
                    }
                    if (currentStep === 'BLIND_RELAY_FAULT_DIAGNOSIS') {
                      if (s4TestTarget === 'COIL') {
                        return activeBlind.coilResistance > 1000 ? 'O.L (断路)' : `${activeBlind.coilResistance.toFixed(1)} Ω`;
                      }
                      if (s4TestTarget === 'CONTACT') {
                        return activeBlind.contactResistance > 1000 ? 'O.L (常开)' : `${activeBlind.contactResistance.toFixed(2)} Ω`;
                      }
                    }
                    if (currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY') {
                      return s5Repaired ? '80.0 Ω' : 'O.L';
                    }
                    return '0.0 Ω';
                  }
                  if (meterKnob === 'DCV_20') {
                    if (currentStep === 'RELAY_ENERGIZATION_AND_SWITCH') {
                      return s3SwitchClosed ? '12.02 V' : '0.00 V';
                    }
                    if (currentStep === 'BLIND_RELAY_FAULT_DIAGNOSIS') {
                      if (s4TestTarget === 'DROP') {
                        return `${activeBlind.contactDrop.toFixed(2)} V`;
                      }
                      return '12.00 V';
                    }
                    if (currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY') {
                      return s5SwitchOn ? '0.03 V' : '0.00 V';
                    }
                    return '12.00 V';
                  }
                  return '0.00';
                })()}
              </div>
            </div>

            {/* Multimeter Knob Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  sounds.click();
                  setMeterKnob('OFF');
                }}
                className={`py-1.5 px-2 text-xs rounded font-mono font-bold ${
                  meterKnob === 'OFF' ? 'bg-rose-700 text-white ring-2 ring-rose-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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
                className={`py-1.5 px-2 text-xs rounded font-mono font-bold ${
                  meterKnob === 'DCV_20' ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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
                className={`py-1.5 px-2 text-xs rounded font-mono font-bold ${
                  meterKnob === 'OHM_200' ? 'bg-amber-600 text-white ring-2 ring-amber-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Ω 200Ω
              </button>
            </div>
          </div>

          {/* Form & Assessment Panel (Zero-spoiler!) */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            {/* Step 1 Question */}
            {currentStep === 'COIL_CONTACT_ISOLATION' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-amber-300">
                  【步骤1工单思考】为什么汽车不能用方向盘上的轻触开关直接接通工作大灯？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '微动开关额定电流很小(0.5A)，55W大灯电流达4.6A，直接开闭会产生剧烈电弧烧蚀焊死' },
                    { id: 'B', text: '微动开关只能控制直流电，无法控制大灯的交流电' },
                    { id: 'C', text: '微动开关电阻太大，会导致大灯完全不亮' },
                  ].map((opt) => {
                    const isSelected = s1Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s1Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-sky-500 bg-sky-950/40 text-sky-200';
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
                        <span className="font-bold mr-1.5">{opt.id}.</span> {opt.text}
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
                        onStepComplete('COIL_CONTACT_ISOLATION', { choice: s1Choice, correct: true });
                      } else {
                        sounds.warningBuzz();
                        assessment.recordWrong('cognition');
                        setS1Submitted(true);
                      }
                    }}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-xs font-semibold py-2"
                  >
                    提交判别分析
                  </Button>
                ) : s1Choice === 'A' ? (
                  <Button
                    onClick={() => {
                      assessment.completeStage('cognition');
                      assessment.startStage('standard');
                      onAdvanceStep();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    通过！进入引脚万用表辨识 <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
            {currentStep === 'MULTIMETER_PIN_IDENTIFICATION' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-amber-300">
                  【步骤2工单测量】打到电阻挡测得 85-86 为 80.2Ω，30-87 为 OL，你的物理结论是？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '85-86 是控制电磁线圈（有铜线绕组阻值）；30-87 是常开主触点（未吸合时开路无穷大）' },
                    { id: 'B', text: '85-86 已经发生虚接故障；30-87 触点已烧蚀断裂' },
                    { id: 'C', text: '30-87 是电磁线圈；85-86 是主供电触点' },
                  ].map((opt) => {
                    const isSelected = s2Answer === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s2Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-sky-500 bg-sky-950/40 text-sky-200';
                    }
                    return (
                      <button
                        key={opt.id}
                        disabled={s2Submitted}
                        onClick={() => {
                          sounds.click();
                          setS2Answer(opt.id);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${borderClass}`}
                      >
                        <span className="font-bold mr-1.5">{opt.id}.</span> {opt.text}
                      </button>
                    );
                  })}
                </div>
                {!s2Submitted ? (
                  <Button
                    disabled={!s2Answer}
                    onClick={() => {
                      if (!requireMeterPowered('OHM_200')) return;
                      if (s2Answer === 'A') {
                        sounds.success();
                        setS2Submitted(true);
                        onStepComplete('MULTIMETER_PIN_IDENTIFICATION', { answer: s2Answer, pins: s2SelectedPins });
                      } else {
                        sounds.warningBuzz();
                        assessment.recordWrong('standard');
                        setS2Submitted(true);
                      }
                    }}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-xs font-semibold py-2"
                  >
                    核验引脚测试数据
                  </Button>
                ) : s2Answer === 'A' ? (
                  <Button
                    onClick={() => {
                      assessment.completeStage('standard');
                      assessment.startStage('calculation');
                      onAdvanceStep();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    判定准确！进入电磁吸合规律测试 <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setS2Submitted(false);
                      setS2Answer(null);
                    }}
                    variant="outline"
                    className="w-full text-xs"
                  >
                    重新测量
                  </Button>
                )}
              </div>
            )}

            {/* Step 3 Question */}
            {currentStep === 'RELAY_ENERGIZATION_AND_SWITCH' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-amber-300">
                  【步骤3规律总结】闭合控制开关后，继电器内部发生的最本质物理过程是？
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'A', text: '微小电流通过线圈产生电磁吸力，吸动衔铁使 30 与 87 大触点闭合，打通 4.6A 工作灯回路' },
                    { id: 'B', text: '微动开关直接给大灯输送 4.6A 大电流使其发光' },
                    { id: 'C', text: '继电器内部电阻瞬间变为负阻抗，放大输出电压至 24V' },
                  ].map((opt) => {
                    const isSelected = s3Choice === opt.id;
                    const isCorrect = opt.id === 'A';
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s3Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-sky-500 bg-sky-950/40 text-sky-200';
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
                        <span className="font-bold mr-1.5">{opt.id}.</span> {opt.text}
                      </button>
                    );
                  })}
                </div>
                {!s3Submitted ? (
                  <Button
                    disabled={!s3Choice || !s3Observed}
                    onClick={() => {
                      if (s3Choice === 'A') {
                        sounds.success();
                        setS3Submitted(true);
                        onStepComplete('RELAY_ENERGIZATION_AND_SWITCH', { choice: s3Choice });
                      } else {
                        sounds.warningBuzz();
                        assessment.recordWrong('calculation');
                        setS3Submitted(true);
                      }
                    }}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-xs font-semibold py-2"
                  >
                    {!s3Observed ? '请先在左侧闭合开关通电观察' : '提交动作机理分析'}
                  </Button>
                ) : s3Choice === 'A' ? (
                  <Button
                    onClick={() => {
                      assessment.completeStage('calculation');
                      assessment.startStage('blind_test');
                      onAdvanceStep();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    非常透彻！进入独立盲测排故实战 <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
            {currentStep === 'BLIND_RELAY_FAULT_DIAGNOSIS' && (
              <div className="space-y-3">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded text-xs">
                  <div className="font-bold text-sky-300">{activeBlind.vehicleName}</div>
                  <div className="text-slate-400">{activeBlind.symptom}</div>
                </div>
                <div className="text-xs font-semibold text-amber-300">
                  结合万用表测量数据，判定该车辆继电器的故障真因为：
                </div>
                <div className="space-y-2">
                  {[
                    { id: 'COIL_OPEN', text: '线圈断路烧损 (85-86 阻值开路无穷大 OL，无吸合)' },
                    { id: 'CONTACT_WELDED', text: '触点电弧烧结粘连 (30-87 常通常闭，大灯长亮不灭)' },
                    { id: 'CONTACT_OXIDIZED', text: '触点严重氧化碳化 (带载压降超标，灯端电压被严重吃掉)' },
                  ].map((opt) => {
                    const isSelected = s4Choice === opt.id;
                    const isCorrect = opt.id === activeBlind.faultType;
                    let borderClass = 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
                    if (s4Submitted) {
                      if (isSelected && isCorrect) borderClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                      else if (isSelected && !isCorrect) borderClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
                      else if (isCorrect) borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
                    } else if (isSelected) {
                      borderClass = 'border-sky-500 bg-sky-950/40 text-sky-200';
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
                      if (!requireMeterPowered(meterKnob === 'OHM_200' ? 'OHM_200' : 'DCV_20')) return;
                      if (s4Choice === activeBlind.faultType) {
                        sounds.success();
                        setS4Submitted(true);
                        onStepComplete('BLIND_RELAY_FAULT_DIAGNOSIS', { caseId: activeBlind.id, choice: s4Choice });
                      } else {
                        sounds.warningBuzz();
                        assessment.recordWrong('blind_test');
                        setS4Submitted(true);
                      }
                    }}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-xs font-semibold py-2"
                  >
                    提交盲测诊断结论
                  </Button>
                ) : s4Choice === activeBlind.faultType ? (
                  <Button
                    onClick={() => {
                      if (blindIndex < BLIND_CASES.length - 1) {
                        setBlindIndex(blindIndex + 1);
                        setS4Choice(null);
                        setS4Submitted(false);
                      } else {
                        assessment.completeStage('blind_test');
                        assessment.startStage('transfer', 'transfer');
                        onAdvanceStep();
                      }
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    {blindIndex < BLIND_CASES.length - 1 ? '正确！进入下一个盲测案例' : '盲测全部通关！进入实车修复与交车'}
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
                    重新排查打表
                  </Button>
                )}
              </div>
            )}

            {/* Step 5 Question */}
            {currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-amber-300">
                  【步骤5交付验收】装上原厂合格继电器后，闭合开关通电复测，核验交车标准：
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>1. 触点 30-87 带载跨接电压降:</span>
                    <span className="font-mono text-emerald-400 font-bold">0.03 V (合格 ≤ 0.1V)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>2. 55W 工作大灯发光强度:</span>
                    <span className="font-mono text-emerald-400 font-bold">额定 4.58A 正常高亮</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>3. 85-86 线圈直流电阻:</span>
                    <span className="font-mono text-emerald-400 font-bold">80.0 Ω (符合标称)</span>
                  </div>
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={s5WorkOrderSigned}
                      onChange={(e) => setS5WorkOrderSigned(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500"
                    />
                    <span>确认上述三项电气指标全部复测合格，签署交车工单</span>
                  </label>
                </div>
                {!s5Submitted ? (
                  <Button
                    disabled={!s5Repaired || !s5SwitchOn || !s5WorkOrderSigned}
                    onClick={() => {
                      sounds.success();
                      setS5Submitted(true);
                      onStepComplete('ENGINEERING_REPAIR_AND_DELIVERY', {
                        repaired: true,
                        voltageDrop: 0.03,
                        workOrderSigned: true,
                      });
                      assessment.completeStage('transfer');
                      const finalResult = assessment.completeLevel();
                      onComplete?.(finalResult);
                      onAdvanceStep();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold py-2"
                  >
                    {!s5Repaired ? '请先领用换装新继电器' : !s5SwitchOn ? '请通电闭合开关测试' : !s5WorkOrderSigned ? '请勾选签署交付工单' : '完成交车验收'}
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>恭喜！D01 继电器与电磁控制全流程实训圆满闭环完成！</span>
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
