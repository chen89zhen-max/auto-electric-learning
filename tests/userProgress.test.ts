import { describe, expect, it, beforeEach } from 'vitest';
import {
  getUserProgress,
  markLevelComplete,
  resetUserProgress,
  toggleTeacherMode,
  isLevelUnlocked,
  COURSE_MAP,
} from '@/src/stores/userProgressStore';

// In-memory localStorage mock for node test environment
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  for (const k in mockStorage) delete mockStorage[k];
  global.localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
    key: (i: number) => Object.keys(mockStorage)[i] || null,
    length: Object.keys(mockStorage).length,
  };
  resetUserProgress();
});

describe('UserProgressStore & Progression Logic', () => {
  it('defines 10 tasks in the full course map', () => {
    expect(COURSE_MAP.length).toBe(10);
    expect(COURSE_MAP[0].id).toBe('LEVEL_00');
    expect(COURSE_MAP[1].id).toBe('LEVEL_01');
    expect(COURSE_MAP[2].id).toBe('LEVEL_02');
  });

  it('new user defaults to ONLY Level 00 unlocked', () => {
    const progress = getUserProgress();
    expect(progress.levels.LEVEL_00.status).toBe('unlocked');
    expect(progress.levels.LEVEL_01.status).toBe('locked');
    expect(progress.levels.LEVEL_02.status).toBe('locked');
    expect(progress.levels.LEVEL_03.status).toBe('locked');

    expect(isLevelUnlocked('LEVEL_00', progress)).toBe(true);
    expect(isLevelUnlocked('LEVEL_01', progress)).toBe(false);
    expect(isLevelUnlocked('LEVEL_02', progress)).toBe(false);
  });

  it('completing LEVEL_00 automatically unlocks LEVEL_01 and saves to storage', () => {
    const updated = markLevelComplete('LEVEL_00', 100);
    expect(updated.levels.LEVEL_00.status).toBe('completed');
    expect(updated.levels.LEVEL_01.status).toBe('unlocked');
    expect(updated.levels.LEVEL_02.status).toBe('locked');
    expect(updated.currentActiveLevel).toBe('LEVEL_01');

    // Check persistence from storage
    const loaded = getUserProgress();
    expect(loaded.levels.LEVEL_00.status).toBe('completed');
    expect(loaded.levels.LEVEL_01.status).toBe('unlocked');
  });

  it('completing LEVEL_01 automatically unlocks LEVEL_02', () => {
    markLevelComplete('LEVEL_00', 100);
    const updated = markLevelComplete('LEVEL_01', 95);

    expect(updated.levels.LEVEL_01.status).toBe('completed');
    expect(updated.levels.LEVEL_02.status).toBe('unlocked');
    expect(updated.currentActiveLevel).toBe('LEVEL_02');
    expect(isLevelUnlocked('LEVEL_02', updated)).toBe(true);
  });

  it('teacher mode allows access to all levels without completing prerequisites', () => {
    let progress = getUserProgress();
    expect(isLevelUnlocked('LEVEL_02', progress)).toBe(false);

    progress = toggleTeacherMode(true);
    expect(progress.teacherMode).toBe(true);
    expect(isLevelUnlocked('LEVEL_02', progress)).toBe(true);
    expect(isLevelUnlocked('LEVEL_09', progress)).toBe(true);
  });

  it('resetUserProgress resets back to new-user initial state', () => {
    markLevelComplete('LEVEL_00', 100);
    markLevelComplete('LEVEL_01', 100);
    expect(getUserProgress().levels.LEVEL_01.status).toBe('completed');

    const reset = resetUserProgress();
    expect(reset.levels.LEVEL_00.status).toBe('unlocked');
    expect(reset.levels.LEVEL_01.status).toBe('locked');
    expect(reset.levels.LEVEL_02.status).toBe('locked');
  });
});
