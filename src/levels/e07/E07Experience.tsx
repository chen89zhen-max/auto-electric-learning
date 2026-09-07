'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LogOut,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { getStudentDisplayName } from '@/src/stores/authStore';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { scoreAssessment } from '@/src/assessment/scoreAssessment';
import { E07PcbAssemblyScene, type PhysicalEvaluationData } from './E07PcbAssemblyScene';
import { E07_STAGE_CONTENT, type E07Step } from './e07Training';

interface E07ExperienceProps {
  onReturnLobby: () => void;
}

export function E07Experience({ onReturnLobby }: E07ExperienceProps) {
  const [currentStep, setCurrentStep] = useState<E07Step>('SOLDERING_SAFETY_AND_FIVE_STEPS');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [stepEvidences, setStepEvidences] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);
  const [physicalEvaluation, setPhysicalEvaluation] = useState<PhysicalEvaluationData | null>(null);

  const guidance = E07_STAGE_CONTENT[currentStep];



  const handleStepComplete = (step: E07Step, evidence: Record<string, unknown>) => {
    setStepEvidences((prev) => ({
      ...prev,
      [step]: evidence,
    }));
    if (step === 'ENGINEERING_REPAIR_AND_DELIVERY') {
      setIsCompleted(true);
    }
  };

  const handleAdvanceStep = () => {
    if (currentStep === 'SOLDERING_SAFETY_AND_FIVE_STEPS') {
      setCurrentStep('VIRTUAL_PCB_INSERTION_AND_WELD');
      setHintRequested(false);
    } else if (currentStep === 'VIRTUAL_PCB_INSERTION_AND_WELD') {
      setCurrentStep('SOLDER_JOINT_QUALITY_STANDARD');
      setHintRequested(false);
    } else if (currentStep === 'SOLDER_JOINT_QUALITY_STANDARD') {
      setCurrentStep('BLIND_PCB_DEFECT_INSPECTION');
      setHintRequested(false);
    } else if (currentStep === 'BLIND_PCB_DEFECT_INSPECTION') {
      setCurrentStep('ENGINEERING_REPAIR_AND_DELIVERY');
      setHintRequested(false);
    } else if (currentStep === 'ENGINEERING_REPAIR_AND_DELIVERY') {
      setIsCompleted(true);
    }
  };

  useEffect(() => {
    let active = true;
    async function loadPhysicalEval() {
      try {
        const res = await fetch('/api/learning/evaluations?levelId=E07');
        if (res.ok) {
          const data = await res.json() as { evaluation?: PhysicalEvaluationData | null };
          if (active && data.evaluation) {
            setPhysicalEvaluation(data.evaluation);
          }
        }
      } catch {
        // ignore network error
      }
    }
    void loadPhysicalEval();
    return () => { active = false; };
  }, [isCompleted, currentStep]);

  const handleRestart = () => {
    setIsCompleted(false);
    setAssessmentResult(null);
    setCurrentStep('SOLDERING_SAFETY_AND_FIVE_STEPS');
    setStepEvidences({});
    setHintRequested(false);
    setShowWorkOrder(false);
    setSceneRevision((r) => r + 1);
  };

  return (
    <main className="app-shell level03-shell e07-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-blue-600 shadow-blue-600/20 text-white">
            <Zap size={22} />
          </span>
          <div>
            <p className="eyebrow">篇章五：让电路感知、判断和执行 · 焊接工艺基石</p>
            <h1>E07 装配一块训练板——PCB焊接工艺与检测</h1>
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
      <nav className="training-stage-stepper px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-sm overflow-x-auto">
        {(
          [
            { id: 'SOLDERING_SAFETY_AND_FIVE_STEPS', num: '1', name: '安全规程与五步法' },
            { id: 'VIRTUAL_PCB_INSERTION_AND_WELD', num: '2', name: '插装极性与施焊' },
            { id: 'SOLDER_JOINT_QUALITY_STANDARD', num: '3', name: '焊点质量形态标准' },
            { id: 'BLIND_PCB_DEFECT_INSPECTION', num: '4', name: '工艺缺陷盲测' },
            { id: 'ENGINEERING_REPAIR_AND_DELIVERY', num: '5', name: '实车修复与量规验收' },
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
                className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
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
          <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
            <span>实训导师 · 陈师傅</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 font-normal">{guidance.title}</span>
          </div>
          <p className="text-sm text-slate-200 mt-0.5 leading-relaxed truncate md:whitespace-normal">
            {hintRequested ? `【提示】${guidance.hint}` : guidance.mentorPrompt}
          </p>
        </div>
        <SpeechControls currentText={hintRequested ? guidance.hint : guidance.mentorPrompt} />
      </section>

      {/* Main Workspace Area */}
      <div className="workspace-main flex-1 p-4 md:p-6 overflow-y-auto">
        {isCompleted ? (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* 真实实物量规验收卡片 */}
            {physicalEvaluation ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-emerald-200 text-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm text-emerald-300">
                      任课教师实物焊接量规核验已通过并存证入库
                    </span>
                  </div>
                  <span className="font-mono font-bold text-base text-emerald-300">
                    实物总分: {physicalEvaluation.totalScore} / 100 分
                  </span>
                </div>
                <div className="text-sm text-slate-300 flex flex-wrap gap-4">
                  <span>验收教师：<strong className="text-white">{physicalEvaluation.teacherName}</strong></span>
                  <span>签署时间：{new Date(physicalEvaluation.signedAt).toLocaleString('zh-CN')}</span>
                  {physicalEvaluation.comment && <span>教师评语：{physicalEvaluation.comment}</span>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-emerald-500/30 text-sm text-slate-300">
                  <div className="bg-slate-900/60 p-2 rounded border border-emerald-500/20">
                    供电前外观: <strong className="text-emerald-400">{physicalEvaluation.rubricData?.pre_power_check ?? 0}/20</strong>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-emerald-500/20">
                    元器件方向: <strong className="text-emerald-400">{physicalEvaluation.rubricData?.component_orientation ?? 0}/20</strong>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-emerald-500/20">
                    焊点润湿质量: <strong className="text-emerald-400">{physicalEvaluation.rubricData?.solder_quality ?? 0}/30</strong>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-emerald-500/20">
                    安全操作自检: <strong className="text-emerald-400">{physicalEvaluation.rubricData?.safety_process ?? 0}/20</strong>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-emerald-500/20">
                    原理缺陷解释: <strong className="text-emerald-400">{physicalEvaluation.rubricData?.evidence_explanation ?? 0}/10</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-2xl text-amber-200 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span>虚拟训练已完成，实物焊接等待任课教师验收</span>
                  </div>
                  <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded text-sm font-bold border border-amber-500/40">
                    待教师现场量规评定
                  </span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  请携带手工焊接完成的 PCB 训练板前往实训工位，由任课教师在教师工作台录入实物量规评语与各维度得分。
                </p>
              </div>
            )}

            <AbilityReport
              levelId="E07"
              domainLabel="工艺规范与焊接"
              title="E07 PCB焊接工艺与实物量规验收实训报告"
              assessment={assessmentResult ?? undefined}
              summaryItems={
                assessmentResult
                  ? (() => {
                      const scored = scoreAssessment(assessmentResult);
                      return [
                        { label: '过程答错记录', value: `${scored.counters.wrongAttempts} 次` },
                        { label: '教学提示使用', value: `${scored.counters.hintRequests} 次` },
                        { label: '仪表安全拦截', value: `${scored.counters.meterGuardBlocks} 次` },
                        { label: '安全违规操作', value: `${scored.counters.unsafeActions} 次` },
                        { label: '阶段重试次数', value: `${scored.counters.retries} 次` },
                        {
                          label: '实际实训耗时',
                          value: `${Math.max(1, Math.round(scored.durationMs / 60_000))} 分钟`,
                        },
                        {
                          label: '实物焊接量规',
                          value: physicalEvaluation
                            ? `${physicalEvaluation.totalScore} 分 (${physicalEvaluation.teacherName} 教师已签署)`
                            : '待任课教师现场验收',
                        },
                      ];
                    })()
                  : undefined
              }
              metrics={stepEvidences}
              nextTask="P6 全阶段实训结业！已具备进入 P7 综合交付挑战全部资质！"
              onRestart={handleRestart}
              onReturn={onReturnLobby}
            />
          </div>
        ) : (
          <E07PcbAssemblyScene
            key={sceneRevision}
            currentStep={currentStep}
            onStepComplete={handleStepComplete}
            onAdvanceStep={handleAdvanceStep}
            hintRequested={hintRequested}
            physicalEvaluation={physicalEvaluation}
            onComplete={(res) => {
              setAssessmentResult(res);
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
                实训任务书 · E07 PCB焊接工艺与检测
              </h3>
              <button
                onClick={() => setShowWorkOrder(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="p-3 bg-slate-800/60 rounded-xl">
                <span className="font-bold text-blue-400">教材目标:</span> 学习任务 18 印制电路板的焊接 (10页)
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
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold"
            >
              已查阅，继续实训
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
