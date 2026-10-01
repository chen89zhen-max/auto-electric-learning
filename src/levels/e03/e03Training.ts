export type E03Step =
  | 'RECTIFIER_TOPOLOGY_COGNITION'
  | 'BRIDGE_WIRING_AND_MULTIMETER_TEST'
  | 'FILTER_CAPACITOR_AND_VOLTAGE_CALC'
  | 'BLIND_RECTIFIER_FAULT_DIAGNOSIS'
  | 'ENGINEERING_REPAIR_AND_DELIVERY';

export interface E03StageContent {
  title: string;
  objective: string;
  actions: readonly string[];
  completion: string;
  mentorPrompt: string;
  hint: string;
  mentorEmotion: 'NORMAL' | 'WARNING' | 'PRAISE' | 'THINKING';
}

export const E03_STAGE_CONTENT: Record<E03Step, E03StageContent> = {
  RECTIFIER_TOPOLOGY_COGNITION: {
    title: '实训步骤 1：半波与桥式整流拓扑及波形认知',
    objective: '理解单向导电二极管将交流电(AC)转变为脉动直流电(DC)的机理，对比半波与全波桥式整流波形与能量利用率',
    actions: [
      '观察单相半波整流：利用 1 只二极管，只允许交流正半周通过，负半周被阻断，输出单向断续脉动直流（仅利用一个半周，不等于效率为50%）。',
      '观察全波桥式整流：由 4 只二极管按“头尾相连”环形拓扑组成电桥，交流正半周 D1/D3 导通，负半周 D2/D4 导通。',
      '波形对比：半波输出基波频率 50Hz，脉动大；桥式整流将负半周“翻折”至上方，脉动频率翻倍至 100Hz，直流平均值显著提高。',
      '操作三相六二极管整流模型：比较三相瞬时电压，识别最高相接正母线、最低相接负母线，每电周期形成六个脉波。',
    ],
    completion: '建立整流拓扑物理模型，掌握单相交替导通，并完成三相六脉波导通判断。',
    mentorPrompt:
      '徒弟，汽车发电机发出来的是三相交流电，但蓄电池和全车电控只能吃平滑的直流电！怎么把“上窜下跳”的交流电变成平稳直流？这就是整流滤波的看家本领！半波只利用一个半周，桥式整流把交流电榨干吃净，正负半周全变成正向脉动！',
    hint: '点击“切换半波 / 桥式全波”，观察负载端输出脉动波形从断续半波到连续全波的翻折转变。',
    mentorEmotion: 'NORMAL',
  },
  BRIDGE_WIRING_AND_MULTIMETER_TEST: {
    title: '实训步骤 2：整流桥搭接规范与断电隔离后二极管档测试',
    objective: '熟练掌握 4 只二极管搭接桥式整流的引脚极性规范，运用万用表快速检测整流桥的交流输入端与直流输出端',
    actions: [
      '规范识别整流桥 4 个端子：两个交流输入脚（标有“~”或 AC）、直流正输出端（“+”）、直流负输出端（“-”）。',
      '使用万用表二极管档测试对角桥臂：红表笔接“-”端，黑表笔分别接两个 AC 端，均显示约 0.6V 压降；黑表笔接“+”端，红表笔接两个 AC 端，均显示约 0.6V 压降。',
      '反向阻断测试：对调表笔，所有反向测量均必须显示“OL”（开路阻断）。',
      '整流桥好坏综合判据：4 只二极管正向均导通（0.5~0.7V），反向均截止（OL），任何一只击穿（0V）或断路（OL）整流桥即报废。',
    ],
    completion: '先断电、放电并隔离被测器件，再按维修资料检测二极管；电路并联路径会影响在线读数。',
    mentorPrompt:
      '拿来一个黑色的整流桥块，四个脚怎么查？红笔接负极，黑笔分别测两只交流脚，各有一个管压降；黑笔接正极，红笔测交流脚，又各有一个管压降！四只管子必须清清爽爽全是 0.6V 左右，反过来测全是 OL！任何一只击穿短路就得换整桥！',
    hint: '将万用表打至二极管档，分别点击整流桥的 AC1、AC2、DC+、DC- 引脚记录测量值。',
    mentorEmotion: 'NORMAL',
  },
  FILTER_CAPACITOR_AND_VOLTAGE_CALC: {
    title: '实训步骤 3：滤波电容平滑波形与直流输出电压定量计算',
    objective: '理解滤波电容“削峰填谷”平滑波形原理，掌握理想单相半波(0.45U₂)、全波(0.9U₂)平均值及指定负载下电容滤波的近似值，区别汽车调压',
    actions: [
      '理想二极管、阻性负载、未滤波状态：变压器次级有效值 U2 = 12V 交流电，全波整流未加电容时，输出直流平均值 Uo ≈ 0.9 × U2 = 0.9 × 12 = 10.8V。',
      '接入1000μF电容后的台架考虑两管各0.7V压降，电容充电峰值≈√2×12−1.4=15.57V；在相邻峰值间向20mA恒流负载放电，降至约15.37V后再次充电。',
      '滤波台架条件改为50Hz、1000μF、20mA恒流负载、每管压降0.7V；桥式纹波 ΔV≈I/(2fC)=0.20V，平均值≈√2×12−2×0.7−0.20/2=15.47V。',
      '示波器纹波观测：其他条件不变时增大电容量通常减小纹波；本关数值为指定台架示例，不是车辆通用限值。',
    ],
    completion: '完成整流滤波定量公式验证与示波器纹波压制分析，区分台架近似与车用三相整流、励磁调压作用。',
    mentorPrompt:
      '先分清两套系统：单相台架滤波后平均值由交流峰值、两只二极管压降和半个纹波决定；汽车交流发电机用三相整流器，调节器控制励磁来调节输出。充电目标还受车型、温度、电池及控制策略影响，不能从滤波电容算出统一充电电压。',
    hint: '点击投入或断开本例滤波电容，观察示波器直流波形从剧烈跳跃变成纹波较小的曲线的过程。',
    mentorEmotion: 'THINKING',
  },
  BLIND_RECTIFIER_FAULT_DIAGNOSIS: {
    title: '实训步骤 4：整流训练台 4 组未知故障盲测',
    objective: '对测试台 4 组整流教学样品进行万用表二极管档与交流纹波盲测分类：整流桥良好、1只管击穿短路、1只管烧毁断路、滤波电容脱焊',
    actions: [
      '依次将待测整流板接入模拟发电机测试工位。',
      '启动训练台，使用示波器读纹波峰峰值Vpp，直流电压档读平均输出；万用表AC挡读数取决于带宽与耦合方式，不能直接当成Vpp。',
      '故障特征分析：本阶段独立故障样品（并非步骤3滤波台架）的正常示例（DC 14.3V, 纹波峰峰值0.12V）；单只二极管击穿（反向漏电，交流纹波暴增至 2.8V，发电机啸叫发热）；单只二极管断路（缺相，带载输出电压暴跌至 11.2V，蓄电池亏电）；滤波电容脱焊（输出电压呈馒头波，纹波 3.5V）。',
      '在测试工单中填报真实故障分类。',
    ],
    completion: '准确诊断汽车整流桥二极管击穿与断路缺陷，掌握交流发电机电气异响根因。',
    mentorPrompt:
      '车主开来一辆车，说一踩油门音响里就发出“嗷嗷”的吹哨声，大灯还跟着忽闪忽闪！拿万用表打到交流电压档量电瓶正负极，如果纹波异常，应进一步结合波形、线路与离线二极管测试排查，不能只凭交流档一个读数确定二极管击穿！来，把这四个工位的毛病揪出来！',
    hint: '结合直流输出电压与交流纹波两项核心参数，准确判别 4 组样品的内部故障。',
    mentorEmotion: 'NORMAL',
  },
  ENGINEERING_REPAIR_AND_DELIVERY: {
    title: '实训步骤 5：实车发电机整流器击穿导致亏电啸叫工程修复',
    objective: '承接实车发电机输出交流纹波超标（2.6V）且全车音响电磁啸叫工单，更换发电机整流桥板总成并复验交付',
    actions: [
      '接车确诊：用示波器与万用表检测蓄电池两端，发动机 2000rpm 时输出电压仅 11.8V，交流纹波高达 2.6V（本训练工单限值，实车查维修手册），确认整流器损坏。',
      '发电机拆解与检测：拆下发电机后盖板，二极管档测量 6 只大功率二极管，发现负极板第 2 只二极管正反向均为 0.00V（短路击穿）。',
      '备件领用与安装：领用原厂配套 12V/100A 雪崩二极管整流桥板总成，规范扭矩紧固 B+ 螺柱与定子引线焊点。',
      '通电试机复验：起动发动机怠速与 2500rpm 带载测试，整车直流电压处于本案例参考区间 14.2V~14.4V，交流纹波压制在 0.08V，音响异常啸叫消除。',
      '签署质量交付验收单。',
    ],
    completion: '成功排除发电机整流二极管击穿重大电气故障，规范更换整流桥总成并通过纹波复验。',
    mentorPrompt:
      '本案例复测记录显示，整车充电电压和交流纹波已回到工单参考范围，异常啸叫未再出现；实际交车仍应按维修手册规定工况完成复验。',
    hint: '拆检发现二极管短路，从库房领用 100A 整流桥总成安装并起动发动机复测纹波。',
    mentorEmotion: 'PRAISE',
  },
};

