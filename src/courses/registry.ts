import type { LevelId } from '@/src/types/progress';

export type ChapterId =
  | 'chapter_o'  // 序章：来到实训中心
  | 'chapter_a'  // 篇章一：把电路看明白
  | 'chapter_b'  // 篇章二：让电路按要求工作
  | 'chapter_c'  // 篇章三：凭证据找故障
  | 'chapter_d'  // 篇章四：让电和磁配合工作
  | 'chapter_e'  // 篇章五：让电路感知、判断和执行
  | 'chapter_f'; // 篇章六：完成综合交付

export type PublicationStatus = 'PUBLISHED' | 'UNDER_CONSTRUCTION';

export interface ChapterDefinition {
  id: ChapterId;
  num: string;
  title: string;
  description: string;
}

export const CHAPTER_LIST: ChapterDefinition[] = [
  {
    id: 'chapter_o',
    num: '序章',
    title: '来到实训中心',
    description: '熟悉工单、对象和求助；安全准入与应急判断',
  },
  {
    id: 'chapter_a',
    num: '篇章一',
    title: '把电路看明白',
    description: '接线、测量、寻找差异；掌握闭合回路与基本测量',
  },
  {
    id: 'chapter_b',
    num: '篇章二',
    title: '让电路按要求工作',
    description: '控制变量实验、改装要求；欧姆定律与功率预算',
  },
  {
    id: 'chapter_c',
    num: '篇章三',
    title: '凭证据找故障',
    description: '提出假设、压降分析、非破坏排查与交车闭环',
  },
  {
    id: 'chapter_d',
    num: '篇章四',
    title: '让电和磁配合工作',
    description: '继电器控制、电动机受力换向与电磁感应',
  },
  {
    id: 'chapter_e',
    num: '篇章五',
    title: '让电路感知、判断和执行',
    description: '电子器件、整流滤波、逻辑控制与板级装配工艺',
  },
  {
    id: 'chapter_f',
    num: '篇章六',
    title: '完成综合交付',
    description: '综合工单承接、系统联调、故障排除与能力答辩',
  },
];

export interface CourseLevelDefinition {
  canonicalId: string;
  legacyId?: LevelId;
  chapterId: ChapterId;
  chapterTitle: string;
  num: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  duration: string;
  textbookTask: string;
  objectiveIds: string[];
  prerequisiteLevelIds: string[];
  prerequisiteCapabilities: string[];
  requiredModels: string[];
  publicationStatus: PublicationStatus;
  contentVersion: string;
  rubricVersion: string;
  implemented: boolean;
}

