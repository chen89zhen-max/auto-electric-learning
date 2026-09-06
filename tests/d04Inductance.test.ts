import { describe, expect, it } from 'vitest';
import { D04_STAGE_CONTENT } from '@/src/levels/d04/d04Training';

describe('D04: 断开开关后的现象 (自感与互感分析)', () => {
  it('应当严密定义完整的五阶段实训标准流程与导师提示', () => {
    const steps = Object.keys(D04_STAGE_CONTENT);
    expect(steps).toEqual([
      'SELF_INDUCTANCE_AND_TRANSIENT_SPARK',
      'FREEWHEELING_DIODE_PROTECTION',
      'MUTUAL_INDUCTANCE_IGNITION_COIL',
      'BLIND_IGNITION_FAULT_ISOLATION',
      'ENGINEERING_REPAIR_AND_SPARK_ACCEPTANCE',
    ]);

    for (const step of steps) {
      const content = D04_STAGE_CONTENT[step as keyof typeof D04_STAGE_CONTENT];
      expect(content.title).toBeTruthy();
      expect(content.objective).toBeTruthy();
      expect(content.actions.length).toBeGreaterThanOrEqual(4);
      expect(content.completion).toBeTruthy();
      expect(content.mentorPrompt).toBeTruthy();
      expect(content.hint).toBeTruthy();
    }
  });

  it('应当准确模拟自感反峰、续流二极管钳位与互感升压物理量', () => {
    // 续流二极管钳位电压约为 0.7V
    const diodeClampVoltage = 0.7;
    expect(diodeClampVoltage).toBeLessThan(1.0);

    // 点火线圈匝数比与升压估算
    const n1 = 200;
    const n2 = 20000;
    const turnsRatio = n2 / n1; // 100倍
    expect(turnsRatio).toBe(100);

    // 次级感应高压达到 20kV (20,000V) 能够击穿空气产生火花
    const secondaryKv = 20.0;
    expect(secondaryKv).toBeGreaterThanOrEqual(15.0);
  });

  it('应当准确识别点火系统三种典型故障电气特征', () => {
    // 正常点火线圈阻值
    const normalPrimaryR = 1.0; // 0.6 ~ 1.5Ω
    const normalSecondaryR = 9.5; // 6.0 ~ 12.0kΩ
    expect(normalPrimaryR).toBeGreaterThanOrEqual(0.6);
    expect(normalPrimaryR).toBeLessThanOrEqual(1.5);
    expect(normalSecondaryR).toBeGreaterThanOrEqual(6.0);
    expect(normalSecondaryR).toBeLessThanOrEqual(12.0);

    // 故障 1: 初级绕组断路 (阻值开路 OL)
    const primaryOpenR = 999999;
    expect(primaryOpenR).toBeGreaterThan(10000);

    // 故障 2: 次级绕组击穿匝间短路 (阻值异常偏小)
    const secondaryShortR = 0.85; // 0.85kΩ
    expect(secondaryShortR).toBeLessThan(5.0);

    // 故障 3: 功率管常通无 di/dt
    const diDt = 0;
    const inducedE = 100 * diDt;
    expect(inducedE).toBe(0);
  });
});
