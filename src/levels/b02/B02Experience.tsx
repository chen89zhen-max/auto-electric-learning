'use client';

import React, { useState } from 'react';
import {
  ClipboardList,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  LogOut,
  RotateCcw,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { B02LoadConnectionScene } from './B02LoadConnectionScene';
import { B02_STAGE_CONTENT, type B02Step } from './b02Training';

interface B02ExperienceProps {
  onReturnLobby: () => void;
}

export function B02Experience({ onReturnLobby }: B02ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<B02Step>('SERIES_DIVIDER_TEST');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = B02_STAGE_CONTENT[currentStep];

  const handleStepComplete = (step: B02Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'SERIES_DIVIDER_TEST') {
      setCurrentStep('PARALLEL_INDEPENDENT_TEST');
      setHintRequested(false);
    } else if (currentStep === 'PARALLEL_INDEPENDENT_TEST') {
      setCurrentStep('COMPOUND_SHORT_BYPASS');
      setHintRequested(false);
    } else if (currentStep === 'COMPOUND_SHORT_BYPASS') {
      setCurrentStep('QUANTITATIVE_FOG_PREDICT');
      setHintRequested(false);
    } else if (currentStep === 'QUANTITATIVE_FOG_PREDICT') {
      setCurrentStep('TRANSFER_SPOTLIGHT_MOD_RISK');
      setHintRequested(false);
    } else if (currentStep === 'TRANSFER_SPOTLIGHT_MOD_RISK') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setCurrentStep('SERIES_DIVIDER_TEST');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level02-shell b02-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-amber-600 shadow-amber-600/20 text-white">
            <Lightbulb size={22} />
          </span>
          <div>
            <p className="eyebrow text-amber-700">篇章二：让电路按要求工作 · B02</p>
            <h1 className="text-slate-800 font-bold">
              学习任务6：灯组改装——负载的连接
            </h1>
          </div>
        </div>

        {/* Trainee Profile & Controls */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="trainee-badge">
            <GraduationCap size={18} className="text-amber-600" />
            <span>实训成长称号 · {getStudentDisplayName('见习学员')}</span>
          </div>

          <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
            5阶段递进实训
          </span>

          <FullscreenButton />
          <button
            type="button"
            onClick={onReturnLobby}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="退出当前实训并返回课程地图"
          >
            <LogOut size={15} />
            <span>退出实训</span>
          </button>
        </div>
      </header>

      {/* Main Workspace (Standard 2-Column: Left Scene, Right Master Chen Tutor) */}
      <section
        className={isCompleted ? 'workspace single' : 'workspace'}
        aria-label="B02 负载连接与灯组改装实训工作区"
      >
        {isCompleted ? (
          <div className="scene-panel">
            <div className="scene-heading">
              <span className="status-dot bg-emerald-500 shadow-emerald-500/20" />
              <span>6号实训工位 · B02 学习结果</span>
              <span className="scene-meta">SEMI GUIDED</span>
            </div>
            <div className="scene-content">
              <AbilityReport
                levelId="B02"
                domainLabel="技能领域 · 负载连接与灯组改装"
                title="负载连接与车灯改装能力报告"
                dimensions={[
                  { id: 'SERIES_DIVIDE', label: '串联分压与制约特性', stars: 5 },
                  { id: 'PARALLEL_INDEP', label: '并联独立与阻值骤降', stars: 5 },
                  { id: 'NODE_THEORY', label: '混联拓扑与节点辨析', stars: 5 },
                  { id: 'EQUIV_CALC', label: '并联等效与电流核算', stars: 5 },
                  { id: 'AUTO_MOD_SAFETY', label: '实车改装安全与合规决策', stars: 5 },
                ]}
                summaryItems={[
                  { label: '串联电路特性', value: '分压暗淡 & 一断全断' },
                  { label: '并联电路特性', value: '独立供电 & 越并越小' },
                  { label: '拓扑节点辨析', value: '由等电位节点决定' },
                  { label: '雾灯定量推算', value: 'R总=1.2Ω / I总=10.0A' },
                  { label: '400W改装决策', value: '规避火灾 & 专线继电器' },
                  { label: '本关用时', value: '1 分钟' },
                ]}
                metrics={stepEvidences}
                mode="guided"
                nextTask="学习任务7《追踪节点与回路——基尔霍夫定律》"
                onRestart={handleRestart}
                onReturn={onReturnLobby}
              />
            </div>
            <div className="objective-strip">
              <span>当前任务</span>
              <strong>查看负载连接与车灯改装能力报告</strong>
              <output className="feedback">实训评测已通过，串并联工程规律与汽车灯光改装安全规范已牢固掌握。</output>
            </div>
          </div>
        ) : (
          <>
            {/* Left: Interactive Scene Panel */}
            <div className="scene-panel">
              <div className="scene-heading">
                <span className="status-dot bg-amber-500 shadow-amber-500/20" />
                <span>6号实训工位 · 汽车车灯负载连接与改装实验台</span>
                <span className="scene-meta">5阶段综合实训</span>
              </div>
              <div className="scene-content" key={sceneRevision}>
                <B02LoadConnectionScene
                  currentStep={currentStep}
                  onStepComplete={handleStepComplete}
                  onAdvanceStep={handleAdvanceStep}
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
                    <span className="text-sm bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">
                      带教技师
                    </span>
                  </div>
                  <small className="text-sm text-slate-500 font-medium">
                    车间高级电工技师
                  </small>
                </div>
              </div>

              <div
                className="message-card relative my-4 p-4 rounded-xl border-l-4 border-amber-400 bg-amber-50/90 text-slate-800 shadow-xs"
                aria-live="polite"
              >
                <div className="flex items-start gap-2">
                  <p className="text-sm font-semibold leading-relaxed m-0 flex-1">
                    {hintRequested
                      ? guidance.hint
                      : `“${guidance.mentorPrompt}”`}
                  </p>
                  <SpeechControls
                    currentText={hintRequested ? guidance.hint : guidance.mentorPrompt}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-950">
                <strong className="block text-sm tracking-wide text-amber-700">
                  本步目标
                </strong>
                <span className="mt-1 block leading-6">
                  {guidance.objective}
                </span>
              </div>

              <div className="tutor-context">
                <span>当前实训环节</span>
                <strong>B02 · 负载的连接 · {guidance.title.split('：')[0]}</strong>
              </div>
            </aside>
          </>
        )}
      </section>

      {/* Standard Bottom Navigation Bar */}
      <nav className="bottom-bar" aria-label="B02 实训功能栏">
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
          实训要点：串并联本质／节点辨析／等效电阻计算／越野改装安全规范 · 学习任务6（16页）
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
          aria-label="B02 实训工单"
        >
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="eyebrow text-amber-700">工单编号 · WO-B02-LAMPS</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              灯组改装——负载的连接
            </h2>
            <p className="mt-3 leading-7 text-slate-700">
              在汽车车灯负载连接与改装实验台上，对比串联回路与并联回路的电压、电流及相互制约规律，深刻辨析决定电路连接的电气节点本质，独立核算雾灯并联改装的总阻值与总电流，并对越野射灯私自增大保险丝的火灾自燃风险做出专业合规决策。
            </p>
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-base font-bold text-amber-900">
              当前任务：{guidance.title}
            </p>
            <button
              type="button"
              className="primary-action mt-5 rounded-xl text-white cursor-pointer bg-amber-600 hover:bg-amber-700"
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
