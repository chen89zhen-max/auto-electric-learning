'use client';

import React, { useState } from 'react';
import { CANONICAL_COURSE_REGISTRY, getCourseLevel } from '@/src/courses/registry';
import { TEXTBOOK_TASKS, getLevelCurriculum, getRouteProgress, type LearningRoute } from '@/src/courses/curriculum';
import type { CourseMapLevelModel } from './courseMapModel';
import { LowVoltageWorkorderPanel } from './LowVoltageWorkorderPanel';

const SKILL_GROUPS = [
  { title: '灯光回路与故障诊断', ids: ['A01', 'B02', 'C01', 'C02', 'C03', 'F01'], scope: '已有检修灯与灯组训练；灯光变式工单见下方低压系统诊断区。转向、危险警告、制动、倒车等独立线路仍未覆盖。' },
  { title: '车窗电机与继电器控制', ids: ['D01', 'D02'], scope: '已有低压电机正反转及车窗故障练习；起动、车窗／后视镜变式工单见下方低压系统诊断区。' },
  { title: '低压电源与充电原理', ids: ['A02', 'B05', 'D03', 'E03'], scope: '测量、内阻、发电与整流训练；不等同于蓄电池或动力电池拆装考核。' },
  { title: '元件检测与装配质量', ids: ['A03', 'A04', 'E01', 'E02', 'E07'], scope: '虚拟配表、检测、装配和焊点判断；实物操作与工量具熟练度须由教师现场评价。' },
];

export function CurriculumRoutes({ levels, onOpenLevel }: {
  levels: CourseMapLevelModel[];
  onOpenLevel: (level: CourseMapLevelModel) => void;
}) {
  const [route, setRoute] = useState<LearningRoute | 'skills'>('course');
  const completedIds = levels.filter(level => level.state === 'completed').map(level => level.id);
  const progress = getRouteProgress(completedIds, route === 'exam' ? 'exam' : 'course');
  const renderLink = (id: string) => {
    const level = levels.find(item => item.id === id);
    if (!level) return null;
    return <button key={id} type="button" onClick={() => onOpenLevel(level)}
      className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100 hover:border-cyan-400">
      {id} {level.title} · {level.state === 'completed' ? '已完成' : level.state === 'locked' ? '需先修' : '去学习'}
    </button>;
  };
  return <section className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-200" aria-label="学习路线与教材考纲">
    <div className="flex flex-wrap items-center gap-2">
      {([['course', '课程闯关'], ['exam', '重庆2027考纲关卡索引'], ['skills', '低压故障练习工单']] as const).map(([id, name]) =>
        <button key={id} type="button" aria-pressed={route === id} onClick={() => setRoute(id)}
          className={`rounded-lg border px-3 py-2 text-sm font-bold ${route === id ? 'border-cyan-400 bg-cyan-950 text-cyan-100' : 'border-slate-600 bg-slate-800 text-slate-300'}`}>{name}</button>)}
      {route !== 'skills' && <span className="ml-auto text-sm">{route === 'course' ? '课程必学关卡已通关' : '考纲对应关卡已通关'}：{progress.completed}/{progress.total}</span>}
    </div>
    {route === 'course' && <p className="mt-3 text-sm leading-relaxed">按篇章逐步完成实训。D05为课程拓展，但在重庆2027备考中必学。上方总进度包含全部28关；此处单独统计课程必学关卡。</p>}
    {route === 'exam' && <div className="mt-3 text-sm leading-relaxed">
      <p>依据所提供的重庆2027考试说明，将19项相关要求对应到已有闯关任务，方便按知识点回关复习。本区不是独立题库；关卡完成数不等于考纲掌握程度或考试成绩。</p>
      <p className="mt-1 text-amber-200">D05变压器为备考必学。历史通关记录保留，新增目标请重新练习；独立答题与线下操作仍需核验。</p>
      <details className="mt-3"><summary className="cursor-pointer font-bold text-cyan-200">查看19项考纲要求与对应关卡</summary>
        <div className="mt-2 grid gap-3 lg:grid-cols-2">{TEXTBOOK_TASKS.map(task => {
          const ids = CANONICAL_COURSE_REGISTRY.filter(level => {
            const curriculum = getLevelCurriculum(level.canonicalId);
            return curriculum?.examRequired && curriculum.textbookTaskIds.includes(task.id) && level.canonicalId !== 'C03';
          }).map(level => level.canonicalId);
          return <article key={task.id} className="rounded-lg border border-slate-700 p-3">
            <strong>任务{task.id} · {task.examTitle ?? task.title}</strong>
            <span className="ml-2 text-xs text-slate-400">理论考纲第{task.theoryPage}页</span>
            <ul className="my-2 list-disc pl-5 text-slate-300">{task.requirements.map(r => <li key={r}>{r}</li>)}</ul>
            <div className="flex flex-wrap gap-2">{ids.map(renderLink)}</div>
          </article>;
        })}</div>
      </details>
    </div>}
    {route === 'skills' && <div className="mt-3 text-sm leading-relaxed">
      <p>这里汇集相关闯关入口和五张低压故障样本工单，用于练习诊断思路；不是正式技能考试模拟，也不生成技能考核成绩。实车测量、拆装及安全操作须由教师在现场指导和评价。</p>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">{SKILL_GROUPS.map(group => <article key={group.title} className="rounded-lg border border-slate-700 p-3">
        <strong>{group.title}</strong><p className="my-2 text-slate-300">{group.scope}</p>
        <div className="flex flex-wrap gap-2">{group.ids.filter(id => getCourseLevel(id)).map(renderLink)}</div>
      </article>)}</div>
      <LowVoltageWorkorderPanel />
    </div>}
  </section>;
}
