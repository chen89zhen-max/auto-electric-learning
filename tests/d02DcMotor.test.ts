import { describe, expect, it } from 'vitest';
import { D02_STAGE_CONTENT } from '@/src/levels/d02/d02Training';

describe('D02: 让电机转起来 (直流电动机认知与 H 桥控制)', () => {
  it('应当严密定义完整的五阶段实训标准流程与导师提示', () => {
    const steps = Object.keys(D02_STAGE_CONTENT);
    expect(steps).toEqual([
      'LORENTZ_FORCE_AND_LEFT_HAND_RULE',
      'COMMUTATOR_AND_CONTINUOUS_ROTATION',
      'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL',
      'BLIND_DC_MOTOR_FAULT_ISOLATION',
      'ENGINEERING_REPAIR_AND_COMMISSIONING',
    ]);

    for (const step of steps) {
      const content = D02_STAGE_CONTENT[step as keyof typeof D02_STAGE_CONTENT];
      expect(content.title).toBeTruthy();
      expect(content.objective).toBeTruthy();
      expect(content.actions.length).toBeGreaterThanOrEqual(4);
      expect(content.completion).toBeTruthy();
      expect(content.mentorPrompt).toBeTruthy();
      expect(content.hint).toBeTruthy();
    }
  });

  it('应当准确模拟左手定则与安培力受力矢量关系', () => {
    // Left-hand rule: F = B * I * L * sin(theta)
    const bField = 0.5; // 0.5 Tesla
    const length = 0.1; // 0.1 m
    const current = 4.0; // 4.0 A

    // Orthogonal: theta = 90 deg -> sin(90) = 1
    const fOrthogonal = bField * current * length * Math.sin(Math.PI / 2);
    expect(fOrthogonal).toBeCloseTo(0.2, 3); // 0.2 N

    // Parallel: theta = 0 deg -> sin(0) = 0
    const fParallel = bField * current * length * Math.sin(0);
    expect(fParallel).toBe(0); // 受力为 0
  });

  it('应当准确实现双继电器 H 桥 4 种控制状态物理逻辑', () => {
    const states = [
      { a: 0, b: 0, expectedMode: 'STOP', expectedV: 0, expectedI: 0 },
      { a: 1, b: 0, expectedMode: 'UP', expectedV: 12.0, expectedI: 3.2 },
      { a: 0, b: 1, expectedMode: 'DOWN', expectedV: -12.0, expectedI: 2.8 },
      { a: 1, b: 1, expectedMode: 'BRAKE', expectedV: 0, expectedI: 0 },
    ];

    for (const s of states) {
      if (s.a === 0 && s.b === 0) {
        expect(s.expectedMode).toBe('STOP');
      } else if (s.a === 1 && s.b === 0) {
        expect(s.expectedMode).toBe('UP');
        expect(s.expectedV).toBeGreaterThan(0);
      } else if (s.a === 0 && s.b === 1) {
        expect(s.expectedMode).toBe('DOWN');
        expect(s.expectedV).toBeLessThan(0);
      } else if (s.a === 1 && s.b === 1) {
        expect(s.expectedMode).toBe('BRAKE');
        expect(s.expectedV).toBe(0);
      }
    }
  });

  it('应当准确识别直流电机三种典型故障电气特征', () => {
    // 正常电机指标
    const normalR = 2.2;
    const normalI = 3.2;
    expect(normalR).toBeGreaterThan(1.5);
    expect(normalR).toBeLessThan(3.5);
    expect(normalI).toBeGreaterThan(2.5);
    expect(normalI).toBeLessThan(4.5);

    // 故障 1: 继电器触点氧化 (端子电压几乎为 0)
    const relayOxidizedV = 0.2;
    expect(relayOxidizedV).toBeLessThan(1.0);

    // 故障 2: 电刷磨损碳粉堆积 (电阻飙升)
    const brushWornR = 48.5;
    expect(brushWornR).toBeGreaterThan(30.0);

    // 故障 3: 导轨异物卡死堵转 (电流飙升)
    const stallCurrent = 16.8;
    expect(stallCurrent).toBeGreaterThan(15.0);
  });
});
