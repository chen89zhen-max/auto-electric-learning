# Sprint 0 实现说明

## 当前实现

本版本完整实现七阶段流程：`WELCOME → READ_WORK_ORDER → INTERACTION_TUTORIAL → SAFETY_PRECHECK → HELP_TUTORIAL → REVIEW → COMPLETE`。

学生可以查看并接受工单；使用拖放或“点击训练件—点击目标位置”的方式放置无电训练件；观察训练台状态、切断电源并打开护盖；在未知内容前请求陈师傅提示；完成两项不计分的情境确认；取得见习技师入职认证并进入任务大厅。学习任务 1 仅显示 `Coming Soon`，没有开发其教学内容。

## 核心状态机

`src/stores/gameStore.tsx` 是唯一业务状态转换入口。界面组件只派发意图，不自行决定关卡跳转、目标完成、危险操作结果或日志内容。

核心状态包括当前关卡与阶段、工单状态、训练件位置、训练台电源、护盖状态、帮助状态、目标完成情况、功能解锁情况、复盘答案与事件日志。重新开始会建立新 session，并恢复简报规定的全部初始值。

## LevelEngine

`src/engine/LevelEngine.ts` 从 `src/levels/level00/level00.json` 读取关卡标识、流程、目标和解锁项，负责创建初始状态、推进阶段、去重完成目标及判断所有目标是否完成。新增关卡时应增加新的配置文件和对应场景适配，不应在页面中加入 `if (level === 0)` 一类判断。

## TutorialEngine

`src/engine/TutorialEngine.ts` 从 `tutorial.json` 读取每一步的当前任务、允许操作、完成目标、所需状态和下一阶段。危险护盖操作的准入规则集中在该引擎中：只有电源为 `OFF` 才允许打开；电源为 `ON` 时状态保持 `CLOSED`，并记录危险操作尝试。

## InteractionEngine

`src/engine/InteractionEngine.ts` 统一判断训练件是否可选、可点击放置或可拖放，确保鼠标拖动和触控点击替代方式使用同一业务规则。

## EventLogger

`src/logging/EventLogger.ts` 生成统一结构的 ISO 时间戳事件。当前会话日志保存在内存状态中，并按 session 写入 localStorage；开发模式工具栏可以导出本次会话 JSON。localStorage 不可用或已满时不会阻断学习流程。

## 教学规则落实

- 功能栏按阶段渐进解锁。
- 危险操作被阻止，不扣分、不播放事故效果，也不显示“错误”。
- 学生首次正确完成时直接进入下一步骤，不补演错误流程。
- 陈师傅使用固定配置话术，不接入 LLM。
- 本关不显示分数、等级、排名或复杂奖励。
- 所有主要按钮至少 44 CSS px；拖放提供点击替代操作。
