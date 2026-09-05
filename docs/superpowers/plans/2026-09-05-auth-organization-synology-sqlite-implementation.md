# 账号、教学组织与群晖 SQLite 生产部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保持 Sprint 0—2 正常运行的前提下，完成三角色、教学组织、学习数据及群晖 Node＋SQLite 单机生产环境整改。

**Architecture:** 生产使用 Vinext standalone Node 产物和唯一的原生 SQLite 数库，数据库位于群晖持久卷。账号、任教、归班和学习事件全部由服务端授权；生产数据库失败时进程退出，不回退到 WASM、JSON 或内存。

**Tech Stack:** Vinext 1.0.0-beta.9、React 19、TypeScript、Node 24 LTS、`node:sqlite`、Docker Compose、Vitest、Playwright/Chrome/Edge。

**Spec:** `docs/superpowers/specs/2026-09-05-auth-organization-synology-sqlite-design.md`

## Global Constraints

- 不开发 Sprint 3；不修改 Sprint 0—2 的教学知识与状态机，除非是学习事件接入必需改动。
- 不覆盖当前工作区内 Gemini 和用户未提交的视觉与 Sprint 2 改动。
- 生产只允许一个应用容器实例。
- 生产数据库只允许 `node:sqlite`；不得静默降级。
- 生产数据库必须位于 `/app/data/app.db`，并由群晖本地目录持久化挂载。
- 客户端用户名、角色、班级和进度不得成为服务端授权依据。
- 所有数据库多步变更使用短事务，事务内无密码散列、文件 IO 或网络请求。
- 任一高风险测试失败时停止进入下一任务。

---

## 已完成基线（不重做）

- Task 1 角色入口、服务端退出与 Session 真相：提交 `13ab0fe`。
- Task 2 禁止教师/管理员覆盖原始进度：提交 `4bca5e7`。
- Task 3 取消自由注册与生产演示种子：提交 `92fa893`。
- Task 4 学生激活、强制改密和旧会话失效：提交 `5110b65`。

### Task 5: 将 Vinext 切换为 standalone Node 生产产物

**Files:**
- Create: `next.config.ts`
- Modify: `vite.config.ts`
- Modify: `package.json`
- Delete: `.openai/hosting.json`
- Test: `tests/nodeProductionBoundary.test.ts`

**Interfaces:**
- Produces: `npm run build` 生成 `dist/standalone/server.js`；`npm start` 执行该文件。
- Consumes: 现有 Vinext App Router 和 API route handlers。

- [ ] **Step 1: 写生产边界失败测试**

  检查 `next.config.ts` 含 `output: 'standalone'`，`package.json#scripts.start` 为 `node dist/standalone/server.js`，生产配置不包含 `wrangler`、`@openai/sites-vite-plugin`、`@cloudflare/vite-plugin` 或 `cloudflare:workers`。

- [ ] **Step 2: 运行失败测试**

  Run: `npm.cmd test -- --run tests/nodeProductionBoundary.test.ts`  
  Expected: FAIL，原因为当前仍为 Sites/Workers 配置且 start 使用 Wrangler。

- [ ] **Step 3: 最小切换 Node 构建**

  `next.config.ts` 导出 `{ output: 'standalone' }`；`vite.config.ts` 仅保留 `vinext()` 和 Tailwind；移除 Sites/Cloudflare 生产依赖和 `.openai/hosting.json`。

- [ ] **Step 4: 构建并真实启动**

  Run: `npm.cmd run build`  
  Run: `$env:PORT='3100'; $env:HOST='127.0.0.1'; node dist/standalone/server.js`  
  Expected: `GET /` 返回 200，`GET /api/auth/me` 未登录返回 401，进程可正常收到终止信号。

- [ ] **Step 5: 回归与提交**

  Run: `npm.cmd test -- --run tests/nodeProductionBoundary.test.ts && npm.cmd run typecheck && npm.cmd run lint`  
  Commit: `build: switch production runtime to vinext standalone node`

### Task 6: 建立失败关闭的原生 SQLite 生产工厂

**Files:**
- Create: `src/server/db/productionDatabase.ts`
- Create: `src/server/db/testDatabase.ts`
- Modify: `src/server/db/database.ts`
- Modify: `src/server/db/memorySqlStore.ts`
- Test: `tests/sqliteProductionBoundary.test.ts`

