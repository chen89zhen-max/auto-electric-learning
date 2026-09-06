'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LevelId } from '@/src/types/progress';
import { EVIDENCE_DIMENSIONS, type EvidenceDimensionId } from '@/src/types/evidence';
import type { TeacherStudentItem, TeacherStudentE07Attempt, E07PhysicalRubricData } from './teacherTypes';

const LEVEL_NAMES: Record<LevelId, { num: string; name: string }> = {
  LEVEL_00: { num: '00', name: '维修中心第一天' },
  LEVEL_01: { num: '01', name: '安全作业与应急判断' },
  LEVEL_02: { num: '02', name: '点亮检修灯' },
  LEVEL_03: { num: '03', name: '元件身份核验 (建设中)' },
  LEVEL_04: { num: '04', name: '电流到底走哪里 (建设中)' },
  LEVEL_05: { num: '05', name: '小开关控制工作灯 (建设中)' },
  LEVEL_06: { num: '06', name: '电路的条件判断 (建设中)' },
  LEVEL_07: { num: '07', name: '小信号控制负载 (建设中)' },
  LEVEL_08: { num: '08', name: '同样不亮，原因不同 (建设中)' },
  LEVEL_09: { num: '09', name: '第一次独立交车 (建设中)' },
};

const EVIDENCE_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  NO_EVIDENCE: { label: '尚无证据', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  GUIDED_COMPLETE: { label: '跟练完成', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  INDEPENDENT_COMPLETE: { label: '独立完成', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  TRANSFER_COMPLETE: { label: '迁移完成', color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export function StudentEvidence({
  student,
  onSaved,
}: {
  student: TeacherStudentItem;
  onSaved: (message: string) => void;
}) {
  const [score, setScore] = useState(80);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');

  const [e07Attempts, setE07Attempts] = useState<TeacherStudentE07Attempt[]>([]);
  const [loadingE07, setLoadingE07] = useState(false);
  const [rubricScores, setRubricScores] = useState<Record<string, E07PhysicalRubricData>>({});
  const [rubricComments, setRubricComments] = useState<Record<string, string>>({});
  const [isSigning, setIsSigning] = useState<string | null>(null);

  const fetchEvaluations = useCallback(async () => {
    try {
      setLoadingE07(true);
      const res = await fetch(`/api/teacher/evaluations?studentId=${student.id}`);
      if (res.ok) {
        const data = await res.json() as { e07Attempts?: TeacherStudentE07Attempt[] };
        setE07Attempts(data.e07Attempts || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingE07(false);
    }
  }, [student.id]);

  useEffect(() => {
    void fetchEvaluations();
  }, [fetchEvaluations]);

  const getAttemptScores = (attemptId: string): E07PhysicalRubricData => {
    return rubricScores[attemptId] || {
      pre_power_check: 20,
      component_orientation: 20,
      solder_quality: 30,
      safety_process: 20,
      evidence_explanation: 10,
    };
  };

  const updateAttemptScore = (attemptId: string, key: keyof E07PhysicalRubricData, val: number) => {
    const current = getAttemptScores(attemptId);
    setRubricScores((prev) => ({
      ...prev,
      [attemptId]: {
        ...current,
        [key]: val,
      },
    }));
  };

  const submitPhysicalRubric = async (attemptId: string) => {
    setIsSigning(attemptId);
    try {
      const scores = getAttemptScores(attemptId);
      const cmt = rubricComments[attemptId] || '';
      await submit('/api/teacher/evaluations', {
        studentId: student.id,
        attemptId,
        evaluationType: 'PHYSICAL_RUBRIC',
        rubricVersion: 'E07-PHYSICAL-v1',
        rubricData: scores,
        comment: cmt,
      });
      await fetchEvaluations();
      onSaved('E07 实物焊接量规签署已保存');
    } catch (error) {
      onSaved((error as Error).message);
    } finally {
      setIsSigning(null);
    }
  };

  const submit = async (url: string, body: Record<string, unknown>) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || '操作失败');
  };

  // Aggregate evidence status across published levels
  const aggregatedEvidence: Record<EvidenceDimensionId, string> = {
    SAFETY_SPECIFICATION: 'NO_EVIDENCE',
    CIRCUIT_READING: 'NO_EVIDENCE',
    TOOL_MEASUREMENT: 'NO_EVIDENCE',
    RULE_EXPLANATION: 'NO_EVIDENCE',
    DIAGNOSTIC_STRATEGY: 'NO_EVIDENCE',
    EVIDENCE_EXPRESSION: 'NO_EVIDENCE',
  };

  const rank: Record<string, number> = {
    NO_EVIDENCE: 0,
    GUIDED_COMPLETE: 1,
    INDEPENDENT_COMPLETE: 2,
    TRANSFER_COMPLETE: 3,
  };

  for (const levelId of ['LEVEL_00', 'LEVEL_01', 'LEVEL_02'] as LevelId[]) {
    const levelEv = student.progress.levels[levelId]?.evidence;
    if (levelEv) {
      for (const [dim, st] of Object.entries(levelEv)) {
        const d = dim as EvidenceDimensionId;
        if (rank[st] > (rank[aggregatedEvidence[d]] ?? 0)) {
          aggregatedEvidence[d] = st;
        }
      }
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4" aria-label="学生学习证据">
      <div>
        <p className="text-xs font-bold text-amber-700">学生学习证据</p>
        <h2 className="text-xl font-black">
          {student.realName}{' '}
          <span className="text-sm font-normal text-slate-500">
            {student.username} · {student.className}
          </span>
        </h2>
      </div>

      {/* Level Attempts & Replay History */}
      <div>
        <h3 className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
          核心关卡完成与复练记录 (Attempt Records)
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {(['LEVEL_00', 'LEVEL_01', 'LEVEL_02'] as LevelId[]).map((levelId) => {
            const level = student.progress.levels[levelId];
            const meta = LEVEL_NAMES[levelId];
            const isDone = level?.status === 'completed';
            const count = level?.attemptCount ?? (isDone ? 1 : 0);

            return (
              <article key={levelId} className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-mono font-bold">任务 {meta.num}</span>
                  {isDone && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      已完成
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-sm text-slate-800 truncate">{meta.name}</h4>
                <div className="mt-2 text-xs space-y-0.5 text-slate-600">
                  <p>
                    最近成绩：<strong>{level?.recentRecord?.score ?? level?.score ?? (isDone ? 100 : '—')}分</strong>
                  </p>
                  {isDone && (
                    <>
                      <p>
                        练习次数：<strong>{count} 次</strong>
                        {level?.firstRecord && (
                          <span className="text-slate-500 ml-1">
                            (首次: {level.firstRecord.score}分)
                          </span>
                        )}
                      </p>
                      {level?.recentRecord && (
                        <p className="text-[11px] text-slate-400">
                          最近实训：{new Date(level.recentRecord.completedAt).toLocaleDateString('zh-CN')}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Six-Dimensional Evidence Matrix */}
      <div>
        <h3 className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
          六维证据状态矩阵 (Six-Dimensional Evidence Framework)
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {EVIDENCE_DIMENSIONS.map((dim) => {
            const st = aggregatedEvidence[dim.id] || 'NO_EVIDENCE';
            const badge = EVIDENCE_STATUS_LABEL[st] || EVIDENCE_STATUS_LABEL.NO_EVIDENCE;

            return (
              <div key={dim.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-800">{dim.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {dim.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        最后更新：{new Date(student.lastUpdated).toLocaleString('zh-CN', { hour12: false })}。这里展示服务端学习证据与尝试记录；教师评价不会改写学生游戏记录。
      </p>

      {/* E07 Physical Rubric Section */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3" aria-label="E07实物焊接量规签署">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span>E07 任务实物焊接量规签署 (Physical Rubric)</span>
              {loadingE07 && <span className="text-xs text-slate-400">加载中...</span>}
            </h3>
            <p className="text-xs text-slate-500">
              国家教仪规范：实物焊接作品须由任课教师在现场依五维量规核验评定并数字签名，评定数据存证入库。
            </p>
          </div>
        </div>

        {e07Attempts.length === 0 ? (
          <div className="p-3 bg-white rounded border border-slate-200 text-xs text-slate-500 text-center">
            暂无 E07 实训记录（学生在客户端完成 E07 虚拟训练后，此处将自动显示待签署实物量规记录）
          </div>
        ) : (
          <div className="space-y-3">
            {e07Attempts.map((attempt) => {
              const hasRubric = attempt.hasPhysicalRubric && attempt.physicalEvaluation;
              const scores = getAttemptScores(attempt.attemptId);
              const totalScore = scores.pre_power_check + scores.component_orientation + scores.solder_quality + scores.safety_process + scores.evidence_explanation;

              if (hasRubric && attempt.physicalEvaluation) {
                const evalData = attempt.physicalEvaluation;
                return (
                  <div key={attempt.attemptId} className="p-3.5 rounded-lg border border-emerald-300 bg-emerald-50/60 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 text-sm">
                        ✓ 实物量规已由 {evalData.teacherName} 教师完成验收签署
                      </span>
                      <span className="text-emerald-700 font-mono font-bold text-sm">
                        实物总分: {evalData.totalScore} / 100 分
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] text-slate-600 bg-white/70 p-2.5 rounded border border-emerald-200">
                      <div>通电前核验: <strong className="text-emerald-700">{evalData.rubricData?.pre_power_check ?? 0}/20</strong></div>
                      <div>元器件方向: <strong className="text-emerald-700">{evalData.rubricData?.component_orientation ?? 0}/20</strong></div>
                      <div>焊点润湿质量: <strong className="text-emerald-700">{evalData.rubricData?.solder_quality ?? 0}/30</strong></div>
                      <div>安全操作自检: <strong className="text-emerald-700">{evalData.rubricData?.safety_process ?? 0}/20</strong></div>
                      <div>原理缺陷解释: <strong className="text-emerald-700">{evalData.rubricData?.evidence_explanation ?? 0}/10</strong></div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>评语: {evalData.comment || '无评语'}</span>
                      <span>签署时间: {new Date(evalData.signedAt).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={attempt.attemptId} className="p-3.5 rounded-lg border border-amber-300 bg-amber-50/60 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-800 text-sm">
                        ⏳ 待验收签署：E07 实物焊接工单
                      </span>
                      <span className="text-slate-500 ml-2 font-mono text-[11px]">
                        (记录编号: {attempt.attemptId} · 完成于: {new Date(attempt.completedAt).toLocaleString('zh-CN')})
                      </span>
                    </div>
                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px] border border-amber-300">
                      待教师现场核验
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 bg-white p-3 rounded-lg border border-amber-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        1. 供电前核验 (0-20分)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={scores.pre_power_check}
                        onChange={(e) => updateAttemptScore(attempt.attemptId, 'pre_power_check', Math.min(20, Math.max(0, Number(e.target.value))))}
                        className="teacher-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        2. 元器件方向 (0-20分)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={scores.component_orientation}
                        onChange={(e) => updateAttemptScore(attempt.attemptId, 'component_orientation', Math.min(20, Math.max(0, Number(e.target.value))))}
                        className="teacher-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        3. 焊点润湿质量 (0-30分)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={scores.solder_quality}
                        onChange={(e) => updateAttemptScore(attempt.attemptId, 'solder_quality', Math.min(30, Math.max(0, Number(e.target.value))))}
                        className="teacher-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        4. 安全规范自检 (0-20分)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={scores.safety_process}
                        onChange={(e) => updateAttemptScore(attempt.attemptId, 'safety_process', Math.min(20, Math.max(0, Number(e.target.value))))}
                        className="teacher-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        5. 原理缺陷解释 (0-10分)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={scores.evidence_explanation}
                        onChange={(e) => updateAttemptScore(attempt.attemptId, 'evidence_explanation', Math.min(10, Math.max(0, Number(e.target.value))))}
                        className="teacher-input w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                    <div className="flex-1 w-full flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="现场观察评语（选填）"
                        value={rubricComments[attempt.attemptId] || ''}
                        onChange={(e) => setRubricComments((prev) => ({ ...prev, [attempt.attemptId]: e.target.value }))}
                        className="teacher-input flex-1"
                      />
                      <span className="font-bold text-slate-700 shrink-0 text-xs">
                        量规合计：<strong className="text-blue-700 font-mono text-sm">{totalScore}</strong> / 100 分
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isSigning === attempt.attemptId}
                      onClick={() => void submitPhysicalRubric(attempt.attemptId)}
                      className="teacher-primary shrink-0 text-xs px-4 py-1.5"
                    >
                      {isSigning === attempt.attemptId ? '签署中...' : '签署实物量规并存证'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Teacher Evaluation & Retraining Forms */}
      <div className="grid gap-4 lg:grid-cols-2">
        <form
          className="rounded-lg border border-slate-200 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit('/api/teacher/evaluations', { studentId: student.id, score, comment })
              .then(() => {
                setComment('');
                onSaved('教师评价已保存，学生游戏进度未改动');
              })
              .catch((error: Error) => onSaved(error.message));
          }}
        >
          <h3 className="font-bold">形成性评价</h3>
          <div className="mt-2 flex gap-2">
            <input
              className="teacher-input w-24"
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(event) => setScore(Number(event.target.value))}
            />
            <input
              className="teacher-input min-w-0 flex-1"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="写明观察依据"
              required
            />
          </div>
          <button className="teacher-primary mt-2" type="submit">
            保存评价
          </button>
        </form>

        <form
          className="rounded-lg border border-slate-200 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit('/api/teacher/retraining', { studentId: student.id, reason })
              .then(() => {
                setReason('');
                onSaved('重训申请已提交，等待受控处理');
              })
              .catch((error: Error) => onSaved(error.message));
          }}
        >
          <h3 className="font-bold">申请重训</h3>
          <textarea
            className="teacher-input mt-2 min-h-20 w-full py-2"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="至少5个字符，说明需要重训的证据"
            required
          />
          <button className="teacher-primary mt-2" type="submit">
            提交申请
          </button>
        </form>
      </div>
    </section>
  );
}
