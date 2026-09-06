import type {
  LevelAssessmentResult,
  ScoredAssessment,
  StageAssessment,
  TrainingStageId,
} from './assessmentTypes';
import { getRubricForLevel } from './rubrics';
import type { EvidenceDimensionId, EvidenceStatus } from '@/src/types/evidence';

const STAGE_MAX_POINTS: Record<TrainingStageId, number> = {
  cognition: 10,
  standard: 20,
  calculation: 20,
  blind_test: 25,
  transfer: 25,
};

export function scoreAssessment(result: LevelAssessmentResult): ScoredAssessment {
  if (!result || typeof result !== 'object') {
    throw new Error('无效的评测结果对象');
  }

  if (result.schemaVersion !== 1 || result.rubricVersion !== 'v2') {
    throw new Error(`不支持的评测版本：schema=${result.schemaVersion}, rubric=${result.rubricVersion}`);
  }

  if (!result.levelId || typeof result.levelId !== 'string') {
    throw new Error('评测结果缺少关卡编号 (levelId)');
  }

  if (
    !Number.isInteger(result.startedAt) ||
    !Number.isInteger(result.completedAt) ||
    result.startedAt < 0 ||
    result.completedAt < 0
  ) {
    throw new Error('评测时间戳必须为有效的非负整数');
  }

  if (result.completedAt < result.startedAt) {
    throw new Error(`评测结束时间 (${result.completedAt}) 早于开始时间 (${result.startedAt})`);
  }

  const durationMs = result.completedAt - result.startedAt;

  const stageMap = new Map<TrainingStageId, StageAssessment>();
  for (const s of result.stages || []) {
    stageMap.set(s.stageId, s);
  }

  let totalWrong = 0;
  let totalHints = 0;
  let totalMeterBlocked = 0;
  let totalUnsafe = 0;
  let totalRetries = 0;

  const stageQualities = new Map<TrainingStageId, number>();
  let weightedPointsSum = 0;

  const stageOrder: TrainingStageId[] = ['cognition', 'standard', 'calculation', 'blind_test', 'transfer'];

  for (const stageId of stageOrder) {
    const stage = stageMap.get(stageId);
    const maxPts = STAGE_MAX_POINTS[stageId];

    if (!stage || !stage.completed) {
      stageQualities.set(stageId, 0);
      continue;
    }

    const wrong = Math.max(0, stage.wrongAttempts || 0);
    const hints = Math.max(0, stage.hintRequests || 0);
    const meterBlocks = Math.max(0, stage.meterGuardBlocks || 0);
    const unsafe = Math.max(0, stage.unsafeActions || 0);
    const retries = Math.max(0, stage.retries || 0);

    totalWrong += wrong;
    totalHints += hints;
    totalMeterBlocked += meterBlocks;
    totalUnsafe += unsafe;
    totalRetries += retries;

    const penalty =
      0.12 * wrong +
      0.15 * hints +
      0.20 * meterBlocks +
      0.30 * unsafe +
      0.05 * retries;

    const quality = Math.min(1.0, Math.max(0.4, 1 - penalty));
    stageQualities.set(stageId, quality);
    weightedPointsSum += maxPts * quality;
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(weightedPointsSum)));

  // Mode derivation
  let mode: 'guided' | 'independent' | 'transfer';
  const transferStage = stageMap.get('transfer');
  const blindTestStage = stageMap.get('blind_test');

  if (totalHints > 0) {
    mode = 'guided';
  } else if (transferStage?.completed && transferStage.mode === 'transfer') {
    mode = 'transfer';
  } else if (blindTestStage?.completed && blindTestStage.mode === 'independent') {
    mode = 'independent';
  } else {
    mode = 'guided';
  }

  // Dimension & Evidence calculation
  const rubric = getRubricForLevel(result.levelId);
  const dimensions: Array<{ id: EvidenceDimensionId; label: string; score: number; stars: number }> = [];
  const evidence: Partial<Record<EvidenceDimensionId, EvidenceStatus>> = {};

  for (const dim of rubric.dimensions) {
    const associatedStages = dim.stages.map((stId) => ({
      stageId: stId,
      stage: stageMap.get(stId),
      quality: stageQualities.get(stId) ?? 0,
    }));

    const allCompleted = associatedStages.length > 0 && associatedStages.every((s) => s.stage?.completed);

    let dimScore = 0;
    if (allCompleted) {
      const avgQuality = associatedStages.reduce((sum, s) => sum + s.quality, 0) / associatedStages.length;
      dimScore = Math.min(100, Math.max(0, Math.round(avgQuality * 100)));
    }

    const stars =
      dimScore >= 90 ? 5 :
      dimScore >= 80 ? 4 :
      dimScore >= 70 ? 3 :
      dimScore >= 60 ? 2 :
      1;

    dimensions.push({
      id: dim.id,
      label: dim.label,
      score: dimScore,
      stars,
    });

    // Evidence status derivation
    if (!allCompleted) {
      evidence[dim.id] = 'NO_EVIDENCE';
    } else {
      const transferAssoc = associatedStages.find((s) => s.stageId === 'transfer');
      const blindAssoc = associatedStages.find((s) => s.stageId === 'blind_test');

      if (transferAssoc && transferAssoc.quality >= 0.8 && transferAssoc.stage?.mode === 'transfer') {
        evidence[dim.id] = 'TRANSFER_COMPLETE';
      } else if (
        (blindAssoc && blindAssoc.quality >= 0.7 && (blindAssoc.stage?.mode === 'independent' || blindAssoc.stage?.mode === 'transfer')) ||
        (transferAssoc && transferAssoc.quality >= 0.7 && (transferAssoc.stage?.mode === 'independent' || transferAssoc.stage?.mode === 'transfer'))
      ) {
        evidence[dim.id] = 'INDEPENDENT_COMPLETE';
      } else {
        evidence[dim.id] = 'GUIDED_COMPLETE';
      }
    }
  }

  return {
    score: finalScore,
    durationMs,
    mode,
    dimensions,
    evidence,
    counters: {
      wrongAttempts: totalWrong,
      hintRequests: totalHints,
      meterGuardBlocks: totalMeterBlocked,
      unsafeActions: totalUnsafe,
      retries: totalRetries,
    },
  };
}
