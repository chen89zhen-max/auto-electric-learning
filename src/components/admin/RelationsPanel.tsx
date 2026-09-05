'use client';

import { useState } from 'react';
import type { AdminClassItem, AdminMutation, AdminUserItem, StudentClassItem, TeacherClassItem } from './adminTypes';

export function RelationsPanel({ users, classes, teacherRelations, studentRelations, mutate }: {
  users: AdminUserItem[];
  classes: AdminClassItem[];
  teacherRelations: TeacherClassItem[];
  studentRelations: StudentClassItem[];
  mutate: AdminMutation;
}) {
  const activeClasses = classes.filter((item) => item.status === 'active');
  const [teacherId, setTeacherId] = useState('');
  const [teacherClassId, setTeacherClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentClassId, setStudentClassId] = useState('');
  const currentStudentIds = new Set(studentRelations.filter((item) => item.isCurrent === 1).map((item) => item.studentId));

  return (
    <section className="grid gap-4 xl:grid-cols-2" aria-label="教学关系管理">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-bold">教师任教关系</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => {
          event.preventDefault();
          void mutate('/api/admin/teacher-classes', 'POST', { teacherId, classId: teacherClassId });
        }}>
          <select className="admin-input min-w-40 flex-1" value={teacherId} onChange={(event) => setTeacherId(event.target.value)} required><option value="">选择教师</option>{users.filter((item) => item.role === 'teacher' && item.status === 'active').map((item) => <option key={item.id} value={item.id}>{item.realName}</option>)}</select>
          <select className="admin-input min-w-40 flex-1" value={teacherClassId} onChange={(event) => setTeacherClassId(event.target.value)} required><option value="">选择班级</option>{activeClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <button className="admin-primary" type="submit">分配任教</button>
        </form>
        <ul className="mt-4 max-h-80 space-y-2 overflow-auto">
          {teacherRelations.filter((item) => item.status === 'active').map((item) => <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm"><span>{item.realName} → {item.className}</span><button className="admin-secondary" onClick={() => void mutate('/api/admin/teacher-classes', 'DELETE', { teacherId: item.teacherId, classId: item.classId })}>撤销</button></li>)}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-bold">学生归班与转班</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => {
          event.preventDefault();
          const isTransfer = currentStudentIds.has(studentId);
          void mutate('/api/admin/student-classes', isTransfer ? 'PATCH' : 'POST', isTransfer
            ? { studentId, newClassId: studentClassId }
            : { studentId, classId: studentClassId });
        }}>
          <select className="admin-input min-w-40 flex-1" value={studentId} onChange={(event) => setStudentId(event.target.value)} required><option value="">选择学生</option>{users.filter((item) => item.role === 'student' && item.status !== 'deleted').map((item) => <option key={item.id} value={item.id}>{item.realName}（{item.username}）</option>)}</select>
          <select className="admin-input min-w-40 flex-1" value={studentClassId} onChange={(event) => setStudentClassId(event.target.value)} required><option value="">选择班级</option>{activeClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <button className="admin-primary" type="submit">{currentStudentIds.has(studentId) ? '执行转班' : '建立归班'}</button>
        </form>
        <ul className="mt-4 max-h-80 space-y-2 overflow-auto">
          {studentRelations.filter((item) => item.isCurrent === 1).map((item) => <li key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm">{item.realName} → {item.className}</li>)}
        </ul>
      </div>
    </section>
  );
}
