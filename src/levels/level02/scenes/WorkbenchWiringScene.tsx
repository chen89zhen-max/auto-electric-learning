'use client';
/* eslint-disable jsx-a11y/prefer-tag-over-role -- SVG terminal groups use button roles with Enter/Space and focus support. */

import React, { useState } from 'react';
import { currentDirection } from '@/src/circuit/currentDirection';
import { useLevel02Store } from '@/src/stores/level02Store';
import { Button } from '@/components/ui/button';
import {
  RotateCcw,
  Power,
  ArrowRight,
  Sparkles,
  Compass,
  Layers,
  X,
} from 'lucide-react';

interface TerminalPos {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

const terminals: TerminalPos[] = [
  { id: 'BAT_POS', name: '蓄电池(+)', x: 120, y: 155, color: '#ef4444' },
  { id: 'BAT_NEG', name: '蓄电池(-)', x: 120, y: 225, color: '#3b82f6' },
  { id: 'FUSE_T1', name: 'F1 输入', x: 280, y: 130, color: '#f59e0b' },
  { id: 'FUSE_T2', name: 'F1 输出', x: 380, y: 130, color: '#f59e0b' },
  { id: 'SW_T1', name: 'S1 触点1', x: 520, y: 130, color: '#10b981' },
  { id: 'SW_T2', name: 'S1 触点2', x: 620, y: 130, color: '#10b981' },
  { id: 'LAMP_T1', name: 'L1 灯头1', x: 740, y: 160, color: '#eab308' },
  { id: 'LAMP_T2', name: 'L1 灯头2', x: 740, y: 230, color: '#06b6d4' },
];

export function WorkbenchWiringScene() {
  const { state, dispatch } = useLevel02Store();
  const [selectedTerminal, setSelectedTerminal] = useState<string | null>(null);
  const [showSchematic, setShowSchematic] = useState(true);

  const handleTerminalClick = (tId: string) => {
    if (!selectedTerminal) {
      setSelectedTerminal(tId);
    } else {
      if (selectedTerminal !== tId) {
        dispatch({ type: 'CONNECT_WIRE', from: selectedTerminal, to: tId });
      }
      setSelectedTerminal(null);
    }
  };

  const getTerminalCoords = (id: string) => terminals.find((t) => t.id === id) || { x: 0, y: 0 };

  const handleAutoWire = () => {
    dispatch({ type: 'RESET_WIRING' });
    dispatch({ type: 'CONNECT_WIRE', from: 'BAT_POS', to: 'FUSE_T1' });
    dispatch({ type: 'CONNECT_WIRE', from: 'FUSE_T2', to: 'SW_T1' });
    dispatch({ type: 'CONNECT_WIRE', from: 'SW_T2', to: 'LAMP_T1' });
    dispatch({ type: 'CONNECT_WIRE', from: 'LAMP_T2', to: 'BAT_NEG' });
  };

  return (
    <div className="w-full h-full bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md p-3 sm:p-4 flex flex-col justify-between min-h-0">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-1.5">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>实训步骤 2：动手接线——让这盏检修灯亮起来</span>
            {state.isLampLit && (
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                检修灯已点亮
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500">
            依次点击两个端子连线（也可用 Tab 和 Enter）。黄色流线表示从正极经负载回到负极的约定电流方向。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700"
            onClick={() => setShowSchematic((prev) => !prev)}
            title="点击切换原理图卡片显示状态"
          >
            <Layers size={14} className="text-sky-600 mr-1" />
            {showSchematic ? '隐藏原理图' : '参考原理图'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-xs border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700"
            onClick={handleAutoWire}
          >
            <Sparkles size={14} className="text-amber-500 mr-1" />
            标准双线回路
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-xs border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700"
            onClick={() => {
              dispatch({ type: 'RESET_WIRING' });
              setSelectedTerminal(null);
            }}
          >
            <RotateCcw size={14} className="mr-1" />
            清空连线
          </Button>
        </div>
      </div>

      {/* Main Workbench Canvas Area (Expanded to fit workstation) */}
      <div className="relative w-full flex-1 min-h-[380px] sm:min-h-[440px] max-h-[620px] bg-slate-950 rounded-xl border border-slate-800 shadow-inner overflow-hidden flex flex-col justify-center my-1.5">
        {/* Schematic Mini-Card on Top Left (Permanently avoids blocking 12V Lamp on the right) */}
        {showSchematic && (
          <div className="absolute top-2.5 left-3 bg-slate-900/90 border border-slate-700/80 rounded-lg p-2 shadow-lg z-10 w-44 pointer-events-auto">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>原理图对照</span>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400">12V DC</span>
                <button
                  type="button"
                  onClick={() => setShowSchematic(false)}
                  className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                  title="收起原理图"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            <svg viewBox="0 0 160 80" className="w-full stroke-slate-300 stroke-1 fill-none pointer-events-none">
              <line x1="20" y1="25" x2="20" y2="45" className="stroke-amber-400 stroke-[2]" />
              <line x1="26" y1="30" x2="26" y2="40" className="stroke-slate-400 stroke-[3]" />
              <path d="M 20 25 L 20 15 L 45 15" />
              <rect x="45" y="10" width="20" height="10" className="stroke-amber-400 fill-amber-500/10" />
              <line x1="45" y1="15" x2="65" y2="15" />
              <path d="M 65 15 L 85 15" />
              <circle cx="85" cy="15" r="2" className="fill-amber-400 stroke-none" />
              <line
                x1="87"
                y1="15"
                x2="108"
                y2={state.isSwitchClosed ? 15 : 7}
                className="stroke-amber-400 stroke-[1.5]"
              />
              <circle cx="110" cy="15" r="2" className="fill-amber-400 stroke-none" />
              <path d="M 110 15 L 140 15 L 140 30" />
              <circle
                cx="140"
                cy="40"
                r="10"
                className={state.isLampLit ? "stroke-yellow-400 fill-yellow-400/40" : "stroke-slate-400 fill-none"}
              />
              <line x1="133" y1="33" x2="147" y2="47" className="stroke-slate-400" />
              <line x1="133" y1="47" x2="147" y2="33" className="stroke-slate-400" />
              <path d="M 140 50 L 140 65 L 26 65 L 26 40" />
            </svg>
          </div>
        )}

        {/* SVG Canvas */}
        <svg viewBox="0 0 860 380" className="w-full h-full select-none">
          <defs>
            <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#facc15" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#eab308" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
            </radialGradient>

            <style>{`
              .current-flow-dash {
                stroke-dasharray: 8 16;
                animation: flowAnim 1.2s linear infinite;
              }
              @keyframes flowAnim {
                from { stroke-dashoffset: 48; }
                to { stroke-dashoffset: 0; }
              }
            `}</style>
          </defs>

          {/* Battery */}
          <g transform="translate(60, 110)">
            <rect x="0" y="0" width="120" height="150" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="3" />
            <rect x="10" y="10" width="100" height="40" rx="4" fill="#0f172a" />
            <text x="60" y="35" fill="#38bdf8" fontSize="13" fontWeight="bold" textAnchor="middle">12V 蓄电池</text>
            <rect x="10" y="60" width="40" height="20" rx="2" fill="#ef4444" />
            <rect x="70" y="60" width="40" height="20" rx="2" fill="#3b82f6" />
            <text x="30" y="74" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">正极 +</text>
            <text x="90" y="74" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">负极 -</text>
          </g>

          {/* Fuse */}
          <g transform="translate(260, 90)">
            <rect x="0" y="0" width="140" height="90" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <rect x="15" y="12" width="110" height="26" rx="3" fill="#0f172a" />
            <text x="70" y="29" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">10A 熔断器 F1</text>
            <rect x="45" y="44" width="50" height="24" rx="3" fill="#dc2626" opacity="0.9" />
            <text x="70" y="60" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">10A</text>
          </g>

          {/* Switch */}
          <g transform="translate(480, 90)">
            <rect x="0" y="0" width="160" height="90" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <rect x="15" y="12" width="130" height="26" rx="3" fill="#0f172a" />
            <text x="80" y="29" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">检修灯开关 S1</text>
            <rect
              x="50"
              y="45"
              width="60"
              height="30"
              rx="4"
              fill={state.isSwitchClosed ? "#059669" : "#475569"}
              stroke="#64748b"
              strokeWidth="2"
              className="cursor-pointer transition-colors"
              onClick={() => dispatch({ type: 'TOGGLE_SWITCH' })}
            />
            <text
              x="80"
              y="64"
              fill="#ffffff"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
              className="cursor-pointer"
              onClick={() => dispatch({ type: 'TOGGLE_SWITCH' })}
            >
              {state.isSwitchClosed ? "已闭合" : "已断开"}
            </text>
          </g>

          {/* Lamp */}
          <g transform="translate(700, 110)">
            <rect x="0" y="0" width="120" height="150" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <rect x="10" y="10" width="100" height="26" rx="3" fill="#0f172a" />
            <text x="60" y="27" fill="#eab308" fontSize="11" fontWeight="bold" textAnchor="middle">12V 检修灯 L1</text>
            <rect x="46" y="86" width="28" height="20" rx="2" fill="#94a3b8" />
            <circle
              cx="60"
              cy="65"
              r="26"
              fill={state.isLampLit ? "url(#lampGlow)" : "#334155"}
              stroke={state.isLampLit ? "#facc15" : "#64748b"}
              strokeWidth="2.5"
            />
            <path d="M 52 70 L 57 58 L 63 58 L 68 70" fill="none" stroke={state.isLampLit ? "#ffffff" : "#cbd5e1"} strokeWidth="2" />
            {state.isLampLit && (
              <circle cx="60" cy="65" r="50" fill="url(#lampGlow)" pointerEvents="none" opacity="0.75" />
            )}
            <text x="60" y="130" fill="#94a3b8" fontSize="10" textAnchor="middle">
              {state.isLampLit ? "正常发光中" : "未点亮"}
            </text>
          </g>

          {/* Wires */}
          {state.wires.map((w, idx) => {
            const direction = currentDirection(state.analysis, w.from, w.to);
            const p1 = getTerminalCoords(w.from);
            const p2 = getTerminalCoords(w.to);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2 + 35;
            const isGroundWire = w.from.includes('NEG') || w.to.includes('NEG');
            const wireColor = isGroundWire ? '#38bdf8' : '#ef4444';

            return (
              <g key={idx}>
                <path
                  d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
                  fill="none"
                  stroke={state.isLampLit ? (isGroundWire ? '#0284c7' : '#dc2626') : '#334155'}
                  strokeWidth="8"
                  opacity="0.4"
                />
                <path
                  d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
                  fill="none"
                  stroke={wireColor}
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {state.showCurrentPath && state.isLampLit && direction !== 0 && (
                  <path
                    d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
                    fill="none"
                    stroke="#fef08a"
                    strokeWidth="3"
                    className="flow-tracer" style={{ animationDirection: direction === -1 ? 'reverse' : 'normal' }}
                  />
                )}
              </g>
            );
          })}

          {/* Terminals */}
          {terminals.map((t) => {
            const isSelected = selectedTerminal === t.id;
            return (
              <g
                key={t.id}
                transform={`translate(${t.x}, ${t.y})`}
                className="cursor-pointer"
                role="button" tabIndex={0} aria-label={`接线端子 ${t.name}`} aria-pressed={isSelected}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleTerminalClick(t.id); } }}
                onClick={() => handleTerminalClick(t.id)}
              >
                {isSelected && (
                  <circle cx="0" cy="0" r="14" fill="none" stroke="#f59e0b" strokeWidth="2.5" className="animate-ping" />
                )}
                <circle
                  cx="0"
                  cy="0"
                  r="9"
                  fill={isSelected ? '#f59e0b' : t.color}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="hover:scale-125 transition-transform"
                />
                <circle cx="0" cy="0" r="3" fill="#0f172a" />
                <text
                  x="0"
                  y="18"
                  fill="#cbd5e1"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  {t.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Control Strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="lg"
            className={`font-bold flex items-center gap-2 px-5 ${
              state.isPowerOn
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
            }`}
            onClick={() => dispatch({ type: state.isPowerOn ? 'POWER_OFF' : 'POWER_ON' })}
          >
            <Power size={18} />
            {state.isPowerOn ? '切断电源' : '通电测试'}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
            onClick={() => dispatch({ type: 'TOGGLE_SWITCH' })}
          >
            {state.isSwitchClosed ? '断开开关 S1' : '闭合开关 S1'}
          </Button>

          {state.isLampLit && (
            <Button
              size="lg"
              variant="outline"
              className={`border-amber-400 font-medium ${
                state.showCurrentPath ? 'bg-amber-100 text-amber-900' : 'bg-white text-slate-700'
              }`}
              onClick={() => dispatch({ type: 'TOGGLE_CURRENT_PATH' })}
            >
              <Compass size={16} className="mr-1 text-amber-600" />
              {state.showCurrentPath ? '隐藏电流路径' : '查看电流路径'}
            </Button>
          )}

          <div className="text-xs sm:text-sm text-slate-600 max-w-md font-medium">
            {state.feedback}
          </div>
        </div>

        {state.isLampLit && (
          <Button
            size="lg"
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-2 px-6 shadow-md shadow-amber-600/20"
            onClick={() => dispatch({ type: 'PROCEED_TO_OPEN_CIRCUIT' })}
          >
            进入实训步骤 3：断路探究
            <ArrowRight size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
