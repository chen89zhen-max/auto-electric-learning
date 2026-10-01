import type { C7EvidenceLevelId, ValidatedProcessEvidence } from '@/src/types/attemptEvidence';
import {
  hasSensitiveComparison,
  type SensitiveReading,
  type SensitiveResistorKind,
  STANDARD_RESISTOR_POOL,
} from '@/src/levels/a03/a03Training';
import {
  hasAllGateEvidence,
  GATE_REQUIRED_INPUTS,
  gateReadingKey,
  type GateReading,
  type LogicGateType,
} from '@/src/levels/e05/e05Training';

const ALLOWED_MODES = ['guided', 'independent', 'transfer'] as const;

const MAX_SERIALIZED_BYTES = 48 * 1024;
const MAX_STRING_LENGTH = 512;
const MAX_ARRAY_LENGTH = 100;
const MAX_DEPTH = 8;

export class ProcessEvidenceValidationError extends Error {
  constructor(public readonly category: 'MISSING_STAGE' | 'UNKNOWN_FIELD' | 'INVALID_VALUE' | 'TOO_LARGE') {
    super(`过程证据无效：${category}`);
    this.name = 'ProcessEvidenceValidationError';
  }
}

export const REQUIRED_STAGES = {
  A03: [
    'COLOR_CODE_CALC',
    'SAMPLE_MEASUREMENT',
    'POTENTIOMETER_TEST',
    'INDEPENDENT_EVAL',
    'TRANSFER_NTC',
  ],
  D02: [
    'LORENTZ_FORCE_AND_LEFT_HAND_RULE',
    'COMMUTATOR_AND_CONTINUOUS_ROTATION',
    'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL',
    'BLIND_DC_MOTOR_FAULT_ISOLATION',
    'ENGINEERING_REPAIR_AND_COMMISSIONING',
  ],
  E03: [
    'RECTIFIER_TOPOLOGY_COGNITION',
    'BRIDGE_WIRING_AND_MULTIMETER_TEST',
    'FILTER_CAPACITOR_AND_VOLTAGE_CALC',
    'BLIND_RECTIFIER_FAULT_DIAGNOSIS',
    'ENGINEERING_REPAIR_AND_DELIVERY',
  ],
  E05: [
    'LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE',
    'EXPERIMENT_BOX_TRUTH_VERIFICATION',
    'VEHICLE_SAFETY_INTERLOCK_LOGIC',
    'BLIND_LOGIC_IC_FAULT_DIAGNOSIS',
    'ENGINEERING_REPAIR_AND_DELIVERY',
  ],
} as const;

function checkScalarAndContainerLimits(raw: unknown, depth = 0): void {
  if (depth > MAX_DEPTH) {
    throw new ProcessEvidenceValidationError('TOO_LARGE');
  }
  if (typeof raw === 'string') {
    if (raw.length > MAX_STRING_LENGTH) {
      throw new ProcessEvidenceValidationError('TOO_LARGE');
    }
  } else if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) {
      throw new ProcessEvidenceValidationError('INVALID_VALUE');
    }
  } else if (Array.isArray(raw)) {
    if (raw.length > MAX_ARRAY_LENGTH) {
      throw new ProcessEvidenceValidationError('TOO_LARGE');
    }
    for (const item of raw) {
      checkScalarAndContainerLimits(item, depth + 1);
    }
  } else if (raw !== null && typeof raw === 'object') {
    for (const key of Object.keys(raw)) {
      if (key.length > MAX_STRING_LENGTH) {
        throw new ProcessEvidenceValidationError('TOO_LARGE');
      }
      checkScalarAndContainerLimits((raw as Record<string, unknown>)[key], depth + 1);
    }
  }
}

function expectPlainObject(val: unknown): Record<string, unknown> {
  if (val === null || typeof val !== 'object' || Array.isArray(val)) {
    throw new ProcessEvidenceValidationError('INVALID_VALUE');
  }
  return val as Record<string, unknown>;
}

