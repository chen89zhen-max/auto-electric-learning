import {
  CANONICAL_COURSE_REGISTRY,
  CHAPTER_LIST,
  getCourseLevel,
  normalizeLevelId,
  toLegacyLevelId,
  type ChapterId,
} from '@/src/courses/registry';
import { getLevelProgress, isLevelUnlocked } from '@/src/stores/userProgressStore';
import type { UserProgressData } from '@/src/types/progress';

export type CourseMapItemState = 'completed' | 'current' | 'available' | 'locked' | 'construction';

export interface CourseMapLevelModel {
  id: string;
  chapterId: ChapterId;
  num: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  duration: string;
  isElective: boolean;
  state: CourseMapItemState;
  prerequisiteName: string | null;
  missingPrerequisiteNames: string[];
  recommendedPriorLevelNames: string[];
  recentScore?: number;
  recentDurationMs?: number;
  recentCompletedAt?: string;
  attemptCount: number;
}

export interface CourseMapChapterModel {
  id: ChapterId;
  letter: 'O' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  num: string;
  title: string;
  description: string;
  state: CourseMapItemState;
  completedCount: number;
  totalCount: number;
  levels: CourseMapLevelModel[];
}

export interface CourseMapViewModel {
  chapters: CourseMapChapterModel[];
  activeChapterId: ChapterId;
  activeLevel: CourseMapLevelModel;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
}

const CHAPTER_LETTER_MAP: Record<ChapterId, 'O' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'> = {
  chapter_o: 'O',
  chapter_a: 'A',
  chapter_b: 'B',
  chapter_c: 'C',
  chapter_d: 'D',
  chapter_e: 'E',
  chapter_f: 'F',
};

