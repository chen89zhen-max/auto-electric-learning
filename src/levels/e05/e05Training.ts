export type E05Step =
  | 'LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE'
  | 'EXPERIMENT_BOX_TRUTH_VERIFICATION'
  | 'VEHICLE_SAFETY_INTERLOCK_LOGIC'
  | 'BLIND_LOGIC_IC_FAULT_DIAGNOSIS'
  | 'ENGINEERING_REPAIR_AND_DELIVERY';

export interface E05StageContent {
  title: string;
  objective: string;
  actions: readonly string[];
  completion: string;
  mentorPrompt: string;
  hint: string;
  mentorEmotion: 'NORMAL' | 'WARNING' | 'PRAISE' | 'THINKING';
}

export const E05_STAGE_CONTENT: Record<E05Step, E05StageContent> = {
  LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE: {
    title: '实训步骤 1：三大基本逻辑门 (AND / OR / NOT) 与真值表认知',
    objective: '掌握与门(全1出1)、或门(有1出1)、非门(相反反相)的逻辑符号、布尔表达式及真值表',
    actions: [
      '认知与门 (AND 门, Y = A · B)：只有当输入端 A 和 B 同时为高电平 1 时，输出 Y 才为 1；只要有一个输入为 0，输出即为 0。',
      '认知或门 (OR 门, Y = A + B)：只要输入端 A 或 B 中有一个为高电平 1，输出 Y 就为 1；全 0 时才输出 0。',
      '认知非门 (NOT 门 / 反相器, Y = Ā)：输入为 1 输出为 0，输入为 0 输出为 1。',
      '拓展与非门 (NAND) 与或非门 (NOR)：在与门/或门输出端增加非门小圆圈取反。',
    ],
    completion: '建立数字逻辑门电路与二进制高低电平布尔逻辑思维。',
    mentorPrompt:
      '徒弟，现代汽车越来越聪明，会自己思考做决定，靠的就是数字逻辑！“与门”就像两个串联的开关，必须都按下去灯才亮；“或门”就像两个并联的开关，按哪个灯都亮；“非门”就是反着来！这三大门是所有汽车电脑逻辑判断的基石！',
    hint: '点击切换“与门 / 或门 / 非门”，观察不同输入组合下高低电平与输出真值表的映射关系。',
    mentorEmotion: 'NORMAL',
  },
  EXPERIMENT_BOX_TRUTH_VERIFICATION: {
    title: '实训步骤 2：数字逻辑试验箱电平开关与真值表全组合实测',
    objective: '使用逻辑电平开关拨动 0/1 状态，观测输出指示 LED 点亮/熄灭，逐行记录验证 74HC 系列芯片真值表',
    actions: [
      '将数字逻辑试验箱接通 5V 直流供电，芯片 VCC 引脚接 5V，GND 引脚接地。',
      '验证 74HC08 (四 2 输入与门)：拨动开关 A=0/B=0(LED灭), A=0/B=1(灭), A=1/B=0(灭), A=1/B=1(LED亮)，完成真值表比对。',
      '验证 74HC32 (四 2 输入或门)：拨动开关验证只要任一开关置 1，输出 LED 立即亮起。',
      '验证 74HC04 (六反相器非门)：输入置 0 时输出点亮，置 1 时输出熄灭。',
    ],
    completion: '全组合验证三大基本门电路真值表，掌握数字电平实测规范。',
    mentorPrompt:
      '拿逻辑试验箱做实验，输入端就是高低电平开关，输出端就是发光二极管！把 00、01、10、11 这四种组合全都拨一遍，眼见为实看看指示灯到底亮不亮，这就是真值表验证！',
    hint: '拨动开关 A 和 B，逐一比对 4 种电平组合的实测结果并完成真值表填报。',
    mentorEmotion: 'NORMAL',
  },
  VEHICLE_SAFETY_INTERLOCK_LOGIC: {
    title: '实训步骤 3：汽车安全带未系与车门未关报警多条件联锁逻辑',
    objective: '综合运用逻辑门电路设计实车安全联锁：座椅有人(A) AND 安全带未系(B) AND 车速>20km/h(C) 触发报警',
    actions: [
      '梳理输入传感器条件：A(主驾压力传感器，有人=1，无人=0)；B(安全带卡扣开关，未系好=1，系好=0)；C(车速传感器，车速>20km/h=1，静止=0)。',
      '构建逻辑表达式：报警 Alarm = A · B · C (三输入与门逻辑)。',
      '组合仿真测试：主驾有人(1)但静止(0)不报警；主驾无人(0)开快车(1)不报警；有人(1)且车速>20(1)但未系安全带(1)，输出=1触发急促蜂鸣。',
      '车门未关报警拓展：(左前门开 OR 右前门开 OR 左后门开 OR 右后门开) AND 档位在 D 档 -> 仪表盘门未关亮红灯。',
    ],
    completion: '成功构建实车安全联锁逻辑表达式，掌握多条件复合控制设计。',
    mentorPrompt:
      '汽车安全带报警为什么不在熄火停在车位时瞎叫唤？因为工程师加了逻辑联锁！必须同时满足“椅子上坐着人”、“安全带没插好”、“车子已经跑起来”这三个条件同时成立（全为1），与门才发出报警信号！这就是逻辑判断的工程价值！',
    hint: '调节 A(入座)、B(未系)、C(车速) 三个输入开关，观察三输入与门报警输出是否符合逻辑。',
    mentorEmotion: 'THINKING',
  },
  BLIND_LOGIC_IC_FAULT_DIAGNOSIS: {
    title: '实训步骤 4：数字逻辑芯片 4 组未知故障盲测排查',
    objective: '对测试台 4 片未知 74 系列逻辑芯片进行带电功能排查，分类：芯片良好、VCC供电脚脱焊、输入端内部悬空虚高、输出端击穿接地常零',
    actions: [
      '依次将 4 片待测 IC 插入锁紧测试座。',
      '使用万用表逻辑电平笔或直流电压档测试 VCC/GND 供电引脚及各逻辑输出引脚。',
      '排故特征识别：良好芯片（完全符合与门/或门真值表）；VCC 供电脱焊（芯片无供电，所有输出恒为 0V 无响应）；输入脚内部悬空（CMOS 芯片输入悬空等效为高电平 1，输入 0 时仍按 1 计算）；输出脚击穿接地（无论输入何种电平，输出端电阻仅 0.2Ω 恒为 0V）。',
      '在工单中提交诊断分类。',
    ],
    completion: '准确诊断板级数字逻辑芯片开路、悬空与短路故障，具备车机与仪表板维修能力。',
    mentorPrompt:
      '逻辑芯片出毛病，最阴险的就是引脚内部悬空或者输出端对地击穿！不管前面传感器怎么变，输出永远是死的一条直线！来，把这四个工位的逻辑芯片毛病查得明明白白！',
    hint: '测试不同输入组合时输出端电压变化，结合电源引脚电平准确提交 4 组诊断结果。',
    mentorEmotion: 'NORMAL',
  },
  ENGINEERING_REPAIR_AND_DELIVERY: {
    title: '实训步骤 5：实车系好安全带后报警依然狂叫工程修复',
    objective: '诊断车主系好安全带后蜂鸣器仍持续报警工单，排查安全带锁扣检测微动开关线束磨破对地短路，更换线束总成复验交付',
    actions: [
      '实车故障问诊：车辆行驶中，驾驶员已将安全带插扣牢固锁死，但仪表盘安全带红灯常亮，报警蜂鸣器持续尖叫。',
      '万用表信号电压测量：断开 BCM 插头，用万用表测安全带锁扣信号线，系好状态下信号线对地电阻为 0.1Ω（正常系好应为开路断开高电平 5V，未系时为 0V）。',
      '线束物理排查：拆开座椅侧护板，发现锁扣线束被座椅滑动轨道金属边缘挤压磨破外皮，导线与车身金属骨架搭铁短路！',
      '线束修复与耐磨防护：更换原厂配套安全带锁扣总成带线束，加装耐磨波纹套管与固定卡扣。',
      '实车交付复验：起动试车车速达 30km/h，插上安全带报警音立即停止，拔出安全带即刻报警，联锁控制恢复如初。',
    ],
    completion: '排除实车安全带检测信号线虚接搭铁短路严重电气缺陷，规范修复并完成路试复验。',
    mentorPrompt:
      '干得漂亮！安全带线束被座椅滑轨割破搭铁，导致逻辑芯片永远判定为“安全带没插好”（输入恒为 1）！换上新锁扣加装耐磨波纹管，系上立刻消音，拔出立刻报警，安全闭环交车！',
    hint: '万用表测出搭铁短路，更换锁扣耐磨线束总成并进行实车动态测试。',
    mentorEmotion: 'PRAISE',
  },
};

