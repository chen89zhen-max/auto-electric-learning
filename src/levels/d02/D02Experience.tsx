'use client';
import { getLevelDisplayName } from '@/src/courses/curriculum';
import { getNextLevelLabel } from '@/src/courses/curriculum';


import { LevelHeading } from '@/src/components/LevelHeading';

import React, { useState } from 'react';
import { ClipboardList, GraduationCap, HelpCircle, LogOut, RotateCcw, RotateCw } from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { D02DcMotorScene } from './D02DcMotorScene';
import { D02_STAGE_CONTENT, type D02Step } from './d02Training';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';

interface D02ExperienceProps { onReturnLobby: () => void; }

export function D02Experience({ onReturnLobby }: D02ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<D02Step>('LORENTZ_FORCE_AND_LEFT_HAND_RULE');
  const [isCompleted, setIsCompleted] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);
  const guidance = D02_STAGE_CONTENT[currentStep];

  const handleStepComplete = (step: D02Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({ ...prev, [step]: evidence }));
    if (step === 'ENGINEERING_REPAIR_AND_COMMISSIONING') setIsCompleted(true);
  };
  const handleAdvanceStep = () => {
    const next: Partial<Record<D02Step, D02Step>> = {
      LORENTZ_FORCE_AND_LEFT_HAND_RULE: 'COMMUTATOR_AND_CONTINUOUS_ROTATION',
      COMMUTATOR_AND_CONTINUOUS_ROTATION: 'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL',
      H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL: 'BLIND_DC_MOTOR_FAULT_ISOLATION',
      BLIND_DC_MOTOR_FAULT_ISOLATION: 'ENGINEERING_REPAIR_AND_COMMISSIONING',
    };
    if (next[currentStep]) { setCurrentStep(next[currentStep]); setHintRequested(false); } else setIsCompleted(true);
  };
  const handleRestart = () => {
    setIsCompleted(false); setAssessmentResult(null); setCurrentStep('LORENTZ_FORCE_AND_LEFT_HAND_RULE');
    setStepEvidences({}); setHintRequested(false); setShowWorkOrder(false); setSceneRevision((value) => value + 1);
  };

  return <main className="app-shell level03-shell d02-shell">
    <header className="topbar">
      <div className="brand-lockup">
        <span className="brand-mark safety-mark bg-sky-600 shadow-sky-600/20 text-white"><RotateCw size={22} /></span>
        <LevelHeading levelId="D02" />
      </div>
      <div className="trainee-badge"><GraduationCap size={18} className="text-sky-600" /><span>见习电工 · {getStudentDisplayName('见习学员')}（{isCompleted ? '已通过验收' : '实训推进中'}）</span></div>
      <div className="flex items-center gap-2 ml-auto"><FullscreenButton /><button type="button" onClick={onReturnLobby} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs" title="退出当前实训并返回课程地图"><LogOut size={15} /><span>返回课程大厅</span></button></div>
    </header>
    <section className={isCompleted ? 'workspace single' : 'workspace'} aria-label="D02 直流电动机实训工作区">
      {isCompleted ? <div className="scene-panel"><div className="scene-heading"><span className="status-dot bg-emerald-500 shadow-emerald-500/20" /><span>直流电机综合实训台 · 竣工验收</span><span className="scene-meta">能力报告</span></div><div className="scene-content"><AbilityReport levelId="D02" domainLabel="技能领域 · 直流电动机与H桥控制" title="D02 让电机转起来能力报告" metrics={stepEvidences} assessment={assessmentResult ?? undefined} nextTask={getNextLevelLabel('D02')} onRestart={handleRestart} onReturn={onReturnLobby} /></div><div className="objective-strip"><span>当前操作</span><strong>查看直流电动机与 H 桥控制能力报告</strong><output className="feedback">实训评测已通过，完成了电机原理、正反转控制与故障隔离闭环。</output></div></div> : <>
        <div className="scene-panel"><div className="scene-heading"><span className="status-dot bg-sky-500 shadow-sky-500/20" /><span>电机实训工位 · 直流电动机与 H 桥控制台</span><span className="scene-meta">5阶段递进实训</span></div><div className="scene-content" key={sceneRevision}><D02DcMotorScene currentStep={currentStep} onStepComplete={handleStepComplete} onAdvanceStep={handleAdvanceStep} hintRequested={hintRequested} onComplete={(result) => { setAssessmentResult(result); setIsCompleted(true); }} /></div><div className="objective-strip"><span>当前操作</span><strong>{guidance.title}</strong><output className="feedback">{guidance.objective}</output></div></div>
        <aside className="tutor-panel" aria-label="陈师傅实训指导"><div className="tutor-title flex items-center gap-3.5 pb-3 border-b border-slate-200"><MasterChenAvatar emotion={guidance.mentorEmotion} size={58} /><div><div className="flex items-center gap-1.5"><strong className="text-base font-bold text-slate-800">陈师傅</strong><span className="text-sm bg-sky-100 text-sky-800 font-semibold px-1.5 py-0.5 rounded">带教技师</span></div><small className="text-sm text-slate-500 font-medium">车间高级电工技师</small></div></div><div className="message-card relative my-4 p-4 rounded-xl border-l-4 border-sky-500 bg-sky-50/90 text-slate-800 shadow-xs" aria-live="polite"><div className="flex flex-col gap-2"><div className="flex justify-end"><SpeechControls currentText={hintRequested ? guidance.hint : guidance.mentorPrompt} /></div><p className="text-sm font-semibold leading-relaxed m-0">{hintRequested ? guidance.hint : `“${guidance.mentorPrompt}”`}</p></div></div><div className="mt-5 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-sm text-sky-950"><strong className="block text-sm tracking-wide text-sky-700">本步目标</strong><span className="mt-1 block leading-6">{guidance.objective}</span></div><div className="tutor-context"><span>当前实训环节</span><strong>D02 · 直流电动机 · {guidance.title.split('：')[0]}</strong></div></aside>
      </>}
    </section>
    <nav className="bottom-bar" aria-label="D02 实训功能栏"><button type="button" className={showWorkOrder ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => setShowWorkOrder((value) => !value)}><ClipboardList size={19} />工单</button><button type="button" className={hintRequested ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => { sounds.click(); setHintRequested(true); }}><HelpCircle size={19} />请师傅提示</button><span className="toolbar-spacer" /><span className="unlock-hint">实训要点：先辨明电机受力与换向，再用正确量程完成供电、内阻和带载电流验证。</span><button type="button" onClick={handleRestart} className="cursor-pointer"><RotateCcw size={18} />重新开始</button></nav>
    {showWorkOrder && <dialog open className="fixed inset-0 z-50 flex h-screen w-screen max-w-none items-center justify-center bg-slate-950/35 p-4" aria-label="D02 实训工单"><section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><p className="eyebrow text-sky-700">工单编号 · WO-D02-MOTOR</p><h2 className="mt-1 text-xl font-black text-slate-900">{getLevelDisplayName('D02')} · 实训工单</h2><p className="mt-3 leading-7 text-slate-700">依次完成左手定则、换向连续转动、继电器 H 桥正反转、盲测故障隔离及工程修复。测量前必须确认电路状态与万用表量程，禁止带电测电阻。</p><p className="mt-3 rounded-lg bg-sky-50 p-3 text-base font-bold text-sky-900">当前任务：{guidance.title}</p><button type="button" className="primary-action mt-5 rounded-xl text-white cursor-pointer bg-sky-600 hover:bg-sky-700" onClick={() => setShowWorkOrder(false)}>返回实训工位</button></section></dialog>}
  </main>;
}
