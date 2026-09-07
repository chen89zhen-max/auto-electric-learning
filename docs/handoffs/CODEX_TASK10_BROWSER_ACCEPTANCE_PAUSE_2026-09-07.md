# Codex Task 10 真实浏览器验收暂停移交（2026-09-07）

## 1. 暂停原因与恢复原则

用户提示额度临界，当前仍有多项真实浏览器与整体门禁未完成，因此主动暂停，不再启动长时间测试或新开发。恢复时必须从本文件“下一次精确起点”继续，不重复已通过的 120 项版式矩阵和已确认的单项测试。

当前分支：`codex/auth-organization-d1-repair`。工作区含用户原有未跟踪资料，不得清理或覆盖。

## 2. 已完成的代码与测试基础设施

- 新增 Playwright 真实浏览器验收：Chrome、Edge 系统通道，隔离的绝对 `APP_DATA_DIR`，每次运行独立数据库与产物目录。
- Windows 生命周期已改为由 `global-setup.ts` 直接启动 `dist/standalone/server.js`、记录精确 PID，并由 `global-teardown.ts` 精确终止；已验证测试结束后 4175 端口无监听残留。
- `GameShell.tsx` 修复教师从直接 URL 只读预览已发布关卡；管理员仍只能进入管理控制台；F01 仍拒绝预览。
- `app/api/learning/evaluations/route.ts` 增加按 `levelId` 读取当前学生本人 E07 评价，继续执行所有权校验。
- E07 浏览器红灯发现并修复两项真实契约缺陷：教师端应发送 `rubricItems`；教师查询服务应返回页面声明的 `hasPhysicalRubric/physicalEvaluation` 结构。评分上限、唯一签署和班级权限未放宽。
- 语音浏览器红灯发现并修复：`speechSynthesis` 属性存在但不可调用时页面会崩溃；现改为检查 `speak` 可调用并降级到文字提示。

## 3. 已取得、无需重复的验证证据

- P4-P6 版式矩阵：15 关 × 2 分辨率（1366×768、1920×1080）× 2 字号比例（100%、200%）。Chrome 60/60、Edge 60/60 通过。覆盖首屏标题、步骤、主操作、横向溢出和键盘焦点可见。
- 教师 27 个已发布关卡直接预览：Chrome 通过；F01 拒绝进入；学生越权直接进入 C01 被前置规则拦截。
- D02/D03/D04 后续实测门禁：Chrome 3/3 通过。D02 验证 `s3Observed`，D03 验证 `s2MeterTested`，D04 验证 `s1SparkOccurred`；此前对 D02/D03 第一阶段概念题的误判测试已删除。
- C01 带载灯操作、C03 真实 Wiggle Test 已写入浏览器测试；代理报告前四项运行通过，但完整文件最终汇总尚未取得，恢复后只需运行该文件确认。
- 语音与弱网：Chrome 中“男声音色选择+静音持久化”通过，“延迟 D05 分包显示加载骨架并恢复”通过；不支持语音降级逻辑已修复，最后一次只因断言引用了错误导师文案失败，断言已改正但尚未复跑。
- TypeScript 严格检查在本轮 E07 修复后通过。

## 4. 当前未完成项目（不得宣称 Task 10 已闭环）

1. `tests/browser/level-interactions.spec.ts` 当前共 14 项：缺 C02 四类故障真实切换；E07 当前只是开关工单，不满足“虚拟完成后等待教师验收”。其余 D01/D05/E01-E06 为真实开关工单，但交互深度较低，应由 SOL 判断是否足够。
2. `tests/browser/roles-and-e07-lifecycle.spec.ts`：
   - 教师 A/B 班级隔离和 Teacher B 跨班查询/签署 403 已在 Chrome 通过。
   - 教师 A 的 UI 签署已经成功并显示只读签署卡；学生读取环节上次因 `levelId` 选中了另一个更新但未签署的 Edge 专用尝试而返回 404，测试刚改为按本项目的精确 `attemptId` 读取，尚未复跑。
   - 管理员创建班级、分配教师、转班、教师可见性验证、恢复归班、撤销任教、归档班级的完整 UI 用例已写，尚未首次运行。
3. `tests/browser/speech-and-resilience.spec.ts` 的不支持语音降级用例需复跑；之后整个文件需 Edge 复跑。
4. 27 关直接预览、角色/E07、15 关交互、语音/弱网需要 Edge 最终复核；不要重复已经通过的 Edge 60 项版式矩阵，除非相关页面布局代码再次变化。
5. SQLite 生产边界、迁移、备份与恢复需运行现有专项测试，并用独立临时绝对目录启动一次 production standalone，读取 `/api/health` 的 `quick_check`/schema 结果后精确停止。
6. 最终整体门禁尚未运行：`npm test`、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check`、两浏览器剩余 Playwright 套件。
7. F01 尚未开始，必须等 Task 10 验收闭环后另行完成设计确认，不能与本批混做。

## 5. 下一次精确起点

按以下顺序继续，前一项通过后再进入下一项：

1. 检查 4175 端口无监听；运行 Chrome：`roles-and-e07-lifecycle.spec.ts`。先修测试选择器/契约，不重复改权限规则。
2. 补齐 `level-interactions.spec.ts` 的 C02 四故障与 E07 真正完成等待态，运行该文件 Chrome，目标至少 15 关各一项并全部通过。
3. 运行 `speech-and-resilience.spec.ts` Chrome，确认 3/3；随后运行上述三组及 `role-and-preview.spec.ts` Edge。
4. 运行 SQLite 专项与 production standalone 健康检查。
5. 运行全部代码门禁和剩余真实浏览器套件，审查失败项后才可出最终结论。

## 6. 多代理使用记录

- `luna_explorer/task8_state_audit`：只读核查字体；发现 SVG 内仍有 82 处 10/11px，现有测试未覆盖 SVG 计算字号，未修改文件。
- `luna_explorer/browser_e2e_mapping`：只读梳理浏览器入口、账号和隔离数据库；发现教师直接预览被 `GameShell` 分支阻断。
- `terra_worker/task10_browser_impl`：仅负责 Playwright 测试与最小教师预览实现；后续曾错误定位 D02/D03 第一阶段，返工后改为正确后续门禁。它未完成 15/15，SOL 已接回，不得引用其“完成”结论。

## 7. 当前风险

- SVG 小字号问题仍未处理，若 Task 8 的 `text-sm` 标准包含 SVG 标注，则整改不能算 100% 完成。
- 真实群晖 NAS 并发 I/O 和机房终端离线男声音质仍需现场验证，自动化不能替代。
- 浏览器测试文件、Playwright 配置及本移交文档当前可能仍为未跟踪文件；恢复后先看 `git status --short`，不要删除。