export type LogicGateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR';

export function evaluateLogicGate(type: LogicGateType, a: boolean, b: boolean): boolean {
  switch (type) {
    case 'AND':
      return a && b;
    case 'OR':
      return a || b;
    case 'NOT':
      return !a;
    case 'NAND':
      return !(a && b);
    case 'NOR':
      return !(a || b);
  }
}

export interface LogicIcSample {
  id: string;
  name: string;
  outputTruths: boolean[]; // for input [00, 01, 10, 11]
  actualType: 'GOOD' | 'VCC_DISCONNECTED' | 'INPUT_FLOATING' | 'OUTPUT_SHORT_GND';
}

export const E05_SAMPLES: LogicIcSample[] = [
  { id: 'IC_1', name: '逻辑芯片 #1 (原装 74HC08 与门)', outputTruths: [false, false, false, true], actualType: 'GOOD' },
  { id: 'IC_2', name: '逻辑芯片 #2 (VCC 虚焊)', outputTruths: [false, false, false, false], actualType: 'VCC_DISCONNECTED' },
  { id: 'IC_3', name: '逻辑芯片 #3 (输入 B 悬空高)', outputTruths: [false, false, true, true], actualType: 'INPUT_FLOATING' },
  { id: 'IC_4', name: '逻辑芯片 #4 (输出引脚对地击穿)', outputTruths: [false, false, false, false], actualType: 'OUTPUT_SHORT_GND' },
];
