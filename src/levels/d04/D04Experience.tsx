'use client';

import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Flame,
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
import { D04InductanceScene } from './D04InductanceScene';
import { D04_STAGE_CONTENT, type D04Step } from './d04Training';

interface D04ExperienceProps {
  onReturnLobby: () => void;
}

export function D04Experience({ onReturnLobby }: D04ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<D04Step>('SELF_INDUCTANCE_AND_TRANSIENT_SPARK');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = D04_STAGE_CONTENT[currentStep];

  useEffect(() => {
    const textToSpeak = hintRequested ? guidance.hint : guidance.mentorPrompt;
    speakText(textToSpeak);
    return () => {
      stopSpeaking();
    };
  }, [currentStep, hintRequested, guidance.mentorPrompt, guidance.hint]);

  const handleStepComplete = (step: D04Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
    if (step === 'ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE') {
      setIsCompleted(true);
    }
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'SELF_INDUCTANCE_AND_TRANSIENT_SPARK') {
      setCurrentStep('FREEWHEELING_DIODE_PROTECTION');
      setHintRequested(false);
    } else if (currentStep === 'FREEWHEELING_DIODE_PROTECTION') {
      setCurrentStep('MUTUAL_INDUCTANCE_IGNITION_COIL');
      setHintRequested(false);
    } else if (currentStep === 'MUTUAL_INDUCTANCE_IGNITION_COIL') {
      setCurrentStep('BLIND_IGNITION_FAULT_ISOLATION');
      setHintRequested(false);
    } else if (currentStep === 'BLIND_IGNITION_FAULT_ISOLATION') {
      setCurrentStep('ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE');
      setHintRequested(false);
    } else if (currentStep === 'ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setCurrentStep('SELF_INDUCTANCE_AND_TRANSIENT_SPARK');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setAssessmentResult(null);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level03-shell d04-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-orange-600 shadow-orange-600/20 text-white">
            <Flame size={22} />
          </span>
          <div>
            <p className="eyebrow">篇章四：让电和磁配合工作 · 自感互感与高压</p>
            <h1>D04 断开开关后的现象——自感与互感分析</h1>
          </div>
        </div>

        <div className="trainee-badge">
          <GraduationCap size={18} />
          <span>见习电工 · {getStudentDisplayName('见习学员')} ({isCompleted ? '已通过验收' : '实训推进中'})</span>
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
            className="shrink-0 ring-2 ring-orange-500/30 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-orange-300 text-sm">陈师傅（实训总教练）</span>
                <span className="text-[11px] px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full font-mono">
                  D04 · {guidance.title.split('：')[0]}
                </span>
              </div>
              <button
                onClick={() => {
                  sounds.click();
                  speakText(hintRequested ? guidance.hint : guidance.mentorPrompt);
                }}
                className="text-xs text-slate-400 hover:text-orange-300 flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"
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
            className="shrink-0 p-2 text-slate-400 hover:text-orange-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="查看导师操作提示"
          >
            <HelpCircle size={20} />
          </button>
        </section>

        {/* 5-Stage Step Indicators */}
        <div className="grid grid-cols-5 gap-2 text-xs">
          {[
            { key: 'SELF_INDUCTANCE_AND_TRANSIENT_SPARK', label: '1. 自感反峰电弧' },
            { key: 'FREEWHEELING_DIODE_PROTECTION', label: '2. 续流二极管消弧' },
            { key: 'MUTUAL_INDUCTANCE_IGNITION_COIL', label: '3. 点火互感升压' },
            { key: 'BLIND_IGNITION_FAULT_ISOLATION', label: '4. 独立盲测排故' },
            { key: 'ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE', label: '5. 点火复验交车' },
          ].map((s, idx) => {
            const isActive = currentStep === s.key;
            const isPassed =
              (s.key === 'SELF_INDUCTANCE_AND_TRANSIENT_SPARK' && currentStep !== 'SELF_INDUCTANCE_AND_TRANSIENT_SPARK') ||
              (s.key === 'FREEWHEELING_DIODE_PROTECTION' && !['SELF_INDUCTANCE_AND_TRANSIENT_SPARK', 'FREEWHEELING_DIODE_PROTECTION'].includes(currentStep)) ||
              (s.key === 'MUTUAL_INDUCTANCE_IGNITION_COIL' && ['BLIND_IGNITION_FAULT_ISOLATION', 'ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE'].includes(currentStep)) ||
              (s.key === 'BLIND_IGNITION_FAULT_ISOLATION' && currentStep === 'ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE') ||
              isCompleted;

            return (
              <div
                key={s.key}
                className={`p-2 rounded-lg border text-center font-medium transition-all ${
                  isActive
                    ? 'border-orange-500 bg-orange-950/40 text-orange-200 ring-1 ring-orange-500/50'
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
        <D04InductanceScene
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
              levelId="D04"
              domainLabel="技能领域 · 自感互感与高压点火"
              title="D04 断开开关后的现象能力报告"
              metrics={stepEvidences}
              assessment={assessmentResult ?? undefined}
              nextTask="学习任务19《D05 变压器实验室——变压器认知与测试 (⭐ 选学)》"
              onRestart={handleRestart}
              onReturn={onReturnLobby}
            />
          </section>
        )}
      </div>
    </main>
  );
}
