'use client';
import { getLevelDisplayName, getNextLevelLabel } from '@/src/courses/curriculum';

import { LevelHeading } from '@/src/components/LevelHeading';

import React, { useState } from 'react';
import {
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  LogOut,
  RotateCcw,
} from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { AbilityReport } from '@/src/components/AbilityReport';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { getCurrentUser, getStudentDisplayName } from '@/src/stores/authStore';
import { getLevelProgress, getUserProgress } from '@/src/stores/userProgressStore';
import { useLevelAssessment } from '@/src/assessment/useLevelAssessment';
import type { LevelAssessmentResult, TrainingStageId } from '@/src/assessment/assessmentTypes';
import {
  F01_STAGE_CONTENT,
  F01_STAGE_ORDER,
  F01_FAULT_COPY,
} from './f01Training';
import {
  applyF01Action,
  createF01Model,
  evaluateF01Stage,
  measureF01,
  selectF01ScenarioSeed,
  type F01Action,
  type F01CompletionMetrics,
  type F01FunctionalCase,
  type F01MeasurementRecord,
  type F01MeterRequest,
  type F01Seed,
  type F01Stage,
  type F01StageSubmission,
} from './f01Model';
import { F01IntegratedDeliveryScene } from './F01IntegratedDeliveryScene';

interface F01ExperienceProps {
  onReturnLobby: () => void;
}

const stageToAssessment: Record<F01Stage, TrainingStageId> = {
  WORK_ORDER_AND_HYPOTHESIS: 'cognition',
  SAFETY_AND_TEST_PLAN: 'standard',
  EXPECTED_VALUE_CALCULATION: 'calculation',
  BLIND_DIAGNOSIS_AND_REPAIR: 'blind_test',
  FUNCTION_RETEST_AND_DEFENSE: 'transfer',
};

