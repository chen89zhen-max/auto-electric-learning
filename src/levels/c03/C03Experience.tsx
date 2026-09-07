'use client';

import React, { useState } from 'react';
import {
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LogOut,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { C03IndependentDeliveryScene } from './C03IndependentDeliveryScene';
import { C03_STAGE_CONTENT, type C03Step } from './c03Training';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';

interface C03ExperienceProps {
  onReturnLobby: () => void;
}

export function C03Experience({ onReturnLobby }: C03ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<C03Step>('WORK_ORDER_INTAKE');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = C03_STAGE_CONTENT[currentStep];

  const handleStepComplete = (step: C03Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'WORK_ORDER_INTAKE') {
      setCurrentStep('INDEPENDENT_STRATEGY');
      setHintRequested(false);
    } else if (currentStep === 'INDEPENDENT_STRATEGY') {
      setCurrentStep('NON_DESTRUCTIVE_EXEC');
      setHintRequested(false);
    } else if (currentStep === 'NON_DESTRUCTIVE_EXEC') {
      setCurrentStep('SOP_REPAIR_AND_REINSPECT');
      setHintRequested(false);
    } else if (currentStep === 'SOP_REPAIR_AND_REINSPECT') {
      setCurrentStep('OWNER_DEFENSE_DELIVERY');
      setHintRequested(false);
    } else if (currentStep === 'OWNER_DEFENSE_DELIVERY') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setAssessmentResult(null);
    setCurrentStep('WORK_ORDER_INTAKE');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level03-shell c03-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-emerald-600 shadow-emerald-600/20 text-white">
            <UserCheck size={22} />
          </span>
          <div>
            <p className="eyebrow">篇章三：凭证据找故障 · 首次独立交车</p>
            <h1>C03 第一次独立交车——综合直流诊断与修复复检</h1>
          </div>
        </div>

        <div className="trainee-badge">
          <GraduationCap size={18} />
          <span>见习主修技师 · {getStudentDisplayName('见习学员')} ({isCompleted ? '已通过独立交车' : '独立接车诊断中'})</span>
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
      <section className={isCompleted ? 'workspace single' : 'workspace'} aria-label="C03 实训工作区">
        {isCompleted ? (
          <div className="scene-panel">
            <div className="scene-heading">
              <span className="status-dot bg-emerald-500 shadow-emerald-500/20" />
              <span>新能源汽车电器维修中心 · 首次独立交车综合能力报告</span>
              <span className="scene-meta">篇章三全闭环达成</span>
            </div>
            <div className="scene-content">
              <AbilityReport
                levelId="C03"
                domainLabel="技能领域 · 独立交车与答辩闭环"
                title="综合直流诊断与独立交车答辩能力报告"
                assessment={assessmentResult ?? undefined}
                metrics={stepEvidences}
                nextTask="篇章四《D01 小开关控制工作灯——继电器与电磁控制》"
                onRestart={handleRestart}
                onReturn={onReturnLobby}
              />
            </div>
            <div className="objective-strip">
              <span>当前任务</span>
              <strong>查看首次独立交车答辩能力报告</strong>
              <output className="feedback">实训评测已通过，恭喜完成篇章三全部关卡，具备独立承接直流故障排查与答辩交车能力！</output>
            </div>
          </div>
        ) : (
          <>
            {/* Left: Interactive Scene Panel */}
            <div className="scene-panel">
              <div className="scene-heading">
                <span className="status-dot bg-emerald-500 shadow-emerald-500/20" />
                <span>11号实训工位 · 综合实车接车诊断与交车站</span>
                <span className="scene-meta">独立实训模式</span>
              </div>
              <div className="scene-content" key={sceneRevision}>
                <C03IndependentDeliveryScene
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
                    <span className="text-sm bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
                      车间主任技师
                    </span>
                  </div>
                  <small className="text-sm text-slate-500 font-medium">
                    技能考核与交车答辩考官
                  </small>
                </div>
              </div>

              <div
                className="message-card relative my-4 p-4 rounded-xl border-l-4 border-emerald-500 bg-emerald-50/90 text-slate-800 shadow-xs"
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

              <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-emerald-950">
                <strong className="block text-sm tracking-wide text-emerald-700">
                  本步目标
                </strong>
                <span className="mt-1 block leading-6">
                  {guidance.objective}
                </span>
              </div>

              <div className="tutor-context">
                <span>当前实训环节</span>
                <strong>C03 · 综合直流诊断与修复复检 · {guidance.title.split('：')[0]}</strong>
              </div>
            </aside>
          </>
        )}
      </section>

      {/* Standard Bottom Navigation Bar */}
      <nav className="bottom-bar" aria-label="C03 实训功能栏">
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
          实训考核要点：客户问诊记录 / 非破坏性晃动测试 / 端子挑舌修复+TPA锁片 / 依据答辩交车 · 学习任务9（9页）
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
          aria-label="C03 实训工单"
        >
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="eyebrow text-emerald-700">工单编号 · WO-C03-INDEPENDENT-DELIVERY</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              第一次独立交车——综合直流诊断与修复复检
            </h2>
            <p className="mt-3 leading-7 text-slate-700">
              学员作为主修技师独立接车问诊，面对颠簸路况偶发大灯熄灭的疑难案例，制定非破坏性动态摇晃测试方案，捕捉插头插针退针脱落的关键证据，执行端子挑舌修复与二次锁止片加装，开展全负荷闭环抗震复验，并向车主出示排故证据链做出专业答辩，签署竣工检验单完成闭环交付。
            </p>
            <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-base font-bold text-emerald-900">
              当前任务：{guidance.title}
            </p>
            <button
              type="button"
              className="primary-action mt-5 rounded-xl text-white cursor-pointer bg-emerald-600 hover:bg-emerald-700"
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
