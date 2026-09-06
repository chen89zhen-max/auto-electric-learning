# P1 阶段交接包：统一课程注册、尝试记录和证据框架

- **交付日期**：2026-09-06
- **实施阶段**：P1：统一课程注册、尝试记录和证据框架
- **依据文件**：`docs/design/2026-09-05/` 目录下的《01-总体优化设计》《02-教材目标与关卡覆盖矩阵》《03-Gemini执行任务书》
- **实施者**：Antigravity / Gemini

---

## 1. 实施阶段、起止版本与改动范围

### 1.1 起止基线
- **起始基准提交**：`288ecec` (`fix(visuals): disable entrance character waving sway and smooth breathing animation in workshop`)
- **分支**：`codex/auth-organization-d1-repair`
- **数据库架构版本**：从 Version 6 平滑升级为 **Version 7**（新增迁移脚本 `0007_learning_attempts_evidence.sql`）

### 1.2 本阶段修改与新增文件清单
| 文件路径 | 变更性质 | 核心修改说明 |
|---|---|---|
| `src/courses/registry.ts` | 新增 | 建立前后端共享的统一课程注册表：注册 28 门关卡元数据、7 大篇章归属、先修依赖图、教材任务映射与双向规范ID（`O00`~`F01` 与 `LEVEL_00`~`LEVEL_09`）转换 |
| `src/types/evidence.ts` | 新增 | 定义全课程统一六维证据枚举（安全规范/电路识读/工具测量/规律解释/诊断策略/证据表达）、四阶达成状态（尚无/跟练/独立/迁移）、实物观察状态及单调递增合并规则 |
| `src/types/progress.ts` | 扩展 | 扩展 `LevelProgress` 结构，支持 `attemptCount`、`firstRecord`、`recentRecord`、`bestRecord`、`evidence` 状态矩阵，保持 `createBaseUserProgress` 向后兼容 |
| `src/server/db/migrations/0007_learning_attempts_evidence.sql` | 新增 | SQLite 数据库迁移：扩展 `learning_attempts` 表增加 `mode`、`seed`、`evidence_data`、`rubric_version` 字段，建立 `idx_learning_attempts_replay` 索引并注册 `p1-evidence-v1` 课程版本 |
| `src/server/db/migrationRunner.ts` | 修正 | 更新 `LATEST_SCHEMA_VERSION = 7` |
| `src/server/db/schema.sql` | 同步 | 同步基线表结构定义与迁移 0007 保持一致 |
| `src/server/learning/stateTransitions.ts` | 重构 | 支持规范与历史关卡ID；严格拦截建设中关卡；支持复练（不抛出 ALREADY_COMPLETED，递增次数，保留首次成绩，更新最近与最佳独立，六维证据投影） |
| `src/server/learning/learningEventService.ts` | 扩展 | 学习事件提交写入 `learning_attempts` 扩展字段；实现基于 Payload 一致性的严格幂等与防篡改冲突检查（409 冲突拒绝） |
| `src/stores/userProgressStore.ts` | 扩展 | 暴露注册表查询；`submitLevelCompletion` 支持可选 `allowReplay` 参数并在教师演示模式下拦截写入；`markLevelComplete` 同步记录复练与最佳独立记录 |
| `src/components/CompletionStatus.tsx` | 修正 | 保存关卡完成时挂载对应六维证据映射，在复练时传递 `allowReplay: true` 并在界面提示保留首次成绩 |
| `src/components/CourseMapLobby.tsx` | 升级 | 增加 7 大篇章导航筛选标签；已发布关卡显示复练次数；建设中关卡清晰标明“🛠️ 建设中”徽章与对应教材任务，点击显示提示并严格阻止进入 |
| `src/components/teacher/StudentEvidence.tsx` | 升级 | 展示学生六维证据矩阵状态与核心关卡多 Attempt 复练历史（首次成绩、练习次数、最高成绩、最近时间），保留评价与重训申请表单 |
| `tests/courseRegistry.test.ts` | 新增 | 课程注册表专项单元测试（28关元数据、发布状态隔离、先修校验、双向ID映射） |
| `tests/attemptEvidence.test.ts` | 新增 | 尝试记录与证据集成测试（复练不报错、新attempt生成、首次保留、幂等性、冲突拒绝、建设中关卡拦截、六维证据递增） |
| `tests/deploymentConfig.test.ts` | 适配 | 健康检查接口更新校验 `schemaVersion: 7` |