export const CANONICAL_COURSE_REGISTRY: CourseLevelDefinition[] = [
  // --- 序章：来到实训中心 ---
  {
    canonicalId: 'O00',
    legacyId: 'LEVEL_00',
    chapterId: 'chapter_o',
    chapterTitle: '序章：来到实训中心',
    num: '00',
    title: '维修中心第一天',
    subtitle: '车间准入与安全规范',
    description: '见习技师入职安全准入教育、工位操作规范与工单签署流程。',
    category: '基础准入',
    duration: '1 课时',
    textbookTask: '职业规范与入职安全培训',
    objectiveIds: ['T00-INTRO', 'T00-SAFETY-RULES', 'T00-WORKORDER'],
    prerequisiteLevelIds: [],
    prerequisiteCapabilities: [],
    requiredModels: ['workshop_scene'],
    publicationStatus: 'PUBLISHED',
    contentVersion: '1.0.0',
    rubricVersion: 'v1',
    implemented: true,
  },
  {
    canonicalId: 'O01',
    legacyId: 'LEVEL_01',
    chapterId: 'chapter_o',
    chapterTitle: '序章：来到实训中心',
    num: '01',
    title: '安全作业与应急判断',
    subtitle: '安全用电与应急处置',
    description: '识别触电隐患、电气火灾应急处置、断电隔离规范与心肺复苏模拟。',
    category: '安全作业',
    duration: '2 课时',
    textbookTask: '学习任务1 用电安全 (15页)',
    objectiveIds: ['T01-RISK-IDENT', 'T01-POWER-ISOLATE', 'T01-FIRSTAID-DECISION', 'T01-FIRE-DECISION'],
    prerequisiteLevelIds: ['O00'],
    prerequisiteCapabilities: ['T00-INTRO'],
    requiredModels: ['shock_risk_model', 'fire_decision_model'],
    publicationStatus: 'PUBLISHED',
    contentVersion: '1.0.0',
    rubricVersion: 'v1',
    implemented: true,
  },

  // --- 篇章一：把电路看明白 ---
  {
    canonicalId: 'A01',
    legacyId: 'LEVEL_02',
    chapterId: 'chapter_a',
    chapterTitle: '篇章一：把电路看明白',
    num: '02',
    title: '点亮检修灯',
    subtitle: '电路的认知与车身搭铁',
    description: '认识电源、负载、开关与熔断器，掌握双线闭合回路与汽车单线车身搭铁。',
    category: '基本回路',
    duration: '2 课时',
    textbookTask: '学习任务2 电路的认知 (6页)',
    objectiveIds: ['T02-LOOP-CLOSED', 'T02-GROUND-RETURN', 'T02-SCHEMATIC-SYMBOL'],
    prerequisiteLevelIds: ['O01'],
    prerequisiteCapabilities: ['T01-POWER-ISOLATE'],
    requiredModels: ['dc_topology_basic'],
    publicationStatus: 'PUBLISHED',
    contentVersion: '1.0.0',
    rubricVersion: 'v1',
    implemented: true,
  },
  {
    canonicalId: 'A02',
    chapterId: 'chapter_a',
    chapterTitle: '篇章一：把电路看明白',
    num: 'A02',
    title: '给电路做体检',
    subtitle: '电压分析与测量',
    description: '数字万用表电压挡、COM/VΩ插孔选用，两点电压测量与参考点改变规律。',
    category: '测量仪表',
    duration: '2 课时',
    textbookTask: '学习任务4 电压和电流的分析与测量 (18页)',
    objectiveIds: ['T04-VOLT-MEASURE', 'T04-POTENTIAL-REF'],
    prerequisiteLevelIds: ['A01'],
    prerequisiteCapabilities: ['T02-LOOP-CLOSED'],
    requiredModels: ['multimeter_dmm_v', 'dc_circuit_solver'],
    publicationStatus: 'PUBLISHED',
    contentVersion: '1.0.0',
    rubricVersion: 'v1',
    implemented: true,
  },
  {
    canonicalId: 'A03',
    legacyId: 'LEVEL_03',
    chapterId: 'chapter_a',
    chapterTitle: '篇章一：把电路看明白',
    num: 'A03',
    title: '元件身份核验',
    subtitle: '电阻识别与测量',
    description: '色环与标称公差识读，断电隔离后测阻，电位器三个位置阻值测定与敏感元件。',
    category: '元器件与传感器',
    duration: '2 课时',
    textbookTask: '学习任务3 电阻的识别和测量 (14页)',
    objectiveIds: ['T03-RES-CODE', 'T03-RES-MEASURE', 'T03-POTENTIOMETER'],
    prerequisiteLevelIds: ['A02'],
    prerequisiteCapabilities: ['T04-VOLT-MEASURE'],
    requiredModels: ['multimeter_dmm_ohm', 'resistor_color_code'],
    publicationStatus: 'PUBLISHED',
    contentVersion: '1.0.0',
    rubricVersion: 'v1',
    implemented: true,
  },
  {
    canonicalId: 'A04',
    legacyId: 'LEVEL_04',
    chapterId: 'chapter_a',
    chapterTitle: '篇章一：把电路看明白',
    num: 'A04',
    title: '电流到底走哪里',
    subtitle: '电流分析与测量',
    description: '电流挡串入测量、安全防短路规则、钳形电流表非接触测量与废电池归集。',
    category: '测量仪表',
    duration: '2 课时',
    textbookTask: '学习任务4 电压和电流的分析与测量 (18页)',
    objectiveIds: ['T04-CURR-SERIES', 'T04-CLAMP-METER', 'T04-BATTERY-SAFETY'],
    prerequisiteLevelIds: ['A02'],
    prerequisiteCapabilities: ['T04-VOLT-MEASURE'],
    requiredModels: ['multimeter_dmm_a', 'clamp_meter_model'],
    publicationStatus: 'PUBLISHED',
    contentVersion: '1.0.0',
    rubricVersion: 'v1',
    implemented: true,
  },

  // --- 篇章二：让电路按要求工作 ---
  {
    canonicalId: 'B01',
    chapterId: 'chapter_b',
    chapterTitle: '篇章二：让电路按要求工作',
    num: 'B01',
    title: '找出变化规律',
    subtitle: '欧姆定律应用',
    description: '控制变量实验，验证U/I/R比例关系，未知电阻与电流定量预测与验证。',
    category: '电路定律',
    duration: '2 课时',
    textbookTask: '学习任务5 欧姆定律的应用 (8页)',
    objectiveIds: ['T05-OHM-LAW', 'T05-DATA-PLOT'],
    prerequisiteLevelIds: ['A03', 'A04'],
    prerequisiteCapabilities: ['T03-RES-MEASURE', 'T04-CURR-SERIES'],
    requiredModels: ['dc_ohm_solver'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'B02',
    chapterId: 'chapter_b',
    chapterTitle: '篇章二：让电路按要求工作',
    num: 'B02',
    title: '灯组改装',
    subtitle: '负载的连接',
    description: '串联、并联与混联接法，汽车灯组改装特点与等效电阻计算。',
    category: '负载连接',
    duration: '2 课时',
    textbookTask: '学习任务6 负载的连接 (16页)',
    objectiveIds: ['T06-SERIES-PARALLEL', 'T06-AUTO-LIGHTS'],
    prerequisiteLevelIds: ['B01'],
    prerequisiteCapabilities: ['T05-OHM-LAW'],
    requiredModels: ['dc_network_solver'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'B03',
    chapterId: 'chapter_b',
    chapterTitle: '篇章二：让电路按要求工作',
    num: 'B03',
    title: '追踪节点与回路',
    subtitle: 'KCL与KVL定律',
    description: '节点电流定律与回路电压定律测量验证，识别并联支路电流变化。',
    category: '电路定律',
    duration: '2 课时',
    textbookTask: '学习任务4/6 (18/16页)',
    objectiveIds: ['T04-KCL-KVL', 'T06-LOOP-ANALYSIS'],
    prerequisiteLevelIds: ['B02'],
    prerequisiteCapabilities: ['T06-SERIES-PARALLEL'],
    requiredModels: ['dc_kcl_kvl_solver'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'B04',
    chapterId: 'chapter_b',
    chapterTitle: '篇章二：让电路按要求工作',
    num: 'B04',
    title: '工位用电预算',
    subtitle: '电能与电功率分析',
    description: '额定功率与实际功率区分、用电量与电费预算、焦耳热与过载风险分析。',
    category: '能量与功率',
    duration: '2 课时',
    textbookTask: '学习任务7 电能和电功率的分析 (9页)',
    objectiveIds: ['T07-POWER-RATING', 'T07-ENERGY-BUDGET', 'T07-JOULE-HEAT'],
    prerequisiteLevelIds: ['B03'],
    prerequisiteCapabilities: ['T04-KCL-KVL'],
    requiredModels: ['dc_power_model'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'B05',
    chapterId: 'chapter_b',
    chapterTitle: '篇章二：让电路按要求工作',
    num: 'B05',
    title: '电源为什么带不动',
    subtitle: '全电路欧姆定律与内阻',
    description: '全电路欧姆定律，比较空载与带载端电压，电源内阻压降对系统性能的影响。',
    category: '电路定律',
    duration: '2 课时',
    textbookTask: '学习任务5 欧姆定律的应用 (8页)',
    objectiveIds: ['T05-INTERNAL-RESISTANCE', 'T05-TERMINAL-VOLTAGE'],
    prerequisiteLevelIds: ['B04'],
    prerequisiteCapabilities: ['T07-POWER-RATING'],
    requiredModels: ['dc_source_internal_r'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'B06',
    chapterId: 'chapter_b',
    chapterTitle: '篇章二：让电路按要求工作',
    num: 'B06',
    title: '传感器信号与分压',
    subtitle: '分压电路与传感器',
    description: '分压电路带载效应观察，热敏/光敏传感器分压信号输出与仪表扩程模型。',
    category: '元器件与传感器',
    duration: '2 课时',
    textbookTask: '学习任务6 负载的连接 (16页)',
    objectiveIds: ['T06-VOLTAGE-DIVIDER', 'T06-SENSOR-DIVIDER'],
    prerequisiteLevelIds: ['B05'],
    prerequisiteCapabilities: ['T05-INTERNAL-RESISTANCE'],
    requiredModels: ['dc_divider_loaded'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },

  // --- 篇章三：凭证据找故障 ---
  {
    canonicalId: 'C01',
    chapterId: 'chapter_c',
    chapterTitle: '篇章三：凭证据找故障',
    num: 'C01',
    title: '越来越暗的灯',
    subtitle: '电压降分析与虚接诊断',
    description: '带载压降诊断方法，测量供电侧与搭铁侧压降，区分接触高阻与负载故障。',
    category: '电路诊断',
    duration: '2 课时',
    textbookTask: '学习任务8 电压降的分析 (9页)',
    objectiveIds: ['T08-VOLTAGE-DROP', 'T08-LOADED-TEST'],
    prerequisiteLevelIds: ['B05'],
    prerequisiteCapabilities: ['T05-INTERNAL-RESISTANCE'],
    requiredModels: ['voltage_drop_diagnostic'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'C02',
    legacyId: 'LEVEL_08',
    chapterId: 'chapter_c',
    chapterTitle: '篇章三：凭证据找故障',
    num: 'C02',
    title: '同样不亮，原因不同',
    subtitle: '电路断路与短路综合排查',
    description: '断路、高阻、短路三类典型故障排查，运用试灯与万用表建立证据链。',
    category: '电路诊断',
    duration: '2 课时',
    textbookTask: '学习任务9 电路的检查 (9页)',
    objectiveIds: ['T09-FAULT-CLASSIFY', 'T09-TEST-LAMP-DMM'],
    prerequisiteLevelIds: ['C01'],
    prerequisiteCapabilities: ['T08-VOLTAGE-DROP'],
    requiredModels: ['fault_seed_generator'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'C03',
    legacyId: 'LEVEL_09',
    chapterId: 'chapter_c',
    chapterTitle: '篇章三：凭证据找故障',
    num: 'C03',
    title: '第一次独立交车',
    subtitle: '综合直流诊断与修复复检',
    description: '承接独立实训工单，自主制定诊断策略，安全修复并完成功能复检与答辩。',
    category: '综合诊断',
    duration: '3 课时',
    textbookTask: '学习任务9 电路的检查 (9页)',
    objectiveIds: ['T09-INDEPENDENT-DELIVERY', 'T09-VERIFY-REPAIR'],
    prerequisiteLevelIds: ['C02'],
    prerequisiteCapabilities: ['T09-FAULT-CLASSIFY'],
    requiredModels: ['comprehensive_dc_diagnostic'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },

  // --- 篇章四：让电和磁配合工作 ---
  {
    canonicalId: 'D01',
    legacyId: 'LEVEL_05',
    chapterId: 'chapter_d',
    chapterTitle: '篇章四：让电和磁配合工作',
    num: 'D01',
    title: '小开关控制工作灯',
    subtitle: '继电器与电磁控制',
    description: '电磁铁磁场方向、四脚/五脚汽车继电器引脚定义，控制与负载回路分离。',
    category: '控制与配电',
    duration: '2 课时',
    textbookTask: '学习任务11 磁现象的探究 (11页)',
    objectiveIds: ['T11-MAGNETIC-FIELD', 'T11-RELAY-CONTROL'],
    prerequisiteLevelIds: ['B04'],
    prerequisiteCapabilities: ['T07-POWER-RATING'],
    requiredModels: ['relay_electromagnetic_model'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'D02',
    chapterId: 'chapter_d',
    chapterTitle: '篇章四：让电和磁配合工作',
    num: 'D02',
    title: '让电机转起来',
    subtitle: '直流电动机认知',
    description: '通电导体在磁场中受力、左手定则、直流电动机换向器作用与起动机结构认知。',
    category: '电机驱动',
    duration: '2 课时',
    textbookTask: '学习任务12 电动机的认知 (16页)',
    objectiveIds: ['T12-MOTOR-FORCE', 'T12-DC-MOTOR-COMMUTATOR'],
    prerequisiteLevelIds: ['D01'],
    prerequisiteCapabilities: ['T11-RELAY-CONTROL'],
    requiredModels: ['dc_motor_lorentz_model'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'D03',
    chapterId: 'chapter_d',
    chapterTitle: '篇章四：让电和磁配合工作',
    num: 'D03',
    title: '转动为什么能发电',
    subtitle: '电磁感应与交流发电机',
    description: '电磁感应与楞次定律、交流电正弦波形基本概念、汽车交流发电机结构认知。',
    category: '电磁感应',
    duration: '2 课时',
    textbookTask: '学习任务13 交流发电机的认知 (29页)',
    objectiveIds: ['T13-FARADAY-LENZ', 'T13-AC-ALTERNATOR-BASE'],
    prerequisiteLevelIds: ['D02'],
    prerequisiteCapabilities: ['T12-MOTOR-FORCE'],
    requiredModels: ['alternator_induction_model'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'D04',
    chapterId: 'chapter_d',
    chapterTitle: '篇章四：让电和磁配合工作',
    num: 'D04',
    title: '断开开关后的现象',
    subtitle: '自感与互感分析',
    description: '自感反电动势、互感现象及汽车点火线圈高压产生原理解释。',
    category: '电磁感应',
    duration: '2 课时',
    textbookTask: '学习任务14 自感与互感现象的分析 (15页)',
    objectiveIds: ['T14-SELF-INDUCTANCE', 'T14-MUTUAL-IGNITION'],
    prerequisiteLevelIds: ['D03'],
    prerequisiteCapabilities: ['T13-FARADAY-LENZ'],
    requiredModels: ['inductance_transient_model'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'D05',
    chapterId: 'chapter_d',
    chapterTitle: '篇章四：让电和磁配合工作',
    num: 'D05',
    title: '变压器实验室',
    subtitle: '变压器认知与测试',
    description: '单相变压器变压比、变流比、同名端及绕组阻抗检测实验（星号选学）。',
    category: '电磁感应',
    duration: '2 课时',
    textbookTask: '学习任务19 变压器的认知 (13页, 选学)',
    objectiveIds: ['T19-TRANSFORMER-RATIO', 'T19-WINDING-TEST'],
    prerequisiteLevelIds: ['D04'],
    prerequisiteCapabilities: ['T14-MUTUAL-IGNITION'],
    requiredModels: ['transformer_ac_model'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },

  // --- 篇章五：让电路感知、判断和执行 ---
  {
    canonicalId: 'E01',
    chapterId: 'chapter_e',
    chapterTitle: '篇章五：让电路感知、判断和执行',
    num: 'E01',
    title: '电流的单向通道',
    subtitle: '二极管及其应用',
    description: '二极管单向导电特性、正反向电阻万用表检测、稳压二极管与LED应用。',
    category: '电子器件',
    duration: '2 课时',
    textbookTask: '学习任务15 二极管及其应用的分析 (17页)',
    objectiveIds: ['T15-DIODE-PN', 'T15-DIODE-TEST', 'T15-ZENER-LED'],
    prerequisiteLevelIds: ['B04'],
    prerequisiteCapabilities: ['T07-POWER-RATING'],
    requiredModels: ['diode_piecewise_model'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'E02',
    chapterId: 'chapter_e',
    chapterTitle: '篇章五：让电路感知、判断和执行',
    num: 'E02',
    title: '断电后为何还有电',
    subtitle: '电容器及其特性',
    description: '电容器储能、RC充放电曲线时间常数、电容极性与万用表充放电估测。',
    category: '电子器件',
    duration: '2 课时',
    textbookTask: '学习任务10 电容器及其特性的分析 (13页)',
    objectiveIds: ['T10-CAP-CHARGE', 'T10-RC-TIME-CONSTANT', 'T10-CAP-TEST'],
    prerequisiteLevelIds: ['A03', 'B01'],
    prerequisiteCapabilities: ['T03-RES-MEASURE', 'T05-OHM-LAW'],
    requiredModels: ['capacitor_rc_transient'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'E03',
    chapterId: 'chapter_e',
    chapterTitle: '篇章五：让电路感知、判断和执行',
    num: 'E03',
    title: '从交流到直流',
    subtitle: '整流滤波电路',
    description: '单相半波与桥式整流电路连接分析、电容滤波平滑波形与发电机整流器。',
    category: '电子器件',
    duration: '2 课时',
    textbookTask: '学习任务15/10/13',
    objectiveIds: ['T15-BRIDGE-RECTIFIER', 'T10-FILTER-SMOOTH', 'T13-RECTIFIER-PACK'],
    prerequisiteLevelIds: ['D03', 'E01', 'E02'],
    prerequisiteCapabilities: ['T13-FARADAY-LENZ', 'T15-DIODE-PN', 'T10-CAP-CHARGE'],
    requiredModels: ['rectifier_filter_model'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'E04',
    legacyId: 'LEVEL_07',
    chapterId: 'chapter_e',
    chapterTitle: '篇章五：让电路感知、判断和执行',
    num: 'E04',
    title: '小信号控制负载',
    subtitle: '三极管放大与开关',
    description: 'NPN/PNP三极管截止、放大与饱和三种工作状态，小信号驱动继电器实验。',
    category: '电子器件',
    duration: '2 课时',
    textbookTask: '学习任务16 三极管及其应用的分析 (8页)',
    objectiveIds: ['T16-BJT-STATES', 'T16-TRANSISTOR-SWITCH'],
    prerequisiteLevelIds: ['D01', 'E01', 'B06'],
    prerequisiteCapabilities: ['T11-RELAY-CONTROL', 'T15-DIODE-PN', 'T06-SENSOR-DIVIDER'],
    requiredModels: ['bjt_switch_amplifier'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'E05',
    legacyId: 'LEVEL_06',
    chapterId: 'chapter_e',
    chapterTitle: '篇章五：让电路感知、判断和执行',
    num: 'E05',
    title: '电路的条件判断',
    subtitle: '逻辑门电路认知',
    description: '与门、或门、非门基本逻辑真值表验证，安全带提醒与车门未关报警逻辑。',
    category: '逻辑控制',
    duration: '2 课时',
    textbookTask: '学习任务17 逻辑门电路的认知 (7页)',
    objectiveIds: ['T17-LOGIC-GATES', 'T17-AUTO-INTERLOCK'],
    prerequisiteLevelIds: ['A02', 'B02'],
    prerequisiteCapabilities: ['T04-VOLT-MEASURE', 'T06-SERIES-PARALLEL'],
    requiredModels: ['digital_logic_gates'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'E06',
    chapterId: 'chapter_e',
    chapterTitle: '篇章五：让电路感知、判断和执行',
    num: 'E06',
    title: '转速信号寻踪',
    subtitle: '转速传感器与信号调理',
    description: '磁电式与霍尔式转速传感器原理对比，信号波形观察与脉冲信号调理。',
    category: '元器件与传感器',
    duration: '2 课时',
    textbookTask: '学习任务13 交流发电机的认知 (29页)',
    objectiveIds: ['T13-MAGNETO-SPEED', 'T13-HALL-SENSOR'],
    prerequisiteLevelIds: ['D03', 'E05'],
    prerequisiteCapabilities: ['T13-FARADAY-LENZ', 'T17-LOGIC-GATES'],
    requiredModels: ['speed_sensor_pulse_model'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
  {
    canonicalId: 'E07',
    chapterId: 'chapter_e',
    chapterTitle: '篇章五：让电路感知、判断和执行',
    num: 'E07',
    title: '装配一块训练板',
    subtitle: 'PCB焊接工艺与检测',
    description: '电烙铁安全规程、插装工艺、虚焊桥连故障视觉与通断检测（实物由教师评定）。',
    category: '焊接与工艺',
    duration: '2 课时',
    textbookTask: '学习任务18 印制电路板的焊接 (10页)',
    objectiveIds: ['T18-SOLDERING-SAFETY', 'T18-PCB-ASSEMBLY', 'T18-SOLDER-INSPECT'],
    prerequisiteLevelIds: ['E01', 'E02', 'E04', 'E05'],
    prerequisiteCapabilities: ['T15-DIODE-PN', 'T10-CAP-CHARGE', 'T16-TRANSISTOR-SWITCH'],
    requiredModels: ['pcb_virtual_assembly'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },

  // --- 篇章六：完成综合交付 ---
  {
    canonicalId: 'F01',
    chapterId: 'chapter_f',
    chapterTitle: '篇章六：完成综合交付',
    num: 'F01',
    title: '实训中心交付挑战',
    subtitle: '综合工单与答辩',
    description: '承接低压控制板与灯光线束综合排故工单，形成完整测量闭环与答辩报告。',
    category: '综合交付',
    duration: '3 课时',
    textbookTask: '综合交付挑战 (T01~T18)',
    objectiveIds: ['F01-SAFETY-AUDIT', 'F01-FULL-DIAGNOSTIC', 'F01-EVIDENCE-DEFENSE'],
    prerequisiteLevelIds: ['C03', 'E03', 'E04', 'E05', 'E07'],
    prerequisiteCapabilities: ['T09-INDEPENDENT-DELIVERY'],
    requiredModels: ['integrated_workshop_vehicle'],
    publicationStatus: 'UNDER_CONSTRUCTION',
    contentVersion: '0.1.0',
    rubricVersion: 'v1',
    implemented: false,
  },
];

// Map legacy IDs to canonical IDs and vice versa
const LEGACY_TO_CANONICAL_MAP: Record<LevelId, string> = {
  LEVEL_00: 'O00',
  LEVEL_01: 'O01',
  LEVEL_02: 'A01',
  LEVEL_03: 'A03',
  LEVEL_04: 'A04',
  LEVEL_05: 'D01',
  LEVEL_06: 'E05',
  LEVEL_07: 'E04',
  LEVEL_08: 'C02',
  LEVEL_09: 'C03',
};

const CANONICAL_TO_LEGACY_MAP: Record<string, LevelId> = {
  O00: 'LEVEL_00',
  O01: 'LEVEL_01',
  A01: 'LEVEL_02',
  A03: 'LEVEL_03',
  A04: 'LEVEL_04',
  D01: 'LEVEL_05',
  E05: 'LEVEL_06',
  E04: 'LEVEL_07',
  C02: 'LEVEL_08',
  C03: 'LEVEL_09',
};

const REGISTRY_BY_CANONICAL = new Map<string, CourseLevelDefinition>(
  CANONICAL_COURSE_REGISTRY.map((level) => [level.canonicalId, level])
);

export function normalizeLevelId(levelId: string): string {
  const upper = levelId.trim().toUpperCase();
  if (upper in LEGACY_TO_CANONICAL_MAP) {
    return LEGACY_TO_CANONICAL_MAP[upper as LevelId];
  }
  return upper;
}

export function toLegacyLevelId(levelId: string): LevelId | null {
  const canonical = normalizeLevelId(levelId);
  return CANONICAL_TO_LEGACY_MAP[canonical] || null;
}

export function getCourseLevel(levelId: string): CourseLevelDefinition | undefined {
  const canonical = normalizeLevelId(levelId);
  return REGISTRY_BY_CANONICAL.get(canonical);
}

export function isLevelPublished(levelId: string): boolean {
  const meta = getCourseLevel(levelId);
  return meta?.publicationStatus === 'PUBLISHED';
}

export function checkLevelPrerequisites(
  levelId: string,
  completedLevelIds: string[]
): { allowed: boolean; missingPrerequisites: string[] } {
  const meta = getCourseLevel(levelId);
  if (!meta) {
    return { allowed: false, missingPrerequisites: ['未知关卡'] };
  }

  const completedNormalized = new Set(completedLevelIds.map(normalizeLevelId));
  const missingPrerequisites: string[] = [];

  for (const prereqId of meta.prerequisiteLevelIds) {
    const prereqCanonical = normalizeLevelId(prereqId);
    if (!completedNormalized.has(prereqCanonical)) {
      const prereqMeta = REGISTRY_BY_CANONICAL.get(prereqCanonical);
      missingPrerequisites.push(prereqMeta ? `${prereqMeta.num} ${prereqMeta.title}` : prereqCanonical);
    }
  }

  return {
    allowed: missingPrerequisites.length === 0,
    missingPrerequisites,
  };
}

export function getLevelsByChapter(): Array<{
  chapter: ChapterDefinition;
  levels: CourseLevelDefinition[];
}> {
  return CHAPTER_LIST.map((chapter) => ({
    chapter,
    levels: CANONICAL_COURSE_REGISTRY.filter((level) => level.chapterId === chapter.id),
  }));
}
