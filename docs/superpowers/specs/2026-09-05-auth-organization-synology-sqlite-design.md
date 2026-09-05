# 汽车电工电子游戏账号、教学组织与群晖 SQLite 生产部署设计

日期：2026-09-05  
状态：已采用，取代原 Sites/D1 方案  
依据：`汽车电工电子游戏_二阶段修改后账号与教学组织复验报告_2026-09-05.md`

## 1. 目标与边界

本次整改面向“学校认可的群晖单机生产环境”，不开发 Sprint 3，不重写 Sprint 0—2 游戏内容。目标是将当前系统提升为可实际维护、可按班级隔离、可审计、可备份恢复的单校应用。

保留的业务原则：

1. `student`、`teacher`、`admin` 三类角色互相独立。
2. 学生才能拥有学习进度、学习尝试和成绩。
3. 教师只能访问当前任教班级，评价与原始游戏进度分开。
4. 系统管理员只负责账号、组织、安全和审计，不进入学生课程大厅。
5. 服务端 Session、账号状态、当前归班和有效任教关系是唯一可信依据。
6. 生产环境为一个 Node 后端实例和一个群晖本地 SQLite 数据库。

## 2. 总体架构

生产链路：

`Chrome/Edge 学习端 → 学校 HTTPS/反向代理 → 单个 Vinext Node 容器 → /app/data/app.db`

- Vinext 设置 `output: "standalone"`，通过 `node dist/standalone/server.js` 运行。
- Docker 容器只运行一个应用进程，不使用 PM2 cluster、多副本或共享数据库的滚动部署。
- 容器内数据目录固定为 `/app/data`，群晖挂载目录建议为 `/volume1/docker/auto-electric/data`。
- SQLite 文件、WAL 和 SHM 文件位于同一本地卷；禁止放到 SMB/NFS 远程共享。
- Cloudflare Sites、D1、Wrangler 不再属于生产运行链路，相关配置和依赖从项目中移除。

Vinext 官方已支持 standalone Node 产物，但仍处于活跃开发期。因此“构建成功”不等于“可上线”，每次升级必须对 standalone 产物做真实启动和 API 冒烟测试。

## 3. SQLite 生产边界

### 3.1 唯一生产驱动

生产只允许 Node 内置 `node:sqlite` 的 `DatabaseSync`。`sql.js`、JSON 和内存实现只能由测试专用工厂显式创建，不得进入生产自动候选链。

生产启动时必须验证：

- `APP_DATA_DIR` 为绝对路径且可读写；
- 解析后的数据库路径仍位于 `APP_DATA_DIR` 内；
- 原生 SQLite 能打开数库；
- `PRAGMA quick_check` 返回 `ok`；
- Schema 迁移完整执行。

任一条失败即让进程以非 0 状态退出，禁止降级运行。

### 3.2 连接与 PRAGMA

