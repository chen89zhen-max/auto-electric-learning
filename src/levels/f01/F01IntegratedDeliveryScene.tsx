'use client';

import React, { useState } from 'react';
import {
  F01_STAGE_CONTENT,
  F01_STAGE_ORDER,
  F01_FAULT_COPY,
} from './f01Training';
import {
  REQUIRED_EVIDENCE_TARGETS,
  getF01Outputs,
  validateF01CompletionMetrics,
  type F01Action,
  type F01FunctionalCase,
  type F01MeasurementRecord,
  type F01MeasurementTarget,
  type F01MeterJack,
  type F01MeterMode,
  type F01MeterRequest,
  type F01ModelState,
  type F01Stage,
  type F01StageSubmission,
  type F01CompletionMetrics,
} from './f01Model';

export interface F01IntegratedDeliverySceneProps {
  stage: F01Stage;
  model: F01ModelState;
  measurementLog: F01MeasurementRecord[];
  functionalMatrix: F01FunctionalCase[];
  feedback: { kind: 'status' | 'alert'; message: string } | null;
  onAction: (action: F01Action) => void;
  onMeasure: (request: F01MeterRequest) => void;
  onSubmitStage: (submission: F01StageSubmission) => void;
  onSelectDefenseEvidence: (ids: string[]) => void;
}

const meterModes: F01MeterMode[] = ['OFF', 'DCV_20', 'DCA_10', 'OHM', 'CONTINUITY', 'DIODE'];
const redJackOptions: F01MeterJack[] = ['V_OHM', '10A'];
const targetOptions: F01MeasurementTarget[] = [
  'battery_terminals',
  'lamp_voltage',
  'main_current_series',
  'supply_connector_drop',
  'ground_drop',
  'divider_output',
  'relay_coil_voltage',
  'relay_coil_continuity',
  'flyback_polarity',
  'board_supply_to_ground',
];

const measurementTargetLabel: Record<F01MeasurementTarget, string> = {
  battery_terminals: '蓄电池端电压',
  lamp_voltage: '检修灯两端电压',
  main_current_series: '主回路串联电流',
  supply_connector_drop: '电源正极连接器压降',
  ground_drop: '检修灯搭铁点压降',
  divider_output: '传感器分压点电压',
  relay_coil_voltage: '继电器线圈控制电压',
  relay_coil_continuity: '继电器线圈通断',
  flyback_polarity: '续流二极管极性',
  board_supply_to_ground: '控制板供电对地电阻',
};