export function buildCourseMapViewModel(progress: UserProgressData): CourseMapViewModel {
  const validCanonicalIds = new Set(CANONICAL_COURSE_REGISTRY.map((level) => level.canonicalId));

  // Canonical completed tasks set (deduplicating canonical and legacy keys, discarding unknown IDs)
  const completedCanonicalIds = new Set<string>();
  for (const [key, levelProg] of Object.entries(progress.levels)) {
    if (levelProg?.status === 'completed') {
      const canonicalId = normalizeLevelId(key);
      if (validCanonicalIds.has(canonicalId)) {
        completedCanonicalIds.add(canonicalId);
      }
    }
  }

  // Active level calculation
  const rawActiveId = progress.currentActiveLevel || 'O00';
  const normalizedActiveId = normalizeLevelId(rawActiveId);
  const activeLevelDef =
    CANONICAL_COURSE_REGISTRY.find(
      (m) => m.canonicalId === normalizedActiveId || toLegacyLevelId(m.canonicalId) === rawActiveId
    ) || CANONICAL_COURSE_REGISTRY[0];

  const activeCanonicalId = activeLevelDef.canonicalId;

  // Build level models
  const levelModelsById = new Map<string, CourseMapLevelModel>();

  for (const levelDef of CANONICAL_COURSE_REGISTRY) {
    const canonicalId = levelDef.canonicalId;
    const isCompleted = completedCanonicalIds.has(canonicalId);
    const levelProg = getLevelProgress(canonicalId, progress);
    const unlocked = isLevelUnlocked(canonicalId, progress);
    const isCurrent = canonicalId === activeCanonicalId;

    // State priority: construction -> completed -> current (if unlocked) -> available -> locked
    let state: CourseMapItemState;
    if (!levelDef.implemented || levelDef.publicationStatus === 'UNDER_CONSTRUCTION') {
      state = 'construction';
    } else if (isCompleted) {
      state = 'completed';
    } else if (isCurrent && unlocked) {
      state = 'current';
    } else if (unlocked) {
      state = 'available';
    } else {
      state = 'locked';
    }

    // Missing prerequisites calculation across all prerequisiteLevelIds
    const missingPrerequisiteNames: string[] = [];
    for (const prereqId of levelDef.prerequisiteLevelIds) {
      const prereqCanonical = normalizeLevelId(prereqId);
      if (!completedCanonicalIds.has(prereqCanonical)) {
        const prereqMeta = getCourseLevel(prereqCanonical);
        missingPrerequisiteNames.push(prereqMeta ? `${prereqMeta.num} ${prereqMeta.title}` : prereqCanonical);
      }
    }

    const recommendedPriorLevelNames = (levelDef.recommendedPriorLevelIds ?? [])
      .map(normalizeLevelId)
      .filter((recommendedId) => !completedCanonicalIds.has(recommendedId))
      .map((recommendedId) => {
        const recommendedMeta = getCourseLevel(recommendedId);
        return recommendedMeta ? `${recommendedMeta.num} ${recommendedMeta.title}` : recommendedId;
      });

    const firstPrereqId = levelDef.prerequisiteLevelIds[0];
    const firstPrereqMeta = firstPrereqId ? getCourseLevel(firstPrereqId) : null;
    const prerequisiteName = firstPrereqMeta ? firstPrereqMeta.title : firstPrereqId || null;

    const attemptCount = levelProg.attemptCount ?? (isCompleted ? 1 : 0);

    let recentScore: number | undefined = levelProg.recentRecord?.score;
    if (recentScore === undefined && levelProg.score !== undefined) {
      recentScore = levelProg.score;
    }

    const recentDurationMs: number | undefined = levelProg.recentRecord?.durationMs;

    let recentCompletedAt: string | undefined = levelProg.recentRecord?.completedAt;
    if (!recentCompletedAt && levelProg.completedAt) {
      recentCompletedAt = levelProg.completedAt;
    }

    const levelModel: CourseMapLevelModel = {
      id: canonicalId,
      chapterId: levelDef.chapterId,
      num: levelDef.num,
      title: levelDef.title,
      subtitle: levelDef.subtitle,
      description: levelDef.description,
      category: levelDef.category,
      duration: levelDef.duration,
      isElective: levelDef.curriculumRequirement === 'elective',
      state,
      prerequisiteName,
      missingPrerequisiteNames,
      recommendedPriorLevelNames,
      recentScore,
      recentDurationMs,
      recentCompletedAt,
      attemptCount,
    };

    levelModelsById.set(canonicalId, levelModel);
  }

  // Build chapter models
  const chapters: CourseMapChapterModel[] = CHAPTER_LIST.map((chapterDef) => {
    const chapterLevels = CANONICAL_COURSE_REGISTRY.filter((l) => l.chapterId === chapterDef.id).map(
      (l) => levelModelsById.get(l.canonicalId)!
    );

    const totalCount = chapterLevels.length;
    const completedCount = chapterLevels.filter((l) => l.state === 'completed').length;
    const playableLevels = chapterLevels.filter((l) => l.state !== 'construction');

    let chapterState: CourseMapItemState;
    if (chapterLevels.every((l) => l.state === 'construction')) {
      chapterState = 'construction';
    } else if (playableLevels.length > 0 && playableLevels.every((l) => l.state === 'completed')) {
      chapterState = 'completed';
    } else if (chapterLevels.some((l) => l.id === activeCanonicalId)) {
      chapterState = 'current';
    } else if (chapterLevels.some((l) => l.state === 'available' || l.state === 'completed')) {
      chapterState = 'available';
    } else {
      chapterState = 'locked';
    }

    return {
      id: chapterDef.id,
      letter: CHAPTER_LETTER_MAP[chapterDef.id],
      num: chapterDef.num,
      title: chapterDef.title,
      description: chapterDef.description,
      state: chapterState,
      completedCount,
      totalCount,
      levels: chapterLevels,
    };
  });

  const activeLevel = levelModelsById.get(activeCanonicalId) || levelModelsById.get('O00')!;
  const activeChapterId = activeLevel.chapterId;
  const totalTasks = CANONICAL_COURSE_REGISTRY.length;
  const completedTasks = completedCanonicalIds.size;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    chapters,
    activeChapterId,
    activeLevel,
    totalTasks,
    completedTasks,
    progressPercent,
  };
}
