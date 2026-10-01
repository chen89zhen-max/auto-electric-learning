'use client';
import { getLevelDisplayName } from '@/src/courses/curriculum';

import { LevelHeading } from '@/src/components/LevelHeading';

import type { ComponentType } from 'react';
import { useCallback, useState } from 'react';
import { BatteryCharging, ClipboardList, GraduationCap, HelpCircle, LogOut, RotateCcw, Zap } from 'lucide-react';
import {
  AbilityReport,
  type AbilityDimensionItem,
  type AbilitySummaryItem,
} from '@/src/components/AbilityReport';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { MasterChenAvatar } from '@/src/components/visuals/MasterChenAvatar';
import { SpeechControls } from '@/src/components/visuals/SpeechControls';
import { formatDurationMs } from '@/src/lib/formatDuration';
import { getStudentDisplayName } from '@/src/stores/authStore';
import type { EvidenceDimensionId, EvidenceStatus } from '@/src/types/evidence';
import type { BSceneGuidance } from './BSceneFrame';

type SceneProps = {
  onComplete: (metrics: Record<string, unknown>) => void;
  onGuidanceChange?: (guidance: BSceneGuidance) => void;
};

type BProcessStage = {
  wrongAttempts?: number;
  hintRequests?: number;
  meterGuardBlocks?: number;
  unsafeActions?: number;
  retries?: number;
};

export type ChapterBProcessInput = {
  durationMs?: number;
  stages?: BProcessStage[];
};

const B_STAGE_WEIGHTS = [10, 20, 20, 25, 25] as const;

const CHAPTER_B_CONFIGS: Record<
  string,
  {
    domainLabel: string;
    title: string;
    dimensions: Array<Pick<AbilityDimensionItem, 'id' | 'label'>>;
    getSummaryItems: () => AbilitySummaryItem[];
  }
