'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, CloudUpload, RotateCcw } from 'lucide-react';
import { getUserProgress, submitLevelCompletion, type LevelId } from '@/src/stores/userProgressStore';
import type { AbilityReportData } from '@/src/abilities/AbilityTracker';
import { scoreFromDimensions } from '@/src/abilities/reportScore';

export function CompletionStatus({ levelId, report, metrics, nextTask }: {
  levelId: LevelId; report?: AbilityReportData; metrics?: object; nextTask?: string;
}) {
  const [status, setStatus] = useState<'saving' | 'saved' | 'error'>('saving');
  const [message, setMessage] = useState('');
  const initial = useRef({ report, metrics, replay: getUserProgress().levels[levelId]?.status === 'completed' });
  const alive = useRef(false);
  const save = useCallback(async () => {
    setStatus('saving');
    try {
      const { report: result, metrics: processMetrics, replay } = initial.current;
      const defaultEvidence: Record<string, string> =
        levelId === 'LEVEL_00' ? { SAFETY_SPECIFICATION: 'GUIDED_COMPLETE', CIRCUIT_READING: 'GUIDED_COMPLETE' }
        : levelId === 'LEVEL_01' ? { SAFETY_SPECIFICATION: 'INDEPENDENT_COMPLETE', DIAGNOSTIC_STRATEGY: 'GUIDED_COMPLETE', EVIDENCE_EXPRESSION: 'GUIDED_COMPLETE' }
        : { CIRCUIT_READING: 'INDEPENDENT_COMPLETE', SAFETY_SPECIFICATION: 'INDEPENDENT_COMPLETE', TOOL_MEASUREMENT: 'GUIDED_COMPLETE' };

      const projection = await submitLevelCompletion(levelId, result ? scoreFromDimensions(result.dimensions) : 100, {
        source: levelId,
        evidence: defaultEvidence,
        ...(result ? { dimensions: result.dimensions } : {}),
        ...(processMetrics ? { metrics: processMetrics } : {}),
      }, { allowReplay: true });
      if (!alive.current) return;
      setMessage(replay ? `本次为重复练习，保留首次成绩 ${projection.levels[levelId].score ?? '—'} 分` : `学习结果已保存 · ${projection.levels[levelId].score ?? '—'} 分`);
      setStatus('saved');
    } catch (error) {
      if (!alive.current) return;
      setMessage(error instanceof Error ? error.message : '网络连接异常');
      setStatus('error');
    }
  }, [levelId]);
  useEffect(() => { alive.current = true; queueMicrotask(() => { if (alive.current) void save(); }); return () => { alive.current = false; }; }, [save]);
  useEffect(() => {
    if (status === 'saved') return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [status]);
  return (
    <div className={`completion-status completion-${status}`} role={status === 'error' ? 'alert' : 'status'}>
      {status === 'saved' ? <CheckCircle2 size={24} /> : <CloudUpload size={24} />}
      <div><strong>{status === 'saving' ? '正在保存学习结果…' : status === 'error' ? '结果尚未保存，请重试后离开' : message}</strong>
        <span>{status === 'saved' ? nextTask ? `下一任务已解锁：${nextTask}` : '可返回课程地图查看学习记录' : status === 'error' ? message : '正在与教师工作台关联，请稍候'}</span>
      </div>
      {status === 'error' && <button type="button" onClick={() => void save()}><RotateCcw size={16} />重试保存</button>}
    </div>
  );
}