---

## 2. 目标与关卡覆盖状态

### 2.1 课程注册表已规划的 28 门关卡全景
| 篇章 | 规范关卡ID | 历史别名 | 关卡名称 | 对应教材任务 | 发布状态 |
|---|---|---|---|---|---|
| 序章：来到实训中心 | **O00** | LEVEL_00 | 维修中心第一天 | 职业规范与入职安全培训 | **PUBLISHED (已发布)** |
| 序章：来到实训中心 | **O01** | LEVEL_01 | 安全作业与应急判断 | 学习任务1 用电安全 (15页) | **PUBLISHED (已发布)** |
| 篇章一：把电路看明白 | **A01** | LEVEL_02 | 点亮检修灯 | 学习任务2 电路的认知 (6页) | **PUBLISHED (已发布)** |
| 篇章一：把电路看明白 | A02 | — | 给电路做体检 | 学习任务4 电压和电流的分析与测量 (18页) | UNDER_CONSTRUCTION (建设中) |
| 篇章一：把电路看明白 | A03 | LEVEL_03 | 元件身份核验 | 学习任务3 电阻的识别和测量 (14页) | UNDER_CONSTRUCTION (建设中) |
| 篇章一：把电路看明白 | A04 | LEVEL_04 | 电流到底走哪里 | 学习任务4 电压和电流的分析与测量 (18页) | UNDER_CONSTRUCTION (建设中) |
| 篇章二：让电路按要求工作 | B01 | — | 找出变化规律 | 学习任务5 欧姆定律的应用 (8页) | UNDER_CONSTRUCTION (建设中) |
| 篇章二：让电路按要求工作 | B02 | — | 灯组改装 | 学习任务6 负载的连接 (16页) | UNDER_CONSTRUCTION (建设中) |
| 篇章二：让电路按要求工作 | B03 | — | 追踪节点与回路 | 学习任务4/6 (18/16页) | UNDER_CONSTRUCTION (建设中) |
| 篇章二：让电路按要求工作 | B04 | — | 工位用电预算 | 学习任务7 电能和电功率的分析 (9页) | UNDER_CONSTRUCTION (建设中) |
| 篇章二：让电路按要求工作 | B05 | — | 电源为什么带不动 | 学习任务5 欧姆定律的应用 (8页) | UNDER_CONSTRUCTION (建设中) |
| 篇章二：让电路按要求工作 | B06 | — | 传感器信号与分压 | 学习任务6 负载的连接 (16页) | UNDER_CONSTRUCTION (建设中) |
| 篇章三：凭证据找故障 | C01 | — | 越来越暗的灯 | 学习任务8 电压降的分析 (9页) | UNDER_CONSTRUCTION (建设中) |
| 篇章三：凭证据找故障 | C02 | LEVEL_08 | 同样不亮，原因不同 | 学习任务9 电路的检查 (9页) | UNDER_CONSTRUCTION (建设中) |
| 篇章三：凭证据找故障 | C03 | LEVEL_09 | 第一次独立交车 | 学习任务9 电路的检查 (9页) | UNDER_CONSTRUCTION (建设中) |
| 篇章四：让电和磁配合工作 | D01 | LEVEL_05 | 小开关控制工作灯 | 学习任务11 磁现象的探究 (11页) | UNDER_CONSTRUCTION (建设中) |
| 篇章四：让电和磁配合工作 | D02 | — | 让电机转起来 | 学习任务12 电动机的认知 (16页) | UNDER_CONSTRUCTION (建设中) |
| 篇章四：让电和磁配合工作 | D03 | — | 转动为什么能发电 | 学习任务13 交流发电机的认知 (29页) | UNDER_CONSTRUCTION (建设中) |
| 篇章四：让电和磁配合工作 | D04 | — | 断开开关后的现象 | 学习任务14 自感与互感现象的分析 (15页) | UNDER_CONSTRUCTION (建设中) |
| 篇章四：让电和磁配合工作 | D05 | — | 变压器实验室 | 学习任务19 变压器的认知 (13页, 选学) | UNDER_CONSTRUCTION (建设中) |
| 篇章五：感知、判断与执行 | E01 | — | 电流的单向通道 | 学习任务15 二极管及其应用的分析 (17页) | UNDER_CONSTRUCTION (建设中) |
| 篇章五：感知、判断与执行 | E02 | — | 断电后为何还有电 | 学习任务10 电容器及其特性的分析 (13页) | UNDER_CONSTRUCTION (建设中) |
| 篇章五：感知、判断与执行 | E03 | — | 从交流到直流 | 学习任务15/10/13 整流滤波 | UNDER_CONSTRUCTION (建设中) |
| 篇章五：感知、判断与执行 | E04 | LEVEL_07 | 小信号控制负载 | 学习任务16 三极管及其应用的分析 (8页) | UNDER_CONSTRUCTION (建设中) |
| 篇章五：感知、判断与执行 | E05 | LEVEL_06 | 电路的条件判断 | 学习任务17 逻辑门电路的认知 (7页) | UNDER_CONSTRUCTION (建设中) |
| 篇章五：感知、判断与执行 | E06 | — | 转速信号寻踪 | 学习任务13 交流发电机 (转速传感器) | UNDER_CONSTRUCTION (建设中) |
| 篇章五：感知、判断与执行 | E07 | — | 装配一块训练板 | 学习任务18 印制电路板的焊接 (10页) | UNDER_CONSTRUCTION (建设中) |
| 篇章六：完成综合交付 | F01 | — | 实训中心交付挑战 | 综合交付挑战 (T01~T18) | UNDER_CONSTRUCTION (建设中) |

