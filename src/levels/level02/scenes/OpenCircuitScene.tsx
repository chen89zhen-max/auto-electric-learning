'use client';

import React from 'react';
import { useLevel02Store } from '@/src/stores/level02Store';
import { Button } from '@/components/ui/button';
import { Scissors, ArrowRight, CheckCircle2, Lightbulb } from 'lucide-react';

const explanationOptions = [
  { id: 'NO_POWER', label: '没有电源了' },
  { id: 'CIRCUIT_BROKEN', label: '回路断开' },
  { id: 'LAMP_BROKEN', label: '灯一定坏了' },
];

export function OpenCircuitScene() {
  const { state, dispatch } = useLevel02Store();
  const isWireDisconnected = !!state.disconnectedWireId;

  return (
    <div className="experiment-scene w-full h-full bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md p-3 sm:p-4 flex flex-col justify-between min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-1.5">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>实训步骤 3：故意制造一个断路</span>
            {isWireDisconnected && (
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                导线已拔开
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500">
            陈师傅：“现在拔掉任意一根导线看看。”
          </p>
        </div>

        {state.closedCircuitUnlocked && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-xs font-bold">
            <CheckCircle2 size={16} />
            已解锁：闭合回路
          </div>
        )}
      </div>

      {/* Main Interactive Stage */}
      <div className="experiment-grid grid grid-cols-1 md:grid-cols-3 gap-4 my-1.5 flex-1 min-h-[340px]">
        {/* Left 2 cols: Circuit with clickable disconnect scissors */}
        <div className="md:col-span-2 bg-slate-950 rounded-xl border border-slate-800 p-3 sm:p-4 relative min-h-[300px] flex flex-col justify-center">
          <svg viewBox="0 0 600 240" className="w-full h-full select-none">
            {/* Base Wire Loop */}
            <rect
              x="60"
              y="40"
              width="480"
              height="150"
              rx="16"
              fill="none"
              stroke={isWireDisconnected ? '#475569' : '#10b981'}
              strokeWidth="8"
              strokeDasharray={isWireDisconnected ? '12 8' : 'none'}
            />

            {state.isLampLit && !isWireDisconnected && <path d="M 60 85 V 56 Q 60 40 76 40 H 524 Q 540 40 540 56 V 85 M 540 137 V 174 Q 540 190 524 190 H 76 Q 60 190 60 174 V 145" fill="none" stroke="#fef08a" strokeWidth="3" className="flow-tracer" />}
            {isWireDisconnected && <rect x="430" y="31" width="40" height="18" fill="#020617" />}
            {/* Battery */}
            <g transform="translate(40, 85)">
              <rect x="0" y="0" width="40" height="60" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
              <line x1="20" y1="15" x2="20" y2="45" stroke="#ef4444" strokeWidth="4" />
              <line x1="20" y1="20" x2="20" y2="40" stroke="#3b82f6" strokeWidth="6" />
              <text x="20" y="75" fill="#cbd5e1" fontSize="10" textAnchor="middle">12V电池</text>
            </g>

            {/* Fuse */}
            <g transform="translate(180, 30)">
              <rect x="0" y="0" width="60" height="20" rx="3" fill="#dc2626" />
              <text x="30" y="14" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">F1 熔断器</text>
            </g>

            {/* Switch */}
            <g transform="translate(340, 30)">
              <rect x="0" y="0" width="60" height="20" rx="3" fill="#059669" />
              <text x="30" y="14" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">S1 闭合</text>
            </g>

            {/* Disconnect Spot on top right wire */}
            {!isWireDisconnected ? (
              <g
                transform="translate(450, 40)"
                className="cursor-pointer group"
                onClick={() => dispatch({ type: 'DISCONNECT_EXPERIMENTAL_WIRE', wireIndex: 1 })}
              >
                <circle cx="0" cy="0" r="16" fill="#ef4444" className="animate-pulse" />
                <Scissors size={18} className="text-white -translate-x-2 -translate-y-2" />
                <text x="0" y="26" fill="#f87171" fontSize="11" fontWeight="bold" textAnchor="middle">
                  点击拔掉导线
                </text>
              </g>
            ) : (
              <g transform="translate(450, 40)">
                <circle cx="0" cy="0" r="14" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
                <text x="0" y="24" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">
                  断口处
                </text>
              </g>
            )}

            {/* Lamp */}
            <g transform="translate(520, 85)">
              <circle
                cx="20"
                cy="30"
                r="22"
                fill={state.isLampLit ? "#facc15" : "#334155"}
                stroke={state.isLampLit ? "#ca8a04" : "#64748b"}
                strokeWidth="2.5"
                className={state.isLampLit ? "drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" : ""}
              />
              <line x1="12" y1="22" x2="28" y2="38" stroke="#ffffff" strokeWidth="2" />
              <line x1="12" y1="38" x2="28" y2="22" stroke="#ffffff" strokeWidth="2" />
              <text x="20" y="68" fill={state.isLampLit ? "#facc15" : "#94a3b8"} fontSize="11" fontWeight="bold" textAnchor="middle">
                {state.isLampLit ? "正常发光" : "熄灭"}
              </text>
            </g>
          </svg>
        </div>

        {/* Right 1 col: Question & Concept Cards */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
              <Lightbulb size={18} className="text-amber-500" />
              <h4 className="font-bold text-sm text-slate-800">
                {isWireDisconnected ? '思考：为什么电源还在，灯却熄灭了？' : '请先点击拔掉导线'}
              </h4>
            </div>

            {isWireDisconnected ? (
              <div className="space-y-2.5">
                {explanationOptions.map((opt) => {
                  const isSelected = state.openCircuitExplanationSelected === opt.label;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => dispatch({ type: 'SELECT_OPEN_CIRCUIT_EXPLANATION', choice: opt.label })}
                      className={`w-full p-3 rounded-lg border text-left text-xs font-bold transition-all ${
                        isSelected
                          ? opt.label === '回路断开'
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-800 shadow-sm'
                            : 'bg-rose-100 border-rose-400 text-rose-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-500 leading-relaxed">
                在左侧电路中，找到红色的【点击拔掉导线】图标并点击。观察拔掉一根线后，检修灯会发生什么变化。
              </div>
            )}
          </div>

          {/* Unlocked Concept Card */}
          {state.closedCircuitUnlocked && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 mt-3">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                ⭐ 认知解锁
              </span>
              <h5 className="font-bold text-sm text-emerald-800 mb-1">闭合回路 (Closed Circuit)</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                电路只有形成完整的闭合路径，负载才可能正常工作。现象先于术语！
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-600">
          {state.closedCircuitUnlocked
            ? '理解了闭合回路，下一步探究开关在电路中到底扮演什么角色。'
            : '拔掉导线后，在右侧选择你认为的最本质原因。'}
        </div>

        {state.closedCircuitUnlocked && (
          <Button
            size="lg"
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-2 px-6 shadow-md shadow-amber-600/20"
            onClick={() => dispatch({ type: 'PROCEED_TO_SWITCH_EXP' })}
          >
            进入实训步骤 4：开关控制与原理图映射
            <ArrowRight size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
