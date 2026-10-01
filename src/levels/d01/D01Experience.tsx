'use client';
import { getLevelDisplayName } from '@/src/courses/curriculum';
import { getNextLevelLabel } from '@/src/courses/curriculum';


import { LevelHeading } from '@/src/components/LevelHeading';

import React, { useState } from 'react';
import { ClipboardList, GraduationCap, HelpCircle, LogOut, RotateCcw, Zap } from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { D01RelayControlScene } from './D01RelayControlScene';
import { D01_STAGE_CONTENT, type D01Step } from './d01Training';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';

interface D01ExperienceProps { onReturnLobby: () => void; }

export function D01Experience({ onReturnLobby }: D01ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<D01Step>('COIL_CONTACT_ISOLATION');
  const [isCompleted, setIsCompleted] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);
  const guidance = D01_STAGE_CONTENT[currentStep];
  const handleStepComplete = (step: D01Step, evidence: Record<string, unknown>) => { setStepEvidences((prev) => ({ ...prev, [step]: evidence })); if (step === 'ENGINEERING_REPAIR_AND_DELIVERY') setIsCompleted(true); };
  const handleAdvanceStep = () => {
    const next: Partial<Record<D01Step, D01Step>> = { COIL_CONTACT_ISOLATION: 'MULTIMETER_PIN_IDENTIFICATION', MULTIMETER_PIN_IDENTIFICATION: 'RELAY_ENERGIZATION_AND_SWITCH', RELAY_ENERGIZATION_AND_SWITCH: 'BLIND_RELAY_FAULT_DIAGNOSIS', BLIND_RELAY_FAULT_DIAGNOSIS: 'ENGINEERING_REPAIR_AND_DELIVERY' };
    if (next[currentStep]) { setCurrentStep(next[currentStep]); setHintRequested(false); } else setIsCompleted(true);
  };
  const handleRestart = () => { setIsCompleted(false); setAssessmentResult(null); setCurrentStep('COIL_CONTACT_ISOLATION'); setStepEvidences({}); setHintRequested(false); setShowWorkOrder(false); setSceneRevision((value) => value + 1); };

  return <main className="app-shell level03-shell d01-shell">
    <header className="topbar"><div className="brand-lockup"><span className="brand-mark safety-mark bg-amber-600 shadow-amber-600/20 text-white"><Zap size={22} /></span><LevelHeading levelId="D01" /></div><div className="trainee-badge"><GraduationCap size={18} className="text-amber-600" /><span>见习电工 · {getStudentDisplayName('见习学员')}（{isCompleted ? '已通过验收' : '实训推进中'}）</span></div><div className="flex items-center gap-2 ml-auto"><FullscreenButton /><button type="button" onClick={onReturnLobby} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs" title="退出当前实训并返回课程地图"><LogOut size={15} /><span>返回课程大厅</span></button></div></header>
    <section className={isCompleted ? 'workspace single' : 'workspace'} aria-label="D01 汽车继电器实训工作区">
      {isCompleted ? <div className="scene-panel"><div className="scene-heading"><span className="status-dot bg-emerald-500 shadow-emerald-500/20" /><span>继电器驱动控制实训台 · 竣工验收</span><span className="scene-meta">能力报告</span></div><div className="scene-content"><AbilityReport levelId="D01" domainLabel="技能领域 · 继电器与电磁控制" title="D01 小开关控制工作灯能力报告" assessment={assessmentResult ?? undefined} metrics={stepEvidences} nextTask={getNextLevelLabel('D01')} onRestart={handleRestart} onReturn={onReturnLobby} /></div><div className="objective-strip"><span>当前操作</span><strong>查看继电器与电磁控制能力报告</strong><output className="feedback">实训评测已通过，已完成引脚辨识、带载测试和工程修复交付闭环。</output></div></div> : <>
        <div className="scene-panel"><div className="scene-heading"><span className="status-dot bg-amber-500 shadow-amber-500/20" /><span>继电器实训工位 · 工作灯驱动控制实验台</span><span className="scene-meta">5阶段递进实训</span></div><div className="scene-content" key={sceneRevision}><D01RelayControlScene currentStep={currentStep} onStepComplete={handleStepComplete} onAdvanceStep={handleAdvanceStep} hintRequested={hintRequested} onComplete={(result) => { setAssessmentResult(result); setIsCompleted(true); }} /></div><div className="objective-strip"><span>当前操作</span><strong>{guidance.title}</strong><output className="feedback">{guidance.objective}</output></div></div>
        <aside className="tutor-panel" aria-label="陈师傅实训指导"><div className="tutor-title flex items-center gap-3.5 pb-3 border-b border-slate-200"><MasterChenAvatar emotion={guidance.mentorEmotion} size={58} /><div><div className="flex items-center gap-1.5"><strong className="text-base font-bold text-slate-800">陈师傅</strong><span className="text-sm bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">带教技师</span></div><small className="text-sm text-slate-500 font-medium">车间高级电工技师</small></div></div><div className="message-card relative my-4 p-4 rounded-xl border-l-4 border-amber-500 bg-amber-50/90 text-slate-800 shadow-xs" aria-live="polite"><div className="flex flex-col gap-2"><div className="flex justify-end"><SpeechControls currentText={hintRequested ? guidance.hint : guidance.mentorPrompt} /></div><p className="text-sm font-semibold leading-relaxed m-0">{hintRequested ? guidance.hint : `“${guidance.mentorPrompt}”`}</p></div></div><div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-sm text-amber-950"><strong className="block text-sm tracking-wide text-amber-700">本步目标</strong><span className="mt-1 block leading-6">{guidance.objective}</span></div><div className="tutor-context"><span>当前实训环节</span><strong>D01 · 继电器与电磁控制 · {guidance.title.split('：')[0]}</strong></div></aside>
      </>}
    </section>
    <nav className="bottom-bar" aria-label="D01 实训功能栏"><button type="button" title="查看实训工单与步骤指南" className={showWorkOrder ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => setShowWorkOrder((value) => !value)}><ClipboardList size={19} />工单</button><button type="button" className={hintRequested ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => { sounds.click(); setHintRequested(true); }}><HelpCircle size={19} />请师傅提示</button><span className="toolbar-spacer" /><span className="unlock-hint">实训要点：线圈与触点回路分离辨识；先断电测电阻，带载测压降。</span><button type="button" onClick={handleRestart} className="cursor-pointer"><RotateCcw size={18} />重新开始</button></nav>
    {showWorkOrder && <dialog open className="fixed inset-0 z-50 flex h-screen w-screen max-w-none items-center justify-center bg-slate-950/35 p-4" aria-label="D01 实训任务书"><section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><p className="eyebrow text-amber-700">工单编号 · WO-D01-RELAY</p><h2 className="mt-1 text-xl font-black text-slate-900">{getLevelDisplayName('D01')} · 实训工单</h2><p className="mt-3 leading-7 text-slate-700">当前实训指引：{guidance.objective}</p><div className="mt-3 rounded-lg bg-amber-50 p-3 text-slate-800"><strong>规范操作动作：</strong><ul className="mt-2 list-disc space-y-1 pl-5">{guidance.actions.map((action, index) => <li key={index}>{action}</li>)}</ul></div><button type="button" className="primary-action mt-5 rounded-xl text-white cursor-pointer bg-amber-600 hover:bg-amber-700" onClick={() => setShowWorkOrder(false)}>已查阅，继续实训</button></section></dialog>}
  </main>;
}
