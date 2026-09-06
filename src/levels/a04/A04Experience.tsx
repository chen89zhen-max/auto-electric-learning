'use client';

import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LogOut,
  RotateCcw,
  Volume2,
  Zap,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { speakText, stopSpeaking } from '@/src/components/visuals/SpeechTts';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { A04CurrentScene } from './scenes/A04CurrentScene';
import { A04_STAGE_CONTENT, type A04Step } from './a04Training';
import type { PracticeMode } from '@/src/types/evidence';

interface A04ExperienceProps {
  onReturnLobby: () => void;
}

export function A04Experience({ onReturnLobby }: A04ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<A04Step>('SERIES_MEASUREMENT');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [practiceMode] = useState<PracticeMode>('guided');
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = A04_STAGE_CONTENT[currentStep];

  // Auto-speak Master Chen's prompt or hint on new dialog
  useEffect(() => {
    const textToSpeak = hintRequested ? guidance.hint : guidance.mentorPrompt;
    speakText(textToSpeak);
    return () => {
      stopSpeaking();
    };
  }, [currentStep, hintRequested, guidance.mentorPrompt, guidance.hint]);

  const handleStepComplete = (step: A04Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'SERIES_MEASUREMENT') {
      setCurrentStep('SHORT_CIRCUIT_INTERCEPT');
      setHintRequested(false);
    } else if (currentStep === 'SHORT_CIRCUIT_INTERCEPT') {
      setCurrentStep('CLAMP_METER_TASK');
      setHintRequested(false);
    } else if (currentStep === 'CLAMP_METER_TASK') {
      setCurrentStep('BATTERY_DISPOSAL');
      setHintRequested(false);
    } else if (currentStep === 'BATTERY_DISPOSAL') {
      setCurrentStep('TRANSFER_PARALLEL_KCL');
      setHintRequested(false);
    } else if (currentStep === 'TRANSFER_PARALLEL_KCL') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setCurrentStep('SERIES_MEASUREMENT');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level02-shell a04-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-red-600 shadow-red-600/20">
            <Zap size={22} />
          </span>
          <div>
            <p className="eyebrow text-red-700">篇章一：把电路看明白 · A04</p>
            <h1 className="text-slate-800 font-bold">
              学习任务4：电流到底走哪里——电流分析与测量
            </h1>
          </div>
        </div>

        {/* Trainee Profile & Controls */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="trainee-badge">
            <GraduationCap size={18} className="text-red-600" />
            <span>实训成长称号 · {getStudentDisplayName('见习学员')}</span>
          </div>

          <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-900 border border-red-300 text-xs font-bold">
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
        aria-label="A04 电流分析与测量实训工作区"
      >
        {isCompleted ? (
          <div className="scene-panel">
            <div className="scene-heading">
              <span className="status-dot bg-emerald-500 shadow-emerald-500/20" />
              <span>3号实训工位 · A04 学习结果</span>
              <span className="scene-meta">SEMI GUIDED</span>
            </div>
            <div className="scene-content">
              <AbilityReport
                levelId="A04"
                domainLabel="技能领域 · 电流分析与测量"
                title="电流分析与测量能力报告"
                dimensions={[
                  { id: 'AMMETER_PORT', label: '电流表挡位与插孔规范', stars: 5 },
                  { id: 'SERIES_INSERT', label: '串联接入断点操作', stars: 5 },
                  { id: 'SHORT_INTERCEPT', label: '跨接短路危险拦截', stars: 5 },
                  { id: 'CLAMP_METER', label: '钳形表单导线检测', stars: 5 },
                  { id: 'BATTERY_RECYCLE', label: '蓄电池带载与环保归集', stars: 5 },
                ]}
                summaryItems={[
                  { label: '电流表接入方式', value: '串联断路法' },
                  { label: '并联跨接短路拦截', value: '0次短路(全阻断)' },
                  { label: '钳形表单线卡入', value: '规范单导线' },
                  { label: '双线磁通抵消认知', value: '理论验证通过' },
                  { label: '危废蓄电池归集', value: '环保箱分类存放' },
                  { label: '本关用时', value: '1 分钟' },
                ]}
                metrics={stepEvidences}
                mode={practiceMode}
                nextTask="篇章一总结 · 进入篇章二《让电路按要求工作》"
                onRestart={handleRestart}
                onReturn={onReturnLobby}
              />
            </div>
            <div className="objective-strip">
              <span>当前任务</span>
              <strong>查看电流分析与测量能力报告</strong>
              <output className="feedback">实训评测已通过，电流测量与安全短路防护规范已牢固建立。</output>
            </div>
          </div>
        ) : (
          <>
            {/* Left: Interactive Scene Panel */}
            <div className="scene-panel">
              <div className="scene-heading">
                <span className="status-dot bg-red-500 shadow-red-500/20" />
                <span>4号实训工位 · 汽车电子电流分析检测台</span>
                <span className="scene-meta">
                  5阶段综合实训
                </span>
              </div>
              <div className="scene-content" key={sceneRevision}>
                <A04CurrentScene
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
                    <span className="text-sm bg-red-100 text-red-800 font-semibold px-1.5 py-0.5 rounded">
                      带教技师
                    </span>
                  </div>
                  <small className="text-sm text-slate-500 font-medium">
                    车间高级电工技师
                  </small>
                </div>
              </div>

              <div
                className="message-card relative my-4 p-4 rounded-xl border-l-4 border-red-400 bg-red-50/90 text-slate-800 shadow-xs"
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
                    className="text-red-700/70 hover:text-red-900 transition-colors p-1.5 cursor-pointer rounded hover:bg-red-100"
                    title="重播陈师傅语音"
                    onClick={() => {
                      sounds.click();
                      const textToSpeak = hintRequested ? guidance.hint : guidance.mentorPrompt;
                      speakText(textToSpeak);
                    }}
                  >
                    <Volume2 size={18} />
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
                <strong>A04 · 电流分析与测量 · {guidance.title.split('：')[0]}</strong>
              </div>
            </aside>
          </>
        )}
      </section>

      {/* Standard Bottom Navigation Bar */}
      <nav className="bottom-bar" aria-label="A04 实训功能栏">
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
          测量要点：串联断口／防短路拦截／钳形表单线 · 学习任务4（18页）
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
          aria-label="A04 实训工单"
        >
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="eyebrow text-red-700">工单编号 · WO-A04-CURRENT</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              电流到底走哪里——电流分析与测量
            </h2>
            <p className="mt-3 leading-7 text-slate-700">
              在汽车回路电流分析台上完成万用表电流挡串联断路接入，严守防并联短路安全铁律，掌握非接触钳形电流表单导线检测规范与双导线磁通抵消原理，并完成实车休眠暗电流漏电排查。
            </p>
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-base font-bold text-red-900">
              当前任务：{guidance.title}
            </p>
            <button
              type="button"
              className="primary-action mt-5 rounded-xl text-white cursor-pointer bg-red-600 hover:bg-red-700"
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
