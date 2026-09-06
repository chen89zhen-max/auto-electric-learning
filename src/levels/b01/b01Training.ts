export type B01Step =
  | 'FIXED_R_CHANGE_V'
  | 'FIXED_V_CHANGE_R'
  | 'COUNTEREXAMPLE_PHYSICAL_ATTR'
  | 'UNKNOWN_RESISTANCE_PREDICT'
  | 'TRANSFER_AUTO_HEADLAMP_POWER';

export interface B01StageContent {
  title: string;
  objective: string;
  actions: readonly string[];
  completion: string;
  mentorPrompt: string;
  hint: string;
  mentorEmotion: 'NORMAL' | 'WARNING' | 'PRAISE' | 'THINKING';
}

export const B01_STAGE_CONTENT: Record<B01Step, B01StageContent> = {
  FIXED_R_CHANGE_V: {
    title: '实训步骤 1：控制变量实验 A · 电阻固定改变电压 (U-I 正比关系)',
    objective: '固定定值电阻 R = 6Ω，依次调节电源电压 3V、6V、9V、12V，记录电流并绘制正比直线',
    actions: [
      '保持负载回路电阻 R = 6Ω 恒定不变。',
      '从 3V 起步依次切换电源电压为 3V、6V、9V、12V。',
      '观察万用表测得的回路电流依次为 0.5A、1.0A、1.5A、2.0A。',
      '点击“记录实测数据”完成 4 组数据采集，观察 U-I 线性关系。',
    ],
    completion: '4 组 U-I 实测数据完整采集，验证了在电阻恒定时，电流与电压成正比 (I ∝ U)。',
    mentorPrompt:
      '徒弟，欢迎来到篇章二！学习电工核心规律——欧姆定律，必须掌握科学的“控制变量法”！先固定电阻不变，看看电压变大时电流怎么走！',
    hint: '点击电压挡位按钮（3V、6V、9V、12V），每次观察万用表示数后点击“记录实测数据”，测满 4 组即可解锁下一步。',
    mentorEmotion: 'NORMAL',
  },
  FIXED_V_CHANGE_R: {
    title: '实训步骤 2：控制变量实验 B · 电压恒定更换电阻 (I-R 反比关系)',
    objective: '固定电源电压 U = 12V，依次更换接入 2Ω、4Ω、6Ω、12Ω 电阻，验证电流与电阻的反比关系',
    actions: [
      '保持电源电压稳定在 12V 恒压输出。',
      '依次接入 2Ω、4Ω、6Ω、12Ω 四种规格电阻。',
      '观察电流依次测得 6.0A、3.0A、2.0A、1.0A。',
      '点击“记录实测数据”，观察 I-R 反比双曲线变化趋势。',
    ],
    completion: '4 组 I-R 实测数据采集完成，验证了在电压恒定时，电流与电阻成反比 (I ∝ 1/R)。',
    mentorPrompt:
      '很好！现在我们反过来：把电压固定在 12V，更换不同大小的电阻。记住，阻碍越强，电流流得越慢，看看是不是反比例关系！',
    hint: '依次点击 2Ω、4Ω、6Ω、12Ω 更换负载电阻并记录数据，观察电流随阻值增大成反比衰减的规律。',
    mentorEmotion: 'NORMAL',
  },
  COUNTEREXAMPLE_PHYSICAL_ATTR: {
    title: '实训步骤 3：反例辨析 · 欧姆定律物理本质与极限工况辨析',
    objective: '理解短路与断路极限，辨析公式 R = U/I 并不代表电阻由电压电流决定的物理本质',
    actions: [
      '观察短路极限 (R → 0 时电流趋向无穷大触发 V06 断路保护)。',
      '观察断路极限 (R → ∞ 时回路电流为 0A)。',
      '完成车间技术辨析题：“能否说导体的电阻与电压成正比、与电流成反比”？',
      '自主选择选项并点击提交，核验理论深度。',
    ],
    completion: '深入掌握了电阻是导体固有属性的物理本质，极限工况反例辨析通过。',
    mentorPrompt:
      '有些新手常说“电阻由公式 R=U/I 决定，所以电阻跟电压成正比”，这是大错特错！电阻是元件自身的物理属性，不能被公式本末倒置！仔细辨析这道思考题！',
    hint: '电阻由材料、长度、截面积与温度决定。即使电路断电 (U=0, I=0)，电阻依然客观存在！在选项中挑选科学正确的表述并提交。',
    mentorEmotion: 'THINKING',
  },
  UNKNOWN_RESISTANCE_PREDICT: {
    title: '实训步骤 4：独立盲测 · 实车仪表照明灯未知阻值定量推算',
    objective: '依据实车回路实测数据 (U = 12.0V, I = 0.50A)，应用欧姆定律自主推算未知电阻标称值',
    actions: [
      '接入实车仪表盘背光总成测试回路。',
      '读取电压表读数 12.0V 与电流表读数 0.50A。',
      '根据 R = U / I 自主列式计算未知负载阻值。',
      '在工单中选择正确阻值并提交，完成定量预测闭环。',
    ],
    completion: '未知负载阻值定量推算准确无误 (24.0Ω)，计算思维与工程素养过关。',
    mentorPrompt:
      '到独立应用环节了！修车时很多坏掉的加热丝或小灯泡看不清标称值，我们测出工作电压和电流，就能推算它的阻值！自己算算看！',
    hint: '利用欧姆定律变形公式 R = U / I，代入 U = 12.0V，I = 0.50A，计算出的商即为该回路负载的真实电阻值。',
    mentorEmotion: 'PRAISE',
  },
  TRANSFER_AUTO_HEADLAMP_POWER: {
    title: '实训步骤 5：迁移任务 · 实车大灯功率与内阻计算及大功率改装评估',
    objective: '测量实车前大灯点亮回路，计算热态电阻与额定功率，完成 100W 大功率灯泡改装风险诊断决策',
    actions: [
      '闭合前大灯开关，测得 12V 电源下正常点亮工作电流为 4.50A。',
      '计算灯丝热态工作电阻 (R ≈ 2.67Ω) 与额定工作功率 (P = 54W)。',
      '面对车主私自购买 100W 大功率灯泡要求原位插拔替换的需求，进行工程风险评估。',
      '在车间维修工单中提交正确的技师决策方案，杜绝火灾隐患。',
    ],
    completion: '前大灯电功率核算精准，大功率灯泡私改火灾隐患评估与维修决策合规闭环。',
    mentorPrompt:
      '实车改装是高频业务！很多车主嫌大灯不够亮，想直接换 100W 大灯泡。作为专业汽车电工，必须用欧姆定律和功率发热理论给他讲清楚危害，给出合规方案！',
    hint: '100W 灯泡单只电流超 8A，原车细线束和继电器无法承受过载发热，极易烧蚀自燃！必须加装强化线束与继电器盒或选原厂高光效总成。',
    mentorEmotion: 'NORMAL',
  },
};
