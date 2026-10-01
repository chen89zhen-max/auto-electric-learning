import { describe, expect, it } from 'vitest';
import { buildLevel00ProcessReport } from '@/src/levels/level00/Level00Experience';
import { buildA04ProcessReport } from '@/src/levels/a04/A04Experience';
import { calculateO01ProcessScore } from '@/src/levels/level01/scenes/Level01Scene';
import { calculateA01ProcessScore } from '@/src/levels/level02/scenes/Level02ReportScene';

describe('O00—A04 过程评分报告', () => {
  it('让 O00 的安全违规路径低于无违规路径，并显示秒级用时', () => {
    const clean = buildLevel00ProcessReport({
      unsafeActions: 0,
      hintRequests: 0,
      durationMs: 2_000,
    });
    const unsafe = buildLevel00ProcessReport({
      unsafeActions: 1,
      hintRequests: 0,
      durationMs: 2_000,
    });

    expect(clean.dimensions.map((item) => item.stars)).toEqual([5, 5, 5, 5, 5]);
    expect(unsafe.dimensions.some((item) => item.stars < 5)).toBe(true);
    expect(unsafe.score).toBeLessThan(clean.score);
    expect(clean.summaryItems.at(-1)?.value).toBe('2 秒');
  });

  it('让 A04 的提示、答错和安全拦截路径低于清洁路径', () => {
    const clean = buildA04ProcessReport({ durationMs: 65_900 });
    const hinted = buildA04ProcessReport({ hintRequests: 1, durationMs: 65_900 });
    const wrong = buildA04ProcessReport({ wrongAttempts: 1, durationMs: 65_900 });
    const intercepted = buildA04ProcessReport({ meterGuardBlocks: 1, durationMs: 65_900 });

    expect(clean.score).toBe(100);
    expect(hinted.score).toBeLessThan(clean.score);
    expect(wrong.score).toBeLessThan(clean.score);
    expect(intercepted.score).toBeLessThan(wrong.score);
    expect(clean.summaryItems.at(-1)?.value).toBe('1 分 05 秒');
  });

  it('让 O01 和 A01 保存未经星级量化的过程精确分', () => {
    const o01Base = {
      levelStartedAt: 0, firstAction: null, timeToEnvironmentCheck: null, timeToPowerIsolation: null,
      directContactAttempts: 0, unsafeFireResponses: 0, helpRequests: 0, maxHintLevel: 0,
      firstAidSequenceErrors: 0, fireResponseErrors: 0, levelDuration: 0,
    };
    expect(calculateO01ProcessScore(o01Base)).toBe(100);
    expect(calculateO01ProcessScore({ ...o01Base, firstAidSequenceErrors: 1 })).toBe(88);

    const a01Base = {
      hotWiringAttempts: 0, shortCircuitAttempts: 0, invalidTerminalAttempts: 0,
      openCircuitDiagnosisErrors: 0, chassisGroundCompleted: true, transferCheckErrors: 0,
      reflectionErrors: 0, helpRequests: 0,
    };
    expect(calculateA01ProcessScore(a01Base)).toBe(100);
    expect(calculateA01ProcessScore({ ...a01Base, shortCircuitAttempts: 1 })).toBe(80);
  });
});
