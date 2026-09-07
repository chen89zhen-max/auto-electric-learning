# P4/P5/P6 及 27 关终验整改 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. 如果执行平台没有这些技能，则严格按本文件的任务顺序逐项执行；每个任务完成、测试、提交后再进入下一项。

**Goal:** 修复终验发现的教学数据失真、E07 教师签署伪造、万用表防呆绕过、C02 故障类型缺失及教材/UI/性能问题，使 P4—P6 与全系统 27 个已发布关卡达到可供学生和教师正式使用的标准。

**Architecture:** 保持现有 Vinext＋React＋Node＋原生 SQLite 单机架构，不引入 D1、云数据库、消息队列或微服务。新增统一的学习过程记录与量规评分模块，由服务端复算并持久化；各关卡只上报真实过程指标。E07 沿用现有班级隔离和教师评价服务，学生只能形成“待教师验收”，教师在本人任教班级范围内签署。

**Tech Stack:** Vinext 1.0.0-beta.9、React 19、TypeScript 5.9、Node 22.13+（群晖生产建议 Node 24 LTS）、`node:sqlite`、Vitest、Testing Library、Playwright 或可用的 Chromium 端到端工具。

**Spec:** `汽车电工电子游戏_P4_P5_P6及27关终极验收报告_2026-09-06.md`、`docs/design/TRAINING_DEVELOPMENT_STANDARDS.md`、`docs/superpowers/specs/2026-09-05-auth-organization-synology-sqlite-design.md`。

## 0. Gemini 执行协议

1. 开始前阅读上述三份材料，以及 `docs/design/TRAINING_DEVELOPMENT_STANDARDS.md`、`docs/handoffs/CODEX_FINAL_AUDIT_P4_P5_P6.md`。
2. 只在当前仓库内修改；不得删除、覆盖用户未跟踪文件，不得执行 `git reset --hard` 或整体回退。
3. 严格按 Task 1—10 顺序实施。每个任务先写失败测试，再实现，再跑该任务测试，再提交；禁止一次性重写 15 关。
4. 每个任务形成独立 commit。提交前运行 `npm run typecheck` 和与本任务相关的测试。
5. 不得用“扩大 lint 忽略、提高 chunk 告警阈值、隐藏警告、继续硬编码满分、前端假签字”等方式让检查表面通过。
6. 不得改变账号、班级和权限总原则：管理员可管理全系统；教师只访问本人有效任教班级；学生只访问本人资料及学习记录。
7. 不得迁移到 D1 或其他云服务。生产数据库仍是群晖本地卷中的原生 SQLite；现有备份、恢复和迁移机制必须继续通过。
8. 本游戏的成绩定位为形成性学习证据，不作为无人监考的高风险认证考试。服务端必须复算正常学习流程的成绩，但本轮不建设摄像监考、设备指纹或复杂反作弊系统。
9. 每个任务完成后返回简短移交包：状态、实际修改、文件位置、测试结果、风险；不得用大段日志替代结论。
10. 教材决定必须掌握的知识和技能边界，游戏重新设计学生“怎么学”：可见现象→可操作变量→即时反馈→发现规律→形成概念→迁移到汽车维修。不得为追求教材页码对应而破坏游戏任务逻辑。

**阶段停点：** Task 1—4 为第一阶段（上线红线）；Task 5—7 为第二阶段（教学内容与访问控制）；Task 8—9 为第三阶段（可用性与性能）；Task 10 为第四阶段（终验）。每个阶段结束后先提交移交包并等待人工/Codex 审查，不要连续完成四个阶段后才汇报。

**基线确认：** 开工先运行 `git rev-parse HEAD` 和 `git status --short`。本计划编制时 HEAD 为 `e9355ba612fd1592e29d945effbd669f572a53fb`；如果执行时不同，不得 reset，先说明新增提交及其与本计划的冲突。随后运行四门禁，预期基线为 55 个测试文件、280 项测试通过，类型/lint 为 0 错误，构建成功但有超大 chunk 告警。

## 全局验收红线

