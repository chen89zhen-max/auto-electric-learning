'use client';

import React, { useState } from 'react';
import { useLevel02Store } from '@/src/stores/level02Store';
import { Button } from '@/components/ui/button';
import { RotateCcw, Power, ArrowRight, Shuffle } from 'lucide-react';

// Shuffled positions for the transfer challenge!
// BATTERY is placed at Right (x: 680, y: 150)
// SWITCH is placed at Top-Left (x: 140, y: 80)
// LAMP is placed in Center (x: 400, y: 180)
// FUSE is placed at Bottom-Right (x: 520, y: 260)
// GROUND is placed at Bottom-Left (x: 160, y: 260)
interface ShuffledTerminal {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

const shuffledTerminals: ShuffledTerminal[] = [
  // Battery (Right)
  { id: 'BAT_POS', name: 'BAT(+)', x: 670, y: 130, color: '#ef4444' },
  { id: 'BAT_NEG', name: 'BAT(-)', x: 740, y: 130, color: '#3b82f6' },

  // Fuse (Bottom-Right)
  { id: 'FUSE_T1', name: 'F1 输入', x: 500, y: 270, color: '#f59e0b' },
  { id: 'FUSE_T2', name: 'F1 输出', x: 570, y: 270, color: '#f59e0b' },

  // Switch (Top-Left)
  { id: 'SW_T1', name: 'S1 端1', x: 130, y: 90, color: '#10b981' },
  { id: 'SW_T2', name: 'S1 端2', x: 200, y: 90, color: '#10b981' },

  // Lamp (Center)
  { id: 'LAMP_T1', name: 'L1(+)', x: 380, y: 160, color: '#eab308' },
  { id: 'LAMP_T2', name: 'L1(-)', x: 440, y: 160, color: '#06b6d4' },
];

export function TransferChallengeScene() {
  const { state, dispatch } = useLevel02Store();
  const [selectedTerminal, setSelectedTerminal] = useState<string | null>(null);

  const handleTerminalClick = (tId: string) => {
    if (!selectedTerminal) {
      setSelectedTerminal(tId);
    } else {
      if (selectedTerminal !== tId) {
        dispatch({ type: 'CONNECT_TRANSFER_WIRE', from: selectedTerminal, to: tId });
      }
      setSelectedTerminal(null);
    }
  };

  const getTerminalCoords = (id: string) =>
    shuffledTerminals.find((t) => t.id === id) || { x: 0, y: 0 };

  return (
    <div className="w-full h-full bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md p-3 sm:p-4 flex flex-col justify-between min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-1.5">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <Shuffle size={20} className="text-amber-500" />
            <span>实训步骤 6：空间拓扑打乱测试（能力迁移）</span>
            {state.transferSuccess && (
              <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                回路验证成功
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500">
            元件摆放位置已全部随机改变！不记“从左拖到右”，仅依据电气拓扑关系正确接线。
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="text-xs border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700"
          onClick={() => {
            dispatch({ type: 'RESET_TRANSFER_WIRING' });
            setSelectedTerminal(null);
          }}
        >
          <RotateCcw size={14} className="mr-1" />
          清空挑战连线
        </Button>
      </div>

      {/* Main Shuffled Canvas */}
      <div className="relative w-full flex-1 min-h-[360px] sm:min-h-[420px] max-h-[600px] bg-slate-950 rounded-xl border border-slate-800 shadow-inner overflow-hidden flex flex-col justify-center my-1.5">
        {/* Schematic Reference Card Top Center */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700/80 rounded-lg p-2 shadow-lg z-10 w-72 pointer-events-none text-center">
          <span className="text-[10px] font-bold text-amber-400 block mb-1">
            电气连接拓扑要求（原理图不变）
          </span>
          <span className="text-xs font-mono text-slate-200">
            BAT(+) → F1 → S1 → L1 → BAT(-)
          </span>
        </div>

        <svg viewBox="0 0 860 380" className="w-full h-full select-none">
          {/* Switch Object (Top-Left) */}
          <g transform="translate(110, 50)">
            <rect x="0" y="0" width="120" height="75" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <text x="60" y="24" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">S1 开关</text>
          </g>

          {/* Lamp Object (Center) */}
          <g transform="translate(350, 110)">
            <rect x="0" y="0" width="130" height="110" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <circle
              cx="65"
              cy="48"
              r="24"
              fill={state.transferSuccess ? "#facc15" : "#334155"}
              stroke={state.transferSuccess ? "#ca8a04" : "#64748b"}
              strokeWidth="2"
              className={state.transferSuccess ? "drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" : ""}
            />
            <text x="65" y="96" fill="#eab308" fontSize="11" fontWeight="bold" textAnchor="middle">L1 检修灯</text>
          </g>

          {/* Battery Object (Right) */}
          <g transform="translate(640, 90)">
            <rect x="0" y="0" width="130" height="120" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <text x="65" y="25" fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle">12V 蓄电池</text>
          </g>

          {/* Fuse Object (Bottom-Right) */}
          <g transform="translate(470, 230)">
            <rect x="0" y="0" width="130" height="75" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <text x="65" y="24" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">F1 熔断器</text>
          </g>

          {/* Drawn Challenge Wires */}
          {state.transferWires.map((w, idx) => {
            const p1 = getTerminalCoords(w.from);
            const p2 = getTerminalCoords(w.to);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2 - 20;

            return (
              <g key={idx}>
                <path
                  d={`M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`}
                  fill="none"
                  stroke={state.transferSuccess ? '#10b981' : '#38bdf8'}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Shuffled Terminals */}
          {shuffledTerminals.map((t) => {
            const isSelected = selectedTerminal === t.id;
            return (
              <g
                key={t.id}
                transform={`translate(${t.x}, ${t.y})`}
                className="cursor-pointer"
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
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 px-6 shadow-sm"
            onClick={() => dispatch({ type: 'CHECK_TRANSFER' })}
          >
            <Power size={18} />
            通电验证连线
          </Button>

          <span className="text-xs text-slate-600">
            {state.transferSuccess ? (
              <span className="text-emerald-700 font-bold">
                ✔ 拓扑识别通过！检修灯顺利点亮！
              </span>
            ) : (
              '连好所有导线后，点击左侧按钮进行通电验证。'
            )}
          </span>
        </div>

        {state.transferSuccess && (
          <Button
            size="lg"
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-2 px-6 shadow-md shadow-amber-600/20"
            onClick={() => dispatch({ type: 'PROCEED_TO_REFLECTION' })}
          >
            进入实训步骤 7：用自己的话说出电路规律
            <ArrowRight size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
