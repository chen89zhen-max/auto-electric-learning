import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrainingVehicle } from '@/src/components/visuals/TrainingVehicle';
import { CircuitTopologyEngine } from '@/src/circuit/CircuitTopologyEngine';
import { currentDirection } from '@/src/circuit/currentDirection';

describe('动画服从电路状态', () => {
  it('接线后未通电，前灯与电流动画保持关闭', () => {
    const html = renderToStaticMarkup(<TrainingVehicle connected powered={false} xray />);
    expect(html).toContain('搭铁连接完成 · 等待通电');
    expect(html).not.toContain('data-light-beam');
    expect(html).not.toContain('data-current-flow');
  });
  it('闭合回路通电后亮灯，透视后展示回流；断开搭铁即使电源开也不亮', () => {
    const render = (connected: boolean, xray: boolean) => renderToStaticMarkup(<TrainingVehicle connected={connected} powered xray={xray} />);
    expect(render(true, false)).toContain('data-light-beam');
    expect(render(true, false)).not.toContain('data-current-flow');
    expect(render(true, true)).toContain('data-current-flow');
    expect(render(false, true)).not.toContain('data-light-beam');
  });
  it('反向点击端子接线不会倒转电流动画，断路后所有流动停止', () => {
    const engine = new CircuitTopologyEngine();
    engine.connect('FUSE_T1', 'BAT_POS');
    engine.connect('FUSE_T2', 'SW_T1');
    engine.connect('SW_T2', 'LAMP_T1');
    engine.connect('BAT_NEG', 'LAMP_T2');
    engine.setSwitchState('CLOSED');
    expect(currentDirection(engine.analyze(), 'FUSE_T1', 'BAT_POS')).toBe(-1);
    expect(currentDirection(engine.analyze(), 'BAT_NEG', 'LAMP_T2')).toBe(-1);
    expect(currentDirection(engine.analyze(), 'FUSE_T2', 'SW_T1')).toBe(1);
    expect(currentDirection(engine.analyze(), 'FUSE_T1', 'SW_T1')).toBe(0);
    engine.setSwitchState('OPEN');
    expect(currentDirection(engine.analyze(), 'FUSE_T2', 'SW_T1')).toBe(0);
  });
});