- 所有题目初始 `choice === null`，提交前不得预选、标绿、标红或以动画暗示正确答案。
- 五阶段流程保留为“认知→规范→定量计算→盲测→实车/工程迁移”，不得把教材页面顺序机械搬入游戏。
- 所有万用表初始状态必须为 OFF；OFF、错误挡位、错误插孔、带电测阻及危险跨接必须阻断状态推进，不能只显示提示。
- P4—P6 不得再从页面传入固定五星、固定 2 分钟、固定 `guided` 或默认 100 分。
- 学生不能创建、修改或伪造教师评价；教师不能评价非本人任教班级学生。
- 保持 27 个关卡已发布、ID 唯一、F01 建设中；教师预览不写学生记录。
- 主文、主任务和操作说明不低于 16px；按钮、表盘标签和工单字段不低于 14px；仅非关键元数据可用 12px；不得保留 10px。
- 四门禁最终必须全部通过：`npm test`、`npm run typecheck`、`npm run lint`、`npm run build`。

---

### Task 1：建立统一学习过程数据与服务端量规评分

**Files:**

- Create: `src/assessment/assessmentTypes.ts`
- Create: `src/assessment/assessmentReducer.ts`
- Create: `src/assessment/rubrics.ts`
- Create: `src/assessment/scoreAssessment.ts`
- Create: `src/assessment/useLevelAssessment.ts`
- Modify: `src/types/evidence.ts`
- Modify: `src/stores/userProgressStore.ts`
- Modify: `src/server/learning/stateTransitions.ts`
- Modify: `src/server/learning/learningEventService.ts`
- Modify: `src/components/AbilityReport.tsx`
- Modify: `src/components/CompletionStatus.tsx`
- Test: `tests/assessmentScoring.test.ts`
- Test: `tests/attemptEvidence.test.ts`
- Test: `tests/abilityReport.test.tsx`

**Interfaces:**

- Produces the following stable types; later tasks must import them rather than create per-level substitutes:

```ts
export type TrainingStageId =
  | 'cognition'
  | 'standard'
  | 'calculation'
  | 'blind_test'
  | 'transfer';

export interface StageAssessment {
  stageId: TrainingStageId;
  mode: 'guided' | 'independent' | 'transfer';
  startedAt: number;
  completedAt: number | null;
  wrongAttempts: number;
  hintRequests: number;
  meterGuardBlocks: number;
  unsafeActions: number;
  retries: number;
  completed: boolean;
}

export interface LevelAssessmentResult {
  schemaVersion: 1;
  levelId: string;
  rubricVersion: 'v2';
  startedAt: number;
  completedAt: number;
  stages: StageAssessment[];
}

export interface ScoredAssessment {
  score: number;
  durationMs: number;
  mode: 'guided' | 'independent' | 'transfer';
  dimensions: Array<{ id: EvidenceDimensionId; label: string; score: number; stars: number }>;
  evidence: Partial<Record<EvidenceDimensionId, EvidenceStatus>>;
  counters: {
    wrongAttempts: number;
    hintRequests: number;
    meterGuardBlocks: number;
    unsafeActions: number;
    retries: number;
  };
}
```

- `scoreAssessment(result: LevelAssessmentResult): ScoredAssessment` must be a pure function used by both browser display and server persistence.
- Five stages carry maximum points `[10, 20, 20, 25, 25]` in the order above.
- For each completed stage, quality factor is `max(0.4, 1 - 0.12*wrongAttempts - 0.15*hintRequests - 0.20*meterGuardBlocks - 0.30*unsafeActions - 0.05*retries)`; an incomplete stage scores 0. Overall score is the rounded sum of five stage points, clamped to 0—100.
- Star thresholds are fixed: `90—100=5`、`80—89=4`、`70—79=3`、`60—69=2`、`0—59=1`。不得把“最终完成”直接等同五星。
- Attempt mode derivation: any stage used a hint → `guided`; otherwise, transfer stage以 `mode='transfer'` 完成 → `transfer`; otherwise, blind-test stage以 `mode='independent'` 完成 → `independent`; other cases → `guided`.
- Evidence level derives from associated stage performance: transfer stage quality ≥0.8 gives `TRANSFER_COMPLETE`; blind/transfer independent quality ≥0.7 gives `INDEPENDENT_COMPLETE`; completed gives `GUIDED_COMPLETE`; otherwise `NO_EVIDENCE`.
- `rubrics.ts` must contain explicit mappings for C01—E07，不允许运行时猜测。C01—C03 mapping: 安全规范=`standard+transfer`、电路识读=`cognition+calculation`、工具测量=`standard+blind_test`、规律解释=`calculation`、诊断策略=`blind_test+transfer`、证据表达=`transfer`。D01—D05/E01—E06 mapping: 安全规范=`standard`、电路识读=`cognition+blind_test`、工具测量=`standard+blind_test`、规律解释=`calculation`、诊断策略=`blind_test+transfer`、证据表达=`transfer`。E07 mapping: 安全规范=`standard`、电路识读=`cognition`、工具测量=`standard+blind_test+transfer`、规律解释=`calculation`、诊断策略=`blind_test`、证据表达=`transfer`。

