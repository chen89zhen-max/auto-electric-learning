'use client';

import { useState } from 'react';
import type { LevelId } from '@/src/types/progress';
import type { TeacherStudentItem } from './teacherTypes';

export function StudentEvidence({ student, onSaved }: { student: TeacherStudentItem; onSaved: (message: string) => void }) {
  const [score, setScore] = useState(80);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const submit = async (url: string, body: Record<string, unknown>) => {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || '操作失败');
  };
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4" aria-label="学生学习证据">
      <div><p className="text-xs font-bold text-amber-700">学生学习证据</p><h2 className="text-xl font-black">{student.realName} <span className="text-sm font-normal text-slate-500">{student.username} · {student.className}</span></h2></div>
      <div className="grid gap-2 sm:grid-cols-3">{(['LEVEL_00', 'LEVEL_01', 'LEVEL_02'] as LevelId[]).map((levelId, index) => { const level = student.progress.levels[levelId]; return <article key={levelId} className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Sprint {index}</span><strong className="block">{level?.status === 'completed' ? `已完成 · ${level.score ?? 100}分` : '未完成'}</strong></article>; })}</div>
      <p className="text-xs text-slate-500">最后更新：{new Date(student.lastUpdated).toLocaleString('zh-CN', { hour12: false })}。这里展示服务端学习证据；教师评价不会改写游戏成绩。</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <form className="rounded-lg border border-slate-200 p-3" onSubmit={(event) => { event.preventDefault(); void submit('/api/teacher/evaluations', { studentId: student.id, score, comment }).then(() => { setComment(''); onSaved('教师评价已保存，学生游戏进度未改动'); }).catch((error: Error) => onSaved(error.message)); }}><h3 className="font-bold">形成性评价</h3><div className="mt-2 flex gap-2"><input className="teacher-input w-24" type="number" min={0} max={100} value={score} onChange={(event) => setScore(Number(event.target.value))} /><input className="teacher-input min-w-0 flex-1" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="写明观察依据" required /></div><button className="teacher-primary mt-2" type="submit">保存评价</button></form>
        <form className="rounded-lg border border-slate-200 p-3" onSubmit={(event) => { event.preventDefault(); void submit('/api/teacher/retraining', { studentId: student.id, reason }).then(() => { setReason(''); onSaved('重训申请已提交，等待受控处理'); }).catch((error: Error) => onSaved(error.message)); }}><h3 className="font-bold">申请重训</h3><textarea className="teacher-input mt-2 min-h-20 w-full py-2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="至少5个字符，说明需要重训的证据" required /><button className="teacher-primary mt-2" type="submit">提交申请</button></form>
      </div>
    </section>
  );
}
