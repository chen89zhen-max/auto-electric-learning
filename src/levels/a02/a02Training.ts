import type {
  MultimeterDialMode,
  MultimeterStatus,
} from '@/src/game/instruments/Multimeter';

export type A02Step =
  | 'BATTERY_PROBING'
  | 'SWITCH_AND_LOAD'
  | 'CONTACT_RESISTANCE_DROP'
  | 'TRANSFER_DIAGNOSIS';

export type A02TerminalId =
  | 'BAT_POS'
  | 'BAT_NEG'
  | 'SW_IN'
  | 'SW_OUT'
  | 'LAMP_POS'
  | 'LAMP_NEG'
  | 'CHASSIS_GND';

export type A02MeasurementKey =
  | 'batteryForward'
  | 'batteryReverse'
  | 'switchOpen'
  | 'lampClosed'
  | 'faultLamp'
  | 'supplyDrop'
  | 'groundDrop';

export interface A02MeasurementSnapshot {
  step: A02Step;
  dial: MultimeterDialMode;
  redJack: 'V_OHM' | 'A_10A';
  redProbe: A02TerminalId | null;
  blackProbe: A02TerminalId | null;
  switchClosed: boolean;
  status: MultimeterStatus;
  measuredValue: number | null;
}

export type A02Progress = Record<A02MeasurementKey, boolean>;

export interface A02RecordResult {
  progress: A02Progress;
  recordedKey: A02MeasurementKey | null;
  stepComplete: boolean;
}

export interface A02StageContent {
  title: string;
  objective: string;
  actions: readonly string[];
  completion: string;
  mentorPrompt: string;
  hint: string;
  mentorEmotion: 'NORMAL' | 'WARNING' | 'PRAISE' | 'THINKING';
}

export const A02_TERMINAL_LABELS: Record<A02TerminalId, string> = {
  BAT_POS: '蓄电池正极',
  BAT_NEG: '蓄电池负极',
  SW_IN: '开关输入端',
  SW_OUT: '开关输出端',
  LAMP_POS: '检修灯正极',
  LAMP_NEG: '检修灯负极',
  CHASSIS_GND: '车身搭铁点',
};

export const A02_STAGE_CONTENT: Record<A02Step, A02StageContent> = {
  BATTERY_PROBING: {
    title: '实训步骤 1：正确使用电压挡测量蓄电池',
    objective: '完成一次正向测量和一次反向测量，观察示数正负号怎样变化。',
    actions: [
      '将功能旋钮拨到“直流电压”，确认红表笔插在 VΩ 孔。',
      '把红表笔接蓄电池正极、黑表笔接负极，点击“记录本次测量”。',
      '亲手调换两支表笔的位置，再记录一次负电压。',
    ],
    completion: '正向约 12V、反向约 −12V 两项均已记录。',
    mentorPrompt:
      '先把仪表准备正确，再动表笔。调换表笔不是故障，而是在改变测量方向。',
    hint: '先选“直流电压”和 VΩ 插孔；红笔接正极、黑笔接负极记录后，再把两支表笔互换。',
    mentorEmotion: 'NORMAL',
  },
  SWITCH_AND_LOAD: {
    title: '实训步骤 2：比较断路与正常工作时的电压',
    objective: '先测断开开关两端，再测闭合开关时检修灯两端。',
    actions: [
      '断开开关，把红表笔接开关输入端、黑表笔接输出端并记录。',
      '闭合开关，把红表笔接检修灯正极、黑表笔接负极并记录。',
      '比较两次示数：断路点和正常负载两端都可能测到接近 12V。',
    ],
    completion: '“断开的开关两端”和“工作中的检修灯两端”均已记录。',
    mentorPrompt:
      '不要只看灯亮不亮。把两支表笔接在同一个元件两端，才是在测这个元件的电压。',
    hint: '先断开开关测开关输入端到输出端；再闭合开关测检修灯正极到负极。',
    mentorEmotion: 'THINKING',
  },
  CONTACT_RESISTANCE_DROP: {
    title: '实训步骤 3：用三项测量找出异常压降',
    objective: '在灯亮的带载状态下，依次记录灯端、供电接点和搭铁接点的电压降。',
    actions: [
      '闭合开关，先测检修灯正极到负极的工作电压。',
      '测蓄电池正极到开关输入端，记录供电侧接点压降。',
      '测检修灯负极到车身搭铁点，记录搭铁侧接点压降。',
    ],
    completion: '灯端电压、供电侧压降、搭铁侧压降三项均已记录。',
    mentorPrompt:
      '灯还能亮不等于回路正常。带载测完三处，才能看清电压究竟丢在哪里。',
    hint: '保持开关闭合，依次测：灯正极—灯负极、蓄电池正极—开关输入端、灯负极—车身搭铁点。',
    mentorEmotion: 'WARNING',
  },
  TRANSFER_DIAGNOSIS: {
    title: '实训步骤 4：根据测量证据确定维修部位',
    objective: '比较三项记录，选择与异常压降相符的处理措施。',
    actions: [
      '查看灯端工作电压、供电侧压降和搭铁侧压降。',
      '找出明显偏大的接点压降，判断电压主要损失在哪里。',
      '选择维修措施；结论必须由本次测量数据支持。',
    ],
    completion: '选出供电侧氧化接点，并说明应清洁、紧固后复测。',
    mentorPrompt: '别凭“灯暗”就换件。哪一段压降异常，就先处理哪一段连接。',
    hint: '供电侧损失 0.91V，明显大于搭铁侧 0.18V，应先处理供电侧氧化接点。',
    mentorEmotion: 'THINKING',
  },
};

