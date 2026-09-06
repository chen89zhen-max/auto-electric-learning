import { describe, expect, it } from 'vitest';
import { resolveRequestedLevel } from '@/src/app/levelRoute';

describe('training-level URL routing', () => {
  it('opens a published B/C/D-level from the level query parameter', () => {
    expect(resolveRequestedLevel('?level=B04')).toBe('B04');
    expect(resolveRequestedLevel('?level=C01')).toBe('C01');
    expect(resolveRequestedLevel('?level=C02')).toBe('C02');
    expect(resolveRequestedLevel('?level=C03')).toBe('C03');
    expect(resolveRequestedLevel('?level=D01')).toBe('D01');
    expect(resolveRequestedLevel('?level=D02')).toBe('D02');
    expect(resolveRequestedLevel('?level=D05')).toBe('D05');
  });

  it('keeps unpublished levels out of direct entry', () => {
    expect(resolveRequestedLevel('?level=E01')).toBe('HOME');
    expect(resolveRequestedLevel('?level=not-a-level')).toBe('HOME');
  });
});
