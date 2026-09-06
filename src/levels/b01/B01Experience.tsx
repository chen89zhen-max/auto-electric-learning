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
import { B01OhmLawScene } from './B01OhmLawScene';
import { B01_STAGE_CONTENT, type B01Step } from './b01Training';

interface B01ExperienceProps {
  onReturnLobby: () => void;
}

export function B01Experience({ onReturnLobby }: B01ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<B01Step>('FIXED_R_CHANGE_V');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = B01_STAGE_CONTENT[currentStep];

  // Auto-speak Master Chen's prompt or hint on new dialog
  useEffect(() => {
    const textToSpeak = hintRequested ? guidance.hint : guidance.mentorPrompt;
    speakText(textToSpeak);
    return () => {
      stopSpeaking();
    };
  }, [currentStep, hintRequested, guidance.mentorPrompt, guidance.hint]);

  const handleStepComplete = (step: B01Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'FIXED_R_CHANGE_V') {
      setCurrentStep('FIXED_V_CHANGE_R');
      setHintRequested(false);
    } else if (currentStep === 'FIXED_V_CHANGE_R') {
      setCurrentStep('COUNTEREXAMPLE_PHYSICAL_ATTR');
      setHintRequested(false);
    } else if (currentStep === 'COUNTEREXAMPLE_PHYSICAL_ATTR') {
      setCurrentStep('UNKNOWN_RESISTANCE_PREDICT');
      setHintRequested(false);
    } else if (currentStep === 'UNKNOWN_RESISTANCE_PREDICT') {
      setCurrentStep('TRANSFER_AUTO_HEADLAMP_POWER');
      setHintRequested(false);
    } else if (currentStep === 'TRANSFER_AUTO_HEADLAMP_POWER') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setCurrentStep('FIXED_R_CHANGE_V');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level02-shell b01-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-blue-600 shadow-blue-600/20 text-white">
            <Zap size={22} />
          </span>
          <div>
            <p className="eyebrow text-blue-700">篇章二：让电路按要求工作 · B01</p>
            <h1 className="text-slate-800 font-bold">
              学习任务5：找出变化规律——欧姆定律应用
            </h1>
          </div>
        </div>

        {/* Trainee Profile & Controls */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="trainee-badge">
            <GraduationCap size={18} className="text-blue-600" />
            <span>实训成长称号 · {getStudentDisplayName('见习学员')}</span>
          </div>

          <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 border border-blue-300 text-xs font-bold">
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
        aria-label="B01 欧姆定律应用实训工作区"
      >
        {isCompleted ? (
          <div className="scene-panel">
            <div className="scene-heading">
              <span className="status-dot bg-emerald-500 shadow-emerald-500/20" />
              <span>5号实训工位 · B01 学习结果</span>
              <span className="scene-meta">SEMI GUIDED</span>
            </div>
            <div className="scene-content">
              <AbilityReport
                levelId="B01"
                domainLabel="技能领域 · 欧姆定律应用"
                title="欧姆定律与控制变量能力报告"
                dimensions={[
                  { id: 'OHM_CALC', label: '欧姆定律定量计算', stars: 5 },
                  { id: 'VI_CURVE', label: '伏安曲线正比核验', stars: 5 },
                  { id: 'CONTROL_VAR', label: '控制变量科学思维', stars: 5 },
                  { id: 'COUNTER_EXAMPLE', label: '极限反例本质辨析', stars: 5 },
                  { id: 'TOOL_OP', label: '实车改装安全决策', stars: 5 },
                ]}
                summaryItems={[
                  { label: '物理规律核验', value: 'I = U / R 成立' },
                  { label: '控制变量实验', value: 'U-I正比 & I-R反比' },
                  { label: '反例辨析结论', value: '电阻为固有物理属性' },
                  { label: '未知阻值推算', value: '24.0Ω 精准吻合' },
                  { label: '实车改装评估', value: '拒绝大灯过载私改' },
                  { label: '本关用时', value: '1 分钟' },
                ]}
                metrics={stepEvidences}
                mode="guided"
                nextTask="学习任务6《负载的连接与灯组改装》"
                onRestart={handleRestart}
                onReturn={onReturnLobby}
              />
            </div>
            <div className="objective-strip">
              <span>当前任务</span>
              <strong>查看欧姆定律与控制变量能力报告</strong>
              <output className="feedback">实训评测已通过，控制变量法与欧姆定律工程计算已牢固掌握。</output>
            </div>
          </div>
        ) : (
          <>
            {/* Left: Interactive Scene Panel */}
            <div className="scene-panel">
              <div className="scene-heading">
                <span className="status-dot bg-blue-500 shadow-blue-500/20" />
                <span>5号实训工位 · 汽车欧姆定律控制变量实验台</span>
                <span className="scene-meta">5阶段综合实训</span>
              </div>
              <div className="scene-content" key={sceneRevision}>
                <B01OhmLawScene
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
                    <span className="text-sm bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.5 rounded">
                      带教技师
                    </span>
                  </div>
                  <small className="text-sm text-slate-500 font-medium">
                    车间高级电工技师
                  </small>
                </div>
              </div>

              <div
                className="message-card relative my-4 p-4 rounded-xl border-l-4 border-blue-400 bg-blue-50/90 text-slate-800 shadow-xs"
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
                    className="text-blue-700/70 hover:text-blue-900 transition-colors p-1.5 cursor-pointer rounded hover:bg-blue-100"
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

              <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-950">
                <strong className="block text-sm tracking-wide text-sky-700">
                  本步目标
                </strong>
                <span className="mt-1 block leading-6">
                  {guidance.objective}
                </span>
              </div>

              <div className="tutor-context">
                <span>当前实训环节</span>
                <strong>B01 · 欧姆定律应用 · {guidance.title.split('：')[0]}</strong>
              </div>
            </aside>
          </>
        )}
      </section>

      {/* Standard Bottom Navigation Bar */}
      <nav className="bottom-bar" aria-label="B01 实训功能栏">
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
          实训要点：控制变量法／U-I正比／I-R反比／防剧透安全决策 · 学习任务5（8页）
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
          aria-label="B01 实训工单"
        >
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="eyebrow text-blue-700">工单编号 · WO-B01-OHM</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              找出变化规律——欧姆定律应用
            </h2>
            <p className="mt-3 leading-7 text-slate-700">
              在汽车欧姆定律控制变量实验台上，运用控制变量法分别验证电阻恒定时的 U-I 正比例规律与电压恒定时的 I-R 反比例规律，深入辨析电阻固有的物理属性，独立推算实车未知阻值，并对大灯大功率私改工程风险作出规范决策。
            </p>
            <p className="mt-3 rounded-lg bg-blue-50 p-3 text-base font-bold text-blue-900">
              当前任务：{guidance.title}
            </p>
            <button
              type="button"
              className="primary-action mt-5 rounded-xl text-white cursor-pointer bg-blue-600 hover:bg-blue-700"
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
