'use client';

import React, { useState } from 'react';
import {
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LogOut,
  Network,
  RotateCcw,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { B03KclKvlScene } from './B03KclKvlScene';
import { B03_STAGE_CONTENT, type B03Step } from './b03Training';

interface B03ExperienceProps {
  onReturnLobby: () => void;
}

export function B03Experience({ onReturnLobby }: B03ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<B03Step>('KCL_NODE_CURRENT');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);

  const guidance = B03_STAGE_CONTENT[currentStep];

  const handleStepComplete = (step: B03Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'KCL_NODE_CURRENT') {
      setCurrentStep('KVL_LOOP_VOLTAGE');
      setHintRequested(false);
    } else if (currentStep === 'KVL_LOOP_VOLTAGE') {
      setCurrentStep('REFERENCE_GROUND_INVARIANT');
      setHintRequested(false);
    } else if (currentStep === 'REFERENCE_GROUND_INVARIANT') {
      setCurrentStep('QUANTITATIVE_BRANCH_CALC');
      setHintRequested(false);
    } else if (currentStep === 'QUANTITATIVE_BRANCH_CALC') {
      setCurrentStep('TRANSFER_GROUND_FAULT_DIAG');
      setHintRequested(false);
    } else if (currentStep === 'TRANSFER_GROUND_FAULT_DIAG') {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setCurrentStep('KCL_NODE_CURRENT');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level02-shell b03-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-indigo-600 shadow-indigo-600/20 text-white">
            <Network size={22} />
          </span>
          <div>
            <p className="eyebrow text-indigo-700">篇章二：让电路按要求工作 · B03</p>
            <h1 className="text-slate-800 font-bold">
              学习任务7：追踪节点与回路——基尔霍夫定律
            </h1>
          </div>
        </div>

        {/* Trainee Profile & Controls */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="trainee-badge">
            <GraduationCap size={18} className="text-indigo-600" />
            <span>实训成长称号 · {getStudentDisplayName('见习学员')}</span>
          </div>

          <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-300 text-xs font-bold">
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
        aria-label="B03 基尔霍夫定律实训工作区"
      >
        {isCompleted ? (
          <div className="scene-panel">
            <div className="scene-heading">
              <span className="status-dot bg-emerald-500 shadow-emerald-500/20" />
              <span>7号实训工位 · B03 学习结果</span>
              <span className="scene-meta">SEMI GUIDED</span>
            </div>
            <div className="scene-content">
              <AbilityReport
                levelId="B03"
                domainLabel="技能领域 · 基尔霍夫定律与复杂网络"
                title="基尔霍夫定律与搭铁诊断能力报告"
                dimensions={[
                  { id: 'KCL_BALANCE', label: '节点电流平衡与电荷守恒', stars: 5 },
                  { id: 'KVL_LOOP', label: '回路电位代数和与能量守恒', stars: 5 },
                  { id: 'REF_GROUND_INVARIANT', label: '参考地平移与两点电压不变性', stars: 5 },
                  { id: 'BRANCH_SOLVER', label: '多支路未知量盲测推算', stars: 5 },
                  { id: 'GROUND_FAULT_DIAG', label: '汽车搭铁不良浮地倒灌排查', stars: 5 },
                ]}
                summaryItems={[
                  { label: 'KCL 节点电流', value: '∑I_入 = ∑I_出 严格守恒' },
                  { label: 'KVL 回路压降', value: '∑U = 0 闭合回路闭环' },
                  { label: '搭铁参考地规律', value: '各点电位改变但电压差不变' },
                  { label: '电气盒未知量', value: 'I4=3.0A 流出 / U_AB=7.2V' },
                  { label: '实车搭铁整改', value: '打磨除锈紧固 恢复单回路' },
                  { label: '本关用时', value: '1 分钟' },
                ]}
                metrics={stepEvidences}
                mode="guided"
                nextTask="学习任务8《工位用电预算——电能与电功率分析》"
                onRestart={handleRestart}
                onReturn={onReturnLobby}
              />
            </div>
            <div className="objective-strip">
              <span>当前任务</span>
              <strong>查看基尔霍夫定律与搭铁诊断能力报告</strong>
              <output className="feedback">实训评测已通过，KCL/KVL分析方法与汽车搭铁不良浮地回流故障排查已熟练掌握。</output>
            </div>
          </div>
        ) : (
          <>
            {/* Left: Interactive Scene Panel */}
            <div className="scene-panel">
              <div className="scene-heading">
                <span className="status-dot bg-indigo-500 shadow-indigo-500/20" />
                <span>7号实训工位 · 汽车节点回路与搭铁分析实验台</span>
                <span className="scene-meta">5阶段综合实训</span>
              </div>
              <div className="scene-content" key={sceneRevision}>
                <B03KclKvlScene
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
                    <span className="text-sm bg-indigo-100 text-indigo-800 font-semibold px-1.5 py-0.5 rounded">
                      带教技师
                    </span>
                  </div>
                  <small className="text-sm text-slate-500 font-medium">
                    车间高级电工技师
                  </small>
                </div>
              </div>

              <div
                className="message-card relative my-4 p-4 rounded-xl border-l-4 border-indigo-400 bg-indigo-50/90 text-slate-800 shadow-xs"
                aria-live="polite"
              >
                <div className="flex items-start gap-2">
                  <p className="text-sm font-semibold leading-relaxed m-0 flex-1">
                    {hintRequested
                      ? guidance.hint
                      : `“${guidance.mentorPrompt}”`}
                  </p>
                  <SpeechControls
                    currentText={hintRequested ? guidance.hint : guidance.mentorPrompt}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-950">
                <strong className="block text-sm tracking-wide text-indigo-700">
                  本步目标
                </strong>
                <span className="mt-1 block leading-6">
                  {guidance.objective}
                </span>
              </div>

              <div className="tutor-context">
                <span>当前实训环节</span>
                <strong>B03 · 基尔霍夫定律 · {guidance.title.split('：')[0]}</strong>
              </div>
            </aside>
          </>
        )}
      </section>

      {/* Standard Bottom Navigation Bar */}
      <nav className="bottom-bar" aria-label="B03 实训功能栏">
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
          实训要点：KCL电荷守恒／KVL能量闭环／参考地转移守恒／尾灯搭铁不良排故 · 学习任务4/6（18/16页）
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
          aria-label="B03 实训工单"
        >
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="eyebrow text-indigo-700">工单编号 · WO-B03-KIRCHHOFF</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              追踪节点与回路——基尔霍夫定律
            </h2>
            <p className="mt-3 leading-7 text-slate-700">
              在汽车节点回路与搭铁分析实验台上，运用基尔霍夫电流定律 (KCL) 验证电气节点电荷守恒与干支分流，运用基尔霍夫电压定律 (KVL) 验证闭合回路电位代数和为零。通过移动搭铁参考地实验深刻理解电位相对性与两点电压客观不变性，独立推算中央配电盒未知支路电流，并解决实车中最经典的“尾灯搭铁不良浮地倒灌借道串电”故障。
            </p>
            <p className="mt-3 rounded-lg bg-indigo-50 p-3 text-base font-bold text-indigo-900">
              当前任务：{guidance.title}
            </p>
            <button
              type="button"
              className="primary-action mt-5 rounded-xl text-white cursor-pointer bg-indigo-600 hover:bg-indigo-700"
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
