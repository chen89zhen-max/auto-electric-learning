'use client';

import { Eye, FlameKindling, Megaphone, Power, ShieldAlert, SprayCan, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import knowledgeData from '@/src/levels/level01/knowledge.json';
import { KnowledgeCard, type KnowledgeCardData } from '@/src/components/KnowledgeCard';
import { useLevel01Store } from '@/src/stores/level01Store';
import type { ExtinguisherType } from '@/src/levels/level01/level01Types';

const knowledge = knowledgeData as KnowledgeCardData[];
const extinguishers: Array<{ id: ExtinguisherType; name: string; scope: string; suitable: boolean }> = [
  { id: 'CO2', name: '二氧化碳灭火器', scope: '电气设备等火情', suitable: true },
  { id: 'DRY_CHEMICAL', name: '干粉灭火器', scope: '多类初起火情', suitable: true },
  { id: 'FOAM', name: '泡沫灭火器', scope: '部分可燃液体和固体火情', suitable: false },
  { id: 'WATER_BASED', name: '水基灭火器', scope: '按铭牌规定使用', suitable: false },
];

function SmokePanel({ power }: { power: 'ON' | 'OFF' }) {
  return <div className="smoke-panel"><div className="smoke-cloud"><span /><span /><span /></div><ShieldAlert size={52} /><strong>配电箱异常冒烟</strong><small>电源状态：{power}</small></div>;
}

export function FireScene() {
  const { state, dispatch } = useLevel01Store();
  if (state.currentStage === 'FIRE_EVENT') return <div className="fire-stage"><SmokePanel power={state.firePowerState} /><section className="fire-actions"><p className="step-label">新的突发情况</p><h2>现在先做什么？</h2><Button size="lg" variant="outline" onClick={() => dispatch({ type: 'CHECK_FIRE_DEVICE' })}><Eye size={19} />查看冒烟设备</Button><Button size="lg" variant="outline" onClick={() => dispatch({ type: 'CHECK_FIRE_POWER' })}><Power size={19} />查看电源状态</Button><Button size="lg" variant="outline" onClick={() => dispatch({ type: 'REQUEST_FIRE_SUPPORT' })}><Megaphone size={19} />呼叫周围人员支援</Button><Button size="lg" variant="outline" className="unsafe-choice" onClick={() => dispatch({ type: 'USE_WATER' })}><Waves size={19} />直接用水</Button></section></div>;

  if (state.currentStage === 'FIRE_RISK_ASSESSMENT' && !state.fireKnowledgeAcknowledged) {
    const card = knowledge.find((item) => item.id === 'ELECTRICAL_FIRE')!;
    return <div className="knowledge-stage"><KnowledgeCard card={card} actionLabel="已识别，继续处置" onComplete={() => dispatch({ type: 'ACK_FIRE_KNOWLEDGE' })}><p className="micro-prompt"><FlameKindling size={18} />不夸大火焰，先识别设备和电源。</p></KnowledgeCard></div>;
  }

  if (state.currentStage === 'FIRE_RESPONSE') return <div className="fire-response-stage"><section className="response-card"><span><SprayCan size={42} /></span><p className="step-label">器材已选择 · {state.selectedExtinguisher === 'CO2' ? '二氧化碳灭火器' : '干粉灭火器'}</p><h2>在安全范围内模拟处置</h2><p>电源已隔离，器材与当前情境匹配。</p><Button size="lg" className="primary-action" onClick={() => dispatch({ type: 'EXECUTE_FIRE_RESPONSE' })}>执行并确认火情解除</Button></section></div>;

  return <div className="fire-assessment-stage"><SmokePanel power={state.firePowerState} /><section className="fire-control-panel"><p className="step-label">电气火情 · 先控制危险源</p><h2>检查电源，选择器材</h2><div className="fire-power-line"><span>配电箱电源</span><strong className={state.firePowerState === 'ON' ? 'on' : 'off'}>{state.firePowerChecked ? state.firePowerState : '未查看'}</strong></div><div className="fire-control-actions"><Button variant="outline" onClick={() => dispatch({ type: 'CHECK_FIRE_POWER' })}><Eye size={17} />查看电源</Button><Button variant="outline" disabled={!state.firePowerChecked || state.firePowerState === 'OFF'} onClick={() => dispatch({ type: 'ISOLATE_FIRE_POWER' })}><Power size={17} />切断电源</Button></div><div className="extinguisher-wall">{extinguishers.map((item) => <button type="button" key={item.id} onClick={() => dispatch({ type: 'SELECT_EXTINGUISHER', extinguisherType: item.id })}><SprayCan size={25} /><strong>{item.name}</strong><small>{item.scope}</small><em>{item.suitable ? '当前情境：可选' : '当前情境：不适用'}</em></button>)}</div></section></div>;
}
