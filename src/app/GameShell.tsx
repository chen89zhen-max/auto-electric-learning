'use client';

import { useState, useMemo } from 'react';
import { GraduationCap, Lock, LogOut, Wrench } from 'lucide-react';
import { GameStoreProvider, useGameStore } from '@/src/stores/gameStore';
import { levelEngine } from '@/src/engine/LevelEngine';
import { tutorialEngine } from '@/src/engine/TutorialEngine';
import { WorkshopScene } from '@/src/game/scenes/WorkshopScene';
import { WorkOrderPanel } from '@/src/components/WorkOrderPanel';
import { TaskProgress } from '@/src/components/TaskProgress';
import { TutorPanel } from '@/src/components/TutorPanel';
import { BottomToolbar } from '@/src/components/BottomToolbar';
import { ReviewPanel } from '@/src/components/ReviewPanel';
import { Level01Experience } from '@/src/levels/level01/Level01Experience';
import { Level02Experience } from '@/src/levels/level02/Level02Experience';
import { A02Experience } from '@/src/levels/a02/A02Experience';
import { A03Experience } from '@/src/levels/a03/A03Experience';
import { A04Experience } from '@/src/levels/a04/A04Experience';
import { B01Experience } from '@/src/levels/b01/B01Experience';
import { B02Experience } from '@/src/levels/b02/B02Experience';
import { B03Experience } from '@/src/levels/b03/B03Experience';
import { B04Experience } from '@/src/levels/b04/B04Experience';
import { B05Experience } from '@/src/levels/b05/B05Experience';
import { B06Experience } from '@/src/levels/b06/B06Experience';
import { C01Experience } from '@/src/levels/c01/C01Experience';
import { C02Experience } from '@/src/levels/c02/C02Experience';
import { C03Experience } from '@/src/levels/c03/C03Experience';
import { D01Experience } from '@/src/levels/d01/D01Experience';
import { D02Experience } from '@/src/levels/d02/D02Experience';
import { D03Experience } from '@/src/levels/d03/D03Experience';
import { D04Experience } from '@/src/levels/d04/D04Experience';
import { D05Experience } from '@/src/levels/d05/D05Experience';
import { E01Experience } from '@/src/levels/e01/E01Experience';
import { E02Experience } from '@/src/levels/e02/E02Experience';
import { E03Experience } from '@/src/levels/e03/E03Experience';
import { E04Experience } from '@/src/levels/e04/E04Experience';
import { E05Experience } from '@/src/levels/e05/E05Experience';
import { E06Experience } from '@/src/levels/e06/E06Experience';
import { E07Experience } from '@/src/levels/e07/E07Experience';
import { AbilityReport } from '@/src/components/AbilityReport';
import { CourseMapLobby } from '@/src/components/CourseMapLobby';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { getStudentDisplayName, useAuth } from '@/src/stores/authStore';
import { ChangePasswordGate } from '@/src/components/auth/ChangePasswordGate';
import { SystemAdminConsole } from '@/src/components/admin/SystemAdminConsole';
import { TeacherDashboard } from '@/src/components/teacher/TeacherDashboard';
import { resolveRequestedLevel } from '@/src/app/levelRoute';
import { useUserProgress } from '@/src/stores/userProgressStore';
import { checkLevelPrerequisites, normalizeLevelId } from '@/src/courses/registry';

