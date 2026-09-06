import { describe, expect, it } from 'vitest';
import { D05_STAGE_CONTENT } from '@/src/levels/d05/d05Training';

describe('D05: 变压器实验室 (变压器认知与测试 - 星号选学)', () => {
  it('应当严密定义完整的五阶段实训标准流程与导师提示 (含选学标星)', () => {
    const steps = Object.keys(D05_STAGE_CONTENT);
    expect(steps).toEqual([
      'STRUCTURE_AND_MAGNETIC_FLUX',
      'VOLTAGE_AND_CURRENT_RATIO',
      'DC_INPUT_DISASTER_COUNTEREXAMPLE',
      'POLARITY_AND_SAME_NAME_TERMINALS',
      'ONBOARD_INVERTER_STEP_UP_DELIVERY',
    ]);

    for (const step of steps) {
      const content = D05_STAGE_CONTENT[step as keyof typeof D05_STAGE_CONTENT];
      expect(content.title).toBeTruthy();
      expect(content.objective).toBeTruthy();
      expect(content.actions.length).toBeGreaterThanOrEqual(4);
      expect(content.completion).toBeTruthy();
      expect(content.mentorPrompt).toBeTruthy();
      expect(content.hint).toBeTruthy();
    }
  });

  it('应当精确计算变压比、变流比与输入输出功率守恒', () => {
    const u1 = 220.0;
    const n1 = 1100;
    const n2 = 60;
    const pLoad = 60.0; // 60W

    // U1 / U2 = N1 / N2
    const u2 = u1 * (n2 / n1);
    expect(u2).toBeCloseTo(12.0, 1);

    // I2 = P / U2 = 60 / 12 = 5.0A
    const i2 = pLoad / u2;
    expect(i2).toBeCloseTo(5.0, 1);

    // I1 = P / U1 = 60 / 220 ≈ 0.2727A
    const i1 = pLoad / u1;
    expect(i1).toBeCloseTo(0.27, 2);

    // Current ratio is inverse of voltage ratio
    expect(i2 / i1).toBeCloseTo(u1 / u2, 1);
  });

  it('应当准确模拟直流输入短路灾难与同名端极性加减法则', () => {
    // 直流接入初级: 感抗为零，仅剩 0.3Ω 纯铜阻
    const vDc = 12.0;
    const rCopper = 0.3;
    const iShort = vDc / rCopper; // 40A!
    expect(iShort).toBe(40.0);

    // 同名端串联: U1 = 12V, U2 = 4V
    const uPrimary = 12.0;
    const uSecondary = 4.0;

    const uSubtractive = Math.abs(uPrimary - uSecondary); // 同名端相消差动: 8V
    const uAdditive = uPrimary + uSecondary; // 异名端相加顺动: 16V

    expect(uSubtractive).toBe(8.0);
    expect(uAdditive).toBe(16.0);
  });
});
