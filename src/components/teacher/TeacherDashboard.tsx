'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Download, LogOut, RefreshCw } from 'lucide-react';
import { logoutUser, useAuth } from '@/src/stores/authStore';
import { ClassOverview } from './ClassOverview';
import { StudentEvidence } from './StudentEvidence';
import type { TeacherClassItem, TeacherStudentItem } from './teacherTypes';

export function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<TeacherClassItem[]>([]);
  const [students, setStudents] = useState<TeacherStudentItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const load = useCallback(async (classId = selectedClassId) => {
    setLoading(true);
    try {
      const [classResponse, studentResponse] = await Promise.all([
        fetch('/api/teacher/classes', { cache: 'no-store' }),
        fetch(classId ? `/api/teacher/students?classId=${encodeURIComponent(classId)}` : '/api/teacher/students', { cache: 'no-store' }),
      ]);
      const classBody = await classResponse.json() as { classes?: TeacherClassItem[]; error?: string };
      const studentBody = await studentResponse.json() as { students?: TeacherStudentItem[]; error?: string };
      if (!classResponse.ok || !studentResponse.ok) throw new Error(classBody.error || studentBody.error || '学情读取失败');
      setClasses(classBody.classes || []);
      setStudents(studentBody.students || []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '学情读取失败');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) || null,
    [selectedStudentId, students]
  );

  return (
    <main className="flex h-dvh min-h-[520px] flex-col overflow-hidden bg-slate-100 text-slate-800">
      <style>{`.teacher-input{min-height:40px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;padding-left:10px;padding-right:10px;font-size:14px;outline:none}.teacher-input:focus{border-color:#d97706;box-shadow:0 0 0 3px rgba(217,119,6,.12)}.teacher-primary{min-height:40px;border-radius:9px;background:#b45309;padding:0 14px;color:#fff;font-size:13px;font-weight:700}.teacher-primary:hover{background:#92400e}`}</style>
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="rounded-xl bg-amber-600 p-2 text-white"><BookOpenCheck size={22} /></span><div className="min-w-0"><p className="text-xs font-bold text-amber-700">教师工作台</p><h1 className="truncate text-lg font-black sm:text-xl">任教班级学情与教学评价</h1></div></div><div className="flex items-center gap-2"><span className="hidden text-sm text-slate-500 sm:inline">{user?.realName || user?.username}</span><button className="teacher-toolbar" onClick={() => { setPreview((value) => !value); setSelectedStudentId(''); }}><BookOpenCheck size={15} />{preview ? '返回学情' : '课程预览'}</button><button className="teacher-toolbar" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />刷新</button><button className="teacher-toolbar" onClick={() => void logoutUser()}><LogOut size={15} />退出</button></div></div></header>
      {notice && <div className="mx-auto mt-3 w-[calc(100%-2rem)] max-w-7xl shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">{notice}</div>}
      <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6"><div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[240px_1fr]">
        <ClassOverview classes={classes} selectedClassId={selectedClassId} onSelect={(classId) => { setSelectedClassId(classId); setSelectedStudentId(''); void load(classId); }} />
        {preview ? <ReadOnlyCoursePreview /> : selectedStudent ? <StudentEvidence student={selectedStudent} onSaved={setNotice} /> : <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="font-black">当前学生</h2><p className="text-xs text-slate-500">只显示当前有效任教关系覆盖的学生</p></div><a className="teacher-toolbar" href={selectedClassId ? `/api/teacher/students?classId=${encodeURIComponent(selectedClassId)}&format=csv` : '/api/teacher/students?format=csv'}><Download size={15} />最小化导出</a></div><div className="overflow-auto"><table className="min-w-[620px] w-full text-sm"><thead className="bg-slate-100 text-left text-slate-600"><tr><th className="p-3">学号</th><th className="p-3">姓名</th><th className="p-3">班级</th><th className="p-3">完成关卡</th><th className="p-3">操作</th></tr></thead><tbody>{students.map((student) => <tr key={student.id} className="border-t border-slate-100"><td className="p-3 font-mono">{student.username}</td><td className="p-3 font-semibold">{student.realName}</td><td className="p-3">{student.className}</td><td className="p-3">{student.completedLevels}</td><td className="p-3"><button className="teacher-primary" onClick={() => setSelectedStudentId(student.id)}>查看证据</button></td></tr>)}</tbody></table>{!loading && students.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">当前没有可查看的学生</p> : null}</div></section>}
      </div></div>
      <style>{`.teacher-toolbar{display:inline-flex;min-height:38px;align-items:center;gap:5px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;padding:0 11px;color:#475569;font-size:12px;font-weight:700}.teacher-toolbar:hover{background:#f8fafc}`}</style>
    </main>
  );
}

function ReadOnlyCoursePreview() {
  const levels = [
    ['Sprint 0', '维修中心第一天——见习技师入职训练'],
    ['Sprint 1', '实训车间突发事故——安全用电'],
    ['Sprint 2', '点亮第一盏检修灯'],
  ];
  return <section className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold text-amber-700">只读课程预览 · 不产生学习记录</p><h2 className="mt-1 text-xl font-black">当前已开发课程结构</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{levels.map(([id, title]) => <article key={id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><span className="text-xs font-bold text-amber-700">{id}</span><h3 className="mt-1 font-bold">{title}</h3><p className="mt-2 text-xs text-slate-500">预览上下文仅展示课程结构，不调用学习事件或进度写入接口。</p></article>)}</div></section>;
}
