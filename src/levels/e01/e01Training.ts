export type E01Step =
  | 'DIODE_CONDUCTION_COGNITION'
  | 'MULTIMETER_DIODE_TEST'
  | 'ZENER_AND_LED_CALCULATION'
  | 'BLIND_DIODE_FAULT_DIAGNOSIS'
  | 'ENGINEERING_REPAIR_AND_DELIVERY';

export interface E01StageContent {
  title: string;
  objective: string;
  actions: readonly string[];
  completion: string;
  mentorPrompt: string;
  hint: string;
  mentorEmotion: 'NORMAL' | 'WARNING' | 'PRAISE' | 'THINKING';
}

export const E01_STAGE_CONTENT: Record<E01Step, E01StageContent> = {
  DIODE_CONDUCTION_COGNITION: {
    title: '实训步骤 1：二极管单向导电性与 PN 结认知',
    objective: '掌握半导体二极管单向导电特性，理解正偏导通压降（硅管约0.7V，锗管约0.3V）与反偏截止原理',
    actions: [
      '观察二极管实物结构：阳极（P区，正极）、阴极（N区，带色环标记端，负极）。',
      '正向偏置接入：电源正极接阳极、负极接阴极，二极管导通，正向管压降约 0.7V，负载工作正常。',
      '反向偏置接入：电源正极接阴极、负极接阳极，空间电荷区变宽，二极管截止（反向漏电流几乎为0），负载不亮。',
      '在工单中对比硅二极管（0.7V）与发光二极管 LED（1.8V~3.2V）的导通电压差异。',
    ],
    completion: '建立二极管单向导电物理认知，掌握二极管色环极性识别。',
    mentorPrompt:
      '徒弟，半导体器件是汽车电子控制的核心！二极管就像一个“单向阀门”，电流只能从阳极流向阴极，反着来就会被完全挡住！硅管导通时还要扣除大约 0.7V 的门槛电压，这个伏安特性你必须烂熟于心！',
    hint: '点击“切换极性”，对比二极管正向导通与反向截止时电路中电流与负载状态的变化。',
    mentorEmotion: 'NORMAL',
  },
  MULTIMETER_DIODE_TEST: {
    title: '实训步骤 2：数字万用表二极管与电阻挡规范测量',
    objective: '规范使用数字万用表二极管蜂鸣挡测量二极管正反向特性，判别阳极、阴极以及管子好坏',
    actions: [
      '将万用表从 OFF 档旋至“二极管 / 蜂鸣”挡。',
      '正向测试：红表笔（表内正）接二极管阳极，黑表笔（COM负）接阴极，表头显示硅管导通压降约 550mV~700mV（0.55V~0.70V）。',
      '反向测试：红表笔接阴极，黑表笔接阳极，表头显示溢出符号“OL”（开路状态，阻值无穷大）。',
      '综合判定规则：正向导通有压降、反向截止显示 OL，则该二极管性能良好；若正反向均为 0V/蜂鸣则击穿短路；正反向均为 OL 则内部断路。',
    ],
    completion: '掌握万用表二极管挡检测规范，能通过读数精确判断极性与元器件状态。',
    mentorPrompt:
      '手拿一个印字磨损的二极管，怎么查极性？打到万用表二极管挡！红笔接正、黑笔接负时显示几百毫伏正向压降，掉个头反向测显示 OL！如果两边测都是零或者蜂鸣器狂叫，那就是被过流击穿短路了！',
    hint: '旋转万用表旋钮至二极管挡，分别对二极管进行正反向红黑表笔接触测试。',
    mentorEmotion: 'NORMAL',
  },
  ZENER_AND_LED_CALCULATION: {
    title: '实训步骤 3：稳压二极管与汽车 LED 限流电阻定量计算',
    objective: '掌握稳压管反向击穿稳压特性，运用欧姆定律精确计算汽车 12V 供电下 LED 的限流电阻阻值',
    actions: [
      '稳压二极管应用：反向接入车载电路，当输入电压波动超过稳压值 Uz（如 5.1V）时反向击穿，将负载端电压稳稳嵌位在 5.1V。',
      'LED 保护原则：车载发光二极管工作电流通常为 15mA~20mA，导通压降约 2.0V（红/黄灯）或 3.0V（白/蓝灯）。',
      '限流电阻计算公式：R = (U_cc - U_led) / I_led。例如 12V 电源、U_led=2.0V、目标工作电流 20mA 时，R = (12 - 2) / 0.02 = 500Ω。',
      '反例警示：若不加限流电阻或阻值过小，工作电流将剧增烧毁 LED；阻值过大则亮度微弱。',
    ],
    completion: '完成稳压二极管反向稳压与 LED 限流电阻计算验证，掌握汽车指示灯保护原理。',
    mentorPrompt:
      '发光二极管 LED 亮丽又省电，但它极其娇气！汽车电网标称 12V，发动机运转时甚至高达 14.4V！要是直接怼在蓄电池两端，瞬间就会因几安培过流冒烟烧毁！必须根据 R = (U - Uled) / I 严格串联限流电阻！',
    hint: '调节限流电阻滑动条，观察电流从过大烧毁、额定发光到阻值过大熄灭的变化曲线。',
    mentorEmotion: 'THINKING',
  },
  BLIND_DIODE_FAULT_DIAGNOSIS: {
    title: '实训步骤 4：二极管四类典型故障盲测排故',
    objective: '对四个未知测试样件进行万用表盲测，准确分类：性能良好、内部击穿短路、内部烧损开路、反向漏电严重',
    actions: [
      '从测试台选取随机编号样件（D-Sample A/B/C/D）。',
      '使用万用表二极管挡测试正反向读数。',
      '分析测试特征：正向 0.65V / 反向 OL 为正常；正向 0.00V / 反向 0.00V 为击穿短路；正反向均为 OL 为内部烧断断路；反向有数百毫伏异常读数为漏电击穿老化。',
      '在诊断答题卡中提交样件真实状态，验证排故准确率。',
    ],
    completion: '顺利完成四类二极管状态盲测分类，具备汽车传感器与控制器板级二极管排故能力。',
    mentorPrompt:
      '修理厂老师傅看二极管，只用两秒钟！红黑表笔点两下，看屏幕是几百毫伏、是 OL 还是 0.00V。来，这四个盲测样品你亲手测一遍，把击穿的、断路的准确挑出来！',
    hint: '依次点击样件 A/B/C/D，记录正向与反向压降，并在右侧工单提交诊断结果。',
    mentorEmotion: 'NORMAL',
  },
  ENGINEERING_REPAIR_AND_DELIVERY: {
    title: '实训步骤 5：汽车示宽灯/刹车灯电路 LED 烧毁工程修复',
    objective: '承接实车示宽灯 LED 频繁烧毁工单，诊断故障根因（原装 470Ω 限流电阻被错换为 10Ω 低阻），规范更换并交付',
    actions: [
      '实车故障问诊：客户反映改装的高清 LED 示宽灯装车仅半小时即过热烧焦冒烟。',
      '万用表在板检测：测量限流电阻阻值，仅为 10Ω（严重过小，导致 LED 电流高达 (12-2)/10 = 1000mA = 1A，额定仅 20mA）。',
      '备件领用：从领料库选用标称 470Ω/1W 金属膜限流电阻及 1N4007 防反接保护二极管。',
      '规范焊接与绝缘：安装并涂覆导热绝缘硅胶。',
      '通电交付复验：开机通电，工作电流稳在 21.2mA，LED 发光均匀不发烫，生成合格交付工单。',
    ],
    completion: '成功排除汽车 LED 限流故障，规范完成配件更换与带载通电复验交付。',
    mentorPrompt:
      '干得漂亮！改装或者维修灯具，很多新手嫌灯不够亮，私自换小电阻甚至直接短接，结果就是电流超标五十倍把灯珠烤糊！按规范换回 470 欧电阻，电流稳定在 20 毫安，这才是专业的汽车电工标准！',
    hint: '点击“测量在板电阻”，发现 10Ω 阻值异常，领用 470Ω 标准电阻换上并复验通电。',
    mentorEmotion: 'PRAISE',
  },
};

