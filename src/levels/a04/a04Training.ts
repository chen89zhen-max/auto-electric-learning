export type A04Step =
  | 'SERIES_MEASUREMENT'
  | 'SHORT_CIRCUIT_INTERCEPT'
  | 'CLAMP_METER_TASK'
  | 'BATTERY_DISPOSAL'
  | 'TRANSFER_PARALLEL_KCL';

export interface A04StageContent {
  title: string;
  objective: string;
  actions: readonly string[];
  completion: string;
  mentorPrompt: string;
  hint: string;
  mentorEmotion: 'NORMAL' | 'WARNING' | 'PRAISE' | 'THINKING';
}

export const A04_STAGE_CONTENT: Record<A04Step, A04StageContent> = {
  SERIES_MEASUREMENT: {
    title: '实训步骤 1：电流表串联断路接入规范',
    objective: '万用表拨至 10A 挡、红表笔插 10A 插孔，并断开电路将表串联入回路',
    actions: [
      '拔出电路连接插头形成断口（严禁在不断开回路的情况下直接跨接）。',
      '万用表红表笔插在 10A 大电流孔，旋钮拨至“直流电流 (10A)”。',
      '将红、黑两支表笔串联接入断口两端，闭合开关测量回路电流。',
    ],
    completion: '电流表正确串联接入，测得回路工作电流 2.00A。',
    mentorPrompt:
      '徒弟，测电流和测电压完全相反！电压表并联，电流表必须串联！必须先断开电路，把电流表串进断口！',
    hint: '表笔插孔选 10A，挡位拨至直流电流挡，断开电路插头后将电流表串联在供电线断口之间。',
    mentorEmotion: 'NORMAL',
  },
  SHORT_CIRCUIT_INTERCEPT: {
    title: '实训步骤 2：危险跨接并联短路拦截 (V06)',
    objective: '验证电流表绝不可并联跨接在电源两端，体验防呆断路器保护机制',
    actions: [
      '尝试将电流挡表笔并联跨接在 12V 电源两端。',
      '观察车间智能防护系统的 V06 声光安全拦截与断路器保护跳闸。',
      '理解电流挡内阻极小相当于短路的严重破坏原理。',
    ],
    completion: 'V06 短路安全拦截机制验证完成，安全意识牢固建立。',
    mentorPrompt:
      '绝对严禁把电流挡表笔直接跨在电源两端！电流挡内阻极小，相当于直接短路，会导致熔丝爆断甚至烧毁仪表！',
    hint: '点击尝试并联跨接，观察安全保护系统拦截报警以及短路阻断机制 (V06)。',
    mentorEmotion: 'WARNING',
  },
  CLAMP_METER_TASK: {
    title: '实训步骤 3：钳形表非接触测量与磁通抵消',
    objective: '掌握非接触钳形表单导线检测原理，对比双线同时卡入磁通抵消反例',
    actions: [
      '收起万用表，调出汽车专用数字钳形电流表。',
      '将钳口卡入单根红色供电导线，观察测得回路电流 2.00A。',
      '将钳口同时卡入供电线与搭铁线，观察正负磁通相互抵消、示数归零的现象。',
    ],
    completion: '钳形表单导线测流与双导线磁通抵消均已验证完成。',
    mentorPrompt:
      '新能源车高压线不能随便剪断接表，钳形表利用电磁感应测电流。但必须只能卡入单根导线，卡双线会正负磁通抵消读数为零！',
    hint: '分别切换钳形表卡入【单根供电线】（读数正常 2.00A）与【双导线并行】（读数抵消接近 0A），体会安培环路定律。',
    mentorEmotion: 'NORMAL',
  },
  BATTERY_DISPOSAL: {
    title: '实训步骤 4：废旧蓄电池带载检测与危废归集',
    objective: '进行蓄电池带载检测，符合报废标准的废旧蓄电池按环保规范分类归集',
    actions: [
      '使用蓄电池测试仪带载复核端电压，测量得到 9.2V（低于 10.5V 临界值）。',
      '确认蓄电池已硫化失效不可恢复。',
      '将废旧蓄电池按车间环保规定归集入专用防泄漏酸性危废箱。',
    ],
    completion: '蓄电池带载判定准确，危废归集流程合规闭环。',
    mentorPrompt:
      '换下来的旧蓄电池属于危险废弃物，含重金属铅和电解液强酸，必须带载复核后放入专用防泄漏危废箱！',
    hint: '带载电压 9.2V 判定为老化报废，点击归集按钮将其安全放入车间防酸危废回收箱。',
    mentorEmotion: 'NORMAL',
  },
  TRANSFER_PARALLEL_KCL: {
    title: '实训步骤 5：迁移任务——实车整车休眠漏电或双支路 KCL 验证',
    objective: '应用电流分析测量能力，完成实车整车休眠暗电流排查或并联电流分配',
    actions: [
      '阅读工单任务（实车停放亏电无法启动，怀疑休眠暗电流异常）。',
      '将电流表串联在蓄电池负极搭铁回路，测得整车休眠电流高达 480mA。',
      '逐个拔出保险丝排查，定位异常耗电支路（加装设备漏电）。',
    ],
    completion: '漏电支路精准锁定，完成汽车暗电流维修决策。',
    mentorPrompt:
      '实车漏电排查是汽修高级工的看家本领！拔保险丝法查暗电流，电流突降的那个回路就是漏电元凶！',
    hint: '正常休眠电流应小于 50mA。逐个拔出保险丝，当拔掉【F2 加装行车记录仪】时电流瞬间降为 40mA，即为漏电根源！',
    mentorEmotion: 'PRAISE',
  },
};
