import { describe, expect, it } from 'vitest';
import {
  createA02Progress,
  findClosestA02Terminal,
  recordA02Measurement,
  type A02MeasurementSnapshot,
} from '@/src/levels/a02/a02Training';

const validVoltageMeasurement: A02MeasurementSnapshot = {
  step: 'BATTERY_PROBING',
  dial: 'DC_V',
  redJack: 'V_OHM',
  redProbe: 'BAT_POS',
  blackProbe: 'BAT_NEG',
  switchClosed: true,
  status: 'NORMAL',
  measuredValue: 12,
};

describe('A02 实训测量记录规则', () => {
  it('挡位或插孔错误时不能记录蓄电池正向电压', () => {
    const wrongDial = recordA02Measurement(createA02Progress(), {
      ...validVoltageMeasurement,
      dial: 'RESISTANCE',
    });
    const wrongJack = recordA02Measurement(createA02Progress(), {
      ...validVoltageMeasurement,
      redJack: 'A_10A',
    });

    expect(wrongDial.recordedKey).toBeNull();
    expect(wrongJack.recordedKey).toBeNull();
    expect(wrongDial.stepComplete).toBe(false);
    expect(wrongJack.stepComplete).toBe(false);
  });

  it('第一步必须先后记录正向和反向读数才能完成', () => {
    const forward = recordA02Measurement(
      createA02Progress(),
      validVoltageMeasurement,
    );
    expect(forward.recordedKey).toBe('batteryForward');
    expect(forward.stepComplete).toBe(false);

    const reverse = recordA02Measurement(forward.progress, {
      ...validVoltageMeasurement,
      redProbe: 'BAT_NEG',
      blackProbe: 'BAT_POS',
      measuredValue: -12,
    });
    expect(reverse.recordedKey).toBe('batteryReverse');
    expect(reverse.stepComplete).toBe(true);
  });

  it('第二步只接受断开开关压降和闭合灯端电压两项有效记录', () => {
    const ignored = recordA02Measurement(createA02Progress(), {
      ...validVoltageMeasurement,
      step: 'SWITCH_AND_LOAD',
      redProbe: 'SW_IN',
      blackProbe: 'SW_OUT',
      switchClosed: true,
      measuredValue: 0,
    });
    expect(ignored.recordedKey).toBeNull();

    const switchOpen = recordA02Measurement(ignored.progress, {
      ...validVoltageMeasurement,
      step: 'SWITCH_AND_LOAD',
      redProbe: 'SW_IN',
      blackProbe: 'SW_OUT',
      switchClosed: false,
      measuredValue: 12,
    });
    expect(switchOpen.recordedKey).toBe('switchOpen');
    expect(switchOpen.stepComplete).toBe(false);

    const lampClosed = recordA02Measurement(switchOpen.progress, {
      ...validVoltageMeasurement,
      step: 'SWITCH_AND_LOAD',
      redProbe: 'LAMP_POS',
      blackProbe: 'LAMP_NEG',
      switchClosed: true,
      measuredValue: 12,
    });
    expect(lampClosed.recordedKey).toBe('lampClosed');
    expect(lampClosed.stepComplete).toBe(true);
  });

  it('第三步必须记录灯端、供电侧和搭铁侧三项压降才能完成', () => {
    const lamp = recordA02Measurement(createA02Progress(), {
      ...validVoltageMeasurement,
      step: 'CONTACT_RESISTANCE_DROP',
      redProbe: 'LAMP_POS',
      blackProbe: 'LAMP_NEG',
      measuredValue: 10.91,
    });
    const supply = recordA02Measurement(lamp.progress, {
      ...validVoltageMeasurement,
      step: 'CONTACT_RESISTANCE_DROP',
      redProbe: 'BAT_POS',
      blackProbe: 'SW_IN',
      measuredValue: 0.91,
    });

    expect(supply.stepComplete).toBe(false);

    const ground = recordA02Measurement(supply.progress, {
      ...validVoltageMeasurement,
      step: 'CONTACT_RESISTANCE_DROP',
      redProbe: 'LAMP_NEG',
      blackProbe: 'CHASSIS_GND',
      measuredValue: 0.18,
    });
    expect(ground.recordedKey).toBe('groundDrop');
    expect(ground.stepComplete).toBe(true);
  });
});