> = {
  B01: {
    domainLabel: '技能领域 · 欧姆定律应用',
    title: '欧姆定律与控制变量能力报告',
    dimensions: [
      { id: 'OHM_CALC', label: '欧姆定律计算' },
      { id: 'VI_CURVE', label: '伏安曲线验证' },
      { id: 'CONTROL_VAR', label: '控制变量思维' },
      { id: 'COUNTER_EXAMPLE', label: '极限反例辨析' },
      { id: 'TOOL_OP', label: '仪器规范操作' },
    ],
    getSummaryItems: () => [
      { label: '仿真求解精度', value: '100%' },
      { label: '物理规律核验', value: 'I = U / R 成立' },
      { label: '反例辨析结论', value: '短路与断路辨析通过' },
      { label: '数据工单记录', value: '完整归档' },
    ],
  },
  B02: {
    domainLabel: '技能领域 · 负载连接与工况分析',
    title: '负载连接方式与工况能力报告',
    dimensions: [
      { id: 'CONNECTION_IDENT', label: '串并联连接识别' },
      { id: 'BRANCH_DISTRIB', label: '支路电压与电流分配' },
      { id: 'LOAD_ANALYSIS', label: '负载工况核验' },
      { id: 'SHORT_BYPASS', label: '混联短接反例辨析' },
      { id: 'WIRING_STANDARD', label: '实车改装规范' },
    ],
    getSummaryItems: () => [
      { label: '电路拓扑验证', value: '串联 / 并联' },
      { label: '分压分流规律', value: '计算核验一致' },
      { label: '混联短路反例', value: '反例诊断达成' },
      { label: '负载状态监控', value: '正常工作' },
    ],
  },
  B03: {
    domainLabel: '技能领域 · 基尔霍夫定律验证',
    title: '基尔霍夫定律应用能力报告',
    dimensions: [
      { id: 'KCL_VERIFY', label: '节点电流定律KCL验证' },
      { id: 'KVL_VERIFY', label: '回路电压定律KVL验证' },
      { id: 'EQ_FORMULATION', label: '复杂节点方程列写' },
      { id: 'POLARITY_CHECK', label: '支路极性反例辨析' },
      { id: 'DUAL_POWER', label: '双电源网络求解' },
    ],
    getSummaryItems: () => [
      { label: '节点流入流出', value: '∑I = 0 守恒' },
      { label: '闭合回路压降', value: '∑U = 0 闭合' },
      { label: '极性反向反例', value: '判别无误' },
      { label: 'MNA求解验证', value: '网络方程平衡' },
    ],
  },
  B04: {
    domainLabel: '技能领域 · 电功率与能量转换',
    title: '电功率与能量核算能力报告',
    dimensions: [
      { id: 'RATED_POWER', label: '额定功率校核' },
      { id: 'THERMAL_LOSS', label: '发热损耗评估' },
      { id: 'FUSE_CURVE', label: '保险丝安秒特性' },
      { id: 'OVERLOAD_CHECK', label: '超载烧蚀反例辨析' },
      { id: 'WIRE_GAUGE', label: '线径选型规范' },
    ],
    getSummaryItems: () => [
      { label: '功率计算公式', value: 'P = U × I' },
      { label: '发热损耗核算', value: 'Q = I²Rt 达标' },
      { label: '超载熔断反例', value: '反例验证通过' },
      { label: '保险丝选型匹配', value: '匹配安全' },
    ],
  },
  B05: {
    domainLabel: '技能领域 · 电源内阻与端电压',
    title: '电源外特性与压降分析能力报告',
    dimensions: [
      { id: 'REAL_POWER_MODEL', label: '真实电源模型认知' },
      { id: 'VOLTAGE_DROP', label: '带载端电压跌落' },
      { id: 'INTERNAL_R_CALC', label: '内阻计算与测量' },
      { id: 'STARTING_DROP', label: '启动压降反例辨析' },
      { id: 'BATTERY_HEALTH', label: '电池健康度评估' },
    ],
    getSummaryItems: () => [
      { label: '空载电动势', value: 'E = 12.6V' },
      { label: '带载端电压', value: 'U = E - Ir' },
      { label: '启动跌落反例', value: '反例辨识达成' },
      { label: '内阻压降辨析', value: '内阻压降显著' },
    ],
  },
  B06: {
    domainLabel: '技能领域 · 分压传感与电位控制',
    title: '分压电路与传感器调节能力报告',
    dimensions: [
      { id: 'DIVIDER_CALC', label: '分压比计算与设计' },
      { id: 'SENSOR_SAMPLING', label: '传感器分压采样' },
      { id: 'IMPEDANCE_MATCH', label: '阻抗匹配与负载效应' },
      { id: 'FLOATING_CHECK', label: '虚接浮空反例辨析' },
      { id: 'VOLTAGE_DIAG', label: '故障电压定位能力' },
    ],
    getSummaryItems: () => [
      { label: '分压输出公式', value: 'Uo = Uin×R2/(R1+R2)' },
      { label: '传感器采样响应', value: '线性跟随' },
      { label: '输入阻抗效应', value: '高阻抗测量' },
      { label: '虚接开路反例', value: '浮空排故达成' },
    ],
  },
};

