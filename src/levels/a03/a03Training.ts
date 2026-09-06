export type A03Step =
  | 'COLOR_CODE_CALC'
  | 'SAMPLE_MEASUREMENT'
  | 'POTENTIOMETER_TEST'
  | 'INDEPENDENT_EVAL'
  | 'TRANSFER_NTC';

export interface ColorBandInfo {
  name: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  value: number;
}

export interface StandardResistor {
  id: string;
  name: string;
  bands: [ColorBandInfo, ColorBandInfo, ColorBandInfo, ColorBandInfo];
  nominal: number;
  tolerance: number; // 5 or 10
  expectedMin: number;
  expectedMax: number;
  sampleAValue: number;
  sampleBValue: number;
}

export const STANDARD_RESISTOR_POOL: readonly StandardResistor[] = [
  {
    id: 'RES_220_G',
    name: '红·红·棕·金 (标称 220Ω ±5%)',
    bands: [
      { name: '红', color: '#dc2626', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', value: 2 },
      { name: '红', color: '#dc2626', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', value: 2 },
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '金', color: '#eab308', textColor: 'text-amber-800', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', value: 5 },
    ],
    nominal: 220,
    tolerance: 5,
    expectedMin: 209,
    expectedMax: 231,
    sampleAValue: 224.0,
    sampleBValue: 330.0,
  },
  {
    id: 'RES_330_S',
    name: '橙·橙·棕·银 (标称 330Ω ±10%)',
    bands: [
      { name: '橙', color: '#ea580c', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', value: 3 },
      { name: '橙', color: '#ea580c', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', value: 3 },
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '银', color: '#94a3b8', textColor: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 10 },
    ],
    nominal: 330,
    tolerance: 10,
    expectedMin: 297,
    expectedMax: 363,
    sampleAValue: 338.0,
    sampleBValue: 490.0,
  },
  {
    id: 'RES_100_G',
    name: '棕·黑·棕·金 (标称 100Ω ±5%)',
    bands: [
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '黑', color: '#0f172a', textColor: 'text-slate-800', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 0 },
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '金', color: '#eab308', textColor: 'text-amber-800', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', value: 5 },
    ],
    nominal: 100,
    tolerance: 5,
    expectedMin: 95,
    expectedMax: 105,
    sampleAValue: 99.0,
    sampleBValue: 155.0,
  },
  {
    id: 'RES_470_S',
    name: '黄·紫·棕·银 (标称 470Ω ±10%)',
    bands: [
      { name: '黄', color: '#ca8a04', textColor: 'text-yellow-800', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300', value: 4 },
      { name: '紫', color: '#7c3aed', textColor: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-300', value: 7 },
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '银', color: '#94a3b8', textColor: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 10 },
    ],
    nominal: 470,
    tolerance: 10,
    expectedMin: 423,
    expectedMax: 517,
    sampleAValue: 480.0,
    sampleBValue: 680.0,
  },
  {
    id: 'RES_1000_G',
    name: '棕·黑·红·金 (标称 1000Ω ±5%)',
    bands: [
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '黑', color: '#0f172a', textColor: 'text-slate-800', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 0 },
      { name: '红', color: '#dc2626', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', value: 2 },
      { name: '金', color: '#eab308', textColor: 'text-amber-800', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', value: 5 },
    ],
    nominal: 1000,
    tolerance: 5,
    expectedMin: 950,
    expectedMax: 1050,
    sampleAValue: 1015.0,
    sampleBValue: 1450.0,
  },
  {
    id: 'RES_680_G',
    name: '蓝·灰·棕·金 (标称 680Ω ±5%)',
    bands: [
      { name: '蓝', color: '#2563eb', textColor: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', value: 6 },
      { name: '灰', color: '#64748b', textColor: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 8 },
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '金', color: '#eab308', textColor: 'text-amber-800', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', value: 5 },
    ],
    nominal: 680,
    tolerance: 5,
    expectedMin: 646,
    expectedMax: 714,
    sampleAValue: 688.0,
    sampleBValue: 950.0,
  },
  {
    id: 'RES_240_G',
    name: '红·黄·棕·金 (标称 240Ω ±5%)',
    bands: [
      { name: '红', color: '#dc2626', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', value: 2 },
      { name: '黄', color: '#ca8a04', textColor: 'text-yellow-800', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300', value: 4 },
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '金', color: '#eab308', textColor: 'text-amber-800', bgColor: 'bg-amber-50', borderColor: 'border-amber-300', value: 5 },
    ],
    nominal: 240,
    tolerance: 5,
    expectedMin: 228,
    expectedMax: 252,
    sampleAValue: 243.0,
    sampleBValue: 360.0,
  },
  {
    id: 'RES_1000_S',
    name: '棕·黑·红·银 (标称 1000Ω ±10%)',
    bands: [
      { name: '棕', color: '#78350f', textColor: 'text-amber-900', bgColor: 'bg-amber-100', borderColor: 'border-amber-300', value: 1 },
      { name: '黑', color: '#0f172a', textColor: 'text-slate-800', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 0 },
      { name: '红', color: '#dc2626', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300', value: 2 },
      { name: '银', color: '#94a3b8', textColor: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-300', value: 10 },
    ],
    nominal: 1000,
    tolerance: 10,
    expectedMin: 900,
    expectedMax: 1100,
    sampleAValue: 1040.0,
    sampleBValue: 1550.0,
  },
];

export interface A03StageContent {
  title: string;
  objective: string;
  actions: readonly string[];
  completion: string;
  mentorPrompt: string;
  hint: string;
  mentorEmotion: 'NORMAL' | 'WARNING' | 'PRAISE' | 'THINKING';
}

export const A03_STAGE_CONTENT: Record<A03Step, A03StageContent> = {
  COLOR_CODE_CALC: {
    title: '实训阶段 1：四色环电阻识读与合格公差推算',
    objective: '观察四色环电阻，解码有效数字、倍率并根据末环自主判定公差，推算合格阻值区间',
    actions: [
      '观察色环：前两环为有效数字，第三环为乘数倍率（10ⁿ），第四环为公差误差级别。',
      '根据第4环颜色（金±5%、银±10%）自主判断误差等级并推算允许公差范围的下限与上限。',
      '在工单中填写标称值、选择第4环误差并填写合格区间，点击“校验并提交工单”（可随时点击“随机切换电阻”练习不同规格）。',
    ],
    completion: '标称值与公差区间验证正确。',
    mentorPrompt:
      '徒弟，拿到色环电阻千万别直接拿表乱戳。先仔细观察四道色环颜色，按口诀解码出标称阻值，根据末环公差算出合格区间！',
    hint: '解码规则：第1、2环为前两位有效数字；第3环为倍率 10ⁿ；第4环为允许公差（金±5%、银±10%）。公差幅度 = 标称值 × 误差%，下限 = 标称值 - 公差幅度，上限 = 标称值 + 公差幅度。',
    mentorEmotion: 'NORMAL',
  },
  SAMPLE_MEASUREMENT: {
    title: '实训阶段 2：万用表测阻规范与带电拒测防呆 (V05)',
    objective: '万用表打到 Ω 挡，在完全断电状态下测量样品并分类，体验带电测阻安全保护',
    actions: [
      '万用表初始默认为关机状态，必须先拨至“电阻挡 (Ω)”开机方可读取测量阻值。',
      '确认电路处于断电隔离状态（带电测阻会触发系统 V05 强制拦截报警）。',
      '依次测量样品 A、B、C，根据阶段 1 推算的合格公差区间准确判定为合格品、超差品或断路件。',
    ],
    completion: '3 个待检样品全部完成精准分类判定。',
    mentorPrompt:
      '记住汽车电工铁律：测电阻绝不能带电，而且先开机打到电阻挡！万用表欧姆挡自带电池，带电测量会烧坏仪表或烧断熔丝！',
    hint: '万用表初始默认处于关机状态，请先旋转或点击拨至电阻挡开机；确认电源已断开后，再夹接样品 A、B、C 读取并判定。若闭合带电开关会触发 V05 拦截。',
    mentorEmotion: 'WARNING',
  },
  POTENTIOMETER_TEST: {
    title: '实训阶段 3：调光电位器特性与阻值互补验证',
    objective: '测量电位器固定端 (10kΩ) 与动片端阻值，验证转角与阻值线性互补关系',
    actions: [
      '将表笔夹在 1-3 固定端，验证总阻值恒定为标称 10kΩ。',
      '切换表笔至 1-2 端与 2-3 端，旋转电位器旋钮，观察阻值随角度的变化。',
      '记录不同转角下的阻值，验证 R(1-2) + R(2-3) = R(1-3)。',
    ],
    completion: '电位器固定端与动片调节特性均已记录验证。',
    mentorPrompt:
      '汽车上的电子节气门、油门踏板传感器很多都是电位器原理。固定端总阻不变，滑动端与两端阻值互补！',
    hint: '测试 1-3 固定端验证 10kΩ，再分别在 1-2 和 2-3 端调节旋钮并点击“记录测点”，记录至少 4 个位置。',
    mentorEmotion: 'NORMAL',
  },
  INDEPENDENT_EVAL: {
    title: '实训阶段 4：进气压力传感器偏置电阻盲检与公差判定',
    objective: '万用表实测 1kΩ 规格件得到 985Ω，结合 ±5% 允许公差范围独立做出合格性判定',
    actions: [
      '阅读汽车进气压力传感器电路工单（标称 1kΩ ±5%）。',
      '观察万用表实测读数（0.985 kΩ = 985.0 Ω）。',
      '根据公差上下限独立分析，选择专业判定结论并提交工单。',
    ],
    completion: '进气压力传感器偏置电阻公差判定准确，通过盲检考核。',
    mentorPrompt:
      '车间仓库刚领出来的进气压力传感器偏置电阻，标称 1kΩ、公差 ±5%，实测 985Ω。徒弟，你来独立判定它到底合不合格！',
    hint: '标称 1kΩ = 1000Ω，±5% 的合格范围是 950Ω ~ 1050Ω。实测 985Ω 落在该范围内，属于合格良品。',
    mentorEmotion: 'THINKING',
  },
  TRANSFER_NTC: {
    title: '实训阶段 5：迁移实战——实车发动机水温传感器 (NTC) 特性排查',
    objective: '调节工况温度并实测 NTC 热敏电阻阻值曲线，根据负温度系数特性出具维修决策',
    actions: [
      '查阅实车维修手册：发动机水温传感器 (ECT) 为负温度系数 (NTC) 热敏电阻。',
      '调节发动机冷却液模拟温度（20℃ ~ 85℃），观察万用表测得阻值由 2.5kΩ 连续降至 300Ω。',
      '分析温度与电阻的对应关系，判断传感器是否正常工作并提交维修报告。',
    ],
    completion: '实车 NTC 水温传感器阻值特性排查完成，维修决策正确。',
    mentorPrompt:
      '这是实车排故核心本领！发动机水温传感器是典型的负温度系数 NTC，热态阻值必须明显下降。你来实测看看这个传感器工作正常吗！',
    hint: '发动机水温传感器为负温度系数(NTC)：冷态 20℃ 阻值较高（约 2.5kΩ），热态 80℃ 阻值显著下降（约 300Ω），说明特性良好。',
    mentorEmotion: 'PRAISE',
  },
};
