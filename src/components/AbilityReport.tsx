import React from 'react';
import { Award, RotateCcw, Star } from 'lucide-react';
import { CompletionStatus } from './CompletionStatus';
import { Button } from '@/components/ui/button';
import type { AbilityReportData } from '@/src/abilities/AbilityTracker';
import type { Level01Metrics } from '@/src/levels/level01/level01Types';
import type { EvidenceDimensionId, EvidenceStatus, PracticeMode } from '@/src/types/evidence';

export interface AbilityDimensionItem {
  id: string;
  label: string;
  stars: number;
}

export interface AbilitySummaryItem {
  label: string;
  value: string | number;
}

export interface AbilityReportProps {
  levelId?: string;
  domainLabel?: string;
  title?: string;
  dimensions?: AbilityDimensionItem[];
  summaryItems?: AbilitySummaryItem[];
  report?: AbilityReportData;
  metrics?: Level01Metrics | Record<string, unknown> | object;
  evidence?: Partial<Record<EvidenceDimensionId, EvidenceStatus>>;
  mode?: PracticeMode;
  nextTask?: string;
  onRestart?: () => void;
  onReturn: () => void;
}

export function AbilityReport({
  levelId = 'LEVEL_01',
  domainLabel,
  title,
  dimensions,
  summaryItems,
  report,
  metrics,
  evidence,
  mode,
  nextTask,
  onRestart,
  onReturn,
}: AbilityReportProps) {
  const isDefaultLevel01 = levelId === 'LEVEL_01' || levelId === 'O01';

  const resolvedDomain =
    domainLabel || (isDefaultLevel01 ? '技能解锁 · 安全作业Ⅰ' : '技能领域 · 核心专业能力');
  const resolvedTitle =
    title || (isDefaultLevel01 ? '安全作业能力报告' : `${levelId} 能力报告`);

  const resolvedDimensions: AbilityDimensionItem[] =
    dimensions ||
    report?.dimensions || [
      { id: 'SAFETY_SPECIFICATION', label: '规范操作', stars: 5 },
      { id: 'CIRCUIT_READING', label: '原理认知', stars: 5 },
      { id: 'TOOL_MEASUREMENT', label: '工具运用', stars: 5 },
      { id: 'DIAGNOSTIC_STRATEGY', label: '排故策略', stars: 5 },
      { id: 'EVIDENCE_EXPRESSION', label: '数据表达', stars: 5 },
    ];

  let resolvedSummary: AbilitySummaryItem[];
  if (summaryItems && summaryItems.length > 0) {
    resolvedSummary = summaryItems;
  } else if (report && report.summary) {
    const m = metrics as Level01Metrics | undefined;
    const duration = m?.levelDuration
      ? `${Math.max(1, Math.round(m.levelDuration / 60_000))} 分钟`
      : '1 分钟';
    resolvedSummary = [
      {
        label: '危险操作尝试',
        value: `${(report.summary.directContactAttempts ?? 0) + (m?.unsafeFireResponses ?? 0)} 次`,
      },
      {
        label: '主动查看设备状态',
        value: report.summary.environmentChecked ? '是' : '否',
      },
      {
        label: '主动切断危险源',
        value: report.summary.powerIsolated ? '是' : '否',
      },
      {
        label: '提示使用',
        value: `${report.summary.helpRequests ?? 0} 次`,
      },
      {
        label: '火情处置',
        value: report.summary.fireResponse || '完成',
      },
      {
        label: '本关用时',
        value: duration,
      },
    ];
  } else {
    resolvedSummary = [
      { label: '规范操作核验', value: '合格' },
      { label: '主动安全防护', value: '是' },
      { label: '工单目标达成', value: '100%' },
      { label: '提示使用', value: '0 次' },
      { label: '实训评测结果', value: '优秀' },
      { label: '本关用时', value: '1 分钟' },
    ];
  }

  const reportForCompletion = report || {
    dimensions: resolvedDimensions.map((d) => ({
      id: d.id,
      label: d.label,
      stars: d.stars,
      score: d.stars * 20,
    })),
    summary: {} as AbilityReportData['summary'],
  };

  const resolvedNextTask =
    nextTask ||
    (isDefaultLevel01 ? '学习任务2《点亮第一盏检修灯》' : undefined);

  return (
    <section className="ability-report">
      <div className="ability-heading">
        <span>
          <Award size={32} />
        </span>
        <div>
          <p className="step-label">{resolvedDomain}</p>
          <h2>{resolvedTitle}</h2>
        </div>
      </div>

      <div className="ability-grid">
        {resolvedDimensions.map((dimension) => (
          <div className="ability-row" key={dimension.id}>
            <strong>{dimension.label}</strong>
            <span aria-label={`${dimension.stars}星`}>
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  size={19}
                  fill={index < dimension.stars ? 'currentColor' : 'none'}
                  className={index < dimension.stars ? 'filled' : ''}
                />
              ))}
            </span>
          </div>
        ))}
      </div>

      <dl className="process-summary">
        {resolvedSummary.map((item, idx) => (
          <div key={idx}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>

      <CompletionStatus
        levelId={levelId}
        report={reportForCompletion}
        metrics={metrics}
        evidence={evidence}
        mode={mode}
        nextTask={resolvedNextTask}
      />

      <div className="report-actions">
        {onRestart ? (
          <Button size="lg" variant="outline" onClick={onRestart}>
            <RotateCcw size={18} />
            重新开始本关
          </Button>
        ) : (
          <span />
        )}
        <Button size="lg" className="primary-action" onClick={onReturn}>
          返回任务大厅
        </Button>
      </div>
    </section>
  );
}