- [ ] **Step 1: Write failing scoring tests**

```ts
it('distinguishes clean, hinted, and unsafe completion', () => {
  const clean = scoreAssessment(makeFiveStageResult('C01'));
  const hinted = scoreAssessment(makeFiveStageResult('C01', { hintRequests: 1 }));
  const unsafe = scoreAssessment(makeFiveStageResult('C01', { meterGuardBlocks: 2, unsafeActions: 1 }));
  expect(clean.score).toBe(100);
  expect(hinted.score).toBeLessThan(clean.score);
  expect(unsafe.score).toBeLessThan(hinted.score);
  expect(clean.mode).toBe('transfer');
  expect(hinted.mode).toBe('guided');
});

it('uses real elapsed time and never accepts negative duration', () => {
  expect(scoreAssessment(makeFiveStageResult('E01', { durationMs: 180_000 })).durationMs).toBe(180_000);
  expect(() => scoreAssessment(makeInvalidTimeResult())).toThrow();
});
```

- [ ] **Step 2: Run tests and confirm they fail because the new assessment API does not exist**

Run: `npm test -- --run tests/assessmentScoring.test.ts tests/attemptEvidence.test.ts tests/abilityReport.test.tsx`

- [ ] **Step 3: Implement the types, reducer, rubric registry and pure scorer**

The reducer must expose actions `START_STAGE`、`RECORD_WRONG`、`REQUEST_HINT`、`METER_BLOCKED`、`UNSAFE_ACTION`、`RETRY_STAGE`、`COMPLETE_STAGE` and `COMPLETE_LEVEL`. Counters may only increase; timestamps must be finite integers and `completedAt >= startedAt`.

- [ ] **Step 4: Make the server authoritative for P4—P6 scores**

`submitLevelCompletion` sends `assessment`, not a trusted final score, for C01—E07. `learningEventService` validates `schemaVersion`、`levelId`、timestamps and stage IDs, calls `scoreAssessment`, then writes calculated score/mode/evidence/metrics into the existing `learning_attempts.evidence_data` and `rubric_version='v2'`. For legacy O/A/B levels, keep the existing payload path during this round. For C01—E07, reject missing/invalid assessment with HTTP 422; ignore any client-supplied score that disagrees with the server calculation.

- [ ] **Step 5: Remove fabricated fallbacks**

`AbilityReport` may display a loading/incomplete state when no real report exists, but must not create five-star dimensions or “100%/优秀/1分钟”. `CompletionStatus` must not default to score 100 or generic evidence for C01—E07. A missing assessment is an explicit error and must not save completion.

- [ ] **Step 6: Verify focused and regression tests**

Run: `npm test -- --run tests/assessmentScoring.test.ts tests/attemptEvidence.test.ts tests/abilityReport.test.tsx tests/authBoundary.test.ts tests/classIsolationPhase2.test.ts`

Expected: all pass; three different processes create three different scores and evidence; cross-class protections remain intact.

- [ ] **Step 7: Commit**

Commit: `feat: add evidence-based assessment scoring`

---

### Task 2：把真实过程记录接入 C01—E07 十五关

**Files:**

- Modify: all `src/levels/{c01,c02,c03,d01,d02,d03,d04,d05,e01,e02,e03,e04,e05,e06,e07}/*Experience.tsx`
- Modify: all corresponding `*Scene.tsx`
- Modify: corresponding `*Training.ts` only when stage/evidence mapping needs an explicit ID
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: existing 15 level test files
- Create: `tests/p4p5p6AssessmentIntegration.test.tsx`

