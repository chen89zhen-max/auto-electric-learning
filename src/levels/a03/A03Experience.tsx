'use client';

import React, { useState } from 'react';
import {
  Award,
  Check,
  FileSpreadsheet,
  GraduationCap,
  LogOut,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { CompletionStatus } from '@/src/components/CompletionStatus';
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
          <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center text-center max-w-2xl mx-auto gap-4">
            <span className="p-4 bg-emerald-100 text-emerald-600 rounded-full">
              <Award size={48} />
            </span>
            <h2 className="text-xl font-black text-slate-900">
              A03 电阻识别与测量 · 实训能力报告
            </h2>
            <p className="text-sm text-slate-600 max-w-md">
              学员已完整掌握色环电阻解码规律、标称公差区间计算（V04：220Ω±5% [209~231Ω]）、断电隔离测量与带电拒测拦截（V05）、以及电位器三引脚阻值变化特性。
            </p>

            <div className="grid grid-cols-2 gap-3 w-full text-left text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Check className="text-emerald-600" size={16} /> 色环识读与区间预测 (V04)
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Check className="text-emerald-600" size={16} /> 带电测阻安全规则拦截 (V05)
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Check className="text-emerald-600" size={16} /> 实物筛选与超差判定
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Check className="text-emerald-600" size={16} /> 电位器固定端/动片规律验证
              </span>
            </div>

            <CompletionStatus levelId="A03" metrics={stepEvidences} nextTask="学习任务4《电流到底走哪里 - 电流分析与测量》" />

            <Button
              size="lg"
              className="mt-2 bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
              onClick={onReturnLobby}
            >
              返回课程大厅
            </Button>
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
