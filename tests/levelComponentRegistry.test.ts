import { describe, it, expect } from 'vitest';
import {
  CANONICAL_27_LEVEL_IDS,
  getLevelLoader,
  getLevelComponent,
  hasLevelLoader,
  resolveLevelId,
  getRoleWorkspaceLoader,
} from '@/src/app/levelComponents';

describe('Task 9: Level Component Registry and Code-Splitting', () => {
  it('contains all 27 canonical levels across the published curriculum', () => {
    expect(CANONICAL_27_LEVEL_IDS.length).toBe(27);

    const expected27 = [
      'O00', 'O01',
      'A01', 'A02', 'A03', 'A04',
      'B01', 'B02', 'B03', 'B04', 'B05', 'B06',
      'C01', 'C02', 'C03',
      'D01', 'D02', 'D03', 'D04', 'D05',
      'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07',
    ];

    expect([...CANONICAL_27_LEVEL_IDS].sort()).toEqual([...expected27].sort());

    for (const levelId of CANONICAL_27_LEVEL_IDS) {
      expect(hasLevelLoader(levelId)).toBe(true);
      const loader = getLevelLoader(levelId);
      expect(loader).toBeDefined();
      expect(typeof loader).toBe('function');
      const lazyComponent = getLevelComponent(levelId);
      expect(lazyComponent).toBeDefined();
    }
  });

  it('asynchronously loads each level component module with a valid default export', async () => {
    // Verify each loader dynamically imports its target component
    await Promise.all(
      CANONICAL_27_LEVEL_IDS.map(async (levelId) => {
        const loader = getLevelLoader(levelId);
        expect(loader).toBeDefined();
        const mod = await loader!();
        expect(mod).toBeDefined();
        expect(typeof mod.default).toBe('function');
      })
    );
  }, 20000);

  it('correctly maps legacy and numeric aliases to canonical level loaders', () => {
    const aliasCases: [alias: string, expectedCanonical: string][] = [
      ['00', 'O00'],
      ['level00', 'O00'],
      ['LEVEL_00', 'O00'],
      ['01', 'O01'],
      ['level01', 'O01'],
      ['LEVEL_01', 'O01'],
      ['02', 'A01'],
      ['level02', 'A01'],
      ['LEVEL_02', 'A01'],
      ['03', 'A03'],
      ['level03', 'A03'],
      ['LEVEL_03', 'A03'],
      ['04', 'A04'],
      ['level04', 'A04'],
      ['LEVEL_04', 'A04'],
      ['05', 'D01'],
      ['level05', 'D01'],
      ['LEVEL_05', 'D01'],
      ['06', 'E05'],
      ['level06', 'E05'],
      ['LEVEL_06', 'E05'],
      ['07', 'E04'],
      ['level07', 'E04'],
      ['LEVEL_07', 'E04'],
      ['08', 'C02'],
      ['level08', 'C02'],
      ['LEVEL_08', 'C02'],
      ['09', 'C03'],
      ['level09', 'C03'],
      ['LEVEL_09', 'C03'],
      ['a02', 'A02'],
      ['b01', 'B01'],
      ['c01', 'C01'],
      ['d02', 'D02'],
      ['e07', 'E07'],
    ];

    for (const [alias, expectedCanonical] of aliasCases) {
      expect(resolveLevelId(alias)).toBe(expectedCanonical);
      expect(hasLevelLoader(alias)).toBe(true);
      const loader = getLevelLoader(alias);
      expect(loader).toBeDefined();
      // Should point to the exact same loader as canonical
      expect(loader).toBe(getLevelLoader(expectedCanonical));
    }
  });

  it('ensures F01 has no executable component loader and indicates under-construction', () => {
    expect(hasLevelLoader('F01')).toBe(false);
    expect(getLevelLoader('F01')).toBeUndefined();
    expect(getLevelComponent('F01')).toBeUndefined();
  });

  it('provides lazy loaders for teacher and admin role workspaces', async () => {
    const teacherLoader = getRoleWorkspaceLoader('teacher');
    expect(teacherLoader).toBeDefined();
    const teacherMod = await teacherLoader!();
    expect(typeof teacherMod.default).toBe('function');

    const adminLoader = getRoleWorkspaceLoader('admin');
    expect(adminLoader).toBeDefined();
    const adminMod = await adminLoader!();
    expect(typeof adminMod.default).toBe('function');
  });
});
