'use client';

import React, { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Loader2 } from 'lucide-react';
import { normalizeLevelId } from '@/src/courses/registry';

export interface LevelComponentProps {
  onReturnLobby: () => void;
}

export type LevelLoader = () => Promise<{ default: ComponentType<LevelComponentProps> }>;

export const CANONICAL_27_LEVEL_IDS = [
  'O00', 'O01',
  'A01', 'A02', 'A03', 'A04',
  'B01', 'B02', 'B03', 'B04', 'B05', 'B06',
  'C01', 'C02', 'C03',
  'D01', 'D02', 'D03', 'D04', 'D05',
  'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07',
] as const;

export type CanonicalLevelId = typeof CANONICAL_27_LEVEL_IDS[number];

const LEVEL_ALIAS_MAP: Record<string, string> = {
  // Level 00
  '00': 'O00',
  '0': 'O00',
  'LEVEL00': 'O00',
  'LEVEL_00': 'O00',
  'O00': 'O00',

  // Level 01
  '01': 'O01',
  '1': 'O01',
  'LEVEL01': 'O01',
  'LEVEL_01': 'O01',
  'O01': 'O01',

  // Level 02 / A01
  '02': 'A01',
  '2': 'A01',
  'LEVEL02': 'A01',
  'LEVEL_02': 'A01',
  'A01': 'A01',

  // A02
  'A02': 'A02',

  // Level 03 / A03
  '03': 'A03',
  '3': 'A03',
  'LEVEL03': 'A03',
  'LEVEL_03': 'A03',
  'A03': 'A03',

  // Level 04 / A04
  '04': 'A04',
  '4': 'A04',
  'LEVEL04': 'A04',
  'LEVEL_04': 'A04',
  'A04': 'A04',

  // B01 - B06
  'B01': 'B01',
  'B02': 'B02',
  'B03': 'B03',
  'B04': 'B04',
  'B05': 'B05',
  'B06': 'B06',

  // C01 - C03
  'C01': 'C01',
  '08': 'C02',
  '8': 'C02',
  'LEVEL08': 'C02',
  'LEVEL_08': 'C02',
  'C02': 'C02',
  '09': 'C03',
  '9': 'C03',
  'LEVEL09': 'C03',
  'LEVEL_09': 'C03',
  'C03': 'C03',

  // D01 - D05
  '05': 'D01',
  '5': 'D01',
  'LEVEL05': 'D01',
  'LEVEL_05': 'D01',
  'D01': 'D01',
  'D02': 'D02',
  'D03': 'D03',
  'D04': 'D04',
  'D05': 'D05',

  // E01 - E07
  'E01': 'E01',
  'E02': 'E02',
  'E03': 'E03',
  '07': 'E04',
  '7': 'E04',
  'LEVEL07': 'E04',
  'LEVEL_07': 'E04',
  'E04': 'E04',
  '06': 'E05',
  '6': 'E05',
  'LEVEL06': 'E05',
  'LEVEL_06': 'E05',
  'E05': 'E05',
  'E06': 'E06',
  'E07': 'E07',
};

export function resolveLevelId(input: string): string {
  if (!input) return '';
  const upper = input.trim().toUpperCase();
  if (upper in LEVEL_ALIAS_MAP) {
    return LEVEL_ALIAS_MAP[upper];
  }
  const normalized = normalizeLevelId(upper);
  if (normalized in LEVEL_ALIAS_MAP) {
    return LEVEL_ALIAS_MAP[normalized];
  }
  return normalized;
}

