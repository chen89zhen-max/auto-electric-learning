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
      '观察单相半波整流：利用 1 只二极管，只允许交流正半周通过，负半周被阻断，输出单向断续脉动直流（利用率仅 50%）。',
      '观察全波桥式整流：由 4 只二极管按“头尾相连”环形拓扑组成电桥，交流正半周 D1/D3 导通，负半周 D2/D4 导通。',
      '波形对比：半波输出基波频率 50Hz，脉动大；桥式整流将负半周“翻折”至上方，脉动频率翻倍至 100Hz，直流平均值显著提高。',
      '在工单中对比半波与全波在汽车发电机整流器中的经济性与平稳性要求。',
    ],
    completion: '建立整流拓扑物理模型，掌握正负半周交替导通路径。',
    mentorPrompt:
      '徒弟，汽车发电机发出来的是三相交流电，但蓄电池和全车电控只能吃平滑的直流电！怎么把“上窜下跳”的交流电变成平稳直流？这就是整流滤波的看家本领！半波浪费一半电，桥式整流把交流电榨干吃净，正负半周全变成正向脉动！',
    hint: '点击“切换半波 / 桥式全波”，观察负载端输出脉动波形从断续半波到连续全波的翻折转变。',
    mentorEmotion: 'NORMAL',
  },
  BRIDGE_WIRING_AND_MULTIMETER_TEST: {
    title: '实训步骤 2：整流桥搭接规范与万用表二极管档在线测试',
    objective: '熟练掌握 4 只二极管搭接桥式整流的引脚极性规范，运用万用表快速检测整流桥的交流输入端与直流输出端',
    actions: [
      '规范识别整流桥 4 个端子：两个交流输入脚（标有“~”或 AC）、直流正输出端（“+”）、直流负输出端（“-”）。',
      '使用万用表二极管档测试对角桥臂：红表笔接“-”端，黑表笔分别接两个 AC 端，均显示约 0.6V 压降；黑表笔接“+”端，红表笔接两个 AC 端，均显示约 0.6V 压降。',
      '反向阻断测试：对调表笔，所有反向测量均必须显示“OL”（开路阻断）。',
      '整流桥好坏综合判据：4 只二极管正向均导通（0.5~0.7V），反向均截止（OL），任何一只击穿（0V）或断路（OL）整流桥即报废。',
    ],
    completion: '掌握整流桥引脚规范定义与万用表二极管档专业打表法。',
    mentorPrompt:
      '拿来一个黑色的整流桥块，四个脚怎么查？红笔接负极，黑笔分别测两只交流脚，各有一个管压降；黑笔接正极，红笔测交流脚，又各有一个管压降！四只管子必须清清爽爽全是 0.6V 左右，反过来测全是 OL！任何一只击穿短路就得换整桥！',
    hint: '将万用表打至二极管档，分别点击整流桥的 AC1、AC2、DC+、DC- 引脚记录测量值。',
    mentorEmotion: 'NORMAL',
  },
  FILTER_CAPACITOR_AND_VOLTAGE_CALC: {
    title: '实训步骤 3：滤波电容平滑波形与直流输出电压定量计算',
    objective: '理解滤波电容“削峰填谷”平滑波形原理，掌握半波(0.45U₂)、全波(0.9U₂)及电容滤波(1.2U₂)输出电压计算公式',
    actions: [
      '空载与未滤波状态：变压器次级有效值 U2 = 12V 交流电，全波整流未加电容时，输出直流平均值 Uo ≈ 0.9 × U2 = 0.9 × 12 = 10.8V。',
      '接入滤波电解电容 C（如 1000μF）：电容在电压上升期快速充电至峰值 1.414 × U2 ≈ 17.0V；在交流过零低谷期向负载缓慢放电填谷。',
      '带载滤波平均输出电压：接入额定负载后，输出直流电压稳定在 Uo ≈ 1.2 × U2 = 1.2 × 12 = 14.4V（正好达到汽车 12V 蓄电池充电饱和电压！）。',
      '示波器纹波观测：增大滤波电容容量（从 100μF 增至 2200μF），输出纹波峰峰值 Vpp 从 3.5V 骤降至 0.15V，直流纯度极大提高。',
    ],
    completion: '完成整流滤波定量公式验证与示波器纹波压制分析，掌握汽车发电机 14.4V 供电工程依据。',
    mentorPrompt:
      '为什么发电机输出标称是 14.4V？秘密就在滤波电容！次级交流电 12V，整流后加上滤波电容，公式就是 Uo = 1.2 × U2 = 1.2 × 12 = 14.4V！这就是给汽车蓄电池充满电的黄金电压！电容越大，波形越平，车上的音响和电脑才不会听到“滋滋”的交流啸叫！',
    hint: '点击投入不同容量滤波电容，观察示波器直流波形从剧烈跳跃变成一条笔直水平线的过程。',
    mentorEmotion: 'THINKING',
  },
  BLIND_RECTIFIER_FAULT_DIAGNOSIS: {
    title: '实训步骤 4：汽车发电机整流桥 4 组未知故障盲测',
    objective: '对测试台 4 组发电机整流桥总成进行万用表二极管档与交流纹波盲测分类：整流桥良好、1只管击穿短路、1只管烧毁断路、滤波电容脱焊',
    actions: [
      '依次将待测整流板接入模拟发电机测试工位。',
      '启动测试电机，使用万用表交流电压档 (ACV) 监测直流母线上的交流纹波电压，直流电压档 (DCV) 监测平均输出电压。',
      '故障特征分析：正常状态（DC 14.4V, AC 纹波 < 0.2V）；单只二极管击穿（反向漏电，交流纹波暴增至 2.8V，发电机啸叫发热）；单只二极管断路（缺相，带载输出电压暴跌至 11.2V，蓄电池亏电）；滤波电容脱焊（输出电压呈馒头波，纹波 3.5V）。',
      '在测试工单中填报真实故障分类。',
    ],
    completion: '准确诊断汽车整流桥二极管击穿与断路缺陷，掌握交流发电机电气异响根因。',
    mentorPrompt:
      '车主开来一辆车，说一踩油门音响里就发出“嗷嗷”的吹哨声，大灯还跟着忽闪忽闪！拿万用表打到交流电压档量电瓶正负极，如果有两三伏的交流电压，那就是发电机整流器里有二极管被击穿了！来，把这四个工位的毛病揪出来！',
    hint: '结合直流输出电压与交流纹波两项核心参数，准确判别 4 组样品的内部故障。',
    mentorEmotion: 'NORMAL',
  },
  ENGINEERING_REPAIR_AND_DELIVERY: {
    title: '实训步骤 5：实车发电机整流器击穿导致亏电啸叫工程修复',
    objective: '承接实车发电机输出交流纹波超标（2.6V）且全车音响电磁啸叫工单，更换发电机整流桥板总成并复验交付',
    actions: [
      '接车确诊：用示波器与万用表检测蓄电池两端，发动机 2000rpm 时输出电压仅 11.8V，交流纹波高达 2.6V（标准应 <0.3V），确认整流器损坏。',
      '发电机拆解与检测：拆下发电机后盖板，二极管档测量 6 只大功率二极管，发现负极板第 2 只二极管正反向均为 0.00V（短路击穿）。',
      '备件领用与安装：领用原厂配套 12V/100A 雪崩二极管整流桥板总成，规范扭矩紧固 B+ 螺柱与定子引线焊点。',
      '通电试机复验：起动发动机怠速与 2500rpm 带载测试，整车直流电压稳定在 14.2V~14.4V，交流纹波压制在 0.08V，音响杂音完全消除。',
      '签署质量交付验收单。',
    ],
    completion: '成功排除发电机整流二极管击穿重大电气故障，规范更换整流桥总成并通过纹波复验。',
    mentorPrompt:
      '漂亮！换上崭新的原厂雪崩整流桥总成，交流纹波只有 0.08V，发电机充电电压稳稳保持在 14.3V！蓄电池再也不会被交流电反向冲坏，车主的车载音响音质也清亮如新！',
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
  { id: 'RECT_1', name: '发电机整流桥 #1 (原装良品)', dcVoltage: 14.3, acRippleVpp: 0.12, actualType: 'NORMAL' },
  { id: 'RECT_2', name: '发电机整流桥 #2 (二极管击穿)', dcVoltage: 11.8, acRippleVpp: 2.85, actualType: 'DIODE_SHORT' },
  { id: 'RECT_3', name: '发电机整流桥 #3 (引线脱焊断路)', dcVoltage: 11.2, acRippleVpp: 1.65, actualType: 'DIODE_OPEN' },
  { id: 'RECT_4', name: '发电机整流桥 #4 (滤波电容失效)', dcVoltage: 10.8, acRippleVpp: 3.60, actualType: 'CAP_DISCONNECTED' },
];

export function calculateRectifierOutput(
  u2Rms: number,
  topology: 'HALF_WAVE' | 'FULL_BRIDGE',
  hasCapacitor: boolean
): { uDc: number; rippleVpp: number } {
  if (topology === 'HALF_WAVE') {
    const uDc = hasCapacitor ? Math.round(1.0 * u2Rms * 10) / 10 : Math.round(0.45 * u2Rms * 10) / 10;
    const rippleVpp = hasCapacitor ? 1.5 : Math.round(1.414 * u2Rms * 10) / 10;
    return { uDc, rippleVpp };
  } else {
    // FULL_BRIDGE
    const uDc = hasCapacitor ? Math.round(1.2 * u2Rms * 10) / 10 : Math.round(0.9 * u2Rms * 10) / 10;
    const rippleVpp = hasCapacitor ? 0.15 : Math.round(0.7 * u2Rms * 10) / 10;
    return { uDc, rippleVpp };
  }
}
