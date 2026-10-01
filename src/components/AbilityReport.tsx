'use client';

import React, { useState } from 'react';
import { Award, RotateCcw, Star } from 'lucide-react';
import { CompletionStatus } from './CompletionStatus';
import { Button } from '@/components/ui/button';
import type { AbilityReportData } from '@/src/abilities/AbilityTracker';
import type { Level01Metrics } from '@/src/levels/level01/level01Types';
import type { EvidenceDimensionId, EvidenceStatus, PracticeMode } from '@/src/types/evidence';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { scoreAssessment } from '@/src/assessment/scoreAssessment';
import type { AttemptSummaryRecord } from '@/src/types/evidence';
import { formatDateTimeSeconds, formatDurationMs } from '@/src/lib/formatDuration';
import { getCourseLevel } from '@/src/courses/registry';
import { getNextLevelLabel } from '@/src/courses/curriculum';

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
  assessment?: LevelAssessmentResult;
  score?: number;
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
  assessment,
  score,
  onRestart,
  onReturn,
}: AbilityReportProps) {
  const [savedAttempt, setSavedAttempt] = useState<AttemptSummaryRecord | null>(null);
  const isDefaultLevel01 = levelId === 'LEVEL_01' || levelId === 'O01';
  const courseLevel = getCourseLevel(levelId);

  const resolvedDomain =
    domainLabel || (isDefaultLevel01 ? '技能解锁 · 安全作业Ⅰ' : '技能领域 · 核心专业能力');
  const resolvedTitle =
    courseLevel ? `${courseLevel.canonicalId} ${courseLevel.title} · 能力报告`
      : title || `${levelId} 能力报告`;

  const scored = assessment ? scoreAssessment(assessment) : null;

  const resolvedDimensions: AbilityDimensionItem[] =
    dimensions ||
    (scored
      ? scored.dimensions.map((d) => ({ id: d.id, label: d.label, stars: d.stars }))
      : report?.dimensions || []);

  let resolvedSummary: AbilitySummaryItem[];
  if (summaryItems && summaryItems.length > 0) {
    resolvedSummary = summaryItems;
  } else if (scored) {
    resolvedSummary = [
      {
        label: '过程答错记录',
        value: `${scored.counters.wrongAttempts} 次`,
      },
      {
        label: '教学提示使用',
        value: `${scored.counters.hintRequests} 次`,
      },
      {
        label: '仪表安全拦截',
        value: `${scored.counters.meterGuardBlocks} 次`,
      },
      {
        label: '安全违规操作',
        value: `${scored.counters.unsafeActions} 次`,
      },
      {
        label: '阶段重试次数',
        value: `${scored.counters.retries} 次`,
      },
      {
        label: '实际实训耗时',
        value: formatDurationMs(scored.durationMs),
      },
    ];
  } else if (report && report.summary) {
    const m = metrics as Level01Metrics | undefined;
    const duration = formatDurationMs(m?.levelDuration ?? 0);
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
      { label: '实训评测状态', value: '待评定' },
      { label: '过程数据记录', value: '无过程记录' },
    ];
  }

  if (savedAttempt?.durationMs !== undefined) {
    const authoritativeDuration = formatDurationMs(savedAttempt.durationMs);
    const durationIndex = resolvedSummary.findIndex((item) => /用时|耗时/.test(item.label));
    resolvedSummary = durationIndex >= 0
      ? resolvedSummary.map((item, index) => index === durationIndex ? { ...item, value: authoritativeDuration } : item)
      : [...resolvedSummary, { label: '本关用时', value: authoritativeDuration }];
  }
  if (savedAttempt) {
    const withoutOldAttemptTimes = resolvedSummary.filter(
      (item) => item.label !== '本次开始' && item.label !== '本次完成',
    );
    resolvedSummary = [
      ...withoutOldAttemptTimes,
      ...(savedAttempt.startedAt ? [{ label: '本次开始', value: formatDateTimeSeconds(savedAttempt.startedAt) }] : []),
      { label: '本次完成', value: formatDateTimeSeconds(savedAttempt.completedAt) },
    ];
  }

  const reportForCompletion = report || (resolvedDimensions.length > 0 ? {
    dimensions: resolvedDimensions.map((d) => ({
      id: d.id,
      label: d.label,
      stars: d.stars,
      score: d.stars * 20,
    })),
    summary: {} as AbilityReportData['summary'],
  } : undefined);

  const resolvedNextTask =
    getNextLevelLabel(levelId) ?? nextTask;

  const resolvedMode = mode || scored?.mode;
  const resolvedEvidence = evidence || scored?.evidence;

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

      {resolvedDimensions.length > 0 ? (
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
      ) : (
        <div className="p-4 text-center text-slate-400 text-sm">
          暂无评测维度数据
        </div>
      )}

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
        evidence={resolvedEvidence}
        mode={resolvedMode}
        nextTask={resolvedNextTask}
        assessment={assessment}
        score={score}
        onSavedAttempt={setSavedAttempt}
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
