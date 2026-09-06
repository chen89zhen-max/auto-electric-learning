import { describe, it, expect } from 'vitest';
import { Multimeter } from '../src/game/instruments/Multimeter';
import { ClampMeter } from '../src/game/instruments/ClampMeter';

describe('Multimeter Model - Task Book Section 3 (V03, V04, V05, V06)', () => {
  // V03: 电压表笔从正负接法交换 -> 读数从+12V变为−12V，不能报接线故障
  it('V03: probe swapping in DC_V flips reading from +12V to -12V without error', () => {
    const dmm = new Multimeter();
    dmm.setDial('DC_V');

    // Circuit: 12V battery with node 1 (12V) and node 0 (0V)
    const nodeVoltages = new Map<string, number>();
    nodeVoltages.set('1', 12.0);
    nodeVoltages.set('0', 0.0);

    // Normal probe polarity: red at 1, black at 0
    dmm.attachRedProbe('BAT_POS');
    dmm.attachBlackProbe('BAT_NEG');
    const normalState = dmm.measure({
      nodeVoltages,
      redNode: '1',
      blackNode: '0',
    });

    expect(normalState.status).toBe('NORMAL');
    expect(normalState.measuredValue).toBeCloseTo(12.0, 4);
    expect(normalState.displayText).toBe('12.00 V');

    // Swapped probe polarity: red at 0, black at 1
    dmm.attachRedProbe('BAT_NEG');
    dmm.attachBlackProbe('BAT_POS');
    const swappedState = dmm.measure({
      nodeVoltages,
      redNode: '0',
      blackNode: '1',
    });

    // Must cleanly display -12.00 V and NOT throw or report wiring failure
    expect(swappedState.status).toBe('NORMAL');
    expect(swappedState.measuredValue).toBeCloseTo(-12.0, 4);
    expect(swappedState.displayText).toBe('-12.00 V');
  });

  // V04: 220Ω±5%，实测224Ω或240Ω -> 分别在/不在209—231Ω区间；单位变更后结论不变
  it('V04: evaluates resistor tolerance for 220Ω ± 5% (209 ~ 231Ω)', () => {
    const nominal = 220;
    const tolerancePct = 5;

    // 224Ω sample
    const eval224 = Multimeter.evaluateTolerance(224, nominal, tolerancePct);
    expect(eval224.minAllowed).toBeCloseTo(209, 4);
    expect(eval224.maxAllowed).toBeCloseTo(231, 4);
    expect(eval224.isQualified).toBe(true);

    // 240Ω sample (out of tolerance)
    const eval240 = Multimeter.evaluateTolerance(240, nominal, tolerancePct);
    expect(eval240.isQualified).toBe(false);

    // Boundary edge cases: 209Ω and 231Ω are qualified
    expect(Multimeter.evaluateTolerance(209.0, nominal, tolerancePct).isQualified).toBe(true);
    expect(Multimeter.evaluateTolerance(231.0, nominal, tolerancePct).isQualified).toBe(true);
    expect(Multimeter.evaluateTolerance(208.9, nominal, tolerancePct).isQualified).toBe(false);
    expect(Multimeter.evaluateTolerance(231.1, nominal, tolerancePct).isQualified).toBe(false);
  });

  // V05: 在带电网络使用Ω挡 -> 动作拒绝，原因可读，无虚构测阻结果
  it('V05: refuses resistance measurement on live network with clear explanation and no fictional value', () => {
    const dmm = new Multimeter();
    dmm.setDial('RESISTANCE');

    const state = dmm.measure({
      isCircuitPowered: true,
      isolatedResistance: 220, // If circuit is live, this must be refused!
    });

    expect(state.status).toBe('REFUSED_LIVE_CIRCUIT');
    expect(state.measuredValue).toBeNull();
    expect(state.displayText).toBe('Err');
    expect(state.warningMessage).toContain('严禁在带电网络中使用电阻挡');

    // When power is cut / isolated, measurement succeeds cleanly
    const safeState = dmm.measure({
      isCircuitPowered: false,
      isolatedResistance: 224.0,
    });
    expect(safeState.status).toBe('NORMAL');
    expect(safeState.measuredValue).toBeCloseTo(224.0, 1);
    expect(safeState.displayText).toBe('224.0 Ω');
  });

  // V06: 电流挡直接跨接电源 -> 执行前拒绝；不能为了演示熔断而实际推进危险操作状态
  it('V06: intercepts ammeter direct bridge across battery terminals and prevents short circuit', () => {
    const dmm = new Multimeter();
    dmm.setDial('DC_A');

    const state = dmm.measure({
      isDirectBatteryBridge: true,
    });

    expect(state.status).toBe('REFUSED_SHORT_CIRCUIT');
    expect(state.measuredValue).toBeNull();
    expect(state.displayText).toBe('Err');
    expect(state.warningMessage).toContain('危险拦截：电流挡内阻极小，严禁直接并联/跨接在蓄电池或电源两端');
    expect(state.fuseBlown).toBe(true);
  });

  it('correctly reports jack mismatch when red probe is in 10A jack while measuring voltage', () => {
    const dmm = new Multimeter();
    dmm.setDial('DC_V');
    dmm.setRedProbeJack('A_10A'); // User plugged into current jack

    const state = dmm.measure({
      nodeVoltages: new Map([['1', 12], ['0', 0]]),
      redNode: '1',
      blackNode: '0',
    });

    expect(state.status).toBe('JACK_MISMATCH');
    expect(state.displayText).toBe('Err');
    expect(state.warningMessage).toContain('红表笔必须插入 VΩ 插孔');
  });

  it('correctly models clamp meter non-contact single-conductor and dual-conductor flux cancellation', () => {
    const clamp = new ClampMeter();
    clamp.setDial('DC_A');

    // Single conductor clamped
    const singleState = clamp.clampWires([
      { id: 'W1', name: '灯头供电线', current: 1.82, direction: 'FEED' },
    ]);
    expect(singleState.measuredCurrent).toBeCloseTo(1.82, 2);
    expect(singleState.displayText).toBe('1.82 A');
    expect(singleState.educationalNote).toContain('非接触钳测成功');

    // Dual conductors clamped together (feed and return)
    const dualState = clamp.clampWires([
      { id: 'W1', name: '灯头供电线', current: 1.82, direction: 'FEED' },
      { id: 'W2', name: '车身搭铁线', current: 1.82, direction: 'RETURN' },
    ]);
    expect(dualState.measuredCurrent).toBeCloseTo(0.0, 2);
    expect(dualState.displayText).toBe('0.00 A');
    expect(dualState.educationalNote).toContain('教学反例提醒：同时钳入供电线与搭铁回路时，两根导线磁场相互抵消');
  });
});
