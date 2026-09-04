'use client';

import { AlertTriangle, Eye, Hand, Lightbulb, Power, Siren, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import knowledgeData from '@/src/levels/level01/knowledge.json';
import { KnowledgeCard, type KnowledgeCardData } from '@/src/components/KnowledgeCard';
import { useLevel01Store } from '@/src/stores/level01Store';

const knowledge = knowledgeData as KnowledgeCardData[];

function AccidentWorkbench() {
  const { state } = useLevel01Store();
  return <div className="accident-workbench"><div className="bench-label"><strong>2号实训台</strong><small>训练设备</small></div><div className={state.warningLight ? 'warning-lamp active' : 'warning-lamp'}><Lightbulb size={24} /><span>{state.warningLight ? '警示灯亮' : '警示灯熄灭'}</span></div><div className={state.powerState === 'ON' ? 'large-power on' : 'large-power off'}><Power size={28} /><strong>POWER {state.powerState}</strong></div></div>;
}

export function AccidentScene() {
  const { state, dispatch } = useLevel01Store();
  if (state.currentStage === 'WORK_ORDER') return <div className="welcome-stage"><div className="orientation-card"><p className="step-label">正式学习任务 1</p><h2>安全训练任务</h2><p>今天开始正式训练。先去看看2号实训台。</p><Button size="lg" className="primary-action" onClick={() => dispatch({ type: 'OPEN_WORK_ORDER' })}>查看安全训练工单</Button></div></div>;

  if (state.currentStage === 'ACCIDENT_DISCOVERY') {
    return <div className="accident-stage"><div className="sound-effect">啪！</div><AccidentWorkbench /><button type="button" className="person-down" onClick={() => dispatch({ type: 'TOUCH_PERSON' })}><UserRound size={46} /><strong>学员倒地</strong><small>拉起人员 / 接触人员</small></button><div className="accident-actions"><Button size="lg" variant="outline" onClick={() => dispatch({ type: 'CHECK_ENVIRONMENT' })}><Eye size={19} />观察周围环境</Button><Button size="lg" variant="outline" onClick={() => dispatch({ type: 'ISOLATE_POWER' })}><Power size={19} />关闭相关电源</Button><Button size="lg" variant="outline" onClick={() => dispatch({ type: 'REQUEST_HINT' })}><Siren size={19} />请师傅提示</Button></div></div>;
  }

  if (state.currentStage === 'ENVIRONMENT_CHECK') {
    return <div className="environment-stage"><AccidentWorkbench /><section className="status-inspection"><p className="step-label">环境观察结果</p><h2>危险仍可能存在</h2><dl><div><dt>工作状态</dt><dd>ON</dd></div><div><dt>电源指示</dt><dd>亮</dd></div><div><dt>人员状态</dt><dd>倒地</dd></div><div><dt>是否仍可能接触带电设备</dt><dd>无法排除</dd></div></dl><Button size="lg" className="danger-control" onClick={() => dispatch({ type: 'ISOLATE_POWER' })}><Power size={19} />切断相关电源</Button></section></div>;
  }

  if (state.currentStage === 'POWER_ISOLATION') {
    return <div className="isolation-stage"><div className="isolation-success"><span><Power size={34} /></span><p className="step-label">POWER OFF</p><h2>危险源已控制</h2><p>设备停止，警示灯熄灭。现在再接近人员。</p><Button size="lg" className="primary-action" onClick={() => dispatch({ type: 'OPEN_KNOWLEDGE' })}>查看刚才发生了什么</Button></div></div>;
  }

  if (state.currentStage === 'SHOCK_MICRO_LEARNING') {
    const card = knowledge[state.knowledgeIndex];
    const prompts = [
      <p key="risk" className="micro-prompt"><AlertTriangle size={18} />先控制危险，再理解现象。</p>,
      <p key="single" className="micro-prompt"><Eye size={18} />先观察通路，再记住名称。</p>,
      <div key="two" className="micro-choice"><span>电流有没有可能经过人体？</span><strong>有可能</strong></div>,
      <div key="step" className="step-zones"><span>靠近落地点 · 风险高</span><span>远离并减小步幅 · 风险降低</span></div>,
      <div key="env" className="environment-options"><span>干燥环境</span><span>潮湿环境</span><strong>狭小导电环境 · 防护要求更高</strong></div>,
    ][state.knowledgeIndex];
    return <div className="knowledge-stage"><KnowledgeCard card={card} actionLabel={state.knowledgeIndex === 4 ? '进入人员处置' : '完成这个微情境'} onComplete={() => dispatch({ type: 'COMPLETE_MICRO_SCENARIO', knowledgeId: card.id })}>{prompts}</KnowledgeCard></div>;
  }

  return <div className="milestone-placeholder"><Hand size={42} /><p className="step-label">里程碑 1 已完成</p><h2>危险源已控制</h2><p>人员处置、火情迁移与能力报告将在里程碑 2 接入。</p></div>;
}
