export type A03Step =
  | 'COLOR_CODE_CALC'
  | 'SAMPLE_MEASUREMENT'
  | 'POTENTIOMETER_TEST'
  | 'TRANSFER_SORTING';

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
    title: '实训步骤 1：四色环电阻识读与合格公差推算',
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
    title: '实训步骤 2：电阻测量与带电拒测防呆 (V05)',
    objective: '万用表打到 Ω 挡，在完全断电状态下测量样品并分类，体验带电测阻安全保护',
    actions: [
      '确认电路处于断电隔离状态（带电测阻会触发系统 V05 强制拦截报警）。',
      '万用表拨至“电阻挡 (Ω)”，表笔夹接被测电阻样品。',
      '依次测量样品 A、B、C，根据公差区间准确判定为合格品、超差品或断路件。',
    ],
    completion: '3 个待检样品全部完成精准分类判定。',
    mentorPrompt:
      '记住汽车电工铁律：测电阻绝不能带电！万用表欧姆挡自带电池，带电测量会烧坏仪表或烧断熔丝！',
    hint: '先确认电源已断开，万用表旋钮拨至电阻挡。样品A(224Ω合格)、B(330Ω超差)、C(O.L断路)。若闭合带电开关会触发 V05 拦截。',
    mentorEmotion: 'WARNING',
  },
  POTENTIOMETER_TEST: {
    title: '实训步骤 3：电位器三端测试与阻值调节规律',
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
  TRANSFER_SORTING: {
    title: '实训步骤 4：迁移任务——实车传感器电阻特性实战',
    objective: '应用电阻测量与公差分析能力，完成实车发动机水温传感器或复杂电阻检测',
    actions: [
      '阅读实车维修任务工单，了解传感器标准阻值规格与公差要求。',
      '调节工况参数（如冷却液温度），实测传感器端子阻值。',
      '根据测量数据做出专业维修决策。',
    ],
    completion: '实车传感器阻值特性排查完成，决策正确。',
    mentorPrompt:
      '实车进气温度传感器、水温传感器都是典型的负温度系数热敏电阻，现在请你独立完成实战排查！',
    hint: '发动机水温传感器为负温度系数(NTC)：冷态 20℃ 阻值较高（约 2.5kΩ），热态 80℃ 阻值显著下降（约 300Ω）。',
    mentorEmotion: 'PRAISE',
  },
};
