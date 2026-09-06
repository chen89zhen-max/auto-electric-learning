'use client';

import type { ComponentType } from 'react';
import { useState } from 'react';
import { Award, FileSpreadsheet, GraduationCap, LogOut, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompletionStatus } from '@/src/components/CompletionStatus';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { getStudentDisplayName } from '@/src/stores/authStore';
import type { EvidenceDimensionId, EvidenceStatus, PracticeMode } from '@/src/types/evidence';

type SceneProps = { onComplete: (metrics: Record<string, unknown>) => void };

export function ChapterBExperience({
  levelId,
  title,
  subtitle,
  workOrder,
  nextTask,
  evidenceDimensions,
  Scene,
  onReturnLobby,
}: {
  levelId: string;
  title: string;
  subtitle: string;
  workOrder: string;
  nextTask: string;
  evidenceDimensions: EvidenceDimensionId[];
  Scene: ComponentType<SceneProps>;
  onReturnLobby: () => void;
}) {
  const [completed, setCompleted] = useState(false);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('guided');
  const [metrics, setMetrics] = useState<Record<string, unknown>>({});
  const evidenceStatus: EvidenceStatus = practiceMode === 'transfer' ? 'TRANSFER_COMPLETE' : practiceMode === 'independent' ? 'INDEPENDENT_COMPLETE' : 'GUIDED_COMPLETE';
  const evidence = Object.fromEntries(evidenceDimensions.map((dimension) => [dimension, evidenceStatus])) as Partial<Record<EvidenceDimensionId, EvidenceStatus>>;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3"><span className="rounded-lg bg-sky-600 p-2 text-white"><Zap size={22} /></span><div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">篇章二：让电路按要求工作 · {levelId}</p><h1 className="text-base font-black">{title}——{subtitle}</h1></div></div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800"><GraduationCap className="inline" size={15} /> 见习学员 · {getStudentDisplayName('见习学员')}</div>
          <div className="flex rounded-lg bg-slate-200 p-0.5 text-xs font-bold">{(['guided', 'independent', 'transfer'] as PracticeMode[]).map((mode) => <button type="button" key={mode} onClick={() => setPracticeMode(mode)} className={`rounded-md px-2.5 py-1 ${practiceMode === mode ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'}`}>{mode === 'guided' ? '跟练' : mode === 'independent' ? '独立' : '迁移'}</button>)}</div>
          <FullscreenButton /><Button type="button" variant="outline" onClick={onReturnLobby}><LogOut size={16} /> 返回大厅</Button>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
        {completed ? <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm"><span className="rounded-full bg-emerald-100 p-4 text-emerald-600"><Award size={48} /></span><h2 className="text-xl font-black">{levelId} 实训能力报告</h2><p className="text-sm text-slate-600">工单关键数据和反例辨析已保存。本次记录与既有首次、最佳记录独立保留。</p><CompletionStatus levelId={levelId} metrics={metrics} evidence={evidence} mode={practiceMode} nextTask={nextTask} /><Button type="button" onClick={onReturnLobby} className="bg-sky-600 font-bold hover:bg-sky-700">返回课程大厅</Button></section> : <Scene onComplete={(nextMetrics) => { setMetrics(nextMetrics); setCompleted(true); }} />}
      </div>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 bg-white px-6 py-3 text-xs text-slate-500"><span><FileSpreadsheet className="mr-1 inline text-sky-600" size={15} /> 工单编号：{workOrder}</span><span>真实求解：MNA DC Solver · 数据解释与设计实训</span></footer>
    </main>
  );
}