**Interfaces:**

- Each scene must finish with `onComplete(result: LevelAssessmentResult)`.
- Each Experience passes the returned result to `AbilityReport` and `CompletionStatus`; it must not construct fixed `dimensions`、`summaryItems`、`mode` or fake duration.
- Each choice submission records the first submission before rendering correctness. Hint buttons increment `hintRequests`; rejected instrument operations increment `meterGuardBlocks`; unsafe operations increment `unsafeActions`; stage replay increments `retries`.

- [ ] **Step 1: Add a source-level regression test that forbids fixed assessment values**

Test must scan the 15 Experience files and fail on the prior patterns: every dimension `stars: 5` arrays, `本关用时.*2 分钟`, fixed `mode="guided"`, and completion without `LevelAssessmentResult`.

Install only the component-test development dependencies needed here: `@testing-library/react`、`@testing-library/user-event`、`jsdom`。Keep the default Vitest environment as Node; component test files explicitly start with `// @vitest-environment jsdom` so server/database tests do not move into a browser-like environment.

- [ ] **Step 2: Run the new test and observe failure on current files**

Run: `npm test -- --run tests/p4p5p6AssessmentIntegration.test.tsx`

- [ ] **Step 3: Integrate P4 and P5 sequentially**

Process C01, C02, C03, D01, D02, D03, D04, D05 one level at a time. After each level, run its existing test plus `assessmentScoring.test.ts`. Do not alter the level's physics model except where later tasks explicitly require it.

- [ ] **Step 4: Integrate P6 sequentially**

Process E01—E07 one level at a time under the same rule. E07 must report only the virtual task metrics in this task; teacher physical confirmation is implemented in Task 3.

- [ ] **Step 5: Verify no fixed result remains**

Run:

```powershell
rg -n "stars:\s*5|本关用时.*2 分钟|mode=\"guided\"" src/levels/c01 src/levels/c02 src/levels/c03 src/levels/d01 src/levels/d02 src/levels/d03 src/levels/d04 src/levels/d05 src/levels/e01 src/levels/e02 src/levels/e03 src/levels/e04 src/levels/e05 src/levels/e06 src/levels/e07
```

Expected: no fabricated report result. Legitimate rubric thresholds or explanatory text are allowed only after manual inspection.

- [ ] **Step 6: Run all 15 level tests plus assessment integration test**

Expected: all prior knowledge/calculation tests continue to pass and new clean/hinted/error scenarios produce different reports.

- [ ] **Step 7: Commit**

Commit: `refactor: connect p4 p5 p6 levels to real assessment evidence`

---

### Task 3：把 E07 改成真实教师量规签署闭环

**Files:**

- Create: `src/server/db/migrations/0008_teacher_physical_rubric.sql`
- Modify: `src/server/db/schema.sql`
- Modify: `src/server/teaching/teacherService.ts`
- Modify: `app/api/teacher/evaluations/route.ts`
- Create: `app/api/learning/evaluations/route.ts`
- Modify: `src/components/teacher/StudentEvidence.tsx`
- Modify: `src/components/teacher/teacherTypes.ts`
- Modify: `src/levels/e07/E07PcbAssemblyScene.tsx`
- Modify: `src/levels/e07/E07Experience.tsx`
- Test: `tests/teacherWorkspace.test.ts`
- Create: `tests/e07TeacherRubric.test.ts`

**Interfaces and data:**

- Migration adds to `teacher_evaluations`: `evaluation_type TEXT NOT NULL DEFAULT 'FORMATIVE'`、`rubric_version TEXT`、`rubric_data TEXT`、`signed_at INTEGER`，并建立部分唯一索引：`UNIQUE(attempt_id, evaluation_type) WHERE evaluation_type='PHYSICAL_RUBRIC' AND attempt_id IS NOT NULL`。Do not create a second database.
- E07 rubric version is `E07-PHYSICAL-v1`. Items are `pre_power_check` 20、`component_orientation` 20、`solder_quality` 30、`safety_process` 20、`evidence_explanation` 10. Teacher submits item scores; server verifies integer range and computes total. The API does not accept a trusted total score.
- A pending E07 physical task is inferred from a completed E07 learning attempt without a linked `PHYSICAL_RUBRIC` evaluation. No new queue service is needed.
- Student GET `/api/learning/evaluations?attemptId=...` may read only the current student's evaluation. Teacher POST may sign only an E07 attempt belonging to a current student in the teacher's effective class assignment.

