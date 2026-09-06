'use client';

import React, { useState } from 'react';
import {
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LogOut,
  RotateCcw,
  Sliders,
  Volume2,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { A03ResistanceScene } from './scenes/A03ResistanceScene';
import { A03_STAGE_CONTENT, type A03Step } from './a03Training';
import type { PracticeMode } from '@/src/types/evidence';

interface A03ExperienceProps {
  onReturnLobby: () => void;
}

export function A03Experience({ onReturnLobby }: A03ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<A03Step>('COLOR_CODE_CALC');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('guided');
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = A03_STAGE_CONTENT[currentStep];

  const handleStepComplete = (step: A03Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'COLOR_CODE_CALC') {
      setCurrentStep('SAMPLE_MEASUREMENT');
      setHintRequested(false);
    } else if (currentStep === 'SAMPLE_MEASUREMENT') {
      setCurrentStep('POTENTIOMETER_TEST');
      setHintRequested(false);
    } else if (currentStep === 'POTENTIOMETER_TEST') {
      setCurrentStep('TRANSFER_SORTING');
      setHintRequested(false);
    } else if (currentStep === 'TRANSFER_SORTING') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setCurrentStep('COLOR_CODE_CALC');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level02-shell a03-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-amber-600 shadow-amber-600/20">
            <Sliders size={22} />
          </span>
          <div>
            <p className="eyebrow text-amber-700">篇章一：把电路看明白 · A03</p>
            <h1 className="text-slate-800 font-bold">
              学习任务3：元件身份核验——电阻识别与测量
            </h1>
          </div>
        </div>

        {/* Trainee Profile & Controls */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="trainee-badge">
            <GraduationCap size={18} className="text-amber-600" />
            <span>实训成长称号 · {getStudentDisplayName('见习学员')}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setPracticeMode('guided')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                practiceMode === 'guided' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              跟练模式
            </button>
            <button
              type="button"
              onClick={() => setPracticeMode('independent')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                practiceMode === 'independent' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              独立模式
            </button>
            <button
              type="button"
              onClick={() => setPracticeMode('transfer')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                practiceMode === 'transfer' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              迁移模式
            </button>
          </div>

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
        aria-label="A03 电阻识别与测量实训工作区"
      >
        {isCompleted ? (
          <div className="scene-panel">
            <div className="scene-heading">
              <span className="status-dot bg-emerald-500 shadow-emerald-500/20" />
              <span>3号实训工位 · A03 学习结果</span>
              <span className="scene-meta">SEMI GUIDED</span>
            </div>
            <div className="scene-content">
              <AbilityReport
                levelId="A03"
                domainLabel="技能领域 · 电阻识别与测量"
                title="电阻识别与测量能力报告"
                dimensions={[
                  { id: 'COLOR_CODE', label: '色环识读与阻值解码', stars: 5 },
                  { id: 'TOLERANCE', label: '公差区间计算与预测', stars: 5 },
                  { id: 'SAFETY_INTERCEPT', label: '断电测量与带电拒测', stars: 5 },
                  { id: 'ZERO_ADJUST', label: '万用表校零与量程选择', stars: 5 },
                  { id: 'POTENTIOMETER', label: '电位器动片特性验证', stars: 5 },
                ]}
                summaryItems={[
                  {
                    label: '标称阻值识读',
                    value: (stepEvidences.COLOR_CODE_CALC as { nominal?: number; tolerance?: number } | undefined)?.nominal
                      ? `${(stepEvidences.COLOR_CODE_CALC as { nominal: number; tolerance: number }).nominal} Ω (±${(stepEvidences.COLOR_CODE_CALC as { nominal: number; tolerance: number }).tolerance}%)`
                      : '220 Ω (±5%)',
                  },
                  {
                    label: '公差区间判定',
                    value: (stepEvidences.COLOR_CODE_CALC as { min?: number; max?: number } | undefined)?.min
                      ? `${(stepEvidences.COLOR_CODE_CALC as { min: number; max: number }).min}~${(stepEvidences.COLOR_CODE_CALC as { min: number; max: number }).max} Ω 合格`
                      : '209~231 Ω 合格',
                  },
                  { label: '带电测阻拦截', value: '安全触发 100%' },
                  { label: '超差电阻排查', value: '筛选识别准确' },
                  { label: '电位器滑动特性', value: '双向线性核验' },
                  { label: '本关用时', value: '1 分钟' },
                ]}
                metrics={stepEvidences}
                mode={practiceMode}
                nextTask="学习任务4《电流到底走哪里——电流分析与测量》"
                onRestart={handleRestart}
                onReturn={onReturnLobby}
              />
            </div>
            <div className="objective-strip">
              <span>当前任务</span>
              <strong>查看电阻识别与测量能力报告</strong>
              <output className="feedback">实训评测已通过，元件识别与测量规范已牢固建立。</output>
            </div>
          </div>
        ) : (
          <>
            {/* Left: Interactive Scene Panel */}
            <div className="scene-panel">
              <div className="scene-heading">
                <span className="status-dot bg-amber-500 shadow-amber-500/20" />
                <span>3号实训工位 · 汽车电子元件检测台</span>
                <span className="scene-meta">
                  {practiceMode === 'guided'
                    ? '半引导实训'
                    : practiceMode === 'independent'
                    ? '自主实训'
                    : '迁移实训'}
                </span>
              </div>
              <div className="scene-content" key={sceneRevision}>
                <A03ResistanceScene
                  currentStep={currentStep}
                  practiceMode={practiceMode}
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
                  <button
                    type="button"
                    className="text-amber-700/60 hover:text-amber-800 transition-colors p-1 cursor-pointer"
                    title="播报提示音"
                    onClick={() => sounds.click()}
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-950">
                <strong className="block text-sm tracking-wide text-teal-700">
                  本步目标
                </strong>
                <span className="mt-1 block leading-6">
                  {guidance.objective}
                </span>
              </div>

              <div className="tutor-context">
                <span>当前实训环节</span>
                <strong>A03 · 电阻测量 · {practiceMode === 'guided' ? '半引导实训' : practiceMode === 'independent' ? '自主实训' : '实车排故'}</strong>
              </div>
            </aside>
          </>
        )}
      </section>

      {/* Standard Bottom Navigation Bar */}
      <nav className="bottom-bar" aria-label="A03 实训功能栏">
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
          测量要点：色标公差／断电隔离／电位器 · 学习任务3（14页）
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
          aria-label="A03 实训工单"
        >
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="eyebrow">工单编号 · WO-A03-RESISTANCE</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              元件身份核验——电阻识别与测量
            </h2>
            <p className="mt-3 leading-7 text-slate-700">
              在元件检测台上完成色环电阻标称值识读与合格公差推算，严格遵守断电隔离测量规范，排查超差件与断路件，并掌握可变电位器动片特性与实车传感器应用。
            </p>
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-base font-bold text-amber-900">
              当前任务：{guidance.title}
            </p>
            <button
              type="button"
              className="primary-action mt-5 rounded-xl text-white cursor-pointer"
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
