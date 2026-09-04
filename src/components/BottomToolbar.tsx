'use client';

import { ClipboardList, FileJson, HelpCircle, ListChecks, RotateCcw } from 'lucide-react';
import { EventLogger } from '@/src/logging/EventLogger';
import { useGameStore } from '@/src/stores/gameStore';

export function BottomToolbar() {
  const { state, dispatch } = useGameStore();
  const available = (feature: string) => state.unlockedFeatures.includes(feature as never);

  return (
    <nav className="bottom-bar" aria-label="功能栏">
      <button type="button" className={available('WORK_ORDER') ? 'tool-active' : ''} disabled={!available('WORK_ORDER')} onClick={() => dispatch({ type: 'OPEN_WORK_ORDER' })}><ClipboardList size={19} />工单</button>
      <button type="button" disabled={!available('CURRENT_TASK')}><ListChecks size={19} />当前任务</button>
      <button type="button" disabled={!available('HELP')} onClick={() => state.currentStage === 'HELP_TUTORIAL' && dispatch({ type: 'REQUEST_HELP' })}><HelpCircle size={19} />请师傅提示</button>
      <button type="button" disabled={!available('LEARNING_RECORD')}><ListChecks size={19} />学习记录</button>
      <span className="toolbar-spacer" />
      {process.env.NODE_ENV !== 'production' && <button type="button" onClick={() => EventLogger.download(state.eventLog)}><FileJson size={18} />导出日志</button>}
      <button type="button" onClick={() => dispatch({ type: 'RESTART' })}><RotateCcw size={18} />重新开始</button>
    </nav>
  );
}
