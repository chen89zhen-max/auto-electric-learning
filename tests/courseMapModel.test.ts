import { describe, expect, it } from 'vitest';
import { createBaseUserProgress } from '@/src/types/progress';
import { buildCourseMapViewModel } from '@/src/components/course-map/courseMapModel';

describe('course map view model', () => {
  it('uses the seven registry chapters and all 28 tasks without duplicate legacy records', () => {
    const progress = createBaseUserProgress('测试学员');
    progress.levels.O00 = { status: 'completed' };
    progress.levels.LEVEL_00 = { status: 'completed' };
    const model = buildCourseMapViewModel(progress);
    expect(model.chapters.map((chapter) => chapter.letter)).toEqual(['O', 'A', 'B', 'C', 'D', 'E', 'F']);
    expect(model.totalTasks).toBe(28);
    expect(model.completedTasks).toBe(1);
    expect(model.chapters.find((chapter) => chapter.letter === 'F')?.state).toBe('locked');
  });

  it('marks Chapter F as current when F01 prerequisites are completed and active', () => {
    const progress = createBaseUserProgress('测试学员');
    progress.currentActiveLevel = 'F01';
    for (const id of ['C03', 'E03', 'E04', 'E05', 'E07']) {
      progress.levels[id] = { status: 'completed' };
    }
    const model = buildCourseMapViewModel(progress);
    const chapterF = model.chapters.find((chapter) => chapter.letter === 'F');
    expect(chapterF?.state).toBe('current');
    const f01 = chapterF?.levels.find((lvl) => lvl.id === 'F01');
    expect(f01?.state).toBe('current');
  });

  it('marks B as current and exposes the latest B05 attempt', () => {
    const progress = createBaseUserProgress('测试学员');
    progress.currentActiveLevel = 'B05';
    progress.levels.B04 = { status: 'completed' };
    progress.levels.B05 = {
      status: 'unlocked',
      attemptCount: 2,
      recentRecord: {
        attemptId: 'recent-b05',
        startedAt: '2026-09-13T01:00:00.000Z',
        completedAt: '2026-09-13T01:06:05.000Z',
        durationMs: 365_000,
        score: 86,
        mode: 'independent',
        timingSource: 'server',
      },
    };
    const model = buildCourseMapViewModel(progress);
    expect(model.activeLevel.id).toBe('B05');
    expect(model.activeChapterId).toBe('chapter_b');
    expect(model.activeLevel.recentScore).toBe(86);
    expect(model.activeLevel.recentDurationMs).toBe(365_000);
    expect(model.chapters.find((chapter) => chapter.letter === 'B')?.state).toBe('current');
  });

  it('correctly calculates missingPrerequisiteNames for tasks with multiple prerequisites', () => {
    const progress = createBaseUserProgress('测试学员');
    const model = buildCourseMapViewModel(progress);
    const f01 = model.chapters.find((ch) => ch.letter === 'F')?.levels.find((lvl) => lvl.id === 'F01');
    expect(f01).toBeDefined();
    expect(f01?.missingPrerequisiteNames.length).toBeGreaterThan(1);
  });

  it('keeps B04 available and exposes B03 as a non-blocking recommendation', () => {
    const progress = createBaseUserProgress('测试学员');
    progress.levels.B02 = { status: 'completed' };
    const model = buildCourseMapViewModel(progress);
    const b04 = model.chapters.find((chapter) => chapter.letter === 'B')?.levels.find((level) => level.id === 'B04');

    expect(b04?.state).toBe('available');
    expect(b04?.missingPrerequisiteNames).toEqual([]);
    expect(b04?.recommendedPriorLevelNames).toEqual(['B03 追踪节点与回路']);
  });

  it('does not lock B05 or B06 when only recommended study is incomplete', () => {
    const progress = createBaseUserProgress('测试学员');
    progress.levels.B01 = { status: 'completed' };
    const model = buildCourseMapViewModel(progress);
    const levels = model.chapters.find((chapter) => chapter.letter === 'B')?.levels;

    expect(levels?.find((level) => level.id === 'B05')?.state).toBe('available');
    expect(levels?.find((level) => level.id === 'B05')?.recommendedPriorLevelNames).toEqual(['B04 核算用电与功率']);
    expect(levels?.find((level) => level.id === 'B06')?.state).toBe('available');
    expect(levels?.find((level) => level.id === 'B06')?.recommendedPriorLevelNames).toEqual(['B05 查清电源为何带不动']);
  });
});
