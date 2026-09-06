'use client';

import { useEffect, useState } from 'react';
import {
  createBaseUserProgress,
  type LevelId,
  type LevelProgress,
  type UserProgressData,
  type AttemptSummaryRecord,
} from '@/src/types/progress';
import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import {
  CANONICAL_COURSE_REGISTRY,
  getCourseLevel,
  normalizeLevelId,
  toLegacyLevelId,
  isLevelPublished,
  checkLevelPrerequisites,
  getLevelsByChapter,
  CHAPTER_LIST,
  type CourseLevelDefinition,
  type ChapterDefinition,
} from '@/src/courses/registry';

export type { LevelId, LevelProgress, UserProgressData, CourseLevelDefinition, ChapterDefinition };
export {
  createBaseUserProgress,
  CANONICAL_COURSE_REGISTRY,
  getCourseLevel,
  normalizeLevelId,
  toLegacyLevelId,
  isLevelPublished,
  checkLevelPrerequisites,
  getLevelsByChapter,
  CHAPTER_LIST,
};

export interface LevelMeta {
  id: LevelId;
  num: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  duration: string;
  prerequisiteId: LevelId | null;
  prerequisiteName: string | null;
  implemented: boolean;
}

export interface CanonicalLevelMeta extends Omit<LevelMeta, 'id' | 'prerequisiteId'> {
  id: string;
  prerequisiteId: string | null;
}

export const CANONICAL_COURSE_MAP: CanonicalLevelMeta[] = CANONICAL_COURSE_REGISTRY.map((level) => ({
  id: level.canonicalId,
  num: level.num,
  title: level.title,
  subtitle: level.subtitle,
  description: level.description,
  category: level.category,
  duration: level.duration,
  prerequisiteId: level.prerequisiteLevelIds[0] ?? null,
  prerequisiteName: level.prerequisiteLevelIds[0] ? getCourseLevel(level.prerequisiteLevelIds[0])?.title ?? level.prerequisiteLevelIds[0] : null,
  implemented: level.implemented,
}));

export const COURSE_MAP: LevelMeta[] = [
  {
    id: 'LEVEL_00',
    num: '00',
    title: '维修车间第一天',
    subtitle: '车间准入与安全规范',
    description: '见习技师入职安全准入教育、工位操作规范与工单签署流程。',
    category: '基础准入',
    duration: '1 课时',
    prerequisiteId: null,
    prerequisiteName: null,
    implemented: true,
  },
  {
    id: 'LEVEL_01',
    num: '01',
    title: '实训车间突发事故',
    subtitle: '安全用电与应急急救',
    description: '识别触电隐患、电气火灾应急处置、断电隔离规范与心肺复苏模拟。',
    category: '安全作业',
    duration: '2 课时',
    prerequisiteId: 'LEVEL_00',
    prerequisiteName: '任务0 维修车间第一天',
    implemented: true,
  },
  {
    id: 'LEVEL_02',
    num: '02',
    title: '让第一盏灯亮起来',
    subtitle: '电路的认知与车身搭铁',
    description: '认识电源、负载、开关与熔断器，掌握双线闭合回路与汽车单线车身搭铁。',
    category: '基本回路',
    duration: '2 课时',
    prerequisiteId: 'LEVEL_01',
    prerequisiteName: '任务1 安全用电',
    implemented: true,
  },
  {
    id: 'LEVEL_03',
    num: '03',
    title: '会变魔术的电阻',
    subtitle: '调光电路与传感器原理',
    description: '探究汽车仪表调光电位器、热敏/光敏可变电阻及传感器信号分压。',
    category: '元器件与传感器',
    duration: '2 课时',
    prerequisiteId: 'LEVEL_02',
    prerequisiteName: '任务2 电路的认知',
    implemented: false,
  },
  {
    id: 'LEVEL_04',
    num: '04',
    title: '万用表的秘密',
    subtitle: '电压电流测量与欧姆定律',
    description: '规范使用数字万用表测量电压降、支路电流与回路电阻，验证欧姆定律。',
    category: '测量仪表',
    duration: '2 课时',
    prerequisiteId: 'LEVEL_03',
    prerequisiteName: '任务3 会变魔术的电阻',
    implemented: false,
  },
  {
    id: 'LEVEL_05',
    num: '05',
    title: '看不见的分身术',
    subtitle: '汽车继电器与电磁控制',
    description: '掌握汽车四脚/五脚继电器引脚定义，小电流弱电控制大电流强电回路。',
    category: '控制与配电',
    duration: '2 课时',
    prerequisiteId: 'LEVEL_04',
    prerequisiteName: '任务4 万用表的秘密',
    implemented: false,
  },
  {
    id: 'LEVEL_06',
    num: '06',
    title: '智能光影守护者',
    subtitle: '光敏自动大灯控制系统',
    description: '搭建车规级光照传感器与三极管开关驱动的自动前照灯模拟系统。',
    category: '控制与配电',
    duration: '2 课时',
    prerequisiteId: 'LEVEL_05',
    prerequisiteName: '任务5 看不见的分身术',
    implemented: false,
  },
  {
    id: 'LEVEL_07',
    num: '07',
    title: '电机驱动与逆变初探',
    subtitle: '半导体元件与PWM调速',
    description: '二极管单向导电保护、MOSFET 开关特性与散热风扇 PWM 脉宽调制调速。',
    category: '系统分析',
    duration: '2 课时',
    prerequisiteId: 'LEVEL_06',
    prerequisiteName: '任务6 智能光影守护者',
    implemented: false,
  },
  {
    id: 'LEVEL_08',
    num: '08',
    title: '车间故障探秘',
    subtitle: '电路短路、断路综合排查',
    description: '利用试灯与万用表电压降法排查虚接、搭铁不良、熔断器熔断故障点。',
    category: '综合诊断',
    duration: '3 课时',
    prerequisiteId: 'LEVEL_07',
    prerequisiteName: '任务7 电机驱动与逆变初探',
    implemented: false,
  },
  {
    id: 'LEVEL_09',
    num: '09',
    title: '整车灯光系统总联调',
    subtitle: '远近光/转向灯故障交付',
    description: '同一辆车整车灯光系统总成调试，完成终极工单与毕业技师能力答辩。',
    category: '综合诊断',
    duration: '3 课时',
    prerequisiteId: 'LEVEL_08',
    prerequisiteName: '任务8 车间故障探秘',
    implemented: false,
  },
];

