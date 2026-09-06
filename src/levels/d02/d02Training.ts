export type D02Step =
  | 'LORENTZ_FORCE_AND_LEFT_HAND_RULE'
  | 'COMMUTATOR_AND_CONTINUOUS_ROTATION'
  | 'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL'
  | 'BLIND_DC_MOTOR_FAULT_ISOLATION'
  | 'ENGINEERING_REPAIR_AND_COMMISSIONING';

export interface D02StageContent {
  title: string;
  objective: string;
  actions: readonly string[];
  completion: string;
  mentorPrompt: string;
  hint: string;
  mentorEmotion: 'NORMAL' | 'WARNING' | 'PRAISE' | 'THINKING';
}

export const D02_STAGE_CONTENT: Record<D02Step, D02StageContent> = {
  LORENTZ_FORCE_AND_LEFT_HAND_RULE: {
    title: '实训步骤 1：磁场对电流的作用力与左手定则',
    objective: '理解通电导体在磁场中受到电磁力(安培力)的本质，熟练运用左手定则预测导体受力与旋转方向',
    actions: [
      '设置永磁体定子磁场：上极 N 极、下极 S 极，磁感线垂直向下穿过空间。',
      '将直导线置于磁场中，通入由内向外的直流电流。',
      '运用左手定则：伸开左手，手心朝上正对 N 极（磁感线穿手心），四指指向电流流出方向，大拇指指向右侧受力方向。',
      '反向验证反例：翻转磁极或反转电流方向，观察导线受力反向运动；若电流与磁感线平行，则受力为零（F = BIL sin 0° = 0）。',
    ],
    completion: '左手定则判断受力准确无误，掌握磁场中载流导线受力的物理规律与矢量关系。',
    mentorPrompt:
      '徒弟，为什么通上电电机就能转？最根本的物理规律就是安培力！记住老祖宗留下的“左手定则”：磁感线穿手心，四指指向电流走，大拇指指着受力跑！要是磁感线和电流平行，导线连一根毫毛的力都受不到！',
    hint: '点击“切换磁极方向”或“切换电流方向”，观察导线受力箭头方向的改变。',
    mentorEmotion: 'NORMAL',
  },
  COMMUTATOR_AND_CONTINUOUS_ROTATION: {
    title: '实训步骤 2：换向器与电刷机制 · 破解平衡位置卡滞反例',
    objective: '观察直流电动机换向器在平衡位置切换电流方向的关键作用，深刻理解单向连续旋转的机理',
    actions: [
      '观察无换向器反例：封闭线圈转过垂直平衡位置后，左右两边受力方向依然不变，产生反向制动转矩，导致线圈在平衡位置剧烈振荡并卡死。',
      '引入半圆铜环换向器与石墨电刷：在线圈刚越过平衡位置的瞬间（转矩为零），电刷接触片自动与另一半铜环接触。',
      '电流方向瞬间反转：越过平衡位置后线圈两侧电流随之换向，受到的电磁转矩始终保持顺时针，实现稳定连续高速旋转。',
      '映射实车起动机 6 大内部结构：电枢转子、定子磁极、换向器铜环、石墨电刷、电磁开关（吸拉与保持）与单向离合器驱动齿轮。',
      '对比单相脉动磁场与三相旋转磁场：单相磁场不能自起动必须依靠换向器，三相交流电互差 120° 产生天然平滑旋转磁场（新能源电驱核心）。',
      '在工单中记录换向器与电刷的机械摩擦与碳粉磨损机理。',
    ],
    completion: '换向器工作原理与无换向器卡滞反例对比透彻，掌握直流电动机连续运转的机械结构。',
    mentorPrompt:
      '注意看！很多新手以为通上直流电电机就能一直转，结果做个实验线圈转了半圈就卡住抽搐！为什么？因为过了平衡位置转矩反了！直流电动机的核心绝活就是“换向器”和“碳刷”，在刚过中线的零点瞬间给线圈电流调个头，转矩就能一直顺着同一个方向推！',
    hint: '对比“无换向器 (平衡卡死)”与“带换向器 (连续旋转)”的动态动画与受力分析。',
    mentorEmotion: 'WARNING',
  },
  H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL: {
    title: '实训步骤 3：双继电器 H 桥正反转控制 (汽车车窗升降应用)',
    objective: '搭建汽车车窗双继电器 H 桥控制电路，掌握 4 种继电器开关组合实现电机正转、反转与停转制动',
    actions: [
      '配置双继电器 A 与 B：常闭触点均接车身搭铁(GND)，常开触点均接蓄电池正极(+12V)。',
      '状态 00 (A断/B断)：电机两端均为 0V 搭铁，电机断电停转。',
      '状态 10 (A吸/B断)：端子1接 +12V，端子2接 GND，电机正向旋转，驱动车窗平稳上升。',
      '状态 01 (A断/B吸)：端子1接 GND，端子2接 +12V，电机反向旋转，驱动车窗顺畅下降。',
      '状态 11 (A吸/B吸)：两端均为 +12V，电机两端等电位短路，形成能耗制动停转，且严防直通短路。',
    ],
    completion: '双继电器 H 桥正反转逻辑完全验证，掌握汽车车窗、雨刮与后视镜折叠的双向驱动核心。',
    mentorPrompt:
      '车窗能升又能降，是怎么做到的？用的就是这两个继电器组成的“H桥”！A 继电器吸合，电机正着转把玻璃摇上去；B 继电器吸合，电流掉头电机倒着转把玻璃降下来；两个都不吸或者都吸合，电机就停！',
    hint: '点击“升窗 (A吸合)”、“降窗 (B吸合)”和“停止”，观察电流流向与电机正反转动。',
    mentorEmotion: 'NORMAL',
  },
  BLIND_DC_MOTOR_FAULT_ISOLATION: {
    title: '实训步骤 4：独立盲测 · 汽车直流电动机典型故障排查',
    objective: '针对车窗电机“只降不升”、“运转无力”或“完全不转”故障，打表测量电刷、线圈与继电器触点锁定病根',
    actions: [
      '接入未知故障车辆：客户报修副驾车窗只降不升，或电机卡死发烫。',
      '测量输入电压：操作升窗开关时，打表测量电机端子 1 是否达到 12V（排查升窗继电器 A 触点高阻）。',
      '断电测量电机内阻：正常车窗电机内阻约 1.5Ω~3.0Ω；若阻值达几十欧姆，提示电刷磨损碳粉堆积虚接；若为 OL 则电枢绕组断路。',
      '排查机械卡滞：带载电流飙升至堵转电流（>15A），提示导轨异物卡滞。',
      '在工单中提交确凿测量证据并选定修复方案。',
    ],
    completion: '独立盲测直流电动机故障精准排查，综合运用电压降、电阻与电流分析锁定故障元凶。',
    mentorPrompt:
      '车窗突然不听使唤了！可能是升窗继电器触点烧蚀吃掉了电压，也可能是电机里的碳刷磨光了接触不良，还有可能是机械滑轨卡死了！先打表量电压，再拔插头测内阻，用数据说话！',
    hint: '依次测量电机供电端电压（带载升降工况）与电机绕组电阻，结合现象判断。',
    mentorEmotion: 'THINKING',
  },
  ENGINEERING_REPAIR_AND_COMMISSIONING: {
    title: '实训步骤 5：实车工程修复、导轨润滑与升降试车交车',
    objective: '更换损坏器件（电刷/继电器/滑轨），通电复测电机工作电流与升降平顺性，完成标准交车工单',
    actions: [
      '对故障部件进行工程修复：更换副驾升窗继电器，清理电机换向器表面积碳。',
      '清理车窗玻璃升降玻璃泥槽导轨并涂抹专用润滑膏，防止机械阻力过大导致电机过载。',
      '通电试车：升窗测试电机平稳上升，实测工作电流 3.2A（正常范围 2.5A~4.0A）；降窗实测电流 2.8A。',
      '防夹功能与极限行程断电检查：玻璃升到顶部防夹传感器与过流保护正常动作。',
      '规范签署工单，向车主交车。',
    ],
    completion: '车窗升降直流电动机系统工程修复与带载调试全部合格，达到实车出厂交付标准！',
    mentorPrompt:
      '好手艺！继电器换新了，换向器擦干净了，玻璃滑轨也润滑到位了！升降顺顺当当，工作电流只有 3 安培，安安静静不卡滞！把工具收好，车窗擦干净，通知车主提车！',
    hint: '点击“执行工程修复”，再分别测试升窗与降窗电流，确认各项指标合格后提交交付。',
    mentorEmotion: 'PRAISE',
  },
};

