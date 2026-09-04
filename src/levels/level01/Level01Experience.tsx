'use client';

import { ClipboardList, FileJson, GraduationCap, HelpCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { EventLogger } from '@/src/logging/EventLogger';
import { Level01StoreProvider, level01ScenarioEngine, useLevel01Store } from '@/src/stores/level01Store';
import { AccidentScene } from '@/src/levels/level01/scenes/AccidentScene';
import { Level01WorkOrder } from '@/src/levels/level01/components/Level01WorkOrder';
import { Level01Tutor } from '@/src/levels/level01/components/Level01Tutor';
import { Level01Progress } from '@/src/levels/level01/components/Level01Progress';

function Level01Game() {
  const { state, dispatch } = useLevel01Store();
  const scenario = level01ScenarioEngine.getScenario(state.currentStage);
  return (
    <main className="app-shell level01-shell">
      <header className="topbar"><div className="brand-lockup"><span className="brand-mark safety-mark"><ShieldCheck size={23} /></span><div><p className="eyebrow">新能源汽车维修中心 · 第二天</p><h1>实训车间突发事故——安全用电</h1></div></div><Level01Progress completed={state.completedObjectives} /><div className="trainee-badge"><GraduationCap size={18} /><span>见习技师 · 安全训练</span></div></header>
      <section className="workspace" aria-label="安全用电实训工作区"><div className="scene-panel"><div className="scene-heading"><span className={state.warningLight ? 'status-dot danger' : 'status-dot'} /><span>{state.currentStage.includes('FIRE') ? '配电区域' : '2号实训工位'}</span><span className="scene-meta">SEMI GUIDED</span></div><div className="scene-content"><AccidentScene /></div><div className="objective-strip"><span>当前任务</span><strong>{scenario.id.replaceAll('_', ' ')}</strong>{state.feedback && <output className={state.feedback.startsWith('⚠') ? 'feedback warning' : 'feedback'}>{state.feedback}</output>}</div></div><Level01Tutor state={state} /></section>
      <nav className="bottom-bar" aria-label="安全训练功能栏"><button type="button" onClick={() => dispatch({ type: 'OPEN_WORK_ORDER' })}><ClipboardList size={19} />工单</button><button type="button" onClick={() => dispatch({ type: 'REQUEST_HINT' })}><HelpCircle size={19} />请师傅提示</button><span className="toolbar-spacer" />{process.env.NODE_ENV !== 'production' && <button type="button" onClick={() => EventLogger.download(state.eventLog)}><FileJson size={18} />导出日志</button>}<button type="button" onClick={() => dispatch({ type: 'RESTART' })}><RotateCcw size={18} />重新开始</button></nav>
      <Level01WorkOrder />
    </main>
  );
}

export function Level01Experience() {
  return <Level01StoreProvider><Level01Game /></Level01StoreProvider>;
}
