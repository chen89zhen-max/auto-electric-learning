export type E07Step =
  | 'SOLDERING_SAFETY_AND_FIVE_STEPS'
  | 'VIRTUAL_PCB_INSERTION_AND_WELD'
  | 'SOLDER_JOINT_QUALITY_STANDARD'
  | 'BLIND_PCB_DEFECT_INSPECTION'
  | 'ENGINEERING_REPAIR_AND_DELIVERY';

export interface E07StageContent {
  title: string;
  objective: string;
  actions: readonly string[];
  completion: string;
  mentorPrompt: string;
  hint: string;
  mentorEmotion: 'NORMAL' | 'WARNING' | 'PRAISE' | 'THINKING';
}

export const E07_STAGE_CONTENT: Record<E07Step, E07StageContent> = {
  SOLDERING_SAFETY_AND_FIVE_STEPS: {
    title: '实训步骤 1：电烙铁安全规程与标准焊接“五步法”认知',
    objective: '掌握恒温电烙铁安全操作防烫防短路规程，熟练掌握“准备-加热-送丝-移丝-撤烙铁”标准五步操作法',
    actions: [
      '用电与防烫安全：佩戴防静电手环与护目镜，电烙铁不使用时必须稳妥插回专用烙铁架，严禁随手放在桌台或引线缠绕。',
      '恒温设定：选用 60W 恒温焊台，无铅环保焊锡丝熔点约 217°C，烙铁温度标准设定为 320°C~350°C（太低冷焊虚焊，太高焊盘脱落）。',
      '五步操作黄金法则：① 准备施焊（清洁烙铁头海绵浸水洗净并挂薄锡）；② 加热焊件（45°角同时接触引脚和铜箔焊盘，预热1秒）；③ 送入焊丝（从对侧送锡至熔融漫流）；④ 移开焊丝；⑤ 移开电烙铁（45°快速撤离，全程耗时2~3秒）。',
      '在工单中明确焊接时间过长（>5秒）对 PCB 焊盘粘胶和半导体芯片内部 PN 结的毁灭性热损伤。',
    ],
    completion: '建立电工焊接安全红线意识，烂熟于心五步焊接标准工艺流程。',
    mentorPrompt:
      '徒弟，电烙铁三百多度，是汽车电工手里的“绣花针”，也是最危险的工具！不戴护目镜焊锡飞溅会伤眼，烙铁乱搁会烧糊线束甚至起火！记住五步法：准备、加热、送丝、移丝、撤烙铁，2到3秒一气呵成！多一秒焊盘烫掉，少一秒就是虚焊！',
    hint: '点击查看“焊接五步法”动态分解流程，牢记温度区间与单点施焊时间规范。',
    mentorEmotion: 'NORMAL',
  },
  VIRTUAL_PCB_INSERTION_AND_WELD: {
    title: '实训步骤 2：元器件引脚成型、插装极性确认与施焊实操',
    objective: '规范完成电阻、二极管、电解电容引脚折弯成型，严格核对丝印极性插装，规范焊接并剪除多余引脚',
    actions: [
      '元器件成型：用尖嘴钳规范折弯引脚，弯曲半径大于引脚直径2倍，保持器件水平平贴 PCB 板面（间隙<1mm）。',
      '极性防呆核对：二极管色环端对应 PCB 丝印粗横线；电解电容负极白色阴影带对齐 PCB 阴影区，长引脚入正极孔。',
      '施焊与剪脚：按五步法焊接引脚，待焊锡冷却凝固后，用斜口钳齐根保留 1~1.5mm 剪除多余引脚，严禁震碎焊点。',
      '清洁清洗：用无水酒精刷除残余松香助焊剂，防止吸潮霉变漏电。',
    ],
    completion: '完成印制板元器件标准插装与手工焊接实操，焊点光洁饱满。',
    mentorPrompt:
      '插装元器件，讲究“先低后高、先小后大”！色环电阻躺平，二极管色环对准白线，电解电容白色横条对准阴影！焊好之后斜口钳贴着焊点留一毫米咔嚓剪齐，剪完必须拿毛刷用酒精把松香洗干净，露出锃亮的绿油板！',
    hint: '依次点击插装电阻、二极管、电容并核对极性，然后执行五步法焊接与剪脚。',
    mentorEmotion: 'NORMAL',
  },
  SOLDER_JOINT_QUALITY_STANDARD: {
    title: '实训步骤 3：合格焊点几何形态与常见焊接缺陷对比',
    objective: '对照 IPC-A-610 国际电子装配标准，识别合格焊点(半月裙摆状)及虚焊、假焊、桥连连锡、焊盘剥离缺陷',
    actions: [
      '合格焊点标准：呈光滑圆润的半月形圆锥体，焊锡沿引脚与焊盘充分润湿铺展，润湿角 θ < 30°，引脚轮廓隐约可见。',
      '虚焊与假焊 (Cold/Pseudosolder)：焊锡未完全熔透或引脚有氧化层，呈豆腐渣粗糙球状，表面无光泽，内部存在接触电阻或隐蔽开路。',
      '桥连短路 (Bridging)：焊锡过多溢出或烙铁拉丝，导致相邻两个独立引脚铜箔粘连成一片，通电直接烧保险丝。',
      '焊盘起皮脱落 (Pad Lift)：烙铁温度过高(>380°C)或单点加热超过 6 秒，粘合树脂碳化脱胶，焊盘彻底撕裂报废。',
    ],
    completion: '建立工业级焊点质量眼光，熟记缺陷成因与防范措施。',
    mentorPrompt:
      '什么叫合格的好焊点？三个字：润、亮、锥！像一颗颗晶莹剔透的水滴，四周像裙摆一样平滑贴在铜皮上，引脚在中间微微露个尖！要是堆成个死大圆球，里头十有八九是没吃透的虚焊；要是连到隔壁引脚就是短路桥连！',
    hint: '点击放大显微镜切片，对比合格半月形圆锥焊点与虚焊、桥连的形态差异。',
    mentorEmotion: 'THINKING',
  },
  BLIND_PCB_DEFECT_INSPECTION: {
    title: '实训步骤 4：PCB 训练板 4 处典型工艺缺陷盲测排查',
    objective: '使用 10 倍放大镜显微观察与数字万用表蜂鸣通断档，在训练板上定位并标记 4 类真实工艺缺陷',
    actions: [
      '对测试台盲样 PCB 板（焊点 A/B/C/D）进行视觉显微与万用表蜂鸣复验。',
      '缺陷点 1：IC 芯片 3-4 脚间存在微细锡渣桥连，万用表蜂鸣器狂叫（0.0Ω 短路）。',
      '缺陷点 2：限流电阻焊点呈灰暗豆腐渣球状，轻晃引脚阻值在几欧到几千欧乱跳（虚焊接触不良）。',
      '缺陷点 3：电解电容极性反向插装（白带未对准丝印阴影，通电存在爆裂安全隐患）。',
      '缺陷点 4：三极管基极焊盘受过热剥离脱落（物理撕裂断线）。',
      '在检验答题卡中准确提交 4 处缺陷坐标与定性结论。',
    ],
    completion: '熟练运用显微镜视觉观察与万用表通断法快速诊断 PCB 焊接工艺缺陷。',
    mentorPrompt:
      '板子焊完了，绝不能盲目直接插电！一定要过“两道关”：先拿十倍放大镜肉眼扫一遍焊缝，再拿万用表蜂鸣挡量量相邻引脚有没有桥连短路！来，这块板子上有四个典型的工艺雷区，全找出来！',
    hint: '在四个可疑焊点区域切换放大镜与万用表通断档，找出短路、虚焊与极性反接。',
    mentorEmotion: 'NORMAL',
  },
  ENGINEERING_REPAIR_AND_DELIVERY: {
    title: '实训步骤 5：实车仪表显示板按键与背光不亮工程修复与教师验收',
    objective: '排除汽车组合仪表板按键背光不亮故障，吸锡清除桥连短路、刮除氧化层补焊虚焊，通电全亮通过教师现场量规 95 分验收',
    actions: [
      '接车问诊：车主反映组合仪表夜间背光全灭，按压灯光按键无任何反馈。',
      '板级检测定位：发现电源滤波区存在相邻引脚锡桥短路拉低了 12V 母线，同时背光 LED 供电限流电阻根部存在严重虚焊假焊。',
      '吸锡与补焊工艺：使用纯铜吸锡带配合烙铁清理桥连多余焊锡；对虚焊焊盘涂抹优质助焊松香膏重新熔锡润湿，形成光亮半月锥。',
      '全功能通电试机：接入 12V 仪表台测试电缆，仪表盘背光均匀柔和点亮，按键灵敏度 100%，工作电流稳定在 120mA。',
      '教师现场量规实物评定：教师对焊点圆润度、剪脚平整度、板面清洁度打出 96 分并签字合格交付。',
    ],
    completion: '规范完成精密汽车仪表板手工返修，通过教师实物量规高分验收与整机通电交付。',
    mentorPrompt:
      '太棒了！吸锡带走桥连，松香补透虚焊，这才是大国工匠的真功夫！通电复测，仪表盘璀璨点亮，背光均匀不跳屏！教师量规实物评定 96 分优秀！你已经从一名初学者蜕变成为合格的汽车电子技能好手！',
    hint: '点击使用吸锡带清除桥连，补焊虚焊点，通电复核全板点亮并通过教师量规签字。',
    mentorEmotion: 'PRAISE',
  },
};

export interface PcbDefectSample {
  id: string;
  location: string;
  visualFeature: string;
  multimeterOhm: number;
  actualDefect: 'BRIDGING' | 'COLD_SOLDER' | 'REVERSED_POLARITY' | 'PAD_LIFT';
}

export const E07_DEFECTS: PcbDefectSample[] = [
  { id: 'DEF_1', location: '芯片 U1 Pin 3-4', visualFeature: '引脚根部被多余锡渣粘连横跨', multimeterOhm: 0.1, actualDefect: 'BRIDGING' },
  { id: 'DEF_2', location: '电阻 R3 焊盘', visualFeature: '焊点灰暗起皱呈豆腐渣粗糙球', multimeterOhm: 850, actualDefect: 'COLD_SOLDER' },
  { id: 'DEF_3', location: '电容 C2 丝印位', visualFeature: '白条负极朝向正极孔，长脚插负孔', multimeterOhm: 999999, actualDefect: 'REVERSED_POLARITY' },
  { id: 'DEF_4', location: '三极管 Q1 基极', visualFeature: '绿色阻焊油翘起，铜箔焊盘撕裂悬空', multimeterOhm: 9999999, actualDefect: 'PAD_LIFT' },
];
