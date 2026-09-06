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

  it('strictly isolates publication status: P2 published O00, O01, A01, A02, A03, A04; rest UNDER_CONSTRUCTION', () => {
    const published = CANONICAL_COURSE_REGISTRY.filter((l) => l.publicationStatus === 'PUBLISHED');
    expect(published.length).toBe(6);

    const publishedIds = published.map((l) => l.canonicalId).sort();
    expect(publishedIds).toEqual(['A01', 'A02', 'A03', 'A04', 'O00', 'O01']);

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

    // All other levels are UNDER_CONSTRUCTION
    expect(isLevelPublished('B01')).toBe(false);
    expect(isLevelPublished('LEVEL_05')).toBe(false);
    expect(isLevelPublished('C01')).toBe(false);
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
});
