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
import {
  type E02Step,
  E02_SAMPLES,
  calculateTauSeconds,
  calculateVcCharging,
} from './e02Training';
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { evaluateMeterGuard } from '@/src/game/instruments/meterGuard';

interface E02CapacitorSceneProps {
  currentStep: E02Step;
  onStepComplete: (step: E02Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onComplete?: (result: LevelAssessmentResult) => void;
  hintRequested?: boolean;
}

export function E02CapacitorScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onComplete,
  hintRequested = false,
}: E02CapacitorSceneProps) {
  const assessment = useLevelAssessment('E02');
  // Multimeter knob: 'OFF' | 'CAP_F' | 'OHM_20K' | 'DCV_20'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'CAP_F' | 'OHM_20K' | 'DCV_20'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Step 1: Storage & Delay
  const [s1PowerState, setS1PowerState] = useState<'OFF' | 'CHARGING' | 'DISCHARGING'>('OFF');
  const [s1Voltage, setS1Voltage] = useState<number>(0);
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Step 2: Multimeter Test & Safe Discharge
  const [s2Discharged, setS2Discharged] = useState<boolean>(false);
  const [s2TestMode, setS2TestMode] = useState<'CAP' | 'RESISTANCE'>('CAP');
  const [s2Choice, setS2Choice] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: RC Time Constant
  const [s3R, setS3R] = useState<number>(10000); // 10k
  const [s3C, setS3C] = useState<number>(470); // 470uF
  const [s3SimTime, setS3SimTime] = useState<number>(4.7);
  const [s3Choice, setS3Choice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Step 4: Blind Fault Diagnosis
  const [s4SampleIndex, setS4SampleIndex] = useState<number>(0);
  const [s4Diagnoses, setS4Diagnoses] = useState<Record<string, string>>({});
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Step 5: Engineering Repair
  const [s5Measured, setS5Measured] = useState<boolean>(false);
  const [s5SelectedPart, setS5SelectedPart] = useState<string | null>(null);
  const [s5Repaired, setS5Repaired] = useState<boolean>(false);
  const [s5Tested, setS5Tested] = useState<boolean>(false);
  const [s5Signed, setS5Signed] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  // Step 1 discharge animation loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (s1PowerState === 'CHARGING') {
      timer = setInterval(() => {
        setS1Voltage((v) => Math.min(12, v + 2.0));
      }, 100);
    } else if (s1PowerState === 'DISCHARGING') {
      timer = setInterval(() => {
        setS1Voltage((v) => Math.max(0, v - 0.4));
      }, 150);
    }
    return () => clearInterval(timer);
  }, [s1PowerState]);

  useEffect(() => {
    if (hintRequested) {
      const stageMap: Record<E02Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
        CAPACITOR_STORAGE_COGNITION: 'cognition',
        MULTIMETER_CAPACITANCE_TEST: 'standard',
        RC_TIME_CONSTANT_CURVE: 'calculation',
        BLIND_CAPACITOR_FAULT_DIAGNOSIS: 'blind_test',
        ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
      };
      assessment.requestHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, assessment]);

  // Multimeter guard
  const requireMeterKnob = (required: ('CAP_F' | 'OHM_20K' | 'DCV_20') | ('CAP_F' | 'OHM_20K' | 'DCV_20')[]): boolean => {
    const stageMap: Record<E02Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
      CAPACITOR_STORAGE_COGNITION: 'cognition',
      MULTIMETER_CAPACITANCE_TEST: 'standard',
      RC_TIME_CONSTANT_CURVE: 'calculation',
      BLIND_CAPACITOR_FAULT_DIAGNOSIS: 'blind_test',
      ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
    };
    const guard = evaluateMeterGuard({
      currentMode: meterKnob,
      expectedMode: required,
      circuitPowered: currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' ? s5Tested : false,
      resistanceMeasurement: Array.isArray(required) ? required.some(r => r === 'OHM_20K' || r === 'CAP_F') : (required === 'OHM_20K' || required === 'CAP_F'),
    });
    if (!guard.allowed) {
      assessment.recordMeterBlocked(stageMap[currentStep]);
      setMeterWarning(guard.message);
      sounds.playFailureSound?.();
      return false;
    }
    setMeterWarning(null);
    return true;
  };

  const currentTau = calculateTauSeconds(s3R, s3C);
  const currentSimVc = calculateVcCharging(12.0, currentTau, s3SimTime);
  const activeSample = E02_SAMPLES[s4SampleIndex];

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-slate-100 shadow-2xl backdrop-blur-md">
      {/* 顶部数字万用表状态栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800/80 rounded-xl border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
              汽车数字万用表 (DMM-920 电容高精度型)
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
                {meterKnob === 'CAP_F' && '电容容量测量挡 (-|( - F)'}
                {meterKnob === 'OHM_20K' && '电阻 20kΩ 挡 (充放电动态)'}
                {meterKnob === 'DCV_20' && '直流电压 20V 挡 (V=)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">旋钮挡位:</span>
          {(['OFF', 'CAP_F', 'OHM_20K', 'DCV_20'] as const).map((knob) => (
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

      {/* 步骤 1：电容器储能与延时放电认知 */}
      {currentStep === 'CAPACITOR_STORAGE_COGNITION' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 flex flex-col justify-between p-6 bg-slate-950/80 rounded-2xl border border-slate-800 min-h-[360px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-blue-400 tracking-wider">
                  实物实验：电容充放电与指示灯延时发光
                </span>
                <span className="text-xs text-slate-400">供电: 12V 直流</span>
              </div>

              {/* 动态可视化电路 */}
              <div className="relative w-full h-52 flex items-center justify-center my-4 bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden">
                <svg className="w-full h-full max-w-lg" viewBox="0 0 500 200">
                  {/* 导线 */}
                  <path
                    d="M 50 100 L 140 100 M 200 100 L 320 100 M 320 100 L 320 160 M 320 100 L 420 100"
                    stroke={s1Voltage > 1.0 ? '#10b981' : '#64748b'}
                    strokeWidth="4"
                    fill="none"
                  />
                  {/* 电源 */}
                  <rect x="20" y="70" width="30" height="60" rx="4" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
                  <text x="26" y="105" fill="#f8fafc" fontSize="12" fontWeight="bold">12V</text>

                  {/* 开关 */}
                  <g transform="translate(140, 90)">
                    <circle cx="5" cy="10" r="4" fill="#94a3b8" />
                    <circle cx="55" cy="10" r="4" fill="#94a3b8" />
                    <line
                      x1="5"
                      y1="10"
                      x2="55"
                      y2={s1PowerState === 'CHARGING' ? '10' : '0'}
                      stroke={s1PowerState === 'CHARGING' ? '#10b981' : '#f43f5e'}
                      strokeWidth="4"
                    />
                    <text x="15" y="-5" fill="#cbd5e1" fontSize="10">电源开关</text>
                  </g>

                  {/* 电解电容 (并联在回路中) */}
                  <g transform="translate(300, 110)">
                    <rect x="5" y="10" width="30" height="45" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                    <line x1="20" y1="0" x2="20" y2="10" stroke="#38bdf8" strokeWidth="3" />
                    {/* 防爆阀纹 */}
                    <line x1="12" y1="20" x2="28" y2="20" stroke="#f43f5e" strokeWidth="2" />
                    <text x="10" y="40" fill="#38bdf8" fontSize="9" fontWeight="bold">470μF</text>
                    <text x="-15" y="35" fill="#94a3b8" fontSize="8">电解电容</text>
                  </g>

                  {/* 迎宾指示灯 */}
                  <g transform="translate(420, 70)">
                    <circle
                      cx="25"
                      cy="30"
                      r="22"
                      fill={s1Voltage > 1.5 ? '#facc15' : '#334155'}
                      opacity={Math.min(1, Math.max(0.2, s1Voltage / 12))}
                      stroke={s1Voltage > 1.5 ? '#eab308' : '#64748b'}
                      strokeWidth="3"
                    />
                    <text x="10" y="34" fill={s1Voltage > 1.5 ? '#0f172a' : '#94a3b8'} fontSize="10" fontWeight="bold">
                      {s1Voltage > 1.5 ? '💡 发光' : '🌑 熄灭'}
                    </text>
                  </g>
                </svg>
              </div>

              {/* 控制按钮与电容电压 */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-4 text-sm font-mono">
                  <div>
                    电容端电压: <span className="text-emerald-400 font-bold">{s1Voltage.toFixed(1)} V</span>
                  </div>
                  <div>
                    状态:{' '}
                    <span className="text-cyan-400 font-bold">
                      {s1PowerState === 'CHARGING' && '电源接入中 (迅速充满)'}
                      {s1PowerState === 'DISCHARGING' && '电源已断开 (电容延时放电中)'}
                      {s1PowerState === 'OFF' && '电荷已耗尽 (灯熄灭)'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setS1PowerState('CHARGING');
                      sounds.playToggleSound?.();
                    }}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
                  >
                    接通电源充电
                  </Button>
                  <Button
                    onClick={() => {
                      setS1PowerState('DISCHARGING');
                      sounds.playToggleSound?.();
                    }}
                    size="sm"
                    variant="outline"
                    className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                  >
                    切断主电源 (观察延时)
                  </Button>
                </div>
              </div>
            </div>

            {/* 右侧零剧透知识验证 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  物理现象认知判定
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  断开主电源后指示灯并没有立刻熄灭，根本物理原因是什么？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '并联的电容器在通电时储存了电荷，断电后向指示灯持续释放电能' },
                    { id: 'B', text: '导线电阻产生了新的自感电动势直接给灯供电' },
                    { id: 'C', text: '灯丝内部的电子在断电后自发无限加速' },
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
                        onStepComplete('CAPACITOR_STORAGE_COGNITION', { s1Choice, s1Voltage });
                      } else {
                        assessment.recordWrong('cognition');
                        sounds.playFailureSound?.();
                        alert('判定不准确，这是典型的电容极板电荷存储与释放过程！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    提交认知判定
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>判定正确！电容器通过电极板储存电荷，是汽车延时与平波的核心部件！</span>
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

      {/* 步骤 2：万用表电容测量与规范放电 */}
      {currentStep === 'MULTIMETER_CAPACITANCE_TEST' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    安全检测台：电容放电防电弧与容量测定
                  </span>
                  <span className="text-xs text-slate-400">
                    放电状态: {s2Discharged ? '已执行安全放电 (残存0V)' : '未放电 (可能存有电荷！)'}
                  </span>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 mb-4 flex items-center justify-between">
                  <div className="text-xs text-slate-300">
                    <div className="font-bold text-amber-400 mb-1">⚠️ 安全操作规程:</div>
                    测量大容量电容前必须短接两极放电，严禁带残存高电压直接接入万用表！
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setS2Discharged(true);
                      sounds.playToggleSound?.();
                    }}
                    className={
                      s2Discharged
                        ? 'bg-emerald-600 text-white text-xs'
                        : 'bg-amber-600 hover:bg-amber-500 text-white text-xs animate-pulse'
                    }
                  >
                    {s2Discharged ? '✓ 已安全充分放电' : '点击执行安全放电'}
                  </Button>
                </div>

                {/* 模式选择 */}
                <div className="flex gap-2 mb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setS2TestMode('CAP');
                      sounds.playToggleSound?.();
                    }}
                    className={`text-xs ${s2TestMode === 'CAP' ? 'border-blue-500 text-blue-300' : 'text-slate-400'}`}
                  >
                    容量测试模式 (F)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setS2TestMode('RESISTANCE');
                      sounds.playToggleSound?.();
                    }}
                    className={`text-xs ${s2TestMode === 'RESISTANCE' ? 'border-blue-500 text-blue-300' : 'text-slate-400'}`}
                  >
                    电阻挡充放电动态回弹模式 (Ω)
                  </Button>
                </div>

                {/* 万用表表头 */}
                <div className="p-6 bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-sm mx-auto shadow-inner flex flex-col items-center">
                  <div className="w-full h-24 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center justify-center font-mono">
                    <span className="text-4xl font-black text-emerald-400 tracking-wider">
                      {meterKnob === 'OFF' && '----'}
                      {!s2Discharged && meterKnob !== 'OFF' && (
                        <span className="text-rose-400 text-xl font-sans">请先放电！</span>
                      )}
                      {s2Discharged && meterKnob === 'CAP_F' && (s2TestMode === 'CAP' ? '468.5 μF' : '----')}
                      {s2Discharged && meterKnob === 'OHM_20K' && (s2TestMode === 'RESISTANCE' ? '0.2k -> OL' : '----')}
                      {s2Discharged && meterKnob === 'DCV_20' && '0.00 V'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {s2Discharged && meterKnob === 'CAP_F' && '标称 470μF (误差在±5%内，合格)'}
                    {s2Discharged && meterKnob === 'OHM_20K' && '阻值迅速由小变大至开路 (充放电正常)'}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-4 border-t border-slate-800">
                操作要领: 测容量需将旋钮切至 <span className="text-blue-400 font-bold">[CAP_F]</span> 挡；观察回弹切至 <span className="text-blue-400 font-bold">[OHM_20K]</span> 挡。
              </div>
            </div>

            {/* 右侧零剧透判定 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  测量规范与性能评判
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  使用万用表电阻挡检验电容器好坏时，正常电容应呈现何种读数规律？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '表头先显示较小阻值，随后随着内部逐渐充满电，阻值逐渐增大直至显示 OL' },
                    { id: 'B', text: '表头持续显示 0.0Ω 并发出刺耳短路蜂鸣' },
                    { id: 'C', text: '无论怎么接表头始终瞬间显示负数电压' },
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
                      if (!s2Discharged) {
                        assessment.recordWrong('standard');
                        alert('请先点击上方按钮执行安全放电！');
                        return;
                      }
                      if (!requireMeterKnob(['CAP_F', 'OHM_20K'])) return;
                      if (s2Choice === 'A') {
                        setS2Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('MULTIMETER_CAPACITANCE_TEST', { s2Choice, s2Discharged });
                      } else {
                        assessment.recordWrong('standard');
                        sounds.playFailureSound?.();
                        alert('判别有误！正常电容测阻时有阻值从低到高回弹至 OL 的动态过程！');
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
                      <span>检测规范达标！放电严密，容量及充放电动态回弹判定准确无误。</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('standard');
                        assessment.startStage('calculation');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      进入步骤 3：RC 时间常数分析 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 3：RC 时间常数定量分析 */}
      {currentStep === 'RC_TIME_CONSTANT_CURVE' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    一阶 RC 暂态分析仪：时间常数 τ = R × C 曲线
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    当前 τ = {currentTau} 秒 (1τ 电压 ≈ 7.58V)
                  </span>
                </div>

                {/* 调节滑块 */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/80 rounded-xl border border-slate-800 mb-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>电阻 R:</span>
                      <span className="font-mono font-bold text-cyan-400">{(s3R / 1000).toFixed(0)} kΩ</span>
                    </div>
                    <input
                      type="range"
                      min="2000"
                      max="20000"
                      step="1000"
                      value={s3R}
                      onChange={(e) => setS3R(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>电容 C:</span>
                      <span className="font-mono font-bold text-blue-400">{s3C} μF</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="1000"
                      step="50"
                      value={s3C}
                      onChange={(e) => setS3C(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </div>

                {/* 示波器波形画布 */}
                <div className="relative w-full h-40 bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between overflow-hidden">
                  <div className="text-[10px] text-slate-500 font-mono flex justify-between">
                    <span>OSCILLOSCOPE CH1: V_C(t)</span>
                    <span>12.0V FULL SCALE</span>
                  </div>

                  {/* SVG 曲线 */}
                  <svg className="w-full h-24" viewBox="0 0 400 100">
                    {/* 网格 */}
                    <line x1="0" y1="20" x2="400" y2="20" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="0" y1="50" x2="400" y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="0" y1="80" x2="400" y2="80" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                    {/* 指数充电曲线 */}
                    <path
                      d={`M 20 95 Q 120 40, 380 20`}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                    />
                    {/* 1τ 标注点 (63.2%) */}
                    <circle cx="140" cy="48" r="4" fill="#f59e0b" />
                    <text x="150" y="52" fill="#f59e0b" fontSize="10" fontWeight="bold">1τ (63.2% ≈ 7.58V)</text>
                    {/* 5τ 充饱点 */}
                    <circle cx="360" cy="21" r="4" fill="#38bdf8" />
                    <text x="310" y="15" fill="#38bdf8" fontSize="10">5τ 充饱 (12V)</text>
                  </svg>

                  <div className="flex justify-between items-center text-xs font-mono pt-1">
                    <span className="text-slate-400">时间轴 t:</span>
                    <input
                      type="range"
                      min="0"
                      max={currentTau * 5}
                      step="0.1"
                      value={s3SimTime}
                      onChange={(e) => setS3SimTime(parseFloat(e.target.value))}
                      className="w-48 accent-emerald-500"
                    />
                    <span className="text-emerald-400 font-bold">
                      t={s3SimTime.toFixed(1)}s, Vc={currentSimVc.toFixed(2)}V
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-4 border-t border-slate-800 font-mono">
                理论公式: τ = R × C = {s3R} × {s3C}×10⁻⁶ = {currentTau} 秒。达到 5τ = {(currentTau * 5).toFixed(1)} 秒时彻底充饱。
              </div>
            </div>

            {/* 右侧定量计算题 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  时间常数计算工单
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  某汽车雨刮间歇延时控制器采用 R = 10kΩ (10000Ω) 和 C = 470μF (0.00047F)，其时间常数 τ 是多少秒？充到 63.2% 供电电压需要多长时间？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: 'τ = 4.7 秒，充电至 63.2% 所需时间正好为 1τ = 4.7 秒' },
                    { id: 'B', text: 'τ = 0.047 秒' },
                    { id: 'C', text: 'τ = 470 秒' },
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
                        onStepComplete('RC_TIME_CONSTANT_CURVE', { s3Choice, currentTau });
                      } else {
                        assessment.recordWrong('calculation');
                        sounds.playFailureSound?.();
                        alert('计算有误！τ = 10000 × 0.00047 = 4.7 秒！');
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
                      <span>计算准确！τ = 4.7s，1τ 拐点电压达到 63.2%，定量设计完成！</span>
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

      {/* 步骤 4：典型故障盲测排查 */}
      {currentStep === 'BLIND_CAPACITOR_FAULT_DIAGNOSIS' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    实训测试台：4 组未知电容故障盲测工位
                  </span>
                  <span className="text-xs text-slate-400">标称值均为 470μF</span>
                </div>

                {/* 样件切换 */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {E02_SAMPLES.map((smp, idx) => (
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

                {/* 测量仪表显示 */}
                <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl flex flex-col items-center">
                  <div className="text-xs text-slate-400 mb-2">
                    测试对象: <span className="text-white font-bold">{activeSample.name}</span>
                  </div>
                  <div className="w-48 h-20 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center justify-center font-mono text-3xl font-black text-emerald-400">
                    {meterKnob === 'CAP_F' && `${activeSample.measuredUf} μF`}
                    {meterKnob === 'OHM_20K' && (activeSample.resistanceOhm < 10 ? '0.8 Ω (短路)' : 'OL')}
                    {meterKnob !== 'CAP_F' && meterKnob !== 'OHM_20K' && (
                      <span className="text-rose-400 text-sm">请切至电容/电阻挡</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-4 border-t border-slate-800">
                故障分类提示: 容量接近标称为正常；容量极小(如14.5μF)为电解液干涸失效；阻值为 0.8Ω 为击穿短路；容量 0 且电阻开路为内部断路。
              </div>
            </div>

            {/* 右侧诊断填报工单 */}
            <div className="lg:col-span-5 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  电容盲测质量分析卡
                </h4>
                <p className="text-xs text-slate-400 mb-3">判定 4 组未知样件的内部物理状态：</p>

                <div className="space-y-3">
                  {E02_SAMPLES.map((smp) => (
                    <div key={smp.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                      <div className="font-bold text-slate-200 mb-1.5">{smp.name}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { val: 'GOOD', label: '容量良好' },
                          { val: 'SHORT', label: '击穿短路' },
                          { val: 'OPEN', label: '内部极片断路' },
                          { val: 'DEGRADED', label: '干涸老化容量衰减' },
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
                      if (!requireMeterKnob(['CAP_F', 'OHM_20K'])) return;
                      const allCorrect = E02_SAMPLES.every(
                        (smp) => s4Diagnoses[smp.id] === smp.actualType
                      );
                      if (allCorrect) {
                        setS4Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('BLIND_CAPACITOR_FAULT_DIAGNOSIS', { s4Diagnoses });
                      } else {
                        assessment.recordWrong('blind_test');
                        sounds.playFailureSound?.();
                        alert('诊断有误！请仔细核对实测容量与漏电阻值！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    提交四组诊断结论
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>全组盲测分类 100% 正确！具备板级电容精确判别能力！</span>
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
                    实车工单：车身控制模块 (BCM) 顶灯渐隐延时失效
                  </span>
                  <span className="text-xs text-rose-400 font-mono font-bold">故障代码: B10A3-11</span>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-3">
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">故障现象:</span> 车门关闭并锁车后，顶棚迎宾灯瞬间熄灭，完全丧失原车 15 秒平滑渐隐延时功能。
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">电路原理:</span> 延时电路由 100kΩ 上拉电阻与 150μF/25V 延时电容构成。
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!requireMeterKnob('OHM_20K')) return;
                        setS5Measured(true);
                        sounds.playToggleSound?.();
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs"
                    >
                      电阻挡在板测量延时电容 C
                    </Button>

                    {s5Measured && (
                      <div className="text-xs font-mono">
                        实测两极电阻:{' '}
                        <span className="text-rose-400 font-bold">
                          {s5Repaired ? '4.8 kΩ -> OL (充放电正常)' : '0.5 Ω (严重短路击穿！)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {s5Measured && !s5Repaired && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                    <div className="text-xs text-amber-300 font-bold">
                      根因确诊：原装延时电解电容被发动机舱高温击穿短路！请从电子元器件库选用合格件更换：
                    </div>
                    <div className="flex gap-2">
                      {[
                        { id: 'PART_A', label: '150μF / 35V 高温 105°C 汽车级电容 (推荐)' },
                        { id: 'PART_B', label: '10μF / 16V 小型电容 (容量过小延时不足1秒)' },
                        { id: 'PART_C', label: '1000μF / 6.3V 电脑低压电容 (耐压不足必爆)' },
                      ].map((part) => (
                        <button
                          key={part.id}
                          onClick={() => {
                            setS5SelectedPart(part.id);
                            sounds.playToggleSound?.();
                          }}
                          className={`p-2 rounded-lg border text-xs text-left transition-all ${
                            s5SelectedPart === part.id
                              ? 'border-emerald-500 bg-emerald-500/20 text-white font-bold'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          {part.label}
                        </button>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      disabled={!s5SelectedPart}
                      onClick={() => {
                        if (s5SelectedPart === 'PART_A') {
                          setS5Repaired(true);
                          sounds.playSuccessSound?.();
                        } else {
                          assessment.recordWrong('transfer');
                          sounds.playFailureSound?.();
                          alert('配件参数错误！必须选择 150μF/35V 规格！');
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      规范焊装选定电容 (注意极性)
                    </Button>
                  </div>
                )}

                {s5Repaired && (
                  <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-emerald-300">
                        ✓ 150μF 汽车级电容已完成焊装并完成极性复核，请进行关门锁车延时测试
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        复验验收标准: 顶灯维持明亮并在 15 秒内缓慢渐隐平滑熄灭。
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5Tested(true);
                        sounds.playToggleSound?.();
                      }}
                      className={s5Tested ? 'bg-emerald-600 text-white text-xs' : 'bg-blue-600 text-white text-xs'}
                    >
                      {s5Tested ? '✓ 延时测试完成 (14.8s)' : '执行关门锁车延时测试'}
                    </Button>
                  </div>
                )}
              </div>

              {s5Tested && (
                <div className="flex items-center gap-4 pt-4 border-t border-slate-800 text-xs font-mono">
                  <div className="text-emerald-400 font-bold">渐隐延时功能恢复正常 💡</div>
                  <div>实测延时时长: <span className="text-cyan-400 font-bold">14.8 秒 (标称 15s)</span></div>
                  <div>电解液温升: <span className="text-emerald-400 font-bold">正常 (无过热)</span></div>
                </div>
              )}
            </div>

            {/* 右侧交付签署 */}
            <div className="lg:col-span-5 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  工程交付验收单
                </h4>
                <p className="text-xs text-slate-400 mb-3">核验本次板级电容维修项目：</p>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">故障部位:</span>
                    <span className="text-slate-200 font-bold">BCM 延时电解电容 (短路击穿)</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">更换规格:</span>
                    <span className="text-slate-200 font-bold">150μF / 35V / 105°C 耐高温</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">实测延时:</span>
                    <span className="text-emerald-400 font-mono font-bold">14.8 秒 (合格)</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">防爆与极性:</span>
                    <span className="text-emerald-400 font-bold">极性长正短负校核无误</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="e02-sign"
                    disabled={!s5Tested || s5Submitted}
                    checked={s5Signed}
                    onChange={(e) => setS5Signed(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <label htmlFor="e02-sign" className="text-xs text-slate-300 cursor-pointer">
                    维修技师已核对极性与延时指标，确认合格准予交车
                  </label>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                {!s5Submitted ? (
                  <Button
                    disabled={!s5Signed || !s5Tested}
                    onClick={() => {
                      setS5Submitted(true);
                      sounds.playSuccessSound?.();
                      assessment.completeStage('transfer');
                      const finalResult = assessment.completeLevel();
                      onComplete?.(finalResult);
                      onStepComplete('ENGINEERING_REPAIR_AND_DELIVERY', {
                        s5SelectedPart,
                        s5Tested,
                        s5Repaired,
                      });
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    签署交车工单
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>交车成功！迎宾灯渐隐延时平稳可靠，满足客户维修诉求！</span>
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