function ResultPanel({ onReturnHome }: { onReturnHome: () => void }) {
  const { dispatch } = useGameStore();

  return (
    <AbilityReport
      levelId="LEVEL_00"
      domainLabel="技能领域 · 车间入职认知"
      title="见习学员入职培训能力报告"
      dimensions={[
        { id: 'WORK_ORDER', label: '工作任务认知', stars: 5 },
        { id: 'BASIC_OP', label: '基础工具操作', stars: 5 },
        { id: 'SAFETY_PREP', label: '安全着装准备', stars: 5 },
        { id: 'HELP_SEEKING', label: '教学求助规范', stars: 5 },
        { id: 'FLOW_STANDARD', label: '工位交接流程', stars: 5 },
      ]}
      summaryItems={[
        { label: '操作违规尝试', value: '0 次' },
        { label: '工作任务理解', value: '已熟悉' },
        { label: '安全准备规范', value: '已完成' },
        { label: '教学帮助响应', value: '已掌握' },
        { label: '工单流程交接', value: '已确认' },
        { label: '本关用时', value: '1 分钟' },
      ]}
      nextTask="学习任务1《安全用电》"
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
          <div>
            <p className="eyebrow">新能源汽车维修中心 · 第一天</p>
            <h1>{levelEngine.config.subtitle}</h1>
          </div>
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
            <span>当前任务</span>
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

export function GameShell() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <main className="min-h-screen flex items-center justify-center">正在核验安全会话…</main>;
  return <SessionGameShell key={`${user?.role ?? 'guest'}:${user?.username ?? ''}`} />;
}

function SessionGameShell() {
  const { user, isLoading } = useAuth();
  const progress = useUserProgress();
  const isTeacherOrAdmin = progress.teacherMode || user?.role === 'admin' || user?.role === 'teacher';

  const completedLevelIds = useMemo(() => {
    return Object.entries(progress.levels)
      .filter(([, v]) => v.status === 'completed')
      .map(([id]) => normalizeLevelId(id));
  }, [progress.levels]);

  // Home is the default view when user opens or refreshes the page!
  const [activeLevel, setActiveLevel] = useState<string>(() => typeof window === 'undefined' ? 'HOME' : resolveRequestedLevel(window.location.search));

  const handleReturnHome = () => {
    setActiveLevel('HOME');
    if (typeof window !== 'undefined') window.history.replaceState(null, '', window.location.pathname);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
        正在核验安全会话…
      </main>
    );
  }

  if (user?.mustChangePassword) {
    return <ChangePasswordGate user={user} />;
  }

  if (user?.role === 'admin') {
    return <SystemAdminConsole />;
  }

  if (user?.role === 'teacher') {
    return <TeacherDashboard />;
  }

  // Enforce student prerequisites on activeLevel
  if (activeLevel !== 'HOME') {
    const normalized = normalizeLevelId(activeLevel);
    if (!isTeacherOrAdmin) {
      const prereqCheck = checkLevelPrerequisites(normalized, completedLevelIds);
      if (!prereqCheck.allowed) {
        return (
          <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full p-6 bg-slate-900 border-2 border-rose-500/60 rounded-2xl shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3 text-rose-400">
                <Lock size={28} className="shrink-0" />
                <h2 className="text-lg font-bold">关卡未解锁：前置课程尚未完成</h2>
              </div>
              <p className="text-sm text-slate-300">
                当前关卡【<strong className="text-amber-400">{normalized}</strong>】设置了严格的教学先决条件。为保障技能链条完整与实训安全，必须先按序完成以下前置课程：
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-xs font-semibold text-slate-400">未满足的前置课程：</span>
                <ul className="list-disc list-inside text-xs text-rose-300 space-y-1">
                  {prereqCheck.missingPrerequisites.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={handleReturnHome}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl cursor-pointer transition-colors"
              >
                返回课程大厅
              </button>
            </div>
          </main>
        );
      }
    }
  }

  if (activeLevel === 'A02') {
    return <A02Experience onReturnLobby={handleReturnHome} />;
  }

  if (activeLevel === 'A03' || activeLevel === 'LEVEL_03') {
    return <A03Experience onReturnLobby={handleReturnHome} />;
  }

  if (activeLevel === 'A04' || activeLevel === 'LEVEL_04') {
    return <A04Experience onReturnLobby={handleReturnHome} />;
  }

  if (activeLevel === 'B01') return <B01Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'B02') return <B02Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'B03') return <B03Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'B04') return <B04Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'B05') return <B05Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'B06') return <B06Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'C01') return <C01Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'C02' || activeLevel === 'LEVEL_08') return <C02Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'C03' || activeLevel === 'LEVEL_09') return <C03Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'D01' || activeLevel === 'LEVEL_05') return <D01Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'D02') return <D02Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'D03') return <D03Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'D04') return <D04Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'D05') return <D05Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'E01') return <E01Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'E02') return <E02Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'E03') return <E03Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'E04' || activeLevel === 'LEVEL_07') return <E04Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'E05' || activeLevel === 'LEVEL_06') return <E05Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'E06') return <E06Experience onReturnLobby={handleReturnHome} />;
  if (activeLevel === 'E07') return <E07Experience onReturnLobby={handleReturnHome} />;

  if (activeLevel === 'LEVEL_02' || activeLevel === 'A01') {
    return <Level02Experience onReturnLobby={handleReturnHome} />;
  }

  if (activeLevel === 'LEVEL_01' || activeLevel === 'O01') {
    return <Level01Experience onReturnLevel00={handleReturnHome} />;
  }

  if (activeLevel === 'LEVEL_00' || activeLevel === 'O00') {
    return (
      <GameStoreProvider>
        <GameExperience onReturnHome={handleReturnHome} />
      </GameStoreProvider>
    );
  }

  // Default: Full Interactive Course Map
  return (
    <CourseMapLobby
      onSelectLevel={(levelId) => {
        setActiveLevel(levelId);
        if (typeof window !== 'undefined') window.history.pushState(null, '', `${window.location.pathname}?level=${encodeURIComponent(levelId)}`);
      }}
    />
  );
}