export function buildChapterBProcessReport(levelId: string, input: ChapterBProcessInput) {
  const config = CHAPTER_B_CONFIGS[levelId];
  if (!config) throw new Error(`未配置 ${levelId} 的过程评分报告`);

  const stages = B_STAGE_WEIGHTS.map((weight, index) => {
    const stage = input.stages?.[index] ?? {};
    const wrongAttempts = Math.max(0, stage.wrongAttempts ?? 0);
    // 同一阶段同一提示只计一次；下一阶段的提示由独立 stages 项计入。
    const hintRequests = Math.min(1, Math.max(0, stage.hintRequests ?? 0));
    const meterGuardBlocks = Math.max(0, stage.meterGuardBlocks ?? 0);
    const unsafeActions = Math.max(0, stage.unsafeActions ?? 0);
    const retries = Math.max(0, stage.retries ?? 0);
    const quality = Math.max(0, Math.min(1,
      1 - 0.12 * wrongAttempts - 0.15 * hintRequests - 0.20 * meterGuardBlocks - 0.30 * unsafeActions - 0.05 * retries,
    ));
    return { weight, quality, wrongAttempts, hintRequests, meterGuardBlocks, unsafeActions, retries };
  });
  const counters = stages.reduce(
    (total, stage) => ({
      wrongAttempts: total.wrongAttempts + stage.wrongAttempts,
      hintRequests: total.hintRequests + stage.hintRequests,
      meterGuardBlocks: total.meterGuardBlocks + stage.meterGuardBlocks,
      unsafeActions: total.unsafeActions + stage.unsafeActions,
      retries: total.retries + stage.retries,
    }),
    { wrongAttempts: 0, hintRequests: 0, meterGuardBlocks: 0, unsafeActions: 0, retries: 0 },
  );
  const score = Math.round(stages.reduce((total, stage) => total + stage.weight * stage.quality, 0));
  const durationMs = Number.isFinite(input.durationMs) ? Math.max(0, input.durationMs ?? 0) : 0;

  return {
    score,
    dimensions: config.dimensions.map((dimension, index) => ({
      ...dimension,
      stars: stages[index].quality >= 0.9 ? 5 : stages[index].quality >= 0.8 ? 4 : stages[index].quality >= 0.7 ? 3 : stages[index].quality >= 0.6 ? 2 : 1,
    })),
    summaryItems: [
      ...config.getSummaryItems(),
      { label: '过程评分', value: `${score} 分` },
      { label: '答错 / 提示', value: `${counters.wrongAttempts} 次 / ${counters.hintRequests} 次` },
      { label: '安全拦截 / 违规 / 重试', value: `${counters.meterGuardBlocks} 次 / ${counters.unsafeActions} 次 / ${counters.retries} 次` },
      { label: '本关用时', value: formatDurationMs(durationMs) },
    ] satisfies AbilitySummaryItem[],
    counters,
  };
}

const B05_B06_UI: Record<string, { stationLabel: string; keyPoint: string }> = {
  B05: {
    stationLabel: '9号实训工位 · 蓄电池带载压降实验台',
    keyPoint: '空载电压不能证明带载健康；用 U = E − Ir 判断起动压降',
  },
  B06: {
    stationLabel: '10号实训工位 · NTC 水温信号分压实验台',
    keyPoint: '高阻采样才接近计算值；低阻并入会拉低分压输出并造成失真',
  },
};

const DEFAULT_GUIDANCE: BSceneGuidance = {
  title: '准备进入实训',
  stage: 0,
  stageCount: 3,
  instruction: '请根据工单完成三阶段实测、数据记录和反例辨析。',
  counterexample: '请先阅读反例提示，再提交本阶段记录。',
};

