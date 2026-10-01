export type WorkorderMeasurementId = string;

export interface WorkorderMeasurementPlan {
  id: WorkorderMeasurementId;
  label: string;
  reference: string;
  expectedValue: number;
  unit: 'V' | 'A' | 'V压降' | 'V~';
}

export interface WorkorderOption {
  id: string;
  label: string;
}

export interface LowVoltageWorkorder {
  scenarioId: string;
  workOrderNo: string;
  title: string;
  associatedLevelId: 'C01' | 'D01' | 'D02' | 'D03';
  symptom: string;
  circuitSummary: string;
  safetyGuard: string;
  normalReference: string;
  blockedActions: string[];
  requiredSafetyCheck?: { id: string; label: string };
  measurementPlan: WorkorderMeasurementPlan[];
  causeOptions: WorkorderOption[];
  correctCauseId: string;
  repairOptions: WorkorderOption[];
  correctRepairId: string;
  requiredRetest: string[];
  sourceNote: string;
  physicalTrainingBoundary: string;
}

export interface WorkorderAttempt {
  measurements: Partial<Record<WorkorderMeasurementId, number>>;
  safetyConfirmed: boolean;
  selectedCauseId: string | null;
  repairId: string | null;
  retestPassed: boolean;
  status: 'in_progress' | 'blocked' | 'ready' | 'passed';
}

const withCommonSafety = (workorder: LowVoltageWorkorder): LowVoltageWorkorder => workorder;

