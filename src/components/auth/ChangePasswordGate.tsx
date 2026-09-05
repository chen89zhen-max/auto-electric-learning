'use client';

import { useState } from 'react';
import { KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { changeCurrentPassword, logoutUser, type UserProfile } from '@/src/stores/authStore';

export function ChangePasswordGate({ user }: { user: UserProfile }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setSaving(true);
    setError(null);
    const result = await changeCurrentPassword(currentPassword, newPassword);
    setSaving(false);
    if (!result.success) {
      setError(result.error || '密码修改失败');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-900 flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        <header className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <ShieldCheck size={26} />
            </span>
            <div>
              <p className="text-xs font-bold tracking-wider opacity-90">账号安全校验</p>
              <h1 className="text-xl font-black">首次登录必须修改密码</h1>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {user.realName}，当前使用的是临时凭据。完成改密前不能进入游戏或管理后台。
          </p>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          <label className="block text-xs font-bold text-slate-700">
            当前临时密码
            <span className="relative mt-1.5 block">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm"
              />
            </span>
          </label>

          <label className="block text-xs font-bold text-slate-700">
            新密码
            <span className="relative mt-1.5 block">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="至少10位，含字母、数字和特殊字符"
                className="h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm"
              />
            </span>
          </label>

          <label className="block text-xs font-bold text-slate-700">
            再次输入新密码
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>

          <Button
            type="submit"
            disabled={saving}
            className="h-11 w-full bg-amber-600 text-white hover:bg-amber-500"
          >
            {saving ? '正在更新安全凭据…' : '修改密码并继续'}
          </Button>

          <button
            type="button"
            onClick={() => void logoutUser()}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-800"
          >
            暂不修改，安全退出
          </button>
        </form>
      </section>
    </main>
  );
}
