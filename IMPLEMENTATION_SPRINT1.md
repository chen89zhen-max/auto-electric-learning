# Sprint 1 实现说明

## 实现边界

Sprint 1 复用 Sprint 0 的 `GameShell`、`LevelEngine`、`EventLogger`、工单与导师交互模式，没有开发 Sprint 2、LLM、复杂 CPR 或火灾物理仿真。项目沿用 React/Vinext 技术栈，因此简报中的 `.vue` 组件以等价的 `.tsx` 组件实现。

## SafetyRuleEngine v1.0

核心文件：

- `src/safety/SafetyRuleEngine.ts`：按配置顺序查找第一个完全匹配当前上下文的规则，返回统一的 `SafetyDecision`。
- `src/safety/safetyTypes.ts`：定义 `SafetyContext`、`SafetyDecision` 和当前及未来操作类型。
- `src/safety/safetyRules.json`：保存规则条件、是否允许、严重度、消息键和可选后果。

页面不判断“带电时能不能接触人员”“电气火情能不能用水”等业务规则。页面只发出操作，关卡状态层构造上下文并调用 `SafetyRuleEngine.evaluate()`。规则判断与界面提示、事件记录分离。

当前实现的规则包括：带电直接接触倒地人员、带电设备火情使用灭火器、直接用水、不适用灭火器、带电开设备和带电换件。配置同时预留带电测阻、电流挡并联、表笔插孔错误、短路、熔断器规格、带电换件和不安全跨接等未来规则类型。

### 新增安全规则

1. 在 `safetyTypes.ts` 的 `SafetyOperation` 中补充操作类型（已有类型可跳过）。
2. 在 `safetyRules.json` 的 `SAFE_DEFAULT` 前增加具体规则。
3. `when` 只填写必须匹配的上下文字段；具体规则放在通用规则之前。
4. 在关卡状态层调用引擎，并依据 `ruleId` / `messageKey` 记录事件和显示固定脚本。
5. 增加规则单元测试，至少覆盖允许与阻止两条路径。

## ScenarioEngine

`src/scenario/ScenarioEngine.ts` 负责读取 `src/levels/level01/scenario.json`，提供当前阶段配置、可用操作判断和下一阶段。剧情状态与可操作对象因此没有散落在按钮事件中。Sprint 1 自己的状态转换集中在 `src/stores/level01Store.tsx`，Sprint 0 仍使用原状态工厂，避免回归。

## AbilityTracker

`src/abilities/AbilityTracker.ts` 使用过程数据生成五个维度的 1—5 星报告：环境观察、危险识别、危险源控制、应急决策、规范操作。它不只计算总分，还保留危险操作尝试、是否观察状态、是否隔离危险源、提示次数和火情处置方式。报告只在正确完成迁移测试和复盘后生成。

## 知识卡与复盘

- `src/components/KnowledgeCard.tsx`：只在学生经历现象或控制危险源后显示一句核心解释和一张三段简图。
- `src/reflection/ReflectionEngine.ts`：读取 `review.json`，核验“观察—判断—控制危险—处置—确认”的顺序。
- `src/components/AbilityReport.tsx`：显示能力维度、关键过程证据和下一任务，但不开放 Sprint 2。

## 急救参数

`src/levels/level01/firstAidConfig.json` 集中保存 `compressionRate`、`compressionDepth`、`compressionRatio`、`breathConfig` 等字段。当前值为 `null`，并明确标记正式教学前必须由学校依据现行急救培训标准进行专业复核。代码没有硬编码医学参数。

## 事件日志结构

所有日志沿用 `GameEvent`：`sessionId`、`levelId`、`stage`、`action`、`timestamp`、`payload`。Sprint 1 记录关卡开始、事故发现、观察和电源查看、危险接触尝试、隔离、知识卡、微情境、人员判断、呼叫支援、急救完成、火情、器材选择、危险火情响应、迁移测试、复盘、能力报告和关卡完成。开发环境可导出 JSON；浏览器本地仅保留当前会话日志。

## 两个里程碑

- 里程碑 1：事故发现 → 观察 → 危险接触阻止 → 断电 → 触电微学习。
- 里程碑 2：人员处置 → 电气火情 → 迁移测试 → 复盘 → 能力报告。

两部分分别形成 Git 提交，便于独立试玩和回退。
