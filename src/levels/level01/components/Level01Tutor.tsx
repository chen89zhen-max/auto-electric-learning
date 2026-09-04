import dialogue from '@/src/levels/level01/dialogue.json';
import type { Level01State } from '@/src/levels/level01/level01Types';

function message(state: Level01State): string {
  if (state.feedback?.startsWith('⚠')) return dialogue.DIRECT_CONTACT_WARNING;
  if (state.currentStage === 'WORK_ORDER') return dialogue.WORK_ORDER;
  if (state.currentStage === 'ACCIDENT_DISCOVERY') return dialogue.ACCIDENT_START;
  if (state.currentStage === 'ENVIRONMENT_CHECK') return dialogue.POWER_ON_HINT;
  if (state.currentStage === 'POWER_ISOLATION' || state.currentStage === 'SHOCK_MICRO_LEARNING') return dialogue.POWER_ISOLATED;
  if (state.currentStage === 'FIRST_AID_ASSESSMENT' || state.currentStage === 'FIRST_AID_ACTION') return dialogue.FIRST_AID_START;
  if (state.currentStage === 'FIRE_EVENT') return dialogue.FIRE_WARNING;
  if (state.currentStage === 'FIRE_RISK_ASSESSMENT' || state.currentStage === 'FIRE_RESPONSE') return dialogue.FIRE_POWER;
  if (state.currentStage === 'TRANSFER_CHECK' || state.currentStage === 'REFLECTION') return dialogue.TRANSFER;
  return dialogue.LEVEL_COMPLETE;
}

export function Level01Tutor({ state }: { state: Level01State }) {
  return <aside className="tutor-panel" aria-label="陈师傅提示"><div className="tutor-title"><span className="avatar">陈</span><div><strong>陈师傅</strong><small>带教技师</small></div></div><div className="message-card" aria-live="polite"><p>{message(state)}</p></div><div className="hint-meter"><span>提示级别</span><strong>{state.hintLevel} / 3</strong></div><div className="tutor-context"><span>当前阶段</span><strong>{state.currentStage.replaceAll('_', ' ')}</strong></div></aside>;
}