export type RectifierFaultType = 'NORMAL' | 'DIODE_SHORT' | 'DIODE_OPEN' | 'CAP_DISCONNECTED';

export interface RectifierSample {
  id: string;
  name: string;
  dcVoltage: number;
  acRippleVpp: number;
  actualType: RectifierFaultType;
}

export const E03_SAMPLES: RectifierSample[] = [
  { id: 'RECT_1', name: '整流训练样品 #1 (原装良品)', dcVoltage: 14.3, acRippleVpp: 0.12, actualType: 'NORMAL' },
  { id: 'RECT_2', name: '整流训练样品 #2 (二极管击穿)', dcVoltage: 11.8, acRippleVpp: 2.85, actualType: 'DIODE_SHORT' },
  { id: 'RECT_3', name: '整流训练样品 #3 (引线脱焊断路)', dcVoltage: 11.2, acRippleVpp: 1.65, actualType: 'DIODE_OPEN' },
  { id: 'RECT_4', name: '整流训练样品 #4 (滤波电容失效)', dcVoltage: 10.8, acRippleVpp: 3.60, actualType: 'CAP_DISCONNECTED' },
];

export const FILTER_BENCH = { frequencyHz: 50, capacitanceF: 0.001, loadCurrentA: 0.02, diodeDropV: 0.7 } as const;

