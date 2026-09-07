'use client';

import { CheckCircle2 } from 'lucide-react';
import dialogue from '@/src/levels/level00/dialogue.json';
import type { GameState } from '@/src/core/types';
import { MasterChenAvatar, type MasterChenEmotion } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';

function resolveMessage(state: GameState): string {
  if (state.feedback?.startsWith('不确定')) return dialogue.HELP_UNKNOWN;
  if (state.feedback?.startsWith('⚠')) return dialogue.SAFETY_WARNING;
  if (state.currentStage === 'WELCOME') return dialogue.WELCOME;
  if (state.currentStage === 'READ_WORK_ORDER') return dialogue.WORK_ORDER;
  if (state.currentStage === 'INTERACTION_TUTORIAL') return state.trainingObjectPosition === 'TARGET' ? dialogue.INTERACTION_SUCCESS : dialogue.INTERACTION;
  if (state.currentStage === 'SAFETY_PRECHECK') return state.guardState === 'OPEN' ? dialogue.SAFETY_SUCCESS : dialogue.SAFETY_WARNING;
  if (state.currentStage === 'HELP_TUTORIAL') return state.helpRequested ? dialogue.HELP : '这个高压控制器后面的课程才会学习，先不要盲目通电。';
  if (state.currentStage === 'REVIEW') return '回想刚才的操作，完成两项确认。';
  return dialogue.COMPLETE;
}

function resolveEmotion(state: GameState): MasterChenEmotion {
  if (state.feedback?.startsWith('⚠')) return 'WARNING';
  if (state.feedback?.startsWith('✓') || state.completedObjectives.length === 4) return 'PRAISE';
  if (state.currentStage === 'HELP_TUTORIAL' && !state.helpRequested) return 'THINKING';
  return 'NORMAL';
}

export function TutorPanel({ state }: { state: GameState }) {
  const message = resolveMessage(state);
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
          <small className="text-xs text-slate-500 font-medium">国家级新能源技能大师</small>
        </div>
        {state.helpRequested && (
          <CheckCircle2 className="tutor-ready text-emerald-600 ml-auto" size={24} aria-label="帮助面板已开启" />
        )}
      </div>

      {/* Speech Bubble */}
      <div className="message-card relative my-4 p-4 rounded-xl border-l-4 border-amber-400 bg-amber-50/90 text-slate-800 shadow-xs" aria-live="polite">
        <div className="flex items-start gap-2">
          <p className="text-sm font-semibold leading-relaxed m-0 flex-1">{message}</p>
          <SpeechControls currentText={message} />
        </div>
      </div>

      <div className="tutor-context mt-auto pt-3 border-t border-slate-200 text-xs">
        <span className="text-slate-400 font-medium">当前训练阶段</span>
        <strong className="text-sky-800 font-bold text-sm tracking-wide block mt-1">
          {state.currentStage.replaceAll('_', ' ')}
        </strong>
      </div>
    </aside>
  );
}
