'use client';

import { Activity, HeartPulse, Megaphone, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import firstAidConfig from '@/src/levels/level01/firstAidConfig.json';
import { useLevel01Store } from '@/src/stores/level01Store';

const actions = [
  { id: 'CHECK_RESPONSE' as const, label: '呼叫并轻拍，检查反应', icon: UserCheck },
  { id: 'CALL_HELP' as const, label: '呼叫周围人员并启动求助', icon: Megaphone },
  { id: 'CHECK_BREATHING' as const, label: '观察并判断呼吸状态', icon: Activity },
];

export function FirstAidScene() {
  const { state, dispatch } = useLevel01Store();
  if (state.currentStage === 'FIRST_AID_ASSESSMENT') {
    return <div className="first-aid-stage"><section className="casualty-card"><span><UserCheck size={48} /></span><p className="step-label">现场电源已隔离</p><h2>判断人员状态</h2><p>系统预设：人员无反应，呼吸异常。请按现场处置顺序操作。</p></section><section className="sequence-panel"><div className="sequence-progress">{actions.map((item, index) => <span key={item.id} className={index < state.firstAidStep ? 'done' : index === state.firstAidStep ? 'active' : ''}>{index + 1}</span>)}</div><div className="action-stack">{actions.map(({ id, label, icon: Icon }) => <Button key={id} size="lg" variant="outline" onClick={() => dispatch({ type: 'FIRST_AID_ACTION', action: id })}><Icon size={19} />{label}</Button>)}</div></section></div>;
  }
  return <div className="practice-stage"><section className="practice-card"><span className="heart-beat"><HeartPulse size={46} /></span><p className="step-label">简化急救操作 · 顺序训练</p><h2>跟随屏幕节奏模拟操作</h2><p>本关不考核具体按压参数；正式教学参数须完成专业复核。</p><button type="button" className="rhythm-button" onClick={() => dispatch({ type: 'PRACTICE_FIRST_AID' })}><HeartPulse size={28} /><strong>按节奏操作</strong><span>{state.firstAidPracticeCount} / {firstAidConfig.practiceActionsRequired}</span></button><div className="practice-meter"><i style={{ width: `${(state.firstAidPracticeCount / firstAidConfig.practiceActionsRequired) * 100}%` }} /></div><Button size="lg" className="primary-action" disabled={state.firstAidPracticeCount < firstAidConfig.practiceActionsRequired} onClick={() => dispatch({ type: 'COMPLETE_FIRST_AID' })}>完成人员初步处置</Button></section></div>;
}
