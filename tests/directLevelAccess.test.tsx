import { describe, expect, it } from 'vitest';
import {
  resolveRequestedLevelRoute,
  resolveRequestedLevel,
} from '@/src/app/levelRoute';
import { getCourseLevel } from '@/src/courses/registry';

describe('Task 7: Direct Route Student Prerequisite Enforcement', () => {
  it('allows teachers and admins to bypass prerequisites for lesson preparation', () => {
    const teacherContext = { isTeacherOrAdmin: true, completedLevelIds: [] };
    const routeC03 = resolveRequestedLevelRoute('?level=C03', teacherContext);
    expect(routeC03).toEqual({ kind: 'level', levelId: 'C03' });

    const routeE07 = resolveRequestedLevelRoute('?level=E07', teacherContext);
    expect(routeE07).toEqual({ kind: 'level', levelId: 'E07' });
  });

  it('blocks students from accessing advanced levels when prerequisites are missing', () => {
    // New student who has only completed O00
    const studentContext = { isTeacherOrAdmin: false, completedLevelIds: ['O00'] };

    // C03 requires C02
    const routeC03 = resolveRequestedLevelRoute('?level=C03', studentContext);
    expect(routeC03.kind).toBe('blocked');
    if (routeC03.kind === 'blocked') {
      expect(routeC03.levelId).toBe('C03');
      expect(routeC03.missingPrerequisites.length).toBeGreaterThanOrEqual(1);
    }

    // resolveRequestedLevel fallback returns HOME for blocked route
    expect(resolveRequestedLevel('?level=C03', studentContext)).toBe('HOME');
  });

  it('allows students to access levels whose prerequisites are fully satisfied', () => {
    const c03Meta = getCourseLevel('C03');
    expect(c03Meta).toBeDefined();

    // Student has completed all prerequisites for C03
    const studentContext = {
      isTeacherOrAdmin: false,
      completedLevelIds: c03Meta!.prerequisiteLevelIds,
    };

    const routeC03 = resolveRequestedLevelRoute('?level=C03', studentContext);
    expect(routeC03).toEqual({ kind: 'level', levelId: 'C03' });
    expect(resolveRequestedLevel('?level=C03', studentContext)).toBe('C03');
  });

  it('gracefully handles missing, invalid, or unpublished level query parameters', () => {
    expect(resolveRequestedLevelRoute('')).toEqual({ kind: 'home' });
    expect(resolveRequestedLevelRoute('?foo=bar')).toEqual({ kind: 'home' });
    expect(resolveRequestedLevelRoute('?level=nonexistent')).toEqual({ kind: 'home' });
    expect(resolveRequestedLevelRoute('?level=F01')).toEqual({ kind: 'home' });
  });

  it('maintains backwards compatibility for callers omitting context', () => {
    expect(resolveRequestedLevel('?level=C02')).toBe('C02');
    expect(resolveRequestedLevel('?level=B04')).toBe('B04');
    expect(resolveRequestedLevel('?level=F01')).toBe('HOME');
  });
});