export const LEVEL_LOADERS: Record<CanonicalLevelId, LevelLoader> = {
  O00: () => import('@/src/levels/level00/Level00Experience').then((m) => ({ default: m.Level00Experience })),
  O01: () => import('@/src/levels/level01/Level01Experience').then((m) => ({ default: m.Level01Experience })),
  A01: () => import('@/src/levels/level02/Level02Experience').then((m) => ({ default: m.Level02Experience })),
  A02: () => import('@/src/levels/a02/A02Experience').then((m) => ({ default: m.A02Experience })),
  A03: () => import('@/src/levels/a03/A03Experience').then((m) => ({ default: m.A03Experience })),
  A04: () => import('@/src/levels/a04/A04Experience').then((m) => ({ default: m.A04Experience })),
  B01: () => import('@/src/levels/b01/B01Experience').then((m) => ({ default: m.B01Experience })),
  B02: () => import('@/src/levels/b02/B02Experience').then((m) => ({ default: m.B02Experience })),
  B03: () => import('@/src/levels/b03/B03Experience').then((m) => ({ default: m.B03Experience })),
  B04: () => import('@/src/levels/b04/B04Experience').then((m) => ({ default: m.B04Experience })),
  B05: () => import('@/src/levels/b05/B05Experience').then((m) => ({ default: m.B05Experience })),
  B06: () => import('@/src/levels/b06/B06Experience').then((m) => ({ default: m.B06Experience })),
  C01: () => import('@/src/levels/c01/C01Experience').then((m) => ({ default: m.C01Experience })),
  C02: () => import('@/src/levels/c02/C02Experience').then((m) => ({ default: m.C02Experience })),
  C03: () => import('@/src/levels/c03/C03Experience').then((m) => ({ default: m.C03Experience })),
  D01: () => import('@/src/levels/d01/D01Experience').then((m) => ({ default: m.D01Experience })),
  D02: () => import('@/src/levels/d02/D02Experience').then((m) => ({ default: m.D02Experience })),
  D03: () => import('@/src/levels/d03/D03Experience').then((m) => ({ default: m.D03Experience })),
  D04: () => import('@/src/levels/d04/D04Experience').then((m) => ({ default: m.D04Experience })),
  D05: () => import('@/src/levels/d05/D05Experience').then((m) => ({ default: m.D05Experience })),
  E01: () => import('@/src/levels/e01/E01Experience').then((m) => ({ default: m.E01Experience })),
  E02: () => import('@/src/levels/e02/E02Experience').then((m) => ({ default: m.E02Experience })),
  E03: () => import('@/src/levels/e03/E03Experience').then((m) => ({ default: m.E03Experience })),
  E04: () => import('@/src/levels/e04/E04Experience').then((m) => ({ default: m.E04Experience })),
  E05: () => import('@/src/levels/e05/E05Experience').then((m) => ({ default: m.E05Experience })),
  E06: () => import('@/src/levels/e06/E06Experience').then((m) => ({ default: m.E06Experience })),
  E07: () => import('@/src/levels/e07/E07Experience').then((m) => ({ default: m.E07Experience })),
};

export const LEVEL_COMPONENTS: Record<CanonicalLevelId, LazyExoticComponent<ComponentType<LevelComponentProps>>> = {
  O00: lazy(LEVEL_LOADERS.O00),
  O01: lazy(LEVEL_LOADERS.O01),
  A01: lazy(LEVEL_LOADERS.A01),
  A02: lazy(LEVEL_LOADERS.A02),
  A03: lazy(LEVEL_LOADERS.A03),
  A04: lazy(LEVEL_LOADERS.A04),
  B01: lazy(LEVEL_LOADERS.B01),
  B02: lazy(LEVEL_LOADERS.B02),
  B03: lazy(LEVEL_LOADERS.B03),
  B04: lazy(LEVEL_LOADERS.B04),
  B05: lazy(LEVEL_LOADERS.B05),
  B06: lazy(LEVEL_LOADERS.B06),
  C01: lazy(LEVEL_LOADERS.C01),
  C02: lazy(LEVEL_LOADERS.C02),
  C03: lazy(LEVEL_LOADERS.C03),
  D01: lazy(LEVEL_LOADERS.D01),
  D02: lazy(LEVEL_LOADERS.D02),
  D03: lazy(LEVEL_LOADERS.D03),
  D04: lazy(LEVEL_LOADERS.D04),
  D05: lazy(LEVEL_LOADERS.D05),
  E01: lazy(LEVEL_LOADERS.E01),
  E02: lazy(LEVEL_LOADERS.E02),
  E03: lazy(LEVEL_LOADERS.E03),
  E04: lazy(LEVEL_LOADERS.E04),
  E05: lazy(LEVEL_LOADERS.E05),
  E06: lazy(LEVEL_LOADERS.E06),
  E07: lazy(LEVEL_LOADERS.E07),
};