const STORAGE_KEY = 'NEV_ELECTRICAL_GAME_USER_PROGRESS_V1';
const CHANGE_EVENT = 'NEV_USER_PROGRESS_CHANGED';

export function createDefaultUserProgress(): UserProgressData {
  let initialName = '见习学员';
  if (typeof localStorage !== 'undefined') {
    try {
      const authRaw = localStorage.getItem('NEV_AUTH_CURRENT_USER_V1');
      if (authRaw) {
        const u = JSON.parse(authRaw);
        if (u && u.realName) initialName = u.realName;
      }
    } catch {}
  }

  return {
    version: 1,
    traineeName: initialName,
    currentActiveLevel: 'LEVEL_00',
    teacherMode: false,
    lastUpdated: Date.now(),
    levels: {
      LEVEL_00: { status: 'unlocked' }, // Only Level 0 is unlocked initially for new users!
      LEVEL_01: { status: 'locked' },
      LEVEL_02: { status: 'locked' },
      LEVEL_03: { status: 'locked' },
      LEVEL_04: { status: 'locked' },
      LEVEL_05: { status: 'locked' },
      LEVEL_06: { status: 'locked' },
      LEVEL_07: { status: 'locked' },
      LEVEL_08: { status: 'locked' },
      LEVEL_09: { status: 'locked' },
    },
  };
}

let cachedProgress: UserProgressData | null = null;
let identityRevision = 0;
let progressOwner = '';
const pendingCompletions = new Map<string, { body: string; promise?: Promise<UserProgressData> }>();

export function resetProgressIdentity(name = '见习学员', username = ''): void {
  identityRevision += 1;
  progressOwner = username;
  pendingCompletions.clear();
  saveUserProgress(createBaseUserProgress(name), { sync: false });
}

