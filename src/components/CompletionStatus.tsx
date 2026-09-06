'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, CloudUpload, RotateCcw } from 'lucide-react';
import { getUserProgress, submitLevelCompletion } from '@/src/stores/userProgressStore';
import type { AbilityReportData } from '@/src/abilities/AbilityTracker';
import { scoreFromDimensions } from '@/src/abilities/reportScore';
import type { EvidenceDimensionId, EvidenceStatus, PracticeMode } from '@/src/types/evidence';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { scoreAssessment } from '@/src/assessment/scoreAssessment';
import { isAssessmentRequiredLevel } from '@/src/assessment/rubrics';

export function CompletionStatus({
  levelId,
  report,
  metrics,
  evidence,
  mode,
  nextTask,
  assessment,
}: {
  levelId: string;
  report?: AbilityReportData;
  metrics?: object;
  evidence?: Partial<Record<EvidenceDimensionId, EvidenceStatus>>;
  mode?: PracticeMode;
  nextTask?: string;
  assessment?: LevelAssessmentResult;
}) {
  const [status, setStatus] = useState<'saving' | 'saved' | 'error'>('saving');
  const [message, setMessage] = useState('');
  const initial = useRef({
    report,
    metrics,
    evidence,
    mode,
    assessment,
    replay: getUserProgress().levels[levelId]?.status === 'completed',
  });
  const alive = useRef(false);

  const save = useCallback(async () => {
    setStatus('saving');
    try {
      const {
        report: result,
        metrics: processMetrics,
        evidence: suppliedEvidence,
        mode: practiceMode,
        assessment: rawAssessment,
        replay,
      } = initial.current;

      const isP4P5P6 = isAssessmentRequiredLevel(levelId);

      if (isP4P5P6 && !rawAssessment) {
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
      } else if (isP4P5P6) {
        throw new Error('C01—E07 关卡不允许使用默认评分');
      } else {
        const defaultEvidence: Record<string, string> =
          levelId === 'LEVEL_00' || levelId === 'O00' ? { SAFETY_SPECIFICATION: 'GUIDED_COMPLETE', CIRCUIT_READING: 'GUIDED_COMPLETE' }
          : levelId === 'LEVEL_01' || levelId === 'O01' ? { SAFETY_SPECIFICATION: 'INDEPENDENT_COMPLETE', DIAGNOSTIC_STRATEGY: 'GUIDED_COMPLETE', EVIDENCE_EXPRESSION: 'GUIDED_COMPLETE' }
          : levelId === 'A02' ? { TOOL_MEASUREMENT: 'INDEPENDENT_COMPLETE', RULE_EXPLANATION: 'INDEPENDENT_COMPLETE' }
          : levelId === 'A03' || levelId === 'LEVEL_03' ? { TOOL_MEASUREMENT: 'INDEPENDENT_COMPLETE', CIRCUIT_READING: 'INDEPENDENT_COMPLETE' }
          : levelId === 'A04' || levelId === 'LEVEL_04' ? { TOOL_MEASUREMENT: 'INDEPENDENT_COMPLETE', SAFETY_SPECIFICATION: 'INDEPENDENT_COMPLETE' }
          : { CIRCUIT_READING: 'INDEPENDENT_COMPLETE', SAFETY_SPECIFICATION: 'INDEPENDENT_COMPLETE', TOOL_MEASUREMENT: 'GUIDED_COMPLETE' };

        completionEvidence = suppliedEvidence ?? defaultEvidence;
        completionScore = result ? scoreFromDimensions(result.dimensions) : 100;
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
      setMessage(replay ? `本次为重复练习，保留首次成绩 ${projection.levels[levelId].score ?? '—'} 分` : `学习结果已保存 · ${projection.levels[levelId].score ?? '—'} 分`);
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