function expectOnlyKeys(obj: Record<string, unknown>, allowedKeys: readonly string[]): void {
  const allowedSet = new Set(allowedKeys);
  for (const key of Object.keys(obj)) {
    if (!allowedSet.has(key)) {
      throw new ProcessEvidenceValidationError('UNKNOWN_FIELD');
    }
  }
}

function expectFiniteNumber(val: unknown, min?: number, max?: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    throw new ProcessEvidenceValidationError('INVALID_VALUE');
  }
  if (min !== undefined && val < min) {
    throw new ProcessEvidenceValidationError('INVALID_VALUE');
  }
  if (max !== undefined && val > max) {
    throw new ProcessEvidenceValidationError('INVALID_VALUE');
  }
  return val;
}

function expectString(val: unknown, allowed?: readonly string[]): string {
  if (typeof val !== 'string' || val.length > MAX_STRING_LENGTH) {
    throw new ProcessEvidenceValidationError('INVALID_VALUE');
  }
  if (allowed && !allowed.includes(val)) {
    throw new ProcessEvidenceValidationError('INVALID_VALUE');
  }
  return val;
}

function expectBoolean(val: unknown): boolean {
  if (typeof val !== 'boolean') {
    throw new ProcessEvidenceValidationError('INVALID_VALUE');
  }
  return val;
}

function expectStringArray(val: unknown): string[] {
  if (!Array.isArray(val) || val.length > MAX_ARRAY_LENGTH) {
    throw new ProcessEvidenceValidationError('INVALID_VALUE');
  }
  return val.map((item) => expectString(item));
}

function expectNumberArray(val: unknown): number[] {
  if (!Array.isArray(val) || val.length > MAX_ARRAY_LENGTH) {
    throw new ProcessEvidenceValidationError('INVALID_VALUE');
  }
  return val.map((item) => expectFiniteNumber(item));
}

