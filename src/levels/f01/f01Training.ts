import { F01_STAGES, type F01Seed, type F01Stage } from './f01Model';

export const F01_STAGE_ORDER = F01_STAGES;

export const F01_STAGE_CONTENT: Record<F01Stage, {
  step: 1 | 2 | 3 | 4 | 5;
  title: string;
  objective: string;
  mentorPrompt: string;
  hint: string;
}> = {
  WORK_ORDER_AND_HYPOTHESIS: {
    step: 1,
    title: '阶段1：接单识图与建立假设',
    objective: '区分功率回路与控制回路，根据终检现象提交两个有先后顺序的诊断假设。',
    mentorPrompt: '先读工单、再分回路。综合排故最怕一上来就换件，你要先说明准备证明什么。',
    hint: '把“灯是否得到足够电压”和“继电器是否收到正确控制”分开考虑。',
  },
  SAFETY_AND_TEST_PLAN: {
    step: 2,
    title: '阶段2：上电前安全审查与测量计划',
    objective: '在断电状态检查保险、极性、焊点和通断，纠正装配缺陷并确定表具使用顺序。仿真安全规则已在送电前阻断操作，禁止形成危险回路。',
    mentorPrompt: '送电前先排除会扩大故障的装配问题，测电阻和通断时电路必须断电。',
    hint: '先用外观、二极管或通断检查找出当前板上的异常，再计划通电后的电压降测量。',
  },
  EXPECTED_VALUE_CALCULATION: {
    step: 3,
    title: '阶段3：建立正常参考值',
    objective: '按本实训模型参数计算主回路电流、灯端电压、分压点电压并完成与门真值表。',
    mentorPrompt: '没有正常参考值，测到任何数字都无法判断好坏。先算清楚，再去碰表笔。',
    hint: '主回路要把1Ω电源等效内阻计入总电阻；分压点取下支路两端电压。',
  },
  BLIND_DIAGNOSIS_AND_REPAIR: {
    step: 4,
    title: '阶段4：未知故障测量、排除与修复',
    objective: '用安全且有信息量的测量形成证据链，定位运行故障并执行与证据一致的修复。',
    mentorPrompt: '每次下表笔前说清楚：测哪里、正常应是多少、这个结果能排除什么。',
    hint: '优先测量能把故障范围一分为二的节点，再围绕异常压降或异常控制电压缩小范围。',
  },
  FUNCTION_RETEST_AND_DEFENSE: {
    step: 5,
    title: '阶段5：功能复检、参数迁移与证据答辩',
    objective: '完成四工况功能矩阵、分压参数迁移，并引用两条本轮实测记录完成游戏内交付。',
    mentorPrompt: '修好不等于交付。四种输入都要复检，还要用自己的测量记录证明故障为何消失。',
    hint: '2kΩ与1kΩ分压后先和2.00V阈值比较，再判断AND输出与继电器状态。',
  },
};

export const F01_FAULT_COPY: Record<F01Seed, { workOrderSymptom: string; prePowerInspection: string; repairLabel: string }> = {
  'F01-A': {
    workOrderSymptom: '灯组能够动作但亮度和供电质量未达到终检标准。',
    prePowerInspection: '续流二极管极性异常；纠正前禁止送电。仿真安全规则已在送电前阻断操作。',
    repairLabel: '修复电源正极连接器接触面并恢复端子夹紧力',
  },
  'F01-B': {
    workOrderSymptom: '输入条件满足时继电器仍不吸合，灯组无法点亮。',
    prePowerInspection: '+12V供电焊盘与地焊盘间存在低阻焊桥；清除前禁止送电。仿真安全规则已在送电前阻断操作。',
    repairLabel: '修复传感器分压上支路开路点',
  },
  'F01-C': {
    workOrderSymptom: '灯组动作不稳定且负载端电压未达到终检标准。',
    prePowerInspection: '继电器线圈端子虚焊；返修并通过通断检查后方可送电。',
    repairLabel: '清洁并紧固灯组搭铁连接点',
  },
};
