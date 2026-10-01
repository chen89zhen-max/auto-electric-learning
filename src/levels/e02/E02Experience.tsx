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
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { E02CapacitorScene } from './E02CapacitorScene';
import { E02_STAGE_CONTENT, type E02Step } from './e02Training';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';

interface E02ExperienceProps {
  onReturnLobby: () => void;
}

export function E02Experience({ onReturnLobby }: E02ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<E02Step>('CAPACITOR_STORAGE_COGNITION');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = E02_STAGE_CONTENT[currentStep];



  const handleStepComplete = (step: E02Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
    if (step === 'ENGINEERING_REPAIR_AND_DELIVERY') {
      setIsCompleted(true);
    }
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'CAPACITOR_STORAGE_COGNITION') {
      setCurrentStep('MULTIMETER_CAPACITANCE_TEST');
      setHintRequested(false);
    } else if (currentStep === 'MULTIMETER_CAPACITANCE_TEST') {
      setCurrentStep('RC_TIME_CONSTANT_CURVE');
      setHintRequested(false);
    } else if (currentStep === 'RC_TIME_CONSTANT_CURVE') {
      setCurrentStep('BLIND_CAPACITOR_FAULT_DIAGNOSIS');
      setHintRequested(false);
    } else if (currentStep === 'BLIND_CAPACITOR_FAULT_DIAGNOSIS') {
      setCurrentStep('ENGINEERING_REPAIR_AND_DELIVERY');
      setHintRequested(false);
    } else if (currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setAssessmentResult(null);
    setCurrentStep('CAPACITOR_STORAGE_COGNITION');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level03-shell e02-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-blue-600 shadow-blue-600/20 text-white">
            <Zap size={22} />
          </span>
          <LevelHeading levelId="E02" />
        </div>

        <div className="trainee-badge">
          <GraduationCap size={18} />
          <span>见习电工 · {getStudentDisplayName('见习学员')} ({isCompleted ? '已通过验收' : '实训推进中'})</span>
        </div>

        <div className="topbar-actions hidden">
          <FullscreenButton />
          <button
            type="button"
            className="action-btn icon-only"
            onClick={() => setShowWorkOrder((v) => !v)}
            title="查看实训工单与步骤指南"
          >
            <ClipboardList size={18} />
          </button>
          <button
            type="button"
            className="action-btn icon-only"
            onClick={() => setHintRequested((v) => !v)}
            title="请求陈师傅提示"
          >
            <HelpCircle size={18} />
          </button>
          <button
            type="button"
            className="action-btn icon-only"
            onClick={handleRestart}
            title="重新开始本次实训"
          >
            <RotateCcw size={18} />
          </button>
          <button
            type="button"
            className="action-btn primary exit-btn"
            onClick={onReturnLobby}
          >
            <LogOut size={16} />
            <span>返回大厅</span>
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <FullscreenButton />
          <button type="button" onClick={onReturnLobby} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs" title="退出当前实训并返回课程地图">
            <LogOut size={15} /><span>返回课程大厅</span>
          </button>
        </div>
      </header>

      {/* 5-Stage Stepper */}
      <nav className="hidden training-stage-stepper px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-sm overflow-x-auto">
        {(
          [
            { id: 'CAPACITOR_STORAGE_COGNITION', num: '1', name: '储能延时认知' },
            { id: 'MULTIMETER_CAPACITANCE_TEST', num: '2', name: '万用表规范测试' },
            { id: 'RC_TIME_CONSTANT_CURVE', num: '3', name: 'RC时间常数τ' },
            { id: 'BLIND_CAPACITOR_FAULT_DIAGNOSIS', num: '4', name: '电容故障盲测' },
            { id: 'ENGINEERING_REPAIR_AND_DELIVERY', num: '5', name: '实车修复与交付' },
          ] as const
        ).map((step) => {
          const isActive = currentStep === step.id;
          const isPast = Object.keys(stepEvidences).includes(step.id);
          return (
            <div
              key={step.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300 font-bold shadow-sm'
                  : isPast
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-800 bg-slate-900 text-slate-500'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isPast
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step.num}
              </span>
              <span>{step.name}</span>
            </div>
          );
        })}
      </nav>

      {/* Master Chen Voice Prompt */}
      <section className="hidden bg-slate-800/80 border-b border-slate-700/80 px-6 py-3 flex items-center gap-4">
        <MasterChenAvatar emotion={guidance.mentorEmotion} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
            <span>实训导师 · 陈师傅</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 font-normal">{guidance.title}</span>
          </div>
          <p className="text-sm text-slate-200 mt-0.5 leading-relaxed truncate md:whitespace-normal">
            {hintRequested ? `【提示】${guidance.hint}` : guidance.mentorPrompt}
          </p>
        </div>
        <SpeechControls currentText={hintRequested ? guidance.hint : guidance.mentorPrompt} />
      </section>

      {/* Main Workspace Area */}
      <section className={isCompleted ? 'workspace single' : 'workspace'} aria-label="E02 实训工作区">
        <div className="scene-panel">
          <div className="scene-heading"><span className={isCompleted ? 'status-dot bg-emerald-500 shadow-emerald-500/20' : 'status-dot bg-blue-500 shadow-blue-500/20'} /><span>电子电路实训中心 · E02 电容器及其特性</span><span className="scene-meta">{isCompleted ? '验收完成' : '5 阶段渐进实训'}</span></div>
          <div className="scene-content" key={sceneRevision}>
        {isCompleted ? (
          <AbilityReport
            levelId="E02"
            domainLabel="电子器件与信号"
            title="E02 电容器储能与 RC 时间常数实训报告"
            assessment={assessmentResult ?? undefined}
            metrics={stepEvidences}
            nextTask={getNextLevelLabel('E02')}
            onRestart={handleRestart}
            onReturn={onReturnLobby}
          />
        ) : (
          <E02CapacitorScene
            key={sceneRevision}
            currentStep={currentStep}
            onStepComplete={handleStepComplete}
            onAdvanceStep={handleAdvanceStep}
            hintRequested={hintRequested}
            onComplete={(result) => {
              setAssessmentResult(result);
              setIsCompleted(true);
            }}
          />
        )}
          </div>
          <div className="objective-strip"><span>当前操作</span><strong>{isCompleted ? '查看实训能力报告' : guidance.title}</strong><output className="feedback">{isCompleted ? '已完成五阶段实训与验收。' : guidance.objective}</output></div>
        </div>
        {!isCompleted && (
          <aside className="tutor-panel" aria-label="陈师傅实训指导">
            <div className="tutor-title flex items-center gap-3.5 pb-3 border-b border-slate-200"><MasterChenAvatar emotion={guidance.mentorEmotion} size={58} /><div><div className="flex items-center gap-1.5"><strong className="text-base font-bold text-slate-800">陈师傅</strong><span className="text-sm bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.5 rounded">带教技师</span></div><small className="text-sm text-slate-500 font-medium">汽车电子电路诊断专家</small></div></div>
            <div className="message-card relative my-4 p-4 rounded-xl border-l-4 border-blue-500 bg-blue-50/90 text-slate-800 shadow-xs" aria-live="polite"><div className="flex flex-col gap-2"><div className="flex items-center justify-end"><SpeechControls currentText={hintRequested ? guidance.hint : guidance.mentorPrompt} /></div><p className="text-sm font-semibold leading-relaxed m-0">{hintRequested ? guidance.hint : ('“' + guidance.mentorPrompt + '”')}</p></div></div>
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-blue-950"><strong className="block text-sm tracking-wide text-blue-700">本步目标</strong><span className="mt-1 block leading-6">{guidance.objective}</span></div>
            <div className="tutor-context"><span>当前实训环节</span><strong>E02 · {guidance.title.split('：')[0]}</strong></div>
          </aside>
        )}
      </section>

      <nav className="bottom-bar" aria-label="E02 实训功能栏">
        <button type="button" className={showWorkOrder ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => setShowWorkOrder((open) => !open)}><ClipboardList size={19} /> 工单</button>
        <button type="button" className={hintRequested ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => setHintRequested(true)}><HelpCircle size={19} /> 请师傅提示</button>
        <span className="toolbar-spacer" /><span className="unlock-hint">实训要点：按电子电路测试规范完成本关 5 阶段任务 · 当前第 {Object.keys(stepEvidences).length + 1} / 5 阶段</span>
        <button type="button" onClick={handleRestart} className="cursor-pointer"><RotateCcw size={18} /> 重新开始</button>
      </nav>

      {/* Floating Work Order Modal */}
      {showWorkOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/35 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                {getLevelDisplayName('E02')} · 实训工单
              </h3>
              <button aria-label="关闭工单" onClick={() => setShowWorkOrder(false)}
                className="text-slate-600 hover:text-white text-sm"
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
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold"
            >
              已查阅，继续实训
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
