# P3 阶段交接包：直流规律与设计（B01—B06）及 A02 体验全面升级

- **交付日期**：2026-09-06
- **实施阶段**：P3：完成直流规律与设计（B01—B06）& A02 电压实训可用性与拖拽升级
- **依据文件**：`docs/design/2026-09-05/` 目录下的《01-总体优化设计》《02-教材目标与关卡覆盖矩阵》《03-Gemini执行任务书》第 4.3 节
- **实施者**：Antigravity / Gemini & Codex（主线与审核协同）

---

## 1. 实施阶段、起止版本与改动范围

### 1.1 起止基线
- **起始基准提交**：`7505b0a` (`feat(circuit): implement MNA DC solver, universal multimeter and A02-A04 measurement levels (P2)`)
- **当前交付提交**：`18fec6e` (`feat(a02): enhance voltage training with drag-and-drop probes, Chinese labels, enlarged typography and rigorous 4-step validation`)
- **分支**：`codex/auth-organization-d1-repair`
- **构建环境与测试体系**：Node.js + TypeScript 5 + Vitest + Vinext (Vite 8.2.2) + Oxlint

### 1.2 本阶段新增与修改文件清单
| 文件路径 | 变更性质 | 核心修改说明 |
|---|---|---|
| `src/circuit/solver/DCAnalysisUtils.ts` | 新增 | 纯 TypeScript 直流规律计算分析库，支持部分电路欧姆定律 ($I=U/R$)、实际与额定功率 ($P=UI$)、工位用电与电费预算 (kWh)、全电路蓄电池内阻 ($U=E-Ir$)、分压电路空载/带载分析 (V09) 及 KCL/KVL 守恒校验 |
| `src/levels/chapterB/BSceneFrame.tsx` | 新增 | 篇章二统一交互基框：阶段指示、操作指引、必做反例防呆提示、MNA 实测确认与进阶控制 |
| `src/levels/chapterB/ChapterBExperience.tsx` | 新增 | 篇章二统一外层壳：支持跟练/独立/迁移三模式切换、六维能力评定投影与 `CompletionStatus` 独立 Attempt 持久化 |
| `src/levels/b01/B01OhmLawScene.tsx` & `B01Experience.tsx` | 新增 | B01 找出变化规律：固定电阻变压算流、固定电压变阻测流、未知电阻预测核验与控制变量反例辨析 |
| `src/levels/b02/B02LoadConnectionScene.tsx` & `B02Experience.tsx` | 新增 | B02 灯组改装：双灯串联分压变暗 vs 并联额定工作独立可控、等效电阻计算、破除外观几何排布误区 |
| `src/levels/b03/B03KclKvlScene.tsx` & `B03Experience.tsx` | 新增 | B03 追踪节点与回路：KCL 节点电流进出平衡、KVL 闭合回路压降守恒、移动搭铁参考点两点电压差 ($U_{AB}$) 恒定不变反例 |
| `src/levels/b04/B04PowerEnergyScene.tsx` & `B04Experience.tsx` | 新增 | B04 工位用电预算：额定功率与实际工作功率区分、工位 8 小时用电量度数与电费预算、14A 超负荷对 10A 熔丝切断保护拦截 |
| `src/levels/b05/B05InternalResistanceScene.tsx` & `B05Experience.tsx` | 新增 | B05 电源为什么带不动：全电路欧姆定律、空载/轻载/重载端电压对比、大电流起动时内阻压降导致大灯昏暗诊断、空载正常不等于带载正常反例 |
| `src/levels/b06/B06VoltageDividerScene.tsx` & `B06Experience.tsx` | 新增 | B06 传感器信号与分压：NTC 水温传感器随温变阻与 ECU 高阻采样、接入错误低阻负载引发的 V09 分压失真反例、严禁串电阻为任意电器供电 |
| `src/levels/a02/a02Training.ts` | 新增 | A02 实训规则引擎：定义 4 步目标、操作顺序、完成标准、近距离端子吸附算法与测量有效性判定 |
| `src/levels/a02/scenes/A02VoltageScene.tsx` | 重构 | A02 场景大升级：支持红黑表笔点击/拖拽双模式连接、中文端子名称、隐藏内部英文端子 ID、4 阶段严密校验推进 |
| `src/levels/a02/A02Experience.tsx` | 升级 | A02 外层提升：接入新版步骤卡和导师提示、彻底修复完成态重新开始 `isCompleted` 状态重置 |
| `src/game/instruments/Multimeter.ts` | 优化 | 修复直流电压挡在微小负电压四舍五入时出现 `-0.00 V` 的边界显示缺陷 |
| `app/globals.css` | 优化 | 清理多余格式化噪音，精准注入 `.a02-shell` 作用域字号规则，整体放大实训文字与操作区域 |
| `src/courses/registry.ts` | 升级 | 正式发布 B01~B06，升级为 `PUBLISHED`，版本 `1.0.0`，启用实训大厅规范动态卡片与先修校验 |
| `src/app/GameShell.tsx` | 适配 | 挂载 B01~B06 关卡路由，支持 URL 直接定位与大厅直达 |
| `tests/dcAnalysis.test.ts` | 新增 | 直流分析工具单元测试（欧姆定律、功率与过载、电费预算、蓄电池内阻压降、分压带载、KCL/KVL 守恒） |
| `tests/a02Training.test.ts` | 新增 | A02 拖放吸附、各步骤完成判定与全流程 4 阶段推进单元测试（7/7 PASS） |
| `tests/b01OhmLaw.test.ts` ~ `tests/b06VoltageDivider.test.ts` | 新增 | 篇章二 6 门关卡各自独立的物理与教学逻辑专项测试（全部 PASS） |

