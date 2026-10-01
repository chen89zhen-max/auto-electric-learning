import { describe, expect, it } from 'vitest';
import { scoreFromDimensions } from '@/src/abilities/reportScore';
import { buildChapterBProcessReport } from '@/src/levels/chapterB/ChapterBExperience';

describe('B01—B06 过程评分报告', () => {
  it('让 B01 的答错路径低于清洁完成路径，且能力维度不再固定五星', () => {
    const clean = buildChapterBProcessReport('B01', { durationMs: 2_000 });
    const wrong = buildChapterBProcessReport('B01', {
      durationMs: 2_000,
      stages: [{ wrongAttempts: 1 }],
    });

    expect(clean.score).toBe(100);
    expect(wrong.score).toBeLessThan(clean.score);
    expect(wrong.dimensions.some((item) => item.stars < 5)).toBe(true);
    expect(scoreFromDimensions(wrong.dimensions)).toBeLessThan(scoreFromDimensions(clean.dimensions));
    expect(clean.summaryItems.at(-1)?.value).toBe('2 秒');
  });

  it('让 B06 的同阶段重复提示只扣一次，并低于清洁完成路径', () => {
    const clean = buildChapterBProcessReport('B06', { durationMs: 65_900 });
    const hintedOnce = buildChapterBProcessReport('B06', {
      durationMs: 65_900,
      stages: [{ hintRequests: 1 }],
    });
    const repeatedSameStageHint = buildChapterBProcessReport('B06', {
      durationMs: 65_900,
      stages: [{ hintRequests: 2 }],
    });

    expect(hintedOnce.score).toBeLessThan(clean.score);
    expect(repeatedSameStageHint.score).toBe(hintedOnce.score);
    expect(hintedOnce.summaryItems.at(-1)?.value).toBe('1 分 05 秒');
  });

  it('B01—B06 的报告不再声称存在可切换的三种实训模式', () => {
    for (const levelId of ['B01', 'B02', 'B03', 'B04', 'B05', 'B06']) {
      const report = buildChapterBProcessReport(levelId, {});
      expect(report.summaryItems.some((item) => /实训模式|跟练模式|独立模式|迁移模式/.test(`${item.label}${item.value}`))).toBe(false);
    }
  });
});
