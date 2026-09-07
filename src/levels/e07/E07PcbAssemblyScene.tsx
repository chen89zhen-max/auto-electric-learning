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
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { evaluateMeterGuard } from '@/src/game/instruments/meterGuard';
import {
  type E07Step,
  E07_DEFECTS,
  E07_PRE_POWER_CHECKLIST,
} from './e07Training';

export interface PhysicalEvaluationData {
  id: string;
  teacherName: string;
  totalScore: number;
  signedAt: number;
  comment: string | null;
  rubricData: Record<string, number>;
}

interface E07PcbAssemblySceneProps {
  currentStep: E07Step;
  onStepComplete: (step: E07Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onComplete?: (result: LevelAssessmentResult) => void;
  hintRequested?: boolean;
  physicalEvaluation?: PhysicalEvaluationData | null;
}

export function E07PcbAssemblyScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onComplete,
  hintRequested = false,
  physicalEvaluation,
}: E07PcbAssemblySceneProps) {
  const assessment = useLevelAssessment('E07');

  React.useEffect(() => {
    if (hintRequested) {
      const stageMap: Record<E07Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
        SOLDERING_SAFETY_AND_FIVE_STEPS: 'cognition',
        VIRTUAL_PCB_INSERTION_AND_WELD: 'standard',
        SOLDER_JOINT_QUALITY_STANDARD: 'calculation',
        BLIND_PCB_DEFECT_INSPECTION: 'blind_test',
        ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
      };
      assessment.requestHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, assessment]);

  // Multimeter knob: 'OFF' | 'MAGNIFIER_10X' | 'BUZZER_OHM' | 'DCV_20'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'MAGNIFIER_10X' | 'BUZZER_OHM' | 'DCV_20'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Step 1: Safety & Five Steps & Pre-power checklist
  const [s1CheckedItems, setS1CheckedItems] = useState<Record<string, boolean>>({});
  const [s1HeatingStarted, setS1HeatingStarted] = useState<boolean>(false);
  const [s1SafetyWarning, setS1SafetyWarning] = useState<string | null>(null);
  const [s1CurrentStepIdx, setS1CurrentStepIdx] = useState<number>(0);
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Step 2: Virtual PCB Assembly
  const [s2InsertedParts, setS2InsertedParts] = useState<{
    resistor: boolean;
    diode: boolean;
    capacitor: boolean;
    soldered: boolean;
    trimmed: boolean;
  }>({
    resistor: false,
    diode: false,
    capacitor: false,
    soldered: false,
    trimmed: false,
  });
  const [s2Choice, setS2Choice] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: Quality Standard
  const [s3SelectedJoint, setS3SelectedJoint] = useState<'GOOD' | 'COLD' | 'BRIDGE' | 'LIFTED'>('GOOD');
  const [s3Choice, setS3Choice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Step 4: Blind Inspection
  const [s4DefectIdx, setS4DefectIdx] = useState<number>(0);
  const [s4Diagnoses, setS4Diagnoses] = useState<Record<string, string>>({});
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Step 5: Engineering Repair & Teacher Rubric
  const [s5BridgeCleared, setS5BridgeCleared] = useState<boolean>(false);
  const [s5ColdJointFixed, setS5ColdJointFixed] = useState<boolean>(false);
  const [s5PowerTested, setS5PowerTested] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  const requireTool = (required: ('MAGNIFIER_10X' | 'BUZZER_OHM' | 'DCV_20') | ('MAGNIFIER_10X' | 'BUZZER_OHM' | 'DCV_20')[]): boolean => {
    const stageMap: Record<E07Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
      SOLDERING_SAFETY_AND_FIVE_STEPS: 'cognition',
      VIRTUAL_PCB_INSERTION_AND_WELD: 'standard',
      SOLDER_JOINT_QUALITY_STANDARD: 'calculation',
      BLIND_PCB_DEFECT_INSPECTION: 'blind_test',
      ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
    };
    const guard = evaluateMeterGuard({
      currentMode: meterKnob,
      expectedMode: required,
      circuitPowered: false,
      resistanceMeasurement: Array.isArray(required) ? required.includes('BUZZER_OHM') : required === 'BUZZER_OHM',
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

  const activeDefect = E07_DEFECTS[s4DefectIdx];

  const FIVE_STEPS = [
    { num: 1, name: '准备施焊', desc: '烙铁头海绵清洗并挂薄锡，手握烙铁与焊丝呈45°' },
    { num: 2, name: '加热焊件', desc: '烙铁头同时接触引脚和焊盘铜箔，预热 1 秒' },
    { num: 3, name: '送入焊丝', desc: '从烙铁对侧送入松香焊锡丝，熔化适量焊锡漫流包围引脚' },
    { num: 4, name: '移开焊丝', desc: '焊料饱满后先撤离焊丝，防止焊丝粘死在焊点上' },
    { num: 5, name: '撤离烙铁', desc: '沿引脚45°快速撤开烙铁，全过程严格控制在 2~3 秒内' },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-slate-100 shadow-2xl backdrop-blur-md">
      {/* 顶部检测与焊接工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800/80 rounded-xl border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-semibold tracking-wider uppercase">
              PCB 质检与焊接工位 (恒温 330°C / DMM / 10X 放大镜)
            </div>
            <div className="text-sm font-bold text-slate-200">
              当前工具模式:{' '}
              <span
                className={
                  meterKnob === 'OFF'
                    ? 'text-rose-400 font-mono'
                    : 'text-emerald-400 font-mono font-black'
                }
              >
                {meterKnob === 'OFF' && 'OFF (仪器关闭)'}
                {meterKnob === 'MAGNIFIER_10X' && '10X 工业显微放大镜 (焊点视觉质检)'}
                {meterKnob === 'BUZZER_OHM' && '万用表蜂鸣通断档 (0.0Ω 桥连报警)'}
                {meterKnob === 'DCV_20' && '直流电压 20V 档 (通电试机复核)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">检测工具:</span>
          {(['OFF', 'MAGNIFIER_10X', 'BUZZER_OHM', 'DCV_20'] as const).map((knob) => (
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

      {/* 步骤 1：电烙铁安全规程与五步焊接法 */}
      {currentStep === 'SOLDERING_SAFETY_AND_FIVE_STEPS' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 flex flex-col justify-between p-6 bg-slate-950/80 rounded-2xl border border-slate-800 min-h-[360px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400 tracking-wider">
                    工艺规程：电烙铁安全与标准五步焊接法
                  </span>
                  <span className="text-sm font-mono text-emerald-400">恒温焊台: 330°C / 施焊时间: 2~3秒</span>
                </div>

                {/* 五步法交互导航 */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {FIVE_STEPS.map((step, idx) => (
                    <button
                      key={step.num}
                      onClick={() => {
                        setS1CurrentStepIdx(idx);
                        sounds.playToggleSound?.();
                      }}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                        s1CurrentStepIdx === idx
                          ? 'border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-500/40'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-sm font-bold text-blue-400">第 {step.num} 步</div>
                      <div className="text-sm font-bold mt-0.5">{step.name}</div>
                    </button>
                  ))}
                </div>

                {/* 当前步骤操作详解 */}
                <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-sm text-amber-400 font-bold mb-1">
                      操作要领 · 第 {FIVE_STEPS[s1CurrentStepIdx].num} 步：{FIVE_STEPS[s1CurrentStepIdx].name}
                    </div>
                    <p className="text-sm text-slate-200">{FIVE_STEPS[s1CurrentStepIdx].desc}</p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 border-2 border-blue-500/40 flex items-center justify-center font-mono font-bold text-xl text-blue-400">
                    {FIVE_STEPS[s1CurrentStepIdx].num}
                  </div>
                </div>
                {/* 焊前 6 项安全点检 */}
                <div className="mt-4 p-3 bg-slate-900/90 rounded-xl border border-amber-500/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      电烙铁通电前 6 项安全必检（未全部确认严禁通电加热）
                    </span>
                    <span className="text-sm font-mono text-slate-300">
                      已核验: {Object.values(s1CheckedItems).filter(Boolean).length} / 6
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                    {E07_PRE_POWER_CHECKLIST.map((item) => {
                      const isChecked = !!s1CheckedItems[item.id];
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            sounds.playToggleSound?.();
                            setS1CheckedItems((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                            setS1SafetyWarning(null);
                          }}
                          className={`p-2 rounded-lg text-left border flex items-center gap-2 cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded flex items-center justify-center text-sm font-bold border ${
                            isChecked ? 'bg-emerald-600 border-emerald-400 text-white' : 'border-slate-600'
                          }`}>
                            {isChecked ? '✓' : ''}
                          </span>
                          <span className="text-sm leading-tight">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {s1SafetyWarning && (
                    <div className="p-2 bg-rose-950/60 border border-rose-500 rounded text-rose-300 text-sm flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{s1SafetyWarning}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm text-slate-300">
                      {s1HeatingStarted ? '🔥 焊台已接通并加温至 330°C' : '请逐项核对无隐患后通电'}
                    </span>
                    <button
                      type="button"
                      disabled={s1HeatingStarted}
                      onClick={() => {
                        const checkedCount = Object.values(s1CheckedItems).filter(Boolean).length;
                        if (checkedCount < 6) {
                          assessment.recordUnsafeAction('cognition');
                          setS1SafetyWarning('安全阻断！必须逐项确认完成全部 6 项安全点检后方可通电！');
                          sounds.playFailureSound?.();
                          return;
                        }
                        sounds.zap?.();
                        setS1HeatingStarted(true);
                        setS1SafetyWarning(null);
                      }}
                      className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                        s1HeatingStarted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
                      }`}
                    >
                      {s1HeatingStarted ? '✓ 已通电安全加热 (330°C)' : '通电前点检完毕 · 开启焊台加热'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-300 pt-4 border-t border-slate-800 font-mono">
                安全红线: 严禁甩动烙铁甩锡！烙铁离开必须归位到烙铁架！单点加热严禁超过 4 秒以防焊盘脱落！
              </div>
            </div>

            {/* 右侧零剧透知识验证 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  工艺安全理论验证
                </h4>
                <p className="text-sm text-slate-300 mb-4">
                  关于手工焊接五步法及施焊时间控制，下列哪项规范是正确的？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '五步法为准备-加热-送丝-移丝-撤烙铁，每个焊点施焊时间严格控制在 2~3 秒内' },
                    { id: 'B', text: '加热时间越长越牢靠，最好每个焊点加热 20 秒以上' },
                    { id: 'C', text: '撤离烙铁后应立即用力吹气加速焊锡冷却' },
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
                      const checkedCount = Object.values(s1CheckedItems).filter(Boolean).length;
                      if (!s1HeatingStarted || checkedCount < 6) {
                        assessment.recordUnsafeAction('cognition');
                        setS1SafetyWarning('安全阻断！必须完成通电前 6 项安全点检并开启焊台后方可提交！');
                        sounds.playFailureSound?.();
                        return;
                      }
                      if (s1Choice === 'A') {
                        setS1Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('SOLDERING_SAFETY_AND_FIVE_STEPS', { s1Choice, prePowerChecks: s1CheckedItems });
                      } else {
                        assessment.recordWrong('cognition');
                        sounds.playFailureSound?.();
                        alert('规程有误！过度加热会导致焊盘脱落，吹气会导致焊点内部晶格粗糙冷焊！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer"
                  >
                    提交工艺判定
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>工艺规范考核过关！牢记 2~3 秒与五步黄金流程。</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('cognition');
                        assessment.startStage('standard');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      进入步骤 2：PCB 插装与焊接实操 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 2：PCB 元器件插装与焊接实操 */}
      {currentStep === 'VIRTUAL_PCB_INSERTION_AND_WELD' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    装配工位：元器件引脚成型、极性核对与插装焊接
                  </span>
                  <span className="text-sm text-slate-300">
                    工序进度: {[
                      s2InsertedParts.resistor && '电阻',
                      s2InsertedParts.diode && '二极管',
                      s2InsertedParts.capacitor && '电容',
                      s2InsertedParts.soldered && '已焊接',
                      s2InsertedParts.trimmed && '已剪脚',
                    ].filter(Boolean).join(' → ') || '待装配'}
                  </span>
                </div>

                {/* 虚拟 PCB 面板 */}
                <div className="p-4 bg-emerald-950/40 border-2 border-emerald-800/80 rounded-xl mb-4 relative min-h-[160px] flex items-center justify-around">
                  {/* 色环电阻 */}
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-700 text-center">
                    <div className="text-sm text-slate-300 mb-1">R1 贴板电阻</div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS2InsertedParts((p) => ({ ...p, resistor: true }));
                        sounds.playToggleSound?.();
                      }}
                      className={s2InsertedParts.resistor ? 'bg-emerald-600 text-white text-sm font-semibold cursor-pointer' : 'bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer'}
                    >
                      {s2InsertedParts.resistor ? '✓ 已水平平贴插装' : '折弯引脚并插装'}
                    </Button>
                  </div>

                  {/* 二极管 */}
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-700 text-center">
                    <div className="text-sm text-slate-300 mb-1">D1 二极管 (色环对齐阴极)</div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS2InsertedParts((p) => ({ ...p, diode: true }));
                        sounds.playToggleSound?.();
                      }}
                      className={s2InsertedParts.diode ? 'bg-emerald-600 text-white text-sm font-semibold cursor-pointer' : 'bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer'}
                    >
                      {s2InsertedParts.diode ? '✓ 极性核对插装' : '核对色环方向插装'}
                    </Button>
                  </div>

                  {/* 电解电容 */}
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-700 text-center">
                    <div className="text-sm text-slate-300 mb-1">C1 电解电容 (白条对阴影)</div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS2InsertedParts((p) => ({ ...p, capacitor: true }));
                        sounds.playToggleSound?.();
                      }}
                      className={s2InsertedParts.capacitor ? 'bg-emerald-600 text-white text-sm font-semibold cursor-pointer' : 'bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer'}
                    >
                      {s2InsertedParts.capacitor ? '✓ 负极对阴影插装' : '核对极性插装'}
                    </Button>
                  </div>
                </div>

                {/* 施焊与剪脚动作 */}
                <div className="flex gap-3">
                  <Button
                    disabled={!s2InsertedParts.resistor || !s2InsertedParts.diode || !s2InsertedParts.capacitor}
                    onClick={() => {
                      setS2InsertedParts((p) => ({ ...p, soldered: true }));
                      sounds.playSuccessSound?.();
                    }}
                    className={s2InsertedParts.soldered ? 'bg-emerald-600 text-white text-sm font-semibold cursor-pointer' : 'bg-blue-600 text-white text-sm font-semibold cursor-pointer'}
                  >
                    {s2InsertedParts.soldered ? '✓ 五步法施焊完成 (半月形光泽)' : '执行 330°C 五步法施焊'}
                  </Button>

                  <Button
                    disabled={!s2InsertedParts.soldered}
                    onClick={() => {
                      setS2InsertedParts((p) => ({ ...p, trimmed: true }));
                      sounds.playToggleSound?.();
                    }}
                    className={s2InsertedParts.trimmed ? 'bg-emerald-600 text-white text-sm font-semibold cursor-pointer' : 'bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer'}
                  >
                    {s2InsertedParts.trimmed ? '✓ 引脚齐根平整剪除 (留1mm)' : '斜口钳剪脚并酒精清洗'}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-slate-300 pt-4 border-t border-slate-800">
                工艺标准: 元器件贴板紧密，剪脚留长 1~1.5mm，板面无焦黑及残留锡渣松香。
              </div>
            </div>

            {/* 右侧零剧透判定 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  极性与插装质量准则
                </h4>
                <p className="text-sm text-slate-300 mb-4">
                  插装铝电解电容器时，引脚极性与 PCB 丝印标记应如何严格对应？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '电容外壳带白色箭头/粗线条的一侧为负极，必须插入 PCB 丝印带阴影网格的孔中' },
                    { id: 'B', text: '电解电容没有正负极，任意插装均可' },
                    { id: 'C', text: '长引脚为负极，短引脚为正极' },
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
                    disabled={!s2Choice || !s2InsertedParts.trimmed}
                    onClick={() => {
                      if (s2Choice === 'A') {
                        setS2Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('VIRTUAL_PCB_INSERTION_AND_WELD', { s2Choice, s2InsertedParts });
                      } else {
                        assessment.recordWrong('standard');
                        sounds.playFailureSound?.();
                        alert('判定有误！电解电容反接会炸膛，白条必须对齐阴影区！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer"
                  >
                    提交装配检验
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>插装焊接规范标准！极性正确，引脚剪切平整。</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('standard');
                        assessment.startStage('calculation');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      进入步骤 3：焊点质量形态标准 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 3：焊点质量形态标准对比 */}
      {currentStep === 'SOLDER_JOINT_QUALITY_STANDARD' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    显微质检：IPC-A-610 工业焊点形态切片库
                  </span>
                  <div className="flex gap-1">
                    {(
                      [
                        { id: 'GOOD', label: '合格半月形' },
                        { id: 'COLD', label: '虚焊/冷焊' },
                        { id: 'BRIDGE', label: '桥连短路' },
                        { id: 'LIFTED', label: '焊盘脱落' },
                      ] as const
                    ).map((j) => (
                      <button
                        key={j.id}
                        onClick={() => {
                          setS3SelectedJoint(j.id);
                          sounds.playToggleSound?.();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all cursor-pointer ${
                          s3SelectedJoint === j.id
                            ? 'border-blue-500 bg-blue-500/20 text-white'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {j.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 显微镜截面示意图 */}
                <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-around mb-4">
                  <div className="w-36 h-36 rounded-full border-4 border-blue-500/40 bg-slate-950 flex items-center justify-center p-3 relative overflow-hidden shadow-inner">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      {/* PCB 底板与铜皮 */}
                      <rect x="10" y="80" width="80" height="15" fill="#065f46" />
                      <rect x="25" y="76" width="50" height="4" fill="#b45309" />
                      {/* 引脚 */}
                      <rect x="47" y="20" width="6" height="60" fill="#94a3b8" />

                      {/* 焊锡形状 */}
                      {s3SelectedJoint === 'GOOD' && (
                        <path d="M 25 76 Q 47 70, 47 40 L 53 40 Q 53 70, 75 76 Z" fill="#cbd5e1" stroke="#94a3b8" />
                      )}
                      {s3SelectedJoint === 'COLD' && (
                        <circle cx="50" cy="65" r="18" fill="#64748b" stroke="#475569" strokeDasharray="3 2" />
                      )}
                      {s3SelectedJoint === 'BRIDGE' && (
                        <path d="M 15 76 L 85 76 L 75 50 L 25 50 Z" fill="#cbd5e1" stroke="#f43f5e" strokeWidth="2" />
                      )}
                      {s3SelectedJoint === 'LIFTED' && (
                        <path d="M 25 70 Q 50 65, 75 60" stroke="#f43f5e" strokeWidth="3" fill="none" />
                      )}
                    </svg>
                  </div>

                  <div className="max-w-xs text-sm space-y-2">
                    <div className="font-bold text-slate-200">
                      形态名称:{' '}
                      <span className="text-emerald-400">
                        {s3SelectedJoint === 'GOOD' && '合格焊点 (润湿良好半月裙摆)'}
                        {s3SelectedJoint === 'COLD' && '虚焊 / 冷焊 (豆腐渣灰暗球状)'}
                        {s3SelectedJoint === 'BRIDGE' && '桥连连锡 (相邻焊盘短路粘连)'}
                        {s3SelectedJoint === 'LIFTED' && '焊盘起皮撕裂 (严重超温脱胶)'}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      {s3SelectedJoint === 'GOOD' && '焊料沿引脚与焊盘充分浸润铺展，浸润角小于30度，引脚轮廓可见，电气导通良好。'}
                      {s3SelectedJoint === 'COLD' && '焊件未充分预热或引脚氧化，焊锡未熔透，存在虚接或随时断路风险。'}
                      {s3SelectedJoint === 'BRIDGE' && '送锡过量或拖锡拉丝，焊锡漫延横跨相邻铜箔，通电必烧保险丝！'}
                      {s3SelectedJoint === 'LIFTED' && '烙铁温度过高(>380°C)或单点干烤超过5秒，覆铜板环氧树脂碳化脱胶撕裂。'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-300 pt-4 border-t border-slate-800">
                标准定义: 工业 IPC-A-610 标准要求：良好焊点必须具备凹面半月形轮廓，润湿角 θ &lt; 30°。
              </div>
            </div>

            {/* 右侧定量分析题 */}
            <div className="lg:col-span-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  焊点质量标准判定
                </h4>
                <p className="text-sm text-slate-300 mb-4">
                  在汽车精密电路板制造与返修验收中，下列哪种焊点形态符合工业交付质量标准？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '表面光亮圆润，呈半月形凹面裙摆圆锥体，引脚轮廓清晰可见且润湿角小于30度' },
                    { id: 'B', text: '堆成一个大圆球，焊锡越多越结实' },
                    { id: 'C', text: '焊点灰暗起皱呈豆腐渣粗糙球状' },
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
                        onStepComplete('SOLDER_JOINT_QUALITY_STANDARD', { s3Choice, s3SelectedJoint });
                      } else {
                        assessment.recordWrong('calculation');
                        sounds.playFailureSound?.();
                        alert('判定有误！优质焊点必须是光润凹面半月形，而不是堆积死锡球！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer"
                  >
                    提交标准判定
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>标准掌握完全达标！具备专业 IPC 质检眼光。</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('calculation');
                        assessment.startStage('blind_test');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      进入步骤 4：典型工艺缺陷盲测 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 4：PCB 训练板 4 处典型缺陷盲测 */}
      {currentStep === 'BLIND_PCB_DEFECT_INSPECTION' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    质检台：待检训练板 4 处可疑焊点盲测
                  </span>
                  <span className="text-sm text-slate-300">请配合放大镜与万用表蜂鸣档</span>
                </div>

                {/* 缺陷点切换 */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {E07_DEFECTS.map((def, idx) => (
                    <button
                      key={def.id}
                      onClick={() => {
                        setS4DefectIdx(idx);
                        sounds.playToggleSound?.();
                      }}
                      className={`p-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                        s4DefectIdx === idx
                          ? 'border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-500/40'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      焊点 {idx + 1}
                    </button>
                  ))}
                </div>

                {/* 显微镜与万用表复检卡 */}
                <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
                  <div className="text-sm text-slate-300">
                    质检坐标: <span className="text-white font-bold">{activeDefect.location}</span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-300">10X 显微镜视觉形态</div>
                      <div className="text-sm font-bold text-amber-300 mt-1">{activeDefect.visualFeature}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-300">万用表电阻/蜂鸣档实测</div>
                      <div className="text-sm font-mono font-bold text-cyan-400 mt-1">
                        {activeDefect.multimeterOhm < 1 ? (
                          <span className="text-rose-400 animate-pulse">0.1 Ω (蜂鸣器短路狂叫！)</span>
                        ) : activeDefect.multimeterOhm > 900000 ? (
                          'OL (无穷大断路)'
                        ) : (
                          `${activeDefect.multimeterOhm} Ω (异常高阻虚接)`
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-300 pt-4 border-t border-slate-800">
                盲测准则: 0.1Ω狂叫为桥连短路；几百欧接触不良为冷焊虚焊；白条反向为极性反插；撕裂断线为焊盘脱落。
              </div>
            </div>

            {/* 右侧诊断报告 */}
            <div className="lg:col-span-5 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  PCB 质检报告卡
                </h4>
                <p className="text-sm text-slate-300 mb-3">为 4 处可疑位置判定缺陷类型：</p>

                <div className="space-y-3">
                  {E07_DEFECTS.map((def) => (
                    <div key={def.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-sm">
                      <div className="font-bold text-slate-200 mb-1.5">{def.location}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { val: 'BRIDGING', label: '桥连连锡短路' },
                          { val: 'COLD_SOLDER', label: '虚焊/冷焊接触不良' },
                          { val: 'REVERSED_POLARITY', label: '极性反向插装' },
                          { val: 'PAD_LIFT', label: '焊盘起皮撕裂' },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            disabled={s4Submitted}
                            onClick={() => {
                              setS4Diagnoses((prev) => ({ ...prev, [def.id]: opt.val }));
                              sounds.playToggleSound?.();
                            }}
                            className={`p-2 rounded-lg border text-center text-sm font-medium transition-all cursor-pointer ${
                              s4Diagnoses[def.id] === opt.val
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
                      if (!requireTool(['BUZZER_OHM', 'MAGNIFIER_10X'])) return;
                      const allCorrect = E07_DEFECTS.every(
                        (def) => s4Diagnoses[def.id] === def.actualDefect
                      );
                      if (allCorrect) {
                        setS4Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('BLIND_PCB_DEFECT_INSPECTION', { s4Diagnoses });
                      } else {
                        assessment.recordWrong('blind_test');
                        sounds.playFailureSound?.();
                        alert('诊断存在错误，请核对万用表电阻读数与显微镜观察特征！');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer"
                  >
                    提交四处质检结论
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>4 处工艺缺陷定位 100% 正确！具备资深硬件 QA 质检能力！</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('blind_test');
                        assessment.startStage('transfer', 'transfer');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      进入步骤 5：实车工程返修与交付 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 5：实车仪表板按键背光返修与教师量规验收 */}
      {currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    实车工单：组合仪表按键失效与液晶背光黑屏返修
                  </span>
                  <span className="text-sm text-rose-400 font-mono font-bold">工单编号: WO-PCB-8890</span>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-sm space-y-3">
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">故障描述:</span> 夜间行车仪表盘背光完全不亮，且里程复位按键完全无响应。
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">板级缺陷:</span> 电源滤波区存在微锡桥短路 12V 母线，同时背光 LED 供电限流电阻存在虚焊断路。
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5BridgeCleared(true);
                        sounds.playSuccessSound?.();
                      }}
                      className={s5BridgeCleared ? 'bg-emerald-600 text-white text-sm font-medium cursor-pointer' : 'bg-blue-600 text-white text-sm font-medium cursor-pointer'}
                    >
                      {s5BridgeCleared ? '✓ 纯铜吸锡带已清除锡桥' : '使用吸锡带吸除电源短路桥连'}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        setS5ColdJointFixed(true);
                        sounds.playSuccessSound?.();
                      }}
                      className={s5ColdJointFixed ? 'bg-emerald-600 text-white text-sm font-medium cursor-pointer' : 'bg-blue-600 text-white text-sm font-medium cursor-pointer'}
                    >
                      {s5ColdJointFixed ? '✓ 松香助焊剂补透虚焊' : '涂抹助焊剂补焊 LED 虚焊点'}
                    </Button>
                  </div>
                </div>

                {s5BridgeCleared && s5ColdJointFixed && (
                  <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-emerald-300">
                        ✓ 桥连与虚焊均已手工返修完毕，板面无水酒精清洁光亮，请通电试机
                      </div>
                      <div className="text-sm text-slate-300 mt-1">
                        通电指标: 全屏背光均匀点亮，按键灵敏，工作电流稳定在 120mA。
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5PowerTested(true);
                        sounds.playToggleSound?.();
                      }}
                      className={s5PowerTested ? 'bg-emerald-600 text-white text-sm font-medium cursor-pointer' : 'bg-blue-600 text-white text-sm font-medium cursor-pointer'}
                    >
                      {s5PowerTested ? '✓ 仪表板通电试机正常' : '接入 12V 供电试机'}
                    </Button>
                  </div>
                )}
              </div>

              {s5PowerTested && (
                <div className="flex items-center gap-4 pt-4 border-t border-slate-800 text-sm font-mono">
                  <div className="text-emerald-400 font-bold">仪表板背光全亮 💡</div>
                  <div>工作母线电流: <span className="text-cyan-400 font-bold">121.5 mA (标准)</span></div>
                  <div>按键功能: <span className="text-emerald-400 font-bold">100% 灵敏响应</span></div>
                </div>
              )}
            </div>

            {/* 右侧教师量规评定与交付 */}
            <div className="lg:col-span-5 p-5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  教师现场实物量规评定单 (E07-PHYSICAL-v1)
                </h4>
                <p className="text-sm text-slate-300 mb-3">依据国家职业标准及实操量规规范评定：</p>

                {physicalEvaluation ? (
                  <div className="space-y-2 text-sm">
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-emerald-300 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          教师实物量规已验收签署
                        </span>
                        <span className="font-mono text-sm">{physicalEvaluation.totalScore} 分 (已入库)</span>
                      </div>
                      <div className="text-sm text-slate-300 space-y-0.5">
                        <div>验收教师：<strong>{physicalEvaluation.teacherName}</strong></div>
                        <div>签署时间：{new Date(physicalEvaluation.signedAt).toLocaleString('zh-CN')}</div>
                        {physicalEvaluation.comment && <div>评语：{physicalEvaluation.comment}</div>}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                      <span className="text-slate-400">1. 供电前外观与安全核验:</span>
                      <span className="text-emerald-400 font-bold">{physicalEvaluation.rubricData?.pre_power_check ?? 0}/20 分</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                      <span className="text-slate-400">2. 元器件方向与插装规范:</span>
                      <span className="text-emerald-400 font-bold">{physicalEvaluation.rubricData?.component_orientation ?? 0}/20 分</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                      <span className="text-slate-400">3. 焊点形态与润湿质量:</span>
                      <span className="text-emerald-400 font-bold">{physicalEvaluation.rubricData?.solder_quality ?? 0}/30 分</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                      <span className="text-slate-400">4. 安全操作与工艺自检:</span>
                      <span className="text-emerald-400 font-bold">{physicalEvaluation.rubricData?.safety_process ?? 0}/20 分</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                      <span className="text-slate-400">5. 工艺原理与缺陷解释:</span>
                      <span className="text-emerald-400 font-bold">{physicalEvaluation.rubricData?.evidence_explanation ?? 0}/10 分</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2.5 text-sm text-amber-200">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>虚拟训练已完成，实物焊接等待任课教师验收</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      请携带焊接成品前往实训工位，由任课教师在教师工作台录入实物量规评语与各维度得分。
                    </p>
                    <div className="space-y-1.5 pt-2 border-t border-amber-500/20 text-sm text-slate-300">
                      <div className="flex justify-between">
                        <span>1. 供电前外观与安全核验:</span>
                        <span className="font-mono text-slate-300">满分 20 分</span>
                      </div>
                      <div className="flex justify-between">
                        <span>2. 元器件方向与插装规范:</span>
                        <span className="font-mono text-slate-300">满分 20 分</span>
                      </div>
                      <div className="flex justify-between">
                        <span>3. 焊点形态与润湿质量:</span>
                        <span className="font-mono text-slate-300">满分 30 分</span>
                      </div>
                      <div className="flex justify-between">
                        <span>4. 安全操作与工艺自检:</span>
                        <span className="font-mono text-slate-300">满分 20 分</span>
                      </div>
                      <div className="flex justify-between">
                        <span>5. 工艺原理与缺陷解释:</span>
                        <span className="font-mono text-slate-300">满分 10 分</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                {!s5Submitted ? (
                  <Button
                    disabled={!s5PowerTested}
                    onClick={() => {
                      setS5Submitted(true);
                      sounds.playSuccessSound?.();
                      assessment.completeStage('transfer');
                      const finalResult = assessment.completeLevel();
                      onComplete?.(finalResult);
                      onStepComplete('ENGINEERING_REPAIR_AND_DELIVERY', {
                        s5BridgeCleared,
                        s5ColdJointFixed,
                        s5PowerTested,
                      });
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold cursor-pointer"
                  >
                    完成虚拟排故与通电测试并提交
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {physicalEvaluation
                        ? '交车成功！整车仪表板恢复出厂性能，工艺量规已验收！'
                        : '虚拟训练已完成，实物焊接等待任课教师验收'}
                    </span>
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
