'use client';

import { useEffect, useState } from 'react';
import { createBaseUserProgress, type LevelId, type LevelProgress, type UserProgressData } from '@/src/types/progress';

export type { LevelId, LevelProgress, UserProgressData };
export { createBaseUserProgress };

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
let serverSyncEnabled = false;

export function setProgressServerSyncEnabled(enabled: boolean): void {
  serverSyncEnabled = enabled;
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
  options: { sync?: boolean } = {}
): void {
  cachedProgress = { ...data, lastUpdated: Date.now() };
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedProgress));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }

    // Only a server-confirmed student session may sync formal progress.
    if (serverSyncEnabled && options.sync !== false) {
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: cachedProgress }),
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to save user progress:', err);
  }
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

export function markLevelComplete(levelId: LevelId, score = 100): UserProgressData {
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

  const nextLevel = NEXT_LEVEL_MAP[levelId];
  const nextMeta = nextLevel ? COURSE_MAP.find((c) => c.id === nextLevel) : null;
  const canUnlockNext = nextMeta && nextMeta.implemented;

  const updatedLevels = { ...current.levels };
  updatedLevels[levelId] = {
    ...updatedLevels[levelId],
    status: 'completed',
    completedAt: new Date().toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    score,
  };

  // Automatically unlock next level ONLY if it is implemented!
  if (canUnlockNext && nextLevel && updatedLevels[nextLevel]?.status === 'locked') {
    updatedLevels[nextLevel] = {
      ...updatedLevels[nextLevel],
      status: 'unlocked',
    };
  }

  const updatedData: UserProgressData = {
    ...current,
    currentActiveLevel: canUnlockNext && nextLevel ? nextLevel : levelId,
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

export function setCurrentActiveLevel(levelId: LevelId): void {
  const current = getUserProgress();
  if (current.currentActiveLevel !== levelId) {
    saveUserProgress({
      ...current,
      currentActiveLevel: levelId,
    });
  }
}

export function isLevelUnlocked(levelId: LevelId, progress: UserProgressData): boolean {
  if (progress.teacherMode) return true;
  const meta = COURSE_MAP.find((c) => c.id === levelId);
  if (!meta) return false;
  if (!meta.prerequisiteId) {
    return progress.levels[levelId]?.status === 'unlocked' || progress.levels[levelId]?.status === 'completed';
  }
  const prereqStatus = progress.levels[meta.prerequisiteId]?.status;
  if (prereqStatus !== 'completed') return false;
  return progress.levels[levelId]?.status === 'unlocked' || progress.levels[levelId]?.status === 'completed';
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
