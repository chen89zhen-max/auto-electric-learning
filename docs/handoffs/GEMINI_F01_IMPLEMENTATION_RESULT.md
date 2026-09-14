# GEMINI F01 实施移交报告

【状态】
COMPLETED（已全量实施、严格通过全部质量门禁与端到端回归，正式交付）

【完成结果】
1. **F01 纯模型与确定性故障包 (Task 1, Commit `fda0d0b`, `4a44eac`)：**
   - 实现了新能源汽车低压智能检修灯控制总成的全套物理与逻辑解算器（`src/levels/f01/f01Model.ts`）。
   - 内置三种基于哈希伪随机轮换的确定性故障包（F01-A、F01-B、F01-C），覆盖通电前装配缺陷、运行态压降/开路故障、安全守卫拦截（带电测电阻/蜂鸣档、危险短接等）。
   - 包含纯函数证据校验器 `validateF01CompletionMetrics`，对阶段顺序、测量台账、四工况逻辑矩阵、2kΩ/1kΩ 分压参数迁移与双实测答辩证据进行服务端可复用的严格核验。
   - 编写了 A/B/C 三种故障包及 2kΩ/1kΩ 分压参数迁移判据的确定性抽检单元测试。

2. **五阶段实训文案与六维量规标准 (Task 2, Commit `456e3f1`)：**
   - 编写了规范的五阶段实训引导、故障现象、安全警示文案（`src/levels/f01/f01Training.ts`），严格遵守职业教育线上虚拟仿真实训规范，严禁“教师签字/现场验收”等伪线下词汇。
   - 在 `src/assessment/rubrics.ts` 中注册了 F01 专属六维量规权重（`F01_SPEC`），对误判、求助提示、违章操作、重试均有量化扣分规则。

3. **综合电路诊断场景 (Task 3, Commit `2f99668`)：**
   - 实现了 `F01IntegratedDeliveryScene.tsx`，包含 12V/5V 双回路动态 SVG 拓扑图、交互式数字万用表面板（挡位旋钮、红黑表笔插孔、测点探针、动态读数与安全告警）、测量台账记录列表、四工况功能矩阵复检界面以及双证据答辩勾选机制。

4. **体验外壳与能力报告 (Task 4, Commit `345025e`)：**
   - 实现了 `F01Experience.tsx`，严格遵循统一视觉与布局规范（`app-shell`、`topbar`、`workspace`、`scene-panel`、`objective-strip`、`tutor-panel`、`bottom-bar`）。
   - 导师控制（`SpeechControls`）置于第一排、提示文字在第二排；正文严格遵守无未标记 `text-xs` 排版规范；通关后完整呈现 `AbilityReport` 并在重开时保留服务端考试计时。

5. **正式发布与服务端证据硬校验 (Task 5, Commit `ae8299b`)：**
   - 将 F01 在 `src/courses/registry.ts` 正式发布为最终关卡（`PUBLISHED`，版本 `1.0.0/v2`，全课程第28关），前置要求明确为 `['C03', 'E03', 'E04', 'E05', 'E07']`。
   - 在 `src/app/levelComponents.tsx` 中建立懒加载映射；在 `stateTransitions.ts` 与 `learningEventService.ts` 中强制要求 F01 必须提交带真实过程的量规评测数据，并严格核对故障种子与物理完成证据，持久化到 `learning_attempts` 表中。

6. **浏览器角色链与响应式契约 (Task 6 & Task 7, Commit `c4fb440`, `16856bf`, `40f7a24`, `668e9a7`)：**
   - 编写了 `tests/browser/f01-completion.spec.ts`，验证游客前置拦截（零写请求）、学员端全五阶段完整通关、服务端权威计时/耗时计算、任务大厅卡片与最近成绩渲染、轮换重考及最近成绩更新机制、200% 等效缩放无水平溢出。
   - 在 `tests/browser/role-and-preview.spec.ts` 中验证了教师角色免前置要求直接预览包括 F01 在内的全部 28 个关卡。

