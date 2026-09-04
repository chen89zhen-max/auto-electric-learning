'use client';

import { Award, Check, GraduationCap, LockKeyhole, Wrench } from 'lucide-react';
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

function ResultPanel() {
  const { dispatch } = useGameStore();
  return <section className="result-panel"><span className="result-seal"><Award size={44} /></span><p className="step-label">新能源汽车维修中心</p><h2>见习技师入职认证</h2><div className="certificate-list">{['已熟悉工作任务', '已熟悉基础操作', '已完成安全准备', '已学会请求教学帮助'].map((item) => <span key={item}><Check size={18} />{item}</span>)}</div><div className="unlock-card"><GraduationCap size={26} /><div><small>下一任务已解锁</small><strong>学习任务1《安全用电》</strong><span>Coming Soon</span></div></div><Button size="lg" className="primary-action result-action" onClick={() => dispatch({ type: 'RETURN_LOBBY' })}>返回任务大厅</Button></section>;
}

function LevelLobby() {
  const { dispatch } = useGameStore();
  return <section className="lobby-panel"><div><p className="step-label">任务大厅</p><h2>见习技师学习路径</h2><p>入职训练已完成，正式课程将在后续 Sprint 开放。</p></div><div className="level-cards"><article className="level-card completed"><span>00</span><div><small>已完成</small><h3>维修中心第一天</h3><p>见习技师入职训练</p></div><Check size={24} /></article><article className="level-card locked"><span>01</span><div><small>Coming Soon</small><h3>安全用电</h3><p>正式学习任务 · 暂未开发</p></div><LockKeyhole size={24} /></article></div><Button size="lg" variant="outline" onClick={() => dispatch({ type: 'RETURN_RESULT' })}>查看入职认证</Button></section>;
}

function GameExperience() {
  const { state } = useGameStore();
  const currentTask = tutorialEngine.getStep(state.currentStage).currentTask;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark"><Wrench size={22} /></span><div><p className="eyebrow">新能源汽车维修中心</p><h1>{levelEngine.config.subtitle}</h1></div></div>
        <TaskProgress completed={state.completedObjectives} />
        <div className="trainee-badge"><GraduationCap size={18} /><span>见习技师 · {state.currentStage === 'COMPLETE' ? '已认证' : '未认证'}</span></div>
      </header>
      <section className={state.currentStage === 'COMPLETE' || state.currentStage === 'REVIEW' ? 'workspace single' : 'workspace'} aria-label="实训工作区">
        <div className="scene-panel">
          <div className="scene-heading"><span className="status-dot" /><span>1号实训工位</span><span className="scene-meta">GUIDED MODE</span></div>
          <div className="scene-content">{state.inLobby ? <LevelLobby /> : state.currentStage === 'REVIEW' ? <ReviewPanel /> : state.currentStage === 'COMPLETE' ? <ResultPanel /> : <WorkshopScene />}</div>
          <div className="objective-strip"><span>当前任务</span><strong>{state.inLobby ? '查看已解锁的学习任务' : currentTask}</strong>{state.feedback && <output className={state.feedback.startsWith('⚠') ? 'feedback warning' : 'feedback'}>{state.feedback}</output>}</div>
        </div>
        {state.currentStage !== 'COMPLETE' && state.currentStage !== 'REVIEW' && <TutorPanel state={state} />}
      </section>
      <BottomToolbar />
      <WorkOrderPanel />
    </main>
  );
}

export function GameShell() {
  return <GameStoreProvider><GameExperience /></GameStoreProvider>;
}
