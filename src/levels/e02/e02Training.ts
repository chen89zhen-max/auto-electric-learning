export type E02Step =
  | 'CAPACITOR_STORAGE_COGNITION'
  | 'MULTIMETER_CAPACITANCE_TEST'
  | 'RC_TIME_CONSTANT_CURVE'
  | 'BLIND_CAPACITOR_FAULT_DIAGNOSIS'
  | 'ENGINEERING_REPAIR_AND_DELIVERY';

export interface E02StageContent {
  title: string;
  objective: string;
  actions: readonly string[];
  completion: string;
  mentorPrompt: string;
  hint: string;
  mentorEmotion: 'NORMAL' | 'WARNING' | 'PRAISE' | 'THINKING';
}

export const E02_STAGE_CONTENT: Record<E02Step, E02StageContent> = {
  CAPACITOR_STORAGE_COGNITION: {
    title: '实训步骤 1：电容器储能与延时放电认知',
    objective: '理解电容“隔直通交、储存电荷”物理本质，掌握极性防爆（长正短负）与耐压规范',
    actions: [
      '观察电解电容实物特征：圆柱铝壳防爆阀纹路、负极白色箭头色带、长引脚为正极、短引脚为负极。',
      '观察充电过程：按下充电按钮，直流电源向电容注入电荷，端电压迅速升至 12V，电能储存在极板电场中。',
      '断开主电源：断电瞬间工作指示灯并没有立即熄灭，而是由电容释放储存的电荷维持持续发光数秒后缓慢熄灭（延时现象）。',
      '极性与耐压警示：电解电容严禁反接！反接或耐压不足会导致电解液剧烈沸腾、防爆槽冲开甚至炸膛！',
    ],
    completion: '建立电容器充放电与电场储能物理模型，牢固掌握电解电容极性防爆红线。',
    mentorPrompt:
      '徒弟，你有没有注意到汽车钥匙拔掉锁车后，车顶阅读灯或者迎宾踏板灯还会慢慢变暗渐隐熄灭？这就是电容器在放电！它就像一个能快速存水放水的“蓄水池”，在汽车延时电路和电源平波里无处不在！但记住：铝电解电容绝对不能反接，否则直接炸膛！',
    hint: '点击“接通充电”然后再点击“切断电源”，观察指示灯依靠电容残余电荷延时发光的物理现象。',
    mentorEmotion: 'NORMAL',
  },
  MULTIMETER_CAPACITANCE_TEST: {
    title: '实训步骤 2：万用表电容档测量与充放电动态判别',
    objective: '掌握测量前规范放电安全操作，使用数字万用表电容挡精确测定容量，电阻挡观察充放电回弹',
    actions: [
      '测量前规范放电：取下电容后，用 100Ω 电阻或绝缘螺丝刀短接两极充分放电，严禁带电测容烧毁万用表！',
      '将万用表旋钮旋至电容测量挡（F 挡位）。',
      '红黑表笔接触电容两极，表头显示容量数值，对比标称值（标称 470μF，实测在 ±10% 允差范围内为合格）。',
      '电阻挡动态检验：打至电阻 20kΩ 挡测电容，屏幕先出现小阻值随后随内部充电逐渐变大直至 OL，表明电容充放电性能优良。',
    ],
    completion: '掌握电容规范放电与容量精确检测技术，具备动态定性检验能力。',
    mentorPrompt:
      '测量大电容前，第一件事必须是“放电”！几百微法存满电的高压电容直接上表笔，瞬间电弧就能把万用表的 AD 芯片打穿！放完电打到电容挡测容量，再用电阻挡看阻值能不能从小到大慢慢回弹到无穷大！',
    hint: '点击“执行安全放电”，将旋钮切至 [CAP] 挡，记录读数并检验是否符合标称容量。',
    mentorEmotion: 'NORMAL',
  },
  RC_TIME_CONSTANT_CURVE: {
    title: '实训步骤 3：RC 时间常数 τ = R × C 充放电规律',
    objective: '理解一阶 RC 暂态过渡过程，掌握时间常数 τ = R × C 计算，通过示波器观测 1τ(63.2%) 与 5τ(充饱) 节点',
    actions: [
      '调节电阻阻值 R 与电容容量 C，计算时间常数 τ = R(Ω) × C(F)。例如 R=10kΩ, C=470μF，τ = 10000 × 0.00047 = 4.7 秒。',
      '观察示波器充电指数上升曲线：从 0V 开始，经过 1τ 时电容电压达到稳态值的 63.2%（约 7.58V）；经过 3τ~5τ 时完全充饱至 12V。',
      '观察放电指数下降曲线：经过 1τ 时电容电压降至初始值的 36.8%（约 4.42V）；经过 5τ 彻底放尽。',
      '在工单中验证汽车雨刮间歇延时控制器：通过旋钮改变电位器 R 即可线性调整间歇延时时间。',
    ],
    completion: '完成 RC 时间常数定量分析与暂态曲线验证，掌握汽车延时控制核心电路。',
    mentorPrompt:
      '雨刮器转一下、停几秒、再转一下，这个“停几秒”是怎么做出来的？就是调节电位器 R，改变 RC 时间常数 τ！时间常数 τ = R × C，越大充电放电就越慢，延时就越长！63.2% 和 36.8% 这两个拐点数字，是电工考试和设计必考的！',
    hint: '拖动滑块改变 R 或 C，观察示波器上电压暂态过渡曲线波形与充饱耗时的变化。',
    mentorEmotion: 'THINKING',
  },
  BLIND_CAPACITOR_FAULT_DIAGNOSIS: {
    title: '实训步骤 4：电容器四类典型故障盲测排查',
    objective: '对测试台 4 个未知电容进行测量分类：容量良好、内部击穿短路、内部断路失效、电解液干涸容量衰减',
    actions: [
      '按顺序取放放电完毕的待测样件（C-Sample 1~4）。',
      '使用万用表电容挡测试实际容值，并辅助电阻挡检测绝缘状态。',
      '典型故障特征：实测 468μF 接近标称（良好）；实测电阻 0.0Ω 持续蜂鸣（击穿短路）；测容量显示 0.0nF 且电阻恒为 OL（内部极片断开）；标称 470μF 实测仅 12μF（电解液干涸老化失效）。',
      '在测试卡中填报 4 组样件真实状态并提交验收。',
    ],
    completion: '准确分辨电容器短路、断路与干涸容量失效，掌握汽车控制器板级电容诊断本领。',
    mentorPrompt:
      '汽车控制电脑（ECU）或者仪表板里，电解电容常年处于发动机舱高温环境，最容易“肚子鼓包”甚至漏液干涸！干涸了容量就会从几百微法跌到只剩几微法，滤波效果就全没了！来，把这四个样品的毛病全揪出来！',
    hint: '逐一检测每个样件的实测容量与漏电阻值，准确提交四类诊断结果。',
    mentorEmotion: 'NORMAL',
  },
  ENGINEERING_REPAIR_AND_DELIVERY: {
    title: '实训步骤 5：实车车身控制模块 (BCM) 延时照明失效工程修复',
    objective: '诊断实车顶棚迎宾灯无法延时渐隐熄灭（关门瞬间立即跳灭）故障，更换已击穿电解电容并复验交付',
    actions: [
      '接车问诊：车主反映车辆锁车后迎宾灯瞬间全灭，完全失去原车设计的 15 秒缓慢渐隐延时关灯功能。',
      '电路图分析：延时电路由 BCM 内部 100kΩ 上拉电阻与 150μF 延时电解电容构成（τ ≈ 15s）。',
      '在板检测：电容两极阻值为 0.5Ω（内部介质击穿短路），电荷无法存储，导致延时脚电压瞬间拉低归零。',
      '元器件选用与焊接：领用耐温 105°C、耐压 35V、容量 150μF 的优质汽车级固态/铝电解电容，注意长正短负极性正确焊装。',
      '功能交付复验：关门锁车，迎宾灯持续保持高亮并优雅渐隐熄灭，耗时 14.8 秒，符合主机厂出厂标准。',
    ],
    completion: '圆满排除汽车延时电路电容击穿故障，规范完成板级更换、极性防反校验与实车功能复验。',
    mentorPrompt:
      '干得漂亮！焊装电解电容千万不能把正负极搞反，板子上带阴影斜线的那一边是负极！新电容焊上去，实测延时 15 秒平滑熄灭，完美修复！这就是板级维修的高附加值技术！',
    hint: '用电阻挡查出 0.5Ω 击穿故障，在备料盒中选中 150μF/35V 电容焊装并通电复验。',
    mentorEmotion: 'PRAISE',
  },
};

