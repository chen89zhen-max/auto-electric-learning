'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, CloudUpload, RotateCcw } from 'lucide-react';
import { getLevelProgress, getUserProgress, submitLevelCompletion } from '@/src/stores/userProgressStore';
import type { AbilityReportData } from '@/src/abilities/AbilityTracker';
import { scoreFromDimensions } from '@/src/abilities/reportScore';
import type { EvidenceDimensionId, EvidenceStatus, PracticeMode } from '@/src/types/evidence';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { scoreAssessment } from '@/src/assessment/scoreAssessment';
import { isAssessmentRequiredLevel } from '@/src/assessment/rubrics';
import type { AttemptSummaryRecord } from '@/src/types/evidence';
import { formatDurationMs } from '@/src/lib/formatDuration';

export function CompletionStatus({
  levelId,
  report,
  metrics,
  evidence,
  mode,
  nextTask,
  assessment,
  score: reportedScore,
  onSavedAttempt,
}: {
  levelId: string;
  report?: AbilityReportData;
  metrics?: object;
  evidence?: Partial<Record<EvidenceDimensionId, EvidenceStatus>>;
  mode?: PracticeMode;
  nextTask?: string;
  assessment?: LevelAssessmentResult;
  score?: number;
  onSavedAttempt?: (attempt: AttemptSummaryRecord) => void;
}) {
  const [status, setStatus] = useState<'saving' | 'saved' | 'error'>('saving');
  const [message, setMessage] = useState('');
  const initial = useRef({
    report,
    metrics,
    evidence,
    mode,
    assessment,
    reportedScore,
    replay: getLevelProgress(levelId, getUserProgress()).status === 'completed',
  });
  const onSavedAttemptRef = useRef(onSavedAttempt);
  const alive = useRef(false);

  useEffect(() => {
    onSavedAttemptRef.current = onSavedAttempt;
  }, [onSavedAttempt]);

  const save = useCallback(async () => {
    setStatus('saving');
    try {
      const {
        report: result,
        metrics: processMetrics,
        evidence: suppliedEvidence,
        mode: practiceMode,
        assessment: rawAssessment,
        reportedScore: initialReportedScore,
        replay,
      } = initial.current;

      const requiresAssessment = isAssessmentRequiredLevel(levelId);

      if (requiresAssessment && !rawAssessment) {
        throw new Error('未提供有效的过程评价数据 (assessment)，无法保存成绩');
      }

      const scored = rawAssessment ? scoreAssessment(rawAssessment) : null;

      let completionScore: number;
      let completionMode: PracticeMode | undefined;
      let completionEvidence: Record<string, unknown> | undefined;

      if (scored) {
        completionScore = scored.score;
        completionMode = scored.mode;
        completionEvidence = scored.evidence;
      } else if (requiresAssessment) {
        throw new Error(`关卡 ${levelId} 不允许使用默认评分`);
      } else {
        const defaultEvidence: Record<string, string> =
          levelId === 'LEVEL_00' || levelId === 'O00' ? { SAFETY_SPECIFICATION: 'GUIDED_COMPLETE', CIRCUIT_READING: 'GUIDED_COMPLETE' }
          : levelId === 'LEVEL_01' || levelId === 'O01' ? { SAFETY_SPECIFICATION: 'INDEPENDENT_COMPLETE', DIAGNOSTIC_STRATEGY: 'GUIDED_COMPLETE', EVIDENCE_EXPRESSION: 'GUIDED_COMPLETE' }
          : levelId === 'A02' ? { TOOL_MEASUREMENT: 'INDEPENDENT_COMPLETE', RULE_EXPLANATION: 'INDEPENDENT_COMPLETE' }
          : levelId === 'A03' || levelId === 'LEVEL_03' ? { TOOL_MEASUREMENT: 'INDEPENDENT_COMPLETE', CIRCUIT_READING: 'INDEPENDENT_COMPLETE' }
          : levelId === 'A04' || levelId === 'LEVEL_04' ? { TOOL_MEASUREMENT: 'INDEPENDENT_COMPLETE', SAFETY_SPECIFICATION: 'INDEPENDENT_COMPLETE' }
          : { CIRCUIT_READING: 'INDEPENDENT_COMPLETE', SAFETY_SPECIFICATION: 'INDEPENDENT_COMPLETE', TOOL_MEASUREMENT: 'GUIDED_COMPLETE' };

        completionEvidence = suppliedEvidence ?? defaultEvidence;
        completionScore = Number.isInteger(initialReportedScore) && (initialReportedScore as number) >= 0 && (initialReportedScore as number) <= 100
          ? initialReportedScore as number
          : result ? scoreFromDimensions(result.dimensions) : 100;
        completionMode = practiceMode;
      }

      const projection = await submitLevelCompletion(
        levelId,
        completionScore,
        completionEvidence,
        {
          allowReplay: true,
          ...(completionMode ? { mode: completionMode } : {}),
          ...(processMetrics ? { metrics: processMetrics } : {}),
          ...(rawAssessment ? { assessment: rawAssessment } : {}),
        }
      );

      if (!alive.current) return;
      const levelProgress = getLevelProgress(levelId, projection);
      const latestAttempt = levelProgress.recentRecord;
      const latestScore = latestAttempt?.score ?? levelProgress.score ?? '—';
      const latestDuration = latestAttempt?.durationMs === undefined
        ? ''
        : ` · 用时 ${formatDurationMs(latestAttempt.durationMs)}`;
      if (latestAttempt) onSavedAttemptRef.current?.(latestAttempt);
      setMessage(replay
        ? `本次重复练习已保存 · ${latestScore} 分${latestDuration}`
        : `学习结果已保存 · ${latestScore} 分${latestDuration}`);
      setStatus('saved');
    } catch (error) {
      if (!alive.current) return;
      setMessage(error instanceof Error ? error.message : '网络连接异常');
      setStatus('error');
    }
  }, [levelId]);

  useEffect(() => {
    alive.current = true;
    queueMicrotask(() => {
      if (alive.current) void save();
    });
    return () => {
      alive.current = false;
    };
  }, [save]);

  useEffect(() => {
    if (status === 'saved') return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [status]);

  return (
    <div className={`completion-status completion-${status}`} role={status === 'error' ? 'alert' : 'status'}>
      {status === 'saved' ? <CheckCircle2 size={24} /> : <CloudUpload size={24} />}
      <div>
        <strong>{status === 'saving' ? '正在保存学习结果…' : status === 'error' ? '结果尚未保存，请重试后离开' : message}</strong>
        <span>
          {status === 'saved' ? nextTask ? `下一任务已解锁：${nextTask}` : '可返回课程地图查看学习记录' : status === 'error' ? message : '正在与教师工作台关联，请稍候'}
        </span>
      </div>
      {status === 'error' && (
        <button type="button" onClick={() => void save()}>
          <RotateCcw size={16} />重试保存
        </button>
      )}
    </div>
  );
}
