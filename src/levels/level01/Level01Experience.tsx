'use client';

import { ClipboardList, FileJson, GraduationCap, HelpCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { EventLogger } from '@/src/logging/EventLogger';
import { Level01StoreProvider, level01ScenarioEngine, useLevel01Store } from '@/src/stores/level01Store';
import { Level01Scene } from '@/src/levels/level01/scenes/Level01Scene';
import { Level01WorkOrder } from '@/src/levels/level01/components/Level01WorkOrder';
import { Level01Tutor } from '@/src/levels/level01/components/Level01Tutor';
import { Level01Progress } from '@/src/levels/level01/components/Level01Progress';

const taskLabels: Record<string, string> = {
  WORK_ORDER: '阅读安全训练工单',
  ACCIDENT_DISCOVERY: '现在先做什么？',
  ENVIRONMENT_CHECK: '控制仍然存在的危险源',
  POWER_ISOLATION: '理解刚才的电气风险',
  SHOCK_MICRO_LEARNING: '完成触电微情境',
  FIRST_AID_ASSESSMENT: '按顺序判断人员状态',
  FIRST_AID_ACTION: '完成简化急救操作',
  FIRE_EVENT: '判断冒烟设备的风险',
  FIRE_RISK_ASSESSMENT: '控制电源并选择适用器材',
  FIRE_RESPONSE: '在安全范围内模拟处置',
  TRANSFER_CHECK: '把安全原则迁移到新情境',
  REFLECTION: '整理安全处置链',
  COMPLETE: '查看安全作业能力报告',
};

import { LogOut } from 'lucide-react';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { getStudentDisplayName } from '@/src/stores/authStore';

function Level01Game({ onReturnLevel00 }: { onReturnLevel00: () => void }) {
  const { state, dispatch } = useLevel01Store();
  level01ScenarioEngine.getScenario(state.currentStage);


  return (
    <main className="app-shell level01-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark safety-mark"><ShieldCheck size={23} /></span>
          <div>
            <p className="eyebrow">新能源汽车维修中心 · 第二天</p>
            <h1>实训车间突发事故——安全用电</h1>
          </div>
        </div>
        <Level01Progress completed={state.completedObjectives} />
        <div className="trainee-badge">
          <GraduationCap size={18} />
          <span>实训成长称号 · {getStudentDisplayName('见习学员')}</span>
        </div>

        {/* Topbar Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <FullscreenButton />
          <button
            type="button"
            onClick={onReturnLevel00}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
            title="退出当前实训并返回课程地图"
          >
            <LogOut size={15} />
            <span>退出实训</span>
          </button>
        </div>
      </header>
      <section className={state.currentStage === 'COMPLETE' ? 'workspace single' : 'workspace'} aria-label="安全用电实训工作区"><div className="scene-panel"><div className="scene-heading"><span className={state.warningLight ? 'status-dot danger' : 'status-dot'} /><span>{state.currentStage.includes('FIRE') ? '配电区域' : state.currentStage === 'TRANSFER_CHECK' ? '设备检查区' : '2号实训工位'}</span><span className="scene-meta">SEMI GUIDED</span></div><div className="scene-content"><Level01Scene onReturnLevel00={onReturnLevel00} /></div><div className="objective-strip"><span>当前任务</span><strong>{taskLabels[state.currentStage]}</strong>{state.feedback && <output className={state.feedback.startsWith('⚠') ? 'feedback warning' : 'feedback'}>{state.feedback}</output>}</div></div>{state.currentStage !== 'COMPLETE' && <Level01Tutor state={state} />}</section>
      <nav className="bottom-bar" aria-label="安全训练功能栏"><button type="button" onClick={() => dispatch({ type: 'OPEN_WORK_ORDER' })}><ClipboardList size={19} />工单</button><button type="button" onClick={() => dispatch({ type: 'REQUEST_HINT' })}><HelpCircle size={19} />请师傅提示</button><span className="toolbar-spacer" />{process.env.NODE_ENV !== 'production' && <button type="button" onClick={() => EventLogger.download(state.eventLog)}><FileJson size={18} />导出日志</button>}<button type="button" onClick={() => dispatch({ type: 'RESTART' })}><RotateCcw size={18} />重新开始</button></nav>
      <Level01WorkOrder />
    </main>
  );
}

export function Level01Experience({
  onReturnLevel00,
  onReturnLobby,
}: {
  onReturnLevel00?: () => void;
  onReturnLobby?: () => void;
}) {
  const handleReturn = onReturnLobby ?? onReturnLevel00 ?? (() => {});
  return (
    <Level01StoreProvider>
      <Level01Game onReturnLevel00={handleReturn} />
    </Level01StoreProvider>
  );
}

export default Level01Experience;