**Interfaces:**
- Produces: `openProductionDatabase(config: ProductionDatabaseConfig): AppDatabase`、`getDatabase(): AppDatabase`。
- `ProductionDatabaseConfig = { dataDir: string; filename: 'app.db'; busyTimeoutMs: 5000 }`。
- Consumes: 现有 `AppDatabase`、`StatementAdapter`、`applyMigrations()`。

- [ ] **Step 1: 写生产降级禁止测试**

  测试相对路径、不可写目录和原生 SQLite 打开失败都抛错；扫描生产工厂确认不导入 `sql.js` 和 `memorySqlStore`。

- [ ] **Step 2: 运行失败测试**

  Run: `npm.cmd test -- --run tests/sqliteProductionBoundary.test.ts`  
  Expected: FAIL，当前 `database.ts` 会静默使用 WASM/JSON/内存降级。

- [ ] **Step 3: 分离生产和测试工厂**

  `productionDatabase.ts` 只导入 `node:sqlite`；使用 `new DatabaseSync(dbPath, { timeout: 5000, enableForeignKeyConstraints: true, allowExtension: false })`；路径通过 `path.resolve` 和 `path.relative` 校验不越界。`testDatabase.ts` 才允许 `:memory:` 和显式测试适配器。

- [ ] **Step 4: 配置 PRAGMA 和完整性检查**

  执行 `foreign_keys=ON`、`journal_mode=WAL`、`synchronous=FULL`、`busy_timeout=5000`、`wal_autocheckpoint=1000`；断言 `quick_check` 结果为 `ok`。

- [ ] **Step 5: 防止多实例**

  生产入口通过 Linux `flock -n /app/data/app.lock` 持有内核级排他锁后再启动 Node；第二实例获取失败即退出。进程退出时内核自动释放锁，不使用只判断锁文件存在的永久死锁。Dockerfile 显式安装提供 `flock` 的 `util-linux`。

- [ ] **Step 6: 回归与提交**

  Run: `npm.cmd test -- --run tests/sqliteProductionBoundary.test.ts tests/accountLifecycle.test.ts tests/authBoundary.test.ts`  
  Commit: `refactor: fail closed on native sqlite production startup`

### Task 7: 将 Schema 迁移改为可审计、只追加文件

**Files:**
- Create: `src/server/db/migrations/0001_core.sql`
- Create: `src/server/db/migrations/0002_organization.sql`
- Create: `src/server/db/migrations/0003_account_lifecycle.sql`
- Create: `src/server/db/migrationRunner.ts`
- Modify: `src/server/db/database.ts`
- Test: `tests/sqliteMigrations.test.ts`

**Interfaces:**
- Produces: `runPendingMigrations(db, migrationDirectory): MigrationResult`，结果包含 `fromVersion`、`toVersion`、`applied[]`。
- Consumes: `AppDatabase.transaction()`、`schema_migrations(version,name,sha256,applied_at)`。

- [ ] **Step 1: 写迁移失败测试**

  覆盖空数库逐版升级、重复执行幂等、中途 SQL 失败整个版本回滚、已应用文件哈希变化拒绝启动。

- [ ] **Step 2: 运行失败测试**

  Run: `npm.cmd test -- --run tests/sqliteMigrations.test.ts`

- [ ] **Step 3: 提取并固定已有 Schema**

  将现有 V1—V3 SQL 按原有实际顺序放入三个文件；不重排已经生产化的列，不在迁移文件中写演示账号。

- [ ] **Step 4: 增加哈希和事务执行**

  迁移运行器按数字前缀排序，对文件原始字节求 SHA-256，每个版本的 SQL 和 `schema_migrations` 记录在同一事务内提交。

- [ ] **Step 5: 回归与提交**

  Run: `npm.cmd test -- --run tests/sqliteMigrations.test.ts tests/productionBootstrap.test.ts`  
  Commit: `refactor: add immutable sqlite migration runner`

### Task 8: 强化班级、任教和归班约束

**Files:**
- Modify: `src/server/db/classService.ts`
- Create: `src/server/db/migrations/0004_relation_constraints.sql`
- Test: `tests/organizationRules.test.ts`