function validateA03Step(stepName: string, data: unknown): Record<string, unknown> {
  const obj = expectPlainObject(data);
  switch (stepName) {
    case 'COLOR_CODE_CALC': {
      expectOnlyKeys(obj, ['resistorId', 'resistorName', 'nominal', 'tolerance', 'min', 'max', 'mode']);
      return {
        resistorId: expectString(obj.resistorId, STANDARD_RESISTOR_POOL.map((r) => r.id)),
        resistorName: expectString(obj.resistorName),
        nominal: expectFiniteNumber(obj.nominal, 0),
        tolerance: expectFiniteNumber(obj.tolerance, 0, 100),
        min: expectFiniteNumber(obj.min, 0),
        max: expectFiniteNumber(obj.max, 0),
        ...(obj.mode !== undefined ? { mode: expectString(obj.mode, ALLOWED_MODES) } : {}),
      };
    }
    case 'SAMPLE_MEASUREMENT': {
      expectOnlyKeys(obj, ['sampleA', 'sampleB', 'sampleC', 'v04Passed', 'v05Encountered', 'mode']);
      let sampleCVal: string | number;
      if (typeof obj.sampleC === 'string') {
        if (obj.sampleC !== 'O.L') {
          const parsed = Number(obj.sampleC);
          if (!Number.isFinite(parsed) || parsed < 0) {
            throw new ProcessEvidenceValidationError('INVALID_VALUE');
          }
        }
        sampleCVal = obj.sampleC;
      } else if (typeof obj.sampleC === 'number') {
        sampleCVal = expectFiniteNumber(obj.sampleC, 0);
      } else {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }

      return {
        sampleA: expectFiniteNumber(obj.sampleA, 0),
        sampleB: expectFiniteNumber(obj.sampleB, 0),
        sampleC: sampleCVal,
        v04Passed: expectBoolean(obj.v04Passed),
        v05Encountered: expectBoolean(obj.v05Encountered),
        ...(obj.mode !== undefined ? { mode: expectString(obj.mode, ALLOWED_MODES) } : {}),
      };
    }
    case 'POTENTIOMETER_TEST': {
      expectOnlyKeys(obj, ['totalResistance', 'recordedPoints', 'v04PotentiometerPassed', 'mode']);
      const recordedPoints = expectStringArray(obj.recordedPoints);
      if (recordedPoints.length === 0) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }
      return {
        totalResistance: expectFiniteNumber(obj.totalResistance, 0),
        recordedPoints,
        v04PotentiometerPassed: expectBoolean(obj.v04PotentiometerPassed),
        ...(obj.mode !== undefined ? { mode: expectString(obj.mode, ALLOWED_MODES) } : {}),
      };
    }
    case 'INDEPENDENT_EVAL': {
      expectOnlyKeys(obj, ['choice', 'measured', 'passed', 'mode']);
      return {
        choice: expectString(obj.choice, ['985_QUALIFIED', '985_OUT', '985_BROKEN']),
        measured: expectFiniteNumber(obj.measured, 0),
        passed: expectBoolean(obj.passed),
        ...(obj.mode !== undefined ? { mode: expectString(obj.mode, ALLOWED_MODES) } : {}),
      };
    }
    case 'TRANSFER_NTC': {
      expectOnlyKeys(obj, ['choice', 'passed', 'coolantTemp', 'sensitiveResistors', 'mode']);
      const sensitive = expectPlainObject(obj.sensitiveResistors);
      expectOnlyKeys(sensitive, ['points', 'trends']);
      const pointsObj = expectPlainObject(sensitive.points);
      expectOnlyKeys(pointsObj, ['NTC', 'LDR', 'FSR']);
      const trendsObj = expectPlainObject(sensitive.trends);
      expectOnlyKeys(trendsObj, ['NTC', 'LDR', 'FSR']);

      const validatedPoints: Record<SensitiveResistorKind, SensitiveReading[]> = {
        NTC: [],
        LDR: [],
        FSR: [],
      };
      const kinds: SensitiveResistorKind[] = ['NTC', 'LDR', 'FSR'];
      for (const kind of kinds) {
        if (!Array.isArray(pointsObj[kind])) {
          throw new ProcessEvidenceValidationError('INVALID_VALUE');
        }
        const pts = pointsObj[kind] as unknown[];
        if (pts.length < 2) {
          throw new ProcessEvidenceValidationError('INVALID_VALUE');
        }
        validatedPoints[kind] = pts.map((pt) => {
          const ptObj = expectPlainObject(pt);
          expectOnlyKeys(ptObj, ['condition', 'resistance']);
          return {
            condition: expectFiniteNumber(ptObj.condition),
            resistance: expectFiniteNumber(ptObj.resistance, 0),
          };
        });

        if (!hasSensitiveComparison(validatedPoints[kind])) {
          throw new ProcessEvidenceValidationError('INVALID_VALUE');
        }
      }

      const validatedTrends: Record<SensitiveResistorKind, string> = {
        NTC: expectString(trendsObj.NTC, ['increase', 'decrease']),
        LDR: expectString(trendsObj.LDR, ['increase', 'decrease']),
        FSR: expectString(trendsObj.FSR, ['increase', 'decrease']),
      };

      return {
        choice: expectString(obj.choice, ['NTC_NORMAL', 'NTC_FAIL']),
        passed: expectBoolean(obj.passed),
        coolantTemp: expectFiniteNumber(obj.coolantTemp),
        sensitiveResistors: {
          points: validatedPoints,
          trends: validatedTrends,
        },
        ...(obj.mode !== undefined ? { mode: expectString(obj.mode, ALLOWED_MODES) } : {}),
      };
    }
    default:
      throw new ProcessEvidenceValidationError('UNKNOWN_FIELD');
  }
}