---

## 2. 目标与关卡覆盖状态

### 2.1 篇章二 6 门关卡全景
| 篇章 | 规范关卡ID | 关卡名称 | 对应教材任务 | 包含的核心定律与必须演示的反例 | 状态 |
|---|---|---|---|---|---|
| 篇章二：让电路按要求工作 | **B01** | 找出变化规律 · 欧姆定律应用 | 学习任务5 欧姆定律的应用 (8页) | 控制变量法：变压测流、变阻测流、未知电阻推算。<br>🔴 **反例**：电阻是固有物理量，控制变量严禁得出“电阻随电压增大而增大”。 | **PUBLISHED (已发布)** |
| 篇章二：让电路按要求工作 | **B02** | 灯组改装 · 负载的连接 | 学习任务6 负载的连接 (16页) | 双灯串联分压变暗与一断全断 vs 并联独立工作保持额定亮度。<br>🔴 **反例**：串并联取决于电气节点连接，绝非几何外观排布；并联增加负载增加总电流。 | **PUBLISHED (已发布)** |
| 篇章二：让电路按要求工作 | **B03** | 追踪节点与回路 · KCL与KVL | 学习任务4/6 (18/16页) | KCL 节点进出电流守恒 ($\sum I=0$)，KVL 闭合回路压降和为零。<br>🔴 **反例**：更换参考地改变绝对电位，但**两点间电压差 $U_{AB}$ 恒定不变**。 | **PUBLISHED (已发布)** |
| 篇章二：让电路按要求工作 | **B04** | 工位用电预算 · 电能与功率 | 学习任务7 电能和电功率的分析 (9页) | 区分额定与实际功率 ($P=UI$)、8小时度数与电费计算、熔丝容量保护。<br>🔴 **反例**：额定功率不等于实际工作功率；超载方案不能因“灯勉强亮着”而判合格（熔断切断）。 | **PUBLISHED (已发布)** |
| 篇章二：让电路按要求工作 | **B05** | 电源为什么带不动 · 全电路欧姆定律 | 学习任务5 欧姆定律的应用 (8页) | 全电路欧姆定律 ($I=E/(R+r)$)、空载/轻载/起动重载端电压对比与起动机压降。<br>🔴 **反例**：空载测得 12V 正常绝不能证明带载正常！极板硫化导致内阻变大、重载瘫痪。 | **PUBLISHED (已发布)** |
| 篇章二：让电路按要求工作 | **B06** | 传感器信号与分压 · 分压电路 | 学习任务6 负载的连接 (16页) | NTC 水温传感器特性、ECU 高阻信号采样、低阻负载并入引起的分压失真 (V09)。<br>🔴 **反例**：分压器带载后输出剧烈改变，严禁“串联一个电阻给任意低压设备降压供电”。 | **PUBLISHED (已发布)** |

---

## 3. A02 可用性大幅提升与修复细节

