'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';

export function BSceneFrame({
  title,
  stage,
  stageCount,
  instruction,
  counterexample,
  counterexampleOpen,
  onToggleCounterexample,
  canAdvance,
  onAdvance,
  children,
}: {
  title: string;
  stage: number;
  stageCount: number;
  instruction: string;
  counterexample: string;
  counterexampleOpen: boolean;
  onToggleCounterexample: () => void;
  canAdvance: boolean;
  onAdvance: () => void;
  children: ReactNode;
}) {
  const [recordedStage, setRecordedStage] = useState(-1);
  const stageRecorded = recordedStage === stage;
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-slate-900 p-4 text-white">
        <div>
          <p className="text-xs font-bold tracking-wider text-sky-300">实训工单 · 阶段 {stage + 1}/{stageCount}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-black">{title}</h2>
            <SpeechControls currentText={instruction} className="text-slate-300 hover:text-white hover:bg-slate-800" />
          </div>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-300">{instruction}</p>
        </div>
        <Button type="button" variant="outline" onClick={onToggleCounterexample} className="border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100">
          <AlertTriangle size={16} /> 查看反例
        </Button>
      </div>
      {counterexampleOpen && (
        <aside role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <strong className="flex items-center gap-2"><AlertTriangle size={18} /> 反例防呆提示</strong>
          <p className="mt-1">{counterexample}</p>
        </aside>
      )}
      {children}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={16} /> 数据由 MNA 直流求解器/分析工具实时计算</span>
        {canAdvance && !stageRecorded && <Button type="button" variant="outline" onClick={() => setRecordedStage(stage)} className="font-bold">确认已完成本阶段实测与数据记录</Button>}
        {canAdvance && counterexampleOpen && stageRecorded && <Button type="button" onClick={onAdvance} className="bg-emerald-600 font-bold hover:bg-emerald-700">{stage + 1 === stageCount ? '提交实训记录' : '记录数据，下一步'} <ArrowRight size={16} /></Button>}
        {canAdvance && (!counterexampleOpen || !stageRecorded) && <span className="text-xs font-bold text-amber-700">请完成实测记录，并打开阅读本关反例提示后再继续。</span>}
      </div>
    </section>
  );
}