- [ ] **Step 1: Write failing authorization and score-computation tests**

Cover: student cannot POST; Teacher A can sign Student A; Teacher B is 403; attempt must belong to student and be E07; invalid item score is 422; total is server-calculated; student can read own result but not another student's; duplicate signature is 409 unless a documented amendment path creates an audit record.

- [ ] **Step 2: Run the tests and confirm failure**

Run: `npm test -- --run tests/e07TeacherRubric.test.ts tests/teacherWorkspace.test.ts`

- [ ] **Step 3: Apply migration and service rules**

Use existing migration runner and `isTeacherAuthorizedForStudent`. Every create/amend action writes an audit log containing teacher ID, student ID, attempt ID and rubric version, but not passwords or session tokens.

- [ ] **Step 4: Replace student self-signing UI**

Delete fixed `teacherScore = 96` and the student checkbox that represents “陈师傅核验”. After virtual completion, show “虚拟训练已完成，实物焊接等待任课教师验收”；if a signed result exists, display teacher name, score, signed time and rubric breakdown read-only.

- [ ] **Step 5: Add teacher pending-rubric UI**

`StudentEvidence` lists E07 attempts and a five-item rubric form. It must send `studentId` and `attemptId`; the selected student list remains server-scoped. Do not allow a free-form arbitrary student ID field.

- [ ] **Step 6: Verify**

Run: `npm test -- --run tests/e07TeacherRubric.test.ts tests/teacherWorkspace.test.ts tests/classIsolationPhase2.test.ts tests/authBoundary.test.ts tests/sqliteMigrations.test.ts`

- [ ] **Step 7: Commit**

Commit: `feat: require authorized teacher rubric for e07 physical assessment`

---

### Task 4：建立统一万用表强制门禁并修复绕过路径

**Files:**

- Create: `src/game/instruments/meterGuard.ts`
- Create: `tests/meterGuard.test.ts`
- Modify: `src/levels/c01/C01VoltageDropScene.tsx`
- Modify: `src/levels/c02/C02FaultClassifyScene.tsx`
- Modify: `src/levels/c03/C03IndependentDeliveryScene.tsx`
- Modify: `src/levels/d01/D01RelayControlScene.tsx`
- Modify: `src/levels/d02/D02DcMotorScene.tsx`
- Modify: `src/levels/d03/D03AlternatorScene.tsx`
- Modify: `src/levels/d04/D04InductanceScene.tsx`
- Modify: `src/levels/d05/D05TransformerScene.tsx`
- Modify E01—E07 only where a multimeter measurement action exists
- Test: related C/D/E tests

**Interfaces:**

```ts
export interface MeterGuardInput<Mode extends string> {
  currentMode: Mode;
  expectedMode: Mode;
  blackJackOk: boolean;
  redJackOk: boolean;
  probesPlaced: boolean;
  circuitPowered: boolean;
  resistanceMeasurement: boolean;
  dangerousBridge: boolean;
}

export type MeterGuardResult =
  | { allowed: true }
  | { allowed: false; code: 'OFF' | 'WRONG_MODE' | 'WRONG_JACK' | 'PROBE_MISSING' | 'LIVE_RESISTANCE' | 'DANGEROUS_BRIDGE'; message: string };
```

- [ ] **Step 1: Write table-driven failing tests for every guard code**

Tests must assert not only the warning code but also that the caller callback is not executed when `allowed=false`.

- [ ] **Step 2: Implement pure guard and a single caller pattern**

Every measurement/reveal/submit handler uses:

```ts
const guard = evaluateMeterGuard(input);
if (!guard.allowed) {
  assessment.dispatch({ type: 'METER_BLOCKED', stageId: currentStage });
  setMeterWarning(guard.message);
  return;
}
```

