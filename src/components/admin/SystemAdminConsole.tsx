'use client';

import { useCallback, useEffect, useState } from 'react';
import { LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { logoutUser, useAuth } from '@/src/stores/authStore';
import { AuditPanel } from './AuditPanel';
import { ClassesPanel } from './ClassesPanel';
import { RelationsPanel } from './RelationsPanel';
import { UsersPanel } from './UsersPanel';
import type { AdminClassItem, AdminMutation, AdminUserItem, AuditItem, StudentClassItem, TeacherClassItem } from './adminTypes';

type Tab = 'users' | 'classes' | 'relations' | 'audit';

async function jsonRequest<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || '数据加载失败');
  return body;
}

export function SystemAdminConsole() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [classes, setClasses] = useState<AdminClassItem[]>([]);
  const [teacherRelations, setTeacherRelations] = useState<TeacherClassItem[]>([]);
  const [studentRelations, setStudentRelations] = useState<StudentClassItem[]>([]);
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [userData, classData, teacherData, studentData, auditData] = await Promise.all([
        jsonRequest<{ users: AdminUserItem[] }>('/api/admin/users'),
        jsonRequest<{ classes: AdminClassItem[] }>('/api/admin/classes'),
        jsonRequest<{ assignments: TeacherClassItem[] }>('/api/admin/teacher-classes'),
        jsonRequest<{ relations: StudentClassItem[] }>('/api/admin/student-classes'),
        jsonRequest<{ logs: AuditItem[] }>('/api/admin/audit-logs?limit=100'),
      ]);
      setUsers(userData.users);
      setClasses(classData.classes);
      setTeacherRelations(teacherData.assignments);
      setStudentRelations(studentData.relations);
      setLogs(auditData.logs);
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : '数据加载失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshAll(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshAll]);

  const mutate: AdminMutation = async (url, method, body) => {
    try {
      const payload = JSON.stringify(body);
      const options = method === 'POST'
        ? { method: 'POST' as const, headers: { 'content-type': 'application/json' }, body: payload }
        : method === 'PATCH'
          ? { method: 'PATCH' as const, headers: { 'content-type': 'application/json' }, body: payload }
          : { method: 'DELETE' as const, headers: { 'content-type': 'application/json' }, body: payload };
      const response = await fetch(url, options);
      const result = await response.json() as { error?: string; temporaryPassword?: string; activationCode?: string };
      if (!response.ok) throw new Error(result.error || '操作失败');
      const credential = result.activationCode
        ? `；一次性激活码：${result.activationCode}`
        : result.temporaryPassword
          ? `；临时密码：${result.temporaryPassword}`
          : '';
      setNotice({ tone: 'ok', text: `操作成功${credential}。请立即安全交付，页面刷新后不再显示。` });
      await refreshAll();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : '操作失败' });
    }
  };

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'users', label: '账号' }, { id: 'classes', label: '班级' },
    { id: 'relations', label: '教学关系' }, { id: 'audit', label: '审计日志' },
  ];

  return (
    <main className="flex h-dvh min-h-[520px] flex-col overflow-hidden bg-slate-100 text-slate-800">
      <style>{`.admin-input{min-height:40px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:0 12px;font-size:14px;outline:none}.admin-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}.admin-input:disabled{background:#f1f5f9;color:#94a3b8}.admin-primary,.admin-secondary{min-height:40px;border-radius:10px;padding:0 14px;font-size:13px;font-weight:700}.admin-primary{background:#1d4ed8;color:#fff}.admin-secondary{border:1px solid #cbd5e1;background:#fff;color:#334155}.admin-primary:hover{background:#1e40af}.admin-secondary:hover{background:#f8fafc}`}</style>
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3"><span className="rounded-xl bg-blue-700 p-2 text-white"><ShieldCheck size={22} /></span><div className="min-w-0"><p className="text-xs font-bold text-blue-700">系统管理控制台</p><h1 className="truncate text-lg font-black sm:text-xl">账号、教学组织与安全审计</h1></div></div>
          <div className="flex items-center gap-2"><span className="hidden text-sm text-slate-500 sm:inline">{user?.realName || user?.username}</span><button className="admin-secondary flex items-center gap-1" onClick={() => void refreshAll()} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />刷新</button><button className="admin-secondary flex items-center gap-1" onClick={() => void logoutUser()}><LogOut size={15} />退出</button></div>
        </div>
      </header>
      <nav className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6" aria-label="管理功能">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto py-2">{tabs.map((item) => <button key={item.id} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === item.id ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
      </nav>
      {notice && <div className={`mx-auto mt-3 w-[calc(100%-2rem)] max-w-7xl shrink-0 rounded-lg border px-4 py-2 text-sm ${notice.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {loading && users.length === 0 ? <p className="py-20 text-center text-sm text-slate-500">正在读取管理数据…</p> : null}
          {tab === 'users' && <UsersPanel users={users} classes={classes} mutate={mutate} />}
          {tab === 'classes' && <ClassesPanel classes={classes} mutate={mutate} />}
          {tab === 'relations' && <RelationsPanel users={users} classes={classes} teacherRelations={teacherRelations} studentRelations={studentRelations} mutate={mutate} />}
          {tab === 'audit' && <AuditPanel logs={logs} />}
        </div>
      </div>
    </main>
  );
}
