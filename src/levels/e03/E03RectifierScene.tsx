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
  calculateThreePhaseRectifier,
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
  const requestAssessmentHint = assessment.requestHint;
  // Multimeter knob: 'OFF' | 'DCV_20' | 'ACV_20' | 'DIODE'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'DCV_20' | 'ACV_20' | 'DIODE'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Step 1: Topology
  const [s1Topology, setS1Topology] = useState<'HALF_WAVE' | 'FULL_BRIDGE'>('HALF_WAVE');
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);
  const [phaseAngle, setPhaseAngle] = useState(0);
  const [phaseObservations, setPhaseObservations] = useState<number[]>([]);
  const [phasePair, setPhasePair] = useState('');
  const [phasePulses, setPhasePulses] = useState('');
  const [phaseVerified, setPhaseVerified] = useState(false);
  const [phaseFeedback, setPhaseFeedback] = useState('');
  const threePhaseOutput = calculateThreePhaseRectifier(phaseAngle);

  // Step 2: Bridge Testing
  const [s2SelectedArm, setS2SelectedArm] = useState<'D1' | 'D2' | 'D3' | 'D4'>('D1');
  const [s2ProbeDirection, setS2ProbeDirection] = useState<'FORWARD' | 'REVERSE'>('FORWARD');
  const [s2Choice, setS2Choice] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: Capacitor & Calculations
  const [s3HasCapacitor, setS3HasCapacitor] = useState<boolean>(false);
  const [s3Choice, setS3Choice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);
  const [regulation, setRegulation] = useState('');

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
      requestAssessmentHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, requestAssessmentHint]);

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
    <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-6 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 shadow-sm w-full max-w-full min-w-0 box-border">
      <p className="text-sm text-slate-600 break-words">训练边界：单相电容滤波台架与车用三相整流分别演示；所有故障数值仅为本案例。纹波Vpp来自模拟示波器，不能等同于普通万用表AC挡有效值。</p>
      {/* 顶部数字万用表状态栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-xs min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 shrink-0">
            <Gauge className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-400 tracking-wider uppercase break-words">
              汽车数字万用表 (DMM-930 纹波分析专用)
            </div>
            <div className="text-sm font-bold text-slate-700">
              当前挡位:{' '}
              <span
                className={
                  meterKnob === 'OFF'
                    ? 'text-rose-400 font-mono'
                    : 'text-emerald-600 font-mono font-black'
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

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-sm font-medium text-slate-500">旋钮挡位:</span>
          {(['OFF', 'DCV_20', 'ACV_20', 'DIODE'] as const).map((knob) => (
            <button
              key={knob}
              onClick={() => {
                setMeterKnob(knob);
                setMeterWarning(null);
                sounds.playToggleSound?.();
              }}
              className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
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
          <section className="p-3 sm:p-4 rounded-xl border border-blue-200 bg-white space-y-3 min-w-0 max-w-full" aria-label="三相整流实验">
            <h3 className="font-bold text-sm sm:text-base">车用三相六二极管整流：操作与独立验证</h3>
            <p className="text-sm text-slate-600 break-words">理想对称三相模型（忽略管压降及换相重叠）：最高电位相经正组二极管接正母线，最低相经负组二极管回流。相位差120°，每电周期有六个脉波。整流负责变换电流方向，调节器通过控制励磁调压。</p>
            <p className="text-sm text-slate-700 break-words">电角度 {phaseAngle}°；归一化相电压：{Object.entries(threePhaseOutput.phaseVoltages).map(([phase, value]) => `${phase}=${value.toFixed(2)}`).join('，')}；导通路径 {threePhaseOutput.positivePhase} → 正母线 → 负载 → 负母线 → {threePhaseOutput.negativePhase}；输出 {threePhaseOutput.output.toFixed(2)}</p>
            <div className="overflow-x-auto min-w-0">
              <svg viewBox="0 0 360 90" className="w-full h-24 max-w-full" aria-label="三相六脉波整流输出曲线">
                <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={Array.from({ length: 361 }, (_, angle) => `${angle},${85 - calculateThreePhaseRectifier(angle).output * 40}`).join(' ')} />
                <circle cx={phaseAngle} cy={85 - threePhaseOutput.output * 40} r="4" fill="#dc2626" />
              </svg>
            </div>
            <Button disabled={s1Submitted} size="sm" onClick={() => { const next = (phaseAngle + 60) % 360; setPhaseAngle(next); setPhaseObservations(previous => [...new Set([...previous, next])]); }}>推进三相电角度 60°</Button>
            <p className="text-sm text-slate-500 break-words">已记录 {phaseObservations.length} 个不同电角度，至少观察2个后进行独立判断。下题使用另一组瞬时电压。</p>
            <label className="block text-sm break-words">独立判断：U=8V、V=-3V、W=-5V时的导通相对
              <select className="border rounded p-1.5 sm:p-2 m-1 sm:m-2 text-sm max-w-full" aria-label="独立判断：U=8V、V=-3V、W=-5V时的导通相对" value={phasePair} disabled={s1Submitted} onChange={event => { setPhasePair(event.target.value); setPhaseVerified(false); }}>
                <option value="">请选择正组相→负组相</option><option value="U-V">U→V</option><option value="W-U">W→U</option><option value="U-W">U→W</option>
              </select>
            </label>
            <label className="block text-sm break-words">三相整流每周期脉波数
              <select className="border rounded p-1.5 sm:p-2 m-1 sm:m-2 text-sm max-w-full" aria-label="三相整流每周期脉波数" value={phasePulses} disabled={s1Submitted} onChange={event => { setPhasePulses(event.target.value); setPhaseVerified(false); }}>
                <option value="">请选择</option><option value="2">2</option><option value="3">3</option><option value="6">6</option>
              </select>
            </label>
            <Button disabled={s1Submitted || phaseObservations.length < 2 || !phasePair || !phasePulses} size="sm" onClick={() => {
              const correct = phasePair === 'U-W' && phasePulses === '6'; setPhaseVerified(correct);
              setPhaseFeedback(correct ? '三相独立验证通过。' : '尚未通过：重新比较最高与最低电位及一个周期内的换相次数。');
              if (!correct) assessment.recordWrong('cognition');
            }}>验证三相整流</Button>
            <output className="block text-sm">{phaseFeedback}</output>
          </section>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 flex flex-col justify-between p-3.5 sm:p-6 bg-slate-950/80 rounded-2xl border border-slate-800 min-h-[360px] min-w-0 max-w-full">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold uppercase text-blue-400 tracking-wider">
                  拓扑波形对比：半波 vs 桥式全波
                </span>
                <span className="text-sm text-slate-300">变压器次级 AC 12V 50Hz</span>
              </div>

              {/* 动态波形可视化 */}
              <div className="relative w-full h-52 flex flex-col items-center justify-center my-4 bg-slate-900/60 rounded-xl border border-slate-800/80 p-3 overflow-x-auto min-w-0">
                <div className="text-sm text-slate-400 font-mono flex flex-wrap justify-between w-full mb-1 gap-1">
                  <span>OSCILLOSCOPE CH1: OUTPUT WAVEFORM</span>
                  <span>{s1Topology === 'HALF_WAVE' ? '半波脉动 (基波50Hz)' : '桥式全波翻折 (倍频100Hz)'}</span>
                </div>

                <svg className="w-full h-36 max-w-full" viewBox="0 0 400 120">
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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-mono">
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
                  size="sm"
                  onClick={() => {
                    setS1Topology(s1Topology === 'HALF_WAVE' ? 'FULL_BRIDGE' : 'HALF_WAVE');
                    sounds.playToggleSound?.();
                  }}
                  variant="outline"
                  className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium cursor-pointer"
                >
                  切换整流拓扑 (当前: {s1Topology === 'HALF_WAVE' ? '单相半波' : '单相桥式全波'})
                </Button>
              </div>
            </div>

            {/* 右侧零剧透知识验证 */}
            <div className="lg:col-span-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  认知判定与理论验证
                </h4>
                <p className="text-sm text-slate-600 mb-4">
                  在此单相变压器训练台中，桥式全波相较半波有什么特点？（车用三相整流见上方独立实验）
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
                      className={`w-full text-left p-3 rounded-xl border text-sm transition-all cursor-pointer ${
                        s1Choice === opt.id
                          ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300'
                      }`}
                    >
                      <span className="font-mono font-bold mr-2 text-blue-400">{opt.id}.</span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                {!s1Submitted ? (
                  <Button
                    disabled={!s1Choice || !phaseVerified}
                    onClick={() => {
                      if (s1Choice === 'A') {
                        setS1Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('RECTIFIER_TOPOLOGY_COGNITION', { s1Choice, s1Topology, threePhase: { observedAngles: phaseObservations, pair: phasePair, pulses: Number(phasePulses), verified: phaseVerified } });
                      } else {
                        assessment.recordWrong('cognition');
                        sounds.playFailureSound?.();
                        alert('结论有误，请仔细对比半波与桥式整流的输出电压与能量利用率！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer"
                  >
                    提交认知判定
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>判定正确！桥式整流实现双向翻折利用，输出电压与频率翻倍！</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('cognition');
                        assessment.startStage('standard');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
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
            <div className="lg:col-span-8 p-3.5 sm:p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px] min-w-0 max-w-full">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    实训台：整流桥 4 桥臂二极管万用表检测
                  </span>
                  <span className="text-sm text-slate-300">
                    当前被测桥臂: <span className="text-white font-bold">{s2SelectedArm}</span>
                  </span>
                </div>

                {/* 桥臂选择 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {(['D1', 'D2', 'D3', 'D4'] as const).map((arm) => (
                    <button
                      key={arm}
                      onClick={() => {
                        setS2SelectedArm(arm);
                        sounds.playToggleSound?.();
                      }}
                      className={`p-2 sm:p-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
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
                <div className="p-4 sm:p-6 bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-sm mx-auto shadow-inner flex flex-col items-center">
                  <div className="w-full h-20 sm:h-24 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center justify-center font-mono">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-wider">
                      {meterKnob !== 'DIODE' ? (
                        <span className="text-rose-400 text-sm sm:text-lg font-sans">请切至二极管挡</span>
                      ) : s2ProbeDirection === 'FORWARD' ? (
                        '0.612 V'
                      ) : (
                        'OL'
                      )}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 mt-2 font-medium break-words">
                    {meterKnob === 'DIODE' && (s2ProbeDirection === 'FORWARD' ? '正向导通管压降 (612mV)' : '反向截止阻断 (OL)')}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <Button
                  size="sm"
                  onClick={() => {
                    setS2ProbeDirection(s2ProbeDirection === 'FORWARD' ? 'REVERSE' : 'FORWARD');
                    sounds.playToggleSound?.();
                  }}
                  variant="outline"
                  className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium cursor-pointer"
                >
                  对调表笔方向 (当前: {s2ProbeDirection === 'FORWARD' ? '正向测法' : '反向测法'})
                </Button>
                <div className="text-sm text-slate-300 break-words">
                  提示: 正常整流桥必须 4 个桥臂正向全为 ~0.6V，反向全为 OL。
                </div>
              </div>
            </div>

            {/* 右侧零剧透判定 */}
            <div className="lg:col-span-4 p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0 max-w-full">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  整流桥好坏判定规则
                </h4>
                <p className="text-sm text-slate-600 mb-4">
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
                      className={`w-full text-left p-3 rounded-xl border text-sm transition-all cursor-pointer ${
                        s2Choice === opt.id
                          ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300'
                      }`}
                    >
                      <span className="font-mono font-bold mr-2 text-blue-400">{opt.id}.</span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
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
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer"
                  >
                    提交检测结论
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>检测规范掌握到位！4 桥臂均良好，准予进入滤波分析。</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('standard');
                        assessment.startStage('calculation');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
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
          <label className="p-3 bg-white border rounded-xl block text-sm break-words min-w-0">汽车充电电压的控制机制
            <select className="border rounded p-1.5 sm:p-2 m-1 sm:m-2 text-sm max-w-full" aria-label="汽车充电电压的控制机制" value={regulation} disabled={s3Submitted} onChange={event => setRegulation(event.target.value)}>
              <option value="">请选择独立判断</option>
              <option value="CAPACITOR">滤波电容固定将交流电压乘1.2，所有车辆都是14.4V</option>
              <option value="FIELD_REGULATION">三相整流后由调节器控制励磁，目标依车型、温度和控制策略确定</option>
              <option value="DIODE">二极管自身把电压固定在14.4V</option>
            </select>
          </label>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-3.5 sm:p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px] min-w-0 max-w-full">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    单相台架滤波实验：次级交流 U₂ = 12V
                  </span>
                  <Button
                    size="sm"
                    disabled={s3Submitted}
                    onClick={() => {
                      if (s3Submitted) return;
                      setS3HasCapacitor(!s3HasCapacitor);
                      sounds.playToggleSound?.();
                    }}
                    className={
                      s3Submitted
                        ? (s3HasCapacitor ? 'bg-emerald-600/60 text-white/80 text-sm font-medium cursor-not-allowed opacity-60' : 'bg-slate-700/60 text-slate-400 text-sm font-medium cursor-not-allowed opacity-60')
                        : (s3HasCapacitor ? 'bg-emerald-600 text-white text-sm font-medium cursor-pointer' : 'bg-slate-700 text-slate-300 text-sm font-medium cursor-pointer')
                    }
                  >
                    {s3HasCapacitor ? '✓ 滤波电容已接入 (平滑波形)' : '未接滤波电容 (脉动波形)'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 sm:p-4 bg-slate-900/90 rounded-xl border border-slate-800 mb-4 text-center text-sm">
                  <div>
                    <div className="text-slate-400">直流平均输出 Uo</div>
                    <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400">
                      {s3Output.uDc.toFixed(2)} V
                    </div>
                    <div className="text-slate-400 mt-1">
                      {s3HasCapacitor ? 'Uo ≈ √2U₂ − 2Vf − ΔV/2' : '公式: Uo ≈ 0.9 × U₂'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">交流纹波电压 Vpp</div>
                    <div className="text-xl sm:text-2xl font-mono font-black text-cyan-400">
                      {s3Output.rippleVpp.toFixed(2)} V
                    </div>
                    <div className="text-slate-400 mt-1">
                      {s3HasCapacitor ? '电容削峰填谷 (纹波压制)' : '剧烈脉动 (无滤波)'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">指定负载下的台架输出</div>
                    <div className="font-bold text-amber-300 mt-2">
                      {s3HasCapacitor ? '本台架约15.47V，非车辆充电设定值' : '未滤波平均值10.8V'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl text-slate-200 text-sm overflow-x-auto min-w-0">
                <p className="break-words">输出曲线：纵轴0～18V；横轴40ms（同一刻度，滤波纹波较小）</p>
                <svg viewBox="0 0 360 110" className="w-full h-28 max-w-full" aria-label="单相滤波台架输出曲线">
                  <line x1="0" y1="100" x2="360" y2="100" stroke="#64748b" />
                  <polyline fill="none" stroke="#22d3ee" strokeWidth="2" points={Array.from({length: 361}, (_, x) => {
                    const seconds = x / 360 * 0.04;
                    const voltage = s3HasCapacitor
                      ? s3Output.uDc + s3Output.rippleVpp / 2 - s3Output.rippleVpp * ((seconds * 100) % 1)
                      : Math.abs(Math.cos(2 * Math.PI * 50 * seconds)) * 12 * Math.SQRT2;
                    return `${x},${100 - voltage / 18 * 90}`;
                  }).join(' ')} />
                </svg>
                <p className="break-words">{s3HasCapacitor ? `近似充放电范围：${(s3Output.uDc - s3Output.rippleVpp / 2).toFixed(2)}～${(s3Output.uDc + s3Output.rippleVpp / 2).toFixed(2)}V；100Hz纹波` : '理想全波整流参考：0～16.97V'}</p>
              </div>
              <div className="text-sm text-slate-300 pt-4 border-t border-slate-800 font-mono break-words">
                模型边界：未滤波是理想二极管、阻性负载参考，平均值约0.9U₂。接入滤波后的模型条件改为50Hz、1000μF、20mA恒流负载、每管压降0.7V；ΔV≈I/(2fC)=0.20Vpp，均值≈√2×12−1.4−0.10=15.47V。忽略电源内阻和电容ESR，采用小纹波近似（ΔV不超过峰值的10%），充电过程简化为峰值瞬时补充。车用发电机经三相整流，调节器控制励磁；充电目标按车型、温度和电池策略确定。
              </div>
            </div>

            {/* 右侧定量计算 */}
            <div className="lg:col-span-4 p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0 max-w-full">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  工程设计计算工单
                </h4>
                <p className="text-sm text-slate-600 mb-4">
                  单相桥式台架12Vrms、50Hz，C=1000μF，恒流负载I=20mA，每管Vf=0.7V。用ΔV≈I/(2fC)，滤波后输出平均值约为多少？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: 'Uo ≈ √2 × 12 − 2 × 0.7 − 0.20/2 = 15.47 V' },
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
                      className={`w-full text-left p-3 rounded-xl border text-sm transition-all cursor-pointer ${
                        s3Choice === opt.id
                          ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300'
                      }`}
                    >
                      <span className="font-mono font-bold mr-2 text-blue-400">{opt.id}.</span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                {!s3Submitted && !s3HasCapacitor && (
                  <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>前置实验未完成：请先在左侧点击接入滤波电容并观察平滑波形与参数变化。</span>
                  </div>
                )}
                {!s3Submitted ? (
                  <Button
                    disabled={!s3Choice || !regulation || !s3HasCapacitor}
                    onClick={() => {
                      if (!s3HasCapacitor || s3Submitted) return;
                      if (s3Choice === 'A' && regulation === 'FIELD_REGULATION') {
                        setS3Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('FILTER_CAPACITOR_AND_VOLTAGE_CALC', {
                          s3Choice,
                          s3HasCapacitor,
                          regulation,
                          modelScope: 'SINGLE_PHASE_BENCH',
                          filteredOutput: calculateRectifierOutput(12, 'FULL_BRIDGE', s3HasCapacitor),
                        });
                      } else {
                        assessment.recordWrong('calculation');
                        sounds.playFailureSound?.();
                        alert('计算或适用范围判断有误，请区分题设台架近似和车用调压机制。');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer"
                  >
                    提交计算结论
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>验证通过：15.47V仅是本题台架小纹波近似结果，不能推出车辆统一充电电压。</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('calculation');
                        assessment.startStage('blind_test');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
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
            <div className="lg:col-span-7 p-3.5 sm:p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px] min-w-0 max-w-full">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    发电机测试台：4 组未知整流桥盲测工位
                  </span>
                  <span className="text-sm text-slate-300">发动机模拟转速 2000rpm</span>
                </div>

                {/* 样件切换 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {E03_SAMPLES.map((smp, idx) => (
                    <button
                      key={smp.id}
                      onClick={() => {
                        setS4SampleIndex(idx);
                        sounds.playToggleSound?.();
                      }}
                      className={`p-2 sm:p-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
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
                <div className="p-3.5 sm:p-5 bg-slate-900 border border-slate-700 rounded-xl flex flex-col items-center min-w-0 max-w-full">
                  <div className="text-sm text-slate-300 mb-2">
                    测试对象: <span className="text-white font-bold">{activeSample.name}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full text-center">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-sm text-slate-400">直流输出电压 (DCV)</div>
                      <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 mt-1">
                        {activeSample.dcVoltage} V
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-sm text-slate-400">交流纹波峰峰值 (ACV)</div>
                      <div className={`text-xl sm:text-2xl font-mono font-bold mt-1 ${activeSample.acRippleVpp > 1.0 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>
                        {activeSample.acRippleVpp} V
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-300 pt-4 border-t border-slate-800 break-words">
                本阶段独立故障样品（并非步骤3滤波台架；非通用诊断阈值，纹波为示波器Vpp）: 正常(DC 14.3V, 纹波0.12V)；二极管击穿(纹波高达2.85V)；二极管断路(电压跌至11.2V)；滤波失效(纹波3.60V且呈馒头波)。
              </div>
            </div>

            {/* 右侧诊断报告 */}
            <div className="lg:col-span-5 p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0 max-w-full">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  整流桥诊断工单
                </h4>
                <p className="text-sm text-slate-600 mb-3">为 4 组发电机整流桥样件判定故障类型：</p>

                <div className="space-y-3">
                  {E03_SAMPLES.map((smp) => (
                    <div key={smp.id} className="p-2.5 sm:p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-sm">
                      <div className="font-bold text-slate-200 mb-1.5">{smp.name}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
                            className={`p-2 rounded-lg border text-center text-sm font-medium transition-all cursor-pointer break-words ${
                              s4Diagnoses[smp.id] === opt.val
                                ? 'border-blue-500 bg-blue-500/20 text-white font-bold'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300'
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

              <div className="mt-4 pt-4 border-t border-slate-200">
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
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer"
                  >
                    提交四组诊断结论
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>全组盲测分类 100% 正确！具备发电机电气故障快速定损能力！</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('blind_test');
                        assessment.startStage('transfer', 'transfer');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
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
            <div className="lg:col-span-8 p-3.5 sm:p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px] min-w-0 max-w-full">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    实车工单：发电机整流二极管击穿导致音响啸叫与亏电
                  </span>
                  <span className="text-sm text-rose-400 font-mono font-bold">故障代码: P0622-00</span>
                </div>

                <div className="p-3 sm:p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-sm space-y-3 break-words">
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">报修现象:</span> 车辆行驶中音响发出刺耳吹哨啸叫声，且停放一夜后蓄电池严重亏电无法启动。
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">排查操作:</span> 用万用表 ACV 档测量蓄电池两端交流纹波电压。
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!requireMeterKnob('ACV_20')) return;
                        setS5Measured(true);
                        sounds.playToggleSound?.();
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium cursor-pointer"
                    >
                      交流电压档测量母线纹波
                    </Button>

                    {s5Measured && (
                      <div className="text-sm font-mono">
                        实测交流纹波:{' '}
                        <span className="text-rose-400 font-bold">
                          {s5Repaired ? '0.08 Vpp (本工单合格)' : '2.65 Vpp (本案例异常)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {s5Measured && !s5Repaired && (
                  <div className="mt-4 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3 break-words">
                    <div className="text-sm text-amber-300 font-bold">
                      根因确诊：发电机负极板第 2 只二极管击穿短路，导致交流电窜入直流电网！请从库房领用原装整流桥板总成更换：
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5Repaired(true);
                        sounds.playSuccessSound?.();
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold cursor-pointer"
                    >
                      领用并规范安装原厂 12V/100A 雪崩二极管整流桥总成
                    </Button>
                  </div>
                )}

                {s5Repaired && (
                  <div className="mt-4 p-3 sm:p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-emerald-300">
                        ✓ 新整流桥总成安装完毕并完成扭矩紧固，请起动发动机进行 2000rpm 带载测试
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        本训练工单参考：直流14.0V~14.5V，示波器纹波峰峰值小于0.2V；实车依据该车型维修手册和规定工况。
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5EngineRunning(!s5EngineRunning);
                        sounds.playToggleSound?.();
                      }}
                      className={s5EngineRunning ? 'bg-emerald-600 text-white text-sm font-medium cursor-pointer' : 'bg-blue-600 text-white text-sm font-medium cursor-pointer'}
                    >
                      {s5EngineRunning ? '✓ 发动机运转中 (2000rpm)' : '起动发动机进行复测'}
                    </Button>
                  </div>
                )}
              </div>

              {s5EngineRunning && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-4 border-t border-slate-800 text-sm font-mono">
                  <div className="text-emerald-400 font-bold">充电系统工作正常 ⚡</div>
                  <div>直流输出: <span className="text-emerald-400 font-bold">14.3 V</span></div>
                  <div>交流纹波: <span className="text-cyan-400 font-bold">0.08 V (极佳)</span></div>
                  <div>音响噪音: <span className="text-emerald-400 font-bold">恢复正常 (未见异常啸叫)</span></div>
                </div>
              )}
            </div>

            {/* 右侧交付签署 */}
            <div className="lg:col-span-5 p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0 max-w-full">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  工程交付验收单
                </h4>
                <p className="text-sm text-slate-600 mb-3">核验整流系统维修质量指标：</p>

                <div className="space-y-2 text-sm">
                  <div className="p-2 sm:p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between gap-2">
                    <span className="text-slate-400">故障部位:</span>
                    <span className="text-slate-200 font-bold break-words text-right">发电机整流桥总成 (二极管击穿)</span>
                  </div>
                  <div className="p-2 sm:p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between gap-2">
                    <span className="text-slate-400">更换配件:</span>
                    <span className="text-slate-200 font-bold break-words text-right">原厂 12V/100A 雪崩整流器</span>
                  </div>
                  <div className="p-2 sm:p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between gap-2">
                    <span className="text-slate-400">充电电压:</span>
                    <span className="text-emerald-400 font-mono font-bold">14.3 V (合格)</span>
                  </div>
                  <div className="p-2 sm:p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between gap-2">
                    <span className="text-slate-400">交流纹波:</span>
                    <span className="text-emerald-400 font-mono font-bold">0.08 V (优秀)</span>
                  </div>
                </div>

                <div className="mt-4 flex items-start sm:items-center gap-2 break-words">
                  <input
                    type="checkbox"
                    id="e03-sign"
                    disabled={!s5EngineRunning || s5Submitted}
                    checked={s5Signed}
                    onChange={(e) => setS5Signed(e.target.checked)}
                    className="rounded accent-emerald-500 mt-1 sm:mt-0"
                  />
                  <label htmlFor="e03-sign" className="text-sm text-slate-700 cursor-pointer break-words">
                    维修技师确认交流纹波达标且蓄电池无反向漏电，准予合格交车
                  </label>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
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
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold cursor-pointer"
                  >
                    签署交车工单
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>本训练工单验收完成；实车须按维修手册开展规定工况的复验。</span>
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