export function F01Experience({ onReturnLobby }: F01ExperienceProps) {
  const currentUser = getCurrentUser();
  const progress = getUserProgress();
  const attemptOrdinal = (getLevelProgress('F01', progress).attemptCount ?? 0) + 1;

  const [seed] = useState<F01Seed>(() =>
    currentUser?.role === 'student'
      ? selectF01ScenarioSeed(currentUser.username, attemptOrdinal)
      : 'F01-A',
  );

  const assessment = useLevelAssessment('F01');
  const [stage, setStage] = useState<F01Stage>('WORK_ORDER_AND_HYPOTHESIS');
  const [model, setModel] = useState(() => createF01Model(seed));
  const [feedback, setFeedback] = useState<{ kind: 'status' | 'alert'; message: string } | null>(null);

  const [measurementLog, setMeasurementLog] = useState<F01MeasurementRecord[]>([]);
  const [functionalMatrix, setFunctionalMatrix] = useState<F01FunctionalCase[]>([]);
  const [, setDefenseEvidenceIds] = useState<string[]>([]);
  const [hintRequested, setHintRequested] = useState(false);
  const [showWorkOrder, setShowWorkOrder] = useState(false);

  const [isCompleted, setIsCompleted] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<LevelAssessmentResult | null>(null);
  const [completionMetrics, setCompletionMetrics] = useState<F01CompletionMetrics | null>(null);

  const stageIndex = F01_STAGE_ORDER.indexOf(stage);
  const guidance = F01_STAGE_CONTENT[stage];
  const mentorText = hintRequested ? guidance.hint : guidance.mentorPrompt;

  function handleAction(action: F01Action) {
    const transition = applyF01Action(model, action);
    if (!transition.allowed) {
      if (transition.code === 'WRONG_REPAIR') assessment.recordWrong(stageToAssessment[stage]);
      if (transition.code === 'PREPOWER_INTERLOCK') assessment.recordUnsafeAction(stageToAssessment[stage]);
      setFeedback({ kind: 'alert', message: transition.message ?? '操作未执行' });
      return;
    }
    setModel(transition.state);
  }

  function handleMeasure(request: F01MeterRequest) {
    const result = measureF01(model, request);
    if (result.kind === 'blocked') {
      assessment.recordMeterBlocked(stageToAssessment[stage]);
      if (result.code === 'LIVE_RESISTANCE' || result.code === 'DANGEROUS_BRIDGE') {
        assessment.recordUnsafeAction(stageToAssessment[stage]);
      }
      setFeedback({ kind: 'alert', message: result.message });
      return;
    }
    const id = `${model.seed}-${request.target}-${Date.now()}`;
    setMeasurementLog((records) => [
      ...records,
      {
        id,
        target: request.target,
        mode: request.mode,
        value: result.value,
        unit: result.unit,
      },
    ]);
    setFeedback({ kind: 'status', message: `测量结果 ${result.value} ${result.unit} 已记录` });
  }

  function handleStageSubmit(submission: F01StageSubmission) {
    const evaluation = evaluateF01Stage(stage, model, submission);
    if (!evaluation.passed) {
      assessment.recordWrong(stageToAssessment[stage]);
      setFeedback({
        kind: 'alert',
        message: `未满足本阶段完成条件：${evaluation.missing.join('；')}`,
      });
      return;
    }

    assessment.completeStage(stageToAssessment[stage]);
    setHintRequested(false);

    const currentIndex = F01_STAGE_ORDER.indexOf(stage);
    if (currentIndex < F01_STAGE_ORDER.length - 1) {
      const nextStage = F01_STAGE_ORDER[currentIndex + 1];
      setStage(nextStage);
      assessment.startStage(stageToAssessment[nextStage]);
      setFeedback({ kind: 'status', message: `${guidance.title}已完成，进入${F01_STAGE_CONTENT[nextStage].title}` });
    } else {
      // Stage 5 complete
      if (submission.stage === 'FUNCTION_RETEST_AND_DEFENSE') {
        const result = assessment.completeLevel();
        setAssessmentResult(result);
        setCompletionMetrics(submission.metrics);
        setIsCompleted(true);
        setFeedback({ kind: 'status', message: '全阶段终检验收完成！' });
      }
    }
  }

  function handleRestart() {
    assessment.retryStage(stageToAssessment[stage]);
    setStage('WORK_ORDER_AND_HYPOTHESIS');
    setModel(createF01Model(seed));
    setMeasurementLog([]);
    setFunctionalMatrix([]);
    setDefenseEvidenceIds([]);
    setHintRequested(false);
    setShowWorkOrder(false);
    setIsCompleted(false);
    setAssessmentResult(null);
    setCompletionMetrics(null);
    setFeedback({ kind: 'status', message: '场景已重置，本轮考试开始时间与过程扣分保留，本轮计时继续。' });
  }

  function handleHint() {
    assessment.requestHint(stageToAssessment[stage]);
    setHintRequested(true);
  }

  return (
    <main className="app-shell f01-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark bg-amber-600 text-white">
            <ClipboardCheck size={22} />
          </span>
          <LevelHeading levelId="F01"><p className="level-heading-subtitle">阶段 {stageIndex + 1}/5</p></LevelHeading>
        </div>
        <div className="trainee-badge">
          <GraduationCap size={18} />
          <span>综合考核学员 · {getStudentDisplayName('见习学员')}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <FullscreenButton />
          <button type="button" onClick={onReturnLobby} aria-label="返回课程大厅">
            <LogOut size={16} />
            <span>返回课程大厅</span>
          </button>
        </div>
      </header>

      <section className={isCompleted ? 'workspace single' : 'workspace'} aria-label="F01 实训工作区">
        <div className="scene-panel">
          <div className="scene-heading">
            <span className="status-dot bg-amber-500" />
            <span>综合交付工位 · 智能检修灯控制总成</span>
            <span className="scene-meta">智能检修灯综合工单考核</span>
          </div>
          <div className="scene-content">
            {isCompleted ? (
              <AbilityReport
                levelId="F01"
                domainLabel="篇章六 · 智能检修灯综合工单交付"
                title="F01 智能检修灯综合实训 · 能力报告"
                assessment={assessmentResult ?? undefined}
                metrics={completionMetrics ?? undefined}
                nextTask={getNextLevelLabel('F01')}
                onRestart={handleRestart}
                onReturn={onReturnLobby}
              />
            ) : (
              <F01IntegratedDeliveryScene
                stage={stage}
                model={model}
                measurementLog={measurementLog}
                functionalMatrix={functionalMatrix}
                feedback={feedback}
                onAction={handleAction}
                onMeasure={handleMeasure}
                onSubmitStage={handleStageSubmit}
                onSelectDefenseEvidence={setDefenseEvidenceIds}
              />
            )}
          </div>
          <div className="objective-strip">
            <span>当前操作</span>
            <strong>{guidance.title}</strong>
            <span className="feedback">{feedback?.message || guidance.objective}</span>
          </div>
        </div>

        {!isCompleted && (
          <aside className="tutor-panel" aria-label="陈师傅实训指导">
            <div className="tutor-title">
              <MasterChenAvatar emotion="THINKING" size={58} />
              <div>
                <strong className="text-base">陈师傅</strong>
                <small className="block text-sm">综合交付考核指导</small>
              </div>
            </div>
            <div className="message-card" aria-live="polite">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-end">
                  <SpeechControls currentText={mentorText} />
                </div>
                <p className="m-0 text-sm font-semibold leading-relaxed">{mentorText}</p>
              </div>
            </div>
          </aside>
        )}
      </section>

      <nav className="bottom-bar" aria-label="F01 实训功能栏">
        <button type="button" onClick={() => setShowWorkOrder(true)}>
          <ClipboardList size={19} />
          <span>工单</span>
        </button>
        <button type="button" onClick={handleHint}>
          <HelpCircle size={19} />
          <span>请师傅提示</span>
        </button>
        <span className="toolbar-spacer" />
        <span className="unlock-hint">综合考核：识图、安全、计算、测量、诊断、复检与证据表达</span>
        <button type="button" onClick={handleRestart}>
          <RotateCcw size={18} />
          <span>重新开始</span>
        </button>
      </nav>

      {/* Work Order Modal */}
      {showWorkOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-lg space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-base font-bold text-amber-400">{getLevelDisplayName('F01')} · 实训工单</h3>
              <button
                type="button"
                onClick={() => setShowWorkOrder(false)}
                className="text-slate-600 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-sm">工单编号：WO-F01-FINAL</p>
            <p className="text-sm">故障现象：{F01_FAULT_COPY[model.seed].workOrderSymptom}</p>
            <p className="text-sm text-slate-400">
              本实训模型参数：低压电源12V（内阻1Ω），检修灯负载5Ω，控制分压5V（上支路1kΩ，下支路1kΩ），逻辑阈值2.0V。
            </p>
            <p className="rounded-lg bg-amber-950/60 border border-amber-800/60 p-2.5 text-sm text-amber-300">
              工单提示：本工单仅针对本样本综合实训任务进行考核验收，不推断全课程、全部考纲或官方考试通过。
            </p>
            <button
              type="button"
              onClick={() => setShowWorkOrder(false)}
              className="w-full rounded-lg bg-amber-600 py-2 text-sm font-bold text-white transition hover:bg-amber-500"
            >
              关闭工单
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
