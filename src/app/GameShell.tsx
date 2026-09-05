'use client';

import { useEffect, useState } from 'react';
import { Award, Check, GraduationCap, LogOut, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { CourseMapLobby } from '@/src/components/CourseMapLobby';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { LevelId, markLevelComplete } from '@/src/stores/userProgressStore';
import { getStudentDisplayName, useAuth } from '@/src/stores/authStore';
import { ChangePasswordGate } from '@/src/components/auth/ChangePasswordGate';
import { SystemAdminConsole } from '@/src/components/admin/SystemAdminConsole';
import { TeacherDashboard } from '@/src/components/teacher/TeacherDashboard';

function ResultPanel({ onReturnHome }: { onReturnHome: () => void }) {
  const { dispatch } = useGameStore();

  useEffect(() => {
    // Automatically save Level 00 completion & unlock Level 01
    markLevelComplete('LEVEL_00', 100);
  }, []);

  return (
    <section className="result-panel">
      <span className="result-seal"><Award size={44} /></span>
      <p className="step-label">新能源汽车维修中心</p>
      <h2>见习技师入职认证</h2>
      <div className="certificate-list">
        {['已熟悉工作任务', '已熟悉基础操作', '已完成安全准备', '已学会请求教学帮助'].map((item) => (
          <span key={item}><Check size={18} />{item}</span>
        ))}
      </div>
      <div className="unlock-card">
        <GraduationCap size={26} />
        <div>
          <small>下一任务已解锁</small>
          <strong>学习任务1《安全用电》</strong>
          <span>已开放</span>
        </div>
      </div>
      <Button
        size="lg"
        className="primary-action result-action"
        onClick={() => {
          dispatch({ type: 'RETURN_LOBBY' });
          onReturnHome();
        }}
      >
        返回课程地图
      </Button>
    </section>
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
          <span>见习技师 · {getStudentDisplayName('见习学员')} ({state.currentStage === 'COMPLETE' ? '已认证' : '未认证'})</span>
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
  // Home is the default view when user opens or refreshes the page!
  const [activeLevel, setActiveLevel] = useState<'HOME' | LevelId>('HOME');

  const handleReturnHome = () => {
    setActiveLevel('HOME');
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

  if (activeLevel === 'LEVEL_02') {
    return <Level02Experience onReturnLobby={handleReturnHome} />;
  }

  if (activeLevel === 'LEVEL_01') {
    return <Level01Experience onReturnLevel00={handleReturnHome} />;
  }

  if (activeLevel === 'LEVEL_00') {
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
      }}
    />
  );
}
