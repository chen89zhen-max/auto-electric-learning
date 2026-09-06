'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Flame,
  Gauge,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateEnergyBudget, calculatePower } from '@/src/circuit/solver/DCAnalysisUtils';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { type B04Step } from './b04Training';

export function buildB04WorkshopBudget() {
  const deratedLamp = calculatePower({ voltage: 6, resistance: 6, ratedPower: 24 });
  const eightHour = calculateEnergyBudget({
    loads: [
      { name: '工作灯', powerWatts: 50, operatingHours: 8 },
      { name: '诊断平板', powerWatts: 30, operatingHours: 8 },
      { name: '充电机', powerWatts: 200, operatingHours: 8 },
    ],
    electricityPricePerKWh: 0.85,
  });
  const fuseRatingAmps = 10;
  const totalCurrent = 14;
  return {
    deratedLamp,
    eightHour,
    fuseRatingAmps,
    overloaded: {
      totalCurrent,
      fuseProtectsCircuit: totalCurrent > fuseRatingAmps,
    },
  };
}

interface B04PowerEnergySceneProps {
  currentStep: B04Step;
  onStepComplete: (step: B04Step, evidence: Record<string, unknown>) => void;
  onAdvanceStep: () => void;
}

export function B04PowerEnergyScene({
  currentStep,
  onStepComplete,
  onAdvanceStep,
}: B04PowerEnergySceneProps) {
  // Step 1: Rated vs Actual Power
  const [selectedVoltage, setSelectedVoltage] = useState<6 | 12 | 16>(12);
  const lampResistance = 6.0; // 6Ω
  const actualCurrent = selectedVoltage / lampResistance;
  const actualPower = (selectedVoltage * selectedVoltage) / lampResistance;

  // Step 2: Joule Heating Wire Overheat
  const [selectedWire, setSelectedWire] = useState<'0.5mm' | '2.5mm'>('0.5mm');
  const wireCurrent = 20.0; // 20A
  const wireResistance = selectedWire === '0.5mm' ? 0.40 : 0.05;
  const wireHeatingPower = wireCurrent * wireCurrent * wireResistance;
  const wireTempC = selectedWire === '0.5mm' ? 185 : 36;
  const [step2Choice, setStep2Choice] = useState<string | null>(null);
  const [step2Submitted, setStep2Submitted] = useState<boolean>(false);
  const [step2Feedback, setStep2Feedback] = useState<string | null>(null);

  // Step 3: Workshop Energy Budget
  const [chargerHours, setChargerHours] = useState<number>(4);
  const [liftHours, setLiftHours] = useState<number>(1);
  const [lightHours, setLightHours] = useState<number>(8);
  const chargerKWh = (600 / 1000) * chargerHours;
  const liftKWh = (2200 / 1000) * liftHours;
  const lightKWh = (200 / 1000) * lightHours;
  const totalKWh = chargerKWh + liftKWh + lightKWh;
  const electricityUnitPrice = 0.85; // ¥0.85/kWh
  const totalCost = totalKWh * electricityUnitPrice;

  // Step 4: Quantitative 360W Amp Fuse Blind Test
  const [step4Choice, setStep4Choice] = useState<string | null>(null);
  const [step4Submitted, setStep4Submitted] = useState<boolean>(false);
  const [step4Feedback, setStep4Feedback] = useState<string | null>(null);

  // Step 5: Transfer Inverter Overload Decision
  const [step5Decision, setStep5Decision] = useState<string | null>(null);
  const [step5Submitted, setStep5Submitted] = useState<boolean>(false);
  const [step5Feedback, setStep5Feedback] = useState<string | null>(null);

  // Handler for Step 1 voltage switch
  const handleVoltageSelect = (v: 6 | 12 | 16) => {
    sounds.click();
    setSelectedVoltage(v);
    onStepComplete('RATED_VS_ACTUAL_POWER', {
      selectedVoltage: v,
      actualPower: (v * v) / lampResistance,
      actualCurrent: v / lampResistance,
      ratedPower: 24.0,
      deratedOrOverloaded: v !== 12,
    });
  };

  // Handler for Step 2 submit
  const handleSubmitStep2 = () => {
    sounds.click();
    setStep2Submitted(true);
    if (step2Choice === 'OPT_JOULE') {
      sounds.success();
      setStep2Feedback('辨析完全正确！根据焦耳定律 Q = I² · R · t，细导线电阻大（0.40Ω），20A 大电流流过产生 160W 集中热量，远超线皮散热极限导致融化自燃！');
      onStepComplete('JOULE_HEATING_WIRE_OVERHEAT', {
        userChoice: step2Choice,
        passed: true,
        jouleLawVerified: true,
      });
    } else {
      sounds.warningBuzz();
      setStep2Feedback('辨析有误。细导线发热并不是因为电压升高或磁场吸引，而是导线电阻偏大，大电流流经大电阻产生巨大焦耳热（P = I² · R）引发超温！');
    }
  };

  // Handler for Step 4 submit
  const handleSubmitStep4 = () => {
    sounds.click();
    setStep4Submitted(true);
    if (step4Choice === 'OPT_A') {
      sounds.success();
      setStep4Feedback('计算完全正确！360W ÷ 12V = 30.0A；按汽车 1.33 倍防误熔裕量选用 40A 专用保险丝；安全连续载流 30A 对应专用导线规格不小于 6.0mm²！');
      onStepComplete('QUANTITATIVE_FUSE_SELECT', {
        userChoice: step4Choice,
        ampCurrent: 30.0,
        fuseRating: 40,
        wireGaugeMm2: 6.0,
        passed: true,
      });
    } else {
      sounds.warningBuzz();
      setStep4Feedback('计算有误。根据 P = U · I，满载工作电流 I = 360W ÷ 12V = 30.0A。保险丝容量必须略大于工作电流（40A），且导线截面积必须承受 30A（6.0mm²）！');
    }
  };

  // Handler for Step 5 submit
  const handleSubmitStep5 = () => {
    sounds.click();
    setStep5Submitted(true);
    if (step5Decision === 'OPT_DIRECT_BATTERY') {
      sounds.success();
      setStep5Feedback('技师整改方案合规专业！1000W 在 12V 下工作电流超 83A，点烟器插孔限流仅 10A。必须从蓄电池桩头引出 16.0mm² 专线并加装 100A 主保险！');
      onStepComplete('TRANSFER_SMOKE_OVERLOAD_DIAG', {
        userChoice: step5Decision,
        currentDemanded: 83.33,
        remedy: 'DIRECT_BATTERY_16MM2_100A_FUSE',
        passed: true,
      });
    } else {
      sounds.warningBuzz();
      setStep5Feedback('方案极度危险！点烟器内部细线与弹片根本无法通过 83A 极端电流。盲目换大保险丝或换原厂插座会直接导致仪表台深处整条线束自燃！');
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full min-h-[580px] p-2">
      {/* Top Advance Banner */}
      <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-900 to-orange-900 text-white rounded-xl shadow-md border border-amber-700">
        <div className="flex items-center gap-2">
          <Zap className="text-amber-400" size={20} />
          <span className="font-bold text-sm tracking-wide">
            {currentStep === 'RATED_VS_ACTUAL_POWER' && '阶段 1：额定功率 vs 实际功率辨析 · 12V/24W 车灯电压敏感度'}
            {currentStep === 'JOULE_HEATING_WIRE_OVERHEAT' && '阶段 2：反例突破 · 焦耳定律与线束截面积发热起火反例'}
            {currentStep === 'WORKSHOP_ENERGY_BUDGET_CALC' && '阶段 3：综合进阶 · 汽修工位设备全天电能消耗与电费预算'}
            {currentStep === 'QUANTITATIVE_FUSE_SELECT' && '阶段 4：独立盲测 · 加装 360W 重低音功放保险丝容量与线径校核'}
            {currentStep === 'TRANSFER_SMOKE_OVERLOAD_DIAG' && '阶段 5：迁移任务 · 1000W 逆变器私接点烟器烧蚀排故与合规整改'}
          </span>
        </div>

        {((currentStep === 'RATED_VS_ACTUAL_POWER' && selectedVoltage !== 12) ||
          (currentStep === 'JOULE_HEATING_WIRE_OVERHEAT' && step2Submitted && step2Choice === 'OPT_JOULE') ||
          (currentStep === 'WORKSHOP_ENERGY_BUDGET_CALC' && totalKWh > 0) ||
          (currentStep === 'QUANTITATIVE_FUSE_SELECT' && step4Submitted && step4Choice === 'OPT_A') ||
          (currentStep === 'TRANSFER_SMOKE_OVERLOAD_DIAG' && step5Submitted && step5Decision === 'OPT_DIRECT_BATTERY')) && (
          <Button
            size="sm"
            onClick={onAdvanceStep}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 px-4 shadow-sm cursor-pointer"
          >
            <span>{currentStep === 'TRANSFER_SMOKE_OVERLOAD_DIAG' ? '查看通关报告' : '进入下一步'}</span>
            <ArrowRight size={16} />
          </Button>
        )}
      </div>

      {/* STEP 1: Rated vs Actual Power (Voltage Sensitivity) */}
      {currentStep === 'RATED_VS_ACTUAL_POWER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">
                12V/24W 车灯电压敏感度实验台 (P = U² / R)
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                selectedVoltage === 12 ? 'bg-emerald-100 text-emerald-800' : selectedVoltage === 6 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
              }`}>
                {selectedVoltage === 12 ? '额定 12V (满载)' : selectedVoltage === 6 ? '亏电 6V (欠压)' : '过压 16V (超载)'}
              </span>
            </div>

            {/* SVG Visual h-60 */}
            <div className="w-full h-60 bg-slate-900 rounded-xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-800 shadow-inner">
              <svg viewBox="0 0 460 140" className="w-full h-full max-w-lg">
                {/* Power Supply */}
                <rect x="25" y="40" width="70" height="55" rx="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="2.5" />
                <text x="60" y="65" fill="#fde68a" fontSize="13" textAnchor="middle" fontWeight="bold">{selectedVoltage}.0V</text>
                <text x="60" y="80" fill="#fbbf24" fontSize="9" textAnchor="middle">可调供电电源</text>

                {/* Connecting Wires */}
                <line x1="95" y1="50" x2="330" y2="50" stroke="#38bdf8" strokeWidth="3.5" />
                <line x1="95" y1="85" x2="330" y2="85" stroke="#64748b" strokeWidth="3.5" />

                {/* Car Lamp Glowing Visual */}
                <circle
                  cx="350"
                  cy="68"
                  r={selectedVoltage === 16 ? 42 : selectedVoltage === 12 ? 30 : 18}
                  fill={
                    selectedVoltage === 16
                      ? 'rgba(239, 68, 68, 0.45)'
                      : selectedVoltage === 12
                      ? 'rgba(245, 158, 11, 0.35)'
                      : 'rgba(180, 83, 9, 0.2)'
                  }
                  className={selectedVoltage === 16 ? 'animate-ping' : ''}
                />
                <circle
                  cx="350"
                  cy="68"
                  r="24"
                  fill={
                    selectedVoltage === 16
                      ? '#fef08a'
                      : selectedVoltage === 12
                      ? '#fde047'
                      : '#b45309'
                  }
                  stroke={selectedVoltage === 16 ? '#ef4444' : '#eab308'}
                  strokeWidth="3"
                />
                {/* Filament inside */}
                <path
                  d="M 342 75 L 347 62 L 350 68 L 353 62 L 358 75"
                  fill="none"
                  stroke={selectedVoltage === 16 ? '#b91c1c' : '#854d0e'}
                  strokeWidth="2.5"
                />
                <text x="350" y="105" fill="#e2e8f0" fontSize="11" textAnchor="middle" fontWeight="bold">
                  24W 车灯 (R=6Ω)
                </text>
                <text x="350" y="118" fill="#94a3b8" fontSize="9" textAnchor="middle">
                  实际: {actualPower.toFixed(1)}W
                </text>
              </svg>
            </div>

            {/* Voltage switch buttons */}
            <div className="flex flex-wrap gap-2.5">
              <Button
                variant={selectedVoltage === 6 ? 'default' : 'outline'}
                onClick={() => handleVoltageSelect(6)}
                className={`cursor-pointer font-bold text-sm ${selectedVoltage === 6 ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
              >
                亏电工况：6.0V 供电 (蓄电池严重欠压)
              </Button>
              <Button
                variant={selectedVoltage === 12 ? 'default' : 'outline'}
                onClick={() => handleVoltageSelect(12)}
                className={`cursor-pointer font-bold text-sm ${selectedVoltage === 12 ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
              >
                额定工况：12.0V 供电 (标准工作状态)
              </Button>
              <Button
                variant={selectedVoltage === 16 ? 'default' : 'outline'}
                onClick={() => handleVoltageSelect(16)}
                className={`cursor-pointer font-bold text-sm ${selectedVoltage === 16 ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
              >
                过压故障：16.0V 供电 (发电机调节器击穿)
              </Button>
            </div>

            {selectedVoltage === 6 && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-900 font-semibold flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <span>欠压现象：电压降低一半至 6V，实际功率暴跌至 6.0W（额定 24W 的 1/4）！灯丝仅发出微弱暗红光。验证实际功率与电压平方成正比。</span>
              </div>
            )}

            {selectedVoltage === 16 && (
              <div className="p-3.5 bg-red-50 border border-red-300 rounded-lg text-sm text-red-900 font-semibold flex items-center gap-2">
                <Flame size={18} className="text-red-600 shrink-0" />
                <span>过压危险：电压升高至 16V，实际功率激增至 42.7W（超额定 77%）！灯泡极度过热，灯丝随时可能融断，必须由电压调节器稳压在 14V 内！</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <Gauge size={18} />
                数字功率与电参数分析仪
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-900 text-amber-200 border border-amber-700">
                P-U² 定律档
              </span>
            </div>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">ACTUAL POWER (P = U² / R)</span>
                <span className="font-bold text-amber-300">
                  {selectedVoltage === 12 ? '100% RATED' : selectedVoltage === 6 ? '25% DERATED' : '178% OVERPOWER'}
                </span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {actualPower.toFixed(1)} W
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>VOLTS: {selectedVoltage}.00V | AMPS: {actualCurrent.toFixed(2)}A</span>
                <span className="font-bold">WATTS</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">额定 vs 实际核心铁律：</strong>
              “额定功率”是设备在制造标准额定电压（12V）下的设计指标；而“实际功率”则严格取决于施加的实际电压：<strong>P = U² / R</strong>。工作电压一旦波动，实际功率将发生剧烈非线性变化！
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Joule Heating Wire Overheat Counterexample */}
      {currentStep === 'JOULE_HEATING_WIRE_OVERHEAT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              焦耳定律与线束发热自燃反例实验台 (Q = I² · R · t)
            </span>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">实验对比情境：</strong>
              汽车散热风扇启动运行，线路持续承载 <span className="font-bold text-red-600">20.0 A</span> 大电流。点击下方对比两种不同截面积导线的线束发热功率与温升表现：
            </div>

            {/* Wire select buttons */}
            <div className="flex flex-wrap gap-2.5">
              <Button
                variant={selectedWire === '0.5mm' ? 'default' : 'outline'}
                onClick={() => {
                  sounds.click();
                  setSelectedWire('0.5mm');
                }}
                className={`cursor-pointer font-bold text-sm ${selectedWire === '0.5mm' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
              >
                测试 0.5mm² 细导线 (严重欠配，线阻 0.40Ω)
              </Button>
              <Button
                variant={selectedWire === '2.5mm' ? 'default' : 'outline'}
                onClick={() => {
                  sounds.click();
                  setSelectedWire('2.5mm');
                }}
                className={`cursor-pointer font-bold text-sm ${selectedWire === '2.5mm' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
              >
                测试 2.5mm² 标准汽车粗导线 (规范匹配，线阻 0.05Ω)
              </Button>
            </div>

            {/* Infrared thermal camera visual box */}
            <div className={`w-full h-44 rounded-xl flex items-center justify-center p-4 relative border shadow-inner ${
              selectedWire === '0.5mm' ? 'bg-red-950/70 border-red-800' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex flex-col items-center gap-2 text-center text-white">
                <div className="flex items-center gap-3">
                  <Flame size={selectedWire === '0.5mm' ? 36 : 24} className={selectedWire === '0.5mm' ? 'text-red-500 animate-bounce' : 'text-emerald-400'} />
                  <span className="text-lg font-mono font-bold">
                    红外热成像测温：{wireTempC} °C
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  导线焦耳发热功率：P_热 = I² · R = 20² × {wireResistance} = <strong className={selectedWire === '0.5mm' ? 'text-red-300 text-sm' : 'text-emerald-300 text-sm'}>{wireHeatingPower.toFixed(1)} W</strong>
                </div>
                {selectedWire === '0.5mm' && (
                  <span className="text-xs font-bold text-red-300 bg-red-900/60 px-2.5 py-1 rounded border border-red-600">
                    ⚠ 极度危险：线皮 PVC 塑料在 185°C 发生焦糊融化，即将引燃周围内饰！
                  </span>
                )}
                {selectedWire === '2.5mm' && (
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-900/60 px-2.5 py-1 rounded border border-emerald-600">
                    ✓ 安全达标：表面温升仅 36°C，线皮无变形，安全余量充足。
                  </span>
                )}
              </div>
            </div>

            {/* Theory Quiz: NO SPOILER */}
            <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-600" />
                <strong className="text-sm font-bold text-slate-800">
                  技师思考辨析：在汽车大电流电气线路中，若选用导线截面积过小（如 0.5mm²），通电后引发自燃的主要物理机制是：
                </strong>
              </div>

              <div className="flex flex-col gap-2.5">
                {[
                  {
                    id: 'OPT_JOULE',
                    text: 'A. 导线截面积小则电阻偏大，根据焦耳定律 Q = I² · R · t，大电流通过大电阻产生的热量呈平方级暴增，瞬间超温融化自燃',
                  },
                  {
                    id: 'OPT_VOLT',
                    text: 'B. 细导线内部电压会异常翻倍升高至数万伏特击穿空气',
                  },
                  {
                    id: 'OPT_MAGNETIC',
                    text: 'C. 细导线会产生超强磁场吸附周围扳手等工具引发短路',
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer text-sm ${
                      step2Choice === opt.id
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-medium'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="step2_quiz"
                      value={opt.id}
                      checked={step2Choice === opt.id}
                      onChange={() => {
                        sounds.click();
                        setStep2Choice(opt.id);
                        setStep2Submitted(false);
                        setStep2Feedback(null);
                      }}
                      className="mt-1 cursor-pointer"
                    />
                    <span className="flex-1 leading-relaxed">{opt.text}</span>
                  </label>
                ))}
              </div>

              <Button
                disabled={!step2Choice}
                onClick={handleSubmitStep2}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 cursor-pointer text-sm shadow-sm"
              >
                提交焦耳热辨析工单
              </Button>

              {step2Feedback && (
                <div
                  className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                    step2Choice === 'OPT_JOULE'
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                      : 'bg-red-50 border border-red-300 text-red-900'
                  }`}
                >
                  {step2Choice === 'OPT_JOULE' ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{step2Feedback}</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Gauge size={18} />
              线束发热功耗分析仪
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-red-950/80 border-4 border-red-800 rounded-xl shadow-inner font-mono text-red-300">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">WIRE HEAT: {selectedWire}</span>
                <span className="font-bold text-red-200">
                  {selectedWire === '0.5mm' ? 'FIRE HAZARD (185°C)' : 'SAFE (36°C)'}
                </span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-red-200">
                {wireHeatingPower.toFixed(1)} W
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>R_WIRE: {wireResistance} Ω | I = 20.0 A</span>
                <span className="font-bold">JOULE HEAT</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">焦耳定律与配线铁律：</strong>
              电流流经任何有阻抗的导线都会产生热量：<strong>Q = I² · R · t</strong>。导线越细，电阻 R 越大；电流以平方倍放大产热！在大电流供电线路上私自使用劣质细电线，就是埋下了一颗起火定时炸弹！
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Workshop Energy Budget Calculator */}
      {currentStep === 'WORKSHOP_ENERGY_BUDGET_CALC' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              汽修工位多设备电能消耗与电费预算工作台 (W = P · t)
            </span>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">工位设备能耗清单：</strong>
              拖动滑块调整今日工位各设备运行工时，实时核算用电度数（kWh）与工业电费成本（单价 ¥0.85/kWh）：
            </div>

            {/* Sliders for equipment hours */}
            <div className="flex flex-col gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">1. 大功率蓄电池充电机 (600W / 0.6kW)</span>
                <span className="font-mono text-blue-700 font-bold">{chargerHours} 小时 = {chargerKWh.toFixed(2)} kWh</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={chargerHours}
                onChange={(e) => {
                  setChargerHours(parseFloat(e.target.value));
                }}
                className="cursor-pointer"
              />

              <div className="flex items-center justify-between mt-1">
                <span className="font-bold text-slate-800">2. 双柱液压汽车举升机 (2200W / 2.2kW)</span>
                <span className="font-mono text-purple-700 font-bold">{liftHours} 小时 = {liftKWh.toFixed(2)} kWh</span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                step="0.5"
                value={liftHours}
                onChange={(e) => {
                  setLiftHours(parseFloat(e.target.value));
                }}
                className="cursor-pointer"
              />

              <div className="flex items-center justify-between mt-1">
                <span className="font-bold text-slate-800">3. 工位高亮 LED 照灯与电脑 (200W / 0.2kW)</span>
                <span className="font-mono text-emerald-700 font-bold">{lightHours} 小时 = {lightKWh.toFixed(2)} kWh</span>
              </div>
              <input
                type="range"
                min="0"
                max="16"
                step="1"
                value={lightHours}
                onChange={(e) => {
                  setLightHours(parseFloat(e.target.value));
                }}
                className="cursor-pointer"
              />
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-300 rounded-lg text-sm text-blue-900 font-semibold flex items-center justify-between">
              <span>今日工位总耗电量：<strong>{totalKWh.toFixed(2)} kWh (度)</strong></span>
              <span>日电费支出：<strong>¥ {totalCost.toFixed(2)}</strong></span>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Calculator size={18} />
              工位智能电能表 (kWh)
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">TOTAL CONSUMPTION</span>
                <span className="font-bold text-amber-300">PRICE: ¥0.85/kWh</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                {totalKWh.toFixed(2)} kWh
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>TODAY COST: ¥{totalCost.toFixed(2)}</span>
                <span className="font-bold">ACTIVE ENERGY</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">电能与电量换算准则：</strong>
              电能是功率对时间的累积：<strong>W = P · t</strong>。日常所说的“1 度电”就是 1 千瓦时（1 kWh = 1000 W × 1 h = 3.6 × 10⁶ J）。掌握设备电能计算，是进行工位电气配电与成本预算的必备技能！
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Quantitative 360W Amp Fuse Blind Test */}
      {currentStep === 'QUANTITATIVE_FUSE_SELECT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              加装 360W 车载重低音功放保险丝容量与线径校核 · 独立盲测工单
            </span>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">工程改装情境：</strong>
              车主要求加装一套额定功率高达 <span className="font-bold text-blue-700">360 W</span> 的 12.0V 车载重低音功放。
              请根据电功率基本公式（P = U · I）与汽车电气工程 1.25~1.5 倍防误熔裕量标准，核算满载电流、匹配专用主保险丝与安全电缆截面积：
            </div>

            {/* Answer Options: NO SPOILER */}
            <div className="flex flex-col gap-2.5">
              {[
                {
                  id: 'OPT_A',
                  text: 'A. 满载工作电流 30.0 A (360W ÷ 12V)；按 1.33 倍裕量选用 40 A 保险丝；配套电缆截面积不得小于 6.0 mm²',
                },
                {
                  id: 'OPT_B',
                  text: 'B. 满载工作电流 3.0 A；选用 5 A 保险丝；配套电缆截面积 0.5 mm²',
                },
                {
                  id: 'OPT_C',
                  text: 'C. 满载工作电流 30.0 A；选用 15 A 原车备用保险丝；配套电缆截面积 1.5 mm²',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-sm ${
                    step4Choice === opt.id
                      ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-medium'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="step4_choice"
                    value={opt.id}
                    checked={step4Choice === opt.id}
                    onChange={() => {
                      sounds.click();
                      setStep4Choice(opt.id);
                      setStep4Submitted(false);
                      setStep4Feedback(null);
                    }}
                    className="mt-1 cursor-pointer"
                  />
                  <span className="flex-1 leading-relaxed">{opt.text}</span>
                </label>
              ))}
            </div>

            <Button
              disabled={!step4Choice}
              onClick={handleSubmitStep4}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 cursor-pointer text-sm shadow-sm"
            >
              提交功放供电核算工单
            </Button>

            {step4Feedback && (
              <div
                className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                  step4Choice === 'OPT_A'
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border border-red-300 text-red-900'
                }`}
              >
                {step4Choice === 'OPT_A' ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{step4Feedback}</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Gauge size={18} />
              功放电气负荷分析仪
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-emerald-950 border-4 border-slate-800 rounded-xl shadow-inner font-mono text-emerald-400">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">LOAD CURRENT: I = P / U</span>
                <span className="font-bold text-amber-300">P = 360 W</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-emerald-300">
                30.00 A
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>FUSE: 40A | WIRE: &gt;= 6.0mm²</span>
                <span className="font-bold">DC AMPERES</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">改装核算要领：</strong>
              满载电流计算：I = P / U = 360W / 12V = 30.0A。保险丝不能刚好等于 30A（启动冲击会误烧），一般乘 1.33 倍取 40A；同时 30A 持续电流必须配 6.0mm² 纯铜粗线！
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Transfer Inverter Overload Decision */}
      {currentStep === 'TRANSFER_SMOKE_OVERLOAD_DIAG' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col gap-3.5 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-sm font-bold text-slate-700">
              1000W 逆变器私接点烟器烧蚀排故与合规整改
            </span>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">实车火灾险情事故复现：</strong>
              车主在标称限额仅 120W (10A 保险丝) 的前排点烟器插孔，强行插入一台 1000W 户外大功率逆变器烧电热水壶。开启不到 10 秒，点烟器插头冒出浓烈黑烟，塑料外壳彻底烧融粘连，原车 10A 保险丝爆断！
              <div className="mt-1 text-xs sm:text-sm font-bold text-red-700">
                1000W 在 12V 下极端电流：I = 1000W ÷ 12V ≈ 83.3 A (超插座承载极限 8 倍以上！)
              </div>
            </div>

            {/* Technician decision options: NO SPOILER */}
            <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <strong className="text-sm font-bold text-slate-800">
                  车间技师决策：作为车间高级技师，面对车主急于用电的需求，你的合规根治整改方案是：
                </strong>
              </div>

              <div className="flex flex-col gap-2.5">
                {[
                  {
                    id: 'OPT_DIRECT_BATTERY',
                    text: 'A. 严厉制止点烟器私插行为：1000W 电流超 83A，点烟器插座及原车细线绝对无法承受。必须使用专用铜鼻从蓄电池正负极桩头直连引出 16.0mm² 专用耐热粗铜缆，回路正极加装 100A 专用主熔断器，并配置耐高温大电流快插接头',
                  },
                  {
                    id: 'OPT_FUSE_100A',
                    text: 'B. 同意车主继续插在点烟器上，只需将烧断的点烟器 10A 保险丝换成 100A 大保险丝',
                  },
                  {
                    id: 'OPT_NEW_SOCKET',
                    text: 'C. 仅更换一个全新的原厂点烟器插座，判定为旧插座内部触点生锈虚接',
                  },
                  {
                    id: 'OPT_LIMIT_RESISTOR',
                    text: 'D. 在点烟器插头上串联一个限流电阻以降低电流',
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-sm ${
                      step5Decision === opt.id
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-medium'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="step5_decision"
                      value={opt.id}
                      checked={step5Decision === opt.id}
                      onChange={() => {
                        sounds.click();
                        setStep5Decision(opt.id);
                        setStep5Submitted(false);
                        setStep5Feedback(null);
                      }}
                      className="mt-1 cursor-pointer"
                    />
                    <span className="flex-1 leading-relaxed">{opt.text}</span>
                  </label>
                ))}
              </div>

              <Button
                disabled={!step5Decision}
                onClick={handleSubmitStep5}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 cursor-pointer text-sm shadow-sm"
              >
                提交大功率逆变器安全整改工单
              </Button>

              {step5Feedback && (
                <div
                  className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 leading-relaxed ${
                    step5Decision === 'OPT_DIRECT_BATTERY'
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                      : 'bg-red-50 border border-red-300 text-red-900'
                  }`}
                >
                  {step5Decision === 'OPT_DIRECT_BATTERY' ? (
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{step5Feedback}</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700">
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Gauge size={18} />
              大功率逆变器负荷分析仪
            </span>

            <div className="flex flex-col justify-between h-32 p-4 bg-red-950/80 border-4 border-red-800 rounded-xl shadow-inner font-mono text-red-300">
              <div className="flex items-center justify-between text-xs opacity-80">
                <span className="font-bold">1000W INVERTER AT 12V</span>
                <span className="font-bold text-red-200">FUSE 10A DESTROYED</span>
              </div>
              <div className="text-4xl lg:text-5xl font-black text-right tracking-widest text-red-200">
                83.33 A
              </div>
              <div className="flex items-center justify-between text-xs opacity-80">
                <span>CIGARETTE LIMIT: 10A</span>
                <span className="font-bold text-amber-300">FIRE_MELTDOWN</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed border border-slate-700">
              <strong className="block text-amber-300 mb-1 font-bold">汽车大功率用电铁律：</strong>
              原车点烟器插孔只适用于 120W 以内的小型电子设备。所有超过 200W 的大功率逆变器、车载充气泵、绞盘，<strong>严禁使用点烟器插头</strong>，必须使用 16mm² 以上专用耐热电缆直接从蓄电池桩头取电并配置专用高容量主保险！
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
