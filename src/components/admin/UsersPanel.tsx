'use client';

import { useState } from 'react';
import type { AdminClassItem, AdminMutation, AdminUserItem } from './adminTypes';

export function UsersPanel({
  users,
  classes,
  mutate,
}: {
  users: AdminUserItem[];
  classes: AdminClassItem[];
  mutate: AdminMutation;
}) {
  const [username, setUsername] = useState('');
  const [realName, setRealName] = useState('');
  const [role, setRole] = useState<AdminUserItem['role']>('student');
  const [classId, setClassId] = useState('');

  return (
    <section className="space-y-4" aria-label="账号管理">
      <form
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          void mutate('/api/admin/users', 'POST', { username, realName, role, classId }).then(() => {
            setUsername('');
            setRealName('');
          });
        }}
      >
        <input className="admin-input" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="账号/学号" required />
        <input className="admin-input" value={realName} onChange={(event) => setRealName(event.target.value)} placeholder="姓名" required />
        <select className="admin-input" value={role} onChange={(event) => setRole(event.target.value as AdminUserItem['role'])}>
          <option value="student">学生</option>
          <option value="teacher">教师</option>
          <option value="admin">系统管理员</option>
        </select>
        <select className="admin-input" value={classId} onChange={(event) => setClassId(event.target.value)} disabled={role !== 'student'} required={role === 'student'}>
          <option value="">选择预置班级</option>
          {classes.filter((item) => item.status === 'active').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button className="admin-primary" type="submit">创建账号</button>
      </form>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[780px] w-full text-sm">
          <thead className="sticky top-0 bg-slate-100 text-left text-slate-600">
            <tr><th className="p-3">账号</th><th className="p-3">姓名</th><th className="p-3">角色</th><th className="p-3">班级</th><th className="p-3">状态</th><th className="p-3">操作</th></tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="p-3 font-mono">{user.username}</td><td className="p-3 font-semibold">{user.realName}</td>
                <td className="p-3">{{ student: '学生', teacher: '教师', admin: '管理员' }[user.role]}</td>
                <td className="p-3">{user.className || '—'}</td><td className="p-3">{user.status}</td>
                <td className="p-3"><div className="flex flex-wrap gap-2">
                  {user.status === 'active' ? (
                    <button className="admin-secondary" onClick={() => void mutate('/api/admin/users', 'PATCH', { userId: user.id, status: 'suspended' })}>停用</button>
                  ) : user.status !== 'pending_activation' && user.status !== 'deleted' ? (
                    <button className="admin-secondary" onClick={() => void mutate('/api/admin/users', 'PATCH', { userId: user.id, status: 'active' })}>启用</button>
                  ) : null}
                  <button className="admin-secondary" onClick={() => void mutate('/api/admin/users', 'PATCH', { userId: user.id, operation: 'reset_password' })}>重置密码</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