export const LOW_VOLTAGE_WORKORDERS: LowVoltageWorkorder[] = [
  withCommonSafety({
    scenarioId: 'D2_LAMP_VARIATION_V1', workOrderNo: 'WO-D2-LAMP', title: '灯光回路变式：近光灯搭铁不良', associatedLevelId: 'C01',
    symptom: '接通近光灯后左前灯不亮；切换远光时该灯偶尔微亮。',
    circuitSummary: '蓄电池 → 熔断器 → 灯光继电器 → 灯泡 → 车身搭铁。',
    safetyGuard: '先确认灯光开关关闭，再接表笔；只在带载状态测压降，禁止以短接导线替代熔断保护。',
    normalReference: '12 V 系统，带载搭铁压降通常不高于 0.2 V。',
    blockedActions: ['带电回路不得切换到电阻档测量。', '熔断器不得以导线跨接替代。'],
    measurementPlan: [
      { id: 'FUSE_OUTPUT', label: '熔断器输出端', reference: '灯光开关接通时应接近蓄电池电压', expectedValue: 12.4, unit: 'V' },
      { id: 'RELAY_CONTROL', label: '继电器负载输出端', reference: '继电器吸合后应接近蓄电池电压', expectedValue: 12.1, unit: 'V' },
      { id: 'LAMP_GROUND_DROP', label: '灯泡搭铁端带载压降', reference: '超过 0.5 V 表示搭铁支路异常', expectedValue: 3.8, unit: 'V压降' },
    ],
    causeOptions: [{ id: 'FUSE_OPEN', label: '熔断器开路' }, { id: 'RELAY_FAILURE', label: '灯光继电器失效' }, { id: 'GROUND_OPEN', label: '灯泡搭铁开路／接触不良' }],
    correctCauseId: 'GROUND_OPEN', repairOptions: [{ id: 'REPLACE_RELAY', label: '更换继电器' }, { id: 'REPAIR_GROUND', label: '修复搭铁端并防腐紧固' }], correctRepairId: 'REPAIR_GROUND',
    requiredRetest: ['lowBeam', 'highBeam'], sourceNote: '依据低压照明回路的供电、负载和搭铁压降诊断顺序编制。', physicalTrainingBoundary: '本工单仅训练仿真诊断；灯具拆装、线路压接与防水处理须在实训室由教师现场评价。',
  }),
  withCommonSafety({
    scenarioId: 'D3_HORN_DIAGNOSIS_V1', workOrderNo: 'WO-D3-HORN', title: '喇叭工单：按钮正常而喇叭无声', associatedLevelId: 'D01',
    symptom: '按下喇叭按钮可听到继电器吸合声，但喇叭不响。', circuitSummary: '蓄电池 → 熔断器 → 喇叭继电器 → 喇叭 → 车身搭铁。',
    safetyGuard: '确认周边无人和听力防护；测量前固定表笔，禁止用导线直接跨接电源端子。', normalReference: '继电器输出端和喇叭供电端应接近蓄电池电压，喇叭搭铁压降应低。', blockedActions: ['仅允许使用带保险的电流测量支路。', '禁止用跳线旁路熔断器或继电器触点。'],
    measurementPlan: [
      { id: 'HORN_FUSE_OUTPUT', label: '喇叭熔断器输出端', reference: '按键接通后供电正常', expectedValue: 12.5, unit: 'V' },
      { id: 'HORN_RELAY_OUTPUT', label: '继电器负载输出端', reference: '继电器吸合后输出正常', expectedValue: 12.3, unit: 'V' },
      { id: 'HORN_GROUND_DROP', label: '喇叭搭铁带载压降', reference: '搭铁正常，压降低', expectedValue: 0.1, unit: 'V压降' },
      { id: 'HORN_PROTECTED_CURRENT', label: '喇叭保险电流支路', reference: '本案例本体开路，电流接近零', expectedValue: 0, unit: 'A' },
    ],
    causeOptions: [{ id: 'HORN_RELAY_FAILURE', label: '喇叭继电器失效' }, { id: 'HORN_OPEN', label: '喇叭内部开路' }, { id: 'HORN_GROUND_OPEN', label: '喇叭搭铁开路' }], correctCauseId: 'HORN_OPEN', repairOptions: [{ id: 'REPLACE_HORN', label: '更换同规格喇叭' }, { id: 'REPAIR_HORN_GROUND', label: '修复喇叭搭铁' }], correctRepairId: 'REPLACE_HORN',
    requiredRetest: ['hornSounds', 'warningCircuitNormal'], sourceNote: '依据继电器受控供电回路的端电压与搭铁压降判定。', physicalTrainingBoundary: '实际声级和固定支架检查须在实物车辆或台架上实施。',
  }),
  withCommonSafety({
    scenarioId: 'D4_START_CONTROL_V1', workOrderNo: 'WO-D4-STARTER', title: '起动控制工单：起动继电器吸合但无转动', associatedLevelId: 'D02',
    symptom: '点火开关置于 START 位时继电器吸合，起动机无转动。', circuitSummary: '蓄电池 → 起动熔断保护／继电器 → 电磁开关 → 起动电机 → 搭铁。',
    safetyGuard: '变速器置空挡／P挡、驻车制动有效；禁止在发动机舱内跨接起动端子，仿真中也须遵循先断电后测电阻。', normalReference: '端子 30 与端子 50 在起动请求时应接近蓄电池电压。', blockedActions: ['未确认 P/N 挡或离合许可时，禁止模拟起动。', '禁止跨接起动端子。'], requiredSafetyCheck: { id: 'START_SAFE_STATE', label: '已确认 P/N 挡（或离合许可）及驻车制动' },
    measurementPlan: [
      { id: 'STARTER_BATTERY', label: '蓄电池静态电压', reference: '电源基本正常', expectedValue: 12.5, unit: 'V' },
      { id: 'STARTER_TERMINAL_50', label: '电磁开关端子50', reference: 'START 请求时控制电压正常', expectedValue: 12.3, unit: 'V' },
      { id: 'STARTER_GROUND_DROP', label: '起动回路搭铁压降', reference: '搭铁正常，压降低', expectedValue: 0.1, unit: 'V压降' },
    ],
    causeOptions: [{ id: 'STARTER_RELAY_FAILURE', label: '起动继电器失效' }, { id: 'SOLENOID_FAILURE', label: '起动电磁开关失效' }, { id: 'STARTER_GROUND_OPEN', label: '起动机搭铁不良' }], correctCauseId: 'SOLENOID_FAILURE', repairOptions: [{ id: 'REPLACE_STARTER_RELAY', label: '更换起动继电器' }, { id: 'REPAIR_SOLENOID_CIRCUIT', label: '按维修手册检修／更换电磁开关总成' }], correctRepairId: 'REPAIR_SOLENOID_CIRCUIT',
    requiredRetest: ['starterCranks', 'startRequestReleased'], sourceNote: '依据起动控制端子 30/50 的受控供电检查编制。', physicalTrainingBoundary: '不涵盖发动机拆装、起动机总成分解或真实车辆带电跨接。',
  }),
  withCommonSafety({
    scenarioId: 'D5_WINDOW_MIRROR_V1', workOrderNo: 'WO-D5-WINDOW', title: '车窗／后视镜工单：主控开关有输出，执行器不动作', associatedLevelId: 'D02',
    symptom: '车窗主控开关操作时继电器动作，右前车窗和右后视镜调节均无响应。', circuitSummary: '蓄电池 → 熔断器 → 主控开关／继电器 → 车窗或后视镜执行器 → 搭铁。',
    safetyGuard: '手部远离玻璃升降机构；不能用手阻挡玻璃验证负载，禁止带电拆插执行器插头。', normalReference: '主控输出应接近蓄电池电压，执行器搭铁压降应低。', blockedActions: ['禁止用手阻挡玻璃验证负载。', '极性／线路布置改变后，必须重新诊断。'],
    measurementPlan: [
      { id: 'WINDOW_MASTER_OUTPUT', label: '主控开关输出端', reference: '按下开关后输出正常', expectedValue: 12.2, unit: 'V' },
      { id: 'WINDOW_ACTUATOR_SUPPLY', label: '执行器供电端', reference: '供电已到达执行器', expectedValue: 12.1, unit: 'V' },
      { id: 'WINDOW_GROUND_DROP', label: '执行器搭铁带载压降', reference: '搭铁正常，压降低', expectedValue: 0.1, unit: 'V压降' },
      { id: 'WINDOW_CURRENT', label: '执行器保险电流支路', reference: '本案例执行器开路，电流接近零', expectedValue: 0, unit: 'A' },
    ],
    causeOptions: [{ id: 'WINDOW_SWITCH_FAILURE', label: '主控开关失效' }, { id: 'ACTUATOR_OPEN', label: '车窗／后视镜执行器内部开路' }, { id: 'WINDOW_GROUND_OPEN', label: '执行器搭铁不良' }], correctCauseId: 'ACTUATOR_OPEN', repairOptions: [{ id: 'REPLACE_MASTER_SWITCH', label: '更换主控开关' }, { id: 'REPLACE_ACTUATOR', label: '更换匹配执行器总成并初始化' }], correctRepairId: 'REPLACE_ACTUATOR',
    requiredRetest: ['windowUpDown', 'mirrorAdjusts'], sourceNote: '依据正反转执行器的供电、搭铁与负载隔离方法编制。', physicalTrainingBoundary: '玻璃升降器防夹、后视镜拆装和密封复原须由教师现场评价。',
  }),
  withCommonSafety({
    scenarioId: 'D6_LOW_VOLTAGE_CHARGING_V1', workOrderNo: 'WO-D6-CHARGE', title: '低压电源与充电工单：充电警告灯常亮', associatedLevelId: 'D03',
    symptom: '发动机已运行，组合仪表充电警告灯常亮，蓄电池端电压无上升。', circuitSummary: '蓄电池 → 充电警告灯／感应线 → 发电机调节器 → B+ 输出 → 蓄电池。',
    safetyGuard: '皮带、风扇等旋转部件附近不得伸入手或表笔；测试采用固定夹具，禁止拆开动力电池或高压部件。', normalReference: '12 V 系统在规定转速下蓄电池端充电电压通常应高于静态电压并稳定。', blockedActions: ['直流充电电压与交流纹波必须使用对应量程，不能混用。', '禁止触及旋转部件或高压／动力电池部件。'],
    measurementPlan: [
      { id: 'BATTERY_REST', label: '蓄电池静态电压', reference: '静态电源正常', expectedValue: 12.4, unit: 'V' },
      { id: 'CHARGE_AT_2000', label: '2000 r/min 蓄电池端电压', reference: '本案例未建立充电，应接近静态值', expectedValue: 12.1, unit: 'V' },
      { id: 'SENSE_WIRE', label: '调节器感应线电压', reference: '感应线异常低，提示线路开路', expectedValue: 0.2, unit: 'V' },
      { id: 'RIPPLE_AC', label: 'B+交流纹波', reference: '本案例感应线路开路，纹波读数不用于判定整流故障', expectedValue: 0.1, unit: 'V~' },
    ],
    causeOptions: [{ id: 'BELT_SLIP', label: '发电机皮带打滑' }, { id: 'REGULATOR_FAILURE', label: '调节器失效' }, { id: 'SENSE_WIRE_OPEN', label: '充电感应线路开路' }], correctCauseId: 'SENSE_WIRE_OPEN', repairOptions: [{ id: 'REPLACE_REGULATOR', label: '更换调节器' }, { id: 'REPAIR_SENSE_WIRE', label: '修复感应线路并复核端子' }], correctRepairId: 'REPAIR_SENSE_WIRE',
    requiredRetest: ['chargingVoltageNormal', 'warningLampOff', 'rippleNormal'], sourceNote: '依据低压充电系统的静态、运行、感应回路与交流纹波读数进行隔离。', physicalTrainingBoundary: '不包含发电机拆解、皮带张力实操、高压／新能源动力电池作业；上述内容应进行实体训练。',
  }),
];

