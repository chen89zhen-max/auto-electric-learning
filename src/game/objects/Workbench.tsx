'use client';

import { Eye, Power, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/src/stores/gameStore';

export function Workbench() {
  const { state, dispatch } = useGameStore();
  return (
    <div className="workbench-card">
      <div className="workbench-topline">
        <div><p>训练台</p><small>WB-01 · 入职训练设备</small></div>
        <button type="button" className={state.workbenchPower === 'ON' ? 'power-state on' : 'power-state off'} onClick={() => dispatch({ type: 'VIEW_POWER' })} aria-label={`查看电源状态，当前 ${state.workbenchPower}`}>
          <span /> {state.workbenchPower}
        </button>
      </div>
      <div className={state.guardState === 'OPEN' ? 'guard-window open' : 'guard-window'}>
        <ShieldAlert size={34} aria-hidden="true" />
        <strong>训练区域护盖</strong>
        <small>{state.guardState === 'OPEN' ? '已打开' : '已关闭'}</small>
      </div>
      <div className="workbench-controls">
        <Button size="lg" variant="outline" onClick={() => dispatch({ type: 'VIEW_POWER' })}><Eye size={19} />观察设备状态</Button>
        <Button size="lg" variant="outline" onClick={() => dispatch({ type: 'TOGGLE_POWER' })}><Power size={19} />电源开关</Button>
        <Button size="lg" className="primary-action" disabled={state.guardState === 'OPEN'} onClick={() => dispatch({ type: 'OPEN_GUARD' })}>打开护盖</Button>
      </div>
      {state.guardState === 'OPEN' && <Button size="lg" className="continue-button" onClick={() => dispatch({ type: 'CONTINUE_AFTER_SAFETY' })}>继续训练</Button>}
    </div>
  );
}