### 2.2 本阶段明确未实现项与原因
- **A02~A04 电压/测阻/电流仪表测量与直流仿真模型**：未实现。原因：安排在 P2 阶段实施。
- **B01~B06 直流规律与设计**：未实现。原因：安排在 P3 阶段实施。
- **C01~C03 直流诊断闭环**：未实现。原因：安排在 P4 阶段实施。
- **建设中关卡禁止提前上线**：上述关卡在注册表与服务层被严格阻断访问，大厅明确打上“建设中”标签。

---

## 3. 核心机制与验收准则对齐

### 3.1 尝试记录与进度汇总分离机制 (Attempt vs Progress Separation)
1. **多 Attempt 独立存储**：
   - 每次关卡完成（包括复练）均在 SQLite `learning_attempts` 表写入一条独立的尝试记录，保存本次的 `attempt_id`、`mode`（guided/independent/transfer）、`score`、`started_at`、`completed_at`、`evidence_data`。
2. **汇总进度多维维护**：
   - `user_progress.levels[levelId]` 维护：
     - `score`: 保留**首次完成成绩**，满足历史成绩和既有业务断言不被覆盖的铁律。
     - `attemptCount`: 记录该关卡累计练习总次数。
     - `firstRecord`: 首次完成尝试快照。
     - `recentRecord`: 最近一次完成尝试快照。
     - `bestRecord`: 最佳独立尝试快照（高分优先，同分独立模式优先）。
     - `evidence`: 聚合六维证据当前最高达成阶级。

### 3.2 六维证据状态引擎 (Six-Dimensional Evidence Framework)
- 六维维度：
  1. `SAFETY_SPECIFICATION`（安全规范）
  2. `CIRCUIT_READING`（电路识读）
  3. `TOOL_MEASUREMENT`（工具测量）
  4. `RULE_EXPLANATION`（规律解释）
  5. `DIAGNOSTIC_STRATEGY`（诊断策略）
  6. `EVIDENCE_EXPRESSION`（证据表达）
