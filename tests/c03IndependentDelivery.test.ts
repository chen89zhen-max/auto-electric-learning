import { describe, expect, it } from 'vitest';
import { C03_STAGE_CONTENT, type C03Step } from '@/src/levels/c03/c03Training';
import { getCourseLevel, isLevelPublished } from '@/src/courses/registry';
import { resolveRequestedLevel } from '@/src/app/levelRoute';

describe('C03 第一次独立交车 · 综合直流诊断与修复复检', () => {
  it('provides complete 5-stage progressive independent delivery curriculum and mentor dialogues', () => {
    const requiredSteps: C03Step[] = [
      'WORK_ORDER_INTAKE',
      'INDEPENDENT_STRATEGY',
      'NON_DESTRUCTIVE_EXEC',
      'SOP_REPAIR_AND_REINSPECT',
      'OWNER_DEFENSE_DELIVERY',
    ];

    expect(Object.keys(C03_STAGE_CONTENT)).toEqual(requiredSteps);

    for (const step of requiredSteps) {
      const stage = C03_STAGE_CONTENT[step];
      expect(stage.title.length).toBeGreaterThan(5);
      expect(stage.objective.length).toBeGreaterThan(10);
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt.length).toBeGreaterThan(15);
      expect(stage.hint.length).toBeGreaterThan(5);
      expect(['NORMAL', 'WARNING', 'PRAISE', 'THINKING']).toContain(stage.mentorEmotion);
    }
  });

  it('registers C03 as published in the course registry and handles URL routing', () => {
    expect(isLevelPublished('C03')).toBe(true);
    expect(isLevelPublished('LEVEL_09')).toBe(true);
    const c03Level = getCourseLevel('C03');
    expect(c03Level?.implemented).toBe(true);
    expect(c03Level?.contentVersion).toBe('1.0.0');
    expect(c03Level?.chapterId).toBe('chapter_c');
    expect(resolveRequestedLevel('?level=C03')).toBe('C03');
  });
});