export interface StarterMotorComponent {
  id: 'ARMATURE' | 'STATOR_FIELD' | 'COMMUTATOR' | 'CARBON_BRUSHES' | 'SOLENOID_SWITCH' | 'DRIVE_PINION';
  name: string;
  role: string;
  location: string;
}

export const STARTER_MOTOR_COMPONENTS: StarterMotorComponent[] = [
  {
    id: 'ARMATURE',
    name: '电枢 (转子)',
    role: '由硅钢片铁芯与多匝电枢线圈组成，通入直流电产生受力转矩',
    location: '电机中心旋转轴',
  },
  {
    id: 'STATOR_FIELD',
    name: '定子磁极 (磁场)',
    role: '提供恒定工作磁场，传统起动机为励磁绕组，现代多用钕铁硼永磁体',
    location: '电机外壳内壁',
  },
  {
    id: 'COMMUTATOR',
    name: '换向器 (整流子)',
    role: '由多片梯形铜片与云母绝缘片拼接成圆环，在电枢旋转越过中性面瞬间自动改变线圈电流方向',
    location: '电枢轴前端',
  },
  {
    id: 'CARBON_BRUSHES',
    name: '碳刷与刷握 (电刷总成)',
    role: '石墨材质耐磨滑块，借助弹簧恒压贴合在换向器铜片上，将外部直流电源引入高速旋转的电枢',
    location: '后轴承盖刷架',
  },
  {
    id: 'SOLENOID_SWITCH',
    name: '电磁控制开关',
    role: '双线圈结构（吸引线圈+保持线圈），接通起动机主电路并推动拨叉挂齿',
    location: '电机上方圆筒体',
  },
  {
    id: 'DRIVE_PINION',
    name: '单向离合器驱动齿轮',
    role: '顺时针将起动机扭矩单向传递至发动机飞轮齿圈；发动机起动后超速打滑脱开，防止飞轮反向倒拖炸毁电机',
    location: '电机输出轴前端',
  },
];

export interface MagneticFieldComparison {
  singlePhase: {
    name: string;
    type: 'PULSATING';
    description: string;
    isSelfStarting: boolean;
    phaseDifferenceDegrees: number;
  };
  threePhase: {
    name: string;
    type: 'ROTATING';
    description: string;
    isRotating: boolean;
    isSelfStarting: boolean;
    phaseDifferenceDegrees: number;
  };
}

export const MAGNETIC_FIELD_COMPARISON: MagneticFieldComparison = {
  singlePhase: {
    name: '单相交流/单线圈脉动磁场',
    type: 'PULSATING',
    description: '固定空间轴线上大小和方向随时间正弦交变的脉动磁场，无固定旋转方向，不能自起动，必须借助机械换向器或起动电容裂相',
    isSelfStarting: false,
    phaseDifferenceDegrees: 0,
  },
  threePhase: {
    name: '三相交流旋转磁场',
    type: 'ROTATING',
    description: '三相对称绕组在空间互差120°，通入对称三相交流电后合成产生恒定幅值、连续旋转的空间旋转磁场，无需机械换向器即可自然带动转子旋转',
    isRotating: true,
    isSelfStarting: true,
    phaseDifferenceDegrees: 120,
  },
};
