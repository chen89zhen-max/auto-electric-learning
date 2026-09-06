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
import {
  type E03Step,
  E03_SAMPLES,
  calculateRectifierOutput,
} from './e03Training';
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { evaluateMeterGuard } from '@/src/game/instruments/meterGuard';

interface E03RectifierSceneProps {
  currentStep: E03Step;
  onStepComplete: (step: E03Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onComplete?: (result: LevelAssessmentResult) => void;
  hintRequested?: boolean;
}

export function E03RectifierScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onComplete,
  hintRequested = false,
}: E03RectifierSceneProps) {
  const assessment = useLevelAssessment('E03');
  // Multimeter knob: 'OFF' | 'DCV_20' | 'ACV_20' | 'DIODE'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'DCV_20' | 'ACV_20' | 'DIODE'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Step 1: Topology
  const [s1Topology, setS1Topology] = useState<'HALF_WAVE' | 'FULL_BRIDGE'>('HALF_WAVE');
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Step 2: Bridge Testing
  const [s2SelectedArm, setS2SelectedArm] = useState<'D1' | 'D2' | 'D3' | 'D4'>('D1');
  const [s2ProbeDirection, setS2ProbeDirection] = useState<'FORWARD' | 'REVERSE'>('FORWARD');
  const [s2Choice, setS2Choice] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: Capacitor & Calculations
  const [s3HasCapacitor, setS3HasCapacitor] = useState<boolean>(false);
  const [s3Choice, setS3Choice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Step 4: Blind Fault Diagnosis
  const [s4SampleIndex, setS4SampleIndex] = useState<number>(0);
  const [s4Diagnoses, setS4Diagnoses] = useState<Record<string, string>>({});
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Step 5: Engineering Repair
  const [s5Measured, setS5Measured] = useState<boolean>(false);
  const [s5Repaired, setS5Repaired] = useState<boolean>(false);
  const [s5EngineRunning, setS5EngineRunning] = useState<boolean>(false);
  const [s5Signed, setS5Signed] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  React.useEffect(() => {
    if (hintRequested) {
      const stageMap: Record<E03Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
        RECTIFIER_TOPOLOGY_COGNITION: 'cognition',
        BRIDGE_WIRING_AND_MULTIMETER_TEST: 'standard',
        FILTER_CAPACITOR_AND_VOLTAGE_CALC: 'calculation',
        BLIND_RECTIFIER_FAULT_DIAGNOSIS: 'blind_test',
        ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
      };
      assessment.requestHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, assessment]);

  const requireMeterKnob = (required: ('DCV_20' | 'ACV_20' | 'DIODE') | ('DCV_20' | 'ACV_20' | 'DIODE')[]): boolean => {
    const stageMap: Record<E03Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
      RECTIFIER_TOPOLOGY_COGNITION: 'cognition',
      BRIDGE_WIRING_AND_MULTIMETER_TEST: 'standard',
      FILTER_CAPACITOR_AND_VOLTAGE_CALC: 'calculation',
      BLIND_RECTIFIER_FAULT_DIAGNOSIS: 'blind_test',
      ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
    };
    const guard = evaluateMeterGuard({
      currentMode: meterKnob,
      expectedMode: required,
      circuitPowered: currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' ? s5Repaired : false,
      resistanceMeasurement: Array.isArray(required) ? required.includes('DIODE') : required === 'DIODE',
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

  const s3Output = calculateRectifierOutput(12.0, 'FULL_BRIDGE', s3HasCapacitor);
  const activeSample = E03_SAMPLES[s4SampleIndex];

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
              汽车数字万用表 (DMM-930 纹波分析专用)
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
                {meterKnob === 'DCV_20' && '直流电压 20V 挡 (V=)'}
                {meterKnob === 'ACV_20' && '交流电压 20V 挡 (V~ 纹波监测)'}
                {meterKnob === 'DIODE' && '二极管档 (->|- / 🕪)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">旋钮挡位:</span>
          {(['OFF', 'DCV_20', 'ACV_20', 'DIODE'] as const).map((knob) => (
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

      {/* 步骤 1：半波与桥式整流拓扑及波形认知 */}
      {currentStep === 'RECTIFIER_TOPOLOGY_COGNITION' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 flex flex-col justify-between p-6 bg-slate-950/80 rounded-2xl border border-slate-800 min-h-[360px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-blue-400 tracking-wider">
                  拓扑波形对比：半波 vs 桥式全波
                </span>
                <span className="text-xs text-slate-400">变压器次级 AC 12V 50Hz</span>
              </div>

              {/* 动态波形可视化 */}
              <div className="relative w-full h-52 flex flex-col items-center justify-center my-4 bg-slate-900/60 rounded-xl border border-slate-800/80 p-3">
                <div className="text-xs text-slate-500 font-mono flex justify-between w-full mb-1">
                  <span>OSCILLOSCOPE CH1: OUTPUT WAVEFORM</span>
                  <span>{s1Topology === 'HALF_WAVE' ? '半波脉动 (基波50Hz)' : '桥式全波翻折 (倍频100Hz)'}</span>
                </div>

                <svg className="w-full h-36" viewBox="0 0 400 120">
                  {/* 零线 */}
                  <line x1="10" y1="80" x2="390" y2="80" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="15" y="75" fill="#94a3b8" fontSize="9">0V</text>

                  {s1Topology === 'HALF_WAVE' ? (
                    <>
                      {/* 半波：正半周有，负半周为零 */}
                      <path
                        d="M 30 80 Q 60 20, 90 80 L 150 80 Q 180 20, 210 80 L 270 80 Q 300 20, 330 80 L 390 80"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="3"
                      />
                      <text x="100" y="95" fill="#f43f5e" fontSize="10">负半周被阻断 (截止)</text>
                    </>
                  ) : (
                    <>
                      {/* 全波桥式：负半周翻折 */}
                      <path
                        d="M 30 80 Q 60 20, 90 80 Q 120 20, 150 80 Q 180 20, 210 80 Q 240 20, 270 80 Q 300 20, 330 80 Q 360 20, 390 80"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                      />
                      <text x="110" y="95" fill="#10b981" fontSize="10">正负半周全波翻折连续利用</text>
                    </>
                  )}
                </svg>
              </div>

              {/* 切换拓扑与平均值参数 */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-4 text-sm font-mono">
                  <div>
                    直流平均电压 Uo:{' '}
                    <span className="text-emerald-400 font-bold">
                      {s1Topology === 'HALF_WAVE' ? '5.4 V (0.45 U₂)' : '10.8 V (0.9 U₂)'}
                    </span>
                  </div>
                  <div>
                    脉动基波频率:{' '}
                    <span className="text-cyan-400 font-bold">
                      {s1Topology === 'HALF_WAVE' ? '50 Hz' : '100 Hz'}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setS1Topology(s1Topology === 'HALF_WAVE' ? 'FULL_BRIDGE' : 'HALF_WAVE');
                    sounds.playToggleSound?.();
                  }}
                  variant="outline"
                  className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                >
                  切换整流拓扑 (当前: {s1Topology === 'HALF_WAVE' ? '单相半波' : '单相桥式全波'})
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
                  在汽车发电机等大功率整流中，为什么普遍采用桥式全波整流而不使用单相半波？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '桥式整流将正负半周全部利用，输出直流电压高(0.9U₂)、脉动频率翻倍更易平滑' },
                    { id: 'B', text: '半波整流需要的二极管耐压比桥式整流低十倍' },
                    { id: 'C', text: '桥式整流内部完全不需要消耗任何电能' },
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
                        onStepComplete('RECTIFIER_TOPOLOGY_COGNITION', { s1Choice, s1Topology });
                      } else {
                        assessment.recordWrong('cognition');
                        sounds.playFailureSound?.();
                        alert('结论有误，请仔细对比半波与桥式整流的输出电压与能量利用率！');
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
                      <span>判定正确！桥式整流实现双向翻折利用，输出电压与频率翻倍！</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('cognition');
                        assessment.startStage('standard');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      进入步骤 2：整流桥搭接测试 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 2：整流桥万用表规范测试 */}
      {currentStep === 'BRIDGE_WIRING_AND_MULTIMETER_TEST' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    实训台：整流桥 4 桥臂二极管万用表检测
                  </span>
                  <span className="text-xs text-slate-400">
                    当前被测桥臂: <span className="text-white font-bold">{s2SelectedArm}</span>
                  </span>
                </div>

                {/* 桥臂选择 */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {(['D1', 'D2', 'D3', 'D4'] as const).map((arm) => (
                    <button
                      key={arm}
                      onClick={() => {
                        setS2SelectedArm(arm);
                        sounds.playToggleSound?.();
                      }}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                        s2SelectedArm === arm
                          ? 'border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-500/40'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      桥臂二极管 {arm}
                    </button>
                  ))}
                </div>

                {/* 万用表表头 */}
                <div className="p-6 bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-sm mx-auto shadow-inner flex flex-col items-center">
                  <div className="w-full h-24 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center justify-center font-mono">
                    <span className="text-4xl font-black text-emerald-400 tracking-wider">
                      {meterKnob !== 'DIODE' ? (
                        <span className="text-rose-400 text-lg font-sans">请切至二极管挡</span>
                      ) : s2ProbeDirection === 'FORWARD' ? (
                        '0.612 V'
                      ) : (
                        'OL'
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {meterKnob === 'DIODE' && (s2ProbeDirection === 'FORWARD' ? '正向导通管压降 (612mV)' : '反向截止阻断 (OL)')}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <Button
                  onClick={() => {
                    setS2ProbeDirection(s2ProbeDirection === 'FORWARD' ? 'REVERSE' : 'FORWARD');
                    sounds.playToggleSound?.();
                  }}
                  variant="outline"
                  className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                >
                  对调表笔方向 (当前: {s2ProbeDirection === 'FORWARD' ? '正向测法' : '反向测法'})
                </Button>
                <div className="text-xs text-slate-400">
                  提示: 正常整流桥必须 4 个桥臂正向全为 ~0.6V，反向全为 OL。
                </div>
              </div>
            </div>

            {/* 右侧零剧透判定 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  整流桥好坏判定规则
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  检测整流桥 4 只二极管时，出现下列哪种读数时可以判定该整流桥损坏？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '其中某只二极管正反向测量均为 0.00V (击穿短路) 或均为 OL (内部断路)' },
                    { id: 'B', text: '所有 4 只二极管正向约 0.6V，反向全部显示 OL' },
                    { id: 'C', text: '对调表笔后屏幕显示 OL' },
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
                        onStepComplete('BRIDGE_WIRING_AND_MULTIMETER_TEST', { s2Choice, s2SelectedArm });
                      } else {
                        assessment.recordWrong('standard');
                        sounds.playFailureSound?.();
                        alert('判别有误！整流桥内部任何一只管击穿或开路，整桥即告报废！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    提交检测结论
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>检测规范掌握到位！4 桥臂均良好，准予进入滤波分析。</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('standard');
                        assessment.startStage('calculation');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      进入步骤 3：滤波电容与输出计算 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 3：滤波电容平滑与电压定量计算 */}
      {currentStep === 'FILTER_CAPACITOR_AND_VOLTAGE_CALC' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    滤波电容平滑实验：次级交流 U₂ = 12V
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setS3HasCapacitor(!s3HasCapacitor);
                      sounds.playToggleSound?.();
                    }}
                    className={s3HasCapacitor ? 'bg-emerald-600 text-white text-xs' : 'bg-slate-700 text-slate-300 text-xs'}
                  >
                    {s3HasCapacitor ? '✓ 滤波电容已接入 (平滑波形)' : '未接滤波电容 (脉动波形)'}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/90 rounded-xl border border-slate-800 mb-4 text-center">
                  <div>
                    <div className="text-xs text-slate-400">直流平均输出 Uo</div>
                    <div className="text-2xl font-mono font-black text-emerald-400">
                      {s3Output.uDc.toFixed(1)} V
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {s3HasCapacitor ? '公式: Uo ≈ 1.2 × U₂' : '公式: Uo ≈ 0.9 × U₂'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">交流纹波电压 Vpp</div>
                    <div className="text-2xl font-mono font-black text-cyan-400">
                      {s3Output.rippleVpp.toFixed(2)} V
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {s3HasCapacitor ? '电容削峰填谷 (纹波压制)' : '剧烈脉动 (无滤波)'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">汽车蓄电池充放电</div>
                    <div className="text-xs font-bold text-amber-300 mt-2">
                      {s3HasCapacitor ? '✓ 达到 14.4V 饱和充电机' : '⚠️ 仅 10.8V 无法给电瓶充电'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-4 border-t border-slate-800 font-mono">
                核心规律: 变压器次级 U₂=12V，桥式整流未滤波时 Uo=0.9×12=10.8V；加入电容后充至峰值放电填谷，带载实测 Uo=1.2×12=14.4V。
              </div>
            </div>

            {/* 右侧定量计算 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  工程设计计算工单
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  汽车交流发电机次级绕组交流有效值为 12V，经桥式整流并接滤波电容后，供给车内用电设备的额定直流电压 Uo 应是多少伏？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: 'Uo ≈ 1.2 × U₂ = 1.2 × 12 = 14.4 V' },
                    { id: 'B', text: 'Uo ≈ 0.45 × U₂ = 5.4 V' },
                    { id: 'C', text: 'Uo ≈ 2.0 × U₂ = 24.0 V' },
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
                        onStepComplete('FILTER_CAPACITOR_AND_VOLTAGE_CALC', { s3Choice, s3HasCapacitor });
                      } else {
                        assessment.recordWrong('calculation');
                        sounds.playFailureSound?.();
                        alert('计算有误！加滤波电容后 Uo ≈ 1.2 × U2 = 14.4V！');
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
                      <span>计算准确！14.4V 是汽车发电机与蓄电池标准充电电压！</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('calculation');
                        assessment.startStage('blind_test');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      进入步骤 4：发电机整流器盲测 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 4：典型故障盲测排查 */}
      {currentStep === 'BLIND_RECTIFIER_FAULT_DIAGNOSIS' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    发电机测试台：4 组未知整流桥盲测工位
                  </span>
                  <span className="text-xs text-slate-400">发动机模拟转速 2000rpm</span>
                </div>

                {/* 样件切换 */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {E03_SAMPLES.map((smp, idx) => (
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

                {/* 仪表显示 */}
                <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl flex flex-col items-center">
                  <div className="text-xs text-slate-400 mb-2">
                    测试对象: <span className="text-white font-bold">{activeSample.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full text-center">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-xs text-slate-400">直流输出电压 (DCV)</div>
                      <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                        {activeSample.dcVoltage} V
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-xs text-slate-400">交流纹波峰峰值 (ACV)</div>
                      <div className={`text-2xl font-mono font-bold mt-1 ${activeSample.acRippleVpp > 1.0 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>
                        {activeSample.acRippleVpp} V
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-4 border-t border-slate-800">
                特征判据: 正常(DC 14.3V, 纹波0.12V)；二极管击穿(纹波高达2.85V)；二极管断路(电压跌至11.2V)；滤波失效(纹波3.60V且呈馒头波)。
              </div>
            </div>

            {/* 右侧诊断报告 */}
            <div className="lg:col-span-5 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  整流桥诊断工单
                </h4>
                <p className="text-xs text-slate-400 mb-3">为 4 组发电机整流桥样件判定故障类型：</p>

                <div className="space-y-3">
                  {E03_SAMPLES.map((smp) => (
                    <div key={smp.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                      <div className="font-bold text-slate-200 mb-1.5">{smp.name}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { val: 'NORMAL', label: '良好无故障' },
                          { val: 'DIODE_SHORT', label: '二极管击穿短路' },
                          { val: 'DIODE_OPEN', label: '二极管烧损开路' },
                          { val: 'CAP_DISCONNECTED', label: '滤波电容脱焊失效' },
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
                      if (!requireMeterKnob(['DIODE', 'DCV_20'])) return;
                      const allCorrect = E03_SAMPLES.every(
                        (smp) => s4Diagnoses[smp.id] === smp.actualType
                      );
                      if (allCorrect) {
                        setS4Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('BLIND_RECTIFIER_FAULT_DIAGNOSIS', { s4Diagnoses });
                      } else {
                        assessment.recordWrong('blind_test');
                        sounds.playFailureSound?.();
                        alert('诊断存在偏差，请重点分析二极管击穿与断路时纹波与电压的差异！');
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
                      <span>全组盲测分类 100% 正确！具备发电机电气故障快速定损能力！</span>
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

      {/* 步骤 5：实车发电机整流器修复与交车工单闭环 */}
      {currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    实车工单：发电机整流二极管击穿导致音响啸叫与亏电
                  </span>
                  <span className="text-xs text-rose-400 font-mono font-bold">故障代码: P0622-00</span>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-3">
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">报修现象:</span> 车辆行驶中音响发出刺耳吹哨啸叫声，且停放一夜后蓄电池严重亏电无法启动。
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">排查操作:</span> 用万用表 ACV 档测量蓄电池两端交流纹波电压。
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!requireMeterKnob('ACV_20')) return;
                        setS5Measured(true);
                        sounds.playToggleSound?.();
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs"
                    >
                      交流电压档测量母线纹波
                    </Button>

                    {s5Measured && (
                      <div className="text-xs font-mono">
                        实测交流纹波:{' '}
                        <span className="text-rose-400 font-bold">
                          {s5Repaired ? '0.08 V (标准合格)' : '2.65 V (严重超标！整流管击穿)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {s5Measured && !s5Repaired && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                    <div className="text-xs text-amber-300 font-bold">
                      根因确诊：发电机负极板第 2 只二极管击穿短路，导致交流电窜入直流电网！请从库房领用原装整流桥板总成更换：
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5Repaired(true);
                        sounds.playSuccessSound?.();
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      领用并规范安装原厂 12V/100A 雪崩二极管整流桥总成
                    </Button>
                  </div>
                )}

                {s5Repaired && (
                  <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-emerald-300">
                        ✓ 新整流桥总成安装完毕并完成扭矩紧固，请起动发动机进行 2000rpm 带载测试
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        复验验收标准: 直流充电电压在 14.0V~14.5V 之间，交流纹波必须小于 0.2V。
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5EngineRunning(!s5EngineRunning);
                        sounds.playToggleSound?.();
                      }}
                      className={s5EngineRunning ? 'bg-emerald-600 text-white text-xs' : 'bg-blue-600 text-white text-xs'}
                    >
                      {s5EngineRunning ? '✓ 发动机运转中 (2000rpm)' : '起动发动机进行复测'}
                    </Button>
                  </div>
                )}
              </div>

              {s5EngineRunning && (
                <div className="flex items-center gap-4 pt-4 border-t border-slate-800 text-xs font-mono">
                  <div className="text-emerald-400 font-bold">充电系统工作正常 ⚡</div>
                  <div>直流输出: <span className="text-emerald-400 font-bold">14.3 V</span></div>
                  <div>交流纹波: <span className="text-cyan-400 font-bold">0.08 V (极佳)</span></div>
                  <div>音响噪音: <span className="text-emerald-400 font-bold">完全消失</span></div>
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
                <p className="text-xs text-slate-400 mb-3">核验整流系统维修质量指标：</p>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">故障部位:</span>
                    <span className="text-slate-200 font-bold">发电机整流桥总成 (二极管击穿)</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">更换配件:</span>
                    <span className="text-slate-200 font-bold">原厂 12V/100A 雪崩整流器</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">充电电压:</span>
                    <span className="text-emerald-400 font-mono font-bold">14.3 V (合格)</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">交流纹波:</span>
                    <span className="text-emerald-400 font-mono font-bold">0.08 V (优秀)</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="e03-sign"
                    disabled={!s5EngineRunning || s5Submitted}
                    checked={s5Signed}
                    onChange={(e) => setS5Signed(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <label htmlFor="e03-sign" className="text-xs text-slate-300 cursor-pointer">
                    维修技师确认交流纹波达标且蓄电池无反向漏电，准予合格交车
                  </label>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                {!s5Submitted ? (
                  <Button
                    disabled={!s5Signed || !s5EngineRunning}
                    onClick={() => {
                      setS5Submitted(true);
                      sounds.playSuccessSound?.();
                      assessment.completeStage('transfer');
                      const finalResult = assessment.completeLevel();
                      onComplete?.(finalResult);
                      onStepComplete('ENGINEERING_REPAIR_AND_DELIVERY', {
                        s5Repaired,
                        s5EngineRunning,
                      });
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    签署交车工单
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>交车成功！整车电磁兼容性与充电系统恢复出厂标准！</span>
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
