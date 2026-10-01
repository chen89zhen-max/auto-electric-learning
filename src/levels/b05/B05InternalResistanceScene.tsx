'use client';

import { useState } from 'react';
import { calculateFullCircuit } from '@/src/circuit/solver/DCAnalysisUtils';
import { BSceneFrame, type BSceneGuidance } from '@/src/levels/chapterB/BSceneFrame';

export function buildB05BatteryLoadCurve(emf: number, internalResistance: number) {
  const noLoad = calculateFullCircuit({ emf, internalResistance, loadResistance: 1e9 });
  const lightLoad = calculateFullCircuit({ emf, internalResistance, loadResistance: 5 });
  const heavyLoad = calculateFullCircuit({ emf, internalResistance, loadResistance: 0.2 });
  return {
    noLoad,
    lightLoad,
    heavyLoad,
    noLoadVoltageIsNotLoadHealthProof: noLoad.terminalVoltage > 12 && heavyLoad.terminalVoltage < 9,
  };
}

export function B05InternalResistanceScene({
  onComplete,
  onGuidanceChange,
}: {
  onComplete: (metrics: Record<string, unknown>) => void;
  onGuidanceChange?: (guidance: BSceneGuidance) => void;
}) {
  const [stage, setStage] = useState(0);
  const [counterexampleOpen, setCounterexampleOpen] = useState(false);
  const [internalResistance, setInternalResistance] = useState(0.4);
  const curve = buildB05BatteryLoadCurve(12.6, internalResistance);
  const instruction =
    stage === 0
      ? '先在近似空载状态读取蓄电池端电压。'
      : stage === 1
        ? '加上轻载与起动机重载，比较端电压与内阻压降。'
        : '据大电流时大灯昏暗的事实完成诊断。';
  const advance = () =>
    stage === 2
      ? onComplete({ internalResistance, ...curve, loadedDiagnosisCompleted: true })
      : setStage(stage + 1);

  return (
    <BSceneFrame
      title="蓄电池内阻与带载压降"
      stage={stage}
      stageCount={3}
      instruction={instruction}
      counterexample="空载读到 12V 以上只说明此时几乎没有电流。极板硫化等引起的内阻增大，会在起动机大电流下产生 I·r 压降，使端电压塌陷。"
      counterexampleOpen={counterexampleOpen}
      onToggleCounterexample={() => setCounterexampleOpen(!counterexampleOpen)}
      onGuidanceChange={onGuidanceChange}
      canAdvance
      onAdvance={advance}
    >
      <div className="grid gap-4 text-sm md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <label>
            内阻 r：{internalResistance.toFixed(2)}Ω
            <input
              className="ml-2 align-middle"
              type="range"
              min="0.05"
              max="0.4"
              step="0.05"
              value={internalResistance}
              onChange={(event) => setInternalResistance(Number(event.target.value))}
            />
          </label>
          <p className="mt-3">全电路：I = E/(R+r)，U端 = E−Ir</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
          空载：{curve.noLoad.terminalVoltage.toFixed(2)}V
          <br />
          轻载：{curve.lightLoad.terminalVoltage.toFixed(2)}V
          <br />
          <strong>起动重载：{curve.heavyLoad.terminalVoltage.toFixed(2)}V，内阻压降 {curve.heavyLoad.internalDrop.toFixed(2)}V</strong>
        </div>
      </div>
    </BSceneFrame>
  );
}
