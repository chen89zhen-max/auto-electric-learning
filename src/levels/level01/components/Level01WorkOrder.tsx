'use client';

import { ClipboardCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLevel01Store } from '@/src/stores/level01Store';

export function Level01WorkOrder() {
  const { state, dispatch } = useLevel01Store();
  if (!state.workOrderOpened) return null;
  return (
    <div className="modal-backdrop" role="presentation">
      <dialog open className="work-order-modal" aria-labelledby="level01-work-order-title">
        <button className="icon-button close-button" type="button" aria-label="关闭工单" onClick={() => dispatch({ type: 'CLOSE_WORK_ORDER' })}><X size={20} /></button>
        <div className="document-heading"><span><ClipboardCheck size={26} /></span><div><p>安全训练任务 · WO-0101</p><h2 id="level01-work-order-title">实训车间突发事故</h2></div></div>
        <p className="order-note">第二天正式实训：前往2号实训台。</p>
        <ol className="order-list"><li>观察事故现场</li><li>控制仍然存在的危险源</li><li>完成相应人员与火情处置</li><li>形成可迁移的安全决策链</li></ol>
        {state.currentStage === 'WORK_ORDER'
          ? <Button size="lg" className="primary-action" onClick={() => dispatch({ type: 'ACCEPT_WORK_ORDER' })}>接受安全训练任务</Button>
          : <Button size="lg" className="primary-action" onClick={() => dispatch({ type: 'CLOSE_WORK_ORDER' })}>返回当前任务</Button>}
      </dialog>
    </div>
  );
}
