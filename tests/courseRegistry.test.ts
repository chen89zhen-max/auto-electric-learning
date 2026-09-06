import { describe, expect, it } from 'vitest';
import {
  CANONICAL_COURSE_REGISTRY,
  CHAPTER_LIST,
  getCourseLevel,
  normalizeLevelId,
  toLegacyLevelId,
  isLevelPublished,
  checkLevelPrerequisites,
  getLevelsByChapter,
} from '@/src/courses/registry';
import { CANONICAL_COURSE_MAP } from '@/src/stores/userProgressStore';

describe('Canonical Course Registry (P1)', () => {
  it('defines all 28 canonical levels across 7 chapters', () => {
    expect(CANONICAL_COURSE_REGISTRY.length).toBe(28);
    expect(CHAPTER_LIST.length).toBe(7);

    const chapters = new Set(CANONICAL_COURSE_REGISTRY.map((l) => l.chapterId));
    expect(chapters.size).toBe(7);
    expect(chapters.has('chapter_o')).toBe(true);
    expect(chapters.has('chapter_a')).toBe(true);
    expect(chapters.has('chapter_b')).toBe(true);
    expect(chapters.has('chapter_c')).toBe(true);
    expect(chapters.has('chapter_d')).toBe(true);
    expect(chapters.has('chapter_e')).toBe(true);
    expect(chapters.has('chapter_f')).toBe(true);
  });

  it('publishes P3 B01-B06 alongside the six completed P2 levels', () => {
    const published = CANONICAL_COURSE_REGISTRY.filter((l) => l.publicationStatus === 'PUBLISHED');
    expect(published.length).toBe(13);

    const publishedIds = published.map((l) => l.canonicalId).sort();
    expect(publishedIds).toEqual(['A01', 'A02', 'A03', 'A04', 'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'C01', 'O00', 'O01']);

    expect(isLevelPublished('O00')).toBe(true);
    expect(isLevelPublished('LEVEL_00')).toBe(true);
    expect(isLevelPublished('O01')).toBe(true);
    expect(isLevelPublished('LEVEL_01')).toBe(true);
    expect(isLevelPublished('A01')).toBe(true);
    expect(isLevelPublished('LEVEL_02')).toBe(true);
    expect(isLevelPublished('A02')).toBe(true);
    expect(isLevelPublished('A03')).toBe(true);
    expect(isLevelPublished('LEVEL_03')).toBe(true);
    expect(isLevelPublished('A04')).toBe(true);
    expect(isLevelPublished('LEVEL_04')).toBe(true);

    for (const id of ['B01', 'B02', 'B03', 'B04', 'B05', 'B06']) {
      expect(isLevelPublished(id)).toBe(true);
      expect(getCourseLevel(id)?.implemented).toBe(true);
      expect(getCourseLevel(id)?.contentVersion).toBe('1.0.0');
    }

    // C01 is published
    expect(isLevelPublished('C01')).toBe(true);
    expect(getCourseLevel('C01')?.implemented).toBe(true);
    expect(getCourseLevel('C01')?.contentVersion).toBe('1.0.0');

    // Later chapters remain UNDER_CONSTRUCTION
    expect(isLevelPublished('LEVEL_05')).toBe(false);
    expect(isLevelPublished('C02')).toBe(false);
    expect(isLevelPublished('C03')).toBe(false);
    expect(isLevelPublished('D01')).toBe(false);
    expect(isLevelPublished('E01')).toBe(false);
    expect(isLevelPublished('F01')).toBe(false);
  });

  it('normalizes legacy and canonical level IDs bidirectionally', () => {
    expect(normalizeLevelId('LEVEL_00')).toBe('O00');
    expect(normalizeLevelId('LEVEL_01')).toBe('O01');
    expect(normalizeLevelId('LEVEL_02')).toBe('A01');
    expect(normalizeLevelId('LEVEL_03')).toBe('A03');
    expect(normalizeLevelId('O00')).toBe('O00');
    expect(normalizeLevelId('A01')).toBe('A01');
    expect(normalizeLevelId('a01')).toBe('A01');

    expect(toLegacyLevelId('O00')).toBe('LEVEL_00');
    expect(toLegacyLevelId('O01')).toBe('LEVEL_01');
    expect(toLegacyLevelId('A01')).toBe('LEVEL_02');
  });

  it('verifies every level has textbook metadata, objective IDs, and valid prerequisites', () => {
    for (const level of CANONICAL_COURSE_REGISTRY) {
      expect(level.canonicalId).toBeTruthy();
      expect(level.title).toBeTruthy();
      expect(level.textbookTask).toBeTruthy();
      expect(level.objectiveIds.length).toBeGreaterThan(0);
      expect(level.contentVersion).toBeTruthy();
      expect(level.rubricVersion).toBeTruthy();

      // Check prerequisites exist in registry
      for (const prereq of level.prerequisiteLevelIds) {
        expect(getCourseLevel(prereq)).toBeDefined();
      }
    }
  });

  it('uses the canonical A01 identifier when displaying 点亮检修灯', () => {
    expect(getCourseLevel('A01')?.title).toBe('点亮检修灯');
    expect(getCourseLevel('A01')?.num).toBe('A01');
  });

  it('evaluates prerequisite satisfaction accurately', () => {
    // O00 has no prerequisites
    const o00Check = checkLevelPrerequisites('O00', []);
    expect(o00Check.allowed).toBe(true);

    // O01 requires O00
    const o01Blocked = checkLevelPrerequisites('O01', []);
    expect(o01Blocked.allowed).toBe(false);
    expect(o01Blocked.missingPrerequisites.length).toBe(1);

    const o01Allowed = checkLevelPrerequisites('O01', ['O00']);
    expect(o01Allowed.allowed).toBe(true);

    // A01 requires O01
    const a01Check = checkLevelPrerequisites('A01', ['LEVEL_00', 'LEVEL_01']);
    expect(a01Check.allowed).toBe(true);
  });

  it('groups levels by chapter properly', () => {
    const chapters = getLevelsByChapter();
    expect(chapters.length).toBe(7);
    expect(chapters[0].chapter.id).toBe('chapter_o');
    expect(chapters[0].levels.length).toBe(2);
    expect(chapters[1].chapter.id).toBe('chapter_a');
    expect(chapters[1].levels.length).toBe(4);
  });

  it('exposes every published B-level to the training-lobby course map', () => {
    expect(CANONICAL_COURSE_MAP.filter((level) => level.id.startsWith('B')).map((level) => level.id)).toEqual(['B01', 'B02', 'B03', 'B04', 'B05', 'B06']);
    expect(CANONICAL_COURSE_MAP.find((level) => level.id === 'B01')?.implemented).toBe(true);
  });
});
