# CODEX 审查交接档案：Phase 4 终验与全任务中年男声 TTS 语音统一化

- **交接发起方**：Antigravity / Gemini（主线全量交付团队）
- **交接接收方**：Code X（终极代码与教学质量审查专家）
- **交接日期**：2026-09-07
- **当前分支**：`codex/auth-organization-d1-repair`
- **审查涉及提交**：
  - `5bf6f9e` (`test: add final p4 p5 p6 production acceptance coverage` - Phase 4 / Task 10)
  - `2d0a38c` (`fix(speech): unify tts engine to middle-aged male voice and mount speech controls across all tasks` - 语音统一化)
- **质量门禁全景**：**67/67 测试文件全绿（461 项用例全数通过），TypeScript 0 错误，Oxlint 0 警告 0 错误，生产 Standalone 构建成功**。

---

## 一、交付范围与核心实施内容

### 1. Phase 4（Task 10）：生产级红线端到端验收与排版收网
依照 `docs/handoffs/GEMINI_P4_P5_P6_REMEDIATION_EXECUTION_PLAN.md` 规划，Phase 4 建立了最严苛的端到端红线验收套件与审计守护：

#### 1.1 三角色与班级隔离生命周期验收 (`tests/e2e/roles-and-e07.spec.ts`)
1. **多角色与班级授课生命周期**：
   - 验证系统管理员建班（智能网联1班、2班）、分配教师、学生转班（班级变更立即生效并保留历史审计记录）；
   - 验证共同授课与单教师权限撤销机制。
2. **严格的跨班隔离与防越权拦截**：
   - 教师仅可访问与批阅本人任教班级学生；跨班查看学生名单或尝试越权签名均被服务端阻断（`403 Forbidden`）；
   - 学生 Token 尝试伪造教师签名、访问教师端或管理员端均被阻断（`403 Forbidden`）。
3. **E07 IPC-A-610 教师实物量规防伪签名生命周期**：
   - 学生完成虚拟焊接后，处于“等待现场验收”只读状态，未签署前查询量规返回 `404`；
   - 教师提交外观、方向、润湿角（$\theta < 30^\circ$）、安全与原理解释 5 维度得分，服务端强制复算总分（94 分），杜绝客户端篡改；
   - 签署后学生只读调阅（`200 OK`），非本班教师尝试代签被拦截（`403 Forbidden`），同一 attempt 重复签署触发幂等保护（`409 Conflict`）。

#### 1.2 P4—P6 15 关数据驱动全量红线套件 (`tests/e2e/p4p5p6-redlines.spec.ts`)
1. **Redline 1：路由与准入红线**：全 27 关全部注册发布；教师/管理员备课全关卡直达；学生零进度跳关被前置检查阻断（返回 `blocked` 与缺失前置关卡列表）。
2. **Redline 2：零剧透红线与字号约束**：
   - 15 关所有选择题初始状态严格为 `null`/空，未作答前提交按钮禁用；
   - 提交前无任何标绿、标红或动画暗示正确答案；
   - 静态语法树守卫验证 P4—P6 彻底杜绝未标记白名单的 `text-xs`，保证正文/任务/按钮/评分 $\ge 14\text{px}$（`text-sm`）。
3. **Redline 3：C03 晃动测试（Wiggle Test）仿真**：
   - 万用表关机或非 `DCV_20` 档位时拦截晃动测试；
   - 晃动中模拟瞬态虚接跌落至 `0.00V`，触发插针松旷故障识别与整形复检。
4. **Redline 4：C02 四类经典故障仿真**：
   - `OPEN_CIRCUIT`（断路）、`SHORT_TO_GROUND`（对地短路）、`HIGH_RESISTANCE`（虚接）、`SHORT_TO_POWER`（对电源短路）四类故障物理拓扑与 MNA 直流求解全闭环。
5. **Redline 5：D02/D03/D04 盲测与安全防护**：
   - 必须先完成实测打表方可提交工单；
   - `evaluateMeterGuard` 拦截万用表关机（`OFF`）、档位错误（`WRONG_MODE`）、插孔插错（`WRONG_JACK`）、带电测阻（`LIVE_RESISTANCE`）及电流表跨接短路（`DANGEROUS_BRIDGE`）。

---

### 2. 全任务语音播报补齐与中年男声音色治理

人工测试反馈指出：“00、01、A01、A02 没有语音播报；后面 A03 开始有播报但声音不一致，需统一调用一个声音来源，使用中年男生声音”。本轮针对该问题实施了全域治理：