- [ ] **Step 3: Fix confirmed bypasses**

At minimum verify C03 `triggerWiggleTest` and D02/D03/D04 blind-submit handlers. C01/C02 must validate expected mode, not only OFF. D01/D05 existing good patterns must be migrated without regression.

- [ ] **Step 4: Add component-level assertions**

For each affected level, test: starts OFF; OFF action does not advance or reveal; wrong non-OFF mode does not advance; correct mode advances; error can be corrected and retried.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --run tests/meterGuard.test.ts tests/multimeter.test.ts` plus all C01—D05 level tests.

Commit: `fix: enforce multimeter safety gates across diagnostic levels`

---

### Task 5：补齐 C02“短路到电源”第四类故障

**Files:**

- Modify: `src/levels/c02/c02Training.ts`
- Modify: `src/levels/c02/C02FaultClassifyScene.tsx`
- Modify: `src/levels/c02/C02Experience.tsx`
- Modify: C02 test file

**Model:**

- Add fault key `SHORT_TO_POWER` alongside open circuit、short to ground、high resistance.
- The blind sample must use measurement evidence that distinguishes it from short to ground: an unintended downstream node remains near B+ when the command/switch should make it 0 V or isolated; resistance/continuity is only allowed after power isolation.
- Safety feedback must explain that an unintended B+ can energize a load or control line and must not be treated as a simple open circuit.

- [ ] **Step 1: Write a failing test requiring all four unique fault keys and measurement signatures**
- [ ] **Step 2: Add the model, one guided example and at least one randomized blind sample**
- [ ] **Step 3: Add repair strategy and post-repair verification; do not add only a text-choice question**
- [ ] **Step 4: Verify zero spoiler: random seed may choose the fault, but initial choice remains null and the fault label is not present in visible pre-submit feedback**
- [ ] **Step 5: Run C02 tests and commit**

Commit: `feat: add short-to-power diagnosis to c02 blind faults`

---

### Task 6：补齐教材能力边界，但不照搬教材环节

**Files:**

- Modify: `src/levels/e02/e02Training.ts`
- Modify: `src/levels/e02/E02CapacitorScene.tsx`
- Modify: E02 tests
- Modify: `src/levels/d02/d02Training.ts`
- Modify: `src/levels/d02/D02DcMotorScene.tsx`
- Modify: D02 tests
- Modify: `src/levels/e07/e07Training.ts`
- Modify: `src/levels/e07/E07PcbAssemblyScene.tsx`
- Modify: E07 tests
- Modify: `src/courses/registry.ts`
- Modify: `src/components/CourseMapLobby.tsx`
- Test: `tests/courseRegistry.test.ts` or current registry test

- [ ] **Step 1: E02 add a control-variable micro-experiment**

Students drag plate area and spacing while other conditions stay fixed, observe capacitance/charge-time trend, then predict a new case. Required relations: area increases → capacitance increases; distance increases → capacitance decreases. The goal is observable manipulation→pattern→concept, not a formula-copy page.

- [ ] **Step 2: D02 add two compact transfer nodes**

Add a starter-motor structure mapping task covering armature、field/永久磁体、commutator、brush、starter solenoid and drive mechanism; add a short three-phase rotating-field comparison that distinguishes it from the brushed DC motor. These are recognition/transfer nodes and must not replace the existing H-bridge main game.

- [ ] **Step 3: E07 add pre-power soldering-iron inspection**

Before heating, require inspection of power cord/plug、insulation/grounding、iron tip、stand、temperature setting and work-area combustibles. Any omitted red-line item blocks heating and records `unsafeActions`.

- [ ] **Step 4: Mark D05 as elective**

Add an explicit registry field such as `curriculumRequirement: 'required' | 'elective'`. D05 is `elective`; its card displays “教师选学/拓展”. It must not silently block the required progression. Do not add a new database table in this task; teacher-level course assignment can be a later product feature.

- [ ] **Step 5: Correct wording**

Replace E07 “焊点半月度” with the intended term after checking context—normally “焊点饱满度”或“焊点润湿度”；do not guess if the sentence has a different intended meaning.

- [ ] **Step 6: Clarify C01 threshold wording**

Do not call one fixed value a universal industry standard. Present the level's training criterion as a configurable exercise threshold and tell students to follow the vehicle service manual/segment specification in real work. Keep current numerical behavior only if its scenario source is documented.

- [ ] **Step 7: Run E02/D02/E07/registry tests and commit**

Commit: `feat: close textbook capability gaps without copying textbook flow`

---

### Task 7：阻止学生通过直达 URL 绕开前置关卡

**Files:**

- Modify: `src/app/levelRoute.ts`
- Modify: `src/app/GameShell.tsx`
- Modify: `tests/levelRoute.test.ts`
- Create: `tests/directLevelAccess.test.tsx`

**Interfaces:**

```ts
export interface LevelRouteContext {
  role: 'student' | 'teacher' | 'admin' | 'guest';
  completedLevelIds: string[];
  teacherPreview: boolean;
}