数据库使用进程级单例，初始化后执行：

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
PRAGMA busy_timeout = 5000;
PRAGMA wal_autocheckpoint = 1000;
```

`DatabaseSync` 设置 `timeout: 5000`、禁止加载扩展。所有多步状态变更使用短事务，事务中不做密码散列、文件 IO 或网络请求。

### 3.3 错误和重试

- 业务写入遇到 `SQLITE_BUSY`时最多重试 3 次，使用 50/150/350ms 带抖动退避。
- 每次重试必须重新执行完整事务，不得从中间步骤继续。
- 达到上限后返回 503 和可追踪错误号，不得对前端返回假成功。

## 4. Schema 与迁移

继续使用 `schema_migrations`。迁移改为只追加的独立 SQL 文件，按版本顺序在单个事务中执行，并记录文件 SHA-256。已应用迁移的哈希不匹配时拒绝启动。

保留表：`users`、`sessions`、`user_progress`、`login_attempts`、`audit_logs`、`classes`、`teacher_class`、`student_class`、`course_versions`、`learning_attempts`、`learning_events`、`student_activations`、`teacher_evaluations`、`progress_corrections`。

必须强制：

- 用户名不区分大小写且全局唯一；
- 同一学生最多一条 `is_current=1` 归班关系；
- 同一教师、班级、课程最多一条有效任教关系；
- 任教和归班新建前校验角色、账号状态、班级状态和学校范围；
- `student_class` 是当前班级唯一事实源，`users.class_name` 只作过渡展示缓存；
- 教师和管理员不得拥有 `user_progress` 或学习尝试。

迁移流程先对当前数库做一致性备份，再停机升级；失败时容器不启动，由备份恢复，不做未验证的自动反向迁移。

## 5. 账号、会话和权限

- 登录请求携带 `expectedRole`，服务端同时校验密码、状态和入口角色。
- 身份只由 HttpOnly Cookie 和服务端 `sessions` 表恢复；前端不信任 localStorage 角色。
- `pending_activation`、`active`、`suspended`、`locked`、`deleted` 五种账号状态由统一策略控制。
- `must_change_password=1` 时只允许 `me`、改密和退出。
- 密码更改、密码重置、停用、锁定和注销撤销用户有效会话。
- 学生激活只接受学号、一次性激活码和新密码，班级来自管理员预置关系。

未来 API 分为认证、学生学习事件、教师教学和系统管理四类。旧的整份进度 POST 最终退役，不为兼容保留危险权限。

## 6. 部署与密钥

生产容器基础镜像使用 Node 24 LTS 的固定补丁版，首版为 `node:24.20.0-bookworm-slim`；每次更新镜像先运行全部回归与 standalone 冒烟测试。容器以非 root 用户运行，只对 `/app/data`、`/app/backups` 和必要日志目录拥有权限。

必需环境变量：

- `NODE_ENV=production`
- `APP_DATA_DIR=/app/data`
- `PORT=3000`
- `HOST=0.0.0.0`
- `ADMIN_INITIAL_PASSWORD`：仅首次初始化需要，不写入 Compose 正文；初始化后删除。

`.env.production` 不进 Git，文档仅提供 `.env.production.example`。生产端口默认不直接暴露互联网，由学校认可的 DSM 反向代理、TLS 证书、VPN 或校园网入口承担访问边界。

## 7. 健康检查和可观测性

`GET /api/health` 不返回个人信息，只检查：进程存活、数据库可读、Schema 版本正确。Docker healthcheck 连续 3 次失败后标记 unhealthy，Compose 使用 `restart: unless-stopped`。

日志输出到 stdout/stderr，使用 Compose `json-file` 日志限制：`max-size=10m`、`max-file=5`。业务日志不记录明文密码、激活码、Session token 或完整学生数据。

## 8. 备份、保留和恢复

一致性备份由 Node `sqlite.backup()` 生成到 `/app/backups/.staging-*`，然后在同一文件系统原子重命名为带 UTC 时间戳的 `.db`。备份后必须对目标数据库执行 `PRAGMA quick_check`，失败的备份不进入保留集。

保留策略：7 个日备份、4 个周备份、12 个月备份。群晖 Hyper Backup 或 Snapshot Replication 将 `/volume1/docker/auto-electric/backups` 复制到另一块硬盘或另一台设备。不对运行中的 `app.db` 做单文件直接复制。

恢复必须在应用容器停止后执行：校验备份、保留当前故障文件、替换数据库、启动、验证 Schema 和三角色登录。每月至少在隔离目录做一次恢复演练。

## 9. 测试与验收

1. 单元/API：账号状态、Session、强制改密、关系约束、跨班拒绝、事件幂等。
2. SQLite 集成：不可写目录、迁移哈希冲突、断电重启、WAL、`SQLITE_BUSY` 重试和假成功禁止。
3. standalone 验收：构建产物后用 Node 真实启动，验证首页、健康接口和三类认证 API。
4. Docker 验收：重建容器后数据仍存在，第二实例启动被阻止，健康检查正常。
5. 并发验收：40 名学生并发提交短事务，无丢失、无跨账号覆盖，忙等待超限会返回明确失败。
6. 备份验收：一致性检查通过，在隔离数据目录完成恢复并核对关键表行数。
7. 业务验收：逐项通过复验报告 15 项用例，Sprint 0—2 回归正常。

## 10. 运维与数据责任

群晖必须纳入学校资产和信息系统管理，明确系统负责人、数据管理员、备份保管人、管理员账号交接、安全事件处置和学生数据保留期。未经学校授权的家庭群晖不作为正式学生数据的生产存储。

上述改造和复验完成前，不开始 Sprint 3。