**Interfaces:**
- Produces: 角色/状态/学校范围校验后的 `assignTeacherToClass()`、`transferStudent()`、`revokeTeacherFromClass()`。
- Consumes: 已存在 `ClassRecord`、`TeacherClassAssignment`、`StudentClassRelation`。

- [ ] **Step 1: 写组织规则失败测试**

  覆盖管理员不能归班、学生不能任教、停用账号/归档班级不建新关系、当前归班和有效任教不重复。

- [ ] **Step 2: 运行失败测试**

  Run: `npm.cmd test -- --run tests/organizationRules.test.ts`

- [ ] **Step 3: 在服务层校验对象**

  每次关系写入先查账号角色/状态、班级状态/学校和课程范围；返回稳定业务错误码。

- [ ] **Step 4: 添加数据库约束和历史保留**

  添加部分唯一索引；转班在同一事务中结束旧关系、创建新关系、更新展示缓存和写审计。

- [ ] **Step 5: 核对统计一致性并提交**

  Run: `npm.cmd test -- --run tests/organizationRules.test.ts tests/classIsolationPhase2.test.ts`  
  Commit: `fix: enforce sqlite organization relationship invariants`

### Task 9: 拆分系统管理员资源 API 和独立后台

**Files:**
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/classes/route.ts`
- Create: `app/api/admin/teacher-classes/route.ts`
- Create: `app/api/admin/student-classes/route.ts`
- Create: `app/api/admin/audit-logs/route.ts`
- Create: `src/components/admin/SystemAdminConsole.tsx`
- Create: `src/components/admin/UsersPanel.tsx`
- Create: `src/components/admin/ClassesPanel.tsx`
- Create: `src/components/admin/RelationsPanel.tsx`
- Create: `src/components/admin/AuditPanel.tsx`
- Modify: `app/api/admin/route.ts`
- Test: `tests/adminResources.test.ts`

**Interfaces:**
- Produces: 用户、班级、任教、归班、账号安全和审计六类管理能力。
- Consumes: `requireAuth({ allowedRoles: ['admin'] })` 和 Task 8 关系服务。

- [ ] **Step 1: 写资源 API 失败测试**

  覆盖账号 CRUD/状态、班级 CRUD/归档、任教分配/撤销、学生归班/转班、审计查询，以及教师和学生访问统一拒绝。

- [ ] **Step 2: 按资源实现 API**

  各 route 只处理参数和 HTTP 映射，业务规则调用服务层。冲突返回 409，非法状态转换返回 422。

- [ ] **Step 3: 实现独立后台**

  管理员登录后直接进 `SystemAdminConsole`；不显示技师等级、课程进度或演示模式。每次写操作成功后重新请求服务端列表和统计。

- [ ] **Step 4: 验证并提交**

  Run: `npm.cmd test -- --run tests/adminResources.test.ts tests/classIsolationPhase2.test.ts && npm.cmd run typecheck`  
  Commit: `feat: add isolated system administration console`

### Task 10: 建设独立教师工作台和评价/重训

**Files:**
- Create: `app/api/teacher/classes/route.ts`
- Create: `app/api/teacher/students/route.ts`
- Create: `app/api/teacher/evaluations/route.ts`
- Create: `app/api/teacher/retraining/route.ts`
- Create: `src/server/teaching/teacherService.ts`
- Create: `src/components/teacher/TeacherDashboard.tsx`
- Create: `src/components/teacher/ClassOverview.tsx`
- Create: `src/components/teacher/StudentEvidence.tsx`
- Modify: `src/app/GameShell.tsx`
- Test: `tests/teacherWorkspace.test.ts`

**Interfaces:**
- Produces: 任教班级查询、学情证据、教师评价、受控重训和最小化导出。
- Consumes: `teacher_class`、`student_class`、`teacher_evaluations`、`progress_corrections`。

- [ ] **Step 1: 写教师边界失败测试**

  教师只能读取、导出、评价和重训当前任教班级；跨班全部 403；教师评价不改变学生游戏进度。

- [ ] **Step 2: 实现教师服务和 API**

  对每个 student/attempt 目标在服务层重新查询有效任教关系；重训必须填写原因并生成 `progress_corrections`。

- [ ] **Step 3: 实现独立工作台和无写预览**

  教师登录后直达 `TeacherDashboard`；课程预览使用内存预览上下文，不调用任何学习写入 API。

- [ ] **Step 4: 验证并提交**

  Run: `npm.cmd test -- --run tests/teacherWorkspace.test.ts tests/progressAuthorization.test.ts && npm.cmd run typecheck`  
  Commit: `feat: add isolated teacher workspace`

### Task 11: 将学生进度改为服务端事件投影

**Files:**
- Create: `app/api/learning/events/route.ts`
- Create: `src/server/learning/learningEventService.ts`
- Create: `src/server/learning/stateTransitions.ts`
- Modify: `src/stores/userProgressStore.ts`
- Modify: Sprint 0—2 通关提交调用点
- Modify: `app/api/progress/route.ts`
- Test: `tests/learningEvents.test.ts`

**Interfaces:**
- Produces: `submitLearningEvent(sessionUser, event): LearningProjection`。
- `LearningEventInput = { eventId: string; levelId: LevelId; eventType: string; payload: unknown; occurredAt: number }`。
- Consumes: 当前 Session 学生 ID、当前归班、前置关卡规则。

- [ ] **Step 1: 写事件化失败测试**

  覆盖 `eventId` 重复幂等、跳关拒绝、成绩 0—100 校验、非学生拒绝、事件/尝试/进度投影原子一致。

- [ ] **Step 2: 运行失败测试**

  Run: `npm.cmd test -- --run tests/learningEvents.test.ts`

- [ ] **Step 3: 实现状态迁移和短事务**

  所有权来自 Session；同一事务插入事件、更新尝试并重建学生进度投影。唯一冲突查到已有同一事件时返回相同投影。

- [ ] **Step 4: 切换 Sprint 0—2 提交点**

  前端仅发送事件和必要证据；使用服务端返回投影更新本地显示。旧 `/api/progress` POST 返回 410，GET 保留。

- [ ] **Step 5: 添加 SQLITE_BUSY 整体事务重试**

  将完整事务包装为 `runWriteTransactionWithRetry`，仅对 `SQLITE_BUSY` 重试 3 次，其他错误立即抛出。

- [ ] **Step 6: 验证并提交**

  Run: `npm.cmd test -- --run tests/learningEvents.test.ts tests/level02.test.ts tests/sprint1Milestone1.test.ts`  
  Commit: `refactor: persist student progress as sqlite learning events`

### Task 12: 添加健康检查、Docker 和群晖配置

**Files:**
- Create: `app/api/health/route.ts`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`
- Create: `.env.production.example`
- Create: `scripts/container-entrypoint.mjs`
- Test: `tests/deploymentConfig.test.ts`

