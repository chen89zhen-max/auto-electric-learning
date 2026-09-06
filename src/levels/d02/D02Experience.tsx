'use client';

import React, { useState } from 'react';
import {
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LogOut,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { sounds } from '@/src/components/visuals/SoundEffects';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { D02DcMotorScene } from './D02DcMotorScene';
import { D02_STAGE_CONTENT, type D02Step } from './d02Training';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';

interface D02ExperienceProps {
  onReturnLobby: () => void;
}

export function D02Experience({ onReturnLobby }: D02ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<D02Step>('LORENTZ_FORCE_AND_LEFT_HAND_RULE');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = D02_STAGE_CONTENT[currentStep];

  const handleStepComplete = (step: D02Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
    if (step === 'ENGINEERING_REPAIR_AND_COMMISSIONING') {
      setIsCompleted(true);
    }
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'LORENTZ_FORCE_AND_LEFT_HAND_RULE') {
      setCurrentStep('COMMUTATOR_AND_CONTINUOUS_ROTATION');
      setHintRequested(false);
    } else if (currentStep === 'COMMUTATOR_AND_CONTINUOUS_ROTATION') {
      setCurrentStep('H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL');
      setHintRequested(false);
    } else if (currentStep === 'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL') {
      setCurrentStep('BLIND_DC_MOTOR_FAULT_ISOLATION');
      setHintRequested(false);
    } else if (currentStep === 'BLIND_DC_MOTOR_FAULT_ISOLATION') {
      setCurrentStep('ENGINEERING_REPAIR_AND_COMMISSIONING');
      setHintRequested(false);
    } else if (currentStep === 'ENGINEERING_REPAIR_AND_COMMISSIONING') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setCurrentStep('LORENTZ_FORCE_AND_LEFT_HAND_RULE');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setAssessmentResult(null);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level03-shell d02-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-sky-600 shadow-sky-600/20 text-white">
            <RotateCw size={22} />
          </span>
          <div>
            <p className="eyebrow">篇章四：让电和磁配合工作 · 电机驱动核心</p>
            <h1>D02 让电机转起来——直流电动机认知</h1>
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
            className="shrink-0 ring-2 ring-sky-500/30 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sky-300 text-sm">陈师傅（实训总教练）</span>
                <span className="text-xs px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full font-mono">
                  D02 · {guidance.title.split('：')[0]}
                </span>
              </div>
              <SpeechControls currentText={hintRequested ? guidance.hint : guidance.mentorPrompt} />
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
            className="shrink-0 p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="查看导师操作提示"
          >
            <HelpCircle size={20} />
          </button>
        </section>

        {/* 5-Stage Step Indicators */}
        <div className="grid grid-cols-5 gap-2 text-xs">
          {[
            { key: 'LORENTZ_FORCE_AND_LEFT_HAND_RULE', label: '1. 左手定则受力' },
            { key: 'COMMUTATOR_AND_CONTINUOUS_ROTATION', label: '2. 换向器连续旋转' },
            { key: 'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL', label: '3. H桥正反转' },
            { key: 'BLIND_DC_MOTOR_FAULT_ISOLATION', label: '4. 独立盲测排故' },
            { key: 'ENGINEERING_REPAIR_AND_COMMISSIONING', label: '5. 工程修复交车' },
          ].map((s, idx) => {
            const isActive = currentStep === s.key;
            const isPassed =
              (s.key === 'LORENTZ_FORCE_AND_LEFT_HAND_RULE' && currentStep !== 'LORENTZ_FORCE_AND_LEFT_HAND_RULE') ||
              (s.key === 'COMMUTATOR_AND_CONTINUOUS_ROTATION' && !['LORENTZ_FORCE_AND_LEFT_HAND_RULE', 'COMMUTATOR_AND_CONTINUOUS_ROTATION'].includes(currentStep)) ||
              (s.key === 'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL' && ['BLIND_DC_MOTOR_FAULT_ISOLATION', 'ENGINEERING_REPAIR_AND_COMMISSIONING'].includes(currentStep)) ||
              (s.key === 'BLIND_DC_MOTOR_FAULT_ISOLATION' && currentStep === 'ENGINEERING_REPAIR_AND_COMMISSIONING') ||
              isCompleted;

            return (
              <div
                key={s.key}
                className={`p-2 rounded-lg border text-center font-medium transition-all ${
                  isActive
                    ? 'border-sky-500 bg-sky-950/40 text-sky-200 ring-1 ring-sky-500/50'
                    : isPassed
                    ? 'border-emerald-600/50 bg-emerald-950/20 text-emerald-300'
                    : 'border-slate-800 bg-slate-900/50 text-slate-500'
                }`}
              >
                <span className="block font-mono text-xs text-slate-400">阶段 0{idx + 1}</span>
                <span className="truncate block">{s.label.split('. ')[1]}</span>
              </div>
            );
          })}
        </div>

        {/* Interactive Scene Viewport */}
        <D02DcMotorScene
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
              levelId="D02"
              domainLabel="技能领域 · 直流电动机与H桥控制"
              title="D02 让电机转起来能力报告"
              metrics={stepEvidences}
              assessment={assessmentResult ?? undefined}
              nextTask="学习任务13《D03 转动为什么能发电——电磁感应与交流发电机》"
              onRestart={handleRestart}
              onReturn={onReturnLobby}
            />
          </section>
        )}
      </div>
    </main>
  );
}
