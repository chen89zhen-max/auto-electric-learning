'use client';

import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Cpu,
  GraduationCap,
  HelpCircle,
  LogOut,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { speakText, stopSpeaking } from '@/src/components/visuals/SpeechTts';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { D05TransformerScene } from './D05TransformerScene';
import { D05_STAGE_CONTENT, type D05Step } from './d05Training';

interface D05ExperienceProps {
  onReturnLobby: () => void;
}

export function D05Experience({ onReturnLobby }: D05ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<D05Step>('STRUCTURE_AND_MAGNETIC_FLUX');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = D05_STAGE_CONTENT[currentStep];

  useEffect(() => {
    const textToSpeak = hintRequested ? guidance.hint : guidance.mentorPrompt;
    speakText(textToSpeak);
    return () => {
      stopSpeaking();
    };
  }, [currentStep, hintRequested, guidance.mentorPrompt, guidance.hint]);

  const handleStepComplete = (step: D05Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
    if (step === 'ONBOARD_INVERTER_STEP_UP_DELIVERY') {
      setIsCompleted(true);
    }
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'STRUCTURE_AND_MAGNETIC_FLUX') {
      setCurrentStep('VOLTAGE_AND_CURRENT_RATIO');
      setHintRequested(false);
    } else if (currentStep === 'VOLTAGE_AND_CURRENT_RATIO') {
      setCurrentStep('DC_INPUT_DISASTER_COUNTEREXAMPLE');
      setHintRequested(false);
    } else if (currentStep === 'DC_INPUT_DISASTER_COUNTEREXAMPLE') {
      setCurrentStep('POLARITY_AND_SAME_NAME_TERMINALS');
      setHintRequested(false);
    } else if (currentStep === 'POLARITY_AND_SAME_NAME_TERMINALS') {
      setCurrentStep('ONBOARD_INVERTER_STEP_UP_DELIVERY');
      setHintRequested(false);
    } else if (currentStep === 'ONBOARD_INVERTER_STEP_UP_DELIVERY') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setCurrentStep('STRUCTURE_AND_MAGNETIC_FLUX');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setAssessmentResult(null);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level03-shell d05-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-purple-600 shadow-purple-600/20 text-white">
            <Cpu size={22} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="eyebrow">篇章四：让电和磁配合工作 · 电磁感应高阶</p>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-bold">
                ⭐ 星号选学
              </span>
            </div>
            <h1>D05 变压器实验室——变压器认知与测试</h1>
          </div>
        </div>

        <div className="trainee-badge">
          <GraduationCap size={18} />
          <span>见习电工 · {getStudentDisplayName('见习学员')} ({isCompleted ? '已通过选学验收' : '选学进阶中'})</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <FullscreenButton />
          <button
            onClick={() => setShowWorkOrder(!showWorkOrder)}
            className="action-btn secondary"
            title="查看任务工单"
          >
            <ClipboardList size={16} />
            <span>工单卡</span>
          </button>
          <button
            onClick={handleRestart}
            className="action-btn secondary"
            title="重置当前关卡"
          >
            <RotateCcw size={16} />
            <span>重新开始</span>
          </button>
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
            className="shrink-0 ring-2 ring-purple-500/30 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-300 text-sm">陈师傅（实训总教练）</span>
                <span className="text-[11px] px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full font-mono">
                  D05 · {guidance.title.split('：')[0]}
                </span>
              </div>
              <button
                onClick={() => {
                  sounds.click();
                  speakText(hintRequested ? guidance.hint : guidance.mentorPrompt);
                }}
                className="text-xs text-slate-400 hover:text-purple-300 flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"
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
            className="shrink-0 p-2 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="查看导师操作提示"
          >
            <HelpCircle size={20} />
          </button>
        </section>

        {/* 5-Stage Step Indicators */}
        <div className="grid grid-cols-5 gap-2 text-xs">
          {[
            { key: 'STRUCTURE_AND_MAGNETIC_FLUX', label: '1. 铁芯交变磁通' },
            { key: 'VOLTAGE_AND_CURRENT_RATIO', label: '2. 变压比变流比' },
            { key: 'DC_INPUT_DISASTER_COUNTEREXAMPLE', label: '3. 直流短路反例' },
            { key: 'POLARITY_AND_SAME_NAME_TERMINALS', label: '4. 同名端极性测试' },
            { key: 'ONBOARD_INVERTER_STEP_UP_DELIVERY', label: '5. 逆变220V交车' },
          ].map((s, idx) => {
            const isActive = currentStep === s.key;
            const isPassed =
              (s.key === 'STRUCTURE_AND_MAGNETIC_FLUX' && currentStep !== 'STRUCTURE_AND_MAGNETIC_FLUX') ||
              (s.key === 'VOLTAGE_AND_CURRENT_RATIO' && !['STRUCTURE_AND_MAGNETIC_FLUX', 'VOLTAGE_AND_CURRENT_RATIO'].includes(currentStep)) ||
              (s.key === 'DC_INPUT_DISASTER_COUNTEREXAMPLE' && ['POLARITY_AND_SAME_NAME_TERMINALS', 'ONBOARD_INVERTER_STEP_UP_DELIVERY'].includes(currentStep)) ||
              (s.key === 'POLARITY_AND_SAME_NAME_TERMINALS' && currentStep === 'ONBOARD_INVERTER_STEP_UP_DELIVERY') ||
              isCompleted;

            return (
              <div
                key={s.key}
                className={`p-2 rounded-lg border text-center font-medium transition-all ${
                  isActive
                    ? 'border-purple-500 bg-purple-950/40 text-purple-200 ring-1 ring-purple-500/50'
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
        <D05TransformerScene
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

        {/* Completed Ability Report */}
        {isCompleted && (
          <section className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-6 shadow-2xl">
            <AbilityReport
              levelId="D05"
              domainLabel="技能领域 · 变压器与车载逆变 (⭐ 选学)"
              title="D05 变压器实验室选学能力报告"
              metrics={stepEvidences}
              assessment={assessmentResult ?? undefined}
              nextTask="篇章五《E01 电流的单向通道——二极管及其应用》"
              onRestart={handleRestart}
              onReturn={onReturnLobby}
            />
          </section>
        )}
      </div>
    </main>
  );
}
