'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Lock,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Wrench,
  Zap,
  LayoutDashboard,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  COURSE_MAP,
  LevelId,
  LevelMeta,
  isLevelUnlocked,
  resetUserProgress,
  toggleTeacherMode,
  useUserProgress,
} from '@/src/stores/userProgressStore';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import { useAuth, logoutUser } from '@/src/stores/authStore';
import { AuthDialog } from '@/src/components/auth/AuthDialog';
import { AdminDashboard } from '@/src/components/admin/AdminDashboard';

interface CourseMapLobbyProps {
  onSelectLevel: (levelId: LevelId) => void;
}

export function CourseMapLobby({ onSelectLevel }: CourseMapLobbyProps) {
  const progress = useUserProgress();
  const { user, isAdmin } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  // Calculate statistics
  const completedCount = Object.values(progress.levels).filter((l) => l.status === 'completed').length;
  const totalTasks = COURSE_MAP.length;
  const progressPercent = Math.round((completedCount / totalTasks) * 100);

  // Admin / Teacher Dashboard view
  if (showAdminDashboard && (isAdmin || user?.role === 'teacher')) {
    return <AdminDashboard onReturnLobby={() => setShowAdminDashboard(false)} />;
  }

  // Determine current active level
  const activeLevelMeta = COURSE_MAP.find((m) => m.id === progress.currentActiveLevel) || COURSE_MAP[0];

  const handleCardClick = (meta: LevelMeta) => {
    const unlocked = isLevelUnlocked(meta.id, progress);
    if (!unlocked) {
      setLockedNotice(`🔒 ${meta.title} 尚未解锁！请先完成：${meta.prerequisiteName || '前置关卡'}`);
      setTimeout(() => setLockedNotice(null), 3000);
      return;
    }
    if (!meta.implemented) {
      setLockedNotice(`🛠️ ${meta.title} 正在依据教材89页课程大纲开发中，敬请期待！`);
      setTimeout(() => setLockedNotice(null), 3000);
      return;
    }
    onSelectLevel(meta.id);
  };

  const handleToggleTeacher = () => {
    if (!isAdmin && user?.role !== 'teacher') return;
    toggleTeacherMode();
  };

  const handleConfirmReset = () => {
    resetUserProgress();
    setShowResetConfirm(false);
  };

  const handleLogout = async () => {
    setLogoutPending(true);
    const result = await logoutUser();
    setLogoutPending(false);
    setShowAdminDashboard(false);
    if (!result.success) {
      setLockedNotice(`⚠ ${result.error}`);
      setTimeout(() => setLockedNotice(null), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center p-4 sm:p-6 lg:p-8 select-none" suppressHydrationWarning>
      {/* Top Banner & User Profile */}
      <header className="w-full max-w-[1480px] bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-md p-5 sm:p-6 mb-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4" suppressHydrationWarning>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Zap size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                中职汽车类专业智能实训系统
              </span>
              {progress.teacherMode && (
                <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                  教师演示模式已开启 (全关卡解锁)
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              汽车电工电子 · 课程地图与实训大厅
            </h1>
          </div>
        </div>

        {/* Student Stats & Teacher Mode Tools */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${isAdmin ? 'bg-purple-600' : 'bg-amber-500'}`}>
              {isAdmin ? <ShieldAlert size={22} /> : <GraduationCap size={22} />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                <span>{user ? user.realName : progress.traineeName}</span>
                {user?.className && (
                  <span className="text-[10px] text-slate-500 font-normal">({user.className})</span>
                )}
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                  isAdmin
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {isAdmin
                    ? '系统管理员'
                    : user?.role === 'teacher'
                    ? '任课教师'
                    : completedCount === 0
                    ? '入职见习中'
                    : completedCount === 1
                    ? '技师认证Ⅰ'
                    : completedCount === 2
                    ? '技师认证Ⅱ'
                    : `技师认证 · ${completedCount}阶`}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                <span>完成进度: {completedCount} / {totalTasks}</span>
                <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <FullscreenButton />

            {/* Admin / Teacher Dashboard Button */}
            {(isAdmin || user?.role === 'teacher') && (
              <Button
                size="sm"
                onClick={() => setShowAdminDashboard(true)}
                className="text-xs bg-purple-700 hover:bg-purple-600 text-white font-bold flex items-center gap-1.5 shadow-sm"
              >
                <LayoutDashboard size={14} />
                {isAdmin ? '系统管理大屏' : '班级教学大屏'}
              </Button>
            )}

            {/* Auth Button */}
            {user ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleLogout()}
                disabled={logoutPending}
                className="text-xs border-slate-200 bg-white text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                title="退出当前登录账号"
              >
                <LogOut size={14} />
                {logoutPending ? '退出中…' : '退出'}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setShowAuthDialog(true)}
                className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1 shadow-sm"
              >
                <LogIn size={14} />
                账号登录/激活
              </Button>
            )}

            {/* Demo Mode strictly restricted to Teachers and Admins */}
            {(isAdmin || user?.role === 'teacher') && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleTeacher}
                className={`text-xs border-slate-200 flex items-center gap-1 ${
                  progress.teacherMode
                    ? 'bg-purple-50 text-purple-700 border-purple-300'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title="切换教师演示模式：解锁全部关卡便于测试与教学备课"
              >
                {progress.teacherMode ? <ToggleRight size={16} className="text-purple-600" /> : <ToggleLeft size={16} />}
                演示模式
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:bg-rose-50"
              title="重置学习记录，回到初始新用户状态"
            >
              <RotateCcw size={14} className="mr-1" />
              重置
            </Button>
          </div>
        </div>
      </header>

      {/* Floating Notice / Toast */}
      {lockedNotice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-slate-700 animate-bounce">
          <span>{lockedNotice}</span>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center">
            <ShieldAlert size={36} className="text-amber-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800">确认重置全部学习记录？</h3>
            <p className="text-xs text-slate-500 my-2 leading-relaxed">
              重置后，学习进度将还原为新学员初始状态（仅保留任务0解锁）。已获得的认证记录将被清除。
            </p>
            <div className="flex gap-2 mt-4 justify-center">
              <Button size="sm" variant="outline" onClick={() => setShowResetConfirm(false)}>
                取消
              </Button>
              <Button size="sm" className="bg-rose-600 hover:bg-rose-500 text-white font-bold" onClick={handleConfirmReset}>
                确认重置
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* "Continue Learning" Recommended Task Banner */}
      <section className="w-full max-w-[1480px] bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-white rounded-2xl border-2 border-amber-300 p-5 sm:p-6 mb-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              ⭐ 推荐继续学习进度
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-800">
              {activeLevelMeta.num} · {activeLevelMeta.title} —— {activeLevelMeta.subtitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {activeLevelMeta.description}
            </p>
          </div>
        </div>

        <Button
          size="lg"
          onClick={() => handleCardClick(activeLevelMeta)}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-2.5 shadow-md shadow-amber-600/20 flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <span>
            {progress.levels[activeLevelMeta.id]?.status === 'completed'
              ? '再次复习实训'
              : '继续实训'}
          </span>
          <ChevronRight size={18} />
        </Button>
      </section>

      {/* Full 10-Task Curriculum Grid */}
      <main className="w-full max-w-[1480px]">
        <div className="flex items-center justify-between mb-3.5 px-1">
          <h2 className="text-sm sm:text-base font-bold text-slate-700 flex items-center gap-2">
            <Wrench size={18} className="text-amber-600" />
            <span>全景专业技能成长路径 (任务 0 ~ 任务 9)</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            16:10 宽屏双列布局 · 逐级考核解锁 · 拒绝纸上谈兵
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {COURSE_MAP.map((meta) => {
            const levelProg = progress.levels[meta.id] || { status: 'locked' };
            const unlocked = isLevelUnlocked(meta.id, progress);
            const isCompleted = levelProg.status === 'completed';
            const isPlayable = meta.implemented;

            return (
              <button
                type="button"
                key={meta.id}
                onClick={() => handleCardClick(meta)}
                className={`w-full text-left p-5 sm:p-6 rounded-2xl border-2 transition-all flex flex-col justify-between relative cursor-pointer min-h-[175px] ${
                  isCompleted
                    ? 'bg-emerald-50/40 border-emerald-300/80 shadow-xs hover:shadow-md hover:border-emerald-400'
                    : unlocked
                    ? 'bg-white border-amber-400 shadow-md shadow-amber-500/10 hover:border-amber-500 ring-2 ring-amber-400/20'
                    : 'bg-slate-50/60 border-slate-200 opacity-75 hover:opacity-90'
                }`}
              >
                {/* Card Top Strip */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`w-11 h-11 rounded-xl font-mono text-base font-bold flex items-center justify-center border shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : unlocked
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {meta.num}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {meta.category}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-400">
                          {meta.duration}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-1">
                        {meta.title}
                      </h3>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {isCompleted ? (
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        已认证
                      </span>
                    ) : unlocked ? (
                      <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full border border-amber-300 flex items-center gap-1">
                        <Play size={12} className="fill-amber-800" />
                        可实训
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded-full border border-slate-200 flex items-center gap-1">
                        <Lock size={12} />
                        未解锁
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtitle & Description */}
                <div className="my-2.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-700">
                    {meta.subtitle}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {meta.description}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-xs">
                  <div>
                    {isCompleted ? (
                      <span className="text-[11px] sm:text-xs text-emerald-700 font-medium">
                        认证通过 · 成绩合格 (100分)
                      </span>
                    ) : unlocked ? (
                      <span className="text-[11px] sm:text-xs text-amber-700 font-bold">
                        当前推荐实训任务
                      </span>
                    ) : (
                      <span className="text-[11px] sm:text-xs text-slate-400">
                        {meta.prerequisiteName ? `需先完成：${meta.prerequisiteName}` : '前置考核未完成'}
                      </span>
                    )}
                  </div>

                  <div>
                    {isPlayable ? (
                      <span
                        className={`font-bold flex items-center gap-1 ${
                          isCompleted
                            ? 'text-slate-500 hover:text-slate-800'
                            : 'text-amber-700'
                        }`}
                      >
                        {isCompleted ? '重新实训' : '进入任务'}
                        <ChevronRight size={14} />
                      </span>
                    ) : (
                      <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                        开发制作中
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-[1480px] text-center text-xs text-slate-400 mt-8 pb-4">
        新能源汽车电工电子技术实训系统 · 符合中职汽车专业教学大纲标准
      </footer>

      {/* Login & Registration Dialog */}
      <AuthDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} />
    </div>
  );
}
