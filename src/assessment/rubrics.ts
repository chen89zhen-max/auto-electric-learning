import type { LevelRubricDefinition, TrainingStageId } from './assessmentTypes';
import type { EvidenceDimensionId } from '@/src/types/evidence';

interface RubricSpec {
  SAFETY_SPECIFICATION: TrainingStageId[];
  CIRCUIT_READING: TrainingStageId[];
  TOOL_MEASUREMENT: TrainingStageId[];
  RULE_EXPLANATION: TrainingStageId[];
  DIAGNOSTIC_STRATEGY: TrainingStageId[];
  EVIDENCE_EXPRESSION: TrainingStageId[];
}

const C_SERIES_SPEC: RubricSpec = {
  SAFETY_SPECIFICATION: ['standard', 'transfer'],
  CIRCUIT_READING: ['cognition', 'calculation'],
  TOOL_MEASUREMENT: ['standard', 'blind_test'],
  RULE_EXPLANATION: ['calculation'],
  DIAGNOSTIC_STRATEGY: ['blind_test', 'transfer'],
  EVIDENCE_EXPRESSION: ['transfer'],
};

const D_E_STANDARD_SPEC: RubricSpec = {
  SAFETY_SPECIFICATION: ['standard'],
  CIRCUIT_READING: ['cognition', 'blind_test'],
  TOOL_MEASUREMENT: ['standard', 'blind_test'],
  RULE_EXPLANATION: ['calculation'],
  DIAGNOSTIC_STRATEGY: ['blind_test', 'transfer'],
  EVIDENCE_EXPRESSION: ['transfer'],
};

const E07_SPEC: RubricSpec = {
  SAFETY_SPECIFICATION: ['standard'],
  CIRCUIT_READING: ['cognition'],
  TOOL_MEASUREMENT: ['standard', 'blind_test', 'transfer'],
  RULE_EXPLANATION: ['calculation'],
  DIAGNOSTIC_STRATEGY: ['blind_test'],
  EVIDENCE_EXPRESSION: ['transfer'],
};

const DIMENSION_LABELS: Record<EvidenceDimensionId, string> = {
  SAFETY_SPECIFICATION: '安全规范',
  CIRCUIT_READING: '电路识读',
  TOOL_MEASUREMENT: '工具测量',
  RULE_EXPLANATION: '规律解释',
  DIAGNOSTIC_STRATEGY: '诊断策略',
  EVIDENCE_EXPRESSION: '证据表达',
};

function buildRubric(levelId: string, spec: RubricSpec): LevelRubricDefinition {
  const dimensionIds: EvidenceDimensionId[] = [
    'SAFETY_SPECIFICATION',
    'CIRCUIT_READING',
    'TOOL_MEASUREMENT',
    'RULE_EXPLANATION',
    'DIAGNOSTIC_STRATEGY',
    'EVIDENCE_EXPRESSION',
  ];

  return {
    levelId,
    rubricVersion: 'v2',
    dimensions: dimensionIds.map((id) => ({
      id,
      label: DIMENSION_LABELS[id],
      stages: spec[id],
    })),
  };
}

export const LEVEL_RUBRICS: Record<string, LevelRubricDefinition> = {
  C01: buildRubric('C01', C_SERIES_SPEC),
  C02: buildRubric('C02', C_SERIES_SPEC),
  C03: buildRubric('C03', C_SERIES_SPEC),

  D01: buildRubric('D01', D_E_STANDARD_SPEC),
  D02: buildRubric('D02', D_E_STANDARD_SPEC),
  D03: buildRubric('D03', D_E_STANDARD_SPEC),
  D04: buildRubric('D04', D_E_STANDARD_SPEC),
  D05: buildRubric('D05', D_E_STANDARD_SPEC),

  E01: buildRubric('E01', D_E_STANDARD_SPEC),
  E02: buildRubric('E02', D_E_STANDARD_SPEC),
  E03: buildRubric('E03', D_E_STANDARD_SPEC),
  E04: buildRubric('E04', D_E_STANDARD_SPEC),
  E05: buildRubric('E05', D_E_STANDARD_SPEC),
  E06: buildRubric('E06', D_E_STANDARD_SPEC),
  E07: buildRubric('E07', E07_SPEC),
};

export function getRubricForLevel(levelId: string): LevelRubricDefinition {
  const normalized = levelId.trim().toUpperCase();
  const rubric = LEVEL_RUBRICS[normalized];
  if (!rubric) {
    throw new Error(`未找到关卡 ${levelId} 的版本化评分量规 (rubric v2)`);
  }
  return rubric;
}

export function isAssessmentRequiredLevel(levelId: string): boolean {
  if (!levelId || typeof levelId !== 'string') return false;
  const normalized = levelId.trim().toUpperCase();
  return normalized in LEVEL_RUBRICS;
}