export function createWorkorderAttempt(_workorder: LowVoltageWorkorder): WorkorderAttempt {
  return { measurements: {}, safetyConfirmed: !(_workorder.requiredSafetyCheck), selectedCauseId: null, repairId: null, retestPassed: false, status: 'in_progress' };
}

export function confirmWorkorderSafety(workorder: LowVoltageWorkorder, attempt: WorkorderAttempt): WorkorderAttempt {
  return workorder.requiredSafetyCheck ? { ...attempt, safetyConfirmed: true } : attempt;
}

export function resetWorkorderDiagnosis(workorder: LowVoltageWorkorder, attempt: WorkorderAttempt): WorkorderAttempt {
  return { ...createWorkorderAttempt(workorder), safetyConfirmed: attempt.safetyConfirmed };
}

export function recordWorkorderMeasurement(workorder: LowVoltageWorkorder, attempt: WorkorderAttempt, pointId: string, value: number): WorkorderAttempt {
  if (!attempt.safetyConfirmed || !workorder.measurementPlan.some((point) => point.id === pointId)) return attempt;
  return { ...attempt, measurements: { ...attempt.measurements, [pointId]: value }, retestPassed: false, status: 'in_progress' };
}

function hasCompleteMeasurements(workorder: LowVoltageWorkorder, attempt: WorkorderAttempt): boolean {
  return workorder.measurementPlan.every((point) => attempt.measurements[point.id] !== undefined);
}

