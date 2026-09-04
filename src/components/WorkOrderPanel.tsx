'use client';

import { ClipboardCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/src/stores/gameStore';

export function WorkOrderPanel() {
  const { state, dispatch } = useGameStore();
  if (!state.workOrderOpened) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <dialog open className="work-order-modal" aria-labelledby="work-order-title">
        <button className="icon-button close-button" type="button" aria-label="关闭工单" onClick={() => dispatch({ type: 'CLOSE_WORK_ORDER' })}><X size={20} /></button>
        <div className="document-heading">
          <span><ClipboardCheck size={26} /></span>
          <div><p>电子工单 · WO-0001</p><h2 id="work-order-title">见习技师入职训练</h2></div>
        </div>
        <p className="order-note">今天暂时不维修车辆。</p>
        <ol className="order-list">
          <li>熟悉工作任务</li>
          <li>完成一次基础操作</li>
          <li>学会操作前确认设备状态</li>
          <li>学会请求师傅帮助</li>
        </ol>
        {state.currentStage === 'READ_WORK_ORDER' ? (
          <Button size="lg" className="primary-action" onClick={() => dispatch({ type: 'ACCEPT_WORK_ORDER' })}>开始训练</Button>
        ) : (
          <Button size="lg" variant="outline" onClick={() => dispatch({ type: 'CLOSE_WORK_ORDER' })}>返回训练</Button>
        )}
      </dialog>
    </div>
  );
}