export type CapFaultType = 'GOOD' | 'SHORT' | 'OPEN' | 'DEGRADED';

export interface CapSample {
  id: string;
  name: string;
  nominalUf: number;
  measuredUf: number;
  resistanceOhm: number; // 0 (short), 9999999 (good/open)
  actualType: CapFaultType;
}

export const E02_SAMPLES: CapSample[] = [
  { id: 'CAP_1', name: '样件 1 (原厂标称 470μF)', nominalUf: 470, measuredUf: 468, resistanceOhm: 9999999, actualType: 'GOOD' },
  { id: 'CAP_2', name: '样件 2 (高温鼓包管)', nominalUf: 470, measuredUf: 0, resistanceOhm: 0.8, actualType: 'SHORT' },
  { id: 'CAP_3', name: '样件 3 (极片振脱管)', nominalUf: 470, measuredUf: 0.1, resistanceOhm: 9999999, actualType: 'OPEN' },
  { id: 'CAP_4', name: '样件 4 (干涸老化管)', nominalUf: 470, measuredUf: 14.5, resistanceOhm: 9999999, actualType: 'DEGRADED' },
];

export function calculateTauSeconds(rOhm: number, cMicroFarad: number): number {
  return Math.round((rOhm * (cMicroFarad / 1000000)) * 100) / 100;
}

export function calculateVcCharging(uSource: number, tauSeconds: number, timeElapsed: number): number {
  if (tauSeconds <= 0) return uSource;
  const val = uSource * (1 - Math.exp(-timeElapsed / tauSeconds));
  return Math.round(val * 100) / 100;
}
