'use client';
import { getLevelDisplayName } from '@/src/courses/curriculum';
import { getNextLevelLabel } from '@/src/courses/curriculum';


import { LevelHeading } from '@/src/components/LevelHeading';

import React, { useState } from 'react';
import { Activity, ClipboardList, GraduationCap, HelpCircle, LogOut, RotateCcw } from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { D03AlternatorScene } from './D03AlternatorScene';
import { D03_STAGE_CONTENT, type D03Step } from './d03Training';

interface D03ExperienceProps { onReturnLobby: () => void; }

export function D03Experience({ onReturnLobby }: D03ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<D03Step>('FARADAY_INDUCTION_AND_RIGHT_HAND_RULE');
  const [isCompleted, setIsCompleted] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);
  const guidance = D03_STAGE_CONTENT[currentStep];
  const handleStepComplete = (step: D03Step, evidence: Record<string, unknown>) => { setStepEvidences((prev) => ({ ...prev, [step]: evidence })); if (step === 'ENGINEERING_REPAIR_AND_CHARGING_ACCEPTANCE') setIsCompleted(true); };
  const handleAdvanceStep = () => {
    const next: Partial<Record<D03Step, D03Step>> = { FARADAY_INDUCTION_AND_RIGHT_HAND_RULE: 'SINE_AC_WAVEFORM_AND_THREE_ELEMENTS', SINE_AC_WAVEFORM_AND_THREE_ELEMENTS: 'SPEED_CHARACTERISTIC_AND_ROTATION', SPEED_CHARACTERISTIC_AND_ROTATION: 'BLIND_ALTERNATOR_FAULT_DIAGNOSIS', BLIND_ALTERNATOR_FAULT_DIAGNOSIS: 'ENGINEERING_REPAIR_AND_CHARGING_ACCEPTANCE' };
    if (next[currentStep]) { setCurrentStep(next[currentStep]); setHintRequested(false); } else setIsCompleted(true);
  };
  const handleRestart = () => { setIsCompleted(false); setAssessmentResult(null); setCurrentStep('FARADAY_INDUCTION_AND_RIGHT_HAND_RULE'); setStepEvidences({}); setHintRequested(false); setShowWorkOrder(false); setSceneRevision((value) => value + 1); };

  return <main className="app-shell level03-shell d03-shell">
    <header className="topbar"><div className="brand-lockup"><span className="brand-mark safety-mark bg-teal-600 shadow-teal-600/20 text-white"><Activity size={22} /></span><LevelHeading levelId="D03" /></div><div className="trainee-badge"><GraduationCap size={18} className="text-teal-600" /><span>见习电工 · {getStudentDisplayName('见习学员')}（{isCompleted ? '已通过验收' : '实训推进中'}）</span></div><div className="flex items-center gap-2 ml-auto"><FullscreenButton /><button type="button" onClick={onReturnLobby} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs" title="退出当前实训并返回课程地图"><LogOut size={15} /><span>返回课程大厅</span></button></div></header>
    <section className={isCompleted ? 'workspace single' : 'workspace'} aria-label="D03 交流发电机实训工作区">
      {isCompleted ? <div className="scene-panel"><div className="scene-heading"><span className="status-dot bg-emerald-500 shadow-emerald-500/20" /><span>交流发电机实训台 · 竣工验收</span><span className="scene-meta">能力报告</span></div><div className="scene-content"><AbilityReport levelId="D03" domainLabel="技能领域 · 电磁感应与交流发电机" title="D03 转动为什么能发电能力报告" metrics={stepEvidences} assessment={assessmentResult ?? undefined} nextTask={getNextLevelLabel('D03')} onRestart={handleRestart} onReturn={onReturnLobby} /></div><div className="objective-strip"><span>当前操作</span><strong>查看电磁感应与交流发电机能力报告</strong><output className="feedback">实训评测已通过，已完成感应规律、交流波形与发电机故障诊断闭环。</output></div></div> : <>
        <div className="scene-panel"><div className="scene-heading"><span className="status-dot bg-teal-500 shadow-teal-500/20" /><span>发电实训工位 · 电磁感应与交流发电机实验台</span><span className="scene-meta">5阶段递进实训</span></div><div className="scene-content" key={sceneRevision}><D03AlternatorScene currentStep={currentStep} onStepComplete={handleStepComplete} onAdvanceStep={handleAdvanceStep} hintRequested={hintRequested} onComplete={(result) => { setAssessmentResult(result); setIsCompleted(true); }} /></div><div className="objective-strip"><span>当前操作</span><strong>{guidance.title}</strong><output className="feedback">{guidance.objective}</output></div></div>
        <aside className="tutor-panel" aria-label="陈师傅实训指导"><div className="tutor-title flex items-center gap-3.5 pb-3 border-b border-slate-200"><MasterChenAvatar emotion={guidance.mentorEmotion} size={58} /><div><div className="flex items-center gap-1.5"><strong className="text-base font-bold text-slate-800">陈师傅</strong><span className="text-sm bg-teal-100 text-teal-800 font-semibold px-1.5 py-0.5 rounded">带教技师</span></div><small className="text-sm text-slate-500 font-medium">车间高级电工技师</small></div></div><div className="message-card relative my-4 p-4 rounded-xl border-l-4 border-teal-500 bg-teal-50/90 text-slate-800 shadow-xs" aria-live="polite"><div className="flex flex-col gap-2"><div className="flex justify-end"><SpeechControls currentText={hintRequested ? guidance.hint : guidance.mentorPrompt} /></div><p className="text-sm font-semibold leading-relaxed m-0">{hintRequested ? guidance.hint : `“${guidance.mentorPrompt}”`}</p></div></div><div className="mt-5 rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-sm text-teal-950"><strong className="block text-sm tracking-wide text-teal-700">本步目标</strong><span className="mt-1 block leading-6">{guidance.objective}</span></div><div className="tutor-context"><span>当前实训环节</span><strong>D03 · 电磁感应与交流发电机 · {guidance.title.split('：')[0]}</strong></div></aside>
      </>}
    </section>
    <nav className="bottom-bar" aria-label="D03 实训功能栏"><button type="button" className={showWorkOrder ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => setShowWorkOrder((value) => !value)}><ClipboardList size={19} />工单</button><button type="button" className={hintRequested ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => { sounds.click(); setHintRequested(true); }}><HelpCircle size={19} />请师傅提示</button><span className="toolbar-spacer" /><span className="unlock-hint">实训要点：按回路状态选择直流、交流或电阻量程，观察并记录真实测量证据。</span><button type="button" onClick={handleRestart} className="cursor-pointer"><RotateCcw size={18} />重新开始</button></nav>
    {showWorkOrder && <dialog open className="fixed inset-0 z-50 flex h-screen w-screen max-w-none items-center justify-center bg-slate-950/35 p-4" aria-label="D03 实训工单"><section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><p className="eyebrow text-teal-700">工单编号 · WO-D03-ALTERNATOR</p><h2 className="mt-1 text-xl font-black text-slate-900">{getLevelDisplayName('D03')} · 实训工单</h2><p className="mt-3 leading-7 text-slate-700">依次验证电磁感应方向、正弦交流三要素和转速特性，再对未知充电故障完成供电、转子与定子证据链诊断，最后进行修复验收。</p><p className="mt-3 rounded-lg bg-teal-50 p-3 text-base font-bold text-teal-900">当前任务：{guidance.title}</p><button type="button" className="primary-action mt-5 rounded-xl text-white cursor-pointer bg-teal-600 hover:bg-teal-700" onClick={() => setShowWorkOrder(false)}>返回实训工位</button></section></dialog>}
  </main>;
}
