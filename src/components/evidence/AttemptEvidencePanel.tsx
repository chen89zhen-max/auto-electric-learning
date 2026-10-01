import React, { useEffect, useState, useCallback, useId } from 'react';
import type { AttemptEvidenceListResponse, AttemptEvidenceView, C7EvidenceLevelId } from '@/src/types/attemptEvidence';
import { formatAttemptEvidence } from './attemptEvidenceFormatters';

export interface AttemptEvidencePanelProps {
  levelId: C7EvidenceLevelId;
  viewer: { kind: 'student' } | { kind: 'teacher'; studentId: string };
  initiallyOpen?: boolean;
}

export function AttemptEvidencePanel({
  levelId,
  viewer,
  initiallyOpen = true,
}: AttemptEvidencePanelProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AttemptEvidenceListResponse | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const selectId = useId();

  const fetchData = useCallback(
    (signal?: AbortSignal) => {
      const url =
        viewer.kind === 'student'
          ? `/api/learning/attempts?levelId=${encodeURIComponent(levelId)}`
          : `/api/teacher/attempts?studentId=${encodeURIComponent(viewer.studentId)}&levelId=${encodeURIComponent(levelId)}`;

      setLoading(true);
      setError(null);

      fetch(url, { signal })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error('过程证据读取失败');
          }
          return res.json() as Promise<{ success: boolean } & AttemptEvidenceListResponse>;
        })
        .then((resData) => {
          if (!resData.success) {
            throw new Error('过程证据读取失败');
          }
          setData(resData);
          if (resData.attempts && resData.attempts.length > 0) {
            setSelectedAttemptId(resData.attempts[0].attemptId);
          } else {
            setSelectedAttemptId(null);
          }
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') {
            return;
          }
          setError('过程证据读取失败');
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [levelId, viewer]
  );

  useEffect(() => {
    const abortController = new AbortController();
    const timer = window.setTimeout(() => {
      fetchData(abortController.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      abortController.abort();
    };
  }, [fetchData]);

  const selectedAttempt: AttemptEvidenceView | undefined =
    data?.attempts.find((a) => a.attemptId === selectedAttemptId) ?? data?.attempts[0];

  const formattedSections =
    selectedAttempt && selectedAttempt.evidence
      ? formatAttemptEvidence(levelId, selectedAttempt.evidence)
      : [];

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) {
      return `${mins}分${secs < 10 ? '0' : ''}${secs}秒`;
    }
    return `${secs}秒`;
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString('zh-CN', { hour12: false });
  };

  const getModeDisplayName = (mode: string) => {
    const map: Record<string, string> = {
      guided: '引导练习',
      independent: '自主实训',
      transfer: '考评迁移',
    };
    return map[mode] ?? mode;
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/90 text-slate-100 shadow-md p-4 mb-4">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-base text-cyan-400">实训过程证据存档</span>
          <span className="text-xs bg-cyan-900/60 text-cyan-300 border border-cyan-700/60 px-2 py-0.5 rounded">
            {levelId}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800 border border-slate-700"
        >
          {isOpen ? '收起明细' : '展开明细'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3">
          {loading && (
            <div className="py-6 text-center text-slate-400 text-sm">
              正在读取过程证据
            </div>
          )}

          {!loading && error && (
            <div className="py-4 text-center">
              <p className="text-sm text-red-400 mb-2">{error}</p>
              <button
                type="button"
                onClick={() => fetchData()}
                className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-600"
              >
                重试
              </button>
            </div>
          )}

          {!loading && !error && (!data || data.attempts.length === 0) && (
            <div className="py-6 text-center text-slate-400 text-sm">
              暂无已保存的过程证据
            </div>
          )}

          {!loading && !error && data && data.attempts.length > 0 && selectedAttempt && (
            <div className="space-y-4">
              {/* Attempt Selector & Overview */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <label htmlFor={selectId} className="text-xs text-slate-300">选择实训批次：</label>
                  <select
                    id={selectId}
                    value={selectedAttempt.attemptId}
                    onChange={(e) => setSelectedAttemptId(e.target.value)}
                    className="bg-slate-900 border border-slate-600 text-slate-200 text-xs rounded px-2 py-1 outline-none focus:border-cyan-500"
                  >
                    {data.attempts.map((att, idx) => (
                      <option key={att.attemptId} value={att.attemptId}>
                        第 {data.attempts.length - idx} 次: {att.attemptId} ({formatTime(att.completedAt)}) - {att.score}分
                      </option>
                    ))}
                  </select>
                </div>

                {data.total > data.attempts.length && (
                  <div className="text-xs text-amber-400 font-medium">
                    当前显示最近{data.attempts.length}次，共{data.total}次
                  </div>
                )}
              </div>

              {/* Selected Attempt Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                <div className="bg-slate-800/40 p-2 rounded border border-slate-700/40">
                  <span className="text-slate-400 block mb-1">记录编号</span>
                  <span data-testid="selected-attempt-id" className="font-mono text-slate-200 break-all">{selectedAttempt.attemptId}</span>
                </div>
                <div className="bg-slate-800/40 p-2 rounded border border-slate-700/40">
                  <span className="text-slate-400 block mb-1">练习模式</span>
                  <span data-testid="selected-attempt-mode" className="text-cyan-300 font-medium">{getModeDisplayName(selectedAttempt.mode)}</span>
                </div>
                <div className="bg-slate-800/40 p-2 rounded border border-slate-700/40">
                  <span className="text-slate-400 block mb-1">开始时间</span>
                  <span data-testid="selected-attempt-started-at" className="text-slate-200">{formatTime(selectedAttempt.startedAt)}</span>
                </div>
                <div className="bg-slate-800/40 p-2 rounded border border-slate-700/40">
                  <span className="text-slate-400 block mb-1">完成时间 / 用时</span>
                  <span className="text-slate-200">
                    {formatTime(selectedAttempt.completedAt)} ({formatDuration(selectedAttempt.durationMs)})
                  </span>
                </div>
                <div className="bg-slate-800/40 p-2 rounded border border-slate-700/40">
                  <span className="text-slate-400 block mb-1">服务端成绩</span>
                  <span className="text-emerald-400 font-bold text-sm">{selectedAttempt.score} 分</span>
                </div>
                <div className="bg-slate-800/40 p-2 rounded border border-slate-700/40">
                  <span className="text-slate-400 block mb-1">数据来源状态</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedAttempt.legacyRecovered ? (
                      <span className="inline-block bg-amber-950/70 border border-amber-600/70 text-amber-300 px-1.5 py-0.5 rounded text-[11px]">
                        由历史完成事件恢复
                      </span>
                    ) : (
                      <span className="inline-block bg-cyan-950/70 border border-cyan-600/70 text-cyan-300 px-1.5 py-0.5 rounded text-[11px]">
                        完整存档
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Notice Trust Label */}
              <div className="flex items-center gap-2 px-3 py-2 bg-sky-950/40 border border-sky-800/60 rounded text-xs text-sky-200">
                <span className="font-semibold">学生端过程记录（结构已校验，不作为成绩依据）</span>
              </div>

              {/* Evidence Body */}
              {selectedAttempt.evidence === null ? (
                <div className="p-4 bg-slate-800/30 rounded border border-slate-700/50 text-slate-400 text-xs">
                  {selectedAttempt.unavailableReason ?? '该次实训未提供有效过程证据'}
                </div>
              ) : (
                <div className="space-y-3">
                  {formattedSections.map((sec) => (
                    <div key={sec.title} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/60">
                      <h4 className="text-xs font-semibold text-cyan-300 mb-2 border-b border-slate-700/50 pb-1">
                        {sec.title}
                      </h4>
                      <div className="space-y-1.5">
                        {sec.fields.map((f) => (
                          <div key={f.label} className="text-xs flex flex-col sm:flex-row sm:gap-2">
                            <span className="text-slate-400 sm:w-44 shrink-0">{f.label}：</span>
                            <span className="text-slate-200 font-mono break-all">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
