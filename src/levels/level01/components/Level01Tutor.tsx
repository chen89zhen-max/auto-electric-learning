'use client';

import { Volume2 } from 'lucide-react';
import dialogue from '@/src/levels/level01/dialogue.json';
import type { Level01State } from '@/src/levels/level01/level01Types';
import { MasterChenAvatar, type MasterChenEmotion } from '@/src/components/visuals/MasterChenAvatar';
import { sounds } from '@/src/components/visuals/SoundEffects';

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

function resolveEmotion(state: Level01State): MasterChenEmotion {
  if (state.feedback?.startsWith('⚠')) return 'WARNING';
  if (state.powerIsolated || state.fireResolved || state.transferPassed) return 'PRAISE';
  if (state.currentStage === 'ACCIDENT_DISCOVERY' || state.currentStage === 'FIRE_EVENT') return 'WARNING';
  if (state.currentStage === 'SHOCK_MICRO_LEARNING') return 'THINKING';
  return 'NORMAL';
}

export function Level01Tutor({ state }: { state: Level01State }) {
  const tutorMsg = message(state);
  const emotion = resolveEmotion(state);

  return (
    <aside className="tutor-panel relative bg-gradient-to-b from-white to-slate-50 border-l border-slate-200 shadow-sm" aria-label="陈师傅提示">
      <div className="tutor-title flex items-center gap-3.5 pb-3 border-b border-slate-200">
        <MasterChenAvatar emotion={emotion} size={58} />
        <div>
          <div className="flex items-center gap-1.5">
            <strong className="text-base font-bold text-slate-800">陈师傅</strong>
            <span className="text-[10px] bg-sky-100 text-sky-800 font-semibold px-1.5 py-0.5 rounded">带教技师</span>
          </div>
          <small className="text-xs text-slate-500 font-medium">车间应急指挥技师</small>
        </div>
      </div>

      <div className="message-card relative my-4 p-4 rounded-xl border-l-4 border-amber-400 bg-amber-50/90 text-slate-800 shadow-xs" aria-live="polite">
        <div className="flex items-start gap-2">
          <p className="text-sm font-semibold leading-relaxed m-0 flex-1">{tutorMsg}</p>
          <button
            type="button"
            className="text-amber-700/60 hover:text-amber-800 transition-colors p-1"
            title="播报语音提示"
            onClick={() => sounds.click()}
          >
            <Volume2 size={16} />
          </button>
        </div>
      </div>

      <div className="hint-meter flex items-center justify-between p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-xs my-2">
        <span className="text-slate-500 font-medium">师傅提示级别</span>
        <strong className="text-amber-700 font-bold">{state.hintLevel} / 3</strong>
      </div>

      <div className="tutor-context mt-auto pt-3 border-t border-slate-200 text-xs">
        <span className="text-slate-400 font-medium">当前处置环节</span>
        <strong className="text-sky-800 font-bold text-sm tracking-wide block mt-1">
          {state.currentStage.replaceAll('_', ' ')}
        </strong>
      </div>
    </aside>
  );
}
