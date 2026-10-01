'use client';

import React, { useState } from 'react';
import {
  LOW_VOLTAGE_WORKORDERS,
  createWorkorderAttempt,
  confirmWorkorderSafety,
  recordWorkorderMeasurement,
  selectWorkorderCause,
  selectWorkorderRepair,
  verifyWorkorderRetest,
  resetWorkorderDiagnosis,
  type LowVoltageWorkorder,
} from '@/src/workorders/lowVoltageWorkorders';

const RETEST_LABELS: Record<string, string> = {
  lowBeam: '近光灯正常点亮', highBeam: '远光灯正常切换',
  hornSounds: '喇叭声响正常', warningCircuitNormal: '警告／提示回路正常',
  starterCranks: '起动机正常带动', startRequestReleased: '松开 START 后起动回路释放',
  windowUpDown: '车窗上下运行正常', mirrorAdjusts: '后视镜各方向调节正常',
  chargingVoltageNormal: '充电电压恢复正常', warningLampOff: '充电警告灯熄灭',
  rippleNormal: '交流纹波复核正常',
};

export function LowVoltageWorkorderPanel() {
  const [workorder, setWorkorder] = useState<LowVoltageWorkorder>(LOW_VOLTAGE_WORKORDERS[0]);
  const [attempt, setAttempt] = useState(() => createWorkorderAttempt(LOW_VOLTAGE_WORKORDERS[0]));
  const [retest, setRetest] = useState<Record<string, boolean>>({});

  function chooseWorkorder(next: LowVoltageWorkorder) {
    setWorkorder(next);
    setAttempt(createWorkorderAttempt(next));
    setRetest({});
  }

  const measurementsComplete = workorder.measurementPlan.every((point) => attempt.measurements[point.id] !== undefined);
  const diagnosisReady = measurementsComplete && attempt.selectedCauseId === workorder.correctCauseId;
  const repairReady = diagnosisReady && attempt.repairId === workorder.correctRepairId;

  return <section className="mt-4 rounded-xl border border-cyan-900 bg-slate-950 p-4 text-slate-100" aria-label="D批次低压系统诊断工单">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-base font-black text-cyan-100">五张低压故障练习工单</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">每张工单均为独立情境，不改变既有关卡 ID 或历史通关记录。完成顺序为：症状确认 → 测量记录 → 原因判定 → 维修选择 → 功能复测。</p></div>
    </div>
    <p className="mt-2 text-xs text-amber-200">这是公开样本数据的带提示练习，不是独立考核。页面切换或刷新后，本页练习记录不会保留，也不计入课程通关或教师成绩。</p>

    <div className="mt-3 grid gap-2 lg:grid-cols-5">{LOW_VOLTAGE_WORKORDERS.map((item) => <button key={item.scenarioId} type="button" aria-label={`${item.workOrderNo} ${item.title}`} onClick={() => chooseWorkorder(item)} className={`rounded-lg border p-2 text-left text-xs ${item.scenarioId === workorder.scenarioId ? 'border-cyan-400 bg-cyan-950 text-cyan-50' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-700'}`}><strong className="block">{item.workOrderNo}</strong><span>{item.title}</span><span className="mt-1 block text-slate-400">关联 {item.associatedLevelId}</span></button>)}</div>

    <article className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs text-cyan-300">情境编号 · {workorder.scenarioId} · 关联既有关卡 {workorder.associatedLevelId}</p><h4 className="mt-1 text-lg font-black">{workorder.title}</h4></div><output className={`rounded px-2 py-1 text-xs font-bold ${attempt.status === 'passed' ? 'bg-emerald-900 text-emerald-100' : 'bg-slate-800 text-slate-200'}`}>{attempt.status === 'passed' ? '本次练习流程已完成' : '本次练习进行中'}</output></div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2"><p><strong>故障现象：</strong>{workorder.symptom}</p><p><strong>回路：</strong>{workorder.circuitSummary}</p><p><strong>正常参考：</strong>{workorder.normalReference}</p><p className="text-amber-200"><strong>安全边界：</strong>{workorder.safetyGuard}</p></div>
      <ul className="mt-3 list-disc space-y-1 rounded-lg bg-amber-950/40 p-3 pl-7 text-sm text-amber-100">{workorder.blockedActions.map((action) => <li key={action}>{action}</li>)}</ul>
      {workorder.requiredSafetyCheck && <label className="mt-3 flex items-center gap-2 rounded-lg border border-amber-700 bg-amber-950/50 p-3 text-sm font-bold text-amber-50"><input type="checkbox" checked={attempt.safetyConfirmed} onChange={() => setAttempt((current) => confirmWorkorderSafety(workorder, current))} />{workorder.requiredSafetyCheck.label}</label>}
      {workorder.scenarioId === 'D5_WINDOW_MIRROR_V1' && <button type="button" className="mt-3 rounded border border-slate-600 px-3 py-2 text-sm" onClick={() => { setAttempt((current) => resetWorkorderDiagnosis(workorder, current)); setRetest({}); }}>切换正反转测试方向／线路状态</button>}
      <p className="mt-3 rounded-lg bg-cyan-950/70 p-3 text-sm text-cyan-100"><strong>练习提示：</strong>先读取各测点的样本数据；不能凭症状直接更换部件。测量或维修改变后，先前复测结论自动作废。</p>

      <section className="mt-4" aria-label="测量记录"><h5 className="font-bold">1. 测量计划与记录</h5><div className="mt-2 grid gap-2 lg:grid-cols-3">{workorder.measurementPlan.map((point) => <div key={point.id} className="rounded-lg border border-slate-700 p-3"><strong className="block text-sm">{point.label}</strong><span className="mt-1 block text-xs text-slate-400">{point.reference}</span><button type="button" disabled={!attempt.safetyConfirmed} className="mt-2 rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setAttempt((current) => recordWorkorderMeasurement(workorder, current, point.id, point.expectedValue))}>记录：{point.label} = {point.expectedValue} {point.unit}</button>{attempt.measurements[point.id] !== undefined && <output className="mt-2 block text-xs text-emerald-300">已记录：{attempt.measurements[point.id]} {point.unit}</output>}</div>)}</div></section>

      <section className="mt-4" aria-label="故障原因判定"><h5 className="font-bold">2. 原因判定</h5><div className="mt-2 flex flex-wrap gap-2">{workorder.causeOptions.map((cause) => <button key={cause.id} type="button" disabled={!measurementsComplete} className="rounded border border-slate-600 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setAttempt((current) => selectWorkorderCause(workorder, current, cause.id))}>{cause.label}</button>)}</div>{attempt.selectedCauseId && <p className={`mt-2 text-sm ${diagnosisReady ? 'text-emerald-300' : 'text-amber-200'}`}>{diagnosisReady ? '判定与测量记录一致，可选择维修。' : '该判定不能由现有测量记录支持，请回到回路逐点核对。'}</p>}</section>

      <section className="mt-4" aria-label="维修选择"><h5 className="font-bold">3. 维修选择</h5><div className="mt-2 flex flex-wrap gap-2">{workorder.repairOptions.map((repair) => <button key={repair.id} type="button" disabled={!diagnosisReady} className="rounded border border-slate-600 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setAttempt((current) => selectWorkorderRepair(workorder, current, repair.id))}>{repair.label}</button>)}</div>{attempt.repairId && <p className={`mt-2 text-sm ${repairReady ? 'text-emerald-300' : 'text-amber-200'}`}>{repairReady ? '维修选择已记录，进入功能复测。' : '维修措施与判定不匹配，不能提交复测。'}</p>}</section>

      <section className="mt-4" aria-label="功能复测"><h5 className="font-bold">4. 功能复测</h5><div className="mt-2 flex flex-wrap gap-3">{workorder.requiredRetest.map((key) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!retest[key]} disabled={!repairReady} onChange={(event) => setRetest((current) => ({ ...current, [key]: event.target.checked }))} />{RETEST_LABELS[key]}</label>)}</div><button type="button" disabled={!repairReady} className="mt-3 rounded bg-cyan-700 px-3 py-2 text-sm font-bold hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setAttempt((current) => verifyWorkorderRetest(workorder, current, retest))}>提交功能复测</button>{attempt.status === 'blocked' && <p className="mt-2 text-sm text-amber-200">复测项目尚未全部满足；维修后必须逐项完成验证。</p>}</section>
      <footer className="mt-4 border-t border-slate-700 pt-3 text-xs leading-5 text-slate-400"><p><strong>编制依据：</strong>{workorder.sourceNote}</p><p><strong>实体训练边界：</strong>{workorder.physicalTrainingBoundary}</p></footer>
    </article>
  </section>;
}