export function F01IntegratedDeliveryScene({
  stage,
  model,
  measurementLog,
  functionalMatrix,
  feedback,
  onAction,
  onMeasure,
  onSubmitStage,
  onSelectDefenseEvidence,
}: F01IntegratedDeliverySceneProps) {
  // Meter form state
  const [mode, setMode] = useState<F01MeterMode>('OFF');
  const [redJack, setRedJack] = useState<F01MeterJack>('V_OHM');
  const [target, setTarget] = useState<F01MeasurementTarget>('battery_terminals');

  // Stage 1 state
  const [powerIdentified, setPowerIdentified] = useState(false);
  const [controlIdentified, setControlIdentified] = useState(false);
  const [hypothesis1, setHypothesis1] = useState('');
  const [hypothesis2, setHypothesis2] = useState('');

  // Stage 2 state
  const [testPlan, setTestPlan] = useState('');

  // Stage 3 state
  const [calcCurrent, setCalcCurrent] = useState('');
  const [calcLampV, setCalcLampV] = useState('');
  const [calcDividerV, setCalcDividerV] = useState('');
  const [calcTruthTable, setCalcTruthTable] = useState('');

  // Stage 5 state
  const [localRecordedCases, setLocalRecordedCases] = useState<Map<string, F01FunctionalCase>>(new Map());
  const [transferV, setTransferV] = useState('');
  const [transferCondition, setTransferCondition] = useState('');
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);

  const outputs = getF01Outputs(model);

  // Pre-power defect repair checks
  const prePowerTarget = REQUIRED_EVIDENCE_TARGETS[model.seed][0];
  const hasPrePowerEvidence = measurementLog.some((r) => r.target === prePowerTarget);

  // Runtime defect repair checks
  const runtimeTargets = REQUIRED_EVIDENCE_TARGETS[model.seed].slice(1);
  const hasRuntimeEvidence = runtimeTargets.every((t) => measurementLog.some((r) => r.target === t));

  const prePowerRepairButtonLabel =
    model.seed === 'F01-A'
      ? '纠正续流二极管极性'
      : model.seed === 'F01-B'
      ? '清除+12V与地之间焊桥'
      : '返修继电器线圈端虚焊';

  const operationalRepairButtonLabel =
    model.seed === 'F01-A'
      ? '修复电源正极连接器接触面并恢复端子夹紧力'
      : model.seed === 'F01-B'
      ? '修复传感器分压上支路开路点'
      : '清洁并紧固灯组搭铁连接点';

  function handleRecordFunctionalCase() {
    const key = `${model.inputs.a}-${model.inputs.b}`;
    const expectedRelay = model.inputs.a && model.inputs.b;
    const itemPassed = outputs.relayOn === expectedRelay && outputs.lampOn === expectedRelay;
    const nextMap = new Map(localRecordedCases);
    nextMap.set(key, {
      a: model.inputs.a,
      b: model.inputs.b,
      relayOn: outputs.relayOn,
      lampOn: outputs.lampOn,
      passed: itemPassed,
    });
    setLocalRecordedCases(nextMap);
  }

  function handleEvidenceToggle(id: string) {
    let next: string[];
    if (selectedEvidenceIds.includes(id)) {
      next = selectedEvidenceIds.filter((item) => item !== id);
    } else {
      if (selectedEvidenceIds.length >= 2) {
        next = [selectedEvidenceIds[1], id];
      } else {
        next = [...selectedEvidenceIds, id];
      }
    }
    setSelectedEvidenceIds(next);
    onSelectDefenseEvidence(next);
  }

  function renderStage1() {
    const canSubmit = powerIdentified && controlIdentified && hypothesis1 && hypothesis2 && hypothesis1 !== hypothesis2;
    return (
      <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-100">
        <h3 className="text-base font-bold text-amber-400">阶段1：接单识图与建立假设</h3>
        <p className="text-sm text-slate-300">工单现象：{F01_FAULT_COPY[model.seed].workOrderSymptom}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              powerIdentified ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            onClick={() => setPowerIdentified(true)}
          >
            {powerIdentified ? '已确认功率回路 ✓' : '确认功率回路'}
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              controlIdentified ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            onClick={() => setControlIdentified(true)}
          >
            {controlIdentified ? '已确认控制回路 ✓' : '确认控制回路'}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            初始假设1
            <select
              aria-label="初始假设1"
              value={hypothesis1}
              onChange={(e) => setHypothesis1(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-slate-100"
            >
              <option value="">-- 请选择优先级假设1 --</option>
              <option value="POWER_PATH">主功率回路供电或连接异常</option>
              <option value="CONTROL_PATH">控制回路分压或驱动异常</option>
              <option value="LAMP_BURNOUT">检修灯灯珠开路损坏</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            初始假设2
            <select
              aria-label="初始假设2"
              value={hypothesis2}
              onChange={(e) => setHypothesis2(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-slate-100"
            >
              <option value="">-- 请选择优先级假设2 --</option>
              <option value="CONTROL_PATH">控制回路分压或驱动异常</option>
              <option value="POWER_PATH">主功率回路供电或连接异常</option>
              <option value="RELAY_COIL_DEFECT">继电器驱动及线圈控制支路异常</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={!canSubmit}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-500 disabled:opacity-50"
          onClick={() =>
            onSubmitStage({
              stage: 'WORK_ORDER_AND_HYPOTHESIS',
              identifiedCircuits: ['POWER', 'CONTROL'],
              hypotheses: [hypothesis1, hypothesis2],
            })
          }
        >
          提交接单分析
        </button>
      </div>
    );
  }

  function renderStage2() {
    const canSubmit =
      model.prePowerDefectFixed &&
      hasPrePowerEvidence &&
      testPlan === 'OFF_INSPECT_ON_MEASURE_OFF_REPAIR_ON_RETEST';

    return (
      <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-100">
        <h3 className="text-base font-bold text-amber-400">阶段2：上电前安全审查与测量计划</h3>
        <p className="text-sm text-slate-300">
          安全提示：{F01_FAULT_COPY[model.seed].prePowerInspection}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!hasPrePowerEvidence || model.prePowerDefectFixed}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            onClick={() => onAction({ type: 'FIX_PREPOWER', defect: model.prePowerDefect })}
          >
            {model.prePowerDefectFixed ? '上电前缺陷已纠正 ✓' : prePowerRepairButtonLabel}
          </button>
          {!hasPrePowerEvidence && (
            <span className="text-sm text-amber-400">
              提示：需先用断电仪表测量并记录装配异常点（当前种子对应测点：{measurementTargetLabel[prePowerTarget]}）方可纠正。
            </span>
          )}
        </div>
        <div>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            测量计划顺序
            <select
              aria-label="测量计划顺序"
              value={testPlan}
              onChange={(e) => setTestPlan(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-slate-100"
            >
              <option value="">-- 请选择规范作业流程顺序 --</option>
              <option value="OFF_INSPECT_ON_MEASURE_OFF_REPAIR_ON_RETEST">
                断电检查→通电测量→断电修复→通电复检
              </option>
              <option value="ON_DIRECT_MEASURE">直接带电测量所有点位并边测边修</option>
              <option value="SWAP_PARTS_THEN_TEST">先更换疑似损坏元件再送电验证</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={!canSubmit}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-500 disabled:opacity-50"
          onClick={() =>
            onSubmitStage({
              stage: 'SAFETY_AND_TEST_PLAN',
              plan: 'OFF_INSPECT_ON_MEASURE_OFF_REPAIR_ON_RETEST',
              prePowerDefectFixed: model.prePowerDefectFixed,
              measurementLog,
            })
          }
        >
          提交安全审查
        </button>
      </div>
    );
  }

  function renderStage3() {
    const parsedCurrent = parseFloat(calcCurrent);
    const parsedLampV = parseFloat(calcLampV);
    const parsedDividerV = parseFloat(calcDividerV);
    const canSubmit = !isNaN(parsedCurrent) && !isNaN(parsedLampV) && !isNaN(parsedDividerV) && calcTruthTable.trim().length === 4;

    return (
      <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-100">
        <h3 className="text-base font-bold text-amber-400">阶段3：建立正常参考值（本实训模型参数）</h3>
        <p className="text-sm text-slate-300">
          电源电动势12.0V、内阻1.0Ω、灯电阻5.0Ω；控制电源5.0V、分压各1kΩ、逻辑阈值2.0V。请计算正常参考值：
        </p>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            正常主回路电流 (A)
            <input
              type="text"
              aria-label="正常主回路电流"
              placeholder="例如 2.00"
              value={calcCurrent}
              onChange={(e) => setCalcCurrent(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            正常灯端电压 (V)
            <input
              type="text"
              aria-label="正常灯端电压"
              placeholder="例如 10.00"
              value={calcLampV}
              onChange={(e) => setCalcLampV(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            正常分压点电压 (V)
            <input
              type="text"
              aria-label="正常分压点电压"
              placeholder="例如 2.50"
              value={calcDividerV}
              onChange={(e) => setCalcDividerV(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            与门输出序列 (4位)
            <input
              type="text"
              aria-label="与门输出序列"
              placeholder="例如 0001"
              value={calcTruthTable}
              onChange={(e) => setCalcTruthTable(e.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-slate-100"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={!canSubmit}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-500 disabled:opacity-50"
          onClick={() =>
            onSubmitStage({
              stage: 'EXPECTED_VALUE_CALCULATION',
              currentA: parsedCurrent,
              lampV: parsedLampV,
              dividerV: parsedDividerV,
              truthTable: calcTruthTable.trim() as '0001',
            })
          }
        >
          提交正常值基准
        </button>
      </div>
    );
  }

  function renderStage4() {
    const canSubmit = model.operationalFaultFixed && hasRuntimeEvidence;

    return (
      <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-100">
        <h3 className="text-base font-bold text-amber-400">阶段4：未知故障测量、排除与修复</h3>
        <p className="text-sm text-slate-300">
          请在不同工况与挡位下通过万用表测量定位故障。需形成完整运行测量链方可确认修复。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!hasRuntimeEvidence || model.operationalFaultFixed}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            onClick={() => onAction({ type: 'REPAIR_OPERATIONAL', fault: model.operationalFault })}
          >
            {model.operationalFaultFixed ? '运行故障已修复 ✓' : operationalRepairButtonLabel}
          </button>
          {!hasRuntimeEvidence && (
            <span className="text-sm text-amber-400">
              提示：需测得关键节点运行数据（包括：{runtimeTargets.map((t) => measurementTargetLabel[t]).join('、')}）后才能执行修复。
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={!canSubmit}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-500 disabled:opacity-50"
          onClick={() =>
            onSubmitStage({
              stage: 'BLIND_DIAGNOSIS_AND_REPAIR',
              diagnosis: model.operationalFault,
              measurementLog,
            })
          }
        >
          提交诊断与修复
        </button>
      </div>
    );
  }

  function renderStage5() {
    const cases = [
      localRecordedCases.get('false-false'),
      localRecordedCases.get('false-true'),
      localRecordedCases.get('true-false'),
      localRecordedCases.get('true-true'),
    ].filter(Boolean) as F01FunctionalCase[];

    const allFourCasesRecorded = cases.length === 4 && cases.every((c) => c.passed);
    const parsedTransferV = parseFloat(transferV);
    const transferValid =
      !isNaN(parsedTransferV) &&
      Math.abs(parsedTransferV - 1.67) <= 0.05 &&
      transferCondition === 'RELAY_OFF_LAMP_OFF';

    const twoEvidenceSelected = selectedEvidenceIds.length === 2 && selectedEvidenceIds[0] !== selectedEvidenceIds[1];

    const canSubmit = allFourCasesRecorded && transferValid && twoEvidenceSelected && model.prePowerDefectFixed && model.operationalFaultFixed;

    return (
      <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-100">
        <h3 className="text-base font-bold text-amber-400">阶段5：功能复检、参数迁移与证据答辩</h3>
        
        {/* 4 cases verification */}
        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3">
          <h4 className="text-sm font-bold text-slate-200">1. 四工况功能矩阵复检</h4>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                aria-label="维护使能 A"
                checked={model.inputs.a}
                onChange={(e) => onAction({ type: 'SET_INPUTS', a: e.target.checked, b: model.inputs.b })}
                className="h-4 w-4"
              />
              维护使能 A
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                aria-label="光照条件 B"
                checked={model.inputs.b}
                onChange={(e) => onAction({ type: 'SET_INPUTS', a: model.inputs.a, b: e.target.checked })}
                className="h-4 w-4"
              />
              光照条件 B
            </label>
            <button
              type="button"
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-600"
              onClick={handleRecordFunctionalCase}
            >
              记录当前工况
            </button>
            <span className="text-sm text-slate-300">
              当前状态：继电器【{outputs.relayOn ? '吸合' : '释放'}】 检修灯【{outputs.lampOn ? '点亮' : '熄灭'}】
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {[
              { a: false, b: false, label: 'A=0, B=0' },
              { a: false, b: true, label: 'A=0, B=1' },
              { a: true, b: false, label: 'A=1, B=0' },
              { a: true, b: true, label: 'A=1, B=1' },
            ].map(({ a, b, label }) => {
              const item = localRecordedCases.get(`${a}-${b}`);
              return (
                <div
                  key={label}
                  className={`rounded-lg border p-2 text-center ${
                    item?.passed ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  <p className="font-bold">{label}</p>
                  <p className="text-sm">{item ? (item.passed ? '已验证通过 ✓' : '状态异常') : '待测试'}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transfer calculation */}
        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3">
          <h4 className="text-sm font-bold text-slate-200">2. 参数迁移题：上支路阻值提升为 2 kΩ（下支路维持 1 kΩ）</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              迁移分压点电压 (V)
              <input
                type="text"
                aria-label="迁移分压点电压"
                placeholder="例如 1.67"
                value={transferV}
                onChange={(e) => setTransferV(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              迁移工况判断
              <select
                aria-label="迁移工况判断"
                value={transferCondition}
                onChange={(e) => setTransferCondition(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-slate-100"
              >
                <option value="">-- 请选择动作判断 --</option>
                <option value="RELAY_OFF_LAMP_OFF">低于2.00V阈值，AND输出0，继电器释放、检修灯熄灭</option>
                <option value="RELAY_ON_LAMP_ON">高于阈值，继电器吸合、检修灯点亮</option>
              </select>
            </label>
          </div>
        </div>

        {/* Defense evidence selection */}
        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3">
          <h4 className="text-sm font-bold text-slate-200">3. 证据答辩（请在下方测量台账勾选 2 项本轮实测证据）</h4>
          <p className="text-sm text-slate-300">
            已选证据数：{selectedEvidenceIds.length}/2
          </p>
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-500 disabled:opacity-50"
          onClick={() => {
            const finalMatrix = [
              localRecordedCases.get('false-false')!,
              localRecordedCases.get('false-true')!,
              localRecordedCases.get('true-false')!,
              localRecordedCases.get('true-true')!,
            ];
            const metrics: F01CompletionMetrics = {
              schemaVersion: 1,
              seed: model.seed,
              completedStages: [...F01_STAGE_ORDER],
              prePowerDefectFixed: true,
              operationalFaultFixed: true,
              measurementLog,
              functionalMatrix: finalMatrix,
              transfer: {
                upperOhms: 2000,
                lowerOhms: 1000,
                dividerVoltage: 1.6667,
                sensorInput: false,
                relayOn: false,
                passed: true,
              },
              defenseEvidenceIds: [selectedEvidenceIds[0], selectedEvidenceIds[1]],
            };
            onSubmitStage({
              stage: 'FUNCTION_RETEST_AND_DEFENSE',
              metrics,
            });
          }}
        >
          提交终检交付
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Progress nav */}
      <nav
        aria-label="F01 五阶段考核进度"
        className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-100 p-2 text-sm font-bold"
      >
        {F01_STAGE_ORDER.map((id) => (
          <span
            key={id}
            aria-current={id === stage ? 'step' : undefined}
            className={
              id === stage
                ? 'rounded-lg bg-amber-600 px-3 py-2 text-white'
                : 'rounded-lg bg-white px-3 py-2 text-slate-600'
            }
          >
            {F01_STAGE_CONTENT[id].title}
          </span>
        ))}
      </nav>

      {/* Feedback banner */}
      {feedback && (
        <div
          role={feedback.kind === 'alert' ? 'alert' : 'status'}
          className={
            feedback.kind === 'alert'
              ? 'rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900'
              : 'rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900'
          }
        >
          {feedback.message}
        </div>
      )}

      {/* 2. Circuit diagram */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-200">电路工作状态：</span>
            <span
              className={`rounded px-2 py-0.5 text-sm font-bold ${
                model.powerOn ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {model.powerOn ? '供电正常' : '断电'}
            </span>
            {model.powerOn && !outputs.sensorInput && (
              <span className="rounded bg-amber-900 px-2 py-0.5 text-sm font-bold text-amber-200">
                控制未成立
              </span>
            )}
            {model.powerOn && model.operationalFaultFixed === false && (
              <span className="rounded bg-rose-900 px-2 py-0.5 text-sm font-bold text-rose-200">
                压降异常
              </span>
            )}
          </div>
          <div>
            {model.powerOn ? (
              <button
                type="button"
                className="rounded-lg bg-rose-700 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-rose-600"
                onClick={() => onAction({ type: 'SET_POWER', on: false })}
              >
                断开总电源
              </button>
            ) : (
              <button
                type="button"
                className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-emerald-600"
                onClick={() => onAction({ type: 'SET_POWER', on: true })}
              >
                闭合总电源
              </button>
            )}
          </div>
        </div>

        <svg
          viewBox="0 0 980 520"
          role="img"
          aria-labelledby="f01-circuit-title f01-circuit-desc"
          className="h-auto w-full min-w-0"
        >
          <title id="f01-circuit-title">新能源汽车低压智能检修灯控制总成</title>
          <desc id="f01-circuit-desc">
            12伏功率回路、5伏传感器分压、与门、三极管、继电器、续流二极管、检修灯和搭铁组成的教学电路
          </desc>

          {/* Circuit background grid & wires */}
          <rect width="980" height="520" rx="12" fill="#090d16" />

          {/* Main 12V bus (top) */}
          <path
            d="M 120 120 L 780 120"
            stroke={model.powerOn ? '#f59e0b' : '#475569'}
            strokeWidth="4"
            strokeDasharray={model.powerOn ? '8 4' : 'none'}
          />

          {/* Ground bus (bottom) */}
          <path d="M 120 440 L 780 440" stroke="#334155" strokeWidth="4" />

          {/* 1. Power Source */}
          <g data-component="power-source" aria-label="12伏低压电源" transform="translate(60, 240)">
            <rect x="0" y="0" width="80" height="80" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <text x="40" y="32" fill="#38bdf8" fontSize="13" fontWeight="bold" textAnchor="middle">12V 蓄电池</text>
            <text x="40" y="52" fill="#94a3b8" fontSize="11" textAnchor="middle">E=12V r=1Ω</text>
            <line x1="40" y1="0" x2="40" y2="-120" stroke={model.powerOn ? '#f59e0b' : '#475569'} strokeWidth="3" />
            <line x1="40" y1="80" x2="40" y2="200" stroke="#334155" strokeWidth="3" />
          </g>

          {/* 2. Fuse */}
          <g data-component="fuse" aria-label="保险装置" transform="translate(180, 100)">
            <rect x="0" y="0" width="60" height="40" rx="4" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
            <text x="30" y="24" fill="#fbbf24" fontSize="12" fontWeight="bold" textAnchor="middle">保险 15A</text>
          </g>

          {/* 3. Sensor Divider */}
          <g data-component="divider" aria-label="5伏传感器分压支路" transform="translate(300, 160)">
            <rect x="0" y="0" width="90" height="140" rx="6" fill="#1e293b" stroke="#a855f7" strokeWidth="2" />
            <text x="45" y="25" fill="#c084fc" fontSize="12" fontWeight="bold" textAnchor="middle">5V 传感器分压</text>
            <text x="45" y="55" fill="#e2e8f0" fontSize="11" textAnchor="middle">R上: {model.divider.upperOhms}Ω</text>
            <text x="45" y="85" fill="#e2e8f0" fontSize="11" textAnchor="middle">R下: {model.divider.lowerOhms}Ω</text>
            <text x="45" y="115" fill="#38bdf8" fontSize="11" textAnchor="middle">Uout: {outputs.dividerVoltage.toFixed(2)}V</text>
          </g>

          {/* 4. AND Gate */}
          <g data-component="and-gate" aria-label="两输入与门" transform="translate(440, 200)">
            <rect x="0" y="0" width="70" height="70" rx="8" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
            <text x="35" y="32" fill="#34d399" fontSize="14" fontWeight="bold" textAnchor="middle">&amp; 与门</text>
            <text x="35" y="52" fill="#94a3b8" fontSize="10" textAnchor="middle">
              {model.inputs.a && outputs.sensorInput ? 'OUT: 1' : 'OUT: 0'}
            </text>
          </g>

          {/* 5. Transistor Driver */}
          <g data-component="transistor-driver" aria-label="三极管驱动" transform="translate(550, 210)">
            <circle cx="25" cy="25" r="25" fill="#1e293b" stroke="#60a5fa" strokeWidth="2" />
            <text x="25" y="30" fill="#93c5fd" fontSize="12" fontWeight="bold" textAnchor="middle">NPN驱动</text>
          </g>

          {/* 6. Relay & Flyback */}
          <g data-component="relay" aria-label="继电器" transform="translate(640, 180)">
            <rect x="0" y="0" width="80" height="110" rx="8" fill="#1e293b" stroke="#f43f5e" strokeWidth="2" />
            <text x="40" y="24" fill="#fb7185" fontSize="12" fontWeight="bold" textAnchor="middle">继电器</text>
            <text x="40" y="44" fill="#94a3b8" fontSize="10" textAnchor="middle">线圈 80Ω</text>
            <text x="40" y="70" fill={outputs.relayOn ? '#4ade80' : '#f87171'} fontSize="12" fontWeight="bold" textAnchor="middle">
              {outputs.relayOn ? '吸合状态' : '释放状态'}
            </text>
          </g>

          <g data-component="flyback-diode" aria-label="续流二极管" transform="translate(740, 200)">
            <rect x="0" y="0" width="60" height="50" rx="4" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />
            <text x="30" y="22" fill="#cbd5e1" fontSize="11" fontWeight="bold" textAnchor="middle">续流管</text>
            <text x="30" y="40" fill={model.prePowerDefectFixed || model.seed !== 'F01-A' ? '#4ade80' : '#f87171'} fontSize="10" textAnchor="middle">
              {model.prePowerDefectFixed || model.seed !== 'F01-A' ? '极性正确' : '反接故障'}
            </text>
          </g>

          {/* 7. Inspection Lamp */}
          <g data-component="inspection-lamp" aria-label="检修灯负载" transform="translate(820, 240)">
            <circle cx="35" cy="35" r="32" fill={outputs.lampOn ? '#fbbf24' : '#1e293b'} stroke="#f59e0b" strokeWidth="3" />
            <text x="35" y="32" fill={outputs.lampOn ? '#78350f' : '#f59e0b'} fontSize="12" fontWeight="bold" textAnchor="middle">
              检修灯
            </text>
            <text x="35" y="48" fill={outputs.lampOn ? '#78350f' : '#94a3b8'} fontSize="10" textAnchor="middle">
              5.0Ω
            </text>
          </g>

          {/* 8. Ground */}
          <g data-component="ground" aria-label="搭铁连接点" transform="translate(820, 440)">
            <line x1="35" y1="-135" x2="35" y2="0" stroke="#334155" strokeWidth="3" />
            <line x1="15" y1="0" x2="55" y2="0" stroke="#94a3b8" strokeWidth="3" />
            <line x1="22" y1="6" x2="48" y2="6" stroke="#94a3b8" strokeWidth="2.5" />
            <line x1="29" y1="12" x2="41" y2="12" stroke="#94a3b8" strokeWidth="2" />
            <text x="35" y="28" fill="#94a3b8" fontSize="10" textAnchor="middle">搭铁点</text>
          </g>
        </svg>
      </div>

      {/* 3. Digital Multimeter Controls */}
      <fieldset
        aria-label="数字万用表设置"
        className="grid gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-100 md:grid-cols-4"
      >
        <label className="flex flex-col gap-1 font-semibold">
          万用表挡位
          <select
            aria-label="万用表挡位"
            value={mode}
            onChange={(e) => setMode(e.target.value as F01MeterMode)}
            className="rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm text-slate-100"
          >
            {meterModes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 font-semibold">
          红表笔插孔
          <select
            aria-label="红表笔插孔"
            value={redJack}
            onChange={(e) => setRedJack(e.target.value as F01MeterJack)}
            className="rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm text-slate-100"
          >
            {redJackOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 font-semibold">
          测量目标
          <select
            aria-label="测量目标"
            value={target}
            onChange={(e) => setTarget(e.target.value as F01MeasurementTarget)}
            className="rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm text-slate-100"
          >
            {targetOptions.map((v) => (
              <option key={v} value={v}>
                {measurementTargetLabel[v]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            className="w-full rounded-lg bg-sky-600 py-2 text-sm font-bold text-white transition hover:bg-sky-500"
            onClick={() => onMeasure({ mode, blackJack: 'COM', redJack, target })}
          >
            执行测量
          </button>
        </div>
      </fieldset>

      {/* 4. Measurement Ledger */}
      {measurementLog.length > 0 && (
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-4">
          <h4 className="text-sm font-bold text-slate-200">测量台账（本轮实测记录）</h4>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  {stage === 'FUNCTION_RETEST_AND_DEFENSE' && <th className="p-2">选择</th>}
                  <th className="p-2">测量目标</th>
                  <th className="p-2">挡位</th>
                  <th className="p-2">实测读数</th>
                </tr>
              </thead>
              <tbody>
                {measurementLog.map((rec) => {
                  const displayVal = rec.value >= 1_000_000 ? 'OL' : `${rec.value} ${rec.unit}`;
                  return (
                    <tr key={rec.id} className="border-b border-slate-900 hover:bg-slate-900/60">
                      {stage === 'FUNCTION_RETEST_AND_DEFENSE' && (
                        <td className="p-2">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              aria-label="作为答辩证据"
                              checked={selectedEvidenceIds.includes(rec.id)}
                              onChange={() => handleEvidenceToggle(rec.id)}
                              className="h-4 w-4"
                            />
                            <span>作为答辩证据</span>
                          </label>
                        </td>
                      )}
                      <td className="p-2">{measurementTargetLabel[rec.target]}</td>
                      <td className="p-2">{rec.mode}</td>
                      <td className="p-2 font-mono font-bold text-amber-400">{displayVal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Stage form */}
      <div>
        {stage === 'WORK_ORDER_AND_HYPOTHESIS' && renderStage1()}
        {stage === 'SAFETY_AND_TEST_PLAN' && renderStage2()}
        {stage === 'EXPECTED_VALUE_CALCULATION' && renderStage3()}
        {stage === 'BLIND_DIAGNOSIS_AND_REPAIR' && renderStage4()}
        {stage === 'FUNCTION_RETEST_AND_DEFENSE' && renderStage5()}
      </div>
    </div>
  );
}
