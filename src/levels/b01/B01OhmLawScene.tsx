'use client';

import { useMemo, useState } from 'react';
import { DCSolver } from '@/src/circuit/solver/DCSolver';
import { calculateOhmsLaw } from '@/src/circuit/solver/DCAnalysisUtils';
import { BSceneFrame } from '@/src/levels/chapterB/BSceneFrame';

export function buildB01OhmLawReadings(sourceVoltage: number, fixedResistance: number, measuredUnknownCurrent: number) {
  const fixedResistanceRows = [3, 6, 9, 12].map((voltage) => {
    const solver = new DCSolver('0');
    solver.addVoltageSource({ id: 'SOURCE', nodePos: '1', nodeNeg: '0', voltage });
    solver.addResistor({ id: 'R_FIXED', nodeA: '1', nodeB: '0', resistance: fixedResistance });
    const solved = solver.solve();
    return { voltage, resistance: fixedResistance, current: solved.branchCurrents.get('R_FIXED') ?? 0 };
  });
  const fixedVoltage = [2, 4, 6, 8].map((resistance) => ({ ...calculateOhmsLaw({ voltage: sourceVoltage, resistance }) }));
  return { fixedResistance: fixedResistanceRows, fixedVoltage, unknownResistance: calculateOhmsLaw({ voltage: sourceVoltage, current: measuredUnknownCurrent }).resistance };
}

export function B01OhmLawScene({ onComplete }: { onComplete: (metrics: Record<string, unknown>) => void }) {
  const [stage, setStage] = useState(0); const [counterexampleOpen, setCounterexampleOpen] = useState(false); const [voltage, setVoltage] = useState(12); const [recorded, setRecorded] = useState([false, false, false]);
  const readings = useMemo(() => buildB01OhmLawReadings(voltage, 6, 3), [voltage]);
  const advance = () => stage === 2 ? onComplete({ uiCurve: readings.fixedResistance, inverseResistanceCurrent: readings.fixedVoltage, predictedUnknownResistance: readings.unknownResistance, controlledVariablesConfirmed: true, counterexampleReviewed: counterexampleOpen }) : setStage(stage + 1);
  return <BSceneFrame title="欧姆定律控制变量实验" stage={stage} stageCount={3} instruction={stage === 0 ? '固定 6Ω 电阻，只改变电源电压，记录电流并观察 U-I 直线。' : stage === 1 ? '固定电压，逐次更换电阻，观察电流的反比变化。' : '用实测 12V、3A 数据预测未知电阻，并与仪器结果核对。'} counterexample="电阻是元件本身在给定条件下的物理属性。若同时改变电压和电阻，不能得出“电阻随电压增大而增大”的结论；先控制变量，才谈规律。" counterexampleOpen={counterexampleOpen} onToggleCounterexample={() => setCounterexampleOpen(!counterexampleOpen)} canAdvance={recorded[stage]} onAdvance={advance}>
    <div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><label className="text-sm font-bold">实验电压：{voltage} V<input className="ml-3 align-middle" type="range" min="3" max="12" step="3" value={voltage} onChange={(event) => setVoltage(Number(event.target.value))} /></label><p className="mt-3 text-sm">未知电阻实测：12.0 V ÷ 3.0 A = <strong>{readings.unknownResistance.toFixed(1)} Ω</strong></p><button type="button" onClick={() => setRecorded((old) => old.map((value, index) => index === stage ? true : value))} className="mt-3 rounded bg-sky-600 px-3 py-2 text-sm font-bold text-white">{stage === 0 ? '记录 U-I 四组实测值' : stage === 1 ? '确认固定电压、只更换电阻' : '提交 4Ω 预测结果'}</button></div><div className="rounded-xl border border-sky-200 p-4 text-sm"><strong>{stage === 0 ? 'U-I 数据表（R = 6Ω）' : stage === 1 ? 'I-R 数据表（U = 固定）' : '预测核验'}</strong><ul className="mt-2 space-y-1">{(stage === 0 ? readings.fixedResistance.map((row) => `${row.voltage}V → ${row.current.toFixed(2)}A`) : stage === 1 ? readings.fixedVoltage.map((row) => `${row.resistance}Ω → ${row.current.toFixed(2)}A`) : [`预测：${readings.unknownResistance.toFixed(1)}Ω`, '实物标称：4.0Ω，预测吻合']).map((item) => <li key={item}>{item}</li>)}</ul></div></div>
  </BSceneFrame>;
}
