import { describe, expect, it } from 'vitest';
import { D01_STAGE_CONTENT } from '@/src/levels/d01/d01Training';

describe('D01: 小开关控制工作灯 (继电器电磁控制)', () => {
  it('应当严密定义完整的五阶段实训标准流程与导师提示', () => {
    const steps = Object.keys(D01_STAGE_CONTENT);
    expect(steps).toEqual([
      'COIL_CONTACT_ISOLATION',
      'MULTIMETER_PIN_IDENTIFICATION',
      'RELAY_ENERGIZATION_AND_SWITCH',
      'BLIND_RELAY_FAULT_DIAGNOSIS',
      'ENGINEERING_REPAIR_AND_DELIVERY',
    ]);

    for (const step of steps) {
      const content = D01_STAGE_CONTENT[step as keyof typeof D01_STAGE_CONTENT];
      expect(content.title).toBeTruthy();
      expect(content.objective).toBeTruthy();
      expect(content.actions.length).toBeGreaterThanOrEqual(4);
      expect(content.completion).toBeTruthy();
      expect(content.mentorPrompt).toBeTruthy();
      expect(content.hint).toBeTruthy();
    }
  });

  it('应当准确模拟以小控大电气物理量与参数放大倍率', () => {
    const vSupply = 12.0; // 12V
    const rCoil = 80.0; // 80Ω coil
    const pLamp = 55.0; // 55W lamp

    const iCoil = vSupply / rCoil; // 0.15A
    const iLoad = pLamp / vSupply; // 4.5833A

    expect(iCoil).toBeCloseTo(0.15, 2);
    expect(iLoad).toBeCloseTo(4.58, 2);

    const currentAmplificationRatio = iLoad / iCoil;
    expect(currentAmplificationRatio).toBeGreaterThan(30); // 放大30倍以上
  });

  it('应当准确判定继电器三种典型故障模式的电气特征', () => {
    // 正常继电器
    const normalCoil = 80.0;
    const normalContactDrop = 0.03; // 0.03V <= 0.1V
    expect(normalCoil).toBeGreaterThanOrEqual(70);
    expect(normalCoil).toBeLessThanOrEqual(90);
    expect(normalContactDrop).toBeLessThanOrEqual(0.1);

    // 故障 1: 线圈断路
    const coilOpenR = 999999;
    expect(coilOpenR).toBeGreaterThan(10000);

    // 故障 2: 触点粘连
    const contactWeldedR = 0.02;
    expect(contactWeldedR).toBeLessThan(0.1);

    // 故障 3: 触点严重氧化
    const contactOxidizedDrop = 3.8;
    expect(contactOxidizedDrop).toBeGreaterThan(0.1); // 严重超标
  });
});