function validateD02Step(stepName: string, data: unknown): Record<string, unknown> {
  const obj = expectPlainObject(data);
  switch (stepName) {
    case 'LORENTZ_FORCE_AND_LEFT_HAND_RULE': {
      expectOnlyKeys(obj, ['choice']);
      return { choice: expectString(obj.choice, ['RIGHT', 'LEFT', 'UP', 'A', 'B', 'C']) };
    }
    case 'COMMUTATOR_AND_CONTINUOUS_ROTATION': {
      expectOnlyKeys(obj, ['choice', 'inductionMotor']);
      const ind = expectPlainObject(obj.inductionMotor);
      expectOnlyKeys(ind, ['parts', 'observedSpeeds', 'slipPercent', 'mechanism', 'verified']);
      const parts = expectStringArray(ind.parts);
      if (parts.length !== 2 || !parts.includes('定子') || !parts.includes('鼠笼转子')) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }
      const observedSpeeds = expectNumberArray(ind.observedSpeeds);
      const uniqueSpeeds = new Set(observedSpeeds);
      if (observedSpeeds.length < 2 || uniqueSpeeds.size < 2 || observedSpeeds.some((s) => s < 0)) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }
      if (ind.verified !== true) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }
      return {
        choice: expectString(obj.choice, ['A', 'B', 'C']),
        inductionMotor: {
          parts,
          observedSpeeds,
          slipPercent: expectFiniteNumber(ind.slipPercent, 0, 100),
          mechanism: expectString(ind.mechanism, ['INDUCTION']),
          verified: true,
        },
      };
    }
    case 'H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL': {
      expectOnlyKeys(obj, ['choice']);
      return { choice: expectString(obj.choice, ['A', 'B', 'C']) };
    }
    case 'BLIND_DC_MOTOR_FAULT_ISOLATION': {
      expectOnlyKeys(obj, ['caseId', 'choice']);
      return {
        caseId: expectString(obj.caseId, [
          'CASE_RELAY_A_OXIDIZED',
          'CASE_BRUSH_WORN',
          'CASE_TRACK_JAM',
          'CASE_1',
          'CASE_2',
          'CASE_3',
        ]),
        choice: expectString(obj.choice, [
          'RELAY_A_OXIDIZED',
          'BRUSH_WORN',
          'TRACK_JAM',
          'A',
          'B',
          'C',
        ]),
      };
    }
    case 'ENGINEERING_REPAIR_AND_COMMISSIONING': {
      expectOnlyKeys(obj, ['repaired', 'current', 'signed']);
      if (obj.repaired !== true || obj.signed !== true) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }
      return {
        repaired: true,
        current: expectFiniteNumber(obj.current, 0, 50),
        signed: true,
      };
    }
    default:
      throw new ProcessEvidenceValidationError('UNKNOWN_FIELD');
  }
}