export type DiodeFaultType = 'NORMAL' | 'SHORT' | 'OPEN' | 'REVERSE_LEAK';

export interface DiodeSample {
  id: string;
  name: string;
  forwardMv: number;
  reverseMv: number | null; // null = OL
  actualType: DiodeFaultType;
}

export const E01_SAMPLES: DiodeSample[] = [
  { id: 'SMP_1', name: '样件 1 (标称 1N4007)', forwardMv: 642, reverseMv: null, actualType: 'NORMAL' },
  { id: 'SMP_2', name: '样件 2 (拆车整流管)', forwardMv: 2, reverseMv: 3, actualType: 'SHORT' },
  { id: 'SMP_3', name: '样件 3 (过流烧蚀管)', forwardMv: 9999, reverseMv: null, actualType: 'OPEN' }, // forward OL
  { id: 'SMP_4', name: '样件 4 (老化漏电管)', forwardMv: 630, reverseMv: 890, actualType: 'REVERSE_LEAK' },
];

export function calculateLedResistor(uBat: number, uLed: number, iTargetMa: number): number {
  if (iTargetMa <= 0) return 99999;
  return Math.round(((uBat - uLed) / (iTargetMa / 1000)) * 10) / 10;
}

export function calculateLedCurrentMa(uBat: number, uLed: number, rOhm: number): number {
  if (rOhm <= 0) return 9999;
  const iA = Math.max(0, (uBat - uLed) / rOhm);
  return Math.round(iA * 1000 * 10) / 10;
}