**Interfaces:**
- Produces: `GET /api/health -> { status: 'ok', database: 'ready', schemaVersion: number }`。
- Consumes: `getDatabase()` 和最新 Schema 版本常量。

- [ ] **Step 1: 写部署配置失败测试**

  检查镜像 `node:24.20.0-bookworm-slim`、非 root 用户、`/app/data` 挂载、只有一个 app 服务、`flock` 单实例入口、`restart: unless-stopped`、健康检查、日志轮转和无明文密钥。

- [ ] **Step 2: 运行失败测试**

  Run: `npm.cmd test -- --run tests/deploymentConfig.test.ts`

- [ ] **Step 3: 实现健康接口与入口检查**

  入口先校验持久目录、文件锁、SQLite、`quick_check` 和迁移，再启动 server。健康接口不返回路径、账号或行数。

- [ ] **Step 4: 实现多阶段 Dockerfile 与 Compose**

  build 阶段安装依赖并生成 standalone；runtime 阶段只复制产物和运行所需文件。Compose 映射群晖 `./data:/app/data`和 `./backups:/app/backups`，日志限制 10MB×5。

- [ ] **Step 5: 构建、重建持久性测试并提交**

  Run: `docker compose build`  
  Run: `docker compose up -d && docker compose ps`  
  创建测试记录，执行 `docker compose down && docker compose up -d`，确认记录仍存在。  
  Commit: `build: add single-instance synology docker deployment`

### Task 13: 实现 SQLite 一致性备份、保留和恢复校验