export function resolveRequestedLevel(search: string, context: LevelRouteContext):
  | { kind: 'level'; levelId: string }
  | { kind: 'home' }
  | { kind: 'blocked'; levelId: string; missingPrerequisites: string[] };
```

- [ ] **Step 1: Write failing role-and-prerequisite matrix tests**

Student with missing prerequisite is blocked; student with prerequisite enters; teacher preview enters any published level without writes; admin remains in admin console; unpublished F01 returns home; guest does not enter a protected level.

- [ ] **Step 2: Implement resolution after auth and progress are loaded**

Do not decide the route before session/progress hydration. Blocked students see the missing prerequisite and a return-to-map button; do not silently open the target level.

- [ ] **Step 3: Preserve server enforcement**

Do not weaken `stateTransitions.ts` prerequisite validation. Client blocking is usability; server blocking remains authoritative.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- --run tests/levelRoute.test.ts tests/directLevelAccess.test.tsx tests/attemptEvidence.test.ts`

Commit: `fix: enforce student prerequisites on direct level routes`

---

### Task 8：修正字号层级和 TTS 课堂控制

**Files:**

- Modify: P4—P6 Experience and Scene components containing `text-[10px]` or operational `text-xs`
- Modify: `src/components/visuals/SpeechTts.ts`
- Create: `src/components/visuals/SpeechPreferences.ts`
- Create: `src/components/visuals/SpeechControls.tsx`
- Test: `tests/speechTts.test.ts`
- Create: `tests/p4p5p6Typography.test.ts`

- [ ] **Step 1: Add static typography guard test**

Fail on `text-[10px]` anywhere in P4—P6. Fail on `text-xs` when used on buttons, meter labels, task instructions or form fields. Allow 12px only for timestamps, IDs and secondary metadata.

- [ ] **Step 2: Adjust hierarchy, not a blind global replacement**

Use ≥16px for tasks/body, ≥14px for controls and instrument labels, 12px for metadata. Verify long Chinese strings wrap and do not cover meters, waveforms, buttons or the mentor panel.

- [ ] **Step 3: Implement TTS status and preferences**

`speakText` returns `{ ok: boolean; reason?: 'unsupported' | 'blocked' | 'no_voice' | 'error' }`. Subscribe to `voiceschanged`; select `zh-CN` first and other Chinese voices second. Persist mute、volume、rate and auto-read preference locally per browser. Default auto-read is OFF for classroom noise control; replay remains visible.

- [ ] **Step 4: Do not swallow failures silently**

