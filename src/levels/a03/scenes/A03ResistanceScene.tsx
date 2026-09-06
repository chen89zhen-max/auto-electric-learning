'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Sparkles,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Multimeter, MultimeterDialMode } from '@/src/game/instruments/Multimeter';

export type A03Step =
  | 'COLOR_CODE_CALC'
  | 'SAMPLE_MEASUREMENT'
  | 'POTENTIOMETER_TEST'
  | 'TRANSFER_SORTING';

interface A03ResistanceSceneProps {
  currentStep: A03Step;
  onStepComplete: (step: A03Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

const SAMPLE_DEFS = {
  A: { name: '样品 A (精密碳膜电阻)', trueR: 224.0 },
  B: { name: '样品 B (老化发热电阻)', trueR: 330.0 },
  C: { name: '样品 C (内部破裂电阻)', trueR: 1e9 }, // Open
} as const;

export function A03ResistanceScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
}: A03ResistanceSceneProps) {
  // Multimeter states
  const [dial, setDial] = useState<MultimeterDialMode>('RESISTANCE');
  const [redJack] = useState<'V_OHM' | 'A_10A'>('V_OHM');

  // Step 1: Color code prediction inputs
  const [minBoundInput, setMinBoundInput] = useState<string>('');
  const [maxBoundInput, setMaxBoundInput] = useState<string>('');
  const [calcVerified, setCalcVerified] = useState<boolean>(false);

  // Step 2: Sample selection & V05 live network simulation
  const [selectedSample, setSelectedSample] = useState<'A' | 'B' | 'C'>('A');
  const [isPowerAppliedToSample, setIsPowerAppliedToSample] = useState<boolean>(false);
  const [sampleEvaluations, setSampleEvaluations] = useState<Record<string, string>>({});

  // Step 3: Potentiometer wiper position and probe targets
  const [potKnobRatio, setPotKnobRatio] = useState<number>(0.5); // 0.0, 0.5, 1.0
  const [potProbePair, setPotProbePair] = useState<'1-3' | '1-2' | '2-3'>('1-2');
  const [potRecordedPoints, setPotRecordedPoints] = useState<Set<string>>(new Set());

  // Step 4: Transfer answer
  const [transferAnswer, setTransferAnswer] = useState<string | null>(null);

  // Evaluate Multimeter reading
  const dmmResult = useMemo(() => {
    const dmm = new Multimeter();
    dmm.setDial(dial);
    dmm.setRedProbeJack(redJack);
    dmm.setBlackProbeJack('COM');

    if (currentStep === 'SAMPLE_MEASUREMENT') {
      const activeSample = SAMPLE_DEFS[selectedSample];
      return dmm.measure({
        isCircuitPowered: isPowerAppliedToSample, // V05 live circuit refusal
        isolatedResistance: activeSample.trueR,
      });
    }

    if (currentStep === 'POTENTIOMETER_TEST') {
      let r = 10000;
      if (potProbePair === '1-3') {
        r = 10000; // Fixed total resistance
      } else if (potProbePair === '1-2') {
        r = 10000 * potKnobRatio;
      } else if (potProbePair === '2-3') {
        r = 10000 * (1 - potKnobRatio);
      }
      return dmm.measure({
        isCircuitPowered: false,
        isolatedResistance: Math.max(0.1, r),
      });
    }

    if (currentStep === 'TRANSFER_SORTING') {
      // 1kΩ sample
      return dmm.measure({
        isCircuitPowered: false,
        isolatedResistance: 985.0,
      });
    }

    return dmm.measure({});
  }, [dial, redJack, currentStep, selectedSample, isPowerAppliedToSample, potProbePair, potKnobRatio]);

  // Step 1: Verify calculation
  const handleVerifyCalc = () => {
    const minVal = parseFloat(minBoundInput);
    const maxVal = parseFloat(maxBoundInput);
    if (Math.abs(minVal - 209) < 1 && Math.abs(maxVal - 231) < 1) {
      setCalcVerified(true);
      onStepComplete('COLOR_CODE_CALC', {
        nominal: 220,
        tolerance: 5,
        min: 209,
        max: 231,
      });
    }
  };

  // Step 2: Record sample classification
  const handleClassifySample = (sampleId: 'A' | 'B' | 'C', classification: string) => {
    const newEvals = { ...sampleEvaluations, [sampleId]: classification };
    setSampleEvaluations(newEvals);

    if (newEvals.A === 'QUALIFIED' && newEvals.B === 'UNQUALIFIED' && newEvals.C === 'BROKEN') {
      onStepComplete('SAMPLE_MEASUREMENT', {
        sampleA: 224,
        sampleB: 330,
        sampleC: 'O.L',
        v04Passed: true,
        v05Encountered: isPowerAppliedToSample,
      });
    }
  };

  // Step 3: Record potentiometer reading
  const handleRecordPotPoint = () => {
    const pointKey = `${potProbePair}@${(potKnobRatio * 100).toFixed(0)}%`;
    const newSet = new Set(potRecordedPoints);
    newSet.add(pointKey);
    setPotRecordedPoints(newSet);

    if (newSet.size >= 4) {
      onStepComplete('POTENTIOMETER_TEST', {
        totalResistance: 10000,
        recordedPoints: Array.from(newSet),
        v04PotentiometerPassed: true,
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-slate-800 bg-white rounded-xl shadow-xs border border-slate-200">
      {/* Top Banner Guide */}
      <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="text-amber-600" size={20} />
          <div>
            <h3 className="text-sm font-bold text-amber-900">
              {currentStep === 'COLOR_CODE_CALC' && '阶段 1（识读）：色环识别与合格区间预测 (基准 V04)'}
              {currentStep === 'SAMPLE_MEASUREMENT' && '阶段 2（测量与筛选）：电阻测量、合格件筛选与带电拒测 (基准 V04, V05)'}
              {currentStep === 'POTENTIOMETER_TEST' && '阶段 3（可变电阻）：电位器三端测试与阻值调节规律'}
              {currentStep === 'TRANSFER_SORTING' && '阶段 4（迁移）：复杂电阻盲检与单位换算'}
            </h3>
            <p className="text-xs text-amber-700">
              {currentStep === 'COLOR_CODE_CALC' && '学习目标：识读 4 色环（红红棕金），计算 220Ω ± 5% 的允许公差区间 [209Ω, 231Ω]。'}
              {currentStep === 'SAMPLE_MEASUREMENT' && '学习目标：用万用表 Ω 挡测量 224Ω、330Ω 和开路件，体验带电测阻安全拦截 (V05)。'}
              {currentStep === 'POTENTIOMETER_TEST' && '学习目标：测量电位器固定端 (10kΩ) 与滑动端阻值，验证转角与阻值线性关系。'}
              {currentStep === 'TRANSFER_SORTING' && '学习目标：在新阻值 (1kΩ) 下独立完成测量、单位换算与合格判定。'}
            </p>
          </div>
        </div>

        {/* Advance Step Button */}
        {((currentStep === 'COLOR_CODE_CALC' && calcVerified) ||
          (currentStep === 'SAMPLE_MEASUREMENT' &&
            sampleEvaluations.A === 'QUALIFIED' &&
            sampleEvaluations.B === 'UNQUALIFIED' &&
            sampleEvaluations.C === 'BROKEN') ||
          (currentStep === 'POTENTIOMETER_TEST' && potRecordedPoints.size >= 4) ||
          (currentStep === 'TRANSFER_SORTING' && transferAnswer === '985_QUALIFIED')) && (
          <Button
            size="sm"
            onClick={onAdvanceStep}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>下一步</span>
            <ArrowRight size={16} />
          </Button>
        )}
      </div>

      {/* Main Interactive Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 Columns: Work Bench / Experiment Scene */}
        <div className="lg:col-span-7 flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          {/* Step 1: Color code card */}
          {currentStep === 'COLOR_CODE_CALC' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                四色环电阻色标解码卡 (220Ω ± 5%)
              </span>

              {/* Graphical Resistor SVG */}
              <div className="w-full h-32 bg-slate-900 rounded-lg flex items-center justify-center p-4">
                <svg viewBox="0 0 360 80" className="w-64">
                  {/* Wire leads */}
                  <line x1="20" y1="40" x2="80" y2="40" stroke="#94a3b8" strokeWidth="4" />
                  <line x1="280" y1="40" x2="340" y2="40" stroke="#94a3b8" strokeWidth="4" />
                  {/* Resistor body */}
                  <rect x="80" y="15" width="200" height="50" rx="10" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
                  {/* Color Bands: Red, Red, Brown, Gold */}
                  <rect x="110" y="15" width="16" height="50" fill="#dc2626" />
                  <rect x="145" y="15" width="16" height="50" fill="#dc2626" />
                  <rect x="180" y="15" width="16" height="50" fill="#78350f" />
                  <rect x="235" y="15" width="16" height="50" fill="#eab308" />
                </svg>
              </div>

              {/* Color decode table */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-red-100 rounded border border-red-300">
                  <span className="font-bold text-red-900">第一环：红</span>
                  <p className="text-red-700">有效数字 2</p>
                </div>
                <div className="p-2 bg-red-100 rounded border border-red-300">
                  <span className="font-bold text-red-900">第二环：红</span>
                  <p className="text-red-700">有效数字 2</p>
                </div>
                <div className="p-2 bg-amber-100 rounded border border-amber-300">
                  <span className="font-bold text-amber-900">第三环：棕</span>
                  <p className="text-amber-800">乘数 × 10¹</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded border border-yellow-300">
                  <span className="font-bold text-yellow-900">第四环：金</span>
                  <p className="text-yellow-800">公差 ± 5%</p>
                </div>
              </div>

              {/* Calculation input card */}
              <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col gap-2 text-xs">
                <span className="font-bold text-slate-800">计算预测允许公差区间 (基准 V04)：</span>
                <p className="text-slate-600">
                  标称阻值：<strong>220 Ω</strong>；公差幅度：<strong>220 × 5% = 11 Ω</strong>。
                </p>
                <div className="flex items-center gap-2">
                  <span>允许下限：</span>
                  <input
                    type="number"
                    placeholder="209"
                    value={minBoundInput}
                    onChange={(e) => setMinBoundInput(e.target.value)}
                    className="w-20 p-1 border border-slate-300 rounded text-center font-bold"
                  />
                  <span>Ω ~ 允许上限：</span>
                  <input
                    type="number"
                    placeholder="231"
                    value={maxBoundInput}
                    onChange={(e) => setMaxBoundInput(e.target.value)}
                    className="w-20 p-1 border border-slate-300 rounded text-center font-bold"
                  />
                  <span>Ω</span>
                  <Button size="sm" onClick={handleVerifyCalc} className="ml-auto cursor-pointer">
                    校验并提交区间
                  </Button>
                </div>
                {calcVerified && (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={15} /> 区间 [209Ω, 231Ω] 预测正确！请点击右上角进入测量阶段。
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Sample Measurement Workbench */}
          {currentStep === 'SAMPLE_MEASUREMENT' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  断电隔离工位 · 待检电阻样品台
                </span>

                {/* V05 Live circuit toggle (Educational Counterexample) */}
                <button
                  type="button"
                  onClick={() => setIsPowerAppliedToSample(!isPowerAppliedToSample)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    isPowerAppliedToSample
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <ShieldAlert size={14} />
                  <span>{isPowerAppliedToSample ? '已接入 12V 供电 (带电危险状态)' : '已完全断电隔离 (安全)'}</span>
                </button>
              </div>

              {/* Three Samples Cards */}
              <div className="grid grid-cols-3 gap-3">
                {(['A', 'B', 'C'] as const).map((id) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setSelectedSample(id)}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-2 text-left w-full ${
                      selectedSample === id
                        ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs text-slate-800">
                        {id === 'A' && '样品 A'}
                        {id === 'B' && '样品 B'}
                        {id === 'C' && '样品 C'}
                      </span>
                      {selectedSample === id && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                          表笔已夹接
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">{SAMPLE_DEFS[id].name}</span>

                    {/* Status badge */}
                    {sampleEvaluations[id] && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded mt-auto text-center ${
                          sampleEvaluations[id] === 'QUALIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sampleEvaluations[id] === 'UNQUALIFIED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {sampleEvaluations[id] === 'QUALIFIED' && '合格 (209~231Ω)'}
                        {sampleEvaluations[id] === 'UNQUALIFIED' && '超差不合格 (330Ω)'}
                        {sampleEvaluations[id] === 'BROKEN' && '断路损坏 (O.L)'}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Sample Action buttons */}
              <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-700">
                  当前夹接：{SAMPLE_DEFS[selectedSample].name} · 依据测量结果进行判定：
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClassifySample(selectedSample, 'QUALIFIED')}
                    className="text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                  >
                    判定为：合格品（阻值在 209~231Ω 内）
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClassifySample(selectedSample, 'UNQUALIFIED')}
                    className="text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50 cursor-pointer"
                  >
                    判定为：超差不合格品
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClassifySample(selectedSample, 'BROKEN')}
                    className="text-xs font-bold text-red-700 border-red-300 hover:bg-red-50 cursor-pointer"
                  >
                    判定为：断路开路件
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Potentiometer Test */}
          {currentStep === 'POTENTIOMETER_TEST' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                10kΩ 旋转电位器三引脚阻值规律测试
              </span>

              {/* Potentiometer Graphic */}
              <div className="w-full h-36 bg-slate-900 rounded-lg flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <svg viewBox="0 0 300 100" className="w-64">
                  {/* Potentiometer circle body */}
                  <circle cx="150" cy="50" r="35" fill="#1e293b" stroke="#e2e8f0" strokeWidth="2" />
                  {/* Rotary Knob pointer */}
                  <line
                    x1="150"
                    y1="50"
                    x2={150 + 25 * Math.cos((potKnobRatio * 240 - 120) * (Math.PI / 180))}
                    y2={50 + 25 * Math.sin((potKnobRatio * 240 - 120) * (Math.PI / 180))}
                    stroke="#f59e0b"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  {/* Terminals 1, 2, 3 */}
                  <circle cx="80" cy="85" r="6" fill="#38bdf8" />
                  <text x="80" y="98" fill="#bae6fd" fontSize="9" textAnchor="middle">1 (固定端 A)</text>
                  <circle cx="150" cy="85" r="6" fill="#f59e0b" />
                  <text x="150" y="98" fill="#fef08a" fontSize="9" textAnchor="middle">2 (动片 W)</text>
                  <circle cx="220" cy="85" r="6" fill="#38bdf8" />
                  <text x="220" y="98" fill="#bae6fd" fontSize="9" textAnchor="middle">3 (固定端 B)</text>
                </svg>
                <span className="text-[11px] text-slate-300 mt-1">
                  当前旋钮转角：{(potKnobRatio * 100).toFixed(0)}%
                </span>
              </div>

              {/* Knob Controller */}
              <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Sliders size={15} /> 调节电位器旋钮角度：
                  </span>
                  <span>{(potKnobRatio * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={potKnobRatio}
                  onChange={(e) => setPotKnobRatio(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-amber-600"
                />

                {/* Probe Connection selector */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="font-bold text-slate-700">测试端子配对：</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPotProbePair('1-3')}
                      className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                        potProbePair === '1-3'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      测 1-3 固定端总阻
                    </button>
                    <button
                      type="button"
                      onClick={() => setPotProbePair('1-2')}
                      className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                        potProbePair === '1-2'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      测 1-2 (A-Wiper)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPotProbePair('2-3')}
                      className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                        potProbePair === '2-3'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      测 2-3 (Wiper-B)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button size="sm" onClick={handleRecordPotPoint} className="cursor-pointer">
                    记录当前测点数据 ({potRecordedPoints.size}/4)
                  </Button>
                  <span className="text-[11px] text-slate-500">
                    已记录测点：{Array.from(potRecordedPoints).join(', ') || '暂无'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Transfer Challenge */}
          {currentStep === 'TRANSFER_SORTING' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                独立迁移题 · 1kΩ ± 5% 规格电阻盲检
              </span>
              <div className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col gap-3 text-xs">
                <p className="text-slate-700 font-bold">
                  工单任务：仓库领出标称 1kΩ ± 5% 电阻，万用表实测为 0.985 kΩ (即 985 Ω)。
                  请问该电阻是否在合格公差区间内？
                </p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="transfer_a03"
                      checked={transferAnswer === '985_QUALIFIED'}
                      onChange={() => {
                        setTransferAnswer('985_QUALIFIED');
                        onStepComplete('TRANSFER_SORTING', {
                          measured: 985,
                          nominal: 1000,
                          tolerancePct: 5,
                          isQualified: true,
                        });
                      }}
                    />
                    <span className="font-bold text-emerald-800">
                      A. 合格：允许区间为 950Ω ~ 1050Ω，985Ω 落在合格范围内
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="transfer_a03"
                      checked={transferAnswer === '985_OUT'}
                      onChange={() => setTransferAnswer('985_OUT')}
                    />
                    <span>B. 不合格：985Ω 小于 1000Ω 标称值，属于欠阻</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="transfer_a03"
                      checked={transferAnswer === '985_BROKEN'}
                      onChange={() => setTransferAnswer('985_BROKEN')}
                    />
                    <span>C. 损坏件：应直接报废</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Columns: Multimeter Display */}
        <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Gauge size={16} className="text-amber-600" />
              数字万用表 · 电阻挡 (Ω)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              COLD CIRCUIT ONLY
            </span>
          </div>

          {/* DMM Screen */}
          <div className="flex flex-col justify-between h-24 p-3 bg-emerald-950 border-4 border-slate-700 rounded-lg shadow-inner font-mono text-emerald-400">
            <div className="flex items-center justify-between text-xs opacity-70">
              <span>AUTO RANGE</span>
              <span>{dmmResult.status === 'REFUSED_LIVE_CIRCUIT' ? 'LIVE REFUSED' : 'OHM'}</span>
            </div>
            <div className="text-3xl font-black text-right tracking-widest text-emerald-300">
              {dmmResult.displayText || 'O.L'}
            </div>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span>{dmmResult.status}</span>
              <span>{dmmResult.unit}</span>
            </div>
          </div>

          {/* V05 Warning alert if live network */}
          {dmmResult.status === 'REFUSED_LIVE_CIRCUIT' && (
            <div className="p-2.5 bg-red-100 border border-red-300 rounded text-xs text-red-900 font-bold flex items-start gap-2">
              <AlertTriangle size={18} className="text-red-700 shrink-0 mt-0.5" />
              <div>
                <p>安全规则拦截 (基准 V05)：</p>
                <p className="font-normal text-red-800">
                  严禁在带电网络中测量电阻！万用表电阻挡内部注入测试微电流，若遇外部带电网络将损坏内部采样电路，系统已强制拒绝并禁止伪造读数。
                </p>
              </div>
            </div>
          )}

          {/* Dial Gear Selector */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-700">万用表功能旋钮：</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['OFF', 'DC_V', 'RESISTANCE', 'DC_A', 'CONTINUITY'] as MultimeterDialMode[]).map(
                (mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDial(mode)}
                    className={`px-2 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      dial === mode
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {mode === 'RESISTANCE' && '电阻挡 (Ω)'}
                    {mode === 'DC_V' && '直流电压 (V⎓)'}
                    {mode === 'DC_A' && '直流电流 (A⎓)'}
                    {mode === 'CONTINUITY' && '蜂鸣挡 (🔔)'}
                    {mode === 'OFF' && '关机 (OFF)'}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Educational Note */}
          <div className="mt-auto p-3 bg-white border border-slate-200 rounded-lg text-xs flex flex-col gap-1 text-slate-600">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Sparkles size={14} className="text-amber-500" />
              电阻测量规范精粹
            </span>
            <p>1. 必须切断电源，将被测电阻与外围电路断开隔离后再测量。</p>
            <p>2. 人体手掌不能同时触碰两个表笔金属尖，避免人体并联电阻干扰。</p>
            <p>3. 读数显示 O.L 表示阻值超出当前量程或元件断路，不可直接猜测结论。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
