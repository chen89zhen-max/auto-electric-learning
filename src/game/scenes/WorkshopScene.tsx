'use client';

import { ClipboardList, HelpCircle, MousePointer2, RadioTower, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/src/stores/gameStore';
import { TrainingObject } from '@/src/game/objects/TrainingObject';
import { Workbench } from '@/src/game/objects/Workbench';

export function WorkshopScene() {
  const { state, dispatch } = useGameStore();

  if (state.currentStage === 'WELCOME') {
    return <div className="welcome-stage"><div className="orientation-card"><p className="step-label">入职训练 · 第 1 步</p><h2>准备好开始了吗？</h2><p>今天暂时不维修车辆，先熟悉实训任务的基本操作。</p><Button size="lg" className="primary-action" onClick={() => dispatch({ type: 'ENTER' })}>进入维修中心</Button></div></div>;
  }

  if (state.currentStage === 'READ_WORK_ORDER') {
    return <div className="focus-stage"><button type="button" className="work-order-object" onClick={() => dispatch({ type: 'OPEN_WORK_ORDER' })}><span><ClipboardList size={34} /></span><strong>电子工单</strong><small>点击查看今日任务</small></button><p className="interaction-hint"><MousePointer2 size={17} />当前只有工单可以操作</p></div>;
  }

  if (state.currentStage === 'INTERACTION_TUTORIAL') {
    return (
      <div className="interaction-stage">
        <div className="object-tray"><span>训练件托盘</span><TrainingObject />{state.trainingObjectPosition === 'TARGET' && <div className="empty-tray">托盘已清空</div>}</div>
        <button type="button" className={state.trainingObjectPosition === 'TARGET' ? 'drop-target placed' : 'drop-target'} onClick={() => state.trainingObjectSelected && dispatch({ type: 'PLACE_OBJECT' })} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); dispatch({ type: 'PLACE_OBJECT' }); }}>
          {state.trainingObjectPosition === 'TARGET' ? <><ShieldCheck size={38} /><strong>训练件已就位</strong><small>基础操作完成</small></> : <><span className="target-cross">+</span><strong>指定收纳位置</strong><small>拖到这里，或先点训练件再点这里</small></>}
        </button>
        {state.trainingObjectPosition === 'TARGET' && <Button size="lg" className="continue-button scene-continue" onClick={() => dispatch({ type: 'CONTINUE_AFTER_INTERACTION' })}>继续训练</Button>}
      </div>
    );
  }

  if (state.currentStage === 'SAFETY_PRECHECK') return <div className="safety-stage"><Workbench /></div>;

  if (state.currentStage === 'HELP_TUTORIAL') {
    return (
      <div className="help-stage">
        <div className="unknown-device"><RadioTower size={52} /><span>暂未学习的设备符号</span><strong>？</strong></div>
        <p>这个内容后面的课程才会学习。现在你不知道它是什么。</p>
        <div className="help-actions">
          <Button size="lg" variant="outline" onClick={() => dispatch({ type: 'TRY_UNKNOWN' })}>随便操作</Button>
          <Button size="lg" variant="outline" onClick={() => dispatch({ type: 'CLEAR_FEEDBACK' })}>返回</Button>
          <Button size="lg" className="primary-action" onClick={() => dispatch({ type: 'REQUEST_HELP' })}><HelpCircle size={19} />请师傅提示</Button>
        </div>
        {state.helpRequested && <Button size="lg" className="continue-button" onClick={() => dispatch({ type: 'START_REVIEW' })}>开始入职复盘</Button>}
      </div>
    );
  }

  return null;
}
