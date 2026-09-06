'use client';

import React from 'react';
import { AbilityReport } from '@/src/components/AbilityReport';
import { useLevel02Store } from '@/src/stores/level02Store';
import { getStudentDisplayName } from '@/src/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  AlertCircle,
} from 'lucide-react';

export function Level02ReportScene({ onReturnLobby }: { onReturnLobby: () => void }) {
  const { state, dispatch } = useLevel02Store();
  const isComplete = state.currentStage === 'COMPLETE';
  const studentName = getStudentDisplayName('同学');

  if (isComplete) {
    return (
      <AbilityReport
        levelId="LEVEL_02"
        domainLabel="技能领域 · 基础回路搭建"
        title="点亮第一盏检修灯能力报告"
        dimensions={
          state.abilityReport?.dimensions || [
            { id: 'WIRING', label: '接线规范', stars: 5 },
            { id: 'SAFETY', label: '安全意识', stars: 5 },
            { id: 'TROUBLESHOOTING', label: '排故思维', stars: 5 },
            { id: 'CHASSIS', label: '单线制理解', stars: 5 },
            { id: 'TRANSFER', label: '迁移能力', stars: 5 },
          ]
        }
        summaryItems={[
          { label: '带电接线尝试', value: `${state.metrics.hotWiringAttempts} 次` },
          { label: '短路尝试拦截', value: `${state.metrics.shortCircuitAttempts} 次` },
          { label: '师傅提示请求', value: `${state.metrics.helpRequests} 次` },
          { label: '回路排序重试', value: `${state.metrics.reflectionErrors} 次` },
          { label: '单线制闭环验证', value: '已达成' },
          { label: '本关用时', value: '1 分钟' },
        ]}
        report={state.abilityReport || undefined}
        metrics={state.metrics}
        nextTask="学习任务4《给电路做体检——电压分析与测量》"
        onRestart={() => dispatch({ type: 'RESET_WIRING' })}
        onReturn={onReturnLobby}
      />
    );
  }

  return (
    <div className="w-full h-full bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md p-4 sm:p-5 flex flex-col justify-between min-h-0">
      {/* Header */}
      <div className="border-b border-slate-200 pb-3 mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={20} className="text-amber-500" />
            <span>实训步骤 7：用自己的话说出电路规律（闭合回路排序）</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            陈师傅发问：“为什么车身搭铁后，只用一根供电线，灯仍然能亮？请理顺完整电流回流路径。”
          </p>
        </div>
      </div>

      {/* Main Content Area */}
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

      {/* Bottom Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-3 flex items-center justify-between">
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
      </div>
    </div>
  );
}
