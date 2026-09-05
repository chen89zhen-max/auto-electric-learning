'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Lock,
  LogIn,
  ShieldAlert,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loginUser, useAuth } from '@/src/stores/authStore';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthDialog({ isOpen, onClose, onSuccess }: AuthDialogProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'login' | 'teacher' | 'admin'>('login');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Admin form state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Status state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleStudentLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setError('请完整输入学号/账号和密码');
      return;
    }

    setError(null);
    setLoading(true);
    const res = await loginUser(loginUsername, loginPassword, 'student');
    setLoading(false);

    if (res.success) {
      onSuccess?.();
      onClose();
    } else {
      setError(res.error || '登录失败');
    }
  };

  const handleManagementLogin = async (
    e: React.SyntheticEvent,
    expectedRole: 'teacher' | 'admin'
  ) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await loginUser(adminUsername, adminPassword, expectedRole);
    setLoading(false);

    if (res.success) {
      onSuccess?.();
      onClose();
    } else {
      setError(res.error || (expectedRole === 'teacher' ? '教师登录失败' : '管理员登录失败'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Accessible background backdrop */}
      <button
        type="button"
        className="fixed inset-0 w-full h-full cursor-default bg-transparent border-none"
        onClick={onClose}
        aria-label="关闭登录弹窗"
      />

      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full transition-colors"
            aria-label="关闭"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
              <GraduationCap size={26} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                NEV ELECTRICAL TRAINING SYSTEM
              </span>
              <h2 className="text-xl font-black m-0 tracking-tight">
                {user ? '切换账号' : '实训系统身份登录'}
              </h2>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tab === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <LogIn size={14} />
              学员登录
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('teacher');
                setError(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tab === 'teacher'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-300 hover:text-white hover:bg-purple-500/20'
              }`}
            >
              <UserCheck size={14} />
              教师登录
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('admin');
                setError(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tab === 'admin'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'text-rose-300 hover:text-white hover:bg-rose-500/20'
              }`}
            >
              <ShieldAlert size={14} />
              系统管理登录
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Tab 1: Student Login */}
          {tab === 'login' && (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label htmlFor="login-username" className="block text-xs font-bold text-slate-700 mb-1.5">
                  学号 / 账号
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-username"
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="请输入你的学号 (如 20240101)"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 mb-1.5">
                  登录密码
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full h-11 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-md"
                >
                  {loading ? '正在验证登录...' : '登 录 实 训'}
                </Button>

                <p className="text-center text-xs text-slate-500 py-1.5">
                  首次使用请凭学校发放的学号和一次性激活码完成账号激活。
                </p>
              </div>
            </form>
          )}

          {/* Role-specific Teacher or System Admin Login */}
          {(tab === 'teacher' || tab === 'admin') && (
            <form
              onSubmit={(event) => handleManagementLogin(event, tab)}
              className="space-y-4"
            >
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs leading-relaxed">
                {tab === 'teacher' ? '👨‍🏫' : '🛡️'}{' '}
                <strong>{tab === 'teacher' ? '教师教学工作台：' : '系统管理员后台：'}</strong>
                {tab === 'teacher'
                  ? '登录后仅查看本人任教班级的学生学情、评价和教学数据。'
                  : '用于账号、班级、任教关系和系统安全管理，不进入学生学习界面。'}
              </div>

              <div>
                <label htmlFor="admin-username" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {tab === 'teacher' ? '教师账号' : '系统管理员账号'}
                </label>
                <div className="relative">
                  <UserCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-600" />
                  <input
                    id="admin-username"
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {tab === 'teacher' ? '教师密码' : '系统管理员密码'}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-600" />
                  <input
                    id="admin-password"
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full h-11 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold shadow-md shadow-purple-700/20"
                >
                  {loading
                    ? '正在验证身份...'
                    : tab === 'teacher'
                    ? '进 入 教 师 工 作 台'
                    : '进 入 系 统 管 理 后 台'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
