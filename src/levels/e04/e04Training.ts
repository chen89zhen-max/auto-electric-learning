export type E04Step =
  | 'TRANSISTOR_PRINCIPLE_COGNITION'
  | 'MULTIMETER_PIN_AND_BETA_TEST'
  | 'THREE_OPERATION_STATES_CALC'
  | 'BLIND_TRANSISTOR_FAULT_DIAGNOSIS'
  | 'ENGINEERING_REPAIR_AND_DELIVERY';

export interface E04StageContent {
  title: string;
  objective: string;
  actions: readonly string[];
  completion: string;
  mentorPrompt: string;
  hint: string;
  mentorEmotion: 'NORMAL' | 'WARNING' | 'PRAISE' | 'THINKING';
}

export const E04_STAGE_CONTENT: Record<E04Step, E04StageContent> = {
  TRANSISTOR_PRINCIPLE_COGNITION: {
    title: '实训步骤 1：三极管结构与小控大开关机理认知',
    objective: '理解双极型晶体管(BJT)三引脚 B(基极)、C(集电极)、E(发射极)定义，掌握微弱基极电流 Ib 控制集电极电流 Ic 的流控流机理',
    actions: [
      '观察 NPN 三极管结构：发射区高掺杂电子、基区极薄、集电区面积大，箭头方向从 B 指向 E（电流从高电位流向低电位）。',
      '小控大物理比喻：三极管就像一个轻便的水龙头阀门，用手扭动微弱的小阀门（微安级 Ib），即可控制水管中汹涌喷出的大水流（毫安/安培级 Ic）。',
      '汽车电控场景：车载 ECU 单片机引脚输出能力极为微弱（通常仅 3.3V/5mA），无法直接拉动 12V/150mA 的大功率继电器线圈，必须由三极管充当“电子开关”完成放大驱动。',
      '在工单中辨识 NPN 与 PNP 的箭头方向及电源极性要求。',
    ],
    completion: '建立三极管电流控制与电子开关模型，掌握汽车微控制器小信号驱动本质。',
    mentorPrompt:
      '徒弟，现代汽车的电脑板里动辄成千上万个三极管！它最牛的本领就是“以小控大”！单片机芯片内部娇嫩得很，只能输出几毫安的微弱信号；但汽车继电器、电磁阀需要一两百毫安！芯片把这几毫安送进基极 B，三极管就能瞬间在集电极 C 放行几百毫安驱动继电器！',
    hint: '点击“切换基极信号”，观察微弱微安级 Ib 如何控制几十毫安的大电流 Ic 并吸合继电器。',
    mentorEmotion: 'NORMAL',
  },
  MULTIMETER_PIN_AND_BETA_TEST: {
    title: '实训步骤 2：万用表二极管档/hFE 档识别管脚与放大倍数 β',
    objective: '规范使用数字万用表二极管档判别 B、C、E 引脚及 NPN/PNP 类型，并在 hFE 插孔测定电流放大系数 β',
    actions: [
      '找基极 B：红表笔接触某一引脚，黑表笔分别接另外两引脚，若均显示约 0.65V 压降，则红表笔所接极为基极 B，且为 NPN 型管。',
      '辨别 C 与 E：利用三极管发射结掺杂浓度高于集电结的特性，发射结正向压降（约 0.67V）略大于集电结（约 0.64V），压降稍大的一侧为发射极 E，另一侧为集电极 C。',
      '测量放大倍数 β：将万用表旋钮打至 hFE 挡，按 E-B-C-E 极性插入专用测试插孔，表头直读直流放大系数 β（汽车常用小信号管标称 100~300）。',
      '绝缘与好坏复核：C 与 E 之间无论正测反测阻值均应为无穷大 OL，若短路击穿则已报废。',
    ],
    completion: '掌握数字万用表三极管引脚盲测与 β 放大倍数测试专业技能。',
    mentorPrompt:
      '手拿一个黑胶封装的三极管，三个脚谁是 B 谁是 C 谁是 E？打到二极管档！基极 B 就像两个二极管背靠背连着，红笔定在 B，黑笔点两边都能导通的就是 NPN！再插到 hFE 挡测放大倍数，一百多倍清清楚楚！',
    hint: '旋转旋钮至二极管档与 hFE 档，依次记录引脚压降与实测 β 值。',
    mentorEmotion: 'NORMAL',
  },
  THREE_OPERATION_STATES_CALC: {
    title: '实训步骤 3：截止、放大与饱和导通三态定量切换计算',
    objective: '理解三极管截止区、线性放大区与饱和区的判定条件，掌握汽车开关电路深度饱和要求（Uce ≤ 0.3V）',
    actions: [
      '截止状态（OFF）：基极无输入信号（Ub = 0V, Ube < 0.7V），Ib = 0，Ic ≈ 0，集电极电压 Uce ≈ 12V（开关断开，继电器失电释放）。',
      '放大状态（Active）：微弱偏置（Ube = 0.7V），基极电流 Ib = 0.2mA，Ic = β × Ib = 100 × 0.2 = 20mA，Uce = 12 - 20mA × 200Ω = 8.0V（处于中间线性区，管子发热大，不宜作开关）。',
      '饱和导通状态（Saturation 开关ON）：给基极注入充足电流（Ib ≥ 2.0mA），Ic 达到最大饱和限流值（12V / 80Ω继电器线圈 = 150mA），管压降压至极限 Uce ≤ 0.3V（近似闭合零电阻，发热极小，继电器强劲吸合）。',
      '计算基极保护电阻 Rb：Rb = (U_ecu - 0.7V) / Ib_target = (5 - 0.7) / 0.002 = 2.15kΩ，选用标称 2kΩ 或 2.2kΩ。',
    ],
    completion: '完成三极管三态数学与电路仿真计算，掌握汽车电子开关深度饱和设计规范。',
    mentorPrompt:
      '汽车电工用三极管当开关，最讲究“快刀斩乱麻”！要么彻底截止（Ib=0，一丝电不通），要么深度饱和（Ib给足，Uce降到 0.3 伏以下，就像一道铁门焊死了直通）！千万不能让它半开半关吊在放大区，那样不仅继电器吸不稳，三极管还会因为功率过热直接烧穿！',
    hint: '拖动基极驱动电阻滑动条，观察三极管从截止、放大到深度饱和导通的三态跳变。',
    mentorEmotion: 'THINKING',
  },
  BLIND_TRANSISTOR_FAULT_DIAGNOSIS: {
    title: '实训步骤 4：驱动三极管 4 组未知故障盲测排故',
    objective: '对测试台 4 组汽车继电器驱动板三极管进行带电与断电盲测，分类：性能良好、C-E击穿短路常通、B-E开路断开、放大倍数β衰减过大',
    actions: [
      '依次将 4 组驱动模块接入 12V 继电器驱动测试台。',
      '输入 5V 触发脉冲，测量基极电压 Ube、集电极对地电压 Uce 以及继电器吸合状态。',
      '排故特征识别：正常管（未触发 Uce=12V，触发后 Uce=0.2V 继电器咔嗒吸合）；C-E 击穿短路（无论触发与否，Uce 恒为 0.0V，继电器常吸不放）；B-E 开路（触发时无基极电流，Uce 恒为 12V 继电器无动作）；β 衰减老化（触发时 Uce 停留在 4.5V 放大区，继电器抖动发热但无法可靠吸合）。',
      '在工单中提交诊断分类。',
    ],
    completion: '准确诊断汽车小信号三极管击穿、开路与放大疲劳故障，具备板级排故硬本领。',
    mentorPrompt:
      '车上的继电器常吸不放，除了继电器本身粘连，九成原因就是驱动它的三极管 C-E 极被击穿短路了！如果死活不吸合，那就是 B 极断路或者管子烧了！来，把这四个控制板的故障准确定位出来！',
    hint: '结合触发前后的 Ube 和 Uce 电压，准确判定 4 组未知驱动板的故障类型。',
    mentorEmotion: 'NORMAL',
  },
  ENGINEERING_REPAIR_AND_DELIVERY: {
    title: '实训步骤 5：发动机散热电子风扇低速驱动失效工程修复',
    objective: '诊断发动机水温偏高且低速风扇无法启动故障，定位 ECU 驱动三极管基极偏置电阻虚焊烧断缺陷，更换并通电复验交付',
    actions: [
      '实车故障问诊：发动机水温达 96°C 时，ECU 发出低速风扇运转指令，但风扇继电器无任何吸合声，水温持续升高报警。',
      '万用表在板电压测量：ECU 发出 5V 驱动信号时，风扇继电器端有 12V 供电，但驱动三极管基极电压 Ub 仅为 0.0V（驱动信号未送入），查得基极 2.2kΩ 限流电阻一侧焊点虚焊断开。',
      '元器件补焊与器件复测：刮除氧化层，补焊 2.2kΩ 贴片金属膜电阻，万用表测试 NPN 三极管 (S8050) 放大倍数 β = 145，完好无损。',
      '通电交付复验：启动模拟水温上升至 96°C，三极管迅速进入深度饱和导通（Uce = 0.18V），低速继电器清脆吸合，散热风扇平稳运转，水温迅速回落至 88°C 正常区间。',
      '填写签署工程维修交车单。',
    ],
    completion: '成功解决发动机散热风扇驱动失效重大安全隐患，规范修复板级虚焊并完成工况复验。',
    mentorPrompt:
      '干得漂亮！水温高可不是小事，一旦开锅发动机就得大修！你敏锐查到了三极管基极电阻虚焊断路，补焊之后 Uce 降到 0.18V 强力吸合风扇，水温稳稳压在 88 度，这就是专业汽车电工的价值！',
    hint: '补焊基极电阻使 5V 驱动信号进入基极，观察三极管饱和导通并启动散热风扇。',
    mentorEmotion: 'PRAISE',
  },
};

