import { describe, expect, it } from 'vitest';
import { formatDateTimeSeconds, formatDurationMs } from '@/src/lib/formatDuration';

describe('formatDurationMs', () => {
  it('shows wall-clock duration at whole-second precision', () => {
    expect(formatDurationMs(999)).toBe('0 秒');
    expect(formatDurationMs(2_000)).toBe('2 秒');
    expect(formatDurationMs(65_900)).toBe('1 分 05 秒');
    expect(formatDurationMs(3_661_999)).toBe('61 分 01 秒');
  });

  it('normalizes invalid or negative values to zero seconds', () => {
    expect(formatDurationMs(-1)).toBe('0 秒');
    expect(formatDurationMs(Number.NaN)).toBe('0 秒');
  });

  it('formats saved attempt timestamps with whole-second precision', () => {
    const value = formatDateTimeSeconds('2026-09-11T00:01:10.432Z');
    expect(value).toMatch(/:\d{2}:10$/);
    expect(formatDateTimeSeconds('invalid')).toBe('—');
  });
});
