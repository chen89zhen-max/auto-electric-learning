/**
 * 汽车电工电子课程 28个任务专属硬件器材与测量原理图元数据
 */

export interface LevelHardwareInfo {
  levelId: string;
  hardwareName: string;
  hardwareSpecs: string;
  hardwareCategory: '测量仪器' | '核心执行器' | '控制逻辑' | '智能传感' | '电源配电';
  diagramTitle: string;
  trainingTargets: [string, string, string];
  circuitType: string;
  benchIllustrationType:
    | 'safety_kit'
    | 'multimeter_probe'
    | 'battery_12v'
    | 'ground_strap'
    | 'resistor_color'
    | 'current_meter'
    | 'ohm_regulator'
    | 'series_parallel'
    | 'kirchhoff_box'
    | 'power_bulb'
    | 'internal_res'
    | 'voltage_divider'
    | 'voltage_drop'
    | 'fault_matrix'
    | 'delivery_terminal'
    | 'car_relay'
    | 'dc_motor'
    | 'alternator'
    | 'inductance_coil'
    | 'transformer'
    | 'diode_module'
    | 'capacitor_pack'
    | 'bridge_rectifier'
    | 'transistor_drive'
    | 'logic_gates'
    | 'speed_sensor'
    | 'pcb_assembly'
    | 'vehicle_bench';
}

