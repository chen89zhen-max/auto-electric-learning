# 群晖 SQLite 备份与恢复操作规程

适用范围：学校认可的单机群晖部署。数据库只允许一个应用容器写入；`data` 和 `backups` 必须位于群晖本机存储，不得放在 SMB/NFS 网络共享上。

## 一、首次部署准备

建议项目目录为 `/volume1/docker/auto-electric`，其中创建 `data`、`backups` 两个目录。镜像内应用用户 UID/GID 为 `10001:10001`，部署前由群晖管理员确认两个目录对该 UID/GID 可读写。真实 `.env`、管理员临时凭据和学生名单不得提交到 Git。

```sh
cd /volume1/docker/auto-electric
docker compose build app
docker compose up -d app
docker compose ps
```

访问 `http://127.0.0.1:3000/api/health`，必须返回 `status=ok`、`database=ready` 和当前 schema 版本。外部访问应通过学校认可的 DSM 反向代理和 HTTPS。

## 二、每日一致性备份

运行中的 WAL 数据库禁止只复制 `app.db`。本项目通过 SQLite Backup API 生成临时库，执行 `quick_check` 后原子改名；失败时不会留下正式备份名。

在群晖“控制面板 → 任务计划”中新建每日任务，建议凌晨执行：

```sh
cd /volume1/docker/auto-electric
docker compose run --rm backup
```

默认保留 7 个日备份、4 个周备份和 12 个月备份。文件名使用 UTC 时间戳；周/月归档按容器 `TZ` 所设校区时区（示例为 `Asia/Shanghai`）的周日和每月 1 日生成。任务失败必须通知系统负责人，不能把“脚本执行过”当成“备份有效”。

核验指定备份时使用容器内绝对路径：

```sh
docker compose run --rm --entrypoint node backup \
  scripts/verify-sqlite-backup.mjs /app/backups/app-daily-YYYY-MM-DDTHH-mm-ss-SSSZ.db
```

输出必须为 `status=ok`、`quickCheck=ok`。

## 三、Hyper Backup / 快照

将整个 `backups` 目录纳入群晖 Hyper Backup 或快照复制，目标应在另一块硬盘、另一台设备或学校批准的异地存储。`data/app.db` 可作为辅助快照对象，但不能替代 SQLite 一致性备份。备份介质访问权限应限于系统负责人和备份保管人。

## 四、恢复流程

恢复会替换当前数据库，必须安排维护窗口并确认应用已停止。脚本要求 `APP_STOPPED=true`，且恢复源必须是 `/app/backups` 内的绝对路径；恢复前会把当前库保存为 `app-pre-restore-*.db`。

```sh
cd /volume1/docker/auto-electric
docker compose stop app
docker compose run --rm \
  -e APP_STOPPED=true \
  --entrypoint node backup \
  scripts/restore-sqlite.mjs /app/backups/app-daily-YYYY-MM-DDTHH-mm-ss-SSSZ.db
docker compose start app
docker compose ps
```

恢复后依次检查：健康接口为 `ok`；管理员可登录；班级、任教和归班关系正确；抽查一名学生的 Sprint 0—2 学习证据；审计日志时间连续。若检查失败，立即停止应用，保留现场，并使用刚生成的 `app-pre-restore-*` 回退或交由维护人员处理。

## 五、每月恢复演练

每月至少执行一次隔离恢复演练，不得直接在生产库上“试恢复”。记录以下证据：备份文件名与时间、`quick_check` 结果、恢复用时、健康接口结果、账号/班级/学习事件抽查结果、演练人员和发现的问题。连续两个月未完成恢复演练，应作为信息化运行风险上报。

## 六、责任边界

群晖及学生数据必须纳入学校资产、网络安全和个人信息管理制度。明确系统负责人、数据管理员、备份保管人、凭据交接、数据保留期限和安全事件处置流程；未经学校授权的家庭群晖不得保存正式学生身份与学习记录。
