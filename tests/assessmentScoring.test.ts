import { describe, expect, it } from 'vitest';
import { scoreAssessment } from '@/src/assessment/scoreAssessment';
import type { LevelAssessmentResult, StageAssessment, TrainingStageId } from '@/src/assessment/assessmentTypes';
import { getRubricForLevel } from '@/src/assessment/rubrics';
import { assessmentReducer, createInitialAssessment } from '@/src/assessment/assessmentReducer';

function makeFiveStageResult(
  levelId: string,
  overrides?: Partial<StageAssessment> & { durationMs?: number }
): LevelAssessmentResult {
  const startedAt = 1_700_000_000_000;
  const durationMs = overrides?.durationMs ?? 120_000;
  const completedAt = startedAt + durationMs;

  const stageIds: TrainingStageId[] = ['cognition', 'standard', 'calculation', 'blind_test', 'transfer'];
  const stageModes: Record<TrainingStageId, 'guided' | 'independent' | 'transfer'> = {
    cognition: 'guided',
    standard: 'guided',
    calculation: 'guided',
    blind_test: 'independent',
    transfer: 'transfer',
  };

  const stages: StageAssessment[] = stageIds.map((stageId, idx) => ({
    stageId,
    mode: stageModes[stageId],
    startedAt: startedAt + idx * 20_000,
    completedAt: startedAt + (idx + 1) * 20_000,
    wrongAttempts: overrides?.wrongAttempts ?? 0,
    hintRequests: overrides?.hintRequests ?? 0,
    meterGuardBlocks: overrides?.meterGuardBlocks ?? 0,
    unsafeActions: overrides?.unsafeActions ?? 0,
    retries: overrides?.retries ?? 0,
    completed: overrides?.completed ?? true,
  }));

  return {
    schemaVersion: 1,
    levelId,
    rubricVersion: 'v2',
    startedAt,
    completedAt,
    stages,
  };
}

function makeInvalidTimeResult(): LevelAssessmentResult {
  return {
    schemaVersion: 1,
    levelId: 'C01',
    rubricVersion: 'v2',
    startedAt: 1_700_000_100_000,
    completedAt: 1_700_000_000_000, // completed before started!
    stages: [],
  };
}

describe('Level Assessment & Server Rubric Scoring (Task 1)', () => {
  it('distinguishes clean, hinted, and unsafe completion', () => {
    const clean = scoreAssessment(makeFiveStageResult('C01'));
    const hinted = scoreAssessment(makeFiveStageResult('C01', { hintRequests: 1 }));
    const unsafe = scoreAssessment(makeFiveStageResult('C01', { meterGuardBlocks: 2, unsafeActions: 1 }));

    expect(clean.score).toBe(100);
    expect(hinted.score).toBeLessThan(clean.score);
    expect(unsafe.score).toBeLessThan(hinted.score);
    expect(clean.mode).toBe('transfer');
    expect(hinted.mode).toBe('guided');
  });

  it('allows severe mistakes to reduce a completed stage to zero quality', () => {
    const result = scoreAssessment(makeFiveStageResult('C01', { unsafeActions: 99 }));
    expect(result.score).toBe(0);
    expect(result.dimensions.every((dimension) => dimension.score === 0)).toBe(true);
  });

  it('starts local process evidence when the level is created and counts one hint per stage', () => {
    const now = 1_700_000_000_000;
    const initial = createInitialAssessment('C01', now);
    const firstHint = assessmentReducer(initial, { type: 'REQUEST_HINT', stageId: 'cognition' });
    const duplicateHint = assessmentReducer(firstHint, { type: 'REQUEST_HINT', stageId: 'cognition' });

    expect(initial.startedAt).toBe(now);
    expect(initial.stages[0].startedAt).toBe(now);
    expect(duplicateHint.stages[0].hintRequests).toBe(1);
  });

  it('uses real elapsed time and never accepts negative duration', () => {
    expect(scoreAssessment(makeFiveStageResult('E01', { durationMs: 180_000 })).durationMs).toBe(180_000);
    expect(() => scoreAssessment(makeInvalidTimeResult())).toThrow();
  });

  it('applies fixed star thresholds based on calculated score', () => {
    const result100 = scoreAssessment(makeFiveStageResult('C01'));
    expect(result100.score).toBe(100);
    expect(result100.dimensions.every((d) => d.stars === 5)).toBe(true);

    // With wrong attempts reducing score
    const resultSub = scoreAssessment(makeFiveStageResult('C01', { wrongAttempts: 2 }));
    expect(resultSub.score).toBeLessThan(100);
  });

  it('has explicit rubric mapping for all C01-E07 levels without runtime guessing', () => {
    const p4p5p6Levels = [
      'C01', 'C02', 'C03',
      'D01', 'D02', 'D03', 'D04', 'D05',
      'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07',
    ];

    for (const levelId of p4p5p6Levels) {
      const rubric = getRubricForLevel(levelId);
      expect(rubric).toBeDefined();
      expect(rubric.levelId).toBe(levelId);
      expect(rubric.dimensions.length).toBe(6);
    }
  });

  it('derives evidence status properly based on stage quality and mode', () => {
    const clean = scoreAssessment(makeFiveStageResult('C01'));
    // Transfer stage clean with quality 1.0 >= 0.8 yields TRANSFER_COMPLETE for associated dimensions
    expect(clean.evidence.EVIDENCE_EXPRESSION).toBe('TRANSFER_COMPLETE');
    expect(clean.evidence.DIAGNOSTIC_STRATEGY).toBe('TRANSFER_COMPLETE');

    // If transfer stage has high penalties (quality < 0.7)
    const degraded = scoreAssessment(makeFiveStageResult('C01', { wrongAttempts: 3, hintRequests: 1 }));
    expect(degraded.evidence.EVIDENCE_EXPRESSION).not.toBe('TRANSFER_COMPLETE');
  });

  it('scores F01 using rubric v2 with safety penalties on blind_test', () => {
    const perfectF01 = makeFiveStageResult('F01');
    expect(scoreAssessment(perfectF01).score).toBe(100);

    const unsafeResult = makeFiveStageResult('F01');
    const blindStage = unsafeResult.stages.find((s) => s.stageId === 'blind_test');
    if (blindStage) {
      blindStage.unsafeActions = 1;
    }
    const scoredUnsafe = scoreAssessment(unsafeResult);
    expect(scoredUnsafe.score).toBeLessThan(100);
    const safetyDim = scoredUnsafe.dimensions.find((d) => d.id === 'SAFETY_SPECIFICATION');
    expect(safetyDim).toBeDefined();
    expect(safetyDim!.score).toBeLessThan(100);
  });
});