export function ChapterBExperience({
  levelId,
  title,
  subtitle: _subtitle,
  workOrder,
  nextTask,
  evidenceDimensions,
  Scene,
  onReturnLobby,
}: {
  levelId: string;
  title: string;
  subtitle: string;
  workOrder: string;
  nextTask: string;
  evidenceDimensions: EvidenceDimensionId[];
  Scene: ComponentType<SceneProps>;
  onReturnLobby: () => void;
}) {
  const [completed, setCompleted] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, unknown>>({});
  const [sceneRevision, setSceneRevision] = useState(0);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [hintRequested, setHintRequested] = useState(false);
  const [guidance, setGuidance] = useState<BSceneGuidance>(DEFAULT_GUIDANCE);
  const [processStages, setProcessStages] = useState<BProcessStage[]>([]);
  // B05/B06 use one guided task flow; no mode selector may upgrade evidence by label alone.
  const evidenceStatus: EvidenceStatus = 'GUIDED_COMPLETE';
  const evidence = Object.fromEntries(
    evidenceDimensions.map((dimension) => [dimension, evidenceStatus]),
  ) as Partial<Record<EvidenceDimensionId, EvidenceStatus>>;

  const handleRestart = () => {
    setCompleted(false);
    setMetrics({});
    setGuidance(DEFAULT_GUIDANCE);
    setHintRequested(false);
    setProcessStages([]);
    setShowWorkOrder(false);
    setSceneRevision((revision) => revision + 1);
  };

  const handleGuidanceChange = useCallback((nextGuidance: BSceneGuidance) => {
    setGuidance((currentGuidance) => {
      if (currentGuidance.stage !== nextGuidance.stage) setHintRequested(false);
      return nextGuidance;
    });
  }, []);

  const handleHintRequest = () => {
    setHintRequested(true);
    setProcessStages((current) => {
      const stage = guidance.stage;
      const next = [...current];
      const recorded = next[stage] ?? {};
      if ((recorded.hintRequests ?? 0) >= 1) return current;
      next[stage] = { ...recorded, hintRequests: 1 };
      return next;
    });
  };

  const bConfig = CHAPTER_B_CONFIGS[levelId] || {
    domainLabel: `技能领域 · ${title}`,
    title: `${title}能力报告`,
    dimensions: [
      { id: 'D1', label: '电路规律理解' },
      { id: 'D2', label: '物理量计算' },
      { id: 'D3', label: '仪器规范使用' },
      { id: 'D4', label: '反例辨析思维' },
      { id: 'D5', label: '工单工程素养' },
    ],
    getSummaryItems: () => [
      { label: '规律核验', value: '已通过' },
      { label: '反例辨析', value: '已掌握' },
      { label: '工单填报', value: '已完成' },
      { label: '计算准确度', value: '100%' },
    ],
  };
  const levelUi = B05_B06_UI[levelId] || {
    stationLabel: `${levelId} 实训工位`,
    keyPoint: '按工单完成实测、记录与反例辨析。',
  };
  const mentorText = hintRequested ? guidance.counterexample : guidance.instruction;
  const stageLabel = `阶段 ${guidance.stage + 1}/${guidance.stageCount}`;
  const processReport = buildChapterBProcessReport(levelId, {
    stages: processStages,
    durationMs: typeof metrics.durationMs === 'number' ? metrics.durationMs : 0,
  });

  return (
    <main className="app-shell level02-shell b05-b06-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark bg-amber-600 text-white shadow-amber-600/20">
            {levelId === 'B05' ? <BatteryCharging size={22} /> : <Zap size={22} />}
          </span>
          <LevelHeading levelId={levelId} />
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <div className="trainee-badge">
            <GraduationCap size={18} className="text-amber-600" />
            <span>实训成长称号 · {getStudentDisplayName('见习学员')}</span>
          </div>
          <FullscreenButton />
          <button type="button" onClick={onReturnLobby} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600 shadow-xs transition-colors hover:bg-slate-200 hover:text-slate-900" title="退出当前实训并返回课程地图">
            <LogOut size={15} /> 退出实训
          </button>
        </div>
      </header>

      <section className={completed ? 'workspace single' : 'workspace'} aria-label={`${levelId} 实训工作区`}>
        {completed ? (
          <div className="scene-panel">
            <div className="scene-heading">
              <span className="status-dot bg-emerald-500 shadow-emerald-500/20" />
              <span>{levelUi.stationLabel} · 学习结果</span>
              <span className="scene-meta">TRAINING COMPLETE</span>
            </div>
            <div className="scene-content">
            <AbilityReport
              levelId={levelId}
              domainLabel={bConfig.domainLabel}
              title={bConfig.title}
              dimensions={processReport.dimensions}
              score={processReport.score}
              summaryItems={processReport.summaryItems}
              metrics={metrics}
              evidence={evidence}
              mode="guided"
              nextTask={nextTask}
              onRestart={handleRestart}
              onReturn={onReturnLobby}
            />
          </div>
            <div className="objective-strip">
              <span>当前操作</span>
              <strong>查看 {bConfig.title}</strong>
              <output className="feedback">三阶段实训记录已归档，可重新开始巩固操作。</output>
            </div>
          </div>
        ) : (
          <>
            <div className="scene-panel">
              <div className="scene-heading">
                <span className="status-dot bg-amber-500 shadow-amber-500/20" />
                <span>{levelUi.stationLabel}</span>
                <span className="scene-meta">{stageLabel}</span>
              </div>
              <div className="scene-content" key={sceneRevision}>
                <Scene
                  onComplete={(nextMetrics) => {
                    setMetrics(nextMetrics);
                    setCompleted(true);
                  }}
                  onGuidanceChange={handleGuidanceChange}
                />
              </div>
              <div className="objective-strip">
                <span>当前操作</span>
                <strong>{guidance.title}</strong>
                <output className="feedback">{guidance.instruction}</output>
              </div>
            </div>

            <aside className="tutor-panel" aria-label="陈师傅实训指导">
              <div className="tutor-title border-b border-slate-200 pb-3">
                <MasterChenAvatar emotion={hintRequested ? 'WARNING' : guidance.stage === 0 ? 'THINKING' : 'NORMAL'} size={58} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-base font-bold text-slate-800">陈师傅</strong>
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-sm font-semibold text-amber-800">带教技师</span>
                  </div>
                  <small className="text-sm font-medium text-slate-500">车间高级电工技师</small>
                </div>
              </div>
              <div className="message-card my-4 rounded-xl border-l-4 border-amber-400 bg-amber-50/90 p-4 text-slate-800 shadow-xs" aria-live="polite">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-end"><SpeechControls currentText={mentorText} /></div>
                  <p className="m-0 text-sm font-semibold leading-relaxed">“{mentorText}”</p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-950">
                <strong className="block text-sm tracking-wide text-amber-700">本步目标</strong>
                <span className="mt-1 block leading-6">完成{stageLabel}的实测记录，并在继续前阅读反例提示。</span>
              </div>
              <div className="tutor-context">
                <span>当前实训环节</span>
                <strong>{levelId} · {guidance.title}</strong>
              </div>
            </aside>
          </>
        )}
      </section>

      <nav className="bottom-bar" aria-label={`${levelId} 实训功能栏`}>
        <button type="button" className={showWorkOrder ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={() => setShowWorkOrder((open) => !open)}><ClipboardList size={19} /> 工单</button>
        <button type="button" className={hintRequested ? 'tool-active cursor-pointer' : 'cursor-pointer'} onClick={handleHintRequest}><HelpCircle size={19} /> 请师傅提示</button>
        <span className="toolbar-spacer" />
        <span className="unlock-hint">实训要点：{levelUi.keyPoint}</span>
        <button type="button" onClick={handleRestart} className="cursor-pointer"><RotateCcw size={18} /> 重新开始</button>
      </nav>

      {showWorkOrder && !completed && (
        <dialog open className="fixed inset-0 z-50 flex h-screen w-screen max-w-none items-center justify-center bg-slate-950/35 p-4" aria-label={`${levelId} 实训工单`}>
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="eyebrow text-amber-700">工单编号 · {workOrder}</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{getLevelDisplayName(levelId)} · 实训工单</h2>
            <p className="mt-3 leading-7 text-slate-700">请在 {levelUi.stationLabel} 完成三阶段递进实训：按工位数据观察电路变化，记录计算结果，并阅读反例提示后提交本阶段记录。</p>
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-base font-bold text-amber-900">当前任务：{guidance.title}</p>
            <button type="button" className="primary-action mt-5 cursor-pointer rounded-xl bg-amber-600 text-white hover:bg-amber-700" onClick={() => setShowWorkOrder(false)}>返回实训工位</button>
          </section>
        </dialog>
      )}
    </main>
  );
}