function validateE03Step(stepName: string, data: unknown): Record<string, unknown> {
  const obj = expectPlainObject(data);
  switch (stepName) {
    case 'RECTIFIER_TOPOLOGY_COGNITION': {
      expectOnlyKeys(obj, ['s1Choice', 's1Topology', 'threePhase']);
      const tp = expectPlainObject(obj.threePhase);
      expectOnlyKeys(tp, ['observedAngles', 'pair', 'pulses', 'verified']);
      const observedAngles = expectNumberArray(tp.observedAngles);
      if (observedAngles.length === 0) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }
      if (tp.verified !== true) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }
      return {
        s1Choice: expectString(obj.s1Choice, ['A', 'B', 'C']),
        s1Topology: expectString(obj.s1Topology, ['HALF_WAVE', 'FULL_BRIDGE']),
        threePhase: {
          observedAngles,
          pair: expectString(tp.pair, ['U-V', 'U-W', 'V-W', 'V-U', 'W-U', 'W-V', 'U', 'V', 'W']),
          pulses: expectFiniteNumber(tp.pulses, 1),
          verified: true,
        },
      };
    }
    case 'BRIDGE_WIRING_AND_MULTIMETER_TEST': {
      expectOnlyKeys(obj, ['s2Choice', 's2SelectedArm']);
      return {
        s2Choice: expectString(obj.s2Choice, ['A', 'B', 'C']),
        s2SelectedArm: expectString(obj.s2SelectedArm, ['D1', 'D2', 'D3', 'D4']),
      };
    }
    case 'FILTER_CAPACITOR_AND_VOLTAGE_CALC': {
      expectOnlyKeys(obj, ['s3Choice', 's3HasCapacitor', 'regulation', 'modelScope', 'filteredOutput']);
      const fo = expectPlainObject(obj.filteredOutput);
      expectOnlyKeys(fo, ['uDc', 'rippleVpp']);
      if (obj.s3HasCapacitor !== true) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }
      return {
        s3Choice: expectString(obj.s3Choice, ['A', 'B', 'C']),
        s3HasCapacitor: true,
        regulation: expectString(obj.regulation, ['FIELD_REGULATION']),
        modelScope: expectString(obj.modelScope, ['SINGLE_PHASE_BENCH']),
        filteredOutput: {
          uDc: expectFiniteNumber(fo.uDc, 0),
          rippleVpp: expectFiniteNumber(fo.rippleVpp, 0),
        },
      };
    }
    case 'BLIND_RECTIFIER_FAULT_DIAGNOSIS': {
      expectOnlyKeys(obj, ['s4Diagnoses']);
      const diag = expectPlainObject(obj.s4Diagnoses);
      const expectedSamples = ['RECT_1', 'RECT_2', 'RECT_3', 'RECT_4'];
      expectOnlyKeys(diag, expectedSamples);
      if (Object.keys(diag).length !== 4) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }
      const allowedFaults = ['NORMAL', 'GOOD', 'DIODE_SHORT', 'DIODE_OPEN', 'CAP_DISCONNECTED'];
      const cleanDiag: Record<string, string> = {};
      for (const k of expectedSamples) {
        cleanDiag[k] = expectString(diag[k], allowedFaults);
      }
      return { s4Diagnoses: cleanDiag };
    }
    case 'ENGINEERING_REPAIR_AND_DELIVERY': {
      expectOnlyKeys(obj, ['s5Repaired', 's5EngineRunning']);
      if (obj.s5Repaired !== true || obj.s5EngineRunning !== true) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }
      return {
        s5Repaired: true,
        s5EngineRunning: true,
      };
    }
    default:
      throw new ProcessEvidenceValidationError('UNKNOWN_FIELD');
  }
}

