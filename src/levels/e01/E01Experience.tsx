'use client';
import { getLevelDisplayName } from '@/src/courses/curriculum';
import { getNextLevelLabel } from '@/src/courses/curriculum';


import { LevelHeading } from '@/src/components/LevelHeading';

import React, { useState } from 'react';
import {
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LogOut,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { E01DiodeScene } from './E01DiodeScene';
import { E01_STAGE_CONTENT, type E01Step } from './e01Training';

interface E01ExperienceProps {
  onReturnLobby: () => void;
}

export function E01Experience({ onReturnLobby }: E01ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<E01Step>('DIODE_CONDUCTION_COGNITION');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = E01_STAGE_CONTENT[currentStep];

  const handleStepComplete = (step: E01Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
    if (step === 'ENGINEERING_REPAIR_AND_DELIVERY') {
      setIsCompleted(true);
    }
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'DIODE_CONDUCTION_COGNITION') {
      setCurrentStep('MULTIMETER_DIODE_TEST');
      setHintRequested(false);
    } else if (currentStep === 'MULTIMETER_DIODE_TEST') {
      setCurrentStep('ZENER_AND_LED_CALCULATION');
      setHintRequested(false);
    } else if (currentStep === 'ZENER_AND_LED_CALCULATION') {
      setCurrentStep('BLIND_DIODE_FAULT_DIAGNOSIS');
      setHintRequested(false);
    } else if (currentStep === 'BLIND_DIODE_FAULT_DIAGNOSIS') {
      setCurrentStep('ENGINEERING_REPAIR_AND_DELIVERY');
      setHintRequested(false);
    } else if (currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setCurrentStep('DIODE_CONDUCTION_COGNITION');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setAssessmentResult(null);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level03-shell e01-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-blue-600 shadow-blue-600/20 text-white">
            <Zap size={22} />
          </span>
          <LevelHeading levelId="E01" />
        </div>

        <div className="trainee-badge">
          <GraduationCap size={18} />
          <span>见习电工 · {getStudentDisplayName('见习学员')} ({isCompleted ? '已通过验收' : '实训推进中'})</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <FullscreenButton />
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
            onClick={onReturnLobby}
            title="退出当前实训并返回课程地图"
          >
            <LogOut size={15} />
            <span>返回课程大厅</span>
          </button>
        </div>
      </header>

      <section className={isCompleted ? 'workspace single' : 'workspace'} aria-label="E01 实训工作区">
        {isCompleted ? (
          <div className="scene-panel">
            <div className="scene-heading"><span className="status-dot bg-emerald-500 shadow-emerald-500/20" /><span>电子电路实训中心 · 二极管应用能力报告</span><span className="scene-meta">验收完成</span></div>
            <div className="scene-content"><AbilityReport levelId="E01" domainLabel="电子器件与信号" title="E01 二极管特性与 LED 限流应用实训报告" metrics={stepEvidences} assessment={assessmentResult ?? undefined} nextTask={getNextLevelLabel('E01')} onRestart={handleRestart} onReturn={onReturnLobby} /></div>
            <div className="objective-strip"><span>当前操作</span><strong>查看二极管特性与应用能力报告</strong><output className="feedback">已完成五阶段实训与验收。</output></div>
          </div>
        ) : (
          <>
            <div className="scene-panel">
              <div className="scene-heading"><span className="status-dot bg-blue-500 shadow-blue-500/20" /><span>电子电路实训工位 · 二极管及其应用</span><span className="scene-meta">5 阶段渐进实训</span></div>
              <div className="scene-content" key={sceneRevision}><E01DiodeScene currentStep={currentStep} onStepComplete={handleStepComplete} onAdvanceStep={handleAdvanceStep} hintRequested={hintRequested} onComplete={(result) => { setAssessmentResult(result); setIsCompleted(true); }} /></div>
              <div className="objective-strip"><span>当前操作</span><strong>{guidance.title}</strong><output className="feedback">{guidance.objective}</output></div>
            </div>
            <aside className="tutor-panel" aria-label="陈师傅实训指导">
              <div className="tutor-title flex items-center gap-3.5 pb-3 border-b border-slate-200"><MasterChenAvatar emotion={guidance.mentorEmotion} size={58} /><div><div className="flex items-center gap-1.5"><strong className="text-base font-bold text-slate-800">陈师傅</strong><span className="text-sm bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.5 rounded">带教技师</span></div><small className="text-sm text-slate-500 font-medium">汽车电子电路诊断专家</small></div></div>
              <div className="message-card relative my-4 p-4 rounded-xl border-l-4 border-blue-500 bg-blue-50/90 text-slate-800 shadow-xs" aria-live="polite"><div className="flex flex-col gap-2"><div className="flex items-center justify-end"><SpeechControls currentText={hintRequested ? guidance.hint : guidance.mentorPrompt} /></div><p className="text-sm font-semibold leading-relaxed m-0">{hintRequested ? guidance.hint : `“${guidance.mentorPrompt}”`}</p></div></div>
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-blue-950"><strong className="block text-sm tracking-wide text-blue-700">本步目标</strong><span className="mt-1 block leading-6">{guidance.objective}</span></div>
              <div className="tutor-context"><span>当前实训环节</span><strong>E01 · 二极管及其应用 · {guidance.title.split('：')[0]}</strong></div>
            </aside>
          </>
        )}
      </section>

      <nav className="bottom-bar" aria-label="E01 实训功能栏">
        <button type="button" className={showWorkOrder ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => setShowWorkOrder((open) => !open)}><ClipboardList size={19} /> 工单</button>
        <button type="button" className={hintRequested ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => setHintRequested(true)}><HelpCircle size={19} /> 请师傅提示</button>
        <span className="toolbar-spacer" /><span className="unlock-hint">实训要点：遵循二极管极性、万用表测试与限流计算规范 · 当前第 {Object.keys(stepEvidences).length + 1} / 5 阶段</span>
        <button type="button" onClick={handleRestart} className="cursor-pointer"><RotateCcw size={18} /> 重新开始</button>
      </nav>

      {/* Floating Work Order Modal */}
      {showWorkOrder && (
        <dialog open className="fixed inset-0 z-50 flex h-screen w-screen max-w-none items-center justify-center bg-slate-950/35 p-4" aria-label="E01 实训工单">
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                {getLevelDisplayName('E01')} · 实训工单
              </h3>
              <button aria-label="关闭工单" onClick={() => setShowWorkOrder(false)}
                className="text-slate-500 hover:text-slate-900 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="p-3 bg-blue-50 rounded-xl">
                <span className="font-bold text-blue-700">学习依据：</span>查看页头“教材与考纲”
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-800">当前实训指引:</span>
                <p className="text-slate-600">{guidance.objective}</p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-800">规范操作动作:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  {guidance.actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button aria-label="关闭工单" onClick={() => setShowWorkOrder(false)}
              className="primary-action w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold cursor-pointer"
            >
              已查阅，继续实训
            </button>
          </section>
        </dialog>
      )}
    </main>
  );
}
