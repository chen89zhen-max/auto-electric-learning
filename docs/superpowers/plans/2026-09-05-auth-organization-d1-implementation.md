# 账号、教学组织与 D1 整改实施计划

> **执行者说明：** 本计划采用测试驱动实施。每个任务必须先看到新增测试因预期缺陷失败，再做最小实现并看到测试转绿。不得清理或覆盖当前工作区中与本计划无关的 Sprint 0—2 改动。

**目标：** 完成复验报告 P0、P1 及 15 项验收用例，使三类角色、教学组织和学习数据在 Sites + D1 上达到正式使用边界。

**架构：** 生产以 D1 为唯一结构化数据源；API 通过异步领域服务访问数据。认证由 HttpOnly Session 负责，前端只从 `/api/auth/me` 恢复身份。学生进度改为服务端验证的学习事件；教师评价、管理员治理和学生学习分别建模。

**技术栈：** Vinext、React 19、TypeScript、Cloudflare Workers/D1、Vitest、Wrangler、Sites。

---

## Task 1：修复退出、角色入口与会话真相

**文件：**

- 新增：`app/api/auth/login/route.ts`
- 新增：`app/api/auth/logout/route.ts`
- 新增：`app/api/auth/me/route.ts`
- 修改：`app/api/auth/route.ts`
- 修改：`src/stores/authStore.ts`
- 修改：`src/components/auth/AuthDialog.tsx`
- 修改：`src/components/CourseMapLobby.tsx`
- 测试：`tests/authBoundary.test.ts`

**步骤：**

1. 新增失败测试：错误角色入口被统一拒绝；前端退出调用服务端；`me`只对有效Session返回身份；教师/管理员认证响应不带学生进度。
2. 运行 `npm.cmd test -- --run tests/authBoundary.test.ts`，确认失败原因对应现有缺陷。
3. 实现 `expectedRole` 服务端校验、分离的 login/logout/me 路由及旧路由兼容层。
4. 将前端身份存储改为内存快照，应用启动通过 `me` 恢复；实现异步退出和失败提示结果。
5. 运行局部测试、类型检查和现有安全测试。
6. 提交：`fix: enforce role-aware sessions and server logout`。

## Task 2：封堵原始进度覆盖与教师越权

**文件：**

- 修改：`app/api/progress/route.ts`
- 修改：`src/stores/userProgressStore.ts`
- 新增：`src/server/learning/progressPolicy.ts`
- 测试：`tests/progressAuthorization.test.ts`
- 修改：`tests/securityPhase1.test.ts`
- 修改：`tests/classIsolationPhase2.test.ts`

**步骤：**

1. 新增失败测试：教师同班/跨班、管理员均不能通过通用进度接口整体覆盖学生记录；学生只能写本人；请求体用户名不能改变所有权。
2. 运行目标测试并确认失败。
3. 在过渡期将 `/api/progress` POST 限制为学生本人；对教师、管理员统一返回403并记录审计。
4. 前端只有已确认的学生Session才同步学习数据；教师预览不调用保存接口。
5. 运行进度、认证、班级隔离测试和类型检查。
6. 提交：`fix: restrict raw progress writes to current student`。

## Task 3：取消自由注册并隔离生产种子

**文件：**

- 修改：`app/api/auth/route.ts`
- 修改：`src/components/auth/AuthDialog.tsx`
- 修改：`src/server/db/bootstrap.ts`
- 修改：`src/server/db/database.ts`
- 修改：`src/server/db/migration.ts`
- 修改：`tests/bootstrap.test.ts`
- 新增：`tests/productionBootstrap.test.ts`

**步骤：**

1. 新增失败测试：生产环境不会创建固定账号；公开注册动作被拒绝；教师/管理员不创建`user_progress`。
2. 运行测试并确认现有固定种子和自由注册导致失败。
3. 将演示种子改为仅开发/测试环境显式启用；移除重复教师账号；生产初始管理员不使用默认密码回退。
4. 删除学生自由注册/自由文本班级界面，改为“首次激活”占位入口。
5. 运行bootstrap、安全测试、类型检查与构建。
6. 提交：`fix: disable public registration and production demo seeds`。

## Task 4：建立账号状态、强制改密和学生激活

**文件：**

- 新增：`app/api/auth/change-password/route.ts`
- 新增：`app/api/auth/activate/route.ts`
- 新增：`src/server/accounts/accountService.ts`
- 新增：`src/server/auth/accessPolicy.ts`
- 新增：`src/components/auth/ChangePasswordGate.tsx`
- 修改：`src/app/GameShell.tsx`
- 测试：`tests/accountLifecycle.test.ts`

**步骤：**

1. 新增失败测试：待激活、停用、锁定、注销账号的登录规则；临时密码用户只能访问me/change-password/logout；改密撤销旧会话。
2. 实现集中访问策略和账号生命周期服务。
3. 实现学生一次性激活码验证与密码设定；班级不接受客户端输入。
4. 实现全局强制改密门禁。
5. 运行账号、认证、安全测试和类型检查。
6. 提交：`feat: add account activation and forced password change`。

## Task 5：迁移到 Sites D1

**文件：**

- 修改：`.openai/hosting.json`
- 新增：`db/schema.ts`
- 新增：`drizzle.config.ts`
- 新增：`drizzle/0001_auth_organization.sql`
- 新增：`src/server/db/d1.ts`
- 新增：`src/server/db/repositories/*`
- 修改：`src/server/auth/*`
- 修改：`src/server/db/classService.ts`
- 修改：全部API路由的数据访问调用
- 修改：`package.json`
- 修改：`package-lock.json`
- 测试：`tests/d1Persistence.test.ts`

**步骤：**