export function selectWorkorderCause(workorder: LowVoltageWorkorder, attempt: WorkorderAttempt, causeId: string): WorkorderAttempt {
  if (!hasCompleteMeasurements(workorder, attempt) || causeId !== workorder.correctCauseId) return { ...attempt, selectedCauseId: causeId, retestPassed: false, status: 'in_progress' };
  return { ...attempt, selectedCauseId: causeId, retestPassed: false, status: 'ready' };
}

export function selectWorkorderRepair(workorder: LowVoltageWorkorder, attempt: WorkorderAttempt, repairId: string): WorkorderAttempt {
  if (!hasCompleteMeasurements(workorder, attempt) || attempt.selectedCauseId !== workorder.correctCauseId || repairId !== workorder.correctRepairId) return { ...attempt, repairId, retestPassed: false, status: 'blocked' };
  return { ...attempt, repairId, retestPassed: false, status: 'ready' };
}

export function verifyWorkorderRetest(workorder: LowVoltageWorkorder, attempt: WorkorderAttempt, retest: Record<string, boolean>): WorkorderAttempt {
  const passed = attempt.repairId === workorder.correctRepairId && workorder.requiredRetest.every((key) => retest[key]);
  return { ...attempt, retestPassed: passed, status: passed ? 'passed' : 'blocked' };
}
