'use client';

import React from 'react';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { useLevel02Store } from '@/src/stores/level02Store';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';

export function Level02Tutor() {
  const { state } = useLevel02Store();

  return (
    <aside
      className="tutor-panel relative bg-gradient-to-b from-white to-slate-50 border-l border-slate-200 shadow-sm flex flex-col justify-between"
      aria-label="陈师傅提示"
    >
      <div>
        <div className="tutor-title flex items-center gap-3.5 pb-3 border-b border-slate-200">
          <MasterChenAvatar emotion={state.tutorMood} size={58} />
          <div>
            <div className="flex items-center gap-1.5">
              <strong className="text-base font-bold text-slate-800">陈师傅</strong>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">
                带教技师
              </span>
            </div>
            <small className="text-xs text-slate-500 font-medium">车间高级电工技师</small>
          </div>
        </div>

        <div
          className="message-card relative my-4 p-4 rounded-xl border-l-4 border-amber-400 bg-amber-50/90 text-slate-800 shadow-xs"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <p className="text-sm font-semibold leading-relaxed m-0 flex-1">{state.tutorMessage}</p>
            <SpeechControls currentText={state.tutorMessage} />
          </div>
        </div>
      </div>

      <div className="tutor-context mt-auto pt-3 border-t border-slate-200 text-xs">
        <span className="text-slate-400 font-medium">当前实训环节</span>
        <strong className="text-amber-800 font-bold text-sm tracking-wide block mt-1">
          {state.currentStage.replaceAll('_', ' ')}
        </strong>
      </div>
    </aside>
  );
}