1. 新增失败测试/静态检查：生产路由不得导入`node:fs`、`node:sqlite`或`sql.js`；D1 Schema包含所需表、索引和唯一约束。
2. 增加D1绑定`DB`、Schema定义和只追加迁移。
3. 将认证、会话、审计、账号、班级和学习查询改为异步repository；D1多语句写入使用`batch`。
4. 保留测试专用适配器，但从生产依赖图移除本地文件数据库。
5. 运行D1集成测试、全部API测试、类型检查与生产构建。
6. 检查生成SQL只包含D1安全的Schema变更。
7. 提交：`refactor: move production persistence to D1`。

## Task 6：强化班级与任教关系

**文件：**

- 修改：`src/server/db/classService.ts`或对应repository/service
- 修改：`db/schema.ts`
- 新增迁移：`drizzle/0002_relation_constraints.sql`
- 测试：`tests/organizationRules.test.ts`

**步骤：**

1. 新增失败测试：管理员不能被分为学生、学生不能被分为教师、停用账号/归档班级不可建立新关系、当前归班和有效任教不可重复。
2. 在服务层校验角色、账号状态、班级状态、学校和课程范围。
3. 添加当前学生唯一索引和有效任教唯一索引。
4. 将关系变化和审计放入同一批处理；转班保留历史记录。
5. 增加班级统计人数=当前学生列表人数测试。
6. 运行组织关系、隔离、迁移和类型检查。
7. 提交：`fix: enforce organization relationship invariants`。

## Task 7：拆分管理员资源API与后台

**文件：**

- 新增：`app/api/admin/users/route.ts`
- 新增：`app/api/admin/classes/route.ts`
- 新增：`app/api/admin/teacher-classes/route.ts`
- 新增：`app/api/admin/student-classes/route.ts`
- 新增：`app/api/admin/audit-logs/route.ts`
- 新增：`src/components/admin/SystemAdminConsole.tsx`
- 新增：`src/components/admin/*Panel.tsx`
- 修改：`app/api/admin/route.ts`
- 测试：`tests/adminResources.test.ts`

**步骤：**

1. 新增失败测试，覆盖账号CRUD、班级CRUD、任教分配、归班转班、审计查询和教师访问拒绝。
2. 实现资源化API及统一管理员授权。
3. 实现独立系统管理员后台六个功能区。
4. 每个状态变化后重新加载服务端列表和统计，不使用过期缓存推算人数。
5. 运行管理员API测试、组件类型检查和生产构建。
6. 提交：`feat: add system administration console`。

## Task 8：建设独立教师工作台和评价/重训

**文件：**

- 新增：`app/api/teacher/classes/route.ts`
- 新增：`app/api/teacher/students/route.ts`
- 新增：`app/api/teacher/evaluations/route.ts`
- 新增：`app/api/teacher/retraining/route.ts`
- 新增：`src/server/teaching/teacherService.ts`
- 新增：`src/components/teacher/TeacherDashboard.tsx`
- 新增：`src/components/teacher/*`
- 测试：`tests/teacherWorkspace.test.ts`

**步骤：**

1. 新增失败测试：教师只能读取、导出、评价和重训当前任教班级；跨班全部403；评价不改变游戏进度。
2. 实现教师服务和专用API。
3. 实现独立教师工作台，移除与管理员后台共用的条件分支。
4. 教师课程预览使用内存预览上下文，不写学习表。
5. 运行教师、班级隔离、进度授权和类型检查。
6. 提交：`feat: add isolated teacher workspace`。

## Task 9：学生进度事件化

**文件：**

- 新增：`app/api/learning/events/route.ts`
- 新增：`src/server/learning/learningEventService.ts`
- 新增：`src/server/learning/stateTransitions.ts`
- 修改：`src/stores/userProgressStore.ts`
- 修改：Sprint 0—2 通关提交调用点
- 测试：`tests/learningEvents.test.ts`

**步骤：**

1. 新增失败测试：重复事件幂等、跳关拒绝、成绩范围校验、非学生拒绝、事件与进度投影一致。
2. 实现服务端状态迁移和事件批量写入。
3. 将Sprint 0—2从整体进度上传改为事件提交；服务端响应更新本地投影。
4. 旧POST `/api/progress`改为410或只读兼容，不再接受写入。
5. 运行游戏回归、学习事件、安全和类型检查。
6. 提交：`refactor: make learning progress event-driven`。

## Task 10：部署与整体复验

**文件：**

- 新增：`tests/e2e/*`
- 新增：`scripts/verify-production-boundaries.*`
- 修改：`README.md`
- 新增：`IMPLEMENTATION_ACCOUNT_ORGANIZATION.md`
- 新增：`TESTING_ACCOUNT_ORGANIZATION.md`
- 修改：`KNOWN_ISSUES.md`

**步骤：**

1. 执行全部Vitest、typecheck、lint和生产build。
2. 在本地D1环境完成三角色真实浏览器E2E。
3. 执行40名学生并发事件提交，确认无丢失、无跨账号覆盖。
4. 演练D1迁移、备份和恢复；记录恢复时间与失败处理。
5. 发布Sites版本，重复三角色、退出、转班和权限拒绝验收。
6. 逐条核对复验报告15项用例，记录通过、失败和剩余风险。
7. 更新交付文档并提交：`docs: record account organization acceptance`。

---

## 执行原则

- 优先完成Task 1—3形成P0安全闭环，再进入D1和后台扩展。
- 不为兼容旧界面保留危险权限。
- 不使用客户端角色、用户名或班级字段作为授权依据。
- 生产环境不得回退本地文件数据库或固定默认凭据。
- 任一高风险测试失败时停止进入下一任务，先修复根因。
