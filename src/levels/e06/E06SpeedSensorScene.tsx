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
  type E06Step,
  E06_SAMPLES,
  calculateSpeedFrequency,
} from './e06Training';
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { evaluateMeterGuard } from '@/src/game/instruments/meterGuard';

interface E06SpeedSensorSceneProps {
  currentStep: E06Step;
  onStepComplete: (step: E06Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onComplete?: (result: LevelAssessmentResult) => void;
  hintRequested?: boolean;
}

export function E06SpeedSensorScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onComplete,
  hintRequested = false,
}: E06SpeedSensorSceneProps) {
  const assessment = useLevelAssessment('E06');
  // Multimeter knob: 'OFF' | 'OHM_2K' | 'DCV_20' | 'OSCILLOSCOPE'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'OHM_2K' | 'DCV_20' | 'OSCILLOSCOPE'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Step 1: Sensor Type
  const [s1SensorType, setS1SensorType] = useState<'MAGNETIC_VR' | 'HALL_EFFECT'>('MAGNETIC_VR');
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Step 2: Testing & 60-2 Pattern
  const [s2Rpm, setS2Rpm] = useState<number>(800);
  const [s2Choice, setS2Choice] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: Speed & Gap Calculation
  const [s3Rpm, setS3Rpm] = useState<number>(3000);
  const [s3AirGapMm, setS3AirGapMm] = useState<number>(0.8);
  const [s3Choice, setS3Choice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Step 4: Blind Fault Diagnosis
  const [s4SampleIndex, setS4SampleIndex] = useState<number>(0);
  const [s4Diagnoses, setS4Diagnoses] = useState<Record<string, string>>({});
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Step 5: Engineering Repair
  const [s5Heated, setS5Heated] = useState<boolean>(false);
  const [s5Repaired, setS5Repaired] = useState<boolean>(false);
  const [s5GapAdjusted, setS5GapAdjusted] = useState<boolean>(false);
  const [s5TestDrove, setS5TestDrove] = useState<boolean>(false);
  const [s5Signed, setS5Signed] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  React.useEffect(() => {
    if (hintRequested) {
      const stageMap: Record<E06Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
        MAGNETO_VS_HALL_COGNITION: 'cognition',
        MULTIMETER_AND_OSCILLOSCOPE_TEST: 'standard',
        SPEED_FREQUENCY_AND_GAP_CALC: 'calculation',
        BLIND_SPEED_SENSOR_FAULT_DIAGNOSIS: 'blind_test',
        ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
      };
      assessment.requestHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, assessment]);

  const requireMeterKnob = (required: ('OHM_2K' | 'DCV_20' | 'OSCILLOSCOPE') | ('OHM_2K' | 'DCV_20' | 'OSCILLOSCOPE')[]): boolean => {
    const stageMap: Record<E06Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
      MAGNETO_VS_HALL_COGNITION: 'cognition',
      MULTIMETER_AND_OSCILLOSCOPE_TEST: 'standard',
      SPEED_FREQUENCY_AND_GAP_CALC: 'calculation',
      BLIND_SPEED_SENSOR_FAULT_DIAGNOSIS: 'blind_test',
      ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
    };
    const guard = evaluateMeterGuard({
      currentMode: meterKnob,
      expectedMode: required,
      circuitPowered: currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' ? s5TestDrove : false,
      resistanceMeasurement: Array.isArray(required) ? required.includes('OHM_2K') : required === 'OHM_2K',
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

  const s3Freq = calculateSpeedFrequency(s3Rpm, 58);
  const s3Amplitude = Math.max(0.2, Math.round((4.0 * (0.8 / s3AirGapMm)) * 10) / 10);
  const activeSample = E06_SAMPLES[s4SampleIndex];

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-slate-100 shadow-2xl backdrop-blur-md">
      {/* 顶部数字万用表 / 汽车示波器状态栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800/80 rounded-xl border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
              汽车传感器多功能综合测试仪 (SCOPE-DMM)
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
                {meterKnob === 'OHM_2K' && '电阻 2kΩ 挡 (磁电线圈静态)'}
                {meterKnob === 'DCV_20' && '直流电压 20V 挡 (霍尔供电检测)'}
                {meterKnob === 'OSCILLOSCOPE' && '双通道示波器 (动态脉冲波形)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">旋钮挡位:</span>
          {(['OFF', 'OHM_2K', 'DCV_20', 'OSCILLOSCOPE'] as const).map((knob) => (
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

      {/* 步骤 1：磁电式 vs 霍尔式原理对比 */}
      {currentStep === 'MAGNETO_VS_HALL_COGNITION' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 flex flex-col justify-between p-6 bg-slate-950/80 rounded-2xl border border-slate-800 min-h-[360px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-blue-400 tracking-wider">
                  原理对比：{s1SensorType === 'MAGNETIC_VR' ? '磁电式 (无源两线 正弦交流)' : '霍尔式 (有源三线 数字方波)'}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setS1SensorType('MAGNETIC_VR');
                      sounds.playToggleSound?.();
                    }}
                    className={s1SensorType === 'MAGNETIC_VR' ? 'bg-blue-600 text-white text-xs' : 'bg-slate-800 text-slate-400 text-xs'}
                  >
                    磁电式 (VR)
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setS1SensorType('HALL_EFFECT');
                      sounds.playToggleSound?.();
                    }}
                    className={s1SensorType === 'HALL_EFFECT' ? 'bg-blue-600 text-white text-xs' : 'bg-slate-800 text-slate-400 text-xs'}
                  >
                    霍尔式 (Hall)
                  </Button>
                </div>
              </div>

              {/* 示波器波形对比 */}
              <div className="relative w-full h-52 flex flex-col items-center justify-center my-4 bg-slate-900/60 rounded-xl border border-slate-800/80 p-3">
                <div className="text-[10px] text-slate-500 font-mono flex justify-between w-full mb-1">
                  <span>OSCILLOSCOPE CH1</span>
                  <span>{s1SensorType === 'MAGNETIC_VR' ? '正弦波交流电 (幅值随转速增加)' : '0~5V 数字方波 (幅值恒定)'}</span>
                </div>

                <svg className="w-full h-36" viewBox="0 0 400 120">
                  <line x1="10" y1="60" x2="390" y2="60" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="15" y="55" fill="#94a3b8" fontSize="9">0V</text>

                  {s1SensorType === 'MAGNETIC_VR' ? (
                    <>
                      {/* 连续正弦波 + 缺齿宽波 */}
                      <path
                        d="M 20 60 Q 40 20, 60 60 T 100 60 T 140 60 T 180 60 L 240 60 Q 260 10, 280 60 T 320 60 T 360 60"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="3"
                      />
                      <rect x="195" y="50" width="35" height="20" fill="#f59e0b" opacity="0.2" />
                      <text x="190" y="85" fill="#f59e0b" fontSize="10">60-2 缺齿参考 (TDC)</text>
                    </>
                  ) : (
                    <>
                      {/* 连续方波 + 缺齿平线 */}
                      <path
                        d="M 20 100 L 40 100 L 40 20 L 60 20 L 60 100 L 80 100 L 80 20 L 100 20 L 100 100 L 180 100 L 180 20 L 200 20 L 200 100 L 220 100 L 220 20 L 240 20 L 240 100 L 320 100 L 320 20 L 340 20 L 340 100"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                      />
                      <text x="120" y="85" fill="#10b981" fontSize="10">5V 恒定幅值数字方波</text>
                    </>
                  )}
                </svg>
              </div>

              {/* 特征对比表 */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800 text-xs font-mono">
                <div>接线: <span className="text-white font-bold">{s1SensorType === 'MAGNETIC_VR' ? '2线 (无源+屏蔽)' : '3线 (5V/地/信号)'}</span></div>
                <div>波形: <span className="text-cyan-400 font-bold">{s1SensorType === 'MAGNETIC_VR' ? '正弦交流' : '数字方波'}</span></div>
                <div>幅值特性: <span className="text-amber-300 font-bold">{s1SensorType === 'MAGNETIC_VR' ? '随转速增大' : '恒定 5.0V'}</span></div>
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
                  关于磁电式与霍尔式转速传感器的核心差异，下列哪项描述最为准确？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '磁电式为无源两线制产生正弦交流波且幅值随转速增加；霍尔式需外接供电产生恒定5V方波' },
                    { id: 'B', text: '磁电式需要 12V 供电，霍尔式内部是一段纯铜线' },
                    { id: 'C', text: '霍尔式传感器不能测低速，只有车速超过 100km/h 才有信号' },
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
                        onStepComplete('MAGNETO_VS_HALL_COGNITION', { s1Choice, s1SensorType });
                      } else {
                        assessment.recordWrong('cognition');
                        sounds.playFailureSound?.();
                        alert('结论有误，磁电式为两线无源正弦波，霍尔式为三线有源数字方波！');
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
                      <span>判定正确！牢固掌握无源磁电与有源霍尔的本质区别。</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('cognition');
                        assessment.startStage('standard');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      进入步骤 2：万用表与示波器实测 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 2：万用表与示波器实测 */}
      {currentStep === 'MULTIMETER_AND_OSCILLOSCOPE_TEST' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    实训台：磁电传感器线圈电阻与 60-2 缺齿波形捕捉
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">电机转速:</span>
                    <input
                      type="range"
                      min="500"
                      max="3000"
                      step="100"
                      value={s2Rpm}
                      onChange={(e) => setS2Rpm(parseInt(e.target.value, 10))}
                      className="w-24 accent-blue-500"
                    />
                    <span className="text-xs font-mono font-bold text-cyan-400">{s2Rpm} rpm</span>
                  </div>
                </div>

                {/* 仪表表头 */}
                <div className="p-6 bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-sm mx-auto shadow-inner flex flex-col items-center">
                  <div className="w-full h-24 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center justify-center font-mono">
                    <span className="text-4xl font-black text-emerald-400 tracking-wider">
                      {meterKnob === 'OFF' && '----'}
                      {meterKnob === 'OHM_2K' && '952 Ω'}
                      {meterKnob === 'DCV_20' && '0.00 V'}
                      {meterKnob === 'OSCILLOSCOPE' && `${(1.2 * (s2Rpm / 800)).toFixed(1)} Vpp`}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {meterKnob === 'OHM_2K' && '磁电线圈直流电阻 (标称 800~1200Ω，合格)'}
                    {meterKnob === 'OSCILLOSCOPE' && `示波器动态峰峰值 (转速 ${s2Rpm}rpm，TDC缺齿清晰)`}
                    {meterKnob === 'OFF' && '测试仪未开机'}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-4 border-t border-slate-800">
                测试规范: 静态阻值合格后，切换至 <span className="text-blue-400 font-bold">[OSCILLOSCOPE]</span> 挡观测波形幅值与缺齿同步基准。
              </div>
            </div>

            {/* 右侧零剧透判定 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  60-2 缺齿波形功能识别
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  在示波器上观察到的 60-2 齿靶轮波形中，连续两个齿缺失产生的一段宽平脉冲具有什么工程作用？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '供 ECU 识别曲轴转角基准位置（如一缸上止点 TDC），用于精确控制点火和喷油正时' },
                    { id: 'B', text: '齿轮损坏造成的机械缺陷，必须立即更换飞轮' },
                    { id: 'C', text: '给传感器线圈放电以防止过压击穿' },
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
                      if (!requireMeterKnob('OSCILLOSCOPE')) return;
                      if (s2Choice === 'A') {
                        setS2Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('MULTIMETER_AND_OSCILLOSCOPE_TEST', { s2Choice, s2Rpm });
                      } else {
                        assessment.recordWrong('standard');
                        sounds.playFailureSound?.();
                        alert('判别有误！缺齿是专门用于 TDC 上止点同步基准的物理特征！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    提交波形分析结论
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>分析准确！60-2 齿形是发动机点火与喷油同步的心脏基准！</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('standard');
                        assessment.startStage('calculation');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      进入步骤 3：频率与气隙定量分析 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 3：转速与频率换算及安装气隙定量分析 */}
      {currentStep === 'SPEED_FREQUENCY_AND_GAP_CALC' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    转速-频率仿真器与安装气隙衰减分析 (靶轮 Z = 58 齿)
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    当前频率 f = {s3Freq} Hz, 幅值 = {s3Amplitude} Vpp
                  </span>
                </div>

                {/* 调节滑块 */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/80 rounded-xl border border-slate-800 mb-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>发动机转速 n:</span>
                      <span className="font-mono font-bold text-cyan-400">{s3Rpm} rpm</span>
                    </div>
                    <input
                      type="range"
                      min="600"
                      max="6000"
                      step="200"
                      value={s3Rpm}
                      onChange={(e) => setS3Rpm(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>安装空气间隙 Gap:</span>
                      <span className="font-mono font-bold text-blue-400">{s3AirGapMm.toFixed(1)} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="3.0"
                      step="0.2"
                      value={s3AirGapMm}
                      onChange={(e) => setS3AirGapMm(parseFloat(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-around text-center text-xs">
                  <div>
                    <div className="text-slate-400">脉冲频率计算</div>
                    <div className="text-lg font-mono font-bold text-cyan-400 mt-1">{s3Freq} Hz</div>
                  </div>
                  <div>
                    <div className="text-slate-400">信号感应幅值</div>
                    <div className={`text-lg font-mono font-bold mt-1 ${s3Amplitude < 0.5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {s3Amplitude} Vpp
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">ECU 识别状态</div>
                    <div className="text-xs font-bold mt-1.5">
                      {s3AirGapMm > 1.5 ? (
                        <span className="text-rose-400">⚠️ 气隙过大！信号过弱丢失</span>
                      ) : (
                        <span className="text-emerald-400">✓ 正常捕捉 (0.5~1.2mm合格)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-4 border-t border-slate-800 font-mono">
                理论换算公式: f = (n × Z) / 60 = ({s3Rpm} × 58) / 60 = {s3Freq} Hz。气隙必须保持在 0.8mm 左右。
              </div>
            </div>

            {/* 右侧定量计算 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  工程计算工单
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  汽车发动机转速为 3000 rpm，曲轴齿轮有效齿数 Z = 58 齿，此时转速传感器输出的脉冲信号频率应是多少？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: 'f = (3000 × 58) / 60 = 2900 Hz (2.9 kHz)' },
                    { id: 'B', text: 'f = 50 Hz' },
                    { id: 'C', text: 'f = 58000 Hz' },
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
                        onStepComplete('SPEED_FREQUENCY_AND_GAP_CALC', { s3Choice, s3Freq });
                      } else {
                        assessment.recordWrong('calculation');
                        sounds.playFailureSound?.();
                        alert('计算有误！f = (n × Z) / 60 = (3000 × 58) / 60 = 2900 Hz！');
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
                      <span>换算精准！2900Hz 对应 3000rpm，装配气隙必须严格把控！</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('calculation');
                        assessment.startStage('blind_test');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      进入步骤 4：转速传感器盲测 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 4：典型故障盲测排查 */}
      {currentStep === 'BLIND_SPEED_SENSOR_FAULT_DIAGNOSIS' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    实训测试台：4 组未知转速传感器盲测
                  </span>
                  <span className="text-xs text-slate-400">测试转速 1500rpm</span>
                </div>

                {/* 样件切换 */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {E06_SAMPLES.map((smp, idx) => (
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
                  <div className="grid grid-cols-3 gap-2 w-full text-center">
                    <div className="p-2 bg-slate-950 rounded-lg">
                      <div className="text-[10px] text-slate-400">线圈阻值</div>
                      <div className="text-sm font-mono font-bold text-cyan-400 mt-1">
                        {activeSample.measuredResistance > 9000000 ? 'OL (断路)' : `${activeSample.measuredResistance} Ω`}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg">
                      <div className="text-[10px] text-slate-400">信号幅值</div>
                      <div className="text-sm font-mono font-bold text-emerald-400 mt-1">
                        {activeSample.vppAmplitude} Vpp
                      </div>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg">
                      <div className="text-[10px] text-slate-400">杂波毛刺</div>
                      <div className="text-sm font-mono font-bold mt-1">
                        {activeSample.hasNoiseSpikes ? <span className="text-rose-400">严重杂波！</span> : <span className="text-slate-400">纯净</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-4 border-t border-slate-800">
                特征判据: 阻值 OL 为内部断路；幅值仅 0.18V 为安装间隙过大；杂波严重叠加毛刺为屏蔽层断开失效；幅值 3.5V 纯净为优品。
              </div>
            </div>

            {/* 右侧工单填报 */}
            <div className="lg:col-span-5 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  传感器故障诊断工单
                </h4>
                <p className="text-xs text-slate-400 mb-3">为 4 组未知样件确诊内部故障：</p>

                <div className="space-y-3">
                  {E06_SAMPLES.map((smp) => (
                    <div key={smp.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                      <div className="font-bold text-slate-200 mb-1.5">{smp.name}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { val: 'GOOD', label: '性能良好' },
                          { val: 'COIL_OPEN', label: '内部线圈断路' },
                          { val: 'GAP_TOO_LARGE', label: '安装间隙过大衰减' },
                          { val: 'SHIELD_BROKEN', label: '屏蔽线断开受干扰' },
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
                      if (!requireMeterKnob(['OSCILLOSCOPE', 'OHM_2K'])) return;
                      const allCorrect = E06_SAMPLES.every(
                        (smp) => s4Diagnoses[smp.id] === smp.actualType
                      );
                      if (allCorrect) {
                        setS4Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('BLIND_SPEED_SENSOR_FAULT_DIAGNOSIS', { s4Diagnoses });
                      } else {
                        assessment.recordWrong('blind_test');
                        sounds.playFailureSound?.();
                        alert('诊断存在错误，请核对幅值与屏蔽层杂波特征！');
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
                      <span>全组盲测分类 100% 正确！具备转速传感器高级诊断技能！</span>
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

      {/* 步骤 5：实车热车熄火 P0335 修复与交车工单闭环 */}
      {currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase text-blue-400">
                    实车工单：冷车启动正常、热车突然熄火 (P0335)
                  </span>
                  <span className="text-xs text-rose-400 font-mono font-bold">故障代码: P0335-00</span>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-3">
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">故障现象:</span> 车辆冷车一把着，运转 30 分钟水温达到 85°C 后突然熄火，启动机能带动但无高压火花无法着车。
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">测试动作:</span> 使用热风枪加热传感器至 85°C 并用万用表测阻。
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!requireMeterKnob('OHM_2K')) return;
                        setS5Heated(true);
                        sounds.playToggleSound?.();
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs"
                    >
                      热态加热并测量线圈电阻
                    </Button>

                    {s5Heated && (
                      <div className="text-xs font-mono">
                        热态实测阻值:{' '}
                        <span className="text-rose-400 font-bold">
                          {s5Repaired ? '950 Ω (耐高温稳定)' : 'OL (达到82°C时突变为开路断线！)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {s5Heated && !s5Repaired && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                    <div className="text-xs text-amber-300 font-bold">
                      确诊隐蔽故障：曲轴位置传感器线圈内部存在热态微裂纹，升温膨胀后瞬间断开！
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5Repaired(true);
                        sounds.playSuccessSound?.();
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      更换原厂耐高温 125°C 曲轴位置传感器总成
                    </Button>
                  </div>
                )}

                {s5Repaired && !s5GapAdjusted && (
                  <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-3">
                    <div className="text-xs text-blue-300 font-bold">
                      装配工序：必须使用厚薄规（塞尺）校准传感器与飞轮靶轮之间的安装间隙！
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5GapAdjusted(true);
                        sounds.playSuccessSound?.();
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                    >
                      使用塞尺精准调校安装气隙至 0.8mm 并打 9N·m 扭矩
                    </Button>
                  </div>
                )}

                {s5GapAdjusted && (
                  <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-emerald-300">
                        ✓ 新传感器已调校就绪，请起动发动机进行 40 分钟热车长时路试
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        复验验收标准: 水温保持 90°C~95°C，曲轴脉冲无任何丢失，无偶发熄火。
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5TestDrove(true);
                        sounds.playToggleSound?.();
                      }}
                      className={s5TestDrove ? 'bg-emerald-600 text-white text-xs' : 'bg-blue-600 text-white text-xs'}
                    >
                      {s5TestDrove ? '✓ 40分钟热车路试通过' : '启动发动机执行路试'}
                    </Button>
                  </div>
                )}
              </div>

              {s5TestDrove && (
                <div className="flex items-center gap-4 pt-4 border-t border-slate-800 text-xs font-mono">
                  <div className="text-emerald-400 font-bold">发动机热车运转稳定 🚗</div>
                  <div>连续路试时长: <span className="text-cyan-400 font-bold">40 分钟</span></div>
                  <div>故障码状态: <span className="text-emerald-400 font-bold">已彻底消除</span></div>
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
                <p className="text-xs text-slate-400 mb-3">核验传感器系统修复指标：</p>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">故障部位:</span>
                    <span className="text-slate-200 font-bold">曲轴传感器线圈热态微裂开路</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">更换件号:</span>
                    <span className="text-slate-200 font-bold">原厂 125°C 耐高温传感器</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">安装间隙:</span>
                    <span className="text-emerald-400 font-mono font-bold">0.8 mm (标准合格)</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">长时路试:</span>
                    <span className="text-emerald-400 font-bold">40分钟无故障熄火</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="e06-sign"
                    disabled={!s5TestDrove || s5Submitted}
                    checked={s5Signed}
                    onChange={(e) => setS5Signed(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <label htmlFor="e06-sign" className="text-xs text-slate-300 cursor-pointer">
                    维修技师已通过热态测阻与长时路试复验，确认排故彻底，准予交车
                  </label>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                {!s5Submitted ? (
                  <Button
                    disabled={!s5Signed || !s5TestDrove}
                    onClick={() => {
                      setS5Submitted(true);
                      sounds.playSuccessSound?.();
                      assessment.completeStage('transfer');
                      const finalResult = assessment.completeLevel();
                      onComplete?.(finalResult);
                      onStepComplete('ENGINEERING_REPAIR_AND_DELIVERY', {
                        s5Repaired,
                        s5GapAdjusted,
                        s5TestDrove,
                      });
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    签署交车工单
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>交车成功！发动机热车熄火疑难故障彻底排除！</span>
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
