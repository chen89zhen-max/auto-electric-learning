'use client';
import { CurriculumRoutes } from './course-map/CurriculumRoutes';

import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CANONICAL_COURSE_MAP,
  type CanonicalLevelMeta,
  getCourseLevel,
  isLevelUnlocked,
  resetUserProgress,
  toggleTeacherMode,
  useUserProgress,
} from '@/src/stores/userProgressStore';
import { useAuth, logoutUser } from '@/src/stores/authStore';
import { AuthDialog } from '@/src/components/auth/AuthDialog';
import { AdminDashboard } from '@/src/components/admin/AdminDashboard';
import type { ChapterId } from '@/src/courses/registry';
import { buildCourseMapViewModel, type CourseMapLevelModel } from './course-map/courseMapModel';
import { CourseMapHeader } from './course-map/CourseMapHeader';
import { VehicleElectricalMap } from './course-map/VehicleElectricalMap';
import { FloatingMissionHud } from './course-map/FloatingMissionHud';
import { CourseMapLegend } from './course-map/CourseMapLegend';
import { ChapterTaskPanel } from './course-map/ChapterTaskPanel';
import styles from './course-map/CourseMapLobby.module.css';

// 课程实训任务状态基线：已完成、当前、可学习、未解锁、建设中
export function getGrowthRoleTitle(
  completedTasks: number,
  isAdmin?: boolean,
  isTeacher?: boolean
): string {
  if (isAdmin) return '系统管理员';
  if (isTeacher) return '任课教师';
  if (completedTasks === 0) return '见习学员';
  if (completedTasks === 1) return '安全实训学员';
  if (completedTasks === 2) return '回路搭建能手';
  if (completedTasks === 3) return '测量助手';
  if (completedTasks === 4) return '诊断学员';
  return `控制电路学员 · ${completedTasks}级`;
}

export interface CourseMapLobbyProps {
  onSelectLevel: (levelId: string, mapActiveLevelId: string) => void;
  driveFromLevelId?: string | null;
}

export function CourseMapLobby({ onSelectLevel, driveFromLevelId }: CourseMapLobbyProps) {
  const progress = useUserProgress();
  const { user, isAdmin } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  // Build clean reactive view model from progress
  const model = buildCourseMapViewModel(progress);
  const [selectedChapterId, setSelectedChapterId] = useState<ChapterId>(model.activeChapterId);
  const [previewChapterId, setPreviewChapterId] = useState<ChapterId | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [focusedLevelId, setFocusedLevelId] = useState<string | null>(null);
  const displayedLevel = model.chapters.flatMap(chapter => chapter.levels).find(level => level.id === focusedLevelId) ?? model.activeLevel;
  const isTaskPreview = displayedLevel.id !== model.activeLevel.id;

  // Admin / Teacher Dashboard view
  if (showAdminDashboard && (isAdmin || user?.role === 'teacher')) {
    return <AdminDashboard onReturnLobby={() => setShowAdminDashboard(false)} />;
  }

  const handleCardClick = (meta: CanonicalLevelMeta) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    const unlocked = isLevelUnlocked(meta.id, progress);
    if (!unlocked) {
      setLockedNotice(`🔒 ${meta.title} 尚未解锁！请先完成：${meta.prerequisiteName || '前置关卡'}`);
      setTimeout(() => setLockedNotice(null), 3000);
      return;
    }
    if (!meta.implemented) {
      const canonical = getCourseLevel(meta.id);
      const textbookInfo = canonical?.textbookTask ? `（对应${canonical.textbookTask}）` : '';
      setLockedNotice(`🛠️ ${meta.title}${textbookInfo} 正在依据教材大纲与仿真模型规范开发中，尚未开放实训。`);
      setTimeout(() => setLockedNotice(null), 3500);
      return;
    }
    onSelectLevel(meta.id, model.activeLevel.id);
  };

  const handleLevelAction = (level: CourseMapLevelModel) => {
    const meta = CANONICAL_COURSE_MAP.find((item) => item.id === level.id);
    if (!meta) {
      setLockedNotice('⚠ 内部数据错误：未找到对应任务元数据');
      setTimeout(() => setLockedNotice(null), 3000);
      return;
    }
    handleCardClick(meta);
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
    <div className={styles.lobbyContainer} suppressHydrationWarning>
      {/* Top Banner & User Profile Header */}
      <CourseMapHeader
        user={user}
        isAdmin={isAdmin}
        teacherMode={progress.teacherMode}
        completedTasks={model.completedTasks}
        totalTasks={model.totalTasks}
        progressPercent={model.progressPercent}
        logoutPending={logoutPending}
        onOpenDashboard={() => setShowAdminDashboard(true)}
        onOpenAuth={() => setShowAuthDialog(true)}
        onLogout={() => void handleLogout()}
        onToggleTeacherMode={handleToggleTeacher}
        onOpenReset={() => setShowResetConfirm(true)}
      />

      {/* Floating Notice / Toast */}
      {lockedNotice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-slate-700 animate-bounce">
          <span>{lockedNotice}</span>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-700 text-center">
            <ShieldAlert size={36} className="text-amber-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-100">确认重置全部学习记录？</h3>
            <p className="text-xs text-slate-400 my-2 leading-relaxed">
              重置后，学习进度将还原为新学员初始状态（仅保留任务0解锁）。已记录的学习进度与成长称号将被重置。
            </p>
            <div className="flex gap-2 mt-4 justify-center">
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => setShowResetConfirm(false)}
              >
                取消
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                onClick={handleConfirmReset}
              >
                确认重置
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Stage - Full Width Immersive Theater Mode */}
      <CurriculumRoutes levels={model.chapters.flatMap(chapter => chapter.levels)} onOpenLevel={handleLevelAction} />
      <main className={styles.main}>
        <div className={styles.heroGrid}>
          <VehicleElectricalMap
            chapters={model.chapters}
            selectedChapterId={previewChapterId ?? selectedChapterId}
            activeLevelId={model.activeLevel.id}
            driveFromLevelId={driveFromLevelId}
            focusedLevelId={displayedLevel.id}
            onSelectLevel={(lvl) => setFocusedLevelId(lvl.id)}
            onSelectChapter={(id) => {
              setSelectedChapterId(id);
              setShowAllTasks(false);
              requestAnimationFrame(() => {
                const heading = document.getElementById('chapter-task-panel-heading');
                if (heading) {
                  heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  heading.focus();
                }
              });
            }}
            onPreviewChapter={setPreviewChapterId}
          />
          <FloatingMissionHud
            key={displayedLevel.id}
            level={displayedLevel}
            onOpen={handleLevelAction}
            isPreview={isTaskPreview}
            onReturnCurrent={() => setFocusedLevelId(null)}
          />
        </div>

        <CourseMapLegend />

        <ChapterTaskPanel
          chapters={model.chapters}
          selectedChapterId={previewChapterId ?? selectedChapterId}
          showAll={showAllTasks}
          onSelectChapter={setSelectedChapterId}
          onToggleAll={() => setShowAllTasks((value) => !value)}
          onOpenLevel={handleLevelAction}
        />
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-slate-500 mt-8 pb-4">
        中职汽车电工电子技术实训系统 · 课堂互动与技能训练平台
      </footer>

      {/* Login & Registration Dialog */}
      <AuthDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} />
    </div>
  );
}
