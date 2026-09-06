'use client';

import { useState, useMemo } from 'react';
import { Lock } from 'lucide-react';
import { CourseMapLobby } from '@/src/components/CourseMapLobby';
import { useAuth } from '@/src/stores/authStore';
import { ChangePasswordGate } from '@/src/components/auth/ChangePasswordGate';
import { resolveRequestedLevel } from '@/src/app/levelRoute';
import { useUserProgress } from '@/src/stores/userProgressStore';
import { checkLevelPrerequisites, normalizeLevelId } from '@/src/courses/registry';
import {
  hasLevelLoader,
  LazyLevelContainer,
  LazyRoleWorkspaceContainer,
} from '@/src/app/levelComponents';

export function GameShell() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <main className="min-h-screen flex items-center justify-center">正在核验安全会话…</main>;
  return <SessionGameShell key={`${user?.role ?? 'guest'}:${user?.username ?? ''}`} />;
}

function SessionGameShell() {
  const { user, isLoading } = useAuth();
  const progress = useUserProgress();
  const isTeacherOrAdmin = progress.teacherMode || user?.role === 'admin' || user?.role === 'teacher';

  const completedLevelIds = useMemo(() => {
    return Object.entries(progress.levels)
      .filter(([, v]) => v.status === 'completed')
      .map(([id]) => normalizeLevelId(id));
  }, [progress.levels]);

  // Home is the default view when user opens or refreshes the page!
  const [activeLevel, setActiveLevel] = useState<string>(() =>
    typeof window === 'undefined' ? 'HOME' : resolveRequestedLevel(window.location.search)
  );

  const handleReturnHome = () => {
    setActiveLevel('HOME');
    if (typeof window !== 'undefined') window.history.replaceState(null, '', window.location.pathname);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
        正在核验安全会话…
      </main>
    );
  }

  if (user?.mustChangePassword) {
    return <ChangePasswordGate user={user} />;
  }

  if (user?.role === 'admin') {
    return <LazyRoleWorkspaceContainer workspaceRole="admin" />;
  }

  if (user?.role === 'teacher') {
    return <LazyRoleWorkspaceContainer workspaceRole="teacher" />;
  }

  // Enforce student prerequisites on activeLevel
  if (activeLevel !== 'HOME') {
    const normalized = normalizeLevelId(activeLevel);
    if (!isTeacherOrAdmin) {
      const prereqCheck = checkLevelPrerequisites(normalized, completedLevelIds);
      if (!prereqCheck.allowed) {
        return (
          <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full p-6 bg-slate-900 border-2 border-rose-500/60 rounded-2xl shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3 text-rose-400">
                <Lock size={28} className="shrink-0" />
                <h2 className="text-lg font-bold">关卡未解锁：前置课程尚未完成</h2>
              </div>
              <p className="text-sm text-slate-300">
                当前关卡【<strong className="text-amber-400">{normalized}</strong>】设置了严格的教学先决条件。为保障技能链条完整与实训安全，必须先按序完成以下前置课程：
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-xs font-semibold text-slate-400">未满足的前置课程：</span>
                <ul className="list-disc list-inside text-xs text-rose-300 space-y-1">
                  {prereqCheck.missingPrerequisites.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={handleReturnHome}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl cursor-pointer transition-colors"
              >
                返回课程大厅
              </button>
            </div>
          </main>
        );
      }
    }

    if (hasLevelLoader(activeLevel)) {
      return (
        <LazyLevelContainer
          levelId={activeLevel}
          onReturnLobby={handleReturnHome}
        />
      );
    }
  }

  // Default: Full Interactive Course Map
  return (
    <CourseMapLobby
      onSelectLevel={(levelId) => {
        setActiveLevel(levelId);
        if (typeof window !== 'undefined') {
          window.history.pushState(null, '', `${window.location.pathname}?level=${encodeURIComponent(levelId)}`);
        }
      }}
    />
  );
}
