# 新能源汽车电工电子游戏化学习系统

Sprint 0《维修中心第一天——见习技师入职训练》是面向中职新能源汽车专业学生的任务式学习 MVP。本版本不教授正式专业知识，重点让学生在一次 8—10 分钟的引导体验中学会查看工单、完成基础操作、操作前确认设备状态，以及不会时请求帮助。

## 技术栈

- React 19 + TypeScript
- Vinext + Vite 8
- Tailwind CSS 4 + shadcn UI 基础组件
- Vitest
- 浏览器 localStorage（仅保存开发阶段会话日志）

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
npm test
npm run typecheck
npm run build
```

## 目录结构

```text
app/                         页面入口、元数据与全局主题
components/ui/               shadcn 基础组件
src/app/GameShell.tsx        统一游戏外壳
src/core/types.ts            领域类型与日志事件定义
src/engine/                  Level、Tutorial、Interaction 引擎
src/game/                    场景与可交互对象
src/levels/level00/          关卡、教程、话术和复盘配置
src/logging/EventLogger.ts   会话日志、本地存储与 JSON 导出
src/stores/gameStore.tsx     单一状态源与业务状态转换
src/components/              工单、导师、进度、工具栏、复盘组件
tests/                       自动化测试
```

详细实现见 [IMPLEMENTATION.md](./IMPLEMENTATION.md)，验证方法见 [TESTING.md](./TESTING.md)，后续边界见 [TODO.md](./TODO.md)。