describe('A02 表笔拖放吸附规则', () => {
  const terminals = [
    { id: 'BAT_POS' as const, x: 60, y: 80 },
    { id: 'BAT_NEG' as const, x: 60, y: 210 },
  ];

  it('释放在测点附近时吸附到最近测点', () => {
    expect(findClosestA02Terminal({ x: 67, y: 84 }, terminals, 24)).toBe(
      'BAT_POS',
    );
  });

  it('释放位置远离全部测点时保持未连接', () => {
    expect(
      findClosestA02Terminal({ x: 150, y: 150 }, terminals, 24),
    ).toBeNull();
  });
});

describe('A02 全流程四阶段状态推进与完成判断', () => {
  it('完成前三步的全部七项测量记录，各阶段完成判定正确', () => {
    let progress = createA02Progress();

    // Step 1: Battery forward & reverse
    const s1_f = recordA02Measurement(progress, {
      ...validVoltageMeasurement,
      step: 'BATTERY_PROBING',
      redProbe: 'BAT_POS',
      blackProbe: 'BAT_NEG',
      measuredValue: 12.0,
    });
    const s1_r = recordA02Measurement(s1_f.progress, {
      ...validVoltageMeasurement,
      step: 'BATTERY_PROBING',
      redProbe: 'BAT_NEG',
      blackProbe: 'BAT_POS',
      measuredValue: -12.0,
    });
    expect(s1_r.stepComplete).toBe(true);
    progress = s1_r.progress;

    // Step 2: Switch open & lamp closed
    const s2_sw = recordA02Measurement(progress, {
      ...validVoltageMeasurement,
      step: 'SWITCH_AND_LOAD',
      redProbe: 'SW_IN',
      blackProbe: 'SW_OUT',
      switchClosed: false,
      measuredValue: 12.0,
    });
    const s2_lamp = recordA02Measurement(s2_sw.progress, {
      ...validVoltageMeasurement,
      step: 'SWITCH_AND_LOAD',
      redProbe: 'LAMP_POS',
      blackProbe: 'LAMP_NEG',
      switchClosed: true,
      measuredValue: 12.0,
    });
    expect(s2_lamp.stepComplete).toBe(true);
    progress = s2_lamp.progress;

    // Step 3: Contact resistance drops (lamp, supply drop, ground drop)
    const s3_lamp = recordA02Measurement(progress, {
      ...validVoltageMeasurement,
      step: 'CONTACT_RESISTANCE_DROP',
      redProbe: 'LAMP_POS',
      blackProbe: 'LAMP_NEG',
      switchClosed: true,
      measuredValue: 10.91,
    });
    const s3_supply = recordA02Measurement(s3_lamp.progress, {
      ...validVoltageMeasurement,
      step: 'CONTACT_RESISTANCE_DROP',
      redProbe: 'BAT_POS',
      blackProbe: 'SW_IN',
      switchClosed: true,
      measuredValue: 0.91,
    });
    const s3_gnd = recordA02Measurement(s3_supply.progress, {
      ...validVoltageMeasurement,
      step: 'CONTACT_RESISTANCE_DROP',
      redProbe: 'LAMP_NEG',
      blackProbe: 'CHASSIS_GND',
      switchClosed: true,
      measuredValue: 0.18,
    });
    expect(s3_gnd.stepComplete).toBe(true);
    progress = s3_gnd.progress;

    // All 7 measurements recorded
    expect(progress.batteryForward).toBe(true);
    expect(progress.batteryReverse).toBe(true);
    expect(progress.switchOpen).toBe(true);
    expect(progress.lampClosed).toBe(true);
    expect(progress.faultLamp).toBe(true);
    expect(progress.supplyDrop).toBe(true);
    expect(progress.groundDrop).toBe(true);
  });
});
