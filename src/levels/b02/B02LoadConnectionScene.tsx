'use client';

import { useState } from 'react';
import { DCSolver } from '@/src/circuit/solver/DCSolver';
import { BSceneFrame } from '@/src/levels/chapterB/BSceneFrame';

function solveLampCircuit(voltage: number, lampResistance: number, connection: 'series' | 'parallel') {
  const solver = new DCSolver('0'); solver.addVoltageSource({ id: 'BATTERY', nodePos: 'P', nodeNeg: '0', voltage });
  if (connection === 'series') { solver.addResistor({ id: 'L1', nodeA: 'P', nodeB: 'M', resistance: lampResistance }); solver.addResistor({ id: 'L2', nodeA: 'M', nodeB: '0', resistance: lampResistance }); }
  else { solver.addResistor({ id: 'L1', nodeA: 'P', nodeB: '0', resistance: lampResistance }); solver.addResistor({ id: 'L2', nodeA: 'P', nodeB: '0', resistance: lampResistance }); }
  return solver.solve();
}
export function compareB02LampConnections(voltage: number, lampOneResistance: number, lampTwoResistance: number) {
  const series = solveLampCircuit(voltage, lampOneResistance, 'series'); const parallel = solveLampCircuit(voltage, lampTwoResistance, 'parallel');
  return { series: { lampVoltage: series.branchVoltages.get('L1') ?? 0, totalCurrent: series.branchCurrents.get('BATTERY') ?? 0 }, parallel: { lampVoltage: parallel.branchVoltages.get('L1') ?? 0, totalCurrent: parallel.branchCurrents.get('BATTERY') ?? 0, removingOneLampKeepsOtherOn: true } };
}
export function B02LoadConnectionScene({ onComplete }: { onComplete: (metrics: Record<string, unknown>) => void }) {
  const [stage, setStage] = useState(0); const [parallel, setParallel] = useState(false); const [counterexampleOpen, setCounterexampleOpen] = useState(false); const result = compareB02LampConnections(12, 6, 6);
  const advance = () => stage === 2 ? onComplete({ connection: parallel ? 'parallel' : 'series', series: result.series, parallel: result.parallel, nodeBasedJudgementConfirmed: true }) : setStage(stage + 1);
  return <BSceneFrame title="双路车灯改装" stage={stage} stageCount={3} instruction={stage === 0 ? '先接成串联，观察两个 6Ω 灯如何分走 12V。' : stage === 1 ? '按相同两个节点改接并联，验证每盏灯获得额定电压且独立工作。' : '比较等效电阻与总电流，完成改装验收。'} counterexample="串、并联由元件两端连接的电气节点决定，不由“排成一排”还是“画成两层”决定。并联新增支路会降低等效电阻并增大总电流。" counterexampleOpen={counterexampleOpen} onToggleCounterexample={() => setCounterexampleOpen(!counterexampleOpen)} canAdvance={stage !== 1 || parallel} onAdvance={advance}>
    <div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="font-bold">接线操作</p><button type="button" onClick={() => setParallel(false)} className={`mt-3 mr-2 rounded px-3 py-2 text-sm ${!parallel ? 'bg-amber-500 text-white' : 'bg-white border'}`}>串联：P→灯1→灯2→0</button><button type="button" onClick={() => setParallel(true)} className={`mt-3 rounded px-3 py-2 text-sm ${parallel ? 'bg-emerald-600 text-white' : 'bg-white border'}`}>并联：两灯均接 P/0</button></div><div className="rounded-xl border border-sky-200 p-4 text-sm"><p>串联：单灯 {result.series.lampVoltage.toFixed(1)}V，总电流 {result.series.totalCurrent.toFixed(1)}A（任一灯拧下，全回路断开）</p><p className="mt-2">并联：单灯 {result.parallel.lampVoltage.toFixed(1)}V，总电流 {result.parallel.totalCurrent.toFixed(1)}A（拆一盏，另一盏仍亮）</p></div></div>
  </BSceneFrame>;
}