#### 2.1 补齐 00、01、A01、A02 语音播报
- **根因分析**：原先这 4 个关卡的音量图标仅绑定了短音效 `sounds.click()`，未接入 Web Speech TTS 引擎。
- **治理实施**：
  - **Level 00**（`src/components/TutorPanel.tsx`）：挂载 `<SpeechControls currentText={message} />`；
  - **Level 01**（`src/levels/level01/components/Level01Tutor.tsx`）：挂载 `<SpeechControls currentText={tutorMsg} />`；
  - **Level 02 / A01**（`src/levels/level02/components/Level02Tutor.tsx`）：挂载 `<SpeechControls currentText={state.tutorMessage} />`；
  - **A02**（`src/levels/a02/A02Experience.tsx`）：挂载 `<SpeechControls currentText={hintRequested ? guidance.hint : guidance.mentorPrompt} />`。

#### 2.2 统一调用单一声音来源，锁定“中年男声”音色 (`src/components/visuals/SpeechTts.ts`)
1. **中文成熟中年男声优先级筛选策略**：
   - **优先级 1**：`Yunyang`（云扬 - Windows / Edge 旗舰级成熟播音级男声）；
   - **优先级 2**：`Yunjian`（云健 - 成熟男声）；
   - **优先级 3**：`Kangkang`（康康 - Windows 离线稳定男声）；
   - **优先级 4**：`Yunxi`（云希 - 男声）；
   - **优先级 5**：带明确 `male/男` 关键字的中文声音；
   - **严格剔除女声**：自动排除 `xiaoxiao`、`huihui`、`yaoyao`、`tingting`、`female` 等音色，杜绝不同关卡跳出女声。
2. **陈师傅沉稳厚重调音参数**：
   - 默认音调设定为 `DEFAULT_MALE_PITCH = 0.88`（厚重、沉稳、充满大师傅威严）；
   - 默认语速设定为 `DEFAULT_MALE_RATE = 0.98`。
3. **会话级单例锁定**：
   - 首次解析声音后写入 `lockedPreferredVoice` 进行单例锁定，杜绝在不同关卡之间或切步切换时声音来源突变。

#### 2.3 重构 A03—B06，消除散落调用与抢播冲突
- **A03、A04、B01、B02、B03、B04**：
  - 清理各自组件内分散的 `useEffect(() => speakText(...))` 与私有 `<button onClick={() => speakText(...)}>`；
  - 统一替换为标准化 `<SpeechControls currentText={...} />`；
  - 彻底杜绝组件与全局 TTS 之间的重复抢播或双重声音，语速/音量/静音在全关卡实时联动。
- **Chapter B 框架 (`src/levels/chapterB/BSceneFrame.tsx`)**：
  - 在工单标题与指引处挂载 `<SpeechControls currentText={instruction} />`，全景覆盖 B05、B06。
- **默认自动播报策略 (`src/components/visuals/SpeechPreferences.ts`)**：
  - 将默认偏好 `autoRead` 置为 `true`，满足进入工位自动播报陈师傅指引的需求；
  - 缓存版本升至 `auto_elec_speech_preferences_v2`，保证新老浏览器即刻生效。

---

## 二、架构守护与关键约束核查

1. **Task 9 懒加载架构冻结保护**：
   - `src/app/levelComponents.tsx`
   - `src/components/GameShell.tsx`
   - `tests/levelComponentRegistry.test.ts`
   - **核查结果**：以上三处核心懒加载文件在本次修改中**完全未动**，代码切片与动态导入逻辑保持 100% 完整。
2. **群晖原生 SQLite 生产架构保护**：
   - 纯原生 Node `node:sqlite` 架构，无 Cloudflare D1 或外部网络依赖；
   - 备份机制 (`tests/sqliteBackup.test.ts`)、迁移机制 (`tests/sqliteMigrations.test.ts`) 保持全绿。
3. **无格式瑕疵**：
   - `git diff --check` 通过，无多余空行或行尾空白字符。

---

## 三、四大质量门禁验证记录

```bash
# 1. 全量自动化测试（67 套件，461 用例）
npm test
# 结果: 67 passed (67), 461 passed (461), 耗时 8.06s

# 2. TypeScript 严格类型检查
npm run typecheck
# 结果: tsc --noEmit, 0 errors

# 3. Oxlint 代码静态分析
npm run lint
# 结果: 288 files scanned, 0 warnings, 0 errors

# 4. 生产打包构建
npm run build
# 结果: vinext build (Vite 8.2.2), 生成 dist/standalone/server.js SUCCESS
```

---

## 四、CODEX 审查员复现核验指令指南

请 CODEX 审查员拉取最新分支后，执行以下命令进行快速验证：

```bash
# 1. 验证专项测试：TTS 与全关卡 SpeechControls 接入
npx vitest run tests/speechTts.test.ts tests/speechControlsIntegration.test.tsx

# 2. 验证专项测试：Phase 4 端到端权限与红线验收
npx vitest run tests/e2e/roles-and-e07.spec.ts tests/e2e/p4p5p6-redlines.spec.ts

# 3. 运行全量测试套件
npm test

# 4. 运行全套门禁
npm run typecheck && npm run lint && npm run build
```
