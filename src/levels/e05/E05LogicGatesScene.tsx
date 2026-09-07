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
  type E05Step,
  type LogicGateType,
  E05_SAMPLES,
  evaluateLogicGate,
} from './e05Training';
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { evaluateMeterGuard } from '@/src/game/instruments/meterGuard';

interface E05LogicGatesSceneProps {
  currentStep: E05Step;
  onStepComplete: (step: E05Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onComplete?: (result: LevelAssessmentResult) => void;
  hintRequested?: boolean;
}

export function E05LogicGatesScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onComplete,
  hintRequested = false,
}: E05LogicGatesSceneProps) {
  const assessment = useLevelAssessment('E05');
  // Multimeter knob: 'OFF' | 'DCV_20' | 'LOGIC_PROBE' | 'OHM_200'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'DCV_20' | 'LOGIC_PROBE' | 'OHM_200'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Step 1: Gate Symbols
  const [s1Gate, setS1Gate] = useState<LogicGateType>('AND');
  const [s1InA, setS1InA] = useState<boolean>(true);
  const [s1InB, setS1InB] = useState<boolean>(true);
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Step 2: Truth Table Verification
  const [s2SwitchA, setS2SwitchA] = useState<boolean>(false);
  const [s2SwitchB, setS2SwitchB] = useState<boolean>(false);
  const [s2VerifiedRows, setS2VerifiedRows] = useState<Record<string, boolean>>({});
  const [s2Choice, setS2Choice] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: Vehicle Interlock
  const [s3SeatOccupied, setS3SeatOccupied] = useState<boolean>(true);
  const [s3SeatbeltUnbuckled, setS3SeatbeltUnbuckled] = useState<boolean>(true);
  const [s3SpeedOver20, setS3SpeedOver20] = useState<boolean>(true);
  const [s3Choice, setS3Choice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Step 4: Blind Fault Diagnosis
  const [s4SampleIndex, setS4SampleIndex] = useState<number>(0);
  const [s4InA, setS4InA] = useState<boolean>(true);
  const [s4InB, setS4InB] = useState<boolean>(true);
  const [s4Diagnoses, setS4Diagnoses] = useState<Record<string, string>>({});
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Step 5: Engineering Repair
  const [s5Measured, setS5Measured] = useState<boolean>(false);
  const [s5Repaired, setS5Repaired] = useState<boolean>(false);
  const [s5BuckleState, setS5BuckleState] = useState<'UNBUCKLED' | 'BUCKLED'>('BUCKLED');
  const [s5Signed, setS5Signed] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  React.useEffect(() => {
    if (hintRequested) {
      const stageMap: Record<E05Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
        LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE: 'cognition',
        EXPERIMENT_BOX_TRUTH_VERIFICATION: 'standard',
        VEHICLE_SAFETY_INTERLOCK_LOGIC: 'calculation',
        BLIND_LOGIC_IC_FAULT_DIAGNOSIS: 'blind_test',
        ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
      };
      assessment.requestHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, assessment]);

  const requireMeterKnob = (required: ('DCV_20' | 'LOGIC_PROBE' | 'OHM_200') | ('DCV_20' | 'LOGIC_PROBE' | 'OHM_200')[]): boolean => {
    const stageMap: Record<E05Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
      LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE: 'cognition',
      EXPERIMENT_BOX_TRUTH_VERIFICATION: 'standard',
      VEHICLE_SAFETY_INTERLOCK_LOGIC: 'calculation',
      BLIND_LOGIC_IC_FAULT_DIAGNOSIS: 'blind_test',
      ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
    };
    const guard = evaluateMeterGuard({
      currentMode: meterKnob,
      expectedMode: required,
      circuitPowered: currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' ? s5Repaired : true,
      resistanceMeasurement: Array.isArray(required) ? required.includes('OHM_200') : required === 'OHM_200',
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

  const s1Output = evaluateLogicGate(s1Gate, s1InA, s1InB);
  const s2CurrentOut = evaluateLogicGate('AND', s2SwitchA, s2SwitchB);
  const s3AlarmTriggered = s3SeatOccupied && s3SeatbeltUnbuckled && s3SpeedOver20;

  const activeSample = E05_SAMPLES[s4SampleIndex];
  const s4InputIdx = (s4InA ? 2 : 0) + (s4InB ? 1 : 0);
  const s4SampleOut = activeSample.outputTruths[s4InputIdx];

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-slate-100 shadow-2xl backdrop-blur-md">
      {/* 顶部数字万用表 / 逻辑笔状态栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800/80 rounded-xl border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-semibold tracking-wider uppercase">
              数字逻辑测试仪 (LOGIC-PROBE / DMM)
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
                {meterKnob === 'LOGIC_PROBE' && '高低逻辑电平笔 (HIGH / LOW)'}
                {meterKnob === 'DCV_20' && '直流电压 20V 档 (V=)'}
                {meterKnob === 'OHM_200' && '电阻通断 200Ω 档 (Ω)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">旋钮挡位:</span>
          {(['OFF', 'LOGIC_PROBE', 'DCV_20', 'OHM_200'] as const).map((knob) => (
            <button
              key={knob}
              onClick={() => {
                setMeterKnob(knob);
                setMeterWarning(null);
                sounds.playToggleSound?.();
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
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

      {/* 步骤 1：逻辑门符号与真值表认知 */}
      {currentStep === 'LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 flex flex-col justify-between p-6 bg-slate-950/80 rounded-2xl border border-slate-800 min-h-[360px]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase text-blue-400 tracking-wider">
                  逻辑门符号与输出仿真：{s1Gate} 门
                </span>
                <div className="flex gap-1">
                  {(['AND', 'OR', 'NOT', 'NAND', 'NOR'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => {
                        setS1Gate(g);
                        sounds.playToggleSound?.();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all cursor-pointer ${
                        s1Gate === g
                          ? 'border-blue-500 bg-blue-500/20 text-white'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* 动态逻辑门展示 */}
              <div className="relative w-full h-48 flex items-center justify-center my-4 bg-slate-900/60 rounded-xl border border-slate-800/80 p-3">
                <svg className="w-full h-full max-w-sm" viewBox="0 0 300 160">
                  {/* 输入 A */}
                  <line x1="20" y1="50" x2="100" y2="50" stroke={s1InA ? '#10b981' : '#64748b'} strokeWidth="3" />
                  <circle cx="20" cy="50" r="5" fill={s1InA ? '#10b981' : '#64748b'} />
                  <text x="10" y="42" fill="#94a3b8" fontSize="10">A={s1InA ? '1' : '0'}</text>

                  {/* 输入 B (非门不显示B) */}
                  {s1Gate !== 'NOT' && (
                    <>
                      <line x1="20" y1="110" x2="100" y2="110" stroke={s1InB ? '#10b981' : '#64748b'} strokeWidth="3" />
                      <circle cx="20" cy="110" r="5" fill={s1InB ? '#10b981' : '#64748b'} />
                      <text x="10" y="102" fill="#94a3b8" fontSize="10">B={s1InB ? '1' : '0'}</text>
                    </>
                  )}

                  {/* 门电路本体 */}
                  <rect x="100" y="30" width="80" height="100" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                  <text x="125" y="86" fill="#38bdf8" fontSize="16" fontWeight="bold">
                    {s1Gate === 'AND' && '&'}
                    {s1Gate === 'OR' && '≥1'}
                    {s1Gate === 'NOT' && '1'}
                    {s1Gate === 'NAND' && '& O'}
                    {s1Gate === 'NOR' && '≥1 O'}
                  </text>

                  {/* 输出 Y */}
                  <line x1="180" y1="80" x2="260" y2="80" stroke={s1Output ? '#10b981' : '#64748b'} strokeWidth="4" />
                  <circle cx="260" cy="80" r="14" fill={s1Output ? '#facc15' : '#334155'} stroke={s1Output ? '#eab308' : '#64748b'} strokeWidth="2" />
                  <text x="254" y="84" fill={s1Output ? '#0f172a' : '#94a3b8'} fontSize="11" fontWeight="bold">
                    {s1Output ? '1' : '0'}
                  </text>
                  <text x="245" y="110" fill="#94a3b8" fontSize="10">输出 Y</text>
                </svg>
              </div>

              {/* 输入开关控制 */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setS1InA(!s1InA);
                      sounds.playToggleSound?.();
                    }}
                    className={s1InA ? 'bg-emerald-600 text-white text-sm cursor-pointer' : 'bg-slate-700 text-slate-300 text-sm cursor-pointer'}
                  >
                    输入端 A: {s1InA ? '高电平 1 (5V)' : '低电平 0 (0V)'}
                  </Button>
                  {s1Gate !== 'NOT' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setS1InB(!s1InB);
                        sounds.playToggleSound?.();
                      }}
                      className={s1InB ? 'bg-emerald-600 text-white text-sm cursor-pointer' : 'bg-slate-700 text-slate-300 text-sm cursor-pointer'}
                    >
                      输入端 B: {s1InB ? '高电平 1 (5V)' : '低电平 0 (0V)'}
                    </Button>
                  )}
                </div>

                <div className="text-sm font-mono">
                  布尔表达式:{' '}
                  <span className="text-amber-300 font-bold">
                    {s1Gate === 'AND' && 'Y = A · B (全1出1)'}
                    {s1Gate === 'OR' && 'Y = A + B (有1出1)'}
                    {s1Gate === 'NOT' && 'Y = Ā (相反取反)'}
                    {s1Gate === 'NAND' && 'Y = (A·B)反'}
                    {s1Gate === 'NOR' && 'Y = (A+B)反'}
                  </span>
                </div>
              </div>
            </div>

            {/* 右侧零剧透知识验证 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  认知判定与理论验证
                </h4>
                <p className="text-sm text-slate-300 mb-4">
                  关于基本逻辑门电路的真值表规律，下列哪项表述是完全正确的？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '与门只有当所有输入全为1时输出才为1；或门只要有任一输入为1输出就为1' },
                    { id: 'B', text: '与门只要有一个输入为1输出就是1' },
                    { id: 'C', text: '非门输入为1时输出为两倍电压' },
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
                        onStepComplete('LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE', { s1Choice, s1Gate });
                      } else {
                        assessment.recordWrong('cognition');
                        sounds.playFailureSound?.();
                        alert('结论有误！与门是“全1出1”，或门是“有1出1”！');
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
                      <span>判定正确！牢固建立全1出1与有1出1的布尔真值模型。</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('cognition');
                        assessment.startStage('standard');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      进入步骤 2：试验箱实测验证 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 2：数字逻辑试验箱真值表验证 */}
      {currentStep === 'EXPERIMENT_BOX_TRUTH_VERIFICATION' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    试验箱工位：74HC08 四 2 输入与门真值表实测
                  </span>
                  <span className="text-sm text-slate-300">
                    当前输入: A={s2SwitchA ? '1' : '0'}, B={s2SwitchB ? '1' : '0'} → 输出 Y={s2CurrentOut ? '1 (灯亮)' : '0 (灯灭)'}
                  </span>
                </div>

                {/* 拨动开关与 LED */}
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-around mb-4">
                  <div className="text-center">
                    <div className="text-sm text-slate-300 mb-1">电平开关 A</div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS2SwitchA(!s2SwitchA);
                        sounds.playToggleSound?.();
                      }}
                      className={s2SwitchA ? 'bg-emerald-600 text-white text-sm cursor-pointer' : 'bg-slate-700 text-slate-300 text-sm cursor-pointer'}
                    >
                      {s2SwitchA ? '拨向上 (1/5V)' : '拨向下 (0/GND)'}
                    </Button>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-slate-300 mb-1">电平开关 B</div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS2SwitchB(!s2SwitchB);
                        sounds.playToggleSound?.();
                      }}
                      className={s2SwitchB ? 'bg-emerald-600 text-white text-sm cursor-pointer' : 'bg-slate-700 text-slate-300 text-sm cursor-pointer'}
                    >
                      {s2SwitchB ? '拨向上 (1/5V)' : '拨向下 (0/GND)'}
                    </Button>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-slate-300 mb-1">输出指示灯 Y</div>
                    <div
                      className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center font-bold text-sm border-2 ${
                        s2CurrentOut
                          ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-lg shadow-amber-400/50'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                      }`}
                    >
                      {s2CurrentOut ? '亮' : '灭'}
                    </div>
                  </div>
                </div>

                {/* 记录当前行到真值表 */}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      const key = `${s2SwitchA ? '1' : '0'}${s2SwitchB ? '1' : '0'}`;
                      setS2VerifiedRows((prev) => ({ ...prev, [key]: true }));
                      sounds.playToggleSound?.();
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer"
                  >
                    记录当前组合 (A={s2SwitchA ? '1' : '0'}, B={s2SwitchB ? '1' : '0'}) 到真值表
                  </Button>
                </div>
              </div>

              {/* 真值表记录卡 */}
              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-800 text-center text-sm">
                {[
                  { a: '0', b: '0', exp: '0' },
                  { a: '0', b: '1', exp: '0' },
                  { a: '1', b: '0', exp: '0' },
                  { a: '1', b: '1', exp: '1' },
                ].map((row) => {
                  const key = `${row.a}${row.b}`;
                  const isDone = s2VerifiedRows[key];
                  return (
                    <div
                      key={key}
                      className={`p-2 rounded-lg border ${
                        isDone ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-500'
                      }`}
                    >
                      <div>A={row.a}, B={row.b}</div>
                      <div className="font-bold font-mono">Y = {row.exp} {isDone ? '✓ 已验证' : '待测'}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 右侧零剧透判定 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  实测结果确认
                </h4>
                <p className="text-sm text-slate-300 mb-4">
                  拨动全部 4 种电平开关组合后，74HC08 与门输出 LED 只有在何种条件下才被点亮？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '仅当 A=1 且 B=1 时输出点亮，其他三种输入组合输出均熄灭' },
                    { id: 'B', text: '只要 A 和 B 中任意一个为 1 就会点亮' },
                    { id: 'C', text: '无论开关如何拨动，LED 始终保持常亮' },
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
                    disabled={!s2Choice || Object.keys(s2VerifiedRows).length < 4}
                    onClick={() => {
                      if (!requireMeterKnob(['LOGIC_PROBE', 'DCV_20'])) return;
                      if (s2Choice === 'A') {
                        setS2Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('EXPERIMENT_BOX_TRUTH_VERIFICATION', { s2Choice, s2VerifiedRows });
                      } else {
                        assessment.recordWrong('standard');
                        sounds.playFailureSound?.();
                        alert('结论有误，请先完成全部 4 组真值表实测记录！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer"
                  >
                    提交实测真值表
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>真值表验证 100% 吻合！数字试验箱实操规范过关。</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('standard');
                        assessment.startStage('calculation');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      进入步骤 3：汽车安全联锁设计 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 3：汽车安全带与车门安全联锁设计 */}
      {currentStep === 'VEHICLE_SAFETY_INTERLOCK_LOGIC' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    实车联锁逻辑仿真：安全带未系报警联锁
                  </span>
                  <span className={`text-sm font-bold font-mono ${s3AlarmTriggered ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                    {s3AlarmTriggered ? '🚨 蜂鸣报警激活！' : '✓ 静音正常'}
                  </span>
                </div>

                {/* 三项输入条件 */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/90 rounded-xl border border-slate-800 mb-4 text-sm">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                    <div className="text-sm text-slate-300 mb-1">条件 A: 压力传感器</div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS3SeatOccupied(!s3SeatOccupied);
                        sounds.playToggleSound?.();
                      }}
                      className={s3SeatOccupied ? 'bg-blue-600 text-white text-sm cursor-pointer' : 'bg-slate-700 text-slate-300 text-sm cursor-pointer'}
                    >
                      {s3SeatOccupied ? '有人入座 (A=1)' : '无人空座 (A=0)'}
                    </Button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                    <div className="text-sm text-slate-300 mb-1">条件 B: 安全带锁扣</div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS3SeatbeltUnbuckled(!s3SeatbeltUnbuckled);
                        sounds.playToggleSound?.();
                      }}
                      className={s3SeatbeltUnbuckled ? 'bg-amber-600 text-white text-sm cursor-pointer' : 'bg-emerald-600 text-white text-sm cursor-pointer'}
                    >
                      {s3SeatbeltUnbuckled ? '未系安全带 (B=1)' : '已牢固系好 (B=0)'}
                    </Button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                    <div className="text-sm text-slate-300 mb-1">条件 C: 车速信号</div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS3SpeedOver20(!s3SpeedOver20);
                        sounds.playToggleSound?.();
                      }}
                      className={s3SpeedOver20 ? 'bg-rose-600 text-white text-sm cursor-pointer' : 'bg-slate-700 text-slate-300 text-sm cursor-pointer'}
                    >
                      {s3SpeedOver20 ? '车速>20km/h (C=1)' : '驻车静止 (C=0)'}
                    </Button>
                  </div>
                </div>

                {/* 逻辑综合判定示意 */}
                <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between">
                  <div className="text-sm font-mono">
                    逻辑表达式: <span className="text-emerald-400 font-bold">Alarm = A · B · C (三输入与门)</span>
                  </div>
                  <div className="text-sm font-mono">
                    当前输出: <span className={`font-bold ${s3AlarmTriggered ? 'text-rose-400' : 'text-slate-400'}`}>
                      {s3AlarmTriggered ? '1 (报警鸣叫)' : '0 (不报警)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-300 pt-4 border-t border-slate-800 font-mono">
                安全规范: 只有驾驶员在座(A=1)、未系安全带(B=1)且车辆正在行驶(C=1)三者同时成立时，系统才触发声音与灯光报警。
              </div>
            </div>

            {/* 右侧定量分析题 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  逻辑设计工单
                </h4>
                <p className="text-sm text-slate-300 mb-4">
                  若驾驶员坐在车内(A=1)但车辆处于静止驻车状态(C=0)，即便未系安全带(B=1)，报警蜂鸣器是否应该鸣叫？对应的布尔逻辑值是多少？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '不鸣叫，因为 C=0，A·B·C = 1·1·0 = 0，避免驻车熄火时噪音干扰' },
                    { id: 'B', text: '鸣叫，只要未系安全带就必须立刻报警' },
                    { id: 'C', text: '不鸣叫，因为电路直接断电' },
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
                        onStepComplete('VEHICLE_SAFETY_INTERLOCK_LOGIC', { s3Choice, s3AlarmTriggered });
                      } else {
                        assessment.recordWrong('calculation');
                        sounds.playFailureSound?.();
                        alert('逻辑理解有误！与门要求全为1才输出1，C=0时不应触发蜂鸣！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer"
                  >
                    提交设计结论
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>设计分析完全正确！三条件与门联锁完全符合乘用车安全法规！</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('calculation');
                        assessment.startStage('blind_test');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      进入步骤 4：逻辑芯片盲测 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 4：典型故障盲测排查 */}
      {currentStep === 'BLIND_LOGIC_IC_FAULT_DIAGNOSIS' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    实训测试台：4 片未知 74HC08 芯片盲测
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setS4InA(!s4InA);
                        sounds.playToggleSound?.();
                      }}
                      className={s4InA ? 'bg-emerald-600 text-white text-sm cursor-pointer' : 'bg-slate-700 text-slate-300 text-sm cursor-pointer'}
                    >
                      A={s4InA ? '1' : '0'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS4InB(!s4InB);
                        sounds.playToggleSound?.();
                      }}
                      className={s4InB ? 'bg-emerald-600 text-white text-sm cursor-pointer' : 'bg-slate-700 text-slate-300 text-sm cursor-pointer'}
                    >
                      B={s4InB ? '1' : '0'}
                    </Button>
                  </div>
                </div>

                {/* 样件切换 */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {E05_SAMPLES.map((smp, idx) => (
                    <button
                      key={smp.id}
                      onClick={() => {
                        setS4SampleIndex(idx);
                        sounds.playToggleSound?.();
                      }}
                      className={`p-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
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
                  <div className="text-sm text-slate-300 mb-2">
                    测试对象: <span className="text-white font-bold">{activeSample.name}</span>
                  </div>
                  <div className="w-48 h-20 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center justify-center font-mono text-3xl font-black text-emerald-400">
                    {s4SampleOut ? 'HIGH (1 / 5V)' : 'LOW (0 / 0V)'}
                  </div>
                  <div className="text-sm text-slate-300 mt-2">
                    当前输入: A={s4InA ? '1' : '0'}, B={s4InB ? '1' : '0'}
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-300 pt-4 border-t border-slate-800">
                诊断提示: 良好管仅 11 输出 1；若输入 00 时输出仍有 1 或 10 输出 1，为输入端内部悬空虚高；恒为 0 且无功耗为 VCC 虚焊或输出接地击穿。
              </div>
            </div>

            {/* 右侧诊断报告 */}
            <div className="lg:col-span-5 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  逻辑芯片诊断工单
                </h4>
                <p className="text-sm text-slate-300 mb-3">判定 4 片未知芯片的内部物理状态：</p>

                <div className="space-y-3">
                  {E05_SAMPLES.map((smp) => (
                    <div key={smp.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-sm">
                      <div className="font-bold text-slate-200 mb-1.5">{smp.name}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { val: 'GOOD', label: '逻辑功能良好' },
                          { val: 'VCC_DISCONNECTED', label: 'VCC供电引脚虚焊' },
                          { val: 'INPUT_FLOATING', label: '输入引脚内部悬空' },
                          { val: 'OUTPUT_SHORT_GND', label: '输出引脚对地击穿' },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            disabled={s4Submitted}
                            onClick={() => {
                              setS4Diagnoses((prev) => ({ ...prev, [smp.id]: opt.val }));
                              sounds.playToggleSound?.();
                            }}
                            className={`p-2 rounded-lg border text-center text-sm font-medium transition-all cursor-pointer ${
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
                      if (!requireMeterKnob(['LOGIC_PROBE', 'DCV_20'])) return;
                      const allCorrect = E05_SAMPLES.every(
                        (smp) => s4Diagnoses[smp.id] === smp.actualType
                      );
                      if (allCorrect) {
                        setS4Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('BLIND_LOGIC_IC_FAULT_DIAGNOSIS', { s4Diagnoses });
                      } else {
                        assessment.recordWrong('blind_test');
                        sounds.playFailureSound?.();
                        alert('诊断存在偏差，请通过改变输入组合再次校验！');
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
                      <span>全组盲测分类 100% 正确！具备板级数字逻辑精准排查能力！</span>
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

      {/* 步骤 5：实车安全带报警误响修复与交车工单闭环 */}
      {currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    实车工单：系好安全带后报警蜂鸣器仍持续鸣叫
                  </span>
                  <span className="text-sm text-rose-400 font-mono font-bold">故障代码: B1206-11</span>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-sm space-y-3">
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">报修现象:</span> 车辆行驶中，驾驶员即便插牢安全带插扣，仪表盘红灯与蜂鸣器依然尖叫不止。
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">排查操作:</span> 用万用表电阻档 (200Ω) 测量安全带锁扣开关信号线对地电阻。
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!requireMeterKnob('OHM_200')) return;
                        setS5Measured(true);
                        sounds.playToggleSound?.();
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm cursor-pointer"
                    >
                      万用表测量锁扣信号线对地电阻
                    </Button>

                    {s5Measured && (
                      <div className="text-sm font-mono">
                        实测对地电阻:{' '}
                        <span className="text-rose-400 font-bold">
                          {s5Repaired ? 'OL (绝缘正常)' : '0.1 Ω (严重短路搭铁！)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {s5Measured && !s5Repaired && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                    <div className="text-sm text-amber-300 font-bold">
                      根因查明：锁扣线束在座椅滑轨下被割破外皮搭铁短路，导致 BCM 逻辑输入端恒为高电平 1！
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5Repaired(true);
                        sounds.playSuccessSound?.();
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold cursor-pointer"
                    >
                      更换原厂安全带锁扣总成线束并套耐磨波纹管
                    </Button>
                  </div>
                )}

                {s5Repaired && (
                  <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-emerald-300">
                        ✓ 新线束已更换并固定于安全卡槽，请插拔安全带验证消除报警
                      </div>
                      <div className="text-sm text-slate-300 mt-1">
                        复验验收标准: 插上安全带立刻停止报警，拔出安全带即刻恢复报警。
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5BuckleState(s5BuckleState === 'BUCKLED' ? 'UNBUCKLED' : 'BUCKLED');
                        sounds.playToggleSound?.();
                      }}
                      className={s5BuckleState === 'BUCKLED' ? 'bg-emerald-600 text-white text-sm cursor-pointer' : 'bg-amber-600 text-white text-sm cursor-pointer'}
                    >
                      {s5BuckleState === 'BUCKLED' ? '已插入安全带 (静音)' : '拔出安全带 (报警)'}
                    </Button>
                  </div>
                )}
              </div>

              {s5Repaired && (
                <div className="flex items-center gap-4 pt-4 border-t border-slate-800 text-sm font-mono">
                  <div className="text-emerald-400 font-bold">
                    {s5BuckleState === 'BUCKLED' ? '安全带系好，报警已静音 ✓' : '安全带拔出，报警正鸣叫 🚨'}
                  </div>
                  <div>车速信号: <span className="text-cyan-400 font-bold">35 km/h</span></div>
                  <div>座椅压力: <span className="text-emerald-400 font-bold">正常占用 (有人)</span></div>
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
                <p className="text-sm text-slate-300 mb-3">核验安全联锁修复指标：</p>

                <div className="space-y-2 text-sm">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">故障部位:</span>
                    <span className="text-slate-200 font-bold">安全带锁扣信号线磨破搭铁</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">更换件号:</span>
                    <span className="text-slate-200 font-bold">原厂锁扣带线束 + 耐磨套管</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">插锁消音:</span>
                    <span className="text-emerald-400 font-mono font-bold">响应时间 &lt; 0.1s (合格)</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">拔锁报警:</span>
                    <span className="text-emerald-400 font-bold">车速&gt;20km/h 准确报警</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="e05-sign"
                    disabled={!s5Repaired || s5Submitted}
                    checked={s5Signed}
                    onChange={(e) => setS5Signed(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <label htmlFor="e05-sign" className="text-sm text-slate-300 cursor-pointer">
                    维修技师已通过实车路试插拔联锁复验，确认符合乘用车安全法规，准予交车
                  </label>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                {!s5Submitted ? (
                  <Button
                    disabled={!s5Signed || !s5Repaired}
                    onClick={() => {
                      setS5Submitted(true);
                      sounds.playSuccessSound?.();
                      assessment.completeStage('transfer');
                      const finalResult = assessment.completeLevel();
                      onComplete?.(finalResult);
                      onStepComplete('ENGINEERING_REPAIR_AND_DELIVERY', {
                        s5Repaired,
                        s5BuckleState,
                      });
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold cursor-pointer"
                  >
                    签署交车工单
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>交车成功！整车安全联锁控制系统完全恢复出厂品质！</span>
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
