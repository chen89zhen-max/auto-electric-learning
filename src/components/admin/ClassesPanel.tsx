'use client';

import { useState } from 'react';
import type { AdminClassItem, AdminMutation } from './adminTypes';

export function ClassesPanel({ classes, mutate }: { classes: AdminClassItem[]; mutate: AdminMutation }) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('2026级');
  const [cohortYear, setCohortYear] = useState(new Date().getFullYear());
  return (
    <section className="space-y-4" aria-label="班级管理">
      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4" onSubmit={(event) => {
        event.preventDefault();
        void mutate('/api/admin/classes', 'POST', { name, grade, cohortYear }).then(() => setName(''));
      }}>
        <input className="admin-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="班级名称" required />
        <input className="admin-input" value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="年级" required />
        <input className="admin-input" type="number" min={2000} max={2100} value={cohortYear} onChange={(event) => setCohortYear(Number(event.target.value))} />
        <button className="admin-primary" type="submit">创建班级</button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {classes.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{item.name}</h3><p className="text-xs text-slate-500">{item.grade} · {item.cohortYear}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{item.status}</span></div>
            <p className="mt-3 text-sm text-slate-600">当前学生 {item.studentCount} 人 · 任课教师 {item.teachers.length} 人</p>
            <div className="mt-3">
              {item.status === 'active' ? (
                <button className="admin-secondary" onClick={() => void mutate('/api/admin/classes', 'PATCH', { classId: item.id, status: 'archived' })}>归档班级</button>
              ) : item.status === 'archived' ? (
                <button className="admin-secondary" onClick={() => void mutate('/api/admin/classes', 'PATCH', { classId: item.id, status: 'active' })}>恢复启用</button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
