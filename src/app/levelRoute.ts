import { getCourseLevel, isLevelPublished, normalizeLevelId } from '@/src/courses/registry';

export function resolveRequestedLevel(search: string): string {
  const level = new URLSearchParams(search).get('level');
  if (!level) return 'HOME';
  const normalized = normalizeLevelId(level);
  return getCourseLevel(normalized)?.implemented && isLevelPublished(normalized) ? normalized : 'HOME';
}
