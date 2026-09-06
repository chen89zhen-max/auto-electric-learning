# Sprint 0—2 综合修正与 Sprint 2《点亮第一盏检修灯》技术实现文档

## 1. 架构总览

本阶段依据《Sprint 0—2 综合修正任务书 (v1.0)》及中职汽车专业《汽车电工电子技术》课程大纲，完成以下核心目标：
1. **电路拓扑与安全引擎解耦**：彻底分清 SafetyRuleEngine（决定操作是否允许执行，默认拒绝）与 CircuitTopologyEngine / Level02Validator（决定电路是否闭合工作，标准验收）。
2. **多段与旁路短路检测**：实现无向带权图分析，能够拦截任意段数（含3段及以上、经过中间端子跨接）的电源直连短路，以及灯泡并联旁路短路。
3. **闭环状态机与阶段流转守卫**：Sprint 2 六大阶段（认识元件、实物搭线、开关与原理图映射、断路对比、车身单线制搭铁、实训总结与能力报告）严格实现前置条件守卫，禁止跳步与非法状态转移。
4. **统一能力评价与无 s any 事件日志**：AbilityTracker 支持 Level 02 四维过程评价（电路识图、规范接线、故障辨识、安全规范），GameEvent 全面规范化。
5. **课程大厅与逐级解锁**：实现 CourseMapLobby，仅允许已解锁或已通过关卡进入，提供教师全开预览模式并清晰隔离。
6. **全视口响应式适配**：从 1366×768（含高度 <= 800px）到 1920×1200 全面自适应，顶栏与底栏常驻可视，主画布与侧边栏比例优化。

---

## 2. 核心模块实现

### 2.1 安全规则引擎 (src/safety/)
- **优先级与严格默认拒绝**：
  - 移除了无差别放行的 SAFE_DEFAULT 通配规则。
  - 所有规则按 priority 降序评估（如 CIRCUIT_DIRECT_SHORT 优先级 100，CHASSIS_HOT_WIRE 优先级 95）。
  - 当没有匹配规则时，安全引擎严格执行 **DEFAULT DENY**（返回 llowed: false, severity: 'BLOCK', reason: '未授权或未受控的电路操作，已被安全策略拦截'）。
- **统一接入**：
  - 连线操作 (CONNECT_WIRE)、开关切换 (TOGGLE_SWITCH)、车身搭铁修改 (CONNECT_CHASSIS_GROUND) 均先经过 safetyRuleEngine.evaluate(context) 审查。

### 2.2 电路拓扑引擎与图算法 (src/circuit/)
- **电路图结构 (CircuitGraph.ts)**：
  - 双向邻接表表示电路网络，支持端子连通与元器件内部导通。
  - 导通状态受元器件工作特性控制（例如断开的开关内部端子不连通）。
- **路径与短路分析 (PathAnalyzer.ts)**：
  - **电源直连短路 (hasDirectShort)**：从电源正极出发，遍历所有无负载路径（忽略断开开关）。如果存在到达电源负极且路径上没有负载（isLoad: true）的连通分支，无论是单根直连还是多段导线级联，均判定为直连短路。
  - **灯泡旁路短路 (isLoadBypassed)**：检测灯泡两个端子之间是否存在不经过灯泡本体的零阻抗并联分路。
  - **闭合回路验证 (hasCompleteLoop)**：验证电源正负极之间是否存在包含所有指定必要元件且无短路的通路。
- **阶段验收器 (Level02Validator.ts)**：
  - alidateLevel02StandardCircuit 严格校验必须包含：蓄电池、熔断器、开关、灯泡，且无直连或旁路短路。
  - 返回 { valid: boolean, message: string }，对导线数不足、缺少保护元件、未闭合或短路等提供清晰的中职学情反馈。

### 2.3 状态机与场景流转 (src/stores/level02Store.tsx)
- **阶段守卫 (NEXT_STAGE)**：
  - COMPONENT_DISCOVERY -> 需点选全部 5 个基础元器件。
  - CIRCUIT_WIRING -> 需接通标准闭合回路且灯泡点亮。
  - SCHEMATIC_MAPPING -> 需完成实物端子到原理图符号的对应认知。
  - OPEN_CIRCUIT_EXP -> 需真实拆除一根导线（断路），观察灯泡熄灭。
  - CHASSIS_GROUND_EXP -> 需经过：先断电 -> 拆回路线 -> 负极及灯泡搭铁 -> 重新合闸通电 的严格闭环。
- **六卡排序复盘 (src/levels/level02/scenes/Level02ReportScene.tsx)**：
  - 6 个实训规范动作卡片（切断电源->查图选件->串联熔丝->接入开关与负载->合闸测试->整理台面）。
  - 初始乱序呈现，支持上移/下移拖动调整。
  - 提交校验失败时记录尝试次数，给出诊断提示，禁止假通过。

### 2.4 课程大厅与进度持久化 (src/stores/userProgressStore.ts)
- **逐级解锁逻辑**：
  - 用户必须依次完成任务 0（入职训练）-> 任务 1（用电安全）-> 任务 2（点亮检修灯）。
  - 未解锁关卡点击时显示前置关卡提示并阻断进入。
  - 任务 3~9 明确标记为 开发制作中，不可进入。
- **教师预览模式**：
  - 顶部导航提供教师全开预览开关。
  - 开启时可跳转任意已开发关卡，但在本地存储中标记 isPreview: true，不污染学生实际进度。
- **环境兼容与 Node 单元测试内存缓存**：
  - 在无 localStorage 的 Node 测试环境中自动降级到内存缓存，保障自动化测试稳定运行。

### 2.5 过程能力评价与事件日志 (src/abilities/, src/core/types.ts)
- **Level02 四维能力模型**：
  - schematicReading（电路识图）
  - wiringStandard（规范接线）
  - aultDiagnosis（故障辨识）
  - safetyCompliance（安全规范）
- **类型安全**：
  - 严格扩展 GameEvent 联合类型，所有电路实训事件（SELECT_TOOL, CONNECT_WIRE, REMOVE_WIRE, TOGGLE_SWITCH, SHORT_CIRCUIT_TRIGGERED, OPEN_CIRCUIT_OBSERVED, GROUND_CIRCUIT_CONNECTED 等）均强类型化，彻底消除 s any。

---

## 3. Sprint 1 教学知识修复
1. **跨步电压**：明确修正为高压电线落地点周围电位分布不均，两脚跨步形成电位差产生跨步电压，高压场景需单脚跳跃或并足跳离。
2. **单相电源总开关**：明确说明单相电闸/漏保开关断开时应同时切断相线（火线）与零线，但若仅切断零线时设备仍带火线电压，故必须确认完全断开相线。
3. **成人心肺复苏 (CPR) 规范**：
   - 按压深度：5~6 cm（避免骨折与按压不足）。
   - 按压频率：100~120 次/分钟。
   - 按压与通气比：30:2。
   - 按压位置：胸骨中下 1/3 交界处（两乳头连线中点）。
4. **专业免责声明**：全环节明确提示本模拟仅用于中职课堂教学，不构成正式医疗/急救认证证书。
