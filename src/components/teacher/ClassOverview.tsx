'use client';

import type { TeacherClassItem } from './teacherTypes';

export function ClassOverview({ classes, selectedClassId, onSelect }: {
  classes: TeacherClassItem[];
  selectedClassId: string;
  onSelect: (classId: string) => void;
}) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-3" aria-label="任教班级">
      <h2 className="px-2 pb-2 text-sm font-black text-slate-800">我的任教班级</h2>
      <div className="space-y-2">
        <button className={`w-full rounded-lg p-3 text-left text-sm ${selectedClassId === '' ? 'bg-amber-500 font-bold text-white' : 'bg-slate-50 text-slate-700'}`} onClick={() => onSelect('')}>全部任教班级</button>
        {classes.map((item) => <button key={item.id} className={`w-full rounded-lg p-3 text-left ${selectedClassId === item.id ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`} onClick={() => onSelect(item.id)}><strong className="block text-sm">{item.name}</strong><span className="text-xs opacity-80">{item.grade} · {item.cohortYear}</span></button>)}
      </div>
    </aside>
  );
}
