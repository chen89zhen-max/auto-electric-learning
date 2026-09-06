export type E06Step =
  | 'MAGNETO_VS_HALL_COGNITION'
  | 'MULTIMETER_AND_OSCILLOSCOPE_TEST'
  | 'SPEED_FREQUENCY_AND_GAP_CALC'
  | 'BLIND_SPEED_SENSOR_FAULT_DIAGNOSIS'
  | 'ENGINEERING_REPAIR_AND_DELIVERY';

export interface E06StageContent {
  title: string;
  objective: string;
  actions: readonly string[];
  completion: string;
  mentorPrompt: string;
  hint: string;
  mentorEmotion: 'NORMAL' | 'WARNING' | 'PRAISE' | 'THINKING';
}

export const E06_STAGE_CONTENT: Record<E06Step, E06StageContent> = {
  MAGNETO_VS_HALL_COGNITION: {
    title: '实训步骤 1：磁电式 vs 霍尔式转速传感器原理对比',
    objective: '理解两线无源磁电式(感应正弦交流)与三线有源霍尔式(数字方波)的物理机理、引脚接线与波形差异',
    actions: [
      '认知磁电式传感器：永久磁铁、软铁芯与感应线圈构成，两线制（SIGNAL+ / SIGNAL-，外加屏蔽层接地），齿盘转动产生连续正弦脉动波形。',
      '认知霍尔式传感器：利用半导体霍尔效应，三线制（5V/12V电源 VCC、地线 GND、信号线 OUT），内部集成施密特整形电路，输出恒定 0~5V 陡峭数字方波。',
      '幅值与转速关系对比：磁电式输出幅值随转速增加而急剧增大（怠速约 1V，高转速可超 30V）；霍尔式幅值恒定为 5V，与转速高低完全无关。',
      '在工单中对比两类传感器在汽车发动机曲轴与轮速 ABS 中的适用场景。',
    ],
    completion: '建立模拟正弦交流与数字方波脉冲传感器的双模认知。',
    mentorPrompt:
      '徒弟，汽车上测转速最常见的就是“磁电式”和“霍尔式”！数数线头最直观：两根线的是磁电式，自己发电，转得越快电压越高，波形是弯弯曲曲的正弦波；三根线的是霍尔式，必须供电，吐出来的是方方正正的 5V 数字方波！这个区别是诊断的第一步！',
    hint: '点击“切换传感器类型”，对比示波器上正弦交流波与方波脉冲以及接线端子的不同。',
    mentorEmotion: 'NORMAL',
  },
  MULTIMETER_AND_OSCILLOSCOPE_TEST: {
    title: '实训步骤 2：万用表测阻/供电与示波器波形规范捕捉',
    objective: '规范使用数字万用表测量磁电式线圈直流电阻与霍尔式工作电源，使用示波器捕捉动态转速波形',
    actions: [
      '断电测量磁电式线圈阻值：旋至 2kΩ 挡，测量两信号端子之间电阻，标称值通常在 800Ω~1200Ω（典型 950Ω），若显示 OL 则内部漆包线断路，显示 0Ω 则匝间击穿。',
      '通电测量霍尔式供电端：开点火开关，测量 VCC 引脚对地电压，应稳定为 5.0V（或车载 12V 蓄电池电压）。',
      '示波器观察 60-2 齿靶轮信号：旋转靶轮，观测到连续规整正弦/方波脉冲，每转一圈出现两个齿缺口对应的“宽同步波形”（上止点 TDC 标记）。',
    ],
    completion: '掌握电阻静态与电压动态测量规范，熟练辨别 60-2 缺齿参考基准。',
    mentorPrompt:
      '查磁电传感器，静态拿电阻挡量一量线圈，八九百欧姆就差不多；查霍尔传感器，必须开钥匙量红线有没有 5 伏供电！挂上示波器转起来，齿轮缺了两个齿的地方波形会有个明显的长宽缺口，那就是一缸上止点的记号！',
    hint: '用万用表测阻或测供电，再在示波器上观察缺齿参考波形。',
    mentorEmotion: 'NORMAL',
  },
  SPEED_FREQUENCY_AND_GAP_CALC: {
    title: '实训步骤 3：转速与脉冲频率换算及安装气隙定量分析',
    objective: '掌握发动机转速与脉冲频率计算公式 f = (n × Z) / 60，理解安装气隙对信号幅度的反比衰减规律',
    actions: [
      '频率换算计算：曲轴靶轮齿数 Z = 58 齿（60-2 齿），发动机怠速 n = 600 rpm 时，信号频率 f = (600 × 58) / 60 = 580 Hz；当发动机加速至 n = 3000 rpm 时，f = (3000 × 58) / 60 = 2900 Hz (2.9 kHz)。',
      '安装气隙要求：传感器端面与飞轮靶轮齿顶之间的空气间隙通常严格控制在 0.5mm~1.2mm 之间（标称 0.8mm）。',
      '气隙过大反例：若安装垫片过厚或松动导致气隙扩大到 2.5mm，磁阻急剧增大，感应电压幅值跌落 80%，ECU 无法识别弱信号导致无法点火启动。',
    ],
    completion: '完成转速频率公式推演与安装气隙定量分析，掌握精准物理间隙装配技术。',
    mentorPrompt:
      '转速和频率是完全绑定的！发动机转一圈，58 个齿打过去，就是 58 个脉冲！转速越高频率越高！另外千万记住安装间隙不能太大，塞尺量好必须在 0.8 毫米左右！要是垫片塞多了缝隙大到两三毫米，磁力漏光了信号弱得像蚂蚁叫，ECU 根本接收不到！',
    hint: '拖动转速滑块观察脉冲频率实时变化，调节安装气隙对比信号幅度衰减情况。',
    mentorEmotion: 'THINKING',
  },
  BLIND_SPEED_SENSOR_FAULT_DIAGNOSIS: {
    title: '实训步骤 4：转速传感器 4 组未知故障盲测排查',
    objective: '对测试台 4 组未知传感器进行全项排查：良好传感器、磁电线圈断路、安装气隙过大信号微弱、屏蔽线断开电磁干扰杂波',
    actions: [
      '依次将 4 组传感器安装于信号模拟测试台，以 1500 rpm 转速运转。',
      '使用示波器与万用表记录波形幅值、完整性与杂波形态。',
      '故障特征分析：良好件（正弦/方波波形完整，幅值达标，TDC 缺齿清晰）；线圈断路（阻值 OL，示波器一条水平零线）；气隙过大（波形形态正常但峰峰值仅 0.15V，无法触发阈值）；屏蔽层脱焊（信号上叠加高频火花塞高压尖峰毛刺，导致 ECU 误判转速暴跳）。',
      '填报盲测分类工单。',
    ],
    completion: '准确分辨断路、微弱衰减与电磁干扰波形畸变，具备汽车传感器疑难杂症攻坚能力。',
    mentorPrompt:
      '示波器波形就是传感器的“心电图”！是死线一条、是低矮无力、还是长满了毛刺？一看心电图全清楚！尤其是屏蔽线断了被高压火花干扰，转速表一踩油门乱蹦，这就是典型的杂波干扰！来，把这四个样品的毛病全部查出来！',
    hint: '结合示波器波形高度与杂波程度，判定 4 组样品的故障类型。',
    mentorEmotion: 'NORMAL',
  },
  ENGINEERING_REPAIR_AND_DELIVERY: {
    title: '实训步骤 5：实车发动机热车偶发熄火 (P0335) 工程修复',
    objective: '承接实车冷车启动正常但水温达 90°C 后突然熄火无法启动工单，诊断磁电传感器热态微裂开路，更换并规范调校气隙交付',
    actions: [
      '接车问诊：读取故障码为 P0335 (曲轴位置传感器 A 回路故障)，车主反映冷车一把着，跑半小时热车后瞬间熄火，必须等发动机冷却半小时才能再次发动。',
      '热态电阻测量：用工业热风枪加热传感器至 85°C 并用万用表测阻，阻值在 82°C 时突变为无穷大 OL（内部微裂缝热胀冷缩导致断路），冷却后又恢复为 920Ω。',
      '备件更换与气隙调校：领用原厂高温耐热曲轴位置传感器总成，用标准塞尺校准安装端面与靶轮齿顶气隙为 0.8mm，打标准扭矩 9 N·m 紧固。',
      '路试通电交付复验：热车怠速与高速连续运转 40 分钟，曲轴信号波形稳定无抖动，故障码永久清除，交车合格。',
    ],
    completion: '圆满排除汽车最难排查的“热车偶发性断路”隐蔽故障，规范完成塞尺调校与长时路试复验。',
    mentorPrompt:
      '干得漂亮！“冷车好、热车熄火”是汽车维修里出了名的“鬼脉”，很多新手查冷车没问题就抓瞎！你用热态阻值测试一下子抓住了内部热胀开裂的原形！换上新件塞尺调准 0.8 毫米，热车运转 40 分钟稳如泰山！',
    hint: '加热传感器测出热态断路，更换新传感器并使用塞尺将气隙调准为 0.8mm。',
    mentorEmotion: 'PRAISE',
  },
};

