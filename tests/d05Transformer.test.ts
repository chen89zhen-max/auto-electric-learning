import { describe, expect, it } from 'vitest';
import { D05_STAGE_CONTENT } from '@/src/levels/d05/d05Training';
import {
  calculateWindingReadingPure,
  evaluateSampleTerminalPair,
} from '@/src/levels/d05/d05Winding';

describe('D05: 变压器实验室 (变压器认知与测试 - 教材拓展／重庆2027备考必学)', () => {
  it('应当严密定义完整的五阶段实训标准流程与导师提示 (含教材拓展/备考必学)', () => {
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

  it('应当在明确假设下估算恒定直流稳态电流与同名端极性加减法则', () => {
    // 恒定直流接入教学变压器初级: 在供电维持、忽略内阻与温升的电阻限流稳态假设下估算 I = U / R
    const vDc = 12.0;
    const rCopper = 0.3;
    const iSteady = vDc / rCopper; // 40.0A (理想稳态估算值，非瞬间电流，非实测值)
    expect(iSteady).toBe(40.0);

    // 同名端串联: U1 = 12V, U2 = 4V
    const uPrimary = 12.0;
    const uSecondary = 4.0;

    const uSubtractive = Math.abs(uPrimary - uSecondary); // 同名端相消差动: 8V
    const uAdditive = uPrimary + uSecondary; // 异名端相加顺动: 16V

    expect(uSubtractive).toBe(8.0);
    expect(uAdditive).toBe(16.0);
  });

  it('绕组初检纯模型：320Ω 在 Ω200 挡超量程为 OL，在 Ω200k 挡为有限读数，证明 OL 不自动等于断路', () => {
    // 纯函数额外测试 320Ω（加上 0.20Ω 表笔阻值为 320.20Ω）
    const rIn200 = calculateWindingReadingPure(320, 'OHM_200', 0.2);
    expect(rIn200.readingKind).toBe('open_or_overrange');
    expect(rIn200.displayText).toBe('OL');
    expect(rIn200.modelReason).toBe('over_range');
    expect(rIn200.rawOhm).toBeNull();

    const rIn200k = calculateWindingReadingPure(320, 'OHM_200K', 0.2);
    expect(rIn200k.readingKind).toBe('finite');
    expect(rIn200k.displayText).toBe('0.320 kΩ');
    expect(rIn200k.modelReason).toBe('continuous');
    expect(rIn200k.rawOhm).toBe(320.2);
    expect(rIn200k.compensatedOhm).toBe(320);
  });

  it('绕组初检纯模型：三个样本 13 项标准测量读数、表笔补偿与开路模型校验', () => {
    // 样本 A: 1-2(32.20/32.00), 3-4(1.40/1.20), 1-3(OL), 1-K(OL)
    const a12 = evaluateSampleTerminalPair('A', 'PAIR_1_2', 'OHM_200')!;
    expect(a12.rawOhm).toBe(32.2);
    expect(a12.compensatedOhm).toBe(32.0);
    expect(a12.displayText).toBe('32.20 Ω');

    const a34 = evaluateSampleTerminalPair('A', 'PAIR_3_4', 'OHM_200')!;
    expect(a34.rawOhm).toBe(1.4);
    expect(a34.compensatedOhm).toBe(1.2);
    expect(a34.displayText).toBe('1.40 Ω');

    const a13 = evaluateSampleTerminalPair('A', 'PAIR_1_3', 'OHM_200')!;
    expect(a13.readingKind).toBe('open_or_overrange');
    expect(a13.displayText).toBe('OL');

    const a1K = evaluateSampleTerminalPair('A', 'PAIR_1_K', 'OHM_200')!;
    expect(a1K.readingKind).toBe('open_or_overrange');
    expect(a1K.displayText).toBe('OL');

    // 样本 B: 1-2 在 OHM_200 为 OL，在 OHM_200K 仍为 OL（真断路开路）
    const b12_200 = evaluateSampleTerminalPair('B', 'PAIR_1_2', 'OHM_200')!;
    expect(b12_200.displayText).toBe('OL');
    expect(b12_200.modelReason).toBe('open_circuit');

    const b12_200k = evaluateSampleTerminalPair('B', 'PAIR_1_2', 'OHM_200K')!;
    expect(b12_200k.displayText).toBe('OL');
    expect(b12_200k.modelReason).toBe('open_circuit');

    const b34 = evaluateSampleTerminalPair('B', 'PAIR_3_4', 'OHM_200')!;
    expect(b34.rawOhm).toBe(1.4);

    // 样本 C: 1-2(0.60/0.40), 3-4(0.50/0.30)
    const c12 = evaluateSampleTerminalPair('C', 'PAIR_1_2', 'OHM_200')!;
    expect(c12.rawOhm).toBe(0.6);
    expect(c12.compensatedOhm).toBe(0.4);
    expect(c12.displayText).toBe('0.60 Ω');

    const c34 = evaluateSampleTerminalPair('C', 'PAIR_3_4', 'OHM_200')!;
    expect(c34.rawOhm).toBe(0.5);
    expect(c34.compensatedOhm).toBe(0.3);
    expect(c34.displayText).toBe('0.50 Ω');

    // 非法样本/端对拒绝，返回 null
    // @ts-expect-error invalid sample ID test
    expect(evaluateSampleTerminalPair('INVALID', 'PAIR_1_2', 'OHM_200')).toBeNull();
    // @ts-expect-error invalid pair test
    expect(evaluateSampleTerminalPair('A', 'INVALID_PAIR', 'OHM_200')).toBeNull();
  });
});
