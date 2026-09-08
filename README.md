# 新能源汽车电工电子游戏化学习系统

面向中职新能源汽车专业学生的任务式学习系统。目前包含：

- Sprint 0《维修中心第一天——见习技师入职训练》：完成基础操作与软件入职训练。
- Sprint 1《实训车间突发事故——安全用电》：通过事故、人员处置、电气火情和陌生设备迁移情境，形成“观察—判断—控制危险—处置—确认”的职业决策链。
- Sprint 2《点亮第一盏检修灯》：构建核心电路图拓扑算法、多段与旁路短路检测、闭环断路与车身搭铁单线制仿真、六卡规范动作排序复盘与五维过程能力雷达图。

Sprint 0—2 不接入外部 LLM，不做死记硬背的答题游戏。危险动作统一交由 `SafetyRuleEngine` 严格审查（默认拒绝），电路拓扑与工作逻辑由独立 `CircuitTopologyEngine` 进行图分析判定。

## 技术栈

- React 19 + TypeScript
- Vinext + Vite 8
- Tailwind CSS 4 + shadcn UI 基础组件
- Vitest
- Node.js 原生 SQLite（账号、班级、教师关系、学习结果与评价）
- HttpOnly 会话认证；浏览器 localStorage 仅用于进度缓存，登录后以服务端记录为准

简报将 Vue 3 列为推荐技术栈。本项目采用 Sites 官方脚手架提供的 React/Vinext 运行时，但保留了同等的配置层、引擎层、状态层、场景层和界面组件层，课程内容没有写死在页面组件中。

## 安装与运行

要求 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

按终端提示打开本地地址（默认 `http://localhost:3000`）。

## 验证命令

```bash
npm test          # 运行全部自动化测试（当前 147 项）
npm run lint      # 代码规范与无障碍检查 (oxlint)
npm run typecheck # 严格类型检查 (tsc --noEmit)
npm run build     # 生产环境编译构建
```

## 目录结构

```text
app/                         页面入口、元数据与全局自适应样式
components/ui/               shadcn 基础组件
src/circuit/                 电路无向图拓扑、路径分析与短路检测引擎
src/safety/                  统一安全规则引擎（优先级匹配、严格默认拒绝）
src/abilities/               过程能力评价与报告得分计算
src/stores/                  关卡状态机（level01Store、level02Store）与用户进度（userProgressStore）
src/levels/level00/          Sprint 0 入职培训场景与交互
src/levels/level01/          Sprint 1 车间突发事故场景、急救与火情仿真
src/levels/level02/          Sprint 2 检修灯电路认知、接线、断路、搭铁与复盘
src/components/              课程大厅、工单、导师、顶栏、能力报告组件
tests/                       账号权限、数据关联、关卡逻辑、电路与动画状态回归测试
```

- Sprint 0 文档：[IMPLEMENTATION.md](./IMPLEMENTATION.md) 与 [TESTING.md](./TESTING.md)
- Sprint 1 文档：[IMPLEMENTATION_SPRINT1.md](./IMPLEMENTATION_SPRINT1.md) 与 [TESTING_SPRINT1.md](./TESTING_SPRINT1.md)
- Sprint 2 文档：[IMPLEMENTATION_SPRINT2.md](./IMPLEMENTATION_SPRINT2.md) 与 [TESTING_SPRINT2.md](./TESTING_SPRINT2.md)
- 已知问题与边界：[KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
- 群晖部署与更新：[群晖部署指南](docs/群晖部署指南.md)
- 群晖备份与恢复：[SQLite 备份与恢复操作规程](docs/operations/SYNOLOGY_BACKUP_RESTORE.md)

## 本次完善（2026-09-05）

- 切换账号时清空上一账号的界面进度，丢弃过期异步响应；学习结果保存时校验当前账号归属。
- 结算按能力报告计算成绩，显示保存中、成功和失败重试状态；重复练习保留原有已记录成绩。
- 修复断路实验进入开关实验后无法重新亮灯、课程地图成绩固定显示 100 分、目标计数超出总数等问题。
- 增加教学车外观、车架透视、灯光与电流方向动画，以及学员、导师和急救训练模型动作；支持减少动态效果的系统设置。
- 验收记录见 [功能与动画验收](docs/verification/2026-09-05-functional-animation.md)。