If speech is unavailable, show a brief non-blocking message and retain the text. TTS failure must never block level completion.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --run tests/speechTts.test.ts tests/p4p5p6Typography.test.ts`

Commit: `fix: improve classroom readability and speech controls`

---

### Task 9：按关卡拆分客户端代码，消除超大主块

**Files:**

- Modify: `src/app/GameShell.tsx`
- Create: `src/app/levelComponents.ts`
- Test: `tests/levelComponentRegistry.test.ts`

- [ ] **Step 1: Write a registry completeness test**

Assert all 27 published IDs resolve to a loader, aliases resolve to canonical IDs, F01 has no executable loader, and there are no duplicate loader keys.

- [ ] **Step 2: Replace 27 synchronous imports with lazy loaders**

Use React lazy/dynamic import compatible with Vinext. `levelComponents.ts` owns the mapping; `GameShell.tsx` owns auth and selected-level rendering only. Provide a light accessible loading state. Do not raise `chunkSizeWarningLimit`.

- [ ] **Step 3: Keep teacher/admin code out of student first-load path where supported**

Teacher dashboard and administrator console should also be lazy-loaded after role resolution.

- [ ] **Step 4: Build and inspect output**

Run: `npm run build`

Expected: no chunk-over-500-kB warning; entering one level does not load every other level chunk. If one level itself exceeds 500kB, split that level by scene instead of hiding the warning.

- [ ] **Step 5: Commit**

Commit: `perf: lazy load level and role workspaces`

---

### Task 10：建立浏览器级红线回归并执行最终上线复验

**Files:**

- Create: `tests/e2e/p4p5p6-redlines.spec.ts`
- Create: `tests/e2e/roles-and-e07.spec.ts`
- Modify: `package.json` only if adding the smallest necessary test dependency/script
- Modify: `docs/handoffs/CODEX_FINAL_AUDIT_P4_P5_P6.md` only to append the actual post-fix result; do not rewrite historical claims

- [ ] **Step 1: Add a data-driven 15-level browser test**

For C01—C03、D01—D05、E01—E07 verify: direct authorized entry; initial choice neutral; no answer reveal before submission; stage heading and primary action visible; no horizontal overflow at 1366×768; keyboard focus visible; 200% text zoom does not hide the primary action.

- [ ] **Step 2: Add targeted interactive redline tests**

Cover at least C03 wiggle test, D02/D03/D04 blind-submit, C02 four-fault sample and E07 pending-teacher flow. For meter tests assert both visible warning and unchanged state/answer visibility.

- [ ] **Step 3: Add three-role end-to-end test**

Admin creates/edits a class, assigns Teacher A, moves Student A; Teacher A sees Student A and not Student B; Teacher B cannot query/sign Student A; Student A cannot enter teacher/admin routes; E07 teacher signature appears read-only to Student A.

- [ ] **Step 4: Run the complete automated gate**

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all exit 0, test count is greater than the baseline 55 files/280 tests, and build has no oversized-chunk warning.

- [ ] **Step 5: Run all 27 direct URLs**

Verify O00、O01、A01—A04、B01—B06、C01—C03、D01—D05、E01—E07. HTTP 200 is only the first check; at least the 15 new levels must complete a real browser interaction smoke test.

- [ ] **Step 6: Run classroom-oriented manual checks**

Use Chromium/Chrome/Edge at 1366×768 and 1920×1080, normal and 200% text zoom. Check TTS replay, mute persistence, Chinese voice fallback, stage animation, scroll/overflow and weak-network level loading. Record screenshots only after answer neutrality is confirmed.

- [ ] **Step 7: Run SQLite deployment regression**

Run existing SQLite migration、production-boundary、backup and restore tests. Build and start `dist/standalone` using a writable local data directory; confirm `quick_check` and health endpoint. Do not place the live database on SMB/NFS.

- [ ] **Step 8: Produce final remediation handoff**

List commits, files, test counts, build chunk sizes, browser matrix, remaining risks and any consciously deferred item. Do not write “全部完成” if any redline browser test or role test was not actually executed.

Commit: `test: add final p4 p5 p6 production acceptance coverage`

## 完成定义

Gemini 只有同时提供以下证据时，才可宣布整改完成：

1. Task 1—10 每项均有独立 commit 和对应测试；
2. P4—P6 的报告中不再存在固定满分、固定时间和固定模式；
3. E07 不存在学生自签路径，教师签署经过班级授权并关联具体 attempt；
4. 所有仪表错误操作都实际阻断状态变化；
5. C02 的第四类故障有模型、测量证据、盲样、修复和测试；
6. T10/T12/T18 能力缺口已按游戏化逻辑补齐，D05 明确为选学；
7. 15 关浏览器红线测试和三角色全链路测试通过；
8. 四门禁全部通过，构建不再有超大主块告警；
9. 群晖 Node＋SQLite 部署、迁移、备份和恢复能力没有退化；
10. 将最终提交交回 Codex 做独立复审，不以 Gemini 自检代替终验。