- 四阶达成水平：`NO_EVIDENCE` (0) < `GUIDED_COMPLETE` (1) < `INDEPENDENT_COMPLETE` (2) < `TRANSFER_COMPLETE` (3)。
- 单调递增合并：新 Attempt 的证据达成按最高阶更新，后一次低阶尝试绝不抹除前一次的高阶证据。

### 3.3 严格幂等性与篡改冲突拒绝
- 客户端因弱网重试提交**相同 `eventId` 且相同 `payload`**：服务端查重后幂等返回已存在的投影和 attemptId，不产生冗余数据（`idempotent: true`）。
- 客户端伪造或篡改已有 `eventId` 的 payload 内容（如改写分数或模式）：服务端校验冲突，严格返回 `409 Conflict`（`EVENT_ID_CONFLICT`：相同事件编号已存在但事件内容不一致）。

### 3.4 建设中关卡访问阻断
- 前端大厅：`A02` 及未发布关卡显示 `🛠️ 建设中` 徽章，点击弹出提示通知且不执行页面跳转。
- 服务端 API：直接向 `/api/learning/events` 发送未发布关卡（如 `A02`、`LEVEL_03`）的事件，服务端状态机抛出 `LearningTransitionError('LEVEL_LOCKED')`，接口返回 `422 Unprocessable Entity` 且不入库。

### 3.5 教师演示与数据安全隔离
- 教师开启“演示模式”：可在本地预览和切换关卡，但前端禁止触发向学生写入的 `submitLevelCompletion`。
- 服务端 `/api/learning/events` 鉴权严格限定仅 `student` 角色可用，教师或管理员调用直接返回 `403 Forbidden`。

---

## 4. 实际执行的测试命令与质量门禁

| 验证命令 | 结果 | 耗时 | 验证范围与核心证据 |
|---|---|---|---|
| `npm test` | **27 个测试套件全部通过 (173/173 tests passed)** | 4.95s | 覆盖课程注册、多尝试复练、六维证据、幂等查重、冲突拒绝、班级隔离、Session鉴权、备份还原 |
| `npm run typecheck` | **0 错误** | 2.8s | TypeScript 全项目严格类型检查无任何类型报错 |
| `npm run lint` | **0 错误，0 警告** | 1.1s | Oxlint 158 个源码文件 208 条规则扫描全绿 |
| `npm run build` | **构建成功** | 5.2s | `vinext build` 生成 standalone 部署制品，包含客户端与服务端 SSR 全量 Chunk |

---

## 5. 当前启动方式与测试入口

```bash
# 启动本地开发服务
npm run dev
# 浏览器访问：http://localhost:3000
```

- **内置测试账号**（开发/测试环境）：
  - 学员账号：`student1`，密码：`Student#2026`（属于 24新能源1班，张晓明）
  - 学员账号：`student2`，密码：`Student#2026`（属于 24新能源2班，李小华）
  - 教师账号：`teacher`，密码：`Teacher#2026`（陈老师，任教 1 班）
  - 教师账号：`teacher2`，密码：`Teacher#2026`（李老师，任教 2 班）
  - 管理员账号：`admin`，密码：`Admin#2026`

---

## 6. 回滚与恢复步骤

若后续需要对 P1 阶段进行回滚：
1. **代码回滚**：检出到上一个提交 `288ecec` 即可恢复 P0 状态。
2. **数据库架构回滚**：
   - 数据库版本为递增式（Version 6 -> 7）。
   - 若需回退数据库，可执行：
     ```sql
     DELETE FROM schema_migrations WHERE version = 7;
     DELETE FROM course_versions WHERE id = 'cv_auto_elec_p1_v1';
     ```
   - SQLite 支持忽略新增的无默认值破坏列，原有进度和尝试数据完全保全。

---

## 7. 交付结论

**P1：统一课程注册、尝试记录和证据框架** 已经全部完成并通过全部 173 项自动化测试与构建验收。已准备好交接包，等待用户通知 Codex 进行 P1 阶段复验。复验通过后，即可推进下一阶段 **P2：基础测量样板（A02—A04）**。
