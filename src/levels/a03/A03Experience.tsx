'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  GraduationCap,
  LogOut,
  Sliders,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { A03ResistanceScene, A03Step } from './scenes/A03ResistanceScene';
import { PracticeMode } from '@/src/types/evidence';

interface A03ExperienceProps {
  onReturnLobby: () => void;
}

export function A03Experience({ onReturnLobby }: A03ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<A03Step>('COLOR_CODE_CALC');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('guided');
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});

  const handleStepComplete = (step: A03Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'COLOR_CODE_CALC') {
      setCurrentStep('SAMPLE_MEASUREMENT');
    } else if (currentStep === 'SAMPLE_MEASUREMENT') {
      setCurrentStep('POTENTIOMETER_TEST');
    } else if (currentStep === 'POTENTIOMETER_TEST') {
      setCurrentStep('TRANSFER_SORTING');
    } else if (currentStep === 'TRANSFER_SORTING') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setCurrentStep('COLOR_CODE_CALC');
    setStepEvidences({});
  };

  return (
    <main className="app-shell level02-shell min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="topbar bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="brand-lockup flex items-center gap-3">
          <span className="brand-mark p-2 bg-amber-600 text-white rounded-lg shadow-sm">
            <Sliders size={22} />
          </span>
          <div>
            <p className="eyebrow text-xs font-bold text-amber-700 uppercase tracking-wider">
              篇章一：把电路看明白 · A03
            </p>
            <h1 className="text-base font-black text-slate-800">
              学习任务3：元件身份核验——电阻识别与测量
            </h1>
          </div>
        </div>

        {/* Trainee Profile & Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-800">
            <GraduationCap size={15} />
            <span>见习学员 · {getStudentDisplayName('见习学员')}</span>
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="退出当前实训并返回课程地图"
          >
            <LogOut size={15} />
            <span>退出实训</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <section className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col gap-4">
        {isCompleted ? (
          <div className="w-full flex justify-center py-2">
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
                { label: '标称阻值识读', value: '220 Ω ±5%' },
                { label: '公差区间判定', value: '209~231 Ω 合格' },
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
        ) : (
          <A03ResistanceScene
            currentStep={currentStep}
            onStepComplete={handleStepComplete}
            onAdvanceStep={handleAdvanceStep}
          />
        )}
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2.5 text-xs text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={15} className="text-amber-600" />
          <span>工单编号：WO-A03-RESISTANCE · 断电隔离与色标核验规范</span>
        </div>
        <div className="flex items-center gap-4 font-medium">
          <span>实训基准：V04 (公差合格) / V05 (带电测阻拦截)</span>
          <span>教材对应：学习任务3 (14页)</span>
        </div>
      </footer>
    </main>
  );
}