function validateE05Step(stepName: string, data: unknown): Record<string, unknown> {
  const obj = expectPlainObject(data);
  switch (stepName) {
    case 'LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE': {
      expectOnlyKeys(obj, ['s1Choice', 's1Gate', 'gateReadings']);
      const readings = expectPlainObject(obj.gateReadings);

      // Verify the exact 14 gate keys
      const expectedKeys: string[] = [];
      (Object.keys(GATE_REQUIRED_INPUTS) as LogicGateType[]).forEach((gate) => {
        GATE_REQUIRED_INPUTS[gate].forEach((inp) => {
          const a = inp[0] === '1';
          const b = inp.length > 1 ? inp[1] === '1' : false;
          expectedKeys.push(gateReadingKey(gate, a, b));
        });
      });
      if (expectedKeys.length !== 14) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }

      expectOnlyKeys(readings, expectedKeys);
      if (Object.keys(readings).length !== 14) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }

      const cleanReadings: Record<string, GateReading> = {};
      for (const key of expectedKeys) {
        const r = expectPlainObject(readings[key]);
        expectOnlyKeys(r, ['gate', 'a', 'b', 'output']);
        const item: GateReading = {
          gate: expectString(r.gate, ['AND', 'OR', 'NOT', 'NAND', 'NOR']) as LogicGateType,
          a: expectBoolean(r.a),
          b: expectBoolean(r.b),
          output: expectBoolean(r.output),
        };
        cleanReadings[key] = item;
      }

      if (!hasAllGateEvidence(cleanReadings)) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }

      return {
        s1Choice: expectString(obj.s1Choice, ['A', 'B', 'C']),
        s1Gate: expectString(obj.s1Gate, ['AND', 'OR', 'NOT', 'NAND', 'NOR']),
        gateReadings: cleanReadings,
      };
    }
    case 'EXPERIMENT_BOX_TRUTH_VERIFICATION': {
      expectOnlyKeys(obj, ['s2Choice', 's2VerifiedRows']);
      const rows = expectPlainObject(obj.s2VerifiedRows);
      const expectedRows = ['00', '01', '10', '11'];
      expectOnlyKeys(rows, expectedRows);
      if (Object.keys(rows).length !== 4) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }
      const cleanRows: Record<string, boolean> = {};
      for (const k of expectedRows) {
        cleanRows[k] = expectBoolean(rows[k]);
      }
      return {
        s2Choice: expectString(obj.s2Choice, ['A', 'B', 'C']),
        s2VerifiedRows: cleanRows,
      };
    }
    case 'VEHICLE_SAFETY_INTERLOCK_LOGIC': {
      expectOnlyKeys(obj, ['s3Choice', 's3AlarmTriggered']);
      return {
        s3Choice: expectString(obj.s3Choice, ['A', 'B', 'C']),
        s3AlarmTriggered: expectBoolean(obj.s3AlarmTriggered),
      };
    }
    case 'BLIND_LOGIC_IC_FAULT_DIAGNOSIS': {
      expectOnlyKeys(obj, ['s4Diagnoses']);
      const diag = expectPlainObject(obj.s4Diagnoses);
      const expectedIcs = ['IC_1', 'IC_2', 'IC_3', 'IC_4'];
      expectOnlyKeys(diag, expectedIcs);
      if (Object.keys(diag).length !== 4) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }
      const allowedFaults = ['GOOD', 'VCC_DISCONNECTED', 'INPUT_FLOATING', 'OUTPUT_SHORT_GND'];
      const cleanDiag: Record<string, string> = {};
      for (const k of expectedIcs) {
        cleanDiag[k] = expectString(diag[k], allowedFaults);
      }
      return { s4Diagnoses: cleanDiag };
    }
    case 'ENGINEERING_REPAIR_AND_DELIVERY': {
      expectOnlyKeys(obj, ['s5Repaired', 's5BuckleState']);
      if (obj.s5Repaired !== true) {
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
      }
      return {
        s5Repaired: true,
        s5BuckleState: expectString(obj.s5BuckleState, ['LATCHED', 'BUCKLED', 'UNLATCHED']),
      };
    }
    default:
      throw new ProcessEvidenceValidationError('UNKNOWN_FIELD');
  }
}

export function validateProcessEvidence(
  levelId: C7EvidenceLevelId,
  metrics: unknown,
): ValidatedProcessEvidence {
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) {
    throw new ProcessEvidenceValidationError('INVALID_VALUE');
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(metrics);
  } catch {
    throw new ProcessEvidenceValidationError('INVALID_VALUE');
  }

  if (new TextEncoder().encode(serialized).length > MAX_SERIALIZED_BYTES) {
    throw new ProcessEvidenceValidationError('TOO_LARGE');
  }

  checkScalarAndContainerLimits(metrics, 0);

  const metricsObj = metrics as Record<string, unknown>;
  const requiredStages = REQUIRED_STAGES[levelId];
  if (!requiredStages) {
    throw new ProcessEvidenceValidationError('INVALID_VALUE');
  }

  expectOnlyKeys(metricsObj, requiredStages);

  for (const stage of requiredStages) {
    if (!(stage in metricsObj) || metricsObj[stage] === undefined || metricsObj[stage] === null) {
      throw new ProcessEvidenceValidationError('MISSING_STAGE');
    }
  }

  const steps: Record<string, Record<string, unknown>> = {};

  for (const stage of requiredStages) {
    const rawStepData = metricsObj[stage];
    let validatedStep: Record<string, unknown>;
    switch (levelId) {
      case 'A03':
        validatedStep = validateA03Step(stage, rawStepData);
        break;
      case 'D02':
        validatedStep = validateD02Step(stage, rawStepData);
        break;
      case 'E03':
        validatedStep = validateE03Step(stage, rawStepData);
        break;
      case 'E05':
        validatedStep = validateE05Step(stage, rawStepData);
        break;
      default:
        throw new ProcessEvidenceValidationError('INVALID_VALUE');
    }
    steps[stage] = validatedStep;
  }

  return { steps };
}