**Files:**
- Create: `scripts/backup-sqlite.mjs`
- Create: `scripts/verify-sqlite-backup.mjs`
- Create: `scripts/restore-sqlite.mjs`
- Create: `docs/operations/SYNOLOGY_BACKUP_RESTORE.md`
- Modify: `package.json`
- Modify: `docker-compose.yml`
- Test: `tests/sqliteBackup.test.ts`

**Interfaces:**
- Produces: `npm run db:backup`、`npm run db:verify-backup -- <file>`、`npm run db:restore -- <file>`。
- Consumes: `APP_DATA_DIR`、`BACKUP_DIR=/app/backups`、Node `sqlite.backup()`。

- [ ] **Step 1: 写备份失败测试**

  覆盖 WAL 存在时备份仍包含已提交数据、目标 `quick_check=ok`、中途失败不留正式备份名、日/周/月保留数量正确。

- [ ] **Step 2: 运行失败测试**

  Run: `npm.cmd test -- --run tests/sqliteBackup.test.ts`

- [ ] **Step 3: 实现 staging、校验和原子重命名**

  使用 `sqlite.backup(sourceDb, stagingPath)`；打开 staging 执行 `quick_check`；成功后同文件系统重命名。任何失败删除 staging 并返回非 0。

- [ ] **Step 4: 实现保留和恢复防护**

  备份名使用 UTC ISO 时间戳；保留 7 日、4 周、12 月。恢复脚本要求应用停止标志、校验输入绝对路径属于备份目录，恢复前保留当前故障库。

- [ ] **Step 5: 添加群晖任务计划书并提交**

  文档给出每日调用 `docker compose run --rm backup`的群晖 Task Scheduler 命令、Hyper Backup 目标和每月恢复演练清单。  
  Commit: `feat: add verified sqlite backup and restore workflow`

### Task 14: 整体复验、并发测试和交付文档

**Files:**
- Create: `tests/e2e/auth-organization.spec.ts`
- Create: `scripts/load-test-learning-events.mjs`
- Create: `IMPLEMENTATION_ACCOUNT_ORGANIZATION.md`
- Create: `TESTING_ACCOUNT_ORGANIZATION.md`
- Create: `docs/operations/SYNOLOGY_DEPLOYMENT.md`
- Modify: `README.md`
- Modify: `KNOWN_ISSUES.md`

**Interfaces:**
- Produces: 可部署产物、复验 15 项证据、40 并发报告和群晖运维手册。
- Consumes: Task 5—13 全部功能。

- [ ] **Step 1: 执行静态和单元验证**

  Run: `npm.cmd test -- --run`  
  Run: `npm.cmd run typecheck`  
  Run: `npm.cmd run lint`  
  Run: `npm.cmd run build`

- [ ] **Step 2: 对 standalone 和 Docker 进行真实浏览器验收**

  覆盖学生激活/登录/通关/退出、教师任教班级/跨班拒绝/评价/预览无写、管理员账号/班级/关系/审计。Chrome 和 Edge 各执行一次核心流程。

- [ ] **Step 3: 执行 40 学生并发测试**

  为 40 个独立学生 Session 同时提交幂等事件；核对所有事件、尝试和投影行，记录 p50/p95、`SQLITE_BUSY` 重试数和失败数。验收标准为零数据丢失、零跨账号覆盖、零假成功。

- [ ] **Step 4: 执行备份/恢复和重建持久性演练**

  生成一致性备份，在隔离目录恢复，核对用户、关系、事件和审计行数；重建 app 容器后重复三角色登录。

- [ ] **Step 5: 逐项核对复验报告 15 项并提交**

  文档对每项记录 PASS/FAIL、证据文件、测试时间和剩余风险；任一 P0/P1 失败不得标记整改完成。  
  Commit: `docs: record synology sqlite production acceptance`

---

## 执行顺序与检查点

1. Task 5—7 先形成 Node＋SQLite 可运行生产基线。
2. Task 8—11 完成教学组织、管理端、教师端和学习事件。
3. Task 12—13 完成容器、健康检查和备份恢复。
4. Task 14 完成真实生产链路复验。
5. 每个 Task 单独提交；同一子任务需要返工时继续交给原执行者。