export function getUserProgress(): UserProgressData {
  if (cachedProgress) {
    return cachedProgress;
  }

  if (typeof localStorage === 'undefined') {
    const defaultState = createDefaultUserProgress();
    cachedProgress = defaultState;
    return defaultState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaultState = createDefaultUserProgress();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
      cachedProgress = defaultState;
      return defaultState;
    }
    const parsed = JSON.parse(raw) as UserProgressData;
    const defaults = createDefaultUserProgress();
    const merged: UserProgressData = {
      ...defaults,
      ...parsed,
      levels: {
        ...defaults.levels,
        ...parsed.levels,
      },
    };
    cachedProgress = merged;
    return merged;
  } catch (err) {
    console.error('Failed to read user progress from localStorage:', err);
    return createDefaultUserProgress();
  }
}

export function saveUserProgress(
  data: UserProgressData,
  _options: { sync?: boolean } = {}
): void {
  cachedProgress = { ...data, lastUpdated: Date.now() };
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedProgress));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }

  } catch (err) {
    console.error('Failed to save user progress:', err);
  }
}

export async function submitLevelCompletion(
  levelId: string,
  score = 100,
  evidence: Record<string, unknown> = {},
  options: {
    allowReplay?: boolean;
    mode?: 'guided' | 'independent' | 'transfer';
    metrics?: object;
    assessment?: LevelAssessmentResult;
  } = {}
): Promise<UserProgressData> {
  const current = getUserProgress();
  // If in teacher demo mode, do not write to student records
  if (current.teacherMode) return current;

  // If already completed and allowReplay is not requested, return current state without network call
  if (current.levels[levelId]?.status === 'completed' && !options.allowReplay && !evidence?.isReplay) {
    return current;
  }

  const revision = identityRevision;
  let pending = pendingCompletions.get(levelId);
  if (!pending) {
    const eventId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID() : `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    pending = { body: JSON.stringify({
      eventId,
      levelId,
      eventType: 'LEVEL_COMPLETE',
      payload: {
        score,
        evidence,
        ...(options.mode ? { mode: options.mode } : {}),
        ...(options.metrics ? { metrics: options.metrics } : {}),
        ...(options.assessment ? { assessment: options.assessment } : {}),
      },
      occurredAt: Date.now(),
    }) };
    pendingCompletions.set(levelId, pending);
  }
  if (pending.promise) return pending.promise;
  const submission = pending;
  submission.promise = (async () => {
    const response = await fetch('/api/learning/events', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-nev-expected-user': encodeURIComponent(progressOwner) }, body: submission.body,
    });
    const body = await response.json() as { projection?: UserProgressData; error?: string };
    if (revision !== identityRevision) throw new Error('账号已切换，请在当前账号重新进入实训');
    if (!response.ok || !body.projection) throw new Error(body.error || '学习结果保存失败');
    saveUserProgress(body.projection, { sync: false });
    pendingCompletions.delete(levelId);
    return body.projection;
  })().finally(() => { submission.promise = undefined; });
  return submission.promise;
}

const NEXT_LEVEL_MAP: Record<LevelId, LevelId | null> = {
  LEVEL_00: 'LEVEL_01',
  LEVEL_01: 'LEVEL_02',
  LEVEL_02: 'LEVEL_03',
  LEVEL_03: 'LEVEL_04',
  LEVEL_04: 'LEVEL_05',
  LEVEL_05: 'LEVEL_06',
  LEVEL_06: 'LEVEL_07',
  LEVEL_07: 'LEVEL_08',
  LEVEL_08: 'LEVEL_09',
  LEVEL_09: null,
};

export function markLevelComplete(levelId: string, score = 100): UserProgressData {
  const current = getUserProgress();

  // If in teacher mode, do not pollute student record
  if (current.teacherMode) {
    return current;
  }

  // Prerequisite check: cannot complete a level if prerequisite is not completed
  const currentMeta = COURSE_MAP.find((c) => c.id === levelId);
  if (currentMeta && currentMeta.prerequisiteId) {
    const prereqStatus = current.levels[currentMeta.prerequisiteId]?.status;
    if (prereqStatus !== 'completed') {
      console.warn(`Cannot mark ${levelId} complete: prerequisite ${currentMeta.prerequisiteId} is not completed.`);
      return current;
    }
  }

  const nextLevel = NEXT_LEVEL_MAP[levelId as LevelId];
  const nextMeta = nextLevel ? COURSE_MAP.find((c) => c.id === nextLevel) : null;
  const canUnlockNext = nextMeta && nextMeta.implemented;

  const existingLevel = current.levels[levelId] || { status: 'locked' };
  const isReplay = existingLevel.status === 'completed';
  const newCount = (existingLevel.attemptCount ?? (isReplay ? 1 : 0)) + 1;
  const now = new Date();
  const completedAtText = now.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const attemptRecord: AttemptSummaryRecord = {
    attemptId: `local_${Date.now()}`,
    completedAt: now.toISOString(),
    score,
    mode: 'guided',
  };

  const updatedLevels = { ...current.levels };
  updatedLevels[levelId] = {
    ...existingLevel,
    status: 'completed',
    completedAt: existingLevel.completedAt || completedAtText,
    score: existingLevel.score ?? score, // Preserve first score
    attemptCount: newCount,
    firstRecord: existingLevel.firstRecord ?? attemptRecord,
    recentRecord: attemptRecord,
    bestRecord: existingLevel.bestRecord && existingLevel.bestRecord.score >= score
      ? existingLevel.bestRecord
      : attemptRecord,
  };

  // Automatically unlock next level ONLY if it is implemented and this is initial completion!
  if (!isReplay && canUnlockNext && nextLevel && updatedLevels[nextLevel]?.status === 'locked') {
    updatedLevels[nextLevel] = {
      ...updatedLevels[nextLevel],
      status: 'unlocked',
    };
  }

  const updatedData: UserProgressData = {
    ...current,
    currentActiveLevel: canUnlockNext && nextLevel && !isReplay ? nextLevel : (levelId as LevelId),
    levels: updatedLevels,
  };

  saveUserProgress(updatedData);
  return updatedData;
}

export function resetUserProgress(): UserProgressData {
  cachedProgress = null;
  const defaultState = createDefaultUserProgress();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }
  cachedProgress = defaultState;
  return defaultState;
}

export function toggleTeacherMode(enable?: boolean): UserProgressData {
  const current = getUserProgress();
  const nextMode = enable !== undefined ? enable : !current.teacherMode;
  const updatedData: UserProgressData = {
    ...current,
    teacherMode: nextMode,
  };
  saveUserProgress(updatedData);
  return updatedData;
}

export function setCurrentActiveLevel(levelId: string): void {
  const current = getUserProgress();
  if (current.currentActiveLevel !== levelId) {
    saveUserProgress({
      ...current,
      currentActiveLevel: levelId,
    });
  }
}

export function getLevelProgress(levelId: string, progress: UserProgressData): LevelProgress {
  if (progress.levels[levelId]) return progress.levels[levelId];
  const legacyId = toLegacyLevelId(levelId);
  if (legacyId && progress.levels[legacyId]) return progress.levels[legacyId];
  const canonicalId = normalizeLevelId(levelId);
  if (canonicalId && progress.levels[canonicalId]) return progress.levels[canonicalId];
  return { status: 'locked' };
}

export function isLevelUnlocked(levelId: string, progress: UserProgressData): boolean {
  if (progress.teacherMode) return true;
  const canonical = getCourseLevel(levelId);
  if (canonical) {
    if (!canonical.implemented) return false;
    const completed = Object.entries(progress.levels)
      .filter(([, value]) => value.status === 'completed')
      .map(([id]) => normalizeLevelId(id));
    return checkLevelPrerequisites(canonical.canonicalId, completed).allowed;
  }
  const meta = COURSE_MAP.find((c) => c.id === levelId as LevelId);
  if (!meta) return false;
  if (!meta.prerequisiteId) {
    const prog = getLevelProgress(levelId, progress);
    return prog.status === 'unlocked' || prog.status === 'completed';
  }
  const prereqProg = getLevelProgress(meta.prerequisiteId, progress);
  if (prereqProg.status !== 'completed') return false;
  const prog = getLevelProgress(levelId, progress);
  return prog.status === 'unlocked' || prog.status === 'completed';
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useUserProgress(): UserProgressData {
  const [data, setData] = useState<UserProgressData>(() => createDefaultUserProgress());

  useEffect(() => {
    queueMicrotask(() => {
      setData(getUserProgress());
    });
    const handleUpdate = () => {
      setData(getUserProgress());
    };
    return subscribe(handleUpdate);
  }, []);

  return data;
}