export type BjtFaultType = 'NORMAL' | 'CE_SHORT' | 'BE_OPEN' | 'BETA_DEGRADED';

export interface BjtSample {
  id: string;
  name: string;
  triggerUce: number;
  relayState: 'ENERGIZED' | 'RELEASED' | 'CHATTERING';
  actualType: BjtFaultType;
}

export const E04_SAMPLES: BjtSample[] = [
  { id: 'BJT_1', name: '驱动模块 #1 (原厂标准)', triggerUce: 0.22, relayState: 'ENERGIZED', actualType: 'NORMAL' },
  { id: 'BJT_2', name: '驱动模块 #2 (C-E 击穿)', triggerUce: 0.05, relayState: 'ENERGIZED', actualType: 'CE_SHORT' }, // even without trigger it's shorted!
  { id: 'BJT_3', name: '驱动模块 #3 (B-E 断路)', triggerUce: 12.0, relayState: 'RELEASED', actualType: 'BE_OPEN' },
  { id: 'BJT_4', name: '驱动模块 #4 (β 严重衰减)', triggerUce: 5.4, relayState: 'CHATTERING', actualType: 'BETA_DEGRADED' },
];

export function calculateBjtOperatingPoint(
  uIn: number,
  rBaseOhm: number,
  rLoadOhm: number,
  beta: number
): { ibMa: number; icMa: number; uceV: number; state: 'CUTOFF' | 'ACTIVE' | 'SATURATION' } {
  if (uIn < 0.7) {
    return { ibMa: 0, icMa: 0, uceV: 12.0, state: 'CUTOFF' };
  }
  const ibMa = Math.max(0, (uIn - 0.7) / (rBaseOhm / 1000));
  const icActiveMa = ibMa * beta;
  const icSatMa = 12.0 / (rLoadOhm / 1000);

  if (icActiveMa >= icSatMa) {
    return {
      ibMa: Math.round(ibMa * 100) / 100,
      icMa: Math.round(icSatMa * 10) / 10,
      uceV: 0.2,
      state: 'SATURATION',
    };
  } else {
    const uceV = Math.max(0.2, 12.0 - (icActiveMa / 1000) * rLoadOhm);
    return {
      ibMa: Math.round(ibMa * 100) / 100,
      icMa: Math.round(icActiveMa * 10) / 10,
      uceV: Math.round(uceV * 100) / 100,
      state: 'ACTIVE',
    };
  }
}
