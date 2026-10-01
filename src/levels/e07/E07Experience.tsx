'use client';
import { getLevelDisplayName } from '@/src/courses/curriculum';
import { getNextLevelLabel } from '@/src/courses/curriculum';


import { LevelHeading } from '@/src/components/LevelHeading';

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
import { formatDurationMs } from '@/src/lib/formatDuration';

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
          <LevelHeading levelId="E07" />
        </div>

        <div className="trainee-badge">
          <GraduationCap size={18} />
          <span>见习电工 · {getStudentDisplayName('见习学员')} ({isCompleted ? '已通过验收' : '实训推进中'})</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <FullscreenButton />
          <button type="button" onClick={onReturnLobby} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs" title="退出当前实训并返回课程地图">
            <LogOut size={15} /><span>返回课程大厅</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <section className={isCompleted ? 'workspace single' : 'workspace'} aria-label="E07 实训工作区">
        <div className="scene-panel">
          <div className="scene-heading"><span className={isCompleted ? 'status-dot bg-emerald-500 shadow-emerald-500/20' : 'status-dot bg-blue-500 shadow-blue-500/20'} /><span>电子工艺实训中心 · E07 PCB 焊接工艺与检测</span><span className="scene-meta">{isCompleted ? '等待/完成教师验收' : '5 阶段渐进实训'}</span></div>
          <div className="scene-content" key={sceneRevision}>
        {isCompleted ? (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* 真实实物量规验收卡片 */}
            {physicalEvaluation ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 text-sm space-y-2.5">
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
                <div className="text-sm text-slate-700 flex flex-wrap gap-4">
                  <span>验收教师：<strong className="text-slate-900">{physicalEvaluation.teacherName}</strong></span>
                  <span>签署时间：{new Date(physicalEvaluation.signedAt).toLocaleString('zh-CN')}</span>
                  {physicalEvaluation.comment && <span>教师评语：{physicalEvaluation.comment}</span>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-emerald-200 text-sm text-slate-700">
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    供电前外观: <strong className="text-emerald-400">{physicalEvaluation.rubricData?.pre_power_check ?? 0}/20</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    元器件方向: <strong className="text-emerald-400">{physicalEvaluation.rubricData?.component_orientation ?? 0}/20</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    焊点润湿质量: <strong className="text-emerald-400">{physicalEvaluation.rubricData?.solder_quality ?? 0}/30</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    安全操作自检: <strong className="text-emerald-400">{physicalEvaluation.rubricData?.safety_process ?? 0}/20</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-emerald-200">
                    原理缺陷解释: <strong className="text-emerald-400">{physicalEvaluation.rubricData?.evidence_explanation ?? 0}/10</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span>虚拟训练已完成，实物焊接等待任课教师验收</span>
                  </div>
                  <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded text-sm font-bold border border-amber-500/40">
                    待教师现场量规评定
                  </span>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">
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
                          value: formatDurationMs(scored.durationMs),
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
              nextTask={getNextLevelLabel('E07')}
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
          <div className="objective-strip"><span>当前操作</span><strong>{isCompleted ? '查看焊接能力报告与教师量规验收状态' : guidance.title}</strong><output className="feedback">{isCompleted ? '虚拟训练已完成；实物焊接量规由任课教师现场签署。' : guidance.objective}</output></div>
        </div>
        {!isCompleted && (
          <aside className="tutor-panel" aria-label="陈师傅实训指导">
            <div className="tutor-title flex items-center gap-3.5 pb-3 border-b border-slate-200"><MasterChenAvatar emotion={guidance.mentorEmotion} size={58} /><div><div className="flex items-center gap-1.5"><strong className="text-base font-bold text-slate-800">陈师傅</strong><span className="text-sm bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.5 rounded">带教技师</span></div><small className="text-sm text-slate-500 font-medium">电子焊接工艺指导</small></div></div>
            <div className="message-card relative my-4 p-4 rounded-xl border-l-4 border-blue-500 bg-blue-50/90 text-slate-800 shadow-xs" aria-live="polite"><div className="flex flex-col gap-2"><div className="flex items-center justify-end"><SpeechControls currentText={hintRequested ? guidance.hint : guidance.mentorPrompt} /></div><p className="text-sm font-semibold leading-relaxed m-0">{hintRequested ? guidance.hint : ('“' + guidance.mentorPrompt + '”')}</p></div></div>
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-blue-950"><strong className="block text-sm tracking-wide text-blue-700">本步目标</strong><span className="mt-1 block leading-6">{guidance.objective}</span></div>
            <div className="tutor-context"><span>当前实训环节</span><strong>E07 · PCB 焊接工艺 · {guidance.title.split('：')[0]}</strong></div>
          </aside>
        )}
      </section>

      <nav className="bottom-bar" aria-label="E07 实训功能栏">
        <button type="button" className={showWorkOrder ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => setShowWorkOrder((open) => !open)}><ClipboardList size={19} /> 工单</button>
        <button type="button" className={hintRequested ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => setHintRequested(true)}><HelpCircle size={19} /> 请师傅提示</button>
        <span className="toolbar-spacer" /><span className="unlock-hint">实训要点：安全五步法、元件极性、焊点质量与实物量规验收 · 当前第 {Object.keys(stepEvidences).length + 1} / 5 阶段</span>
        <button type="button" onClick={handleRestart} className="cursor-pointer"><RotateCcw size={18} /> 重新开始</button>
      </nav>

      {/* Floating Work Order Modal */}
      {showWorkOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/35 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                {getLevelDisplayName('E07')} · 实训工单
              </h3>
              <button aria-label="关闭工单" onClick={() => setShowWorkOrder(false)}
                className="text-slate-600 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="p-3 bg-blue-50 rounded-xl">
                <span className="font-bold text-blue-700">学习依据：</span>查看页头“教材与考纲”
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-800">当前实训指引:</span>
                <p className="text-slate-600">{guidance.objective}</p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-800">规范操作动作:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  {guidance.actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button aria-label="关闭工单" onClick={() => setShowWorkOrder(false)}
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
