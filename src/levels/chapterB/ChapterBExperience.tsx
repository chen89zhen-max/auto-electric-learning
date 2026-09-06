'use client';

import type { ComponentType } from 'react';
import { useState } from 'react';
import { FileSpreadsheet, GraduationCap, LogOut, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AbilityReport,
  type AbilityDimensionItem,
  type AbilitySummaryItem,
} from '@/src/components/AbilityReport';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { getStudentDisplayName } from '@/src/stores/authStore';
import type { EvidenceDimensionId, EvidenceStatus, PracticeMode } from '@/src/types/evidence';

type SceneProps = { onComplete: (metrics: Record<string, unknown>) => void };

const CHAPTER_B_CONFIGS: Record<
  string,
  {
    domainLabel: string;
    title: string;
    dimensions: AbilityDimensionItem[];
    getSummaryItems: (mode: PracticeMode) => AbilitySummaryItem[];
  }
> = {
  B01: {
    domainLabel: '技能领域 · 欧姆定律应用',
    title: '欧姆定律与控制变量能力报告',
    dimensions: [
      { id: 'OHM_CALC', label: '欧姆定律计算', stars: 5 },
      { id: 'VI_CURVE', label: '伏安曲线验证', stars: 5 },
      { id: 'CONTROL_VAR', label: '控制变量思维', stars: 5 },
      { id: 'COUNTER_EXAMPLE', label: '极限反例辨析', stars: 5 },
      { id: 'TOOL_OP', label: '仪器规范操作', stars: 5 },
    ],
    getSummaryItems: (mode) => [
      { label: '仿真求解精度', value: '100%' },
      { label: '物理规律核验', value: 'I = U / R 成立' },
      { label: '反例辨析结论', value: '短路与断路辨析通过' },
      { label: '数据工单记录', value: '完整归档' },
      {
        label: '实训模式级别',
        value: mode === 'transfer' ? '迁移模式' : mode === 'independent' ? '独立模式' : '跟练模式',
      },
      { label: '本关用时', value: '1 分钟' },
    ],
  },
  B02: {
    domainLabel: '技能领域 · 负载连接与工况分析',
    title: '负载连接方式与工况能力报告',
    dimensions: [
      { id: 'CONNECTION_IDENT', label: '串并联连接识别', stars: 5 },
      { id: 'BRANCH_DISTRIB', label: '支路电压与电流分配', stars: 5 },
      { id: 'LOAD_ANALYSIS', label: '负载工况核验', stars: 5 },
      { id: 'SHORT_BYPASS', label: '混联短接反例辨析', stars: 5 },
      { id: 'WIRING_STANDARD', label: '实车改装规范', stars: 5 },
    ],
    getSummaryItems: (mode) => [
      { label: '电路拓扑验证', value: '串联 / 并联' },
      { label: '分压分流规律', value: '计算核验一致' },
      { label: '混联短路反例', value: '反例诊断达成' },
      { label: '负载状态监控', value: '正常工作' },
      {
        label: '实训模式级别',
        value: mode === 'transfer' ? '迁移模式' : mode === 'independent' ? '独立模式' : '跟练模式',
      },
      { label: '本关用时', value: '1 分钟' },
    ],
  },
  B03: {
    domainLabel: '技能领域 · 基尔霍夫定律验证',
    title: '基尔霍夫定律应用能力报告',
    dimensions: [
      { id: 'KCL_VERIFY', label: '节点电流定律KCL验证', stars: 5 },
      { id: 'KVL_VERIFY', label: '回路电压定律KVL验证', stars: 5 },
      { id: 'EQ_FORMULATION', label: '复杂节点方程列写', stars: 5 },
      { id: 'POLARITY_CHECK', label: '支路极性反例辨析', stars: 5 },
      { id: 'DUAL_POWER', label: '双电源网络求解', stars: 5 },
    ],
    getSummaryItems: (mode) => [
      { label: '节点流入流出', value: '∑I = 0 守恒' },
      { label: '闭合回路压降', value: '∑U = 0 闭合' },
      { label: '极性反向反例', value: '判别无误' },
      { label: 'MNA求解验证', value: '网络方程平衡' },
      {
        label: '实训模式级别',
        value: mode === 'transfer' ? '迁移模式' : mode === 'independent' ? '独立模式' : '跟练模式',
      },
      { label: '本关用时', value: '1 分钟' },
    ],
  },
  B04: {
    domainLabel: '技能领域 · 电功率与能量转换',
    title: '电功率与能量核算能力报告',
    dimensions: [
      { id: 'RATED_POWER', label: '额定功率校核', stars: 5 },
      { id: 'THERMAL_LOSS', label: '发热损耗评估', stars: 5 },
      { id: 'FUSE_CURVE', label: '保险丝安秒特性', stars: 5 },
      { id: 'OVERLOAD_CHECK', label: '超载烧蚀反例辨析', stars: 5 },
      { id: 'WIRE_GAUGE', label: '线径选型规范', stars: 5 },
    ],
    getSummaryItems: (mode) => [
      { label: '功率计算公式', value: 'P = U × I' },
      { label: '发热损耗核算', value: 'Q = I²Rt 达标' },
      { label: '超载熔断反例', value: '反例验证通过' },
      { label: '保险丝选型匹配', value: '匹配安全' },
      {
        label: '实训模式级别',
        value: mode === 'transfer' ? '迁移模式' : mode === 'independent' ? '独立模式' : '跟练模式',
      },
      { label: '本关用时', value: '1 分钟' },
    ],
  },
  B05: {
    domainLabel: '技能领域 · 电源内阻与端电压',
    title: '电源外特性与压降分析能力报告',
    dimensions: [
      { id: 'REAL_POWER_MODEL', label: '真实电源模型认知', stars: 5 },
      { id: 'VOLTAGE_DROP', label: '带载端电压跌落', stars: 5 },
      { id: 'INTERNAL_R_CALC', label: '内阻计算与测量', stars: 5 },
      { id: 'STARTING_DROP', label: '启动压降反例辨析', stars: 5 },
      { id: 'BATTERY_HEALTH', label: '电池健康度评估', stars: 5 },
    ],
    getSummaryItems: (mode) => [
      { label: '空载电动势', value: 'E = 12.6V' },
      { label: '带载端电压', value: 'U = E - Ir' },
      { label: '启动跌落反例', value: '反例辨识达成' },
      { label: '内阻压降辨析', value: '内阻压降显著' },
      {
        label: '实训模式级别',
        value: mode === 'transfer' ? '迁移模式' : mode === 'independent' ? '独立模式' : '跟练模式',
      },
      { label: '本关用时', value: '1 分钟' },
    ],
  },
  B06: {
    domainLabel: '技能领域 · 分压传感与电位控制',
    title: '分压电路与传感器调节能力报告',
    dimensions: [
      { id: 'DIVIDER_CALC', label: '分压比计算与设计', stars: 5 },
      { id: 'SENSOR_SAMPLING', label: '传感器分压采样', stars: 5 },
      { id: 'IMPEDANCE_MATCH', label: '阻抗匹配与负载效应', stars: 5 },
      { id: 'FLOATING_CHECK', label: '虚接浮空反例辨析', stars: 5 },
      { id: 'VOLTAGE_DIAG', label: '故障电压定位能力', stars: 5 },
    ],
    getSummaryItems: (mode) => [
      { label: '分压输出公式', value: 'Uo = Uin×R2/(R1+R2)' },
      { label: '传感器采样响应', value: '线性跟随' },
      { label: '输入阻抗效应', value: '高阻抗测量' },
      { label: '虚接开路反例', value: '浮空排故达成' },
      {
        label: '实训模式级别',
        value: mode === 'transfer' ? '迁移模式' : mode === 'independent' ? '独立模式' : '跟练模式',
      },
      { label: '本关用时', value: '1 分钟' },
    ],
  },
};