export function hasLevelLoader(levelId: string): boolean {
  const canonical = resolveLevelId(levelId) as CanonicalLevelId;
  return canonical in LEVEL_LOADERS;
}

export function getLevelLoader(levelId: string): LevelLoader | undefined {
  const canonical = resolveLevelId(levelId) as CanonicalLevelId;
  return LEVEL_LOADERS[canonical];
}

export function getLevelComponent(levelId: string): LazyExoticComponent<ComponentType<LevelComponentProps>> | undefined {
  const canonical = resolveLevelId(levelId) as CanonicalLevelId;
  return LEVEL_COMPONENTS[canonical];
}

export type RoleWorkspaceLoader = () => Promise<{ default: ComponentType<Record<string, unknown>> }>;

export const ROLE_WORKSPACE_LOADERS: Record<'teacher' | 'admin', RoleWorkspaceLoader> = {
  teacher: () => import('@/src/components/teacher/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard as unknown as ComponentType<Record<string, unknown>> })),
  admin: () => import('@/src/components/admin/SystemAdminConsole').then((m) => ({ default: m.SystemAdminConsole as unknown as ComponentType<Record<string, unknown>> })),
};

export function getRoleWorkspaceLoader(role: 'teacher' | 'admin'): RoleWorkspaceLoader | undefined {
  return ROLE_WORKSPACE_LOADERS[role];
}

export const LazyTeacherDashboard: LazyExoticComponent<ComponentType<Record<string, unknown>>> = lazy(ROLE_WORKSPACE_LOADERS.teacher);
export const LazyAdminConsole: LazyExoticComponent<ComponentType<Record<string, unknown>>> = lazy(ROLE_WORKSPACE_LOADERS.admin);

export function getRoleWorkspaceComponent(role: 'teacher' | 'admin'): LazyExoticComponent<ComponentType<Record<string, unknown>>> {
  return role === 'admin' ? LazyAdminConsole : LazyTeacherDashboard;
}

export function LevelLoadingSkeleton({ levelId }: { levelId?: string }) {
  return (
    <output
      aria-live="polite"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300 block w-full"
    >
      <div className="w-full max-w-md p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-center">
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
          <Loader2 size={32} className="animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">正在装载实训工位资源…</h3>
          <p className="text-xs text-slate-400 mt-1">
            {levelId ? `关卡代码：${levelId} · 初始化仿真引擎与测量工具` : '初始化电路与测量环境…'}
          </p>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-amber-500 h-full w-2/3 rounded-full animate-pulse" />
        </div>
      </div>
    </output>
  );
}

export function LazyLevelContainer({
  levelId,
  onReturnLobby,
}: {
  levelId: string;
  onReturnLobby: () => void;
}) {
  const canonical = resolveLevelId(levelId) as CanonicalLevelId;
  const Component = LEVEL_COMPONENTS[canonical];
  if (!Component) return null;

  return (
    <Suspense fallback={<LevelLoadingSkeleton levelId={canonical} />}>
      <Component onReturnLobby={onReturnLobby} />
    </Suspense>
  );
}

export function LazyRoleWorkspaceContainer({ workspaceRole }: { workspaceRole: 'teacher' | 'admin' }) {
  const Component = workspaceRole === 'admin' ? LazyAdminConsole : LazyTeacherDashboard;
  return (
    <Suspense fallback={<LevelLoadingSkeleton />}>
      <Component />
    </Suspense>
  );
}
