'use client';

import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
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
import { D01RelayControlScene } from './D01RelayControlScene';
import { D01_STAGE_CONTENT, type D01Step } from './d01Training';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';

interface D01ExperienceProps {
  onReturnLobby: () => void;
}

export function D01Experience({ onReturnLobby }: D01ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<D01Step>('COIL_CONTACT_ISOLATION');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = D01_STAGE_CONTENT[currentStep];

  // Auto-speak Master Chen's prompt or hint on new dialog
  useEffect(() => {
    const textToSpeak = hintRequested ? guidance.hint : guidance.mentorPrompt;
    speakText(textToSpeak);
    return () => {
      stopSpeaking();
    };
  }, [currentStep, hintRequested, guidance.mentorPrompt, guidance.hint]);

  const handleStepComplete = (step: D01Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
    if (step === 'ENGINEERING_REPAIR_AND_DELIVERY') {
      setIsCompleted(true);
    }
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'COIL_CONTACT_ISOLATION') {
      setCurrentStep('MULTIMETER_PIN_IDENTIFICATION');
      setHintRequested(false);
    } else if (currentStep === 'MULTIMETER_PIN_IDENTIFICATION') {
      setCurrentStep('RELAY_ENERGIZATION_AND_SWITCH');
      setHintRequested(false);
    } else if (currentStep === 'RELAY_ENERGIZATION_AND_SWITCH') {
      setCurrentStep('BLIND_RELAY_FAULT_DIAGNOSIS');
      setHintRequested(false);
    } else if (currentStep === 'BLIND_RELAY_FAULT_DIAGNOSIS') {
      setCurrentStep('ENGINEERING_REPAIR_AND_DELIVERY');
      setHintRequested(false);
    } else if (currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setAssessmentResult(null);
    setCurrentStep('COIL_CONTACT_ISOLATION');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level03-shell d01-shell bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Header Topbar */}
      <header className="topbar bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
            <Zap size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                篇章四 · 电磁与电机
              </span>
              <span className="text-xs text-amber-400 font-semibold">学习任务 11</span>
            </div>
            <h1 className="text-base font-bold text-slate-100 mt-0.5">
              D01 小开关控制工作灯——继电器与电磁控制
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWorkOrder(!showWorkOrder)}
            className={`action-btn ${showWorkOrder ? 'active text-amber-400 border-amber-500/50' : 'secondary'}`}
            title="查看实训工单详情"
          >
            <ClipboardList size={16} />
            <span>实训工单</span>
          </button>
          <button
            onClick={handleRestart}
            className="action-btn secondary"
            title="重置当前关卡"
          >
            <RotateCcw size={16} />
            <span>重新开始</span>
          </button>
          <FullscreenButton />
          <button
            onClick={onReturnLobby}
            className="action-btn secondary text-rose-300 hover:text-rose-200"
            title="返回实训大厅"
          >
            <LogOut size={16} />
            <span>退出</span>
          </button>
        </div>
      </header>

      <div className="main-content flex flex-col flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-4">
        {/* Mentor Prompt Card */}
        <section className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-xl flex items-start gap-4">
          <MasterChenAvatar
            emotion={guidance.mentorEmotion}
            size={56}
            className="shrink-0 ring-2 ring-amber-500/30 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300 text-sm">陈师傅（实训总教练）</span>
                <span className="text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-mono">
                  D01 · {guidance.title.split('：')[0]}
                </span>
              </div>
              <button
                onClick={() => {
                  sounds.click();
                  speakText(hintRequested ? guidance.hint : guidance.mentorPrompt);
                }}
                className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"
                title="重新朗读指导语"
              >
                <Volume2 size={13} />
                <span>朗读</span>
              </button>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">
              {hintRequested ? guidance.hint : guidance.mentorPrompt}
            </p>
          </div>
          <button
            onClick={() => {
              sounds.click();
              setHintRequested(!hintRequested);
            }}
            className="shrink-0 p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="查看导师操作提示"
          >
            <HelpCircle size={20} />
          </button>
        </section>

        {/* 5-Stage Step Indicators */}
        <div className="grid grid-cols-5 gap-2 text-xs">
          {[
            { key: 'COIL_CONTACT_ISOLATION', label: '1. 回路分离认知' },
            { key: 'MULTIMETER_PIN_IDENTIFICATION', label: '2. 引脚万用表辨识' },
            { key: 'RELAY_ENERGIZATION_AND_SWITCH', label: '3. 电磁吸合规律' },
            { key: 'BLIND_RELAY_FAULT_DIAGNOSIS', label: '4. 独立盲测排故' },
            { key: 'ENGINEERING_REPAIR_AND_DELIVERY', label: '5. 工程修复交车' },
          ].map((s, idx) => {
            const isActive = currentStep === s.key;
            const isPassed =
              (s.key === 'COIL_CONTACT_ISOLATION' && currentStep !== 'COIL_CONTACT_ISOLATION') ||
              (s.key === 'MULTIMETER_PIN_IDENTIFICATION' && !['COIL_CONTACT_ISOLATION', 'MULTIMETER_PIN_IDENTIFICATION'].includes(currentStep)) ||
              (s.key === 'RELAY_ENERGIZATION_AND_SWITCH' && ['BLIND_RELAY_FAULT_DIAGNOSIS', 'ENGINEERING_REPAIR_AND_DELIVERY'].includes(currentStep)) ||
              (s.key === 'BLIND_RELAY_FAULT_DIAGNOSIS' && currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY') ||
              isCompleted;

            return (
              <div
                key={s.key}
                className={`p-2 rounded-lg border text-center font-medium transition-all ${
                  isActive
                    ? 'border-amber-500 bg-amber-950/40 text-amber-200 ring-1 ring-amber-500/50'
                    : isPassed
                    ? 'border-emerald-600/50 bg-emerald-950/20 text-emerald-300'
                    : 'border-slate-800 bg-slate-900/50 text-slate-500'
                }`}
              >
                <span className="block font-mono text-[10px] text-slate-400">阶段 0{idx + 1}</span>
                <span className="truncate block">{s.label.split('. ')[1]}</span>
              </div>
            );
          })}
        </div>

        {/* Interactive Scene Viewport */}
        <D01RelayControlScene
          key={sceneRevision}
          currentStep={currentStep}
          onStepComplete={handleStepComplete}
          onAdvanceStep={handleAdvanceStep}
          onComplete={(result) => {
            setAssessmentResult(result);
            setIsCompleted(true);
          }}
          hintRequested={hintRequested}
        />

        {/* Completed Ability Report */}
        {isCompleted && (
          <section className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-6 shadow-2xl">
            <AbilityReport
              levelId="D01"
              domainLabel="技能领域 · 继电器与电磁控制"
              title="D01 小开关控制工作灯能力报告"
              assessment={assessmentResult ?? undefined}
              metrics={stepEvidences}
              nextTask="学习任务12《D02 让电机转起来——直流电动机认知》"
              onRestart={handleRestart}
              onReturn={onReturnLobby}
            />
          </section>
        )}
      </div>
    </main>
  );
}