export function ChapterBExperience({
  levelId,
  title,
  subtitle,
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
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('guided');
  const [metrics, setMetrics] = useState<Record<string, unknown>>({});
  const evidenceStatus: EvidenceStatus =
    practiceMode === 'transfer'
      ? 'TRANSFER_COMPLETE'
      : practiceMode === 'independent'
        ? 'INDEPENDENT_COMPLETE'
        : 'GUIDED_COMPLETE';
  const evidence = Object.fromEntries(
    evidenceDimensions.map((dimension) => [dimension, evidenceStatus]),
  ) as Partial<Record<EvidenceDimensionId, EvidenceStatus>>;

  const handleRestart = () => {
    setCompleted(false);
    setMetrics({});
  };

  const bConfig = CHAPTER_B_CONFIGS[levelId] || {
    domainLabel: `技能领域 · ${title}`,
    title: `${title}能力报告`,
    dimensions: [
      { id: 'D1', label: '电路规律理解', stars: 5 },
      { id: 'D2', label: '物理量计算', stars: 5 },
      { id: 'D3', label: '仪器规范使用', stars: 5 },
      { id: 'D4', label: '反例辨析思维', stars: 5 },
      { id: 'D5', label: '工单工程素养', stars: 5 },
    ],
    getSummaryItems: (mode: PracticeMode) => [
      { label: '规律核验', value: '已通过' },
      { label: '反例辨析', value: '已掌握' },
      { label: '工单填报', value: '已完成' },
      { label: '计算准确度', value: '100%' },
      {
        label: '实训模式',
        value: mode === 'transfer' ? '迁移模式' : mode === 'independent' ? '独立模式' : '跟练模式',
      },
      { label: '本关用时', value: '1 分钟' },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-sky-600 p-2 text-white">
            <Zap size={22} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
              篇章二：让电路按要求工作 · {levelId}
            </p>
            <h1 className="text-base font-black">
              {title}——{subtitle}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
            <GraduationCap className="inline" size={15} /> 见习学员 · {getStudentDisplayName('见习学员')}
          </div>
          <div className="flex rounded-lg bg-slate-200 p-0.5 text-xs font-bold">
            {(['guided', 'independent', 'transfer'] as PracticeMode[]).map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => setPracticeMode(mode)}
                className={`rounded-md px-2.5 py-1 ${practiceMode === mode ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'}`}
              >
                {mode === 'guided' ? '跟练' : mode === 'independent' ? '独立' : '迁移'}
              </button>
            ))}
          </div>
          <FullscreenButton />
          <Button type="button" variant="outline" onClick={onReturnLobby}>
            <LogOut size={16} /> 返回大厅
          </Button>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
        {completed ? (
          <div className="w-full flex justify-center py-2">
            <AbilityReport
              levelId={levelId}
              domainLabel={bConfig.domainLabel}
              title={bConfig.title}
              dimensions={bConfig.dimensions}
              summaryItems={bConfig.getSummaryItems(practiceMode)}
              metrics={metrics}
              evidence={evidence}
              mode={practiceMode}
              nextTask={nextTask}
              onRestart={handleRestart}
              onReturn={onReturnLobby}
            />
          </div>
        ) : (
          <Scene
            onComplete={(nextMetrics) => {
              setMetrics(nextMetrics);
              setCompleted(true);
            }}
          />
        )}
      </div>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 bg-white px-6 py-3 text-xs text-slate-500">
        <span>
          <FileSpreadsheet className="mr-1 inline text-sky-600" size={15} /> 工单编号：{workOrder}
        </span>
        <span>真实求解：MNA DC Solver · 数据解释与设计实训</span>
      </footer>
    </main>
  );
}
