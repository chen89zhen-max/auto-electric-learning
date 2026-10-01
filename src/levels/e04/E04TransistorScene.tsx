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
  type E04Step,
  type BjtState,
  type E04StateSampleRecord,
  E04_SAMPLES,
  calculateBjtOperatingPoint,
  hasCompletedAllThreeStates,
} from './e04Training';
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { evaluateMeterGuard } from '@/src/game/instruments/meterGuard';

interface E04TransistorSceneProps {
  currentStep: E04Step;
  onStepComplete: (step: E04Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
  onComplete?: (result: LevelAssessmentResult) => void;
  hintRequested?: boolean;
}

export function E04TransistorScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
  onComplete,
  hintRequested = false,
}: E04TransistorSceneProps) {
  const assessment = useLevelAssessment('E04');
  const requestAssessmentHint = assessment.requestHint;
  // Multimeter knob: 'OFF' | 'DIODE' | 'HFE' | 'DCV_20'
  const [meterKnob, setMeterKnob] = useState<'OFF' | 'DIODE' | 'HFE' | 'DCV_20'>('OFF');
  const [meterWarning, setMeterWarning] = useState<string | null>(null);

  // Step 1: Principle & Schematic
  const [s1Triggered, setS1Triggered] = useState<boolean>(false);
  const [s1Choice, setS1Choice] = useState<string | null>(null);
  const [s1Submitted, setS1Submitted] = useState<boolean>(false);

  // Step 2: Multimeter Pin & hFE
  const [s2Target, setS2Target] = useState<'PIN_BE' | 'PIN_BC' | 'PIN_CE' | 'HFE_SLOT'>('PIN_BE');
  const [s2Choice, setS2Choice] = useState<string | null>(null);
  const [s2Submitted, setS2Submitted] = useState<boolean>(false);

  // Step 3: Three States Calculation & Independent Judgment
  const [s3BaseVoltage, setS3BaseVoltage] = useState<number>(5.0);
  const [s3BaseResistorOhm, setS3BaseResistorOhm] = useState<number>(2200); // 2.2k
  const [s3SelectedState, setS3SelectedState] = useState<BjtState | null>(null);
  const [s3Verification, setS3Verification] = useState<{
    verified: boolean;
    isCorrect: boolean;
    feedback: string;
  } | null>(null);
  const [s3ThreeStateRecords, setS3ThreeStateRecords] = useState<E04StateSampleRecord[]>([]);
  const [s3Choice, setS3Choice] = useState<string | null>(null);
  const [s3Submitted, setS3Submitted] = useState<boolean>(false);

  // Step 4: Blind Fault Diagnosis
  const [s4SampleIndex, setS4SampleIndex] = useState<number>(0);
  const [s4TriggerState, setS4TriggerState] = useState<boolean>(false);
  const [s4Diagnoses, setS4Diagnoses] = useState<Record<string, string>>({});
  const [s4Submitted, setS4Submitted] = useState<boolean>(false);

  // Step 5: Engineering Repair
  const [s5Measured, setS5Measured] = useState<boolean>(false);
  const [s5Repaired, setS5Repaired] = useState<boolean>(false);
  const [s5SimTemp, setS5SimTemp] = useState<number>(85);
  const [s5Signed, setS5Signed] = useState<boolean>(false);
  const [s5Submitted, setS5Submitted] = useState<boolean>(false);

  React.useEffect(() => {
    if (hintRequested) {
      const stageMap: Record<E04Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
        TRANSISTOR_PRINCIPLE_COGNITION: 'cognition',
        MULTIMETER_PIN_AND_BETA_TEST: 'standard',
        THREE_OPERATION_STATES_CALC: 'calculation',
        BLIND_TRANSISTOR_FAULT_DIAGNOSIS: 'blind_test',
        ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
      };
      requestAssessmentHint(stageMap[currentStep]);
    }
  }, [hintRequested, currentStep, requestAssessmentHint]);

  const requireMeterKnob = (required: ('DIODE' | 'HFE' | 'DCV_20') | ('DIODE' | 'HFE' | 'DCV_20')[]): boolean => {
    const stageMap: Record<E04Step, 'cognition' | 'standard' | 'calculation' | 'blind_test' | 'transfer'> = {
      TRANSISTOR_PRINCIPLE_COGNITION: 'cognition',
      MULTIMETER_PIN_AND_BETA_TEST: 'standard',
      THREE_OPERATION_STATES_CALC: 'calculation',
      BLIND_TRANSISTOR_FAULT_DIAGNOSIS: 'blind_test',
      ENGINEERING_REPAIR_AND_DELIVERY: 'transfer',
    };
    const guard = evaluateMeterGuard({
      currentMode: meterKnob,
      expectedMode: required,
      circuitPowered: currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' ? s5Repaired : false,
      resistanceMeasurement: false,
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

  const s3Point = calculateBjtOperatingPoint(s3BaseVoltage, s3BaseResistorOhm, 80, 100);
  const activeSample = E04_SAMPLES[s4SampleIndex];

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 shadow-sm">
      {/* 顶部数字万用表状态栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 tracking-wider uppercase">
              汽车数字万用表 (DMM-950 晶体管分析型)
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
                {meterKnob === 'DIODE' && '二极管档 (->|- / 🕪)'}
                {meterKnob === 'HFE' && '晶体管放大倍数测定档 (hFE)'}
                {meterKnob === 'DCV_20' && '直流电压 20V 挡 (V=)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">旋钮挡位:</span>
          {(['OFF', 'DIODE', 'HFE', 'DCV_20'] as const).map((knob) => (
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

      {/* 步骤 1：三极管结构与小控大开关机理认知 */}
      {currentStep === 'TRANSISTOR_PRINCIPLE_COGNITION' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 flex flex-col justify-between p-6 bg-slate-950/80 rounded-2xl border border-slate-800 min-h-[360px]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase text-blue-400 tracking-wider">
                  电路拓扑：ECU 弱电信号驱动 12V 继电器
                </span>
                <span className="text-sm text-slate-300">微弱电流 Ib (mA) 控制大电流 Ic (150mA)</span>
              </div>

              {/* 电路仿真示意 */}
              <div className="relative w-full h-64 flex items-center justify-center my-4 bg-slate-900/60 rounded-xl border border-slate-800/80 p-3">
                <svg className="w-full h-full max-w-md" viewBox="0 0 400 180">
                  {/* ECU 信号 */}
                  <rect x="20" y="70" width="60" height="40" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                  <text x="30" y="95" fill="#38bdf8" fontSize="11" fontWeight="bold">
                    {s1Triggered ? 'ECU 5V' : 'ECU 0V'}
                  </text>

                  {/* 基极限流电阻 Rb */}
                  <line x1="80" y1="90" x2="130" y2="90" stroke={s1Triggered ? '#10b981' : '#64748b'} strokeWidth="3" />
                  <rect x="130" y="82" width="35" height="16" fill="#334155" stroke="#94a3b8" />
                  <text x="132" y="94" fill="#f8fafc" fontSize="11" fontWeight="bold">2.2kΩ</text>
                  <line x1="165" y1="90" x2="200" y2="90" stroke={s1Triggered ? '#10b981' : '#64748b'} strokeWidth="3" />

                  {/* NPN 三极管 */}
                  <circle cx="215" cy="90" r="22" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  {/* B 极垂直线 */}
                  <line x1="205" y1="75" x2="205" y2="105" stroke="#f8fafc" strokeWidth="3" />
                  {/* C 极 */}
                  <line x1="205" y1="80" x2="225" y2="70" stroke="#f8fafc" strokeWidth="2" />
                  <line x1="225" y1="70" x2="225" y2="40" stroke={s1Triggered ? '#10b981' : '#64748b'} strokeWidth="3" />
                  {/* E 极带箭头 */}
                  <line x1="205" y1="100" x2="225" y2="110" stroke="#f8fafc" strokeWidth="2" />
                  <polygon points="220,105 225,110 218,111" fill="#f43f5e" />
                  <line x1="225" y1="110" x2="225" y2="150" stroke="#64748b" strokeWidth="3" />
                  {/* 接地 */}
                  <line x1="215" y1="150" x2="235" y2="150" stroke="#94a3b8" strokeWidth="3" />
                  <line x1="219" y1="154" x2="231" y2="154" stroke="#94a3b8" strokeWidth="2" />

                  {/* 12V 继电器线圈 */}
                  <rect x="205" y="10" width="40" height="30" rx="4" fill="#334155" stroke={s1Triggered ? '#10b981' : '#94a3b8'} strokeWidth="2" />
                  <text x="207" y="28" fill="#f8fafc" fontSize="11" fontWeight="bold">继电器</text>
                  <line x1="225" y1="10" x2="225" y2="0" stroke="#10b981" strokeWidth="3" />
                  <text x="233" y="11" fill="#f59e0b" fontSize="12" fontWeight="bold">+12V</text>

                  {/* 状态指示 */}
                  <g transform="translate(290, 60)">
                    <rect x="0" y="0" width="90" height="60" rx="8" fill="#1e293b" stroke="#334155" />
                    <text x="10" y="22" fill="#cbd5e1" fontSize="12">继电器动作:</text>
                    <text x="10" y="44" fill={s1Triggered ? '#10b981' : '#94a3b8'} fontSize="12" fontWeight="bold">
                      {s1Triggered ? '✓ 咔嗒吸合' : '释放断开'}
                    </text>
                  </g>
                </svg>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-4 text-sm font-mono">
                  <div>
                    基极电流 Ib:{' '}
                    <span className="text-cyan-400 font-bold">{s1Triggered ? '1.95 mA' : '0.00 mA'}</span>
                  </div>
                  <div>
                    集电极电流 Ic:{' '}
                    <span className="text-emerald-400 font-bold">{s1Triggered ? '150.0 mA' : '0.0 mA'}</span>
                  </div>
                  <div>
                    放大状态:{' '}
                    <span className="text-amber-300 font-bold">{s1Triggered ? '饱和导通 (Uce≈0.2V)' : '完全截止'}</span>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setS1Triggered(!s1Triggered);
                    sounds.playToggleSound?.();
                  }}
                  variant="outline"
                  className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium cursor-pointer"
                >
                  {s1Triggered ? '关闭 ECU 信号 (置 0V)' : '输入 ECU 驱动信号 (置 5V)'}
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
                  在汽车电控单元中，三极管充当继电器驱动器的核心作用是什么？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '以微弱的单片机基极电流(Ib约2mA)，控制并放大为大电流(Ic约150mA)驱动电磁线圈' },
                    { id: 'B', text: '将直流 12V 逆变转化为三相高压交流电' },
                    { id: 'C', text: '彻底代替蓄电池为整车提供持续电能' },
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
                    disabled={!s1Choice}
                    onClick={() => {
                      if (s1Choice === 'A') {
                        setS1Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('TRANSISTOR_PRINCIPLE_COGNITION', { s1Choice, s1Triggered });
                      } else {
                        assessment.recordWrong('cognition');
                        sounds.playFailureSound?.();
                        alert('结论有误，三极管在开关电路中是以微弱基极信号驱动大电流负载！');
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
                      <span>判定正确！三极管实现弱电对强电的电子开关精准放大驱动！</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('cognition');
                        assessment.startStage('standard');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      进入步骤 2：引脚识别与 β 测量 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 2：万用表引脚判别与 β 放大倍数测试 */}
      {currentStep === 'MULTIMETER_PIN_AND_BETA_TEST' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    实训台：三极管 B/C/E 极性与 hFE 放大倍数测量
                  </span>
                  <span className="text-sm text-slate-300">测试对象: 标称 S8050 NPN 管</span>
                </div>

                {/* 测量靶点选择 */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {(
                    [
                      { id: 'PIN_BE', label: 'B-E 发射结' },
                      { id: 'PIN_BC', label: 'B-C 集电结' },
                      { id: 'PIN_CE', label: 'C-E 间导通检查' },
                      { id: 'HFE_SLOT', label: 'hFE 放大倍数插孔' },
                    ] as const
                  ).map((target) => (
                    <button
                      key={target.id}
                      onClick={() => {
                        setS2Target(target.id);
                        sounds.playToggleSound?.();
                      }}
                      className={`p-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                        s2Target === target.id
                          ? 'border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-500/40'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>

                {/* 万用表表头 */}
                <div className="p-6 bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-sm mx-auto shadow-inner flex flex-col items-center">
                  <div className="w-full h-24 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center justify-center font-mono">
                    <span className="text-4xl font-black text-emerald-400 tracking-wider">
                      {meterKnob === 'OFF' && '----'}
                      {meterKnob === 'DIODE' && (
                        s2Target === 'PIN_BE' ? '0.672 V' : s2Target === 'PIN_BC' ? '0.645 V' : 'OL'
                      )}
                      {meterKnob === 'HFE' && (
                        s2Target === 'HFE_SLOT' ? '145' : '请插测试孔'
                      )}
                      {meterKnob === 'DCV_20' && '0.00 V'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 mt-2 font-medium">
                    {meterKnob === 'DIODE' && s2Target === 'PIN_BE' && '发射结 B-E 正向导通 (本样本显示压降 672mV)'}
                    {meterKnob === 'DIODE' && s2Target === 'PIN_BC' && '集电结 B-C 正向导通 (本样本显示压降 645mV)'}
                    {meterKnob === 'DIODE' && s2Target === 'PIN_CE' && 'C-E 间反向未导通 (二极管档显示 OL，仅说明当前未导通，不证明耐压试验)'}
                    {meterKnob === 'HFE' && s2Target === 'HFE_SLOT' && '直流电流放大倍数 β = 145 (本台架器件特定测试条件下实测值，非全系列通用唯一值)'}
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-300 pt-4 border-t border-slate-800">
                引脚识别规范: 红笔定在 B，测另外两极均有压降为 NPN 管；C 与 E 的确切判定应严格查阅原厂数据手册与封装引脚定义。
              </div>
            </div>

            {/* 右侧零剧透判定 */}
            <div className="lg:col-span-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  引脚与好坏判别规则
                </h4>
                <p className="text-sm text-slate-600 mb-4">
                  在确定基极 B 后，工程上如何规范、确凿地辨别发射极 E 与集电极 C？
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'A', text: '查阅对应原厂数据手册与封装引脚定义（如 TO-92 封装标准管脚排布），必要时结合专档复核，不能单凭微小压降泛化判断' },
                    { id: 'B', text: '发射极测出来阻值恒为 0Ω，集电极恒为无穷大' },
                    { id: 'C', text: '仅凭普通二极管档测量即可完全排除所有封装差异与参数离散' },
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
                      if (!requireMeterKnob(['DIODE', 'HFE'])) return;
                      if (s2Choice === 'A') {
                        setS2Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('MULTIMETER_PIN_AND_BETA_TEST', { s2Choice, s2Target });
                      } else {
                        assessment.recordWrong('standard');
                        sounds.playFailureSound?.();
                        alert('判别有误！不同厂商与工艺离散度下不能仅凭微小压降泛化断定 C/E，应严格结合原厂数据手册与引脚规范判定！');
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
                      <span>检测规范掌握精准！结合数据手册与测试插孔，管脚与 β 参数全部厘清。</span>
                    </div>
                    <Button
                      onClick={() => {
                        assessment.completeStage('standard');
                        assessment.startStage('calculation');
                        onAdvanceStep();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      进入步骤 3：三态定量切换计算 <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 3：截止、放大与饱和三态定量计算与独立状态判定 */}
      {currentStep === 'THREE_OPERATION_STATES_CALC' && (() => {
        const s3HasCutoff = s3ThreeStateRecords.some((r) => r.isCorrect && r.studentState === 'CUTOFF');
        const s3HasActive = s3ThreeStateRecords.some((r) => r.isCorrect && r.studentState === 'ACTIVE');
        const s3HasSaturation = s3ThreeStateRecords.some((r) => r.isCorrect && r.studentState === 'SATURATION');
        const s3CompletedCount = (s3HasCutoff ? 1 : 0) + (s3HasActive ? 1 : 0) + (s3HasSaturation ? 1 : 0);
        const s3AllThreeReady = hasCompletedAllThreeStates(s3ThreeStateRecords);

        const stateLabels: Record<BjtState, string> = {
          CUTOFF: '截止区 (Cutoff)',
          ACTIVE: '线性放大区 (Active)',
          SATURATION: '深度饱和区 (Saturation)',
        };

        const handleSliderVoltage = (val: number) => {
          if (s3Submitted) setS3Submitted(false);
          setS3BaseVoltage(val);
          setS3SelectedState(null);
          setS3Verification(null);
        };

        const handleSliderResistor = (val: number) => {
          if (s3Submitted) setS3Submitted(false);
          setS3BaseResistorOhm(val);
          setS3SelectedState(null);
          setS3Verification(null);
        };

        const handleVerifyAndRecord = () => {
          if (!s3SelectedState || s3Submitted) return;
          const isCorrect = s3SelectedState === s3Point.state;
          const record: E04StateSampleRecord = {
            uIn: s3BaseVoltage,
            rBaseOhm: s3BaseResistorOhm,
            rLoadOhm: 80,
            vSupply: 12.0,
            ibMa: s3Point.ibMa,
            icMa: s3Point.icMa,
            uceV: s3Point.uceV,
            actualState: s3Point.state,
            studentState: s3SelectedState,
            isCorrect,
            timestamp: Date.now(),
          };

          setS3ThreeStateRecords((prev) => [...prev, record]);

          if (isCorrect) {
            sounds.playSuccessSound?.();
            setS3Verification({
              verified: true,
              isCorrect: true,
              feedback: `判断正确！当前条件（Ub=${s3BaseVoltage.toFixed(1)}V, Rb=${(s3BaseResistorOhm / 1000).toFixed(1)}kΩ）下管子处于【${stateLabels[s3Point.state]}】。数据已录入。`,
            });
          } else {
            assessment.recordWrong('calculation');
            sounds.playFailureSound?.();
            setS3Verification({
              verified: true,
              isCorrect: false,
              feedback: `判断有误！当前测得 Ib=${s3Point.ibMa}mA, Uce=${s3Point.uceV}V，不符合【${stateLabels[s3SelectedState]}】物理特征，请重新分析判断！`,
            });
          }
        };

        const handleClearRecords = () => {
          sounds.playToggleSound?.();
          setS3ThreeStateRecords([]);
          setS3SelectedState(null);
          setS3Verification(null);
          setS3Submitted(false);
        };

        return (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* 左侧工作状态分析仪 */}
              <div className="lg:col-span-8 p-5 md:p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[420px]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <span className="text-sm font-bold uppercase text-blue-400">
                      工作状态分析仪：调节偏置实测三态
                    </span>
                    <div className="flex items-center gap-2">
                      <label htmlFor="e04-voltage-input" className="text-sm font-medium text-slate-300">
                        基极输入电压 Ub:
                      </label>
                      <input
                        id="e04-voltage-input"
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        disabled={s3Submitted}
                        value={s3BaseVoltage}
                        onChange={(e) => handleSliderVoltage(parseFloat(e.target.value))}
                        className="w-24 accent-blue-500 cursor-pointer disabled:opacity-50"
                      />
                      <span className="text-sm font-mono font-bold text-blue-300">{s3BaseVoltage.toFixed(1)}V</span>
                    </div>
                  </div>

                  {/* 滑动条与电阻控制 */}
                  <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm text-slate-300 mb-1">
                        <label htmlFor="e04-resistor-input" className="cursor-pointer">基极限流电阻 Rb:</label>
                        <span className="font-mono font-bold text-emerald-400">{(s3BaseResistorOhm / 1000).toFixed(1)} kΩ</span>
                      </div>
                      <input
                        id="e04-resistor-input"
                        type="range"
                        min="1000"
                        max="30000"
                        step="1000"
                        disabled={s3Submitted}
                        value={s3BaseResistorOhm}
                        onChange={(e) => handleSliderResistor(parseInt(e.target.value, 10))}
                        className="w-full accent-emerald-500 cursor-pointer disabled:opacity-50"
                      />
                    </div>

                    {/* 仪表读数看板 (验证前不直接剧透状态答案) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2 border-t border-slate-800">
                      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/60">
                        <div className="text-sm text-slate-400">基极 Ib</div>
                        <div className="text-base font-mono font-bold text-cyan-400">{s3Point.ibMa} mA</div>
                      </div>
                      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/60">
                        <div className="text-sm text-slate-400">集电极 Ic</div>
                        <div className="text-base font-mono font-bold text-emerald-400">{s3Point.icMa} mA</div>
                      </div>
                      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/60">
                        <div className="text-sm text-slate-400">管压降 Uce</div>
                        <div className="text-base font-mono font-bold text-amber-300">{s3Point.uceV} V</div>
                      </div>
                      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/60 flex flex-col justify-center">
                        <div className="text-sm text-slate-400">状态判读</div>
                        <div className="text-sm font-bold mt-1">
                          {s3Verification?.verified ? (
                            s3Verification.isCorrect ? (
                              <span className="text-emerald-400">{stateLabels[s3Point.state]}</span>
                            ) : (
                              <span className="text-rose-400">判定有误</span>
                            )
                          ) : (
                            <span className="text-slate-400">待分析判定</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 独立状态判断与录入区 */}
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-200">
                        请根据测得参数自主判断三极管当前状态：
                      </span>
                      {s3Submitted && (
                        <span className="text-sm text-amber-400">（已提交工单，控件锁定）</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(['CUTOFF', 'ACTIVE', 'SATURATION'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={s3Submitted}
                          onClick={() => {
                            setS3SelectedState(st);
                            sounds.playToggleSound?.();
                          }}
                          className={`p-2.5 rounded-lg border text-sm font-bold transition-all cursor-pointer ${
                            s3SelectedState === st
                              ? 'border-blue-500 bg-blue-500/20 text-blue-200 ring-2 ring-blue-500/30'
                              : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {stateLabels[st]}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Button
                        size="sm"
                        disabled={!s3SelectedState || s3Submitted}
                        onClick={handleVerifyAndRecord}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
                      >
                        验证并记录当前状态
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={s3ThreeStateRecords.length === 0 || s3Submitted}
                        onClick={handleClearRecords}
                        className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-sm cursor-pointer"
                      >
                        清空实测记录
                      </Button>
                      {s3Submitted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setS3Submitted(false)}
                          className="border-amber-600/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-sm cursor-pointer"
                        >
                          重新测算修改
                        </Button>
                      )}
                    </div>

                    {s3Verification && (
                      <div
                        className={`p-2.5 rounded-lg text-sm font-medium border ${
                          s3Verification.isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {s3Verification.feedback}
                      </div>
                    )}
                  </div>

                  {/* 三态记录清单与进度 */}
                  <div className="p-3.5 bg-slate-900/40 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-300">三态实测记录留痕（完成门槛：3/3）</span>
                      <span className="text-sm font-mono font-bold text-blue-400">已有效达成: {s3CompletedCount} / 3</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className={`p-2 rounded-lg border text-sm ${s3HasCutoff ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                        <div className="font-bold flex items-center justify-between">
                          <span>截止区 (Cutoff)</span>
                          <span>{s3HasCutoff ? '✓ 已达成' : '未记录'}</span>
                        </div>
                        <div className="text-sm text-slate-400 mt-0.5">Ub≤0.7V, Ib=0, Uce=12V</div>
                      </div>
                      <div className={`p-2 rounded-lg border text-sm ${s3HasActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                        <div className="font-bold flex items-center justify-between">
                          <span>放大区 (Active)</span>
                          <span>{s3HasActive ? '✓ 已达成' : '未记录'}</span>
                        </div>
                        <div className="text-sm text-slate-400 mt-0.5">Ic=β·Ib, 0.2V&lt;Uce&lt;12V</div>
                      </div>
                      <div className={`p-2 rounded-lg border text-sm ${s3HasSaturation ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                        <div className="font-bold flex items-center justify-between">
                          <span>饱和区 (Saturation)</span>
                          <span>{s3HasSaturation ? '✓ 已达成' : '未记录'}</span>
                        </div>
                        <div className="text-sm text-slate-400 mt-0.5">Uce=0.2V ≤ 0.3V</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-slate-400 pt-3 mt-3 border-t border-slate-800 font-mono">
                  台架假设说明: 供电 Vcc=12.0V, Vbe=0.7V, 深度饱和 Vce(sat)=0.2V, 继电器负载 80Ω, 标称放大倍数 β=100。
                </div>
              </div>

              {/* 右侧定量计算工单 */}
              <div className="lg:col-span-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    三极管开关设计工单
                  </h4>
                  <p className="text-sm text-slate-600 mb-3">
                    汽车 ECU 输出 5V 信号驱动 12V 汽车继电器（台架限流约 147.5mA），要确保三极管可靠进入“深度饱和导通”且发热最小，管压降 Uce 应满足什么标准？
                  </p>

                  {!s3AllThreeReady && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm mb-3 font-medium">
                      <strong>实训考核门槛：</strong>需在左侧调节偏置，独立判定并正确记录【截止、放大、饱和】全部 3 种工作状态（当前进度：{s3CompletedCount}/3）。全部达成后方可提交工单。
                    </div>
                  )}

                  <div className="space-y-2">
                    {[
                      { id: 'A', text: 'Uce ≤ 0.3V (深度饱和，相当于电子触点彻底闭合)' },
                      { id: 'B', text: 'Uce 必须恒定在 6.0V (处在放大区正中间)' },
                      { id: 'C', text: 'Uce 越高越好，最好达到 12.0V' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={s3Submitted}
                        onClick={() => {
                          setS3Choice(opt.id);
                          sounds.playToggleSound?.();
                        }}
                        className={`w-full text-left p-3 rounded-xl border text-sm transition-all cursor-pointer ${
                          s3Choice === opt.id
                            ? 'border-blue-500 bg-blue-500/10 text-slate-900 font-bold'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <span className="font-mono font-bold mr-2 text-blue-500">{opt.id}.</span>
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200">
                  {!s3Submitted ? (
                    <Button
                      disabled={!s3Choice || !s3AllThreeReady}
                      onClick={() => {
                        if (!s3AllThreeReady) return;
                        if (s3Choice === 'A') {
                          setS3Submitted(true);
                          sounds.playSuccessSound?.();
                          onStepComplete('THREE_OPERATION_STATES_CALC', {
                            s3Choice,
                            s3Point,
                            s3ThreeStateRecords,
                          });
                        } else {
                          assessment.recordWrong('calculation');
                          sounds.playFailureSound?.();
                          alert('结论有误！汽车开关应用必须确保深度饱和导通 Uce ≤ 0.3V！');
                        }
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {s3AllThreeReady ? '提交设计结论' : `须先录齐三态 (${s3CompletedCount}/3)`}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>计算与三态实测完全达标！深度饱和保证开关驱动极小功耗！</span>
                      </div>
                      <Button
                        onClick={() => {
                          assessment.completeStage('calculation');
                          assessment.startStage('blind_test');
                          onAdvanceStep();
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        进入步骤 4：典型故障盲测 <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 步骤 4：典型故障盲测排查 */}
      {currentStep === 'BLIND_TRANSISTOR_FAULT_DIAGNOSIS' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    实训台：4 组未知三极管驱动模块盲测
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setS4TriggerState(!s4TriggerState);
                      sounds.playToggleSound?.();
                    }}
                    className={s4TriggerState ? 'bg-emerald-600 text-white text-sm font-medium cursor-pointer' : 'bg-blue-600 text-white text-sm font-medium cursor-pointer'}
                  >
                    {s4TriggerState ? '已施加 5V 触发脉冲' : '点击施加 5V 触发脉冲'}
                  </Button>
                </div>

                {/* 样件选择 */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {E04_SAMPLES.map((smp, idx) => (
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

                {/* 仪表看板 */}
                <div className="p-5 bg-slate-900 border border-slate-700 rounded-xl flex flex-col items-center">
                  <div className="text-sm text-slate-300 mb-2">
                    测试对象: <span className="text-white font-bold">{activeSample.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full text-center">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-sm text-slate-400">集电极电压 Uce</div>
                      <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                        {s4TriggerState
                           ? `${activeSample.triggerUce} V`
                          : activeSample.actualType === 'CE_SHORT'
                          ? '0.05 V'
                          : '12.0 V'}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-sm text-slate-400">负载继电器动作</div>
                      <div className="text-base font-bold text-amber-300 mt-2">
                        {s4TriggerState
                          ? activeSample.relayState === 'ENERGIZED'
                            ? '✓ 吸合'
                            : activeSample.relayState === 'CHATTERING'
                            ? '⚠️ 抖动无法吸合'
                            : '无动作'
                          : activeSample.actualType === 'CE_SHORT'
                          ? '⚠️ 常吸不放！'
                          : '释放'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-300 pt-4 border-t border-slate-800">
                诊断提示: 未触发时常吸且 Uce=0 为 C-E 击穿短路；触发后 Uce 仍为 12V 继电器不动为 B-E 断路；Uce=5.4V 继电器抖动为 β 衰减。
              </div>
            </div>

            {/* 右侧工单 */}
            <div className="lg:col-span-5 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  三极管盲测分类报告
                </h4>
                <p className="text-sm text-slate-600 mb-3">判定 4 组驱动模块的内部故障：</p>

                <div className="space-y-3">
                  {E04_SAMPLES.map((smp) => (
                    <div key={smp.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-sm">
                      <div className="font-bold text-slate-200 mb-1.5">{smp.name}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { val: 'NORMAL', label: '良好无故障' },
                          { val: 'CE_SHORT', label: 'C-E击穿短路常通' },
                          { val: 'BE_OPEN', label: 'B-E内部开路断开' },
                          { val: 'BETA_DEGRADED', label: 'β衰减放大不足' },
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
                      if (!requireMeterKnob('DCV_20')) return;
                      const allCorrect = E04_SAMPLES.every(
                        (smp) => s4Diagnoses[smp.id] === smp.actualType
                      );
                      if (allCorrect) {
                        setS4Submitted(true);
                        sounds.playSuccessSound?.();
                        onStepComplete('BLIND_TRANSISTOR_FAULT_DIAGNOSIS', { s4Diagnoses });
                      } else {
                        assessment.recordWrong('blind_test');
                        sounds.playFailureSound?.();
                        alert('诊断存在错误，请结合触发前后的 Uce 状态重新推敲！');
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
                      <span>全组盲测分类 100% 正确！具备板级三极管排故硬功夫！</span>
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

      {/* 步骤 5：实车风扇驱动修复与交车工单闭环 */}
      {currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold uppercase text-blue-400">
                    实车工单：发动机散热电子风扇低速档无法吸合
                  </span>
                  <span className="text-sm text-rose-400 font-mono font-bold">故障代码: P0480-13</span>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-sm space-y-3">
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">故障现象:</span> 水温升至 96°C 时，ECU 指令发出但风扇不转，水温报警灯点亮。
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500 font-bold">排查操作:</span> 用万用表直流电压档 (DCV 20V) 测量驱动三极管的基极电压 Ub。
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!requireMeterKnob('DCV_20')) return;
                        setS5Measured(true);
                        sounds.playToggleSound?.();
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium cursor-pointer"
                    >
                      万用表测量基极信号电压 Ub
                    </Button>

                    {s5Measured && (
                      <div className="text-sm font-mono">
                        实测 Ub:{' '}
                        <span className="text-rose-400 font-bold">
                          {s5Repaired ? '0.72 V (已正常导通)' : '0.00 V (无输入！限流电阻虚焊断开)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {s5Measured && !s5Repaired && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                    <div className="text-sm text-amber-300 font-bold">
                      确诊缺陷：基极限流电阻 2.2kΩ 焊点微裂虚焊脱开，导致驱动电流无法注入基极！
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5Repaired(true);
                        sounds.playSuccessSound?.();
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold cursor-pointer"
                    >
                      恒温烙铁补焊 2.2kΩ 贴片电阻并喷涂三防漆
                    </Button>
                  </div>
                )}

                {s5Repaired && (
                  <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-emerald-300">
                        ✓ 虚焊点修复完成，请模拟水温上升进行风扇吸合复测
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        复验指标: 水温达到 96°C 时三极管 Uce 降至 0.18V，低速风扇高速运转压制水温。
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setS5SimTemp(96);
                        sounds.playToggleSound?.();
                      }}
                      className={s5SimTemp >= 96 ? 'bg-emerald-600 text-white text-sm font-medium cursor-pointer' : 'bg-blue-600 text-white text-sm font-medium cursor-pointer'}
                    >
                      {s5SimTemp >= 96 ? '✓ 达到 96°C (风扇运转中)' : '提升水温至 96°C 触发'}
                    </Button>
                  </div>
                )}
              </div>

              {s5SimTemp >= 96 && (
                <div className="flex items-center gap-4 pt-4 border-t border-slate-800 text-sm font-mono">
                  <div className="text-emerald-400 font-bold">低速散热风扇运转正常 🌀</div>
                  <div>三极管 Uce: <span className="text-emerald-400 font-bold">0.18 V (饱和导通)</span></div>
                  <div>冷却水温: <span className="text-cyan-400 font-bold">88°C (平稳回落)</span></div>
                </div>
              )}
            </div>

            {/* 右侧交付签署 */}
            <div className="lg:col-span-5 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  工程交付验收单
                </h4>
                <p className="text-sm text-slate-600 mb-3">核验证实风扇控制系统修复质量：</p>

                <div className="space-y-2 text-sm">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">故障部位:</span>
                    <span className="text-slate-200 font-bold">ECU 风扇驱动板基极偏置电阻虚焊</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">修复工艺:</span>
                    <span className="text-slate-200 font-bold">无铅焊锡规范补焊 + 三防固化</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">饱和压降 Uce:</span>
                    <span className="text-emerald-400 font-mono font-bold">0.18 V (深度饱和合格)</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
                    <span className="text-slate-400">水温控制:</span>
                    <span className="text-emerald-400 font-bold">96°C 准确启停，88°C 恒温</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="e04-sign"
                    disabled={s5SimTemp < 96 || s5Submitted}
                    checked={s5Signed}
                    onChange={(e) => setS5Signed(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <label htmlFor="e04-sign" className="text-sm text-slate-300 cursor-pointer">
                    维修技师已通过水温闭环带载试机，确认无过热风险，同意交车
                  </label>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                {!s5Submitted ? (
                  <Button
                    disabled={!s5Signed || s5SimTemp < 96}
                    onClick={() => {
                      setS5Submitted(true);
                      sounds.playSuccessSound?.();
                      assessment.completeStage('transfer');
                      const finalResult = assessment.completeLevel();
                      onComplete?.(finalResult);
                      onStepComplete('ENGINEERING_REPAIR_AND_DELIVERY', {
                        s5Repaired,
                        s5SimTemp,
                      });
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold cursor-pointer"
                  >
                    签署交车工单
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>交车成功！发动机水温冷却控制完全符合出厂标准！</span>
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
