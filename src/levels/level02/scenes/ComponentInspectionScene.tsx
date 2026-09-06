'use client';

import React from 'react';
import { useLevel02Store } from '@/src/stores/level02Store';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';

interface ComponentCardData {
  id: string;
  name: string;
  brief: string;
  icon: React.ReactNode;
}

const components: ComponentCardData[] = [
  {
    id: 'BAT1',
    name: '12V 蓄电池',
    brief: '给电路提供电能。',
    icon: (
      <svg viewBox="0 0 100 80" className="w-24 h-20">
        <rect x="15" y="20" width="70" height="50" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="2" />
        <rect x="25" y="12" width="14" height="8" rx="2" fill="#ef4444" />
        <rect x="61" y="12" width="14" height="8" rx="2" fill="#3b82f6" />
        <text x="32" y="19" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">+</text>
        <text x="68" y="19" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">-</text>
        <rect x="20" y="32" width="60" height="24" rx="2" fill="#0f172a" />
        <text x="50" y="48" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">12V DC</text>
      </svg>
    ),
  },
  {
    id: 'F1',
    name: '10A 熔断器',
    brief: '用于线路保护。',
    icon: (
      <svg viewBox="0 0 100 80" className="w-24 h-20">
        <path d="M 30 20 L 70 20 L 65 50 L 35 50 Z" fill="#dc2626" opacity="0.9" />
        <rect x="38" y="50" width="8" height="20" fill="#cbd5e1" />
        <rect x="54" y="50" width="8" height="20" fill="#cbd5e1" />
        <path d="M 42 30 Q 50 35 58 30" stroke="#fef08a" strokeWidth="2.5" fill="none" />
        <text x="50" y="27" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">10A</text>
      </svg>
    ),
  },
  {
    id: 'S1',
    name: '检修灯开关',
    brief: '可以控制线路通断。',
    icon: (
      <svg viewBox="0 0 100 80" className="w-24 h-20">
        <rect x="15" y="25" width="70" height="40" rx="4" fill="#334155" stroke="#475569" strokeWidth="2" />
        <rect x="35" y="16" width="30" height="18" rx="3" fill="#e2e8f0" stroke="#94a3b8" />
        <circle cx="25" cy="45" r="4" fill="#10b981" />
        <circle cx="75" cy="45" r="4" fill="#10b981" />
        <text x="50" y="57" fill="#94a3b8" fontSize="9" textAnchor="middle">ON / OFF</text>
      </svg>
    ),
  },
  {
    id: 'L1',
    name: '12V 检修灯',
    brief: '工作以后把电能转换成光。',
    icon: (
      <svg viewBox="0 0 100 80" className="w-24 h-20">
        <circle cx="50" cy="35" r="22" fill="#fef08a" opacity="0.4" stroke="#facc15" strokeWidth="2" />
        <path d="M 42 41 L 46 29 L 54 29 L 58 41" fill="none" stroke="#f59e0b" strokeWidth="2" />
        <rect x="42" y="53" width="16" height="15" rx="1" fill="#94a3b8" />
        <line x1="42" y1="58" x2="58" y2="58" stroke="#475569" strokeWidth="1.5" />
      </svg>
    ),
  },
];

export function ComponentInspectionScene() {
  const { state, dispatch } = useLevel02Store();
  const allExplored = ['BAT1', 'F1', 'S1', 'L1'].every((id) =>
    state.exploredComponents.includes(id)
  );

  return (
    <div className="w-full h-full bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md p-4 sm:p-6 flex flex-col justify-between min-h-0">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              实训步骤 1：观察工作台上的物料
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              陈师傅：“这些东西你认识一些。点击它们看看，试着让这盏灯亮起来。”
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">探索完成</span>
            <div className="text-lg font-bold text-emerald-600">
              {state.exploredComponents.length} / {components.length}
            </div>
          </div>
        </div>

        {/* 4 Components in a clear responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 my-6">
          {components.map((comp) => {
            const isChecked = state.exploredComponents.includes(comp.id);
            return (
              <button
                key={comp.id}
                type="button"
                onClick={() => dispatch({ type: 'EXPLORE_COMPONENT', componentId: comp.id })}
                className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all text-center relative cursor-pointer min-h-[220px] ${
                  isChecked
                    ? 'bg-emerald-50/70 border-emerald-500 shadow-md shadow-emerald-950/10'
                    : 'bg-slate-50/80 border-slate-200 hover:border-amber-400 hover:bg-amber-50/30'
                }`}
              >
                {isChecked && (
                  <span className="absolute top-3 right-3 text-emerald-600">
                    <CheckCircle2 size={22} />
                  </span>
                )}

                <div className="mb-2">{comp.icon}</div>
                <h4 className="font-bold text-base text-slate-800 mb-1">{comp.name}</h4>
                <p className="text-xs text-amber-800 font-bold bg-amber-100/80 px-2.5 py-1 rounded-full mt-1">
                  {comp.brief}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 flex items-center justify-between gap-4">
        <div className="text-xs sm:text-sm text-slate-600">
          {allExplored ? (
            <span className="text-emerald-700 font-bold flex items-center gap-1.5">
              <CheckCircle2 size={18} className="shrink-0" />
              物料盘点完毕！现在进入空白工作台，用导线动手搭建回路。
            </span>
          ) : (
            <span className="text-amber-800 font-bold flex items-center gap-1.5">
              <Lock size={16} className="text-amber-600 shrink-0" />
              请先点击并认识上方全部 4 个物料，掌握其作用后再进入下一步（已学习 {state.exploredComponents.length}/4）。
            </span>
          )}
        </div>

        <Button
          size="lg"
          disabled={!allExplored}
          className={`font-bold flex items-center gap-2 px-6 shrink-0 transition-all ${
            allExplored
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
          }`}
          onClick={() => dispatch({ type: 'PROCEED_TO_WIRING' })}
        >
          {allExplored ? (
            <>
              进入工作台接线
              <ArrowRight size={18} />
            </>
          ) : (
            <>
              <Lock size={16} />
              请先认识4个物料 ({state.exploredComponents.length}/4)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