【修改与新增位置】
- **新增模块与测试：**
  - `src/levels/f01/f01Model.ts`：纯数学与物理电路模型、故障包、安全规则与证据校验。
  - `src/levels/f01/f01Training.ts`：五阶段实训文案与专业指导。
  - `src/levels/f01/F01IntegratedDeliveryScene.tsx`：综合诊断场景与万用表交互。
  - `src/levels/f01/F01Experience.tsx`：关卡外壳、五阶段状态流转与能力报告。
  - `tests/f01Model.test.ts`：模型公式、A/B/C 包抽检与证据验证测试。
  - `tests/helpers/f01TestFixtures.ts`：合法完成证据测试夹具。
  - `tests/f01Training.test.ts`：实训文案与不泄题断言。
  - `tests/f01Scene.test.tsx`：场景交互与表单门禁测试。
  - `tests/f01Experience.test.tsx`：外壳、重开机制与排版规范测试。
  - `tests/f01LearningIntegration.test.ts`：服务端证据硬校验与重考持久化测试。
  - `tests/browser/f01-completion.spec.ts`：浏览器端到端全流程与重考测试（兼容多浏览器共享库连续运行与分钟级耗时格式）。
- **接入与配置调整：**
  - `src/assessment/rubrics.ts`：注册 F01 六维评分量规（`F01_SPEC`）。
  - `src/courses/registry.ts`：发布 F01 关卡为 `PUBLISHED`。
  - `src/app/levelComponents.tsx`：更新为 28 关并注册 F01 懒加载组件。
  - `src/server/learning/stateTransitions.ts`：将 F01 纳入强制量规关卡并校验 assessment levelId。
  - `src/server/learning/learningEventService.ts`：核验 F01 种子与完成证据，持久化到 `learning_attempts`。
  - `src/components/CompletionStatus.tsx`：通用化量规提示文案。
  - `scripts/browser-e2e/seed-isolated-db.test.ts`：为 student1 写入前置关卡支持端到端实训。
  - `tests/browser/role-and-preview.spec.ts`：纳入 F01 教师直接预览测试。
  - `tests/attemptEvidence.test.ts`、`tests/courseRegistry.test.ts`、`tests/levelComponentRegistry.test.ts`、`tests/directLevelAccess.test.tsx`、`tests/levelRoute.test.ts`：更新 28 关断言。

【质量门禁验证记录】
1. **F01 专项 Vitest 套件：**
   - 9 个相关测试文件，50 个专项用例全部通过（0 failed）。
2. **全量 Vitest 测试套件 (`npm test`)：**
   - 82 个测试文件，519 个测试用例全部通过（0 failed）。
3. **静态质量门禁：**
   - `npm run typecheck`（`tsc --noEmit`）：通过（0 errors，退出码 0）。
   - `npm run lint`（`oxlint`）：通过（0 warnings, 0 errors，退出码 0）。
   - `npm run build`（`vinext build`）：通过（成功生成 `dist/standalone/server.js`，退出码 0）。
   - `git diff --check`：通过（无空白或冲突标记，退出码 0）。
4. **Playwright 浏览器端到端测试：**
   - `tests/browser/f01-completion.spec.ts`：Chrome 与 Edge 双浏览器 6 个测试全部通过（0 failed）。
   - `tests/browser/role-and-preview.spec.ts`：Chrome 教师全 28 关直接预览及角色隔离全部通过（0 failed）。
5. **A/B/C 故障包与迁移判据抽检：**
   - A 包（反接续流二极管 + 电源接插件高阻）、B 包（电源对地焊锡桥接 + 分压上臂开路）、C 包（继电器虚焊 + 地线虚接）以及 2kΩ/1kΩ 分压迁移使输出低于 2.0V 门槛阻断继电器的物理判据均在 `tests/f01Model.test.ts` 专项断言并通过。

【Git 提交记录清单】
- `fda0d0b` feat(f01): add deterministic integrated circuit model
- `456e3f1` feat(f01): define stages content and assessment rubric
- `2f99668` feat(f01): build integrated diagnostic scene
- `345025e` feat(f01): add five-stage experience shell
- `ae8299b` feat(f01): publish final level with server evidence enforcement
- `c4fb440` test(f01): verify roles replay timing and responsive completion
- `16856bf` fix(f01): resolve typecheck and lint issues in f01 scene and browser specs
- `40f7a24` test(f01): resolve multi-project attempt count in browser completion spec
- `668e9a7` test(f01): tolerate minute-formatted duration in browser completion spec
- `4a44eac` test(f01): add deterministic spot-check for packages A, B, C and transfer divider
