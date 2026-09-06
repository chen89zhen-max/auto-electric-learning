import {
  getCourseLevel,
  isLevelPublished,
  normalizeLevelId,
  checkLevelPrerequisites,
} from '@/src/courses/registry';

export interface LevelRouteContext {
  isTeacherOrAdmin?: boolean;
  completedLevelIds?: string[];
}

export type ResolvedLevelRoute =
  | { kind: 'level'; levelId: string }
  | { kind: 'home' }
  | { kind: 'blocked'; levelId: string; missingPrerequisites: string[] };

export function resolveRequestedLevelRoute(
  search: string,
  context?: LevelRouteContext
): ResolvedLevelRoute {
  if (!search) return { kind: 'home' };
  const level = new URLSearchParams(search).get('level');
  if (!level) return { kind: 'home' };

  const normalized = normalizeLevelId(level);
  const courseLevel = getCourseLevel(normalized);

  if (!courseLevel?.implemented || !isLevelPublished(normalized)) {
    return { kind: 'home' };
  }

  // Teacher or Admin mode bypasses prerequisite check for curriculum preparation
  if (context?.isTeacherOrAdmin) {
    return { kind: 'level', levelId: normalized };
  }

  // Check prerequisites if context provides completed level IDs
  if (context?.completedLevelIds !== undefined) {
    const prereqCheck = checkLevelPrerequisites(normalized, context.completedLevelIds);
    if (!prereqCheck.allowed) {
      return {
        kind: 'blocked',
        levelId: normalized,
        missingPrerequisites: prereqCheck.missingPrerequisites,
      };
    }
  }

  return { kind: 'level', levelId: normalized };
}

export function resolveRequestedLevel(
  search: string,
  context?: LevelRouteContext
): string {
  const resolved = resolveRequestedLevelRoute(search, context);
  if (resolved.kind === 'level') return resolved.levelId;
  return 'HOME';
}
