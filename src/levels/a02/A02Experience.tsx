'use client';

import React, { useState } from 'react';
import {
  Award,
  Check,
  FileSpreadsheet,
  GraduationCap,
  LogOut,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { CompletionStatus } from '@/src/components/CompletionStatus';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { A02VoltageScene, A02Step } from './scenes/A02VoltageScene';
import { PracticeMode } from '@/src/types/evidence';

interface A02ExperienceProps {
  onReturnLobby: () => void;
}

export function A02Experience({ onReturnLobby }: A02ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<A02Step>('BATTERY_PROBING');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('guided');
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});

  const handleStepComplete = (step: A02Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'BATTERY_PROBING') {
      setCurrentStep('SWITCH_AND_LOAD');
    } else if (currentStep === 'SWITCH_AND_LOAD') {
      setCurrentStep('CONTACT_RESISTANCE_DROP');
    } else if (currentStep === 'CONTACT_RESISTANCE_DROP') {
      setCurrentStep('TRANSFER_DIAGNOSIS');
    } else if (currentStep === 'TRANSFER_DIAGNOSIS') {
      setIsCompleted(true);
    }
  };

  return (
    <main className="app-shell level02-shell min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="topbar bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="brand-lockup flex items-center gap-3">
          <span className="brand-mark p-2 bg-blue-600 text-white rounded-lg shadow-sm">
            <Zap size={22} />
          </span>
          <div>
            <p className="eyebrow text-xs font-bold text-blue-700 uppercase tracking-wider">
              篇章一：把电路看明白 · A02
            </p>
            <h1 className="text-base font-black text-slate-800">
              学习任务4：给电路做体检——电压分析与测量
            </h1>
          </div>
        </div>

        {/* Trainee Mode & Profile */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-bold text-blue-800">
            <GraduationCap size={15} />
            <span>见习学员 · {getStudentDisplayName('见习学员')}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setPracticeMode('guided')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                practiceMode === 'guided' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              跟练模式
            </button>
            <button
              type="button"
              onClick={() => setPracticeMode('independent')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                practiceMode === 'independent' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              独立模式
            </button>
            <button
              type="button"
              onClick={() => setPracticeMode('transfer')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                practiceMode === 'transfer' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
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
              A02 电压分析与测量 · 实训能力报告
            </h2>
            <p className="text-sm text-slate-600 max-w-md">
              学员已完整掌握万用表电压挡（COM/VΩ）安全选用、表笔极性反接规律（V03）、断路两端开路电压测量以及汽车线束接触压降分析（V08）。
            </p>

            <div className="grid grid-cols-2 gap-3 w-full text-left text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Check className="text-emerald-600" size={16} /> 表笔反接负号规律 (V03)
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Check className="text-emerald-600" size={16} /> 开路与通路电压特性判定
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Check className="text-emerald-600" size={16} /> 接触电阻压降诊断 (V08)
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Check className="text-emerald-600" size={16} /> 全回路基尔霍夫电压和验证
              </span>
            </div>

            <CompletionStatus levelId="A02" metrics={stepEvidences} nextTask="学习任务3《元件身份核验 - 电阻识别与测量》" />

            <Button
              size="lg"
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
              onClick={onReturnLobby}
            >
              返回课程大厅
            </Button>
          </div>
        ) : (
          <A02VoltageScene
            currentStep={currentStep}
            onStepComplete={handleStepComplete}
            onAdvanceStep={handleAdvanceStep}
          />
        )}
      </section>

      {/* Bottom Footer Information */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2.5 text-xs text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={15} className="text-blue-600" />
          <span>工单编号：WO-A02-VOLTAGE · 仿真引擎：MNA DC Solver v2.0 (精度 &lt; 1e-6)</span>
        </div>
        <div className="flex items-center gap-4 font-medium">
          <span>实训基准：V03 (极性反接) / V08 (接点压降)</span>
          <span>教材对应：学习任务4 (18页)</span>
        </div>
      </footer>
    </main>
  );
}
