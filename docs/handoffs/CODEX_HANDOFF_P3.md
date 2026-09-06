# 交接文档：P3 直流规律与设计（B01—B06）交接给 Codex 继续执行

- **交接发起方**：Antigravity / Gemini（主线开发者）
- **交接接收方**：Codex
- **交接日期**：2026-09-06
- **当前分支**：`codex/auth-organization-d1-repair`
- **当前最新提交**：`481f7c2` (`feat(circuit): add DC analysis utils and tests for Ohm's law, power and KCL/KVL (P3 init)`)
- **前置基线提交**：`7505b0a` (`feat(circuit): implement MNA DC solver, universal multimeter and A02-A04 measurement levels (P2)`)

---

## 一、当前工程健康状态（截至交接时）

- **测试套件状态**：`npm test` $\rightarrow$ **30 passed (30), 192 passed (192)**，100% 通过。
- **静态类型检查**：`npm run typecheck` $\rightarrow$ **0 errors**。
- **Linter 规范检查**：`npm run lint` $\rightarrow$ **0 warnings, 0 errors**（172 文件 208 条规则全部通过）。
- **生产打包构建**：`npm run build` $\rightarrow$ `vinext build` 生成 `dist/standalone/` 成功。

---

## 二、P2 阶段已闭环交付物回顾

1. **MNA 直流求解器与拓扑解耦**：
   - `src/circuit/solver/Matrix.ts`：全选主元高斯消元法。
   - `src/circuit/solver/DCSolver.ts`：纯 TypeScript 修正节点分析法（MNA），支持恒压源（含内阻 $r$）、电阻、电位器变比、开关通断、电表负载效应，精度 $< 10^{-6}$。
   - `src/circuit/CircuitTopologyEngine.ts`：已解耦构造函数中的 LEVEL_02 固定依赖，支持通用拓扑初始化。
2. **通用万用表与钳形表模型**：
   - `src/game/instruments/Multimeter.ts`：支持电压/电阻/电流/通断，COM+VΩ/10A 插孔校验，V03 极性反接反号，V04 色环公差判定，V05 带电测阻安全拒测，V06 电流挡短路熔丝保护。
   - `src/game/instruments/ClampMeter.ts`：非接触单导线感应读数与双导线反向磁通抵消（0A）反例教学。
3. **已上线 6 门关卡**：
   - O00、O01、A01（已发布）
   - A02（给电路做体检 · 电压分析与测量）
   - A03（元件身份核验 · 电阻识别与测量）
   - A04（电流到底走哪里 · 电流分析与测量及钳形表）
   - 完整交接报告详见：`docs/handoffs/P2-2026-09-06/HANDOFF.md`。

---

## 三、P3 阶段当前进展与 Codex 待办工作

用户已批准 P3 实施方案，详见根目录或 brain 中的 `implementation_plan.md`。

### 3.1 已完成的工作（由 Gemini 完成）
1. **分析计算工具库与基准测试**：
   - `src/circuit/solver/DCAnalysisUtils.ts`：已实现部分电路欧姆定律计算、功率与过载判定、工位用电与电费预算（kWh）、全电路电源内阻与端电压分析、分压电路空载/带载分析、KCL/KVL 闭合与节点守恒验证。
   - `tests/dcAnalysis.test.ts`：6 项基准测试全部通过。

### 3.2 Codex 需继续实现的 6 门关卡（B01—B06）
请参考 `src/levels/a02/`、`src/levels/a03/`、`src/levels/a04/` 的 Experience + Scene 规范架构，在 `src/levels/` 下实现：

| 关卡编号 | 目录位置 | 对应教材任务 | 核心任务与必须演示的教学反例 |
|---|---|---|---|
| **B01 找出变化规律** | `src/levels/b01/` | 任务5 欧姆定律的应用 | 1. 固定R变U测I（作图绘制U-I直线）；2. 固定U变R测I；3. 预测未知电阻阻值并实测验证。<br>🔴 **反例**：电阻是元件本身的固有物理属性，控制变量实验严禁得出“电阻随电压增大而增大”的荒谬结论。 |
| **B02 灯组改装** | `src/levels/b02/` | 任务6 负载的连接 | 1. 串联灯组实验（分压变暗、拧下一盏全灭）；2. 并联灯组改装（独立可控、额定亮度）；3. 等效电阻计算与总分流。<br>🔴 **反例**：串并联绝非看几何外观排布（摆成一排也能并联），而是看电气节点连接！并联接入新负载总电流增大。 |
| **B03 追踪节点与回路** | `src/levels/b03/` | 任务4/6 KCL/KVL | 1. KCL 节点进出电流守恒（$\sum I_{in} = \sum I_{out}$）；2. KVL 闭合回路压降代数和为 0；3. 任意两点电位差测量。<br>🔴 **反例**：改变参考点（搭铁接点移动）改变各点绝对电位，但**绝不改变任何两点间的电压差**（$U_{AB} = V_A - V_B$ 恒定不变）。 |
| **B04 工位用电预算** | `src/levels/b04/` | 任务7 电能和电功率 | 1. 额定功率与实际功率区分（$P=UI$）；2. 8小时用电预算与电费计算（度 kWh）；3. 保险丝容量选型与过载热效应。<br>🔴 **反例**：额定功率不是所有工况的实际功率；超载方案绝不能因为“灯泡勉强亮着”而判合格（超载熔丝切断拦截）。 |
| **B05 电源为什么带不动** | `src/levels/b05/` | 任务5 欧姆定律应用 | 1. 全电路欧姆定律与电源内阻 $r$ 建模；2. 空载 vs 轻载 vs 重载端电压跌落曲线；3. 实车起动机大电流（大压降）导致大灯昏暗诊断。<br>🔴 **反例**：空载测得 12V 正常绝不能证明蓄电池正常！极板硫化内阻增大在重载下端电压瞬间塌陷。 |
| **B06 传感器信号与分压** | `src/levels/b06/` | 任务6 负载的连接 | 1. 双电阻分压信号输出；2. NTC 水温传感器随温变阻与 ECU 高阻采样；3. 错误低阻负载并入引起的分压剧烈跌落（V09）。<br>🔴 **反例**：分压器带载后输出严重失真，严禁“串联一个电阻为任意汽车低压电器降压供电”。 |

### 3.3 注册与路由配置
- 在 `src/courses/registry.ts` 中将 B01~B06 的状态更新为 `publicationStatus: 'PUBLISHED'`, `implemented: true`, `contentVersion: '1.0.0'`。
- 在 `src/app/GameShell.tsx` 中挂载 B01~B06 路由，使得实训大厅导航与 URL 直接访问可用。

### 3.4 适配与补充测试
- 编写关卡集成测试（如 `tests/b01ToB06.test.ts` 或各关专项测试）。
- 更新 `tests/courseRegistry.test.ts` 和 `tests/attemptEvidence.test.ts`（更新已发布关卡断言，未发布关卡测试移到 C01 与 D01）。

### 3.5 交付与文档要求
- 满足质量门禁：`npm test` 全绿，`npm run lint` 0 告警，`npm run typecheck` 0 错误，`npm run build` 成功。
- 归档交接文档：`docs/handoffs/P3-2026-09-06/HANDOFF.md`。
- 严禁使用 `git add .`，仅 stage 验证通过的代码文件。
