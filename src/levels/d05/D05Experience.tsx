'use client';
import { getLevelDisplayName } from '@/src/courses/curriculum';
import { LevelHeading } from '@/src/components/LevelHeading';
import { getNextLevelLabel } from '@/src/courses/curriculum';

import React, { useState } from 'react';
import { ClipboardList, Cpu, GraduationCap, HelpCircle, LogOut, RotateCcw } from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { D05TransformerScene } from './D05TransformerScene';
import { D05_STAGE_CONTENT, type D05Step } from './d05Training';

interface D05ExperienceProps { onReturnLobby: () => void; }

export function D05Experience({ onReturnLobby }: D05ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<D05Step>('STRUCTURE_AND_MAGNETIC_FLUX');
  const [isCompleted, setIsCompleted] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);
  const guidance = D05_STAGE_CONTENT[currentStep];
  const handleStepComplete = (step: D05Step, evidence: Record<string, unknown>) => { setStepEvidences((prev) => ({ ...prev, [step]: evidence })); if (step === 'ONBOARD_INVERTER_STEP_UP_DELIVERY') setIsCompleted(true); };
  const handleAdvanceStep = () => {
    const next: Partial<Record<D05Step, D05Step>> = { STRUCTURE_AND_MAGNETIC_FLUX: 'VOLTAGE_AND_CURRENT_RATIO', VOLTAGE_AND_CURRENT_RATIO: 'DC_INPUT_DISASTER_COUNTEREXAMPLE', DC_INPUT_DISASTER_COUNTEREXAMPLE: 'POLARITY_AND_SAME_NAME_TERMINALS', POLARITY_AND_SAME_NAME_TERMINALS: 'ONBOARD_INVERTER_STEP_UP_DELIVERY' };
    if (next[currentStep]) { setCurrentStep(next[currentStep]); setHintRequested(false); } else setIsCompleted(true);
  };
  const handleRestart = () => { setIsCompleted(false); setAssessmentResult(null); setCurrentStep('STRUCTURE_AND_MAGNETIC_FLUX'); setStepEvidences({}); setHintRequested(false); setShowWorkOrder(false); setSceneRevision((value) => value + 1); };

  return <main className="app-shell level03-shell d05-shell">
    <header className="topbar"><div className="brand-lockup"><span className="brand-mark safety-mark bg-purple-600 shadow-purple-600/20 text-white"><Cpu size={22} /></span><LevelHeading levelId="D05" /></div><div className="trainee-badge"><GraduationCap size={18} className="text-purple-600" /><span>见习电工 · {getStudentDisplayName('见习学员')}（{isCompleted ? '已通过验收' : '实训推进中'}）</span></div><div className="flex items-center gap-2 ml-auto"><FullscreenButton /><button type="button" onClick={onReturnLobby} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs" title="退出当前实训并返回课程地图"><LogOut size={15} /><span>返回课程大厅</span></button></div></header>
    <section className={isCompleted ? 'workspace single' : 'workspace'} aria-label="D05 变压器实训工作区">
      {isCompleted ? <div className="scene-panel"><div className="scene-heading"><span className="status-dot bg-emerald-500 shadow-emerald-500/20" /><span>变压器与车载逆变实训台 · 竣工验收</span><span className="scene-meta">变压器能力报告</span></div><div className="scene-content"><AbilityReport levelId="D05" domainLabel="技能领域 · 变压器与车载逆变（课程拓展／重庆2027备考必学）" title="D05 变压器实验室变压器能力报告" metrics={stepEvidences} assessment={assessmentResult ?? undefined} nextTask={getNextLevelLabel('D05')} onRestart={handleRestart} onReturn={onReturnLobby} /></div><div className="objective-strip"><span>当前操作</span><strong>查看变压器能力报告</strong><output className="feedback">实训评测已通过，完成交变磁通、变比与车载逆变安全操作闭环。</output></div></div> : <>
        <div className="scene-panel"><div className="scene-heading"><span className="status-dot bg-purple-500 shadow-purple-500/20" /><span>变压器实验室 · 变压器与车载逆变升压实验台</span><span className="scene-meta">5阶段变压器实训</span></div><div className="scene-content" key={sceneRevision}><D05TransformerScene currentStep={currentStep} onStepComplete={handleStepComplete} onAdvanceStep={handleAdvanceStep} hintRequested={hintRequested} onComplete={(result) => { setAssessmentResult(result); setIsCompleted(true); }} /></div><div className="objective-strip"><span>当前操作</span><strong>{guidance.title}</strong><output className="feedback">{guidance.objective}</output></div></div>
        <aside className="tutor-panel" aria-label="陈师傅实训指导"><div className="tutor-title flex items-center gap-3.5 pb-3 border-b border-slate-200"><MasterChenAvatar emotion={guidance.mentorEmotion} size={58} /><div><div className="flex items-center gap-1.5"><strong className="text-base font-bold text-slate-800">陈师傅</strong><span className="text-sm bg-purple-100 text-purple-800 font-semibold px-1.5 py-0.5 rounded">带教技师</span></div><small className="text-sm text-slate-500 font-medium">车间高级电工技师</small></div></div><div className="message-card relative my-4 p-4 rounded-xl border-l-4 border-purple-500 bg-purple-50/90 text-slate-800 shadow-xs" aria-live="polite"><div className="flex flex-col gap-2"><div className="flex justify-end"><SpeechControls currentText={hintRequested ? guidance.hint : guidance.mentorPrompt} /></div><p className="text-sm font-semibold leading-relaxed m-0">{hintRequested ? guidance.hint : `“${guidance.mentorPrompt}”`}</p></div></div><div className="mt-5 rounded-xl border border-purple-100 bg-purple-50/60 p-3 text-sm text-purple-950"><strong className="block text-sm tracking-wide text-purple-700">本步目标</strong><span className="mt-1 block leading-6">{guidance.objective}</span></div><div className="tutor-context"><span>当前实训环节</span><strong>D05 · 变压器与车载逆变 · {guidance.title.split('：')[0]}</strong></div></aside>
      </>}
    </section>
    <nav className="bottom-bar" aria-label="D05 实训功能栏"><button type="button" title="查看实训工单与步骤指南" className={showWorkOrder ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => setShowWorkOrder((value) => !value)}><ClipboardList size={19} />工单</button><button type="button" className={hintRequested ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => { sounds.click(); setHintRequested(true); }}><HelpCircle size={19} />请师傅提示</button><span className="toolbar-spacer" /><span className="unlock-hint">实训要点：变压器依靠交变磁通持续感应；严禁在原边直接接入恒定直流，量程先于接线。</span><button type="button" onClick={handleRestart} className="cursor-pointer"><RotateCcw size={18} />重新开始</button></nav>
    {showWorkOrder && <dialog open className="fixed inset-0 z-50 flex h-screen w-screen max-w-none items-center justify-center bg-slate-950/35 p-4" aria-label="D05 实训任务书"><section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><p className="eyebrow text-purple-700">工单编号 · WO-D05-TRANSFORMER</p><h2 className="mt-1 text-xl font-black text-slate-900">{getLevelDisplayName('D05')} · 实训工单</h2><p className="mt-3 leading-7 text-slate-700">当前实训指引：{guidance.objective}</p><div className="mt-3 rounded-lg bg-purple-50 p-3 text-slate-800"><strong>规范操作动作：</strong><ul className="mt-2 list-disc space-y-1 pl-5">{guidance.actions.map((action, index) => <li key={index}>{action}</li>)}</ul></div><button type="button" className="primary-action mt-5 rounded-xl text-white cursor-pointer bg-purple-600 hover:bg-purple-700" onClick={() => setShowWorkOrder(false)}>已查阅，继续实训</button></section></dialog>}
  </main>;
}

