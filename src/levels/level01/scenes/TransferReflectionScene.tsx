'use client';

import { Check, Eye, RotateCcw, Settings, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import reviewData from '@/src/levels/level01/review.json';
import { useLevel01Store } from '@/src/stores/level01Store';

export function TransferReflectionScene() {
  const { state, dispatch } = useLevel01Store();
  if (state.currentStage === 'TRANSFER_CHECK') return <div className="transfer-stage"><section className="new-device-card"><div className="active-status-light" /><Settings size={56} /><strong>陌生设备</strong><span><Volume2 size={17} />出现异常响声</span><small>状态灯仍亮</small></section><section className="transfer-question"><p className="step-label">迁移测试 · 不提供相同提示</p><h2>{reviewData.transfer.prompt}</h2><div className="action-stack">{reviewData.transfer.options.map((option) => <Button key={option.id} size="lg" variant="outline" onClick={() => dispatch({ type: 'TRANSFER_ACTION', operation: option.id as 'OBSERVE_STATUS' | 'OPEN_DEVICE' | 'CHANGE_COMPONENT' })}>{option.id === 'OBSERVE_STATUS' ? <Eye size={19} /> : <Settings size={19} />}{option.label}</Button>)}</div></section></div>;

  const labels = new Map(reviewData.reflection.steps.map((step) => [step.id, step.label]));
  return <div className="reflection-stage"><section className="reflection-card"><p className="step-label">最后复盘</p><h2>{reviewData.reflection.prompt}</h2><p>依次点击，排出一条完整的安全处置链。</p><div className="reflection-selected">{state.reflectionSequence.length === 0 ? <span>从“观察现场”开始</span> : state.reflectionSequence.map((id, index) => <span key={id}><b>{index + 1}</b>{labels.get(id)}</span>)}</div><div className="reflection-options">{reviewData.reflection.steps.map((step) => <button type="button" key={step.id} disabled={state.reflectionSequence.includes(step.id)} onClick={() => dispatch({ type: 'ADD_REFLECTION_STEP', stepId: step.id })}>{step.label}</button>)}</div><div className="reflection-actions"><Button variant="outline" onClick={() => dispatch({ type: 'RESET_REFLECTION' })}><RotateCcw size={17} />重排</Button><Button className="primary-action" disabled={state.reflectionSequence.length === 0} onClick={() => dispatch({ type: 'SUBMIT_REFLECTION' })}><Check size={17} />提交安全处置链</Button></div></section></div>;
}
