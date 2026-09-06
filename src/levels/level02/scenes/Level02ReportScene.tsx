'use client';

import React from 'react';
import { CompletionStatus } from '@/src/components/CompletionStatus';
import { useLevel02Store } from '@/src/stores/level02Store';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  Award,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export function Level02ReportScene({ onReturnLobby }: { onReturnLobby: () => void }) {
  const { state, dispatch } = useLevel02Store();
  const isComplete = state.currentStage === 'COMPLETE';
  const studentName = getStudentDisplayName('同学');

  return (
    <div className="w-full h-full bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md p-4 sm:p-5 flex flex-col justify-between min-h-0">
      {/* Header */}
      <div className="border-b border-slate-200 pb-3 mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={20} className="text-amber-500" />
            <span>
              {!isComplete
                ? '实训步骤 7：用自己的话说出电路规律（闭合回路排序）'
                : 'Sprint 2 检修灯实训任务能力报告'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {!isComplete
              ? '陈师傅发问：“为什么车身搭铁后，只用一根供电线，灯仍然能亮？请理顺完整电流回流路径。”'
              : '恭喜！回路搭建第一张电路工单已圆满交付，核心电路拓扑认知牢固建立。'}
          </p>
        </div>

        {isComplete && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 font-bold text-xs">
            <ShieldCheck size={16} />
            实训达标已完成
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!isComplete ? (
        <div className="max-w-2xl mx-auto w-full my-2 flex flex-col justify-center flex-1">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm mb-2">
            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
              陈师傅的技术发问：
            </h4>
            <p className="text-sm text-slate-800 font-bold mb-3 leading-relaxed">
              “{studentName}，你刚刚在实车上只接了一根正极线，为什么这盏检修灯仍然能被点亮？请调整下方6个环节顺序，排成完整的单线制闭合回流路径：”
            </p>

            {/* Error & Retry Feedback */}
            {state.reflectionError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">逻辑校验未通过（已尝试 {state.reflectionAttempts} 次）：</strong>
                  <span>{state.reflectionError}</span>
                </div>
              </div>
            )}

            <span className="text-xs font-bold text-slate-500 block mb-2">
              电流回流路径逻辑顺序（使用上下箭头调整位置）：
            </span>

            {/* Reorderable Concept Blocks with Up/Down buttons */}
            <div className="space-y-2">
              {state.reflectionBlocks.map((block, idx) => (
                <div
                  key={block}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 shadow-xs hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs flex items-center justify-center font-mono font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-slate-800">{block}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() =>
                        dispatch({
                          type: 'MOVE_REFLECTION_BLOCK',
                          fromIndex: idx,
                          toIndex: idx - 1,
                        })
                      }
                      className="p-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="上移"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === state.reflectionBlocks.length - 1}
                      onClick={() =>
                        dispatch({
                          type: 'MOVE_REFLECTION_BLOCK',
                          fromIndex: idx,
                          toIndex: idx + 1,
                        })
                      }
                      className="p-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="下移"
                    >
                      <ArrowDown size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              💡 你的表达核心：
              <span className="font-bold underline ml-1">
                车身金属代替了负极导线，把电流送回蓄电池负极，依然构成了完整的闭合回路！
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Final Competency Report based on AbilityTracker */
        <div className="max-w-3xl mx-auto w-full my-2 flex flex-col justify-center flex-1">
          <div className="bg-gradient-to-b from-amber-50/40 to-white border-2 border-amber-300 rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
            <div className="flex flex-col items-center text-center pb-3 border-b border-slate-200">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
                <Award size={28} />
              </div>
              <span className="text-xs uppercase tracking-widest text-amber-700 font-bold mb-1">
                新能源汽车电工电子 · 五维能力发展档案
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                Sprint 2《点亮第一盏检修灯》能力评测
              </h2>
            </div>

            {/* Dynamic Dimensions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3">
              {(state.abilityReport?.dimensions || [
                { id: 'WIRING', label: '接线规范', stars: 5 },
                { id: 'SAFETY', label: '安全意识', stars: 5 },
                { id: 'TROUBLESHOOTING', label: '排故思维', stars: 5 },
                { id: 'CHASSIS', label: '单线制理解', stars: 5 },
                { id: 'TRANSFER', label: '迁移能力', stars: 5 },
              ]).map((dim) => (
                <div
                  key={dim.id}
                  className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between shadow-xs"
                >
                  <span className="text-xs font-bold text-slate-800">{dim.label}</span>
                  <span className="font-mono text-sm font-bold text-amber-600">
                    {'★'.repeat(dim.stars) + '☆'.repeat(5 - dim.stars)}
                  </span>
                </div>
              ))}
            </div>

            {/* Process Metrics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 border-t border-b border-slate-200 text-center text-xs">
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-500 block text-[11px]">带电接线尝试</span>
                <strong className="text-slate-800 text-sm font-bold">{state.metrics.hotWiringAttempts} 次</strong>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-500 block text-[11px]">短路尝试拦截</span>
                <strong className="text-slate-800 text-sm font-bold">{state.metrics.shortCircuitAttempts} 次</strong>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-500 block text-[11px]">师傅提示请求</span>
                <strong className="text-slate-800 text-sm font-bold">{state.metrics.helpRequests} 次</strong>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-500 block text-[11px]">回路排序重试</span>
                <strong className="text-slate-800 text-sm font-bold">{state.metrics.reflectionErrors} 次</strong>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3 text-center text-xs text-amber-900 leading-relaxed">
              🎉 <strong>陈师傅寄语：</strong>
              “{studentName}，你牢固建立了第一条电路底层逻辑：<strong>电器能工作，不是因为接上了电池，而是因为形成了一条完整的闭合回路！</strong>”
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      {isComplete && state.abilityReport && <CompletionStatus levelId="LEVEL_02" report={state.abilityReport} metrics={state.metrics} />}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-3 flex items-center justify-between">
        {!isComplete ? (
          <>
            <span className="text-xs text-slate-500">
              请使用上下箭头调整顺序，确保6个环节构成完整的闭合回路。
            </span>
            <Button
              size="lg"
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-2 px-8 shadow-md shadow-amber-600/20"
              onClick={() => dispatch({ type: 'SUBMIT_REFLECTION' })}
            >
              提交思考并验证排序
              <ArrowRight size={18} />
            </Button>
          </>
        ) : (
          <>
            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
              <CheckCircle2 size={16} />
              Sprint 2 教学目标全部达成！
            </span>
            <Button
              size="lg"
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-2 px-8 shadow-md shadow-sky-600/20"
              onClick={onReturnLobby}
            >
              返回任务大厅
              <ArrowRight size={18} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
