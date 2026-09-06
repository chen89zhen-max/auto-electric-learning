'use client';

import { Check, Eye, RotateCcw, ShieldCheck, Sparkles, Volume2, Wrench, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import reviewData from '@/src/levels/level01/review.json';
import { useLevel01Store } from '@/src/stores/level01Store';
import { sounds } from '@/src/components/visuals/SoundEffects';

export function TransferReflectionScene() {
  const { state, dispatch } = useLevel01Store();

  // Stage: TRANSFER_CHECK (Transfer scenario with unfamiliar noisy equipment)
  if (state.currentStage === 'TRANSFER_CHECK') {
    return (
      <div className="relative z-10 w-full max-w-5xl xl:max-w-6xl bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-6 border-2 border-slate-200 shadow-xl animate-in fade-in duration-300 my-auto">
        <div className="flex items-center gap-3 pb-2.5 border-b border-slate-200 mb-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 font-mono">
              无提示迁移测试 · 职业习惯形成
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 m-0 leading-tight">迁移新场景考核</h2>
          </div>
        </div>

        {/* Unfamiliar vibrating device mockup - Compact horizontal banner */}
        <div className="relative w-full rounded-2xl bg-slate-900 border-2 border-slate-700 px-4 py-2.5 flex items-center gap-4 shadow-inner mb-3 overflow-hidden">
          {/* Pulsing warning aura */}
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="absolute -inset-2 rounded-xl bg-amber-500/20 animate-ping" />
            <div className="w-11 h-11 rounded-xl bg-slate-800 border-2 border-amber-400 text-amber-400 flex items-center justify-center shadow-md">
              <Zap size={22} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-mono">
              <span className="inline-flex items-center gap-1.5 text-rose-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                状态指示灯：亮（正在供电运行）
              </span>
              <span className="text-slate-500 hidden sm:inline">·</span>
              <span className="text-amber-300 inline-flex items-center gap-1 font-bold">
                <Volume2 size={15} /> 伴有异常刺耳蜂鸣
              </span>
            </div>
            <span className="block text-xs text-slate-400 mt-0.5 font-medium truncate">
              未知新能源车载充电机(OBC)内部模块 (带电工作工况)
            </span>
          </div>
        </div>

        <div className="text-center mb-2.5">
          <h3 className="text-base sm:text-lg font-black text-slate-800 mb-0.5">
            {reviewData.transfer.prompt}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            回想前面的两次事故处置，无论面对何种陌生电气设备，第一步的<strong>核心铁律</strong>是什么？
          </p>
        </div>

        <div className="space-y-2">
          {reviewData.transfer.options.map((option) => (
            <Button
              key={option.id}
              variant="outline"
              className="w-full h-11 sm:h-12 rounded-xl border-2 border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 text-slate-800 font-bold flex items-center justify-start px-4 text-left transition-all"
              onClick={() => {
                if (option.id === 'OBSERVE_STATUS') {
                  sounds.success();
                } else {
                  sounds.zap();
                }
                dispatch({
                  type: 'TRANSFER_ACTION',
                  operation: option.id as 'OBSERVE_STATUS' | 'OPEN_DEVICE' | 'CHANGE_COMPONENT',
                });
              }}
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center mr-3 text-slate-700 shrink-0">
                {option.id === 'OBSERVE_STATUS' ? <Eye size={16} className="text-sky-600" /> : <Wrench size={16} />}
              </div>
              <span className="text-xs sm:text-sm">{option.label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Stage: REFLECTION (Order the 5-step safety chain)
  const labels = new Map(reviewData.reflection.steps.map((step) => [step.id, step.label]));

  return (
    <div className="relative z-10 w-full max-w-5xl xl:max-w-6xl bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-6 border-2 border-slate-200 shadow-xl animate-in fade-in duration-300 my-auto">
      <div className="flex items-center gap-3 pb-2.5 border-b border-slate-200 mb-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
          <ShieldCheck size={22} />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-mono">
            复盘总结 · 职业决策闭环
          </span>
          <h2 className="text-lg sm:text-xl font-black text-slate-800 m-0 leading-tight">{reviewData.reflection.prompt}</h2>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-slate-600 mb-2.5">
        请按操作发生的正确先后顺序，依次点击下方卡片，排出完整的<strong>安全处置决策链条</strong>：
      </p>

      {/* Selected Sequence Visual Chain */}
      <div className="min-h-12 p-2.5 rounded-xl bg-slate-900 border-2 border-slate-700 mb-3 flex flex-wrap items-center gap-2 shadow-inner">
        {state.reflectionSequence.length === 0 ? (
          <span className="text-xs text-slate-400 italic px-2">点击下方步骤，从第一步“观察现场”开始添加...</span>
        ) : (
          state.reflectionSequence.map((id, index) => (
            <div
              key={id}
              className="flex items-center gap-1.5 bg-sky-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md animate-in zoom-in duration-150"
            >
              <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-mono">
                {index + 1}
              </span>
              <span>{labels.get(id)}</span>
            </div>
          ))
        )}
      </div>

      {/* Candidate Steps */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3.5">
        {reviewData.reflection.steps.map((step) => {
          const isChosen = state.reflectionSequence.includes(step.id);

          return (
            <button
              key={step.id}
              type="button"
              disabled={isChosen}
              className={`p-2.5 sm:p-3 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all ${
                isChosen
                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed line-through opacity-50'
                  : 'border-slate-300 bg-white hover:border-sky-400 hover:bg-sky-50 text-slate-800 shadow-sm active:scale-95'
              }`}
              onClick={() => {
                sounds.click();
                dispatch({ type: 'ADD_REFLECTION_STEP', stepId: step.id });
              }}
            >
              {step.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 sm:h-12 px-5 text-sm border-slate-300 text-slate-700 font-bold rounded-xl"
          onClick={() => {
            sounds.click();
            dispatch({ type: 'RESET_REFLECTION' });
          }}
        >
          <RotateCcw size={16} className="mr-1.5" />
          重新排序
        </Button>

        <Button
          type="button"
          className={`flex-1 h-11 sm:h-12 rounded-xl text-sm sm:text-base font-bold shadow-lg transition-all ${
            state.reflectionSequence.length > 0
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
          disabled={state.reflectionSequence.length === 0}
          onClick={() => {
            sounds.click();
            dispatch({ type: 'SUBMIT_REFLECTION' });
          }}
        >
          <Check size={18} className="mr-1.5" />
          提交安全处置链并生成能力报告 →
        </Button>
      </div>
    </div>
  );
}
