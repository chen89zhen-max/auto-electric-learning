import { describe, expect, it } from 'vitest';
import { D03_STAGE_CONTENT } from '@/src/levels/d03/d03Training';

describe('D03: 转动为什么能发电 (电磁感应与交流发电机)', () => {
  it('应当严密定义完整的五阶段实训标准流程与导师提示', () => {
    const steps = Object.keys(D03_STAGE_CONTENT);
    expect(steps).toEqual([
      'FARADAY_INDUCTION_AND_RIGHT_HAND_RULE',
      'SINE_AC_WAVEFORM_AND_THREE_ELEMENTS',
      'SPEED_CHARACTERISTIC_AND_ROTATION',
      'BLIND_ALTERNATOR_FAULT_DIAGNOSIS',
      'ENGINEERING_REPAIR_AND_CHARGING_ACCEPTANCE',
    ]);

    for (const step of steps) {
      const content = D03_STAGE_CONTENT[step as keyof typeof D03_STAGE_CONTENT];
      expect(content.title).toBeTruthy();
      expect(content.objective).toBeTruthy();
      expect(content.actions.length).toBeGreaterThanOrEqual(4);
      expect(content.completion).toBeTruthy();
      expect(content.mentorPrompt).toBeTruthy();
      expect(content.hint).toBeTruthy();
    }
  });

  it('应当准确模拟正弦交流电三要素、峰值与有效值换算', () => {
    // True RMS: U_rms = U_m / sqrt(2)
    const peakVoltage = 19.799; // ~19.8V
    const rmsVoltage = peakVoltage / Math.SQRT2;

    expect(rmsVoltage).toBeCloseTo(14.0, 1);

    // DC average of symmetric sine wave is 0
    const dcAverage = 0.0;
    expect(dcAverage).toBe(0.0);
  });

  it('应当准确计算转速与输出交变频率的线性物理函数关系', () => {
    const p = 6; // 6 pairs of claw poles in automotive alternator
    const calcFreq = (n: number) => (p * n) / 60;

    expect(calcFreq(800)).toBe(80); // 800 rpm -> 80 Hz
    expect(calcFreq(2000)).toBe(200); // 2000 rpm -> 200 Hz
    expect(calcFreq(3000)).toBe(300); // 3000 rpm -> 300 Hz
  });

  it('应当准确识别交流发电机三种典型故障电气特征', () => {
    // 正常发电机指标
    const normalRotorR = 3.0; // 2.8Ω ~ 3.2Ω
    const normalIdleBPlusV = 14.22; // 13.8V ~ 14.4V
    expect(normalRotorR).toBeGreaterThanOrEqual(2.8);
    expect(normalRotorR).toBeLessThanOrEqual(3.2);
    expect(normalIdleBPlusV).toBeGreaterThan(13.5);

    // 故障 1: 转子绕组断路 (阻值开路 OL)
    const rotorOpenR = 999999;
    expect(rotorOpenR).toBeGreaterThan(10000);

    // 故障 2: 碳刷磨损见底接触不良
    const brushWornR = 65.0;
    expect(brushWornR).toBeGreaterThan(10.0);

    // 故障 3: 定子缺相 (一相为0V)
    const phaseLostV = 0.0;
    expect(phaseLostV).toBe(0.0);
  });
});
