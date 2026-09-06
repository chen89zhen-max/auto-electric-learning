'use client';

import React from 'react';
import { useLevel02Store } from '@/src/stores/level02Store';
import { Button } from '@/components/ui/button';
import { Power, ArrowRight, CheckCircle2, Layers } from 'lucide-react';

export function SwitchAndMappingScene() {
  const { state, dispatch } = useLevel02Store();

  const handleComponentClick = (componentId: string) => {
    dispatch({ type: 'HIGHLIGHT_COMPONENT', componentId });
  };

  const handleSwitchClick = () => {
    handleComponentClick('S1');
    dispatch({ type: 'TOGGLE_SWITCH' });
  };

  return (
    <div className="experiment-scene w-full h-full bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md p-3 sm:p-4 flex flex-col justify-between min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-1.5">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layers size={20} className="text-amber-500" />
            <span>实训步骤 4：开关控制与原理图双向映射</span>
          </h3>
          <p className="text-xs text-slate-500">
            操作开关观察回路通断与原理图刀闸开合联动；点击实物或电气符号，建立实物与电路图的双向对应。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2.5 py-1 rounded-full border font-bold ${
              state.isSwitchClosed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            开关 S1: {state.isSwitchClosed ? '闭合 (通)' : '断开 (断)'}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 size={16} />
            已映射: {state.mappedComponents.length} / 4 个元件
          </div>
        </div>
      </div>

      {/* Main Two-Column View: Left Physical, Right Schematic */}
      <div className="experiment-grid grid grid-cols-1 md:grid-cols-2 gap-4 my-1.5 flex-1 items-center min-h-[320px]">
        {/* Left: Physical Workbench Objects */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col justify-between h-full min-h-[260px] sm:min-h-[280px]">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-700">左侧：实物工作台</span>
            <span className="text-[11px] text-slate-500">点击实物元件高亮电路图符号</span>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1 items-center">
            {/* Battery */}
            <button
              type="button"
              onClick={() => handleComponentClick('BAT1')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                state.activeHighlightId === 'BAT1'
                  ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400/50 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/40'
              }`}
            >
              <svg viewBox="0 0 40 28" className="w-10 h-7 select-none">
                <rect x="2" y="4" width="36" height="24" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
                <rect x="6" y="1" width="8" height="4" rx="1" fill="#ef4444" />
                <rect x="26" y="1" width="8" height="4" rx="1" fill="#3b82f6" />
              </svg>
              <span className="font-bold text-sm text-slate-800 mt-2">12V 蓄电池</span>
              <span className="text-[10px] text-slate-500">提供直流电源</span>
            </button>

            {/* Fuse */}
            <button
              type="button"
              onClick={() => handleComponentClick('F1')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                state.activeHighlightId === 'F1'
                  ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400/50 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/40'
              }`}
            >
              <svg viewBox="0 0 40 28" className="w-10 h-7 select-none">
                <path d="M 12 6 L 28 6 L 26 18 L 14 18 Z" fill="#dc2626" opacity="0.9" />
                <rect x="15" y="18" width="3" height="7" fill="#cbd5e1" />
                <rect x="22" y="18" width="3" height="7" fill="#cbd5e1" />
                <path d="M 17 11 Q 20 13 23 11" stroke="#fef08a" strokeWidth="1" fill="none" />
              </svg>
              <span className="font-bold text-sm text-slate-800 mt-2">10A 熔断器 F1</span>
              <span className="text-[10px] text-slate-500">线路过流保护</span>
            </button>

            {/* Switch */}
            <button
              type="button"
              onClick={handleSwitchClick}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                state.activeHighlightId === 'S1'
                  ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400/50 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/40'
              }`}
            >
              <svg viewBox="0 0 40 28" className="w-10 h-7 select-none">
                <rect x="6" y="8" width="28" height="14" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                <circle cx={state.isSwitchClosed ? 26 : 14} cy="15" r="4" fill={state.isSwitchClosed ? '#10b981' : '#ef4444'} />
              </svg>
              <span className="font-bold text-sm text-slate-800 mt-2">检修灯开关 S1</span>
              <span className={`text-[10px] font-bold ${state.isSwitchClosed ? 'text-emerald-600' : 'text-slate-500'}`}>
                {state.isSwitchClosed ? '已闭合 (通)' : '已断开 (断)'}
              </span>
            </button>

            {/* Lamp */}
            <button
              type="button"
              onClick={() => handleComponentClick('L1')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                state.activeHighlightId === 'L1'
                  ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400/50 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/40'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                  state.isLampLit
                    ? 'bg-yellow-400 border-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.8)]'
                    : 'bg-slate-200 border-slate-300'
                }`}
              >
                <span className="text-xs font-bold text-slate-800">{state.isLampLit ? '亮' : '灭'}</span>
              </div>
              <span className="font-bold text-sm text-slate-800 mt-2">12V 检修灯 L1</span>
            </button>
          </div>
        </div>

        {/* Right: Schematic Diagram with SVG Symbols */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col justify-between h-full min-h-[260px] sm:min-h-[280px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-300">右侧：标准电路图符号</span>
            <span className="text-[11px] text-amber-400 font-mono">BAT → F1 → S1 → L1 → BAT</span>
          </div>

          <svg viewBox="0 0 400 200" className="w-full h-full select-none stroke-slate-300 stroke-1 fill-none">
            {/* Battery Symbol */}
            <g
              className="cursor-pointer"
              onClick={() => handleComponentClick('BAT1')}
            >
              <rect
                x="30"
                y="60"
                width="40"
                height="60"
                fill={state.activeHighlightId === 'BAT1' ? '#f59e0b' : 'transparent'}
                opacity={state.activeHighlightId === 'BAT1' ? '0.2' : '0'}
                rx="4"
              />
              <line x1="50" y1="70" x2="50" y2="110" stroke={state.activeHighlightId === 'BAT1' ? '#f59e0b' : '#ef4444'} strokeWidth="3" />
              <line x1="58" y1="78" x2="58" y2="102" stroke={state.activeHighlightId === 'BAT1' ? '#f59e0b' : '#38bdf8'} strokeWidth="5" />
              <text x="54" y="130" fill={state.activeHighlightId === 'BAT1' ? '#f59e0b' : '#94a3b8'} fontSize="11" fontWeight="bold" textAnchor="middle">
                BAT
              </text>
            </g>

            {/* Wire to Fuse */}
            <path d="M 50 70 L 50 40 L 120 40" stroke="#64748b" strokeWidth="2" />

            {/* Fuse Symbol */}
            <g
              className="cursor-pointer"
              onClick={() => handleComponentClick('F1')}
            >
              <rect
                x="115"
                y="25"
                width="50"
                height="30"
                fill={state.activeHighlightId === 'F1' ? '#f59e0b' : 'transparent'}
                opacity={state.activeHighlightId === 'F1' ? '0.2' : '0'}
                rx="4"
              />
              <rect x="120" y="30" width="40" height="20" stroke={state.activeHighlightId === 'F1' ? '#f59e0b' : '#eab308'} strokeWidth="2" />
              <line x1="120" y1="40" x2="160" y2="40" stroke="#eab308" strokeWidth="1.5" />
              <text x="140" y="24" fill={state.activeHighlightId === 'F1' ? '#f59e0b' : '#eab308'} fontSize="11" fontWeight="bold" textAnchor="middle">
                F1
              </text>
            </g>

            {/* Wire to Switch */}
            <path d="M 160 40 L 210 40" stroke="#64748b" strokeWidth="2" />

            {/* Switch Symbol */}
            <g
              className="cursor-pointer"
              onClick={() => handleComponentClick('S1')}
            >
              <rect
                x="205"
                y="20"
                width="60"
                height="40"
                fill={state.activeHighlightId === 'S1' ? '#f59e0b' : 'transparent'}
                opacity={state.activeHighlightId === 'S1' ? '0.2' : '0'}
                rx="4"
              />
              <circle cx="215" cy="40" r="3" fill="#10b981" />
              <circle cx="255" cy="40" r="3" fill="#10b981" />
              <line
                x1="217"
                y1="40"
                x2="253"
                y2={40}
                className="circuit-switch-blade"
                style={{ transformOrigin: '217px 40px', transform: state.isSwitchClosed ? 'rotate(0deg)' : 'rotate(-28deg)' }}
                stroke={state.activeHighlightId === 'S1' ? '#f59e0b' : '#10b981'}
                strokeWidth="2.5"
              />
              <text x="235" y="18" fill={state.activeHighlightId === 'S1' ? '#f59e0b' : '#10b981'} fontSize="11" fontWeight="bold" textAnchor="middle">
                S1 {state.isSwitchClosed ? '(合)' : '(开)'}
              </text>
            </g>

            {/* Wire to Lamp */}
            <path d="M 255 40 L 330 40 L 330 75" stroke="#64748b" strokeWidth="2" />

            {/* Lamp Symbol */}
            <g
              className="cursor-pointer"
              onClick={() => handleComponentClick('L1')}
            >
              <rect
                x="305"
                y="70"
                width="50"
                height="50"
                fill={state.activeHighlightId === 'L1' ? '#f59e0b' : 'transparent'}
                opacity={state.activeHighlightId === 'L1' ? '0.2' : '0'}
                rx="4"
              />
              <circle
                cx="330"
                cy="95"
                r="18"
                stroke={state.activeHighlightId === 'L1' ? '#f59e0b' : state.isLampLit ? '#facc15' : '#94a3b8'}
                fill={state.isLampLit ? '#facc1533' : 'none'}
                strokeWidth="2"
              />
              <line x1="318" y1="83" x2="342" y2="107" stroke="#94a3b8" strokeWidth="2" />
              <line x1="318" y1="107" x2="342" y2="83" stroke="#94a3b8" strokeWidth="2" />
              <text x="330" y="130" fill={state.activeHighlightId === 'L1' ? '#f59e0b' : '#eab308'} fontSize="11" fontWeight="bold" textAnchor="middle">
                L1
              </text>
            </g>

            {state.isLampLit && (
              <g fill="none" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round">
                <path d="M 50 70 V 40 H 120 M 160 40 H 215 M 255 40 H 330 V 77" className="flow-tracer" />
                <path d="M 330 113 V 150 H 58 V 102" className="flow-tracer" />
              </g>
            )}
            {/* Return Wire back to Battery Minus */}
            <path d="M 330 113 L 330 150 L 58 150 L 58 102" stroke="#38bdf8" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 px-5 shadow-sm cursor-pointer"
            onClick={() => dispatch({ type: 'TOGGLE_SWITCH' })}
          >
            <Power size={18} />
            {state.isSwitchClosed ? '点击断开开关 S1' : '点击闭合开关 S1'}
          </Button>
          <span className="text-xs text-slate-600">
            {state.isSwitchClosed
              ? '开关已闭合，回路接通，检修灯正常发光。点击实物或电路图符号可观察双向映射。'
              : '开关已断开，切断回路，检修灯熄灭。观察右侧电路图刀闸同步断开。'}
          </span>
        </div>

        <Button
          size="lg"
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-2 px-6 shadow-md shadow-amber-600/20 cursor-pointer"
          onClick={() => dispatch({ type: 'PROCEED_TO_CHASSIS' })}
        >
          进入实训步骤 5：汽车车身搭铁挑战
          <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
