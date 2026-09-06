'use client';

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
import { C02FaultClassifyScene } from './C02FaultClassifyScene';
import { C02_STAGE_CONTENT, type C02Step } from './c02Training';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';

interface C02ExperienceProps {
  onReturnLobby: () => void;
}

export function C02Experience({ onReturnLobby }: C02ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<C02Step>('SYMPTOM_AND_TOOLS');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = C02_STAGE_CONTENT[currentStep];

  const handleStepComplete = (step: C02Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'SYMPTOM_AND_TOOLS') {
      setCurrentStep('OPEN_CIRCUIT_ISOLATION');
      setHintRequested(false);
    } else if (currentStep === 'OPEN_CIRCUIT_ISOLATION') {
      setCurrentStep('SHORT_CIRCUIT_FUSE_BLOWN');
      setHintRequested(false);
    } else if (currentStep === 'SHORT_CIRCUIT_FUSE_BLOWN') {
      setCurrentStep('BLIND_THREE_FAULT_ISOLATION');
      setHintRequested(false);
    } else if (currentStep === 'BLIND_THREE_FAULT_ISOLATION') {
      setCurrentStep('FAULT_REPAIR_AND_PREVENTION');
      setHintRequested(false);
    } else if (currentStep === 'FAULT_REPAIR_AND_PREVENTION') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setAssessmentResult(null);
    setCurrentStep('SYMPTOM_AND_TOOLS');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level03-shell c02-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-rose-600 shadow-rose-600/20 text-white">
            <Zap size={22} />
          </span>
          <div>
            <p className="eyebrow">篇章三：凭证据找故障 · 综合排故基准</p>
            <h1>C02 同样不亮，原因不同——电路断路与短路综合排查</h1>
          </div>
        </div>

        <div className="trainee-badge">
          <GraduationCap size={18} />
          <span>见习电工 · {getStudentDisplayName('见习学员')} ({isCompleted ? '已通过验收' : '实战排故中'})</span>
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
      <section className={isCompleted ? 'workspace single' : 'workspace'} aria-label="C02 实训工作区">
        {isCompleted ? (
          <div className="scene-panel">
            <div className="scene-heading">
              <span className="status-dot bg-emerald-500 shadow-emerald-500/20" />
              <span>新能源汽车电器维修中心 · 断路/短路综合排查能力验收</span>
              <span className="scene-meta">闭环诊断达成</span>
            </div>
            <div className="scene-content">
              <AbilityReport
                levelId="C02"
                domainLabel="技能领域 · 直流电路故障排查"
                title="电路断路、短路、虚接与短路到电源综合排查能力报告"
                assessment={assessmentResult ?? undefined}
                metrics={stepEvidences}
                nextTask="学习任务9《C03 第一次独立交车——综合直流诊断与修复复检》"
                onRestart={handleRestart}
                onReturn={onReturnLobby}
              />
            </div>
            <div className="objective-strip">
              <span>当前任务</span>
              <strong>查看断路、短路与虚接综合排查能力报告</strong>
              <output className="feedback">实训评测已通过，断路/短路/高阻/短路到电源四类典型故障机理与防磨整改工艺已熟练掌握。</output>
            </div>
          </div>
        ) : (
          <>
            {/* Left: Interactive Scene Panel */}
            <div className="scene-panel">
              <div className="scene-heading">
                <span className="status-dot bg-rose-500 shadow-rose-500/20" />
                <span>10号实训工位 · 汽车电气四类典型故障综合诊断台</span>
                <span className="scene-meta">5阶段综合实训</span>
              </div>
              <div className="scene-content" key={sceneRevision}>
                <C02FaultClassifyScene
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
                <div className="flex items-start gap-2">
                  <p className="text-sm font-semibold leading-relaxed m-0 flex-1">
                    {hintRequested
                      ? guidance.hint
                      : `“${guidance.mentorPrompt}”`}
                  </p>
                  <SpeechControls currentText={hintRequested ? guidance.hint : guidance.mentorPrompt} />
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
                <strong>C02 · 电路断路与短路综合排查 · {guidance.title.split('：')[0]}</strong>
              </div>
            </aside>
          </>
        )}
      </section>

      {/* Standard Bottom Navigation Bar */}
      <nav className="bottom-bar" aria-label="C02 实训功能栏">
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
          实训要点：试灯定性寻电 / 万用表定量测阻抗 / 断路跨接吃全压 / 短路严禁盲换大保险 · 学习任务9（9页）
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
          aria-label="C02 实训工单"
        >
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="eyebrow text-rose-700">工单编号 · WO-C02-FAULT-CLASSIFY</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              同样不亮，原因不同——电路断路与短路综合排查
            </h2>
            <p className="mt-3 leading-7 text-slate-700">
              前照灯不亮存在三种截然不同的物理机制：回路断线断路、导线磨破对地短路烧毁保险、以及端子氧化接触高阻。运用汽车试灯与万用表配合建立完整排故证据链，严守断路跨接测全压与短路断电测对地阻抗规程，杜绝盲目换装大号保险丝的恶性违章，实施焊接热缩与波纹管防磨整改并闭环交付。
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