export const LEVEL_HARDWARE_REGISTRY: Record<string, LevelHardwareInfo> = {
  O00: {
    levelId: 'O00',
    hardwareName: '见习技师入职装备包 & 绝缘防护工具',
    hardwareSpecs: '1000V绝缘等级 · 符合工位三级防护规范',
    hardwareCategory: '电源配电',
    diagramTitle: '工位准入规范与安全防护穿戴拓扑',
    circuitType: '车间作业准入规程',
    trainingTargets: ['规范穿戴劳保与绝缘用品', '掌握工单领用与工位自检', '熟悉车间三级安全防护'],
    benchIllustrationType: 'safety_kit',
  },
  O01: {
    levelId: 'O01',
    hardwareName: '电气火灾与绝缘耐压应急测试仪',
    hardwareSpecs: '高压验电笔 · 二氧化碳灭火隔离模拟台',
    hardwareCategory: '电源配电',
    diagramTitle: '触电断电隔离与现场紧急救护规程',
    circuitType: '电气火灾与应急处置',
    trainingTargets: ['精准识别触电与短路起火', '熟练执行断电隔离五步法', '掌握现场应急救护决策'],
    benchIllustrationType: 'safety_kit',
  },
  A01: {
    levelId: 'A01',
    hardwareName: '12V铅酸蓄电池与车身单线制回路板',
    hardwareSpecs: '额定12V / 容量60Ah · 车身搭铁单线回路',
    hardwareCategory: '电源配电',
    diagramTitle: '12V蓄电池-车身搭铁-车灯闭合回路',
    circuitType: '汽车基本回路',
    trainingTargets: ['认识汽车单线制搭铁原理', '掌握带保险回路闭合通电', '理解负载工作与接地回归'],
    benchIllustrationType: 'battery_12v',
  },
  A02: {
    levelId: 'A02',
    hardwareName: '数字万用表 (VC890D) & 虚拟车身搭铁台',
    hardwareSpecs: 'CAT III 600V · 20V/200V直流电压测量档',
    hardwareCategory: '测量仪器',
    diagramTitle: '车身搭铁压降测量与万用表接线图',
    circuitType: '搭铁电阻与电位差',
    trainingTargets: ['掌握万用表直流电压档规范', '精准测量车身各搭铁点电位', '判断搭铁不良与锈蚀压降'],
    benchIllustrationType: 'multimeter_probe',
  },
  A03: {
    levelId: 'A03',
    hardwareName: '4色环/5色环精密电阻箱 & 测阻探针',
    hardwareSpecs: '阻值范围 1Ω~100kΩ · 精度±1%色标识别',
    hardwareCategory: '测量仪器',
    diagramTitle: '色环电阻读数与数字万用表阻值校准',
    circuitType: '元件识别与测阻',
    trainingTargets: ['快速识读四色环与五色环标称值', '使用电阻档准确测量元件阻值', '判断电阻虚焊与阻值漂移'],
    benchIllustrationType: 'resistor_color',
  },
  A04: {
    levelId: 'A04',
    hardwareName: '直流电流表 (20A分流器) & 串联测量线束',
    hardwareSpecs: '0~20A 直流量程 · 熔断丝保护插口',
    hardwareCategory: '测量仪器',
    diagramTitle: '电流表正确串联接入闭合回路示意图',
    circuitType: '回路电流测量',
    trainingTargets: ['掌握电流表串联断路接入法', '严禁电流表并联防止短路事故', '测量不同负载下的真实工作电流'],
    benchIllustrationType: 'current_meter',
  },
  B01: {
    levelId: 'B01',
    hardwareName: '台式可调直流稳压电源 (0~30V 5A)',
    hardwareSpecs: '双路可调 · 纹波<1mV · 恒压/恒流自动切换',
    hardwareCategory: '电源配电',
    diagramTitle: '部分电路欧姆定律 U-I 特性测试接线',
    circuitType: '欧姆定律特性验证',
    trainingTargets: ['调节端电压验证电流随电压变化', '绘制阻性负载伏安特性曲线', '掌握欧姆定律公式工程换算'],
    benchIllustrationType: 'ohm_regulator',
  },
  B02: {
    levelId: 'B02',
    hardwareName: '双灯泡负载实验箱 (串联/并联切换器)',
    hardwareSpecs: '12V/21W 汽车刹车灯泡 × 2 · 刀闸开关组',
    hardwareCategory: '核心执行器',
    diagramTitle: '车灯串联与并联工作状态及分压对比',
    circuitType: '负载连接方式',
    trainingTargets: ['搭建串联电路并观察亮度衰减', '搭建并联电路并分析独立供电', '测量串并联总阻抗与支路电流'],
    benchIllustrationType: 'series_parallel',
  },
  B03: {
    levelId: 'B03',
    hardwareName: '多支路基尔霍夫定律网络测试模块',
    hardwareSpecs: '3节点 4网孔 · 带自恢复过载保护',
    hardwareCategory: '控制逻辑',
    diagramTitle: '基尔霍夫电流KCL与电压KVL节点网络',
    circuitType: '复杂网络分析',
    trainingTargets: ['验证流入节点电流等于流出电流', '测量闭合回路各段电位代数和', '分析汽车多支路共电源配电'],
    benchIllustrationType: 'kirchhoff_box',
  },
  B04: {
    levelId: 'B04',
    hardwareName: '功率分析仪与热敏负载监控单元',
    hardwareSpecs: '量程 0~300W · 测温范围 -20~150℃',
    hardwareCategory: '测量仪器',
    diagramTitle: '电功率计算与电气线路热发热损耗计算',
    circuitType: '电能与焦耳定律',
    trainingTargets: ['计算 P=UI 电气设备消耗功率', '分析导线电阻引起的焦耳热损耗', '合理匹配保险丝与线束规格'],
    benchIllustrationType: 'power_bulb',
  },
  B05: {
    levelId: 'B05',
    hardwareName: '电源内阻实验箱 (含高精度内阻调节旋钮)',
    hardwareSpecs: '内阻调节范围 0.05Ω~5Ω · 带载电流 0~10A',
    hardwareCategory: '电源配电',
    diagramTitle: '闭合电路欧姆定律：E = U + Ir 测量回路',
    circuitType: '电源外特性与内阻',
    trainingTargets: ['测量电源电动势与带载端电压', '计算电源内阻对输出电压的影响', '解释起动机打火时大灯变暗现象'],
    benchIllustrationType: 'internal_res',
  },
  B06: {
    levelId: 'B06',
    hardwareName: '汽车传感器精密电位器分压模块',
    hardwareSpecs: '10kΩ 线性多圈精密电位器 · 0~5V输出',
    hardwareCategory: '智能传感',
    diagramTitle: '电位器分压原理与ECU输入电压调理',
    circuitType: '分压电路设计',
    trainingTargets: ['掌握滑动变阻器分压输出规律', '模拟节气门位置传感器电压输出', '调试分压网络匹配控制芯片阈值'],
    benchIllustrationType: 'voltage_divider',
  },
  C01: {
    levelId: 'C01',
    hardwareName: '针床式汽车线束压降测试仪',
    hardwareSpecs: '毫伏级分辨率 · 4线制开尔文带载夹具',
    hardwareCategory: '测量仪器',
    diagramTitle: '闭合通电状态下电源端与搭铁端压降测量',
    circuitType: '带载压降诊断',
    trainingTargets: ['掌握带载状态下压降测量规范', '判断正极线路接触电阻虚接故障', '判断负极搭铁不良导致的压降过大'],
    benchIllustrationType: 'voltage_drop',
  },
  C02: {
    levelId: 'C02',
    hardwareName: '智能电气故障模拟与诊断实训台',
    hardwareSpecs: '集成断路、短路、虚接、异态四种典型故障',
    hardwareCategory: '控制逻辑',
    diagramTitle: '汽车典型电气故障四类现象分类诊断流',
    circuitType: '故障分类假设验证',
    trainingTargets: ['根据仪表与灯光症状分类故障', '使用排除法建立最小可疑故障域', '避免盲目更换配件的科学维修思维'],
    benchIllustrationType: 'fault_matrix',
  },
  C03: {
    levelId: 'C03',
    hardwareName: '全功能排故验证与出厂交车质检台',
    hardwareSpecs: '符合主机厂交车标准 · 包含DTC读取与清码',
    hardwareCategory: '控制逻辑',
    diagramTitle: '独立诊断闭环排故与修复后功能复检',
    circuitType: '闭环排故交车',
    trainingTargets: ['独立完成故障排查与线束修复', '使用万用表复检电气参数恢复正常', '填写规范实训工单交付车辆'],
    benchIllustrationType: 'delivery_terminal',
  },
  D01: {
    levelId: 'D01',
    hardwareName: '汽车 5 脚常开常闭继电器 (JD1914)',
    hardwareSpecs: '线圈阻值 80Ω · 触点容量 12V 40A',
    hardwareCategory: '核心执行器',
    diagramTitle: '85/86控制线圈与30/87主触点受控导通',
    circuitType: '继电器小电流控大电流',
    trainingTargets: ['识别继电器85、86、30、87、87a引脚', '用小电流开关控制高功率喇叭/车灯', '测量线圈电磁吸合与触点导通压降'],
    benchIllustrationType: 'car_relay',
  },
  D02: {
    levelId: 'D02',
    hardwareName: '永磁式小型直流电动机教学解剖台',
    hardwareSpecs: '额定12V 25W · 双向换向电刷与电枢转子',
    hardwareCategory: '核心执行器',
    diagramTitle: '左手定则磁场安培力与电刷换向原理',
    circuitType: '直流电机驱动',
    trainingTargets: ['掌握通电导线在磁场中的受力方向', '理解机械电刷在电机旋转中的换向', '实现电机正反转与调速控制回路'],
    benchIllustrationType: 'dc_motor',
  },
  D03: {
    levelId: 'D03',
    hardwareName: '汽车三相交流发电机解剖与转子试验台',
    hardwareSpecs: '转子励磁线圈 · 三相定子绕组 · 6管整流桥',
    hardwareCategory: '核心执行器',
    diagramTitle: '电磁感应定律：旋转磁场切割定子产生交流电',
    circuitType: '交流发电与励磁控制',
    trainingTargets: ['掌握动生感应电动势方向判定', '理解励磁电流大小对输出电压调节', '分析三相定子绕组与二极管整流'],
    benchIllustrationType: 'alternator',
  },
  D04: {
    levelId: 'D04',
    hardwareName: '点火线圈与自感互感高压发生模块',
    hardwareSpecs: '初级线圈 0.5Ω · 次级线圈 10kΩ · 变比1:100',
    hardwareCategory: '核心执行器',
    diagramTitle: '初级断电自感脉冲与次级万伏互感高压',
    circuitType: '电感储能与互感升压',
    trainingTargets: ['理解楞次定律在电感阻碍电流变化中的应用', '掌握初级线圈快速断电产生高压脉冲', '分析点火线圈击穿火花塞工作原理'],
    benchIllustrationType: 'inductance_coil',
  },
  D05: {
    levelId: 'D05',
    hardwareName: '车载隔离型升降压变压器实训箱',
    hardwareSpecs: '输入交流 12V · 输出 24V/6V · 效率>92%',
    hardwareCategory: '电源配电',
    diagramTitle: '变压器电压比 U1/U2 = N1/N2 原理接线',
    circuitType: '电磁耦合与变压变流',
    trainingTargets: ['掌握理想变压器变比与功率守恒', '理解车载逆变器中高频变压器应用', '测试不同负载下次级端电压波动'],
    benchIllustrationType: 'transformer',
  },
  E01: {
    levelId: 'E01',
    hardwareName: '汽车级硅整流二极管 (1N5408) & 稳压管',
    hardwareSpecs: '耐压 1000V · 额定电流 3A · 导通压降 0.7V',
    hardwareCategory: '智能传感',
    diagramTitle: '二极管单向导电性与PN结反向截止特性',
    circuitType: '半导体开关与稳压',
    trainingTargets: ['使用万用表二极管档判断极性与好坏', '测量正向导通阈值电压与反向漏电流', '分析汽车防反接保护二极管应用'],
    benchIllustrationType: 'diode_module',
  },
  E02: {
    levelId: 'E02',
    hardwareName: '大容量电解电容与贴片钽电容组',
    hardwareSpecs: '4700μF / 25V · 低ESR · 充放电时序测试',
    hardwareCategory: '智能传感',
    diagramTitle: '电容器充放电RC时间常数测试接线图',
    circuitType: '电容滤波与延时',
    trainingTargets: ['理解电容存储电荷与隔直通交特性', '测量RC回路时间常数τ=RC', '掌握电源纹波滤波电容的平波作用'],
    benchIllustrationType: 'capacitor_pack',
  },
  E03: {
    levelId: 'E03',
    hardwareName: '桥式整流滤波电路演示箱 & 双踪示波器',
    hardwareSpecs: '全桥整流堆 · 示波器测量交流转平滑直流',
    hardwareCategory: '智能传感',
    diagramTitle: '正弦交流输入经全桥整流与电容滤波波形',
    circuitType: '整流滤波稳压系统',
    trainingTargets: ['搭建单相桥式整流完整回路', '用示波器观测半波与全波整流波形', '分析滤波电容对输出纹波系数的影响'],
    benchIllustrationType: 'bridge_rectifier',
  },
  E04: {
    levelId: 'E04',
    hardwareName: 'NPN/PNP 功率三极管 (TIP122) 驱动套件',
    hardwareSpecs: '达林顿管 · Vceo 100V · 放大倍数 β>1000',
    hardwareCategory: '智能传感',
    diagramTitle: '三极管截止、线性放大与饱和导通三态',
    circuitType: '半导体开关驱动',
    trainingTargets: ['识别基极B、集电极C、发射极E引脚', '用微安级基极信号控制安培级负载通断', '模拟ECU低边功率驱动芯片输出原理'],
    benchIllustrationType: 'transistor_drive',
  },
  E05: {
    levelId: 'E05',
    hardwareName: '车门防夹与照明逻辑门电路集成芯片',
    hardwareSpecs: '74HC08 (与门) · 74HC32 (或门) · 74HC04 (非门)',
    hardwareCategory: '控制逻辑',
    diagramTitle: '门灯开启条件与防盗报警组合逻辑真值表',
    circuitType: '数字逻辑与门控',
    trainingTargets: ['掌握与、或、非基本逻辑门运算规律', '根据真值表设计车门警报输入逻辑', '使用逻辑笔排查数字控制信号电平'],
    benchIllustrationType: 'logic_gates',
  },
  E06: {
    levelId: 'E06',
    hardwareName: '霍尔式与磁电式车轮转速传感器',
    hardwareSpecs: '带60-2齿圈信号轮 · 频率 0~5kHz 方波/正弦波',
    hardwareCategory: '智能传感',
    diagramTitle: '传感器齿轮旋转产生交变脉冲送入ECU',
    circuitType: '汽车转速与位置传感',
    trainingTargets: ['对比磁电式无源传感与霍尔式有源传感差异', '测量霍尔传感器供电、搭铁与方波信号', '排查传感器气隙不当引起的ABS轮速丢失'],
    benchIllustrationType: 'speed_sensor',
  },
  E07: {
    levelId: 'E07',
    hardwareName: '汽车智能控制模块 PCB 板级焊接套件',
    hardwareSpecs: 'FR-4 阻燃双面板 · 恒温烙铁与防静电工位',
    hardwareCategory: '控制逻辑',
    diagramTitle: 'SMD/PTH 元器件焊接装配工艺与全检规范',
    circuitType: '电装工艺与板级系统',
    trainingTargets: ['掌握电子元器件焊接装配规范', '完成板级上电自检与静态信号测量', '严格遵循教师评分表执行工艺验收'],
    benchIllustrationType: 'pcb_assembly',
  },
  F01: {
    levelId: 'F01',
    hardwareName: '整车综合电气排故与出厂下线实训总台 (建设中)',
    hardwareSpecs: '全车线束 200+ 节点 · 智能故障设置考核箱',
    hardwareCategory: '控制逻辑',
    diagramTitle: '整车电气拓扑网络与系统级终极交付验收',
    circuitType: '综合工单交付',
    trainingTargets: ['综合运用前序七章全部电工电子知识', '排查跨系统复杂复合电气故障', '完成出厂质量安全检测工单验收'],
    benchIllustrationType: 'vehicle_bench',
  },
};

export function getLevelHardwareInfo(levelId: string): LevelHardwareInfo {
  return (
    LEVEL_HARDWARE_REGISTRY[levelId] || {
      levelId,
      hardwareName: '通用汽车电工实训仪器设备',
      hardwareSpecs: '12V直流教学系统规范',
      hardwareCategory: '测量仪器',
      diagramTitle: '汽车电气实训标准化检测接线图',
      circuitType: '标准教学回路',
      trainingTargets: ['遵循汽车电工安全作业规范', '准确使用测量仪器采集数据', '严格执行工单要求闭环交付'],
      benchIllustrationType: 'multimeter_probe',
    }
  );
}
