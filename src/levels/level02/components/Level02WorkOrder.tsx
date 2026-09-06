'use client';

import React from 'react';
import { ClipboardCheck, Sparkles, Shield, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLevel02Store } from '@/src/stores/level02Store';

export function Level02WorkOrder() {
  const { state, dispatch } = useLevel02Store();
  if (!state.isWorkOrderOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <dialog open className="work-order-modal max-w-xl" aria-labelledby="level02-work-order-title">
        <button
          className="icon-button close-button"
          type="button"
          aria-label="关闭工单"
          onClick={() => dispatch({ type: 'CLOSE_WORK_ORDER' })}
        >
          <X size={20} />
        </button>
        <div className="document-heading">
          <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <ClipboardCheck size={28} />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-700 font-bold">
              维修工单 · WO-0201
            </p>
            <h2 id="level02-work-order-title" className="text-xl font-bold text-slate-800">
              安装一盏 12V 检修灯
            </h2>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 my-3 text-sm text-slate-700 space-y-1.5">
          <p className="flex items-center gap-2 text-slate-800 font-medium">
            <Wrench size={16} className="text-sky-600" />
            <strong>工作情境：</strong> 车间新增加了一个维修工位，但是检修灯还没有完成接线。
          </p>
          <p className="flex items-center gap-2 text-slate-800 font-medium">
            <Sparkles size={16} className="text-amber-600" />
            <strong>工单要求：</strong> 利用现有元件，使检修灯能够由开关控制正常亮灭。
          </p>
          <p className="flex items-center gap-2 text-slate-800 font-medium">
            <Shield size={16} className="text-emerald-600" />
            <strong>现有物料：</strong> 12V蓄电池、熔断器 F1、开关 S1、检修灯 L1、若干导线
          </p>
        </div>

        <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
          <strong className="text-amber-800">陈师傅提示：</strong>
          “这些东西你认识一些。今天不考公式也不考仪表，放手去接线，试着让这盏灯亮起来！”
        </div>

        <div className="pt-3">
          {state.currentStage === 'WORK_ORDER' ? (
            <Button
              size="lg"
              className="primary-action w-full py-3 text-base font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20"
              onClick={() => dispatch({ type: 'ACCEPT_WORK_ORDER' })}
            >
              签署并领取工单，前往工位
            </Button>
          ) : (
            <Button
              size="lg"
              className="primary-action w-full"
              onClick={() => dispatch({ type: 'CLOSE_WORK_ORDER' })}
            >
              返回当前维修实训
            </Button>
          )}
        </div>
      </dialog>
    </div>
  );
}
