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
import { E04TransistorScene } from './E04TransistorScene';
import { E04_STAGE_CONTENT, type E04Step } from './e04Training';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';

interface E04ExperienceProps {
  onReturnLobby: () => void;
}

export function E04Experience({ onReturnLobby }: E04ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<E04Step>('TRANSISTOR_PRINCIPLE_COGNITION');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = E04_STAGE_CONTENT[currentStep];

  useEffect(() => {
    const textToSpeak = hintRequested ? guidance.hint : guidance.mentorPrompt;
    speakText(textToSpeak);
    return () => {
      stopSpeaking();
    };
  }, [currentStep, hintRequested, guidance.mentorPrompt, guidance.hint]);

  const handleStepComplete = (step: E04Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
    if (step === 'ENGINEERING_REPAIR_AND_DELIVERY') {
      setIsCompleted(true);
    }
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'TRANSISTOR_PRINCIPLE_COGNITION') {
      setCurrentStep('MULTIMETER_PIN_AND_BETA_TEST');
      setHintRequested(false);
    } else if (currentStep === 'MULTIMETER_PIN_AND_BETA_TEST') {
      setCurrentStep('THREE_OPERATION_STATES_CALC');
      setHintRequested(false);
    } else if (currentStep === 'THREE_OPERATION_STATES_CALC') {
      setCurrentStep('BLIND_TRANSISTOR_FAULT_DIAGNOSIS');
      setHintRequested(false);
    } else if (currentStep === 'BLIND_TRANSISTOR_FAULT_DIAGNOSIS') {
      setCurrentStep('ENGINEERING_REPAIR_AND_DELIVERY');
      setHintRequested(false);
    } else if (currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setAssessmentResult(null);
    setCurrentStep('TRANSISTOR_PRINCIPLE_COGNITION');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level03-shell e04-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-blue-600 shadow-blue-600/20 text-white">
            <Zap size={22} />
          </span>
          <div>
            <p className="eyebrow">篇章五：让电路感知、判断和执行 · 电子开关基石</p>
            <h1>E04 小信号控制负载——三极管放大与开关</h1>
          </div>
        </div>

        <div className="trainee-badge">
          <GraduationCap size={18} />
          <span>见习电工 · {getStudentDisplayName('见习学员')} ({isCompleted ? '已通过验收' : '实训推进中'})</span>
        </div>

        <div className="topbar-actions">
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
      </header>

      {/* 5-Stage Stepper */}
      <nav className="training-stage-stepper px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs overflow-x-auto">
        {(
          [
            { id: 'TRANSISTOR_PRINCIPLE_COGNITION', num: '1', name: '小控大原理认知' },
            { id: 'MULTIMETER_PIN_AND_BETA_TEST', num: '2', name: '管脚与β值测量' },
            { id: 'THREE_OPERATION_STATES_CALC', num: '3', name: '三态定量计算' },
            { id: 'BLIND_TRANSISTOR_FAULT_DIAGNOSIS', num: '4', name: '驱动模块盲测' },
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
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
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
      <section className="bg-slate-800/80 border-b border-slate-700/80 px-6 py-3 flex items-center gap-4">
        <MasterChenAvatar emotion={guidance.mentorEmotion} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <span>实训导师 · 陈师傅</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 font-normal">{guidance.title}</span>
          </div>
          <p className="text-sm text-slate-200 mt-0.5 leading-relaxed truncate md:whitespace-normal">
            {hintRequested ? `【提示】${guidance.hint}` : guidance.mentorPrompt}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            speakText(hintRequested ? guidance.hint : guidance.mentorPrompt);
            sounds.playToggleSound?.();
          }}
          className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors"
          title="重新播放导师语音"
        >
          <Volume2 size={18} />
        </button>
      </section>

      {/* Main Workspace Area */}
      <div className="workspace-main flex-1 p-4 md:p-6 overflow-y-auto">
        {isCompleted ? (
          <AbilityReport
            levelId="E04"
            domainLabel="电子器件与信号"
            title="E04 三极管开关与继电器驱动实训报告"
            assessment={assessmentResult ?? undefined}
            metrics={stepEvidences}
            nextTask="E05 电路的条件判断——逻辑门电路认知"
            onRestart={handleRestart}
            onReturn={onReturnLobby}
          />
        ) : (
          <E04TransistorScene
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

      {/* Floating Work Order Modal */}
      {showWorkOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-400" />
                实训任务书 · E04 三极管放大与开关
              </h3>
              <button
                onClick={() => setShowWorkOrder(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-800/60 rounded-xl">
                <span className="font-bold text-blue-400">教材目标:</span> 学习任务 16 三极管及其应用的分析 (8页)
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-200">当前实训指引:</span>
                <p className="text-slate-400">{guidance.objective}</p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-200">规范操作动作:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  {guidance.actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={() => setShowWorkOrder(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
            >
              已查阅，继续实训
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
