'use client';

import React, { useState } from 'react';
import {
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LogOut,
  RotateCcw,
  Wrench,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { C01VoltageDropScene } from './C01VoltageDropScene';
import { C01_STAGE_CONTENT, type C01Step } from './c01Training';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';

interface C01ExperienceProps {
  onReturnLobby: () => void;
}

export function C01Experience({ onReturnLobby }: C01ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<C01Step>('SYMPTOM_AND_HYPOTHESIS');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = C01_STAGE_CONTENT[currentStep];

  const handleStepComplete = (step: C01Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'SYMPTOM_AND_HYPOTHESIS') {
      setCurrentStep('LOADED_VOLTAGE_DROP_TEST');
      setHintRequested(false);
    } else if (currentStep === 'LOADED_VOLTAGE_DROP_TEST') {
      setCurrentStep('UNLOADED_COUNTEREXAMPLE');
      setHintRequested(false);
    } else if (currentStep === 'UNLOADED_COUNTEREXAMPLE') {
      setCurrentStep('BLIND_FAULT_ISOLATION');
      setHintRequested(false);
    } else if (currentStep === 'BLIND_FAULT_ISOLATION') {
      setCurrentStep('REPAIR_AND_CLOSED_LOOP');
      setHintRequested(false);
    } else if (currentStep === 'REPAIR_AND_CLOSED_LOOP') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setAssessmentResult(null);
    setCurrentStep('SYMPTOM_AND_HYPOTHESIS');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level03-shell c01-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-rose-600 shadow-rose-600/20 text-white">
            <Wrench size={22} />
          </span>
          <div>
            <p className="eyebrow">篇章三：凭证据找故障 · 中期诊断标杆</p>
            <h1>C01 越来越暗的灯——电压降分析与虚接诊断</h1>
          </div>
        </div>

        <div className="trainee-badge">
          <GraduationCap size={18} />
          <span>见习电工 · {getStudentDisplayName('见习学员')} ({isCompleted ? '已通过验收' : '带载排查中'})</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <FullscreenButton />
          <button
            type="button"
            onClick={onReturnLobby}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="退出当前实训并返回课程地图"
          >
            <LogOut size={15} />
            <span>返回课程大厅</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Section */}
      <section className={isCompleted ? 'workspace single' : 'workspace'} aria-label="C01 实训工作区">
        {isCompleted ? (
          <div className="scene-panel">
            <div className="scene-heading">
              <span className="status-dot bg-emerald-500 shadow-emerald-500/20" />
              <span>新能源汽车电器维修中心 · 竣工验收交车报告</span>
              <span className="scene-meta">闭环诊断达成</span>
            </div>
            <div className="scene-content">
              <AbilityReport
                levelId="C01"
                domainLabel="技能领域 · 直流电路诊断闭环"
                title="带载电压降排查与虚接诊断能力报告"
                assessment={assessmentResult ?? undefined}
                metrics={stepEvidences}
                nextTask="学习任务9《C02 同样不亮，原因不同——电路断路与短路综合排查》"
                onRestart={handleRestart}
                onReturn={onReturnLobby}
              />
            </div>
            <div className="objective-strip">
              <span>当前任务</span>
              <strong>查看带载电压降排查与虚接诊断能力报告</strong>
              <output className="feedback">实训评测已通过，带载跨接压降诊断、空载反例辨析与除氧化紧固工艺已熟练掌握。</output>
            </div>
          </div>
        ) : (
          <>
            {/* Left: Interactive Scene Panel */}
            <div className="scene-panel">
              <div className="scene-heading">
                <span className="status-dot bg-rose-500 shadow-rose-500/20" />
                <span>9号实训工位 · 汽车前照灯带载电压降诊断台</span>
                <span className="scene-meta">5阶段渐进实训</span>
              </div>
              <div className="scene-content" key={sceneRevision}>
                <C01VoltageDropScene
                  currentStep={currentStep}
                  onStepComplete={handleStepComplete}
                  onAdvanceStep={handleAdvanceStep}
                  onComplete={(result) => {
                    setAssessmentResult(result);
                    setIsCompleted(true);
                  }}
                  hintRequested={hintRequested}
                />
              </div>
              <div className="objective-strip">
                <span>当前任务</span>
                <strong>{guidance.title}</strong>
                <output className="feedback">{guidance.objective}</output>
              </div>
            </div>

            {/* Right: Master Chen Tutor Panel */}
            <aside className="tutor-panel" aria-label="陈师傅实训指导">
              <div className="tutor-title flex items-center gap-3.5 pb-3 border-b border-slate-200">
                <MasterChenAvatar emotion={guidance.mentorEmotion} size={58} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-base font-bold text-slate-800">
                      陈师傅
                    </strong>
                    <span className="text-sm bg-rose-100 text-rose-800 font-semibold px-1.5 py-0.5 rounded">
                      带教技师
                    </span>
                  </div>
                  <small className="text-sm text-slate-500 font-medium">
                    车间高级电气诊断专家
                  </small>
                </div>
              </div>

              <div
                className="message-card relative my-4 p-4 rounded-xl border-l-4 border-rose-500 bg-rose-50/90 text-slate-800 shadow-xs"
                aria-live="polite"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-end">
                    <SpeechControls currentText={hintRequested ? guidance.hint : guidance.mentorPrompt} />
                  </div>
                  <p className="text-sm font-semibold leading-relaxed m-0">
                    {hintRequested
                      ? guidance.hint
                      : `“${guidance.mentorPrompt}”`}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-sm text-rose-950">
                <strong className="block text-sm tracking-wide text-rose-700">
                  本步目标
                </strong>
                <span className="mt-1 block leading-6">
                  {guidance.objective}
                </span>
              </div>

              <div className="tutor-context">
                <span>当前实训环节</span>
                <strong>C01 · 电压降分析与虚接诊断 · {guidance.title.split('：')[0]}</strong>
              </div>
            </aside>
          </>
        )}
      </section>

      {/* Standard Bottom Navigation Bar */}
      <nav className="bottom-bar" aria-label="C01 实训功能栏">
        <button
          type="button"
          className={showWorkOrder ? 'tool-active cursor-pointer' : 'cursor-pointer'}
          onClick={() => setShowWorkOrder((open) => !open)}
        >
          <ClipboardList size={19} /> 工单
        </button>
        <button
          type="button"
          className={hintRequested ? 'tool-active cursor-pointer' : 'cursor-pointer'}
          onClick={() => setHintRequested(true)}
        >
          <HelpCircle size={19} /> 请师傅提示
        </button>
        <span className="toolbar-spacer" />
        <span className="unlock-hint">
          核心红线：带载跨接测量 / 供电侧压降 ≤ 0.2V / 空载 I=0 压降消失反例辨析 · 学习任务8（9页）
        </span>
        <button type="button" onClick={handleRestart} className="cursor-pointer">
          <RotateCcw size={18} /> 重新开始
        </button>
      </nav>

      {/* Work Order Modal Dialog */}
      {showWorkOrder && !isCompleted && (
        <dialog
          open
          className="fixed inset-0 z-50 flex h-screen w-screen max-w-none items-center justify-center bg-slate-950/35 p-4"
          aria-label="C01 实训工单"
        >
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="eyebrow text-rose-700">工单编号 · WO-C01-VOLT-DROP</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              越来越暗的灯——带载电压降排查与虚接诊断
            </h2>
            <p className="mt-3 leading-7 text-slate-700">
              已知 24W/6Ω 前照灯在试验台工作正常，但在实车线束上明显昏暗发黄。拔下插头测得开路 12V 假象。必须在带载通电状态下跨接测量供电侧与搭铁侧电压降，识别 0.91V 供电侧严重超标缺陷，破除空载测压误区，独立盲测未知接触故障，并实施插针打磨紧固与闭环交车验证。
            </p>
            <p className="mt-3 rounded-lg bg-rose-50 p-3 text-base font-bold text-rose-900">
              当前任务：{guidance.title}
            </p>
            <button
              type="button"
              className="primary-action mt-5 rounded-xl text-white cursor-pointer bg-rose-600 hover:bg-rose-700"
              onClick={() => setShowWorkOrder(false)}
            >
              返回实训工位
            </button>
          </section>
        </dialog>
      )}
    </main>
  );
}
