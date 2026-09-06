'use client';

import { useGameStore } from '@/src/stores/gameStore';
import { sounds } from '@/src/components/visuals/SoundEffects';

export function TrainingObject() {
  const { state, dispatch } = useGameStore();
  if (state.trainingObjectPosition === 'TARGET') return null;

  return (
    <button
      type="button"
      className={`training-object group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
        state.trainingObjectSelected
          ? 'border-sky-500 bg-sky-50/90 shadow-lg scale-105 ring-4 ring-sky-300/40'
          : 'border-slate-300 bg-white hover:border-sky-400 hover:shadow-md'
      }`}
      draggable
      aria-pressed={state.trainingObjectSelected}
      onClick={() => {
        sounds.click();
        dispatch({ type: 'SELECT_OBJECT' });
      }}
      onDragStart={(event) => {
        sounds.click();
        event.dataTransfer.effectAllowed = 'move';
        dispatch({ type: 'DRAG_OBJECT' });
      }}
    >
      {/* Insulated Safety Gloves Vector Drawing */}
      <div className="relative w-24 h-24 mb-2 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm group-hover:scale-105 transition-transform">
          <defs>
            <linearGradient id="gloveOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
            <linearGradient id="cuffGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>

          {/* Left Glove */}
          <g transform="translate(8, 5)">
            {/* Rubber Palm & Fingers */}
            <path
              d="M16 48 C16 35, 20 20, 26 18 C30 17, 34 22, 34 32 L35 15 C35 12, 39 12, 40 15 L41 32 L43 17 C43 14, 47 14, 48 17 L48 35 L49 22 C49 19, 53 20, 53 23 L52 50 C52 64, 48 68, 48 74 L14 74 C14 66, 16 56, 16 48 Z"
              fill="url(#gloveOrange)"
              stroke="#9a3412"
              strokeWidth="1.5"
            />
            {/* Thumb */}
            <path
              d="M16 48 C12 42, 6 42, 5 46 C4 50, 10 56, 18 58 Z"
              fill="url(#gloveOrange)"
              stroke="#9a3412"
              strokeWidth="1.5"
            />
            {/* Rubber Insulation Long Cuff */}
            <path d="M12 70 L50 70 L52 92 L10 92 Z" fill="url(#cuffGrad)" stroke="#1e293b" strokeWidth="1.5" />
            {/* 1000V Class 0 Insulation Label */}
            <rect x="18" y="76" width="26" height="9" rx="2" fill="#ef4444" />
            <text x="31" y="83" fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="middle">1000V 级</text>
          </g>

          {/* Sparkle badge */}
          <g transform="translate(68, 6)">
            <circle cx="10" cy="10" r="10" fill="#0284c7" />
            <path d="M10 4 L11 8 L15 10 L11 12 L10 16 L9 12 L5 10 L9 8 Z" fill="#ffffff" />
          </g>
        </svg>
      </div>

      <strong className="text-sm font-bold text-slate-800 tracking-tight">0级绝缘防护手套</strong>
      <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md mt-1 border border-amber-200">
        耐压 1000V · 劳保就位
      </span>
      <small className="text-[11px] text-slate-400 mt-1">
        {state.trainingObjectSelected ? '已选中，请点击指定收纳位' : '拖动或点按拾取'}
      </small>
    </button>
  );
}