export function calculateRectifierOutput(
  u2Rms: number,
  topology: 'HALF_WAVE' | 'FULL_BRIDGE',
  hasCapacitor: boolean
): { uDc: number; rippleVpp: number } {
  if (!Number.isFinite(u2Rms) || u2Rms < 0) throw new RangeError('交流有效值必须是非负有限数');
  if (!hasCapacitor) {
    // Separate ideal-diode, resistive-load reference (not the loaded filter bench).
    return {
      uDc: Math.round((topology === 'HALF_WAVE' ? 0.45 : 0.9) * u2Rms * 10) / 10,
      rippleVpp: Math.round(Math.SQRT2 * u2Rms * 10) / 10,
    };
  }
  // Small-ripple approximation: ideal source, constant load current, constant diode drop,
  // negligible source resistance/ESR, instantaneous recharge near each crest.
  const { frequencyHz, capacitanceF, loadCurrentA, diodeDropV } = FILTER_BENCH;
  const pulses = topology === 'FULL_BRIDGE' ? 2 : 1;
  const crest = Math.SQRT2 * u2Rms - pulses * diodeDropV;
  const rippleVpp = loadCurrentA / (pulses * frequencyHz * capacitanceF);
  if (crest <= 0 || rippleVpp / crest > 0.1) throw new RangeError('超出小纹波近似范围：纹波须不大于电容峰值电压的10%');
  return { uDc: crest - rippleVpp / 2, rippleVpp };
}

/** Ideal balanced three-phase, six-diode bridge; phase voltages are normalized.
 * Ignores diode drops and commutation overlap; this is not a charging regulator. */
export function calculateThreePhaseRectifier(angleDegrees: number) {
  const phases = ['U', 'V', 'W'] as const;
  const values = phases.map((_, index) => Math.sin((angleDegrees - index * 120) * Math.PI / 180));
  const maximum = Math.max(...values);
  const minimum = Math.min(...values);
  return {
    phaseVoltages: Object.fromEntries(phases.map((phase, index) => [phase, values[index]])),
    positivePhase: phases[values.indexOf(maximum)],
    negativePhase: phases[values.indexOf(minimum)],
    output: maximum - minimum,
    pulsesPerCycle: 6,
  };
}
