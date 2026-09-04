import { CheckCircle2 } from 'lucide-react';
import dialogue from '@/src/levels/level00/dialogue.json';
import type { GameState } from '@/src/core/types';

function resolveMessage(state: GameState): string {
  if (state.feedback?.startsWith('不确定')) return dialogue.HELP_UNKNOWN;
  if (state.feedback?.startsWith('⚠')) return dialogue.SAFETY_WARNING;
  if (state.currentStage === 'WELCOME') return dialogue.WELCOME;
  if (state.currentStage === 'READ_WORK_ORDER') return dialogue.WORK_ORDER;
  if (state.currentStage === 'INTERACTION_TUTORIAL') return state.trainingObjectPosition === 'TARGET' ? dialogue.INTERACTION_SUCCESS : dialogue.INTERACTION;
  if (state.currentStage === 'SAFETY_PRECHECK') return state.guardState === 'OPEN' ? dialogue.SAFETY_SUCCESS : dialogue.SAFETY_WARNING;
  if (state.currentStage === 'HELP_TUTORIAL') return state.helpRequested ? dialogue.HELP : '这个内容后面的课程才会学习。';
  if (state.currentStage === 'REVIEW') return '回想刚才的操作，完成两项确认。';
  return dialogue.COMPLETE;
}

export function TutorPanel({ state }: { state: GameState }) {
  return (
    <aside className="tutor-panel" aria-label="陈师傅提示">
      <div className="tutor-title">
        <span className="avatar">陈</span>
        <div><strong>陈师傅</strong><small>带教技师</small></div>
        {state.helpRequested && <CheckCircle2 className="tutor-ready" size={22} aria-label="帮助面板已开启" />}
      </div>
      <div className="message-card" aria-live="polite"><p>{resolveMessage(state)}</p></div>
      <div className="tutor-context">
        <span>当前阶段</span>
        <strong>{state.currentStage.replaceAll('_', ' ')}</strong>
      </div>
    </aside>
  );
}
