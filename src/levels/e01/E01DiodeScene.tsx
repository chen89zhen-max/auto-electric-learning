'use client';

import React, { useState, useEffect } from 'react';
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
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { evaluateMeterGuard } from '@/src/game/instruments/meterGuard';
import {
  type E01Step,
  E01_SAMPLES,
  calculateLedCurrentMa,
  calculateLedResistor,
} from './e01Training';

interface E01DiodeSceneProps {
  currentStep: E01Step;
  onStepComplete: (step: E01Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onComplete?: (result: LevelAssessmentResult) => void;
  hintRequested?: boolean;
}

export function E01DiodeScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onComplete,
  hintRequested,
}: E01DiodeSceneProps) {
  const assessment = useLevelAssessment('E01');

  useEffect(() => {
    if (hintRequested) {
      const stageMap: Record<E01Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
        DIODE_CONDUCTION_COGNITION: 'cognition',
        MULTIMETER_DIODE_TEST: 'standard',
        ZENER_AND_LED_CALCULATION: 'calculation',
        BLIND_DIODE_FAULT_DIAGNOSIS: 'blind_test',
        ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
      };
      assessment.requestHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, assessment]);
  // Multimeter knob: 'OFF' | 'DIODE' | 'OHM_2K' | 'DCV_20'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'DIODE' | 'OHM_2K' | 'DCV_20'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Step 1: Forward vs Reverse Conduction
  const [s1Polarity, setS1Polarity] = useState<'FORWARD' | 'REVERSE'>('FORWARD');
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Step 2: Multimeter Testing
  const [s2ProbeDirection, setS2ProbeDirection] = useState<'ANODE_RED' | 'CATHODE_RED'>('ANODE_RED');
  const [s2Choice, setS2Choice] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: LED Resistor & Zener
  const [s3ResistorOhm, setS3ResistorOhm] = useState<number>(500);
  const [s3ZenerEnabled, setS3ZenerEnabled] = useState<boolean>(false);
  const [s3InputVoltage, setS3InputVoltage] = useState<number>(12.0);
  const [s3Choice, setS3Choice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Step 4: Blind Fault Diagnosis
  const [s4SampleIndex, setS4SampleIndex] = useState<number>(0);
  const [s4ProbeDir, setS4ProbeDir] = useState<'FORWARD' | 'REVERSE'>('FORWARD');
  const [s4Diagnoses, setS4Diagnoses] = useState<Record<string, string>>({});
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Step 5: Engineering Repair
  const [s5Measured, setS5Measured] = useState<boolean>(false);
  const [s5SelectedResistor, setS5SelectedResistor] = useState<number | null>(null);
  const [s5Repaired, setS5Repaired] = useState<boolean>(false);
  const [s5PowerOn, setS5PowerOn] = useState<boolean>(false);
  const [s5Signed, setS5Signed] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  // Multimeter guard
  const requireMeterKnob = (required: 'DIODE' | 'OHM_2K' | 'DCV_20'): boolean => {
    const stageMap: Record<E01Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
      DIODE_CONDUCTION_COGNITION: 'cognition',
      MULTIMETER_DIODE_TEST: 'standard',
      ZENER_AND_LED_CALCULATION: 'calculation',
      BLIND_DIODE_FAULT_DIAGNOSIS: 'blind_test',
      ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
    };
    const guard = evaluateMeterGuard({
      currentMode: meterKnob,
      expectedMode: required,
      circuitPowered: currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' ? s5PowerOn : false,
      resistanceMeasurement: required === 'OHM_2K' || required === 'DIODE',
    });
    if (!guard.allowed) {
      setMeterWarning(guard.message);
      sounds.playFailureSound?.();
      assessment.recordMeterBlocked(stageMap[currentStep]);
      return false;
    }
    setMeterWarning(null);
    return true;
  };

  // Step 1 Calculations
  const s1CurrentMa = s1Polarity === 'FORWARD' ? 22.5 : 0.0;
  const s1DiodeDropV = s1Polarity === 'FORWARD' ? 0.7 : 12.0;

  // Step 3 Calculations
  const s3LedCurrent = calculateLedCurrentMa(
    s3ZenerEnabled ? 5.1 : s3InputVoltage,
    2.0,
    s3ResistorOhm
  );

  // Step 4 active sample
  const activeSample = E01_SAMPLES[s4SampleIndex];

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-slate-100 shadow-2xl backdrop-blur-md">
      {/* 顶部数字万用表状态栏 (全场景防呆) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800/80 rounded-xl border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
              汽车数字万用表 (DMM-890)
            </div>
            <div className="text-sm font-bold text-slate-200">
              当前挡位:{' '}
              <span
                className={
                  meterKnob === 'OFF'
                    ? 'text-rose-400 font-mono'
                    : 'text-emerald-400 font-mono font-black'
                }
              >
                {meterKnob === 'OFF' && 'OFF (电源关闭)'}
                {meterKnob === 'DIODE' && '二极管 / 蜂鸣档 (->|- / 🕪)'}
                {meterKnob === 'OHM_2K' && '电阻 2kΩ 档 (Ω)'}
                {meterKnob === 'DCV_20' && '直流电压 20V 档 (V=)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">旋钮挡位:</span>
          {(['OFF', 'DIODE', 'OHM_2K', 'DCV_20'] as const).map((knob) => (
            <button
              key={knob}
              onClick={() => {
                setMeterKnob(knob);
                setMeterWarning(null);
                sounds.playToggleSound?.();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                meterKnob === knob
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              {knob}
            </button>
          ))}
        </div>
      </div>

      {meterWarning && (
        <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-200 text-sm flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{meterWarning}</span>
        </div>
      )}

      {/* 步骤 1：二极管单向导电性 */}
      {currentStep === 'DIODE_CONDUCTION_COGNITION' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 flex flex-col justify-between p-6 bg-slate-950/80 rounded-2xl border border-slate-800 min-h-[360px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-blue-400 tracking-wider">
                  电路实验台：二极管极性与负载响应
                </span>
                <span className="text-xs text-slate-400">供电: 12V 稳压电源</span>
              </div>

              {/* 动态可视化电路 */}
              <div className="relative w-full h-52 flex items-center justify-center my-4 bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden">
                <svg className="w-full h-full max-w-lg" viewBox="0 0 500 200">
                  {/* 导线 */}
                  <path
                    d="M 50 100 L 150 100 M 230 100 L 330 100 M 410 100 L 450 100"
                    stroke={s1Polarity === 'FORWARD' ? '#10b981' : '#64748b'}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={s1Polarity === 'FORWARD' ? '8 4' : 'none'}
                    className={s1Polarity === 'FORWARD' ? 'animate-pulse' : ''}
                  />
                  {/* 电源 */}
                  <rect x="20" y="70" width="30" height="60" rx="4" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
                  <text x="26" y="105" fill="#f8fafc" fontSize="12" fontWeight="bold">12V</text>

                  {/* 二极管符图 */}
                  <g transform="translate(150, 70)">
                    <rect x="0" y="0" width="80" height="60" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                    {s1Polarity === 'FORWARD' ? (
                      <>
                        {/* 三角形指右 */}
                        <polygon points="20,15 20,45 50,30" fill="#38bdf8" />
                        <line x1="50" y1="15" x2="50" y2="45" stroke="#38bdf8" strokeWidth="4" />
                        <text x="18" y="56" fill="#94a3b8" fontSize="9">阳极(+)</text>
                        <text x="48" y="56" fill="#f43f5e" fontSize="9">阴极(-)</text>
                      </>
                    ) : (
                      <>
                        {/* 反接：三角形指左 */}
                        <polygon points="50,15 50,45 20,30" fill="#f43f5e" />
                        <line x1="20" y1="15" x2="20" y2="45" stroke="#f43f5e" strokeWidth="4" />
                        <text x="15" y="56" fill="#f43f5e" fontSize="9">阴极(-)</text>
                        <text x="45" y="56" fill="#94a3b8" fontSize="9">阳极(+)</text>
                      </>
                    )}
                  </g>

                  {/* 负载大灯 / LED */}
                  <g transform="translate(330, 70)">
                    <circle
                      cx="40"
                      cy="30"
                      r="25"
                      fill={s1Polarity === 'FORWARD' ? '#facc15' : '#334155'}
                      stroke={s1Polarity === 'FORWARD' ? '#eab308' : '#64748b'}
                      strokeWidth="3"
                      className={s1Polarity === 'FORWARD' ? 'animate-pulse' : ''}
                    />
                    <text x="25" y="35" fill={s1Polarity === 'FORWARD' ? '#0f172a' : '#94a3b8'} fontSize="11" fontWeight="bold">
                      {s1Polarity === 'FORWARD' ? '💡 点亮' : '🌑 熄灭'}
                    </text>
                  </g>
                </svg>
              </div>

              {/* 测量读数与极性切换 */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-4 text-sm font-mono">
                  <div>
                    二极管压降: <span className="text-emerald-400 font-bold">{s1DiodeDropV.toFixed(1)} V</span>
                  </div>
                  <div>
                    回路电流: <span className="text-cyan-400 font-bold">{s1CurrentMa.toFixed(1)} mA</span>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setS1Polarity(s1Polarity === 'FORWARD' ? 'REVERSE' : 'FORWARD');
                    sounds.playToggleSound?.();
                  }}
                  variant="outline"
                  className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                >
                  反转二极管接入方向 (当前: {s1Polarity === 'FORWARD' ? '正向导通' : '反向截止'})
                </Button>
              </div>
            </div>

            {/* 右侧零剧透知识验证 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  认知判定与理论验证
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  观察上述正反接入现象，选择对硅二极管导通特性的正确描述：
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '正向偏置时导通并存在约 0.7V 门槛管压降，反向偏置时截止阻断电流' },
                    { id: 'B', text: '无论正接反接，二极管两端阻值恒为 0Ω 直通' },
                    { id: 'C', text: '反向偏置时二极管导通并提供两倍电源电压' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      disabled={s1Submitted}
                      onClick={() => {
                        setS1Choice(opt.id);
                        sounds.playToggleSound?.();
                      }}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                        s1Choice === opt.id
                          ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-mono font-bold mr-2 text-blue-400">{opt.id}.</span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                {!s1Submitted ? (
                  <Button
                    disabled={!s1Choice}
                    onClick={() => {
                      if (s1Choice === 'A') {
                        setS1Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('DIODE_CONDUCTION_COGNITION', { s1Choice, s1Polarity });
                      } else {
                        sounds.playFailureSound?.();
                        assessment.recordWrong('cognition');
                        alert('结论有误，请仔细观察正接与反接时的电压与电流读数！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    提交判定
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>判定正确！硅二极管具备单向导电性，正向导通压降约为 0.7V。</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('cognition');
                        assessment.startStage('standard');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      进入步骤 2：万用表规范测试 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 2：万用表二极管档规范测量 */}
      {currentStep === 'MULTIMETER_DIODE_TEST' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    实训台：万用表二极管挡检测规范
                  </span>
                  <span className="text-xs text-slate-400">
                    表笔接线: {s2ProbeDirection === 'ANODE_RED' ? '红笔接阳极(+) / 黑笔接阴极(-)' : '红笔接阴极(-) / 黑笔接阳极(+)'}
                  </span>
                </div>

                {/* 万用表 LCD 屏 */}
                <div className="p-6 bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-sm mx-auto shadow-inner flex flex-col items-center">
                  <div className="text-xs text-slate-400 mb-1 flex items-center justify-between w-full">
                    <span>DIGITAL MULTIMETER</span>
                    <span className="text-emerald-400 font-mono">AUTO POWER</span>
                  </div>
                  <div className="w-full h-24 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center justify-center font-mono">
                    <span className="text-4xl font-black text-emerald-400 tracking-wider">
                      {meterKnob === 'OFF' && '----'}
                      {meterKnob === 'DIODE' && (s2ProbeDirection === 'ANODE_RED' ? '0.642 V' : 'OL')}
                      {meterKnob === 'OHM_2K' && (s2ProbeDirection === 'ANODE_RED' ? '0.85 kΩ' : 'OL')}
                      {meterKnob === 'DCV_20' && '0.00 V'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {meterKnob === 'DIODE' && (s2ProbeDirection === 'ANODE_RED' ? '正向导通管压降 (642mV)' : '反向截止开路 (Over Limit)')}
                    {meterKnob === 'OFF' && '万用表未开机'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-800">
                <Button
                  onClick={() => {
                    setS2ProbeDirection(s2ProbeDirection === 'ANODE_RED' ? 'CATHODE_RED' : 'ANODE_RED');
                    sounds.playToggleSound?.();
                  }}
                  variant="outline"
                  className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                >
                  对调红黑表笔位置 (当前: {s2ProbeDirection === 'ANODE_RED' ? '正向接法' : '反向接法'})
                </Button>
                <div className="text-xs text-slate-400">
                  提示: 必须先旋动上方表头至 <span className="text-blue-400 font-bold">[DIODE]</span> 挡！
                </div>
              </div>
            </div>

            {/* 右侧零剧透判定 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  好坏与极性判别标准
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  根据万用表二极管档测量规范，如何判定该二极管性能良好？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '正向测量显示 500~700mV 导通压降，反向测量显示 OL，正反差异明显' },
                    { id: 'B', text: '正向与反向测量均发出持续蜂鸣声且显示 0.00V' },
                    { id: 'C', text: '正向与反向均显示 OL 无穷大' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      disabled={s2Submitted}
                      onClick={() => {
                        setS2Choice(opt.id);
                        sounds.playToggleSound?.();
                      }}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                        s2Choice === opt.id
                          ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-mono font-bold mr-2 text-blue-400">{opt.id}.</span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                {!s2Submitted ? (
                  <Button
                    disabled={!s2Choice}
                    onClick={() => {
                      if (!requireMeterKnob('DIODE')) return;
                      if (s2Choice === 'A') {
                        setS2Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('MULTIMETER_DIODE_TEST', { s2Choice, s2ProbeDirection });
                      } else {
                        sounds.playFailureSound?.();
                        assessment.recordWrong('standard');
                        alert('判别错误！双向均为0是击穿，双向均为OL是断路！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    提交测量结论
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>规范检测通过！红正黑负有压降，对调显示 OL，二极管性能良好。</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('standard');
                        assessment.startStage('calculation');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      进入步骤 3：稳压与限流计算 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 3：稳压二极管与限流电阻计算 */}
      {currentStep === 'ZENER_AND_LED_CALCULATION' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    LED 指示灯与稳压二极管 (Zener) 定量保护分析
                  </span>
                  <div className="flex items-center gap-2">
                    <label htmlFor="e01-voltage-input" className="text-xs text-slate-400">电源电压:</label>
                    <input
                      id="e01-voltage-input"
                      type="range"
                      min="9"
                      max="16"
                      step="0.5"
                      value={s3InputVoltage}
                      onChange={(e) => setS3InputVoltage(parseFloat(e.target.value))}
                      className="w-24 accent-blue-500"
                    />
                    <span className="text-xs font-mono font-bold text-blue-300">{s3InputVoltage.toFixed(1)}V</span>
                  </div>
                </div>

                {/* 调节限流电阻阻值 */}
                <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>限流电阻阻值 R:</span>
                      <span className="font-mono font-bold text-emerald-400">{s3ResistorOhm} Ω</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="1200"
                      step="50"
                      value={s3ResistorOhm}
                      onChange={(e) => {
                        setS3ResistorOhm(parseInt(e.target.value, 10));
                        sounds.playToggleSound?.();
                      }}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div className="text-xs text-slate-400">稳压保护电路 (Uz = 5.1V):</div>
                    <Button
                      onClick={() => {
                        setS3ZenerEnabled(!s3ZenerEnabled);
                        sounds.playToggleSound?.();
                      }}
                      variant="outline"
                      size="sm"
                      className={`text-xs ${
                        s3ZenerEnabled
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      {s3ZenerEnabled ? '稳压二极管已接入 (嵌位5.1V)' : '未接入稳压管 (直接受供电波动)'}
                    </Button>
                  </div>
                </div>

                {/* LED 发光状态与警告 */}
                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">LED 回路电流</div>
                    <div
                      className={`text-lg font-mono font-black ${
                        s3LedCurrent > 35
                          ? 'text-rose-400 animate-pulse'
                          : s3LedCurrent < 10
                          ? 'text-slate-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {s3LedCurrent.toFixed(1)} mA
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">LED 端压降</div>
                    <div className="text-lg font-mono font-black text-amber-300">2.0 V</div>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">器件工作状态</div>
                    <div className="text-xs font-bold mt-1">
                      {s3LedCurrent > 35 && <span className="text-rose-400">⚠️ 严重过流！烧毁隐患</span>}
                      {s3LedCurrent >= 10 && s3LedCurrent <= 35 && <span className="text-emerald-400">✓ 正常发光 (15~25mA)</span>}
                      {s3LedCurrent < 10 && <span className="text-slate-400">发光暗淡微弱</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-4 border-t border-slate-800 font-mono">
                公式: R = (U_in - U_led) / I_target = ({s3ZenerEnabled ? '5.1' : s3InputVoltage.toFixed(1)} - 2.0) / {(s3LedCurrent / 1000).toFixed(4)}A
              </div>
            </div>

            {/* 右侧定量计算题 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  工程计算工单
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  汽车电网标称 12V，LED 导通电压 2.0V，要求额定工作电流严格控制在 20mA (0.02A)，应串联多大阻值的限流电阻？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '500 Ω  (标称系列常用 510Ω 或 470Ω)' },
                    { id: 'B', text: '10 Ω' },
                    { id: 'C', text: '10000 Ω (10kΩ)' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      disabled={s3Submitted}
                      onClick={() => {
                        setS3Choice(opt.id);
                        sounds.playToggleSound?.();
                      }}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                        s3Choice === opt.id
                          ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-mono font-bold mr-2 text-blue-400">{opt.id}.</span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                {!s3Submitted ? (
                  <Button
                    disabled={!s3Choice}
                    onClick={() => {
                      if (s3Choice === 'A') {
                        setS3Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('ZENER_AND_LED_CALCULATION', {
                          s3Choice,
                          s3ResistorOhm,
                          targetR: calculateLedResistor(12, 2, 20),
                        });
                      } else {
                        sounds.playFailureSound?.();
                        assessment.recordWrong('calculation');
                        alert('计算有误！R = (12V - 2V) / 0.02A = 10V / 0.02A = 500Ω！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    提交计算结论
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>计算准确！R = (12 - 2) / 0.02 = 500Ω，能可靠保护汽车指示灯！</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('calculation');
                        assessment.startStage('blind_test');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      进入步骤 4：典型故障盲测 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 4：典型故障盲测排故 */}
      {currentStep === 'BLIND_DIODE_FAULT_DIAGNOSIS' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    实训测试台：未知二极管盲测工位 (4 组样品)
                  </span>
                  <span className="text-xs text-slate-400">请使用万用表二极管档测量</span>
                </div>

                {/* 样件切换标签 */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {E01_SAMPLES.map((smp, idx) => (
                    <button
                      key={smp.id}
                      onClick={() => {
                        setS4SampleIndex(idx);
                        sounds.playToggleSound?.();
                      }}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                        s4SampleIndex === idx
                          ? 'border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-500/40'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {smp.name.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {/* 万用表测试当前样件 */}
                <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl flex flex-col items-center">
                  <div className="text-xs text-slate-400 mb-2">
                    当前测试对象: <span className="text-white font-bold">{activeSample.name}</span>
                  </div>
                  <div className="w-48 h-20 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center justify-center font-mono text-3xl font-black text-emerald-400">
                    {meterKnob !== 'DIODE' ? (
                      <span className="text-rose-400 text-lg">请切至二极管挡</span>
                    ) : s4ProbeDir === 'FORWARD' ? (
                      activeSample.forwardMv > 9000 ? 'OL' : `${(activeSample.forwardMv / 1000).toFixed(3)} V`
                    ) : activeSample.reverseMv === null ? (
                      'OL'
                    ) : (
                      `${(activeSample.reverseMv / 1000).toFixed(3)} V`
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setS4ProbeDir(s4ProbeDir === 'FORWARD' ? 'REVERSE' : 'FORWARD');
                        sounds.playToggleSound?.();
                      }}
                      className="text-xs border-slate-700 bg-slate-800 text-slate-200"
                    >
                      翻转表笔方向 (当前: {s4ProbeDir === 'FORWARD' ? '红阳黑阴(正向)' : '红阴黑阳(反向)'})
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-4 border-t border-slate-800">
                诊断小技巧: 正常管子正向导通(约0.6V)、反向OL；击穿为双向0V；断路为双向OL；漏电管反向有异常压降。
              </div>
            </div>

            {/* 右侧工单填报 */}
            <div className="lg:col-span-5 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  盲测诊断报告表
                </h4>
                <p className="text-xs text-slate-400 mb-3">为 4 组样件分别下达最终物理状态判定：</p>

                <div className="space-y-3">
                  {E01_SAMPLES.map((smp) => (
                    <div key={smp.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                      <div className="font-bold text-slate-200 mb-1.5">{smp.name}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { val: 'NORMAL', label: '性能良好' },
                          { val: 'SHORT', label: '击穿短路' },
                          { val: 'OPEN', label: '内部烧断断路' },
                          { val: 'REVERSE_LEAK', label: '反向严重漏电' },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            disabled={s4Submitted}
                            onClick={() => {
                              setS4Diagnoses((prev) => ({ ...prev, [smp.id]: opt.val }));
                              sounds.playToggleSound?.();
                            }}
                            className={`p-1.5 rounded-lg border text-center transition-all ${
                              s4Diagnoses[smp.id] === opt.val
                                ? 'border-blue-500 bg-blue-500/20 text-white font-bold'
                                : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                {!s4Submitted ? (
                  <Button
                    disabled={Object.keys(s4Diagnoses).length < 4}
                    onClick={() => {
                      if (!requireMeterKnob('DIODE')) return;
                      const allCorrect = E01_SAMPLES.every(
                        (smp) => s4Diagnoses[smp.id] === smp.actualType
                      );
                      if (allCorrect) {
                        setS4Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('BLIND_DIODE_FAULT_DIAGNOSIS', { s4Diagnoses });
                      } else {
                        sounds.playFailureSound?.();
                        assessment.recordWrong('blind_test');
                        alert('诊断有误，请重新对测不准的样件对调表笔复验！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    提交四组诊断报告
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>全组盲测分类准确！具备专业板级元器件检修能力！</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('blind_test');
                        assessment.startStage('transfer', 'transfer');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      进入步骤 5：实车工程修复与交付 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 5：实车工程修复与交车工单闭环 */}
      {currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    实车工单：改装示宽灯连续烧损排故
                  </span>
                  <span className="text-xs text-rose-400 font-mono font-bold">故障代码: B1388-13</span>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-3">
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">报修现象:</span> 客户自行改装的 LED 示宽灯装车通电仅 20 分钟即灯珠爆裂冒烟，连续换了 3 批灯珠全部烧黑！
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">排查操作:</span> 请用万用表电阻挡 (2kΩ) 测量电路板上的限流电阻 R。
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!requireMeterKnob('OHM_2K')) return;
                        setS5Measured(true);
                        sounds.playToggleSound?.();
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs"
                    >
                      测量在板限流电阻 R
                    </Button>

                    {s5Measured && (
                      <div className="text-xs font-mono">
                        实测阻值:{' '}
                        <span className="text-rose-400 font-bold font-mono">
                          {s5Repaired ? '470.0 Ω (正常)' : '10.2 Ω (严重偏小！阻值错误)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {s5Measured && !s5Repaired && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                    <div className="text-xs text-amber-300 font-bold">
                      根因查明：前序改装人员误用了 10Ω 小电阻，导致 LED 工作电流达到 (12-2)/10 = 1000mA (1A)，超额定50倍瞬间烧毁！请从备料库选用规范电阻更换：
                    </div>
                    <div className="flex gap-2">
                      {[
                        { r: 470, label: '470Ω 金属膜高稳定限流电阻 (推荐标配)' },
                        { r: 20, label: '20Ω 低阻值电阻' },
                        { r: 2200, label: '2.2kΩ 大电阻 (亮度过暗)' },
                      ].map((item) => (
                        <button
                          key={item.r}
                          onClick={() => {
                            setS5SelectedResistor(item.r);
                            sounds.playToggleSound?.();
                          }}
                          className={`p-2 rounded-lg border text-xs text-left transition-all ${
                            s5SelectedResistor === item.r
                              ? 'border-emerald-500 bg-emerald-500/20 text-white font-bold'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      disabled={!s5SelectedResistor}
                      onClick={() => {
                        if (s5SelectedResistor === 470) {
                          setS5Repaired(true);
                          sounds.playSuccessSound?.();
                        } else {
                          sounds.playFailureSound?.();
                          alert('所选阻值不符合设计规范！请选择 470Ω 限流电阻！');
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      焊接更换选定电阻
                    </Button>
                  </div>
                )}

                {s5Repaired && (
                  <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-emerald-300">
                        ✓ 470Ω 规范电阻已焊接就绪，请闭合点火开关通电复验
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        复验指标: 工作电流应稳定在 20~22mA，LED 发光清澈均匀。
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5PowerOn(!s5PowerOn);
                        sounds.playToggleSound?.();
                      }}
                      className={s5PowerOn ? 'bg-amber-600 text-white text-xs' : 'bg-blue-600 text-white text-xs'}
                    >
                      {s5PowerOn ? '断开点火电源' : '通电试机复验'}
                    </Button>
                  </div>
                )}
              </div>

              {s5PowerOn && (
                <div className="flex items-center gap-4 pt-4 border-t border-slate-800 text-xs font-mono">
                  <div className="text-emerald-400 font-bold">LED 点亮正常 💡</div>
                  <div>工作电流: <span className="text-cyan-400 font-bold">21.3 mA</span></div>
                  <div>温升监控: <span className="text-emerald-400 font-bold">32°C (低温稳定)</span></div>
                </div>
              )}
            </div>

            {/* 右侧交付工单签字 */}
            <div className="lg:col-span-5 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  维修质量交付单
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  核对维修项目与出厂安全标准：
                </p>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">故障部位:</span>
                    <span className="text-slate-200 font-bold">示宽灯驱动板限流电阻</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">更换件号:</span>
                    <span className="text-slate-200 font-bold">470Ω / 1W 金属膜电阻</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">带载电流复验:</span>
                    <span className="text-emerald-400 font-mono font-bold">21.3 mA (合格)</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">绝缘与耐温:</span>
                    <span className="text-emerald-400 font-bold">导热硅胶固化防护完成</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sign"
                    disabled={!s5PowerOn || s5Submitted}
                    checked={s5Signed}
                    onChange={(e) => setS5Signed(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <label htmlFor="sign" className="text-xs text-slate-300 cursor-pointer">
                    维修技师已完成通电试机，确认无过热烧毁隐患，同意交车签字
                  </label>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                {!s5Submitted ? (
                  <Button
                    disabled={!s5Signed || !s5PowerOn}
                    onClick={() => {
                      setS5Submitted(true);
                      sounds.playSuccessSound?.();
                      onStepComplete('ENGINEERING_REPAIR_AND_DELIVERY', {
                        s5SelectedResistor,
                        s5PowerOn,
                        s5Repaired,
                      });
                      assessment.completeStage('transfer');
                      const finalResult = assessment.completeLevel();
                      onComplete?.(finalResult);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    签字交车并生成实训报告
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>交车成功！整车示宽灯回路完全符合主机厂电气标准！</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