依据前 3 关优秀设计经验，对 A02 实训进行了深度可用性重构：
1. **文字字号与排版放大**：通过 `.a02-shell` 精准作用域规则，场景标题、步骤目标、反馈信息、接线端子与导师副标题显著放大，1366×768 及 1920×1080 视口下无需浏览器缩放即可清晰阅读。
2. **全中文测点标识**：电路图内所有端子改用全中文显示（如“蓄电池正极”、“开关输入端”、“检修灯正极”、“车身搭铁点”），隐藏底层开发使用的英文端子 ID。
3. **红黑表笔拖拽与点击双模交互**：彻底移除死板的下拉菜单选择；学生可直接用鼠标/手指拖动表笔手柄到目标端子（带有 30px 近距离智能磁吸与高亮反馈），亦支持“点击表笔手柄 $\rightarrow$ 点击端子”或键盘空格/回车操作。
4. **梳理 4 步实训向导**：
   - 步骤 1：直流电压挡测量蓄电池正向（+12V）与反向（-12V）极性对比；
   - 步骤 2：断开开关两端（12V）与闭合检修灯两端（12V）断路与负载对比；
   - 步骤 3：带载状态下测量灯端（10.91V）、供电侧接点（0.91V）、搭铁侧接点（0.18V）三项压降证据；
   - 步骤 4：基于三项测量证据做出科学维修决策（清洁紧固供电侧氧化接点）。
5. **修复边界缺陷**：
   - 修复负微小电压四舍五入出现 `-0.00 V` 的显示问题；
   - 修复完成态点击“重新开始”未能清除外层 `isCompleted` 的状态重置缺陷。

---

## 4. 自动化测试与质量门禁验证

### 4.1 测试套件执行结果
执行命令：`npm test`
- **测试文件数**：**38 passed (38)**
- **单元与集成测试用例数**：**211 passed (211)**
- **执行时间**：~4.84s
- **涵盖关键测试文件**：
  - `tests/a02Training.test.ts` (7/7 tests passed: 拖放吸附、各步骤拦截、全流程四阶段)
  - `tests/b01OhmLaw.test.ts` ~ `tests/b06VoltageDivider.test.ts` (6/6 tests passed: B01~B06 物理规律与反例)
  - `tests/dcAnalysis.test.ts` (6/6 tests passed: 直流分析工具集)
  - `tests/dcSolver.test.ts` (7/7 tests passed: MNA 直流求解器)
  - `tests/multimeter.test.ts` (6/6 tests passed: 万用表模型与防呆保护)
  - `tests/courseRegistry.test.ts` (8/8 tests passed: 12 门关卡正式发布与路由)
  - `tests/level02.test.ts` (33/33 tests passed: 历史电路关卡完全无退化)

### 4.2 类型检查
执行命令：`npm run typecheck` (`tsc --noEmit`)
- **结果**：Exited with code 0，0 错误。

### 4.3 静态代码检查 (Linter)
执行命令：`npm run lint` (`oxlint app src tests vitest.config.ts`)
- **结果**：`Found 0 warnings and 0 errors. Finished in 1.5s on 196 files with 208 rules using 16 threads.`

### 4.4 生产打包构建验证
执行命令：`npm run build` (`vinext build`)
- **结果**：Exited with code 0，独立生产运行包产出在 `dist/standalone/`。

---

## 5. 本地运行与复验步骤

1. **启动测试套件全量验证**：
   ```bash
   npm test
   ```
   预期输出：38 test files passed, 211 passed.

2. **验证静态代码与类型检查**：
   ```bash
   npm run lint
   npm run typecheck
   ```
   预期输出：0 errors, 0 warnings.

3. **启动本地开发服务器体验关卡**：
   ```bash
   npm run dev
   ```
   - 打开浏览器访问 `http://localhost:3000`。
   - 访问 **A02**（给电路做体检）：
     - 观察放大的字号与全中文端子；
     - 拖动红表笔到蓄电池正极、黑表笔到负极吸附连接，记录正向约 12V；
     - 调换两表笔记录反向约 -12V；
     - 依次完成开关两端、灯端压降、供电侧与搭铁侧压降测量并提交维修决策。
   - 访问 **B01 ~ B06**（篇章二）：
     - 体验欧姆定律滑动调压变阻；
     - 体验双路车灯串联并联改装对比；
     - 体验改变搭铁接点时两点电压差恒定；
     - 体验工位用电 8 小时电费计算与 10A 熔丝超载切断；
     - 体验起动机大电流下蓄电池端电压塌陷；
     - 体验 NTC 水温信号分压及错误低阻并联引起的分压失真反例。
