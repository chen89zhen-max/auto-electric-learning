'use client';
import { getNextLevelLabel } from '@/src/courses/curriculum';


import { LevelHeading } from '@/src/components/LevelHeading';

import React from 'react';
import { GraduationCap, LogOut, Wrench } from 'lucide-react';
import { GameStoreProvider, useGameStore } from '@/src/stores/gameStore';
import { tutorialEngine } from '@/src/engine/TutorialEngine';
import { WorkshopScene } from '@/src/game/scenes/WorkshopScene';
import { WorkOrderPanel } from '@/src/components/WorkOrderPanel';
import { TaskProgress } from '@/src/components/TaskProgress';
import { TutorPanel } from '@/src/components/TutorPanel';
import { BottomToolbar } from '@/src/components/BottomToolbar';
import { ReviewPanel } from '@/src/components/ReviewPanel';
import { AbilityReport } from '@/src/components/AbilityReport';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { formatDurationMs } from '@/src/lib/formatDuration';

type LegacyProcessCounters = {
  wrongAttempts?: number;
  hintRequests?: number;
  meterGuardBlocks?: number;
  unsafeActions?: number;
  retries?: number;
  durationMs?: number;
};

function buildProcessScore(counters: LegacyProcessCounters) {
  const penalty =
    0.12 * (counters.wrongAttempts ?? 0) +
    0.15 * (counters.hintRequests ?? 0) +
    0.20 * (counters.meterGuardBlocks ?? 0) +
    0.30 * (counters.unsafeActions ?? 0) +
    0.05 * (counters.retries ?? 0);
  return Math.round(Math.max(0, Math.min(1, 1 - penalty)) * 100);
}

function starsForScore(score: number) {
  return score >= 90 ? 5 : score >= 80 ? 4 : score >= 70 ? 3 : score >= 60 ? 2 : 1;
}

export function buildLevel00ProcessReport(counters: LegacyProcessCounters) {
  const score = buildProcessScore(counters);
  const stars = starsForScore(score);
  return {
    score,
    dimensions: [
      { id: 'WORK_ORDER', label: '工作任务认知', stars },
      { id: 'BASIC_OP', label: '基础工具操作', stars },
      { id: 'SAFETY_PREP', label: '安全着装准备', stars },
      { id: 'HELP_SEEKING', label: '教学求助规范', stars },
      { id: 'FLOW_STANDARD', label: '工位交接流程', stars },
    ],
    summaryItems: [
      { label: '过程答错记录', value: `${counters.wrongAttempts ?? 0} 次` },
      { label: '教学提示使用', value: `${counters.hintRequests ?? 0} 次` },
      { label: '安全违规操作', value: `${counters.unsafeActions ?? 0} 次` },
      { label: '本关用时', value: formatDurationMs(counters.durationMs ?? 0) },
    ],
  };
}

export interface Level00ExperienceProps {
  onReturnLobby: () => void;
}

function ResultPanel({ onReturnHome }: { onReturnHome: () => void }) {
  const { dispatch, state } = useGameStore();
  const events = state.eventLog;
  const start = events.find((event) => event.action === 'LEVEL_START');
  const completed = [...events].reverse().find((event) => event.action === 'LEVEL_COMPLETE');
  const report = buildLevel00ProcessReport({
    unsafeActions: events.filter((event) => event.action === 'UNSAFE_ACTION_ATTEMPT').length,
    hintRequests: events.filter((event) => event.action === 'HELP_REQUESTED').length,
    wrongAttempts: events.filter((event) => event.action === 'REVIEW_COMPLETE' && event.payload.correct === false).length,
    durationMs: start && completed ? Math.max(0, Date.parse(completed.timestamp) - Date.parse(start.timestamp)) : 0,
  });

  return (
    <AbilityReport
      levelId="O00"
      domainLabel="序章 · 车间准入与安全规范"
      title="O00 走进实训中心 · 能力报告"
      dimensions={report.dimensions}
      score={report.score}
      summaryItems={report.summaryItems}
      nextTask={getNextLevelLabel('O00')}
      onRestart={() => dispatch({ type: 'RESTART' })}
      onReturn={() => {
        dispatch({ type: 'RETURN_LOBBY' });
        onReturnHome();
      }}
    />
  );
}

function GameExperience({
  onReturnHome,
}: {
  onReturnHome: () => void;
}) {
  const { state } = useGameStore();
  const currentTask = tutorialEngine.getStep(state.currentStage).currentTask;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark"><Wrench size={22} /></span>
          <LevelHeading levelId="O00" />
        </div>
        <TaskProgress completed={state.completedObjectives} />
        <div className="trainee-badge">
          <GraduationCap size={18} />
          <span>见习学员 · {getStudentDisplayName('见习学员')} ({state.currentStage === 'COMPLETE' ? '已完成' : '学习中'})</span>
        </div>

        {/* Topbar Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <FullscreenButton />
          <button
            type="button"
            onClick={onReturnHome}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="退出当前实训并返回课程地图"
          >
            <LogOut size={15} />
            <span>退出实训</span>
          </button>
        </div>
      </header>
      <section className={state.currentStage === 'COMPLETE' || state.currentStage === 'REVIEW' ? 'workspace single' : 'workspace'} aria-label="实训工作区">
        <div className="scene-panel">
          <div className="scene-heading">
            <span className="status-dot" />
            <span>1号实训工位</span>
            <span className="scene-meta">GUIDED MODE</span>
          </div>
          <div className="scene-content">
            {state.currentStage === 'REVIEW' ? (
              <ReviewPanel />
            ) : state.currentStage === 'COMPLETE' ? (
              <ResultPanel onReturnHome={onReturnHome} />
            ) : (
              <WorkshopScene />
            )}
          </div>
          <div className="objective-strip">
            <span>当前操作</span>
            <strong>{currentTask}</strong>
            {state.feedback && (
              <output className={state.feedback.startsWith('⚠') ? 'feedback warning' : 'feedback'}>
                {state.feedback}
              </output>
            )}
          </div>
        </div>
        {state.currentStage !== 'COMPLETE' && state.currentStage !== 'REVIEW' && <TutorPanel state={state} />}
      </section>
      <BottomToolbar />
      <WorkOrderPanel />
    </main>
  );
}

export function Level00Experience({ onReturnLobby }: Level00ExperienceProps) {
  return (
    <GameStoreProvider>
      <GameExperience onReturnHome={onReturnLobby} />
    </GameStoreProvider>
  );
}

export default Level00Experience;
