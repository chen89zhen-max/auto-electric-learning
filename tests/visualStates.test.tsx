import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrainingVehicle } from '@/src/components/visuals/TrainingVehicle';
import { TrainingPerson } from '@/src/components/visuals/TrainingPerson';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
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

describe('实训人物与导师美术组件渲染验证', () => {
  it('正确渲染小张站立、倒地及 CPR 按压姿态，并包含正确的无障碍描述与按压响应结构', () => {
    // 站姿
    const standingHtml = renderToStaticMarkup(<TrainingPerson pose="standing" action={false} />);
    expect(standingHtml).toContain('穿着现代电工工装的见习技师小张');
    expect(standingHtml).toContain('standing-person');
    expect(standingHtml).toContain('technician_standing.png');

    // 挥手动作
    const wavingHtml = renderToStaticMarkup(<TrainingPerson pose="standing" action={true} />);
    expect(wavingHtml).toContain('person-wave');

    // 倒地姿态
    const lyingHtml = renderToStaticMarkup(<TrainingPerson pose="lying" />);
    expect(lyingHtml).toContain('倒地学员小张');
    expect(lyingHtml).toContain('lying-person');
    expect(lyingHtml).toContain('technician_lying.png');

    // CPR 按压实操模型（未按压 vs 下压动效）
    const cprRestHtml = renderToStaticMarkup(<TrainingPerson pose="cpr" action={false} />);
    expect(cprRestHtml).toContain('心肺复苏按压模型');
    expect(cprRestHtml).toContain('按压靶心 · 胸骨下半段');
    expect(cprRestHtml).toContain('0.0 cm');

    const cprDepressedHtml = renderToStaticMarkup(<TrainingPerson pose="cpr" action={true} />);
    expect(cprDepressedHtml).toContain('心肺复苏模型正在下压 5~6cm 并充分回弹');
    expect(cprDepressedHtml).toContain('▼ 5.4 cm');
  });

  it('正确渲染带教技师陈师傅头像，并支持不同微表情状态', () => {
    const normalHtml = renderToStaticMarkup(<MasterChenAvatar emotion="NORMAL" />);
    expect(normalHtml).toContain('带教技师陈师傅：讲解');
    expect(normalHtml).toContain('chen-normal');
    expect(normalHtml).toContain('导师');

    const warningHtml = renderToStaticMarkup(<MasterChenAvatar emotion="WARNING" />);
    expect(warningHtml).toContain('带教技师陈师傅：提醒');
    expect(warningHtml).toContain('chen-warning');
    expect(warningHtml).toContain('!');

    const praiseHtml = renderToStaticMarkup(<MasterChenAvatar emotion="PRAISE" />);
    expect(praiseHtml).toContain('带教技师陈师傅：鼓励');
    expect(praiseHtml).toContain('chen-praise');

    const thinkingHtml = renderToStaticMarkup(<MasterChenAvatar emotion="THINKING" />);
    expect(thinkingHtml).toContain('带教技师陈师傅：思考');
    expect(thinkingHtml).toContain('chen-thinking');
    expect(thinkingHtml).toContain('?');
  });
});