export type SensorFaultType = 'GOOD' | 'COIL_OPEN' | 'GAP_TOO_LARGE' | 'SHIELD_BROKEN';

export interface SensorSample {
  id: string;
  name: string;
  measuredResistance: number; // 920 (normal), 9999999 (OL)
  vppAmplitude: number; // 3.2V (normal), 0.0V (open), 0.18V (large gap)
  hasNoiseSpikes: boolean;
  actualType: SensorFaultType;
}

export const E06_SAMPLES: SensorSample[] = [
  { id: 'SEN_1', name: '传感器 #1 (原厂标准件)', measuredResistance: 920, vppAmplitude: 3.5, hasNoiseSpikes: false, actualType: 'GOOD' },
  { id: 'SEN_2', name: '传感器 #2 (线圈内部断路)', measuredResistance: 9999999, vppAmplitude: 0.0, hasNoiseSpikes: false, actualType: 'COIL_OPEN' },
  { id: 'SEN_3', name: '传感器 #3 (间隙过大衰减)', measuredResistance: 920, vppAmplitude: 0.18, hasNoiseSpikes: false, actualType: 'GAP_TOO_LARGE' },
  { id: 'SEN_4', name: '传感器 #4 (屏蔽层断开杂波)', measuredResistance: 920, vppAmplitude: 3.2, hasNoiseSpikes: true, actualType: 'SHIELD_BROKEN' },
];

export function calculateSpeedFrequency(rpm: number, teeth: number): number {
  return Math.round(((rpm * teeth) / 60) * 10) / 10;
}
