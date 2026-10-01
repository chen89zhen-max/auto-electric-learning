import React from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  RotateCcw,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FullscreenButton } from '@/src/components/FullscreenButton';
import type { UserProfile } from '@/src/stores/authStore';
import styles from './CourseMapLobby.module.css';

interface CourseMapHeaderProps {
  user: UserProfile | null;
  isAdmin: boolean;
  teacherMode: boolean;
  completedTasks: number;
  totalTasks: number;
  progressPercent: number;
  logoutPending: boolean;
  onOpenDashboard: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onToggleTeacherMode: () => void;
  onOpenReset: () => void;
}

export function CourseMapHeader({
  user,
  isAdmin,
  teacherMode,
  completedTasks,
  totalTasks,
  progressPercent,
  logoutPending,
  onOpenDashboard,
  onOpenAuth,
  onLogout,
  onToggleTeacherMode,
  onOpenReset,
}: CourseMapHeaderProps) {
  const getRoleTitle = () => {
    if (isAdmin) return '系统管理员';
    if (user?.role === 'teacher') return '任课教师';
    if (completedTasks === 0) return '见习学员';
    if (completedTasks === 1) return '安全实训学员';
    if (completedTasks === 2) return '回路搭建能手';
    if (completedTasks === 3) return '测量助手';
    if (completedTasks === 4) return '诊断学员';
    return `控制电路学员 · ${completedTasks}级`;
  };

  return (
    <header className={styles.header} suppressHydrationWarning>
      {/* Brand & Main Title */}
      <div className="flex items-center gap-3.5">
        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
          <Zap size={28} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              中职汽车类专业智能实训系统
            </span>
            {teacherMode && (
              <span className="text-sm font-bold bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/60">
                教师演示模式 (仅供课堂展示，不产生学生成绩)
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-100 tracking-tight mt-0.5">
            汽车电工电子闯关实训
          </h1>
        </div>
      </div>

      {/* User Stats & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
        {/* User Badge & Progress */}
        <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 flex items-center gap-3 w-full sm:w-auto">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
              isAdmin
                ? 'bg-gradient-to-br from-purple-600 to-indigo-600'
                : 'bg-gradient-to-br from-amber-500 to-amber-600'
            }`}
          >
            {isAdmin ? <ShieldAlert size={22} /> : <GraduationCap size={22} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm sm:text-base font-bold text-slate-100 truncate">
                {user ? user.realName : '见习学员'}
              </span>
              {user?.className && (
                <span className="text-sm text-slate-300 font-normal">
                  ({user.className})
                </span>
              )}
              <span className="text-sm font-bold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-cyan-300 font-mono">
                {getRoleTitle()}
              </span>
            </div>
            <div className="text-sm text-slate-300 mt-1 flex items-center gap-2">
              <span>
                实训进度: <strong className="text-cyan-300 font-mono">{completedTasks}</strong> / {totalTasks}
              </span>
              <div className="w-20 sm:w-28 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-sm text-emerald-400 font-bold font-mono">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <FullscreenButton />

          {/* Admin / Teacher Dashboard */}
          {(isAdmin || user?.role === 'teacher') && (
            <Button
              size="sm"
              onClick={onOpenDashboard}
              className="text-sm bg-purple-700 hover:bg-purple-600 text-white font-bold flex items-center gap-1.5 shadow-sm min-h-[36px]"
            >
              <LayoutDashboard size={14} />
              {isAdmin ? '系统管理大屏' : '班级教学大屏'}
            </Button>
          )}

          {/* Login / Logout */}
          {user ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onLogout}
              disabled={logoutPending}
              className="text-sm border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 flex items-center gap-1 min-h-[36px]"
              title="退出当前登录账号"
            >
              <LogOut size={14} />
              {logoutPending ? '退出中…' : '退出'}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onOpenAuth}
              className="text-sm bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1 shadow-sm min-h-[36px]"
            >
              <LogIn size={14} />
              账号登录/激活
            </Button>
          )}

          {/* Teacher Demo Mode Toggle */}
          {(isAdmin || user?.role === 'teacher') && (
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleTeacherMode}
              className={`text-sm border-slate-700 flex items-center gap-1 min-h-[36px] ${
                teacherMode
                  ? 'bg-purple-950/80 text-purple-300 border-purple-600'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
              title="切换教师演示模式：解锁关卡结构便于备课，不记录学生成绩"
            >
              {teacherMode ? (
                <ToggleRight size={16} className="text-purple-400" />
              ) : (
                <ToggleLeft size={16} />
              )}
              演示模式
            </Button>
          )}

          {/* Visitor Cache Reset */}
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenReset}
            disabled={!!user}
            className="text-sm border-slate-700 bg-slate-800/80 text-slate-300 hover:text-rose-400 hover:bg-slate-700 min-h-[36px]"
            title={user ? '正式学习记录由教师申请重训，管理员按流程处理' : '清理本机访客缓存'}
          >
            <RotateCcw size={14} className="mr-1" />
            清理缓存
          </Button>
        </div>
      </div>
    </header>
  );
}