export function createA02Progress(): A02Progress {
  return {
    batteryForward: false,
    batteryReverse: false,
    switchOpen: false,
    lampClosed: false,
    faultLamp: false,
    supplyDrop: false,
    groundDrop: false,
  };
}

const STEP_REQUIREMENTS: Record<A02Step, readonly A02MeasurementKey[]> = {
  BATTERY_PROBING: ['batteryForward', 'batteryReverse'],
  SWITCH_AND_LOAD: ['switchOpen', 'lampClosed'],
  CONTACT_RESISTANCE_DROP: ['faultLamp', 'supplyDrop', 'groundDrop'],
  TRANSFER_DIAGNOSIS: [],
};

export function isA02StepComplete(
  step: A02Step,
  progress: A02Progress,
): boolean {
  const requirements = STEP_REQUIREMENTS[step];
  return requirements.length > 0 && requirements.every((key) => progress[key]);
}

function isNear(value: number, expected: number, tolerance = 0.12): boolean {
  return Math.abs(value - expected) <= tolerance;
}

export function identifyA02Measurement(
  snapshot: A02MeasurementSnapshot,
): A02MeasurementKey | null {
  if (
    snapshot.dial !== 'DC_V' ||
    snapshot.redJack !== 'V_OHM' ||
    snapshot.status !== 'NORMAL' ||
    snapshot.measuredValue === null ||
    !Number.isFinite(snapshot.measuredValue)
  ) {
    return null;
  }

  const { step, redProbe, blackProbe, switchClosed, measuredValue } = snapshot;
  if (step === 'BATTERY_PROBING') {
    if (
      redProbe === 'BAT_POS' &&
      blackProbe === 'BAT_NEG' &&
      isNear(measuredValue, 12, 0.2)
    )
      return 'batteryForward';
    if (
      redProbe === 'BAT_NEG' &&
      blackProbe === 'BAT_POS' &&
      isNear(measuredValue, -12, 0.2)
    )
      return 'batteryReverse';
  }

  if (step === 'SWITCH_AND_LOAD') {
    if (
      !switchClosed &&
      redProbe === 'SW_IN' &&
      blackProbe === 'SW_OUT' &&
      isNear(measuredValue, 12, 0.2)
    )
      return 'switchOpen';
    if (
      switchClosed &&
      redProbe === 'LAMP_POS' &&
      blackProbe === 'LAMP_NEG' &&
      isNear(measuredValue, 12, 0.2)
    )
      return 'lampClosed';
  }

  if (step === 'CONTACT_RESISTANCE_DROP' && switchClosed) {
    if (
      redProbe === 'LAMP_POS' &&
      blackProbe === 'LAMP_NEG' &&
      isNear(measuredValue, 10.91)
    )
      return 'faultLamp';
    if (
      redProbe === 'BAT_POS' &&
      blackProbe === 'SW_IN' &&
      isNear(measuredValue, 0.91)
    )
      return 'supplyDrop';
    if (
      redProbe === 'LAMP_NEG' &&
      blackProbe === 'CHASSIS_GND' &&
      isNear(measuredValue, 0.18)
    )
      return 'groundDrop';
  }

  return null;
}

export function recordA02Measurement(
  progress: A02Progress,
  snapshot: A02MeasurementSnapshot,
): A02RecordResult {
  const recordedKey = identifyA02Measurement(snapshot);
  const nextProgress = recordedKey
    ? { ...progress, [recordedKey]: true }
    : progress;
  return {
    progress: nextProgress,
    recordedKey,
    stepComplete: isA02StepComplete(snapshot.step, nextProgress),
  };
}

export function findClosestA02Terminal(
  point: { x: number; y: number },
  terminals: readonly { id: A02TerminalId; x: number; y: number }[],
  maxDistance: number,
): A02TerminalId | null {
  let closest: A02TerminalId | null = null;
  let closestDistance = maxDistance;

  for (const terminal of terminals) {
    const distance = Math.hypot(point.x - terminal.x, point.y - terminal.y);
    if (distance <= closestDistance) {
      closest = terminal.id;
      closestDistance = distance;
    }
  }

  return closest;
}
