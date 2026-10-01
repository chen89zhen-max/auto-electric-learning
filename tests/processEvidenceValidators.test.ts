import { describe, expect, it } from 'vitest';
import {
  makeValidA03Metrics,
  makeValidD02Metrics,
  makeValidE03Metrics,
  makeValidE05Metrics,
} from './helpers/c7EvidenceFixtures';
import {
  ProcessEvidenceValidationError,
  validateProcessEvidence,
} from '@/src/server/learning/processEvidenceValidators';
import type { C7EvidenceLevelId } from '@/src/types/attemptEvidence';

function deepFreeze<T extends object>(obj: T): T {
  Object.keys(obj).forEach((prop) => {
    const val = (obj as Record<string, unknown>)[prop];
    if (val !== null && (typeof val === 'object' || typeof val === 'function')) {
      deepFreeze(val as object);
    }
  });
  return Object.freeze(obj);
}

describe('processEvidenceValidators', () => {
  it('accepts and clones complete A03/D02/E03/E05 evidence', () => {
    const levels: Array<{ id: C7EvidenceLevelId; builder: () => Record<string, unknown> }> = [
      { id: 'A03', builder: makeValidA03Metrics },
      { id: 'D02', builder: makeValidD02Metrics },
      { id: 'E03', builder: makeValidE03Metrics },
      { id: 'E05', builder: makeValidE05Metrics },
    ];

    for (const { id, builder } of levels) {
      const input = builder();
      const validated = validateProcessEvidence(id, input);

      expect(validated).toBeDefined();
      expect(typeof validated.steps).toBe('object');
      const stepKeys = Object.keys(validated.steps);
      expect(stepKeys).toHaveLength(5);
      expect(validated.steps).not.toBe(input);

      for (const key of stepKeys) {
        expect(validated.steps[key]).not.toBe(input[key]);
        expect(validated.steps[key]).toEqual(input[key]);
      }
    }
  });

  it('rejects a missing required stage', () => {
    const levels: Array<{ id: C7EvidenceLevelId; builder: () => Record<string, unknown> }> = [
      { id: 'A03', builder: makeValidA03Metrics },
      { id: 'D02', builder: makeValidD02Metrics },
      { id: 'E03', builder: makeValidE03Metrics },
      { id: 'E05', builder: makeValidE05Metrics },
    ];

    for (const { id, builder } of levels) {
      const input = builder();
      const keys = Object.keys(input);
      const lastKey = keys[keys.length - 1];
      delete input[lastKey];

      expect(() => validateProcessEvidence(id, input)).toThrow(ProcessEvidenceValidationError);
      try {
        validateProcessEvidence(id, input);
      } catch (err) {
        expect(err).toBeInstanceOf(ProcessEvidenceValidationError);
        expect((err as ProcessEvidenceValidationError).category).toBe('MISSING_STAGE');
      }
    }
  });

  it('rejects an unknown stage and unknown field', () => {
    // 1. Root unknown stage
    const a03WithUnknownStage = makeValidA03Metrics();
    a03WithUnknownStage.FAKE_STAGE = { foo: 'bar' };
    expect(() => validateProcessEvidence('A03', a03WithUnknownStage)).toThrow(ProcessEvidenceValidationError);
    try {
      validateProcessEvidence('A03', a03WithUnknownStage);
    } catch (err) {
      expect((err as ProcessEvidenceValidationError).category).toBe('UNKNOWN_FIELD');
    }

    // 2. Child unknown field
    const e03WithUnknownField = makeValidE03Metrics();
    (e03WithUnknownField.RECTIFIER_TOPOLOGY_COGNITION as Record<string, unknown>).adminOverride = true;
    expect(() => validateProcessEvidence('E03', e03WithUnknownField)).toThrow(ProcessEvidenceValidationError);
    try {
      validateProcessEvidence('E03', e03WithUnknownField);
    } catch (err) {
      expect((err as ProcessEvidenceValidationError).category).toBe('UNKNOWN_FIELD');
    }
  });

  it('rejects unsafe scalar and container limits', () => {
    // NaN
    const d02WithNaN = makeValidD02Metrics();
    (d02WithNaN.ENGINEERING_REPAIR_AND_COMMISSIONING as Record<string, unknown>).current = NaN;
    try {
      validateProcessEvidence('D02', d02WithNaN);
      expect.unreachable('Should have thrown on NaN');
    } catch (err) {
      expect((err as ProcessEvidenceValidationError).category).toBe('INVALID_VALUE');
    }

    // Infinity
    const d02WithInf = makeValidD02Metrics();
    (d02WithInf.ENGINEERING_REPAIR_AND_COMMISSIONING as Record<string, unknown>).current = Infinity;
    try {
      validateProcessEvidence('D02', d02WithInf);
      expect.unreachable('Should have thrown on Infinity');
    } catch (err) {
      expect((err as ProcessEvidenceValidationError).category).toBe('INVALID_VALUE');
    }

    // 9th nesting level
    const a03Deep: Record<string, unknown> = makeValidA03Metrics();
    let curr: Record<string, unknown> = a03Deep;
    for (let i = 0; i < 9; i++) {
      const next: Record<string, unknown> = {};
      curr[`level_${i}`] = next;
      curr = next;
    }
    try {
      validateProcessEvidence('A03', a03Deep);
      expect.unreachable('Should have thrown on deep nesting');
    } catch (err) {
      expect(['TOO_LARGE', 'UNKNOWN_FIELD']).toContain((err as ProcessEvidenceValidationError).category);
    }

    // Array of 101 entries
    const d02BigArray = makeValidD02Metrics();
    (d02BigArray.COMMUTATOR_AND_CONTINUOUS_ROTATION as Record<string, unknown>).inductionMotor = {
      parts: ['定子', '鼠笼转子'],
      observedSpeeds: Array.from({ length: 101 }, () => 1440),
      slipPercent: 4,
      mechanism: 'INDUCTION',
      verified: true,
    };
    try {
      validateProcessEvidence('D02', d02BigArray);
      expect.unreachable('Should have thrown on array of 101 entries');
    } catch (err) {
      expect(['TOO_LARGE', 'INVALID_VALUE']).toContain((err as ProcessEvidenceValidationError).category);
    }

    // 513-character string
    const a03LongStr = makeValidA03Metrics();
    (a03LongStr.COLOR_CODE_CALC as Record<string, unknown>).resistorName = 'A'.repeat(513);
    try {
      validateProcessEvidence('A03', a03LongStr);
      expect.unreachable('Should have thrown on 513-char string');
    } catch (err) {
      expect(['TOO_LARGE', 'INVALID_VALUE']).toContain((err as ProcessEvidenceValidationError).category);
    }
  });

  it('does not mutate the submitted metrics object', () => {
    const input = makeValidE03Metrics();
    const untouchedClone = JSON.parse(JSON.stringify(input));
    deepFreeze(input);

    const validated = validateProcessEvidence('E03', input);
    expect(validated).toBeDefined();
    expect(input).toEqual(untouchedClone);
  });

  it('rejects fabricated E03 legacy stage names and fields', () => {
    // 1. replace real step 1 with THREE_PHASE_RECTIFIER_IDENTIFICATION
    const e03BadStep1 = makeValidE03Metrics();
    e03BadStep1.THREE_PHASE_RECTIFIER_IDENTIFICATION = e03BadStep1.RECTIFIER_TOPOLOGY_COGNITION;
    delete e03BadStep1.RECTIFIER_TOPOLOGY_COGNITION;
    expect(() => validateProcessEvidence('E03', e03BadStep1)).toThrow();

    // 2. replace step 2 with BRIDGE_DIODE_CHECK
    const e03BadStep2 = makeValidE03Metrics();
    e03BadStep2.BRIDGE_DIODE_CHECK = e03BadStep2.BRIDGE_WIRING_AND_MULTIMETER_TEST;
    delete e03BadStep2.BRIDGE_WIRING_AND_MULTIMETER_TEST;
    expect(() => validateProcessEvidence('E03', e03BadStep2)).toThrow();

    // 3. add faultClassifications
    const e03WithFaultClass = makeValidE03Metrics();
    (e03WithFaultClass.BLIND_RECTIFIER_FAULT_DIAGNOSIS as Record<string, unknown>).faultClassifications = ['DIODE_SHORT'];
    expect(() => validateProcessEvidence('E03', e03WithFaultClass)).toThrow();
  });

  it('rejects E05 evidence with a missing key or fabricated fifteenth key', () => {
    // Missing key
    const e05Missing = makeValidE05Metrics();
    const readings = (e05Missing.LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE as Record<string, unknown>).gateReadings as Record<string, unknown>;
    delete readings['AND:11'];
    expect(() => validateProcessEvidence('E05', e05Missing)).toThrow();

    // Fabricated 15th key
    const e05Fabricated = makeValidE05Metrics();
    const readings2 = (e05Fabricated.LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE as Record<string, unknown>).gateReadings as Record<string, unknown>;
    readings2['AND:00'] = { gate: 'AND', a: false, b: false, output: false };
    expect(() => validateProcessEvidence('E05', e05Fabricated)).toThrow();
  });

  it('rejects A03 sensitive readings without the required condition span', () => {
    const a03NarrowSpan = makeValidA03Metrics();
    const sensitive = (a03NarrowSpan.TRANSFER_NTC as Record<string, unknown>).sensitiveResistors as Record<string, unknown>;
    const points = sensitive.points as Record<string, Array<{ condition: number; resistance: number }>>;
    // condition 0 and 39 (span = 39 < 40)
    points.LDR = [
      { condition: 0, resistance: 10000 },
      { condition: 39, resistance: 2000 },
    ];
    expect(() => validateProcessEvidence('A03', a03NarrowSpan)).toThrow();
  });

  it('rejects D02 induction evidence without two observed speeds', () => {
    const d02OneSpeed = makeValidD02Metrics();
    const commutator = d02OneSpeed.COMMUTATOR_AND_CONTINUOUS_ROTATION as Record<string, unknown>;
    const induction = commutator.inductionMotor as Record<string, unknown>;
    induction.observedSpeeds = [1440];
    expect(() => validateProcessEvidence('D02', d02OneSpeed)).toThrow();
  });

  it('never leaks submitted raw json in ProcessEvidenceValidationError message', () => {
    const invalid = {
      SECRET_DATA: 'SUPER_SECRET_PAYLOAD_12345',
      ...makeValidE03Metrics(),
    };
    expect(() => validateProcessEvidence('E03', invalid)).toThrow(ProcessEvidenceValidationError);
    try {
      validateProcessEvidence('E03', invalid);
    } catch (error) {
      expect((error as Error).message).not.toContain(JSON.stringify(invalid));
      expect((error as Error).message).not.toContain('SUPER_SECRET_PAYLOAD_12345');
    }
  });

  it('strictly rejects counterfeit values, empty collections, and illegal enums across A03/D02/E03/E05', () => {
    // 1. A03: illegal mode
    const a03BadMode = makeValidA03Metrics();
    (a03BadMode.COLOR_CODE_CALC as Record<string, unknown>).mode = 'cheating';
    expect(() => validateProcessEvidence('A03', a03BadMode)).toThrow();

    // 2. A03: illegal resistorId
    const a03BadResistor = makeValidA03Metrics();
    (a03BadResistor.COLOR_CODE_CALC as Record<string, unknown>).resistorId = 'RES_NON_EXISTENT';
    expect(() => validateProcessEvidence('A03', a03BadResistor)).toThrow();

    // 3. A03: illegal sampleC string
    const a03BadSampleC = makeValidA03Metrics();
    (a03BadSampleC.SAMPLE_MEASUREMENT as Record<string, unknown>).sampleC = 'UNKNOWN_STATE';
    expect(() => validateProcessEvidence('A03', a03BadSampleC)).toThrow();

    // 4. A03: illegal choice in INDEPENDENT_EVAL
    const a03BadEval = makeValidA03Metrics();
    (a03BadEval.INDEPENDENT_EVAL as Record<string, unknown>).choice = 'WRONG_CHOICE_VALUE';
    expect(() => validateProcessEvidence('A03', a03BadEval)).toThrow();

    // 5. A03: illegal trend in TRANSFER_NTC
    const a03BadTrend = makeValidA03Metrics();
    const sensitive = (a03BadTrend.TRANSFER_NTC as Record<string, unknown>).sensitiveResistors as Record<string, unknown>;
    (sensitive.trends as Record<string, unknown>).NTC = 'oscillating';
    expect(() => validateProcessEvidence('A03', a03BadTrend)).toThrow();

    // 6. D02: illegal induction mechanism
    const d02BadMechanism = makeValidD02Metrics();
    const commutator = d02BadMechanism.COMMUTATOR_AND_CONTINUOUS_ROTATION as Record<string, unknown>;
    (commutator.inductionMotor as Record<string, unknown>).mechanism = 'COMMUTATOR';
    expect(() => validateProcessEvidence('D02', d02BadMechanism)).toThrow();

    // 7. D02: slipPercent out of range
    const d02BadSlip = makeValidD02Metrics();
    const commutator2 = d02BadSlip.COMMUTATOR_AND_CONTINUOUS_ROTATION as Record<string, unknown>;
    (commutator2.inductionMotor as Record<string, unknown>).slipPercent = 105;
    expect(() => validateProcessEvidence('D02', d02BadSlip)).toThrow();

    // 8. D02: parts missing required components
    const d02BadParts = makeValidD02Metrics();
    const commutator3 = d02BadParts.COMMUTATOR_AND_CONTINUOUS_ROTATION as Record<string, unknown>;
    (commutator3.inductionMotor as Record<string, unknown>).parts = ['定子'];
    expect(() => validateProcessEvidence('D02', d02BadParts)).toThrow();

    // 9. D02: current exceeding limit
    const d02BadCurrent = makeValidD02Metrics();
    (d02BadCurrent.ENGINEERING_REPAIR_AND_COMMISSIONING as Record<string, unknown>).current = 65;
    expect(() => validateProcessEvidence('D02', d02BadCurrent)).toThrow();

    // 10. E03: illegal s1Topology
    const e03BadTopo = makeValidE03Metrics();
    (e03BadTopo.RECTIFIER_TOPOLOGY_COGNITION as Record<string, unknown>).s1Topology = 'FLYBACK';
    expect(() => validateProcessEvidence('E03', e03BadTopo)).toThrow();

    // 11. E03: zero pulses
    const e03BadPulses = makeValidE03Metrics();
    const tp = (e03BadPulses.RECTIFIER_TOPOLOGY_COGNITION as Record<string, unknown>).threePhase as Record<string, unknown>;
    tp.pulses = 0;
    expect(() => validateProcessEvidence('E03', e03BadPulses)).toThrow();

    // 12. E03: s3HasCapacitor false
    const e03NoCap = makeValidE03Metrics();
    (e03NoCap.FILTER_CAPACITOR_AND_VOLTAGE_CALC as Record<string, unknown>).s3HasCapacitor = false;
    expect(() => validateProcessEvidence('E03', e03NoCap)).toThrow();

    // 13. E03: s4Diagnoses illegal fault enum
    const e03BadDiag = makeValidE03Metrics();
    (e03BadDiag.BLIND_RECTIFIER_FAULT_DIAGNOSIS as Record<string, unknown>).s4Diagnoses = {
      RECT_1: 'GOOD',
      RECT_2: 'DIODE_SHORT',
      RECT_3: 'DIODE_OPEN',
      RECT_4: 'UNKNOWN_DEFECT',
    };
    expect(() => validateProcessEvidence('E03', e03BadDiag)).toThrow();

    // 14. E05: s2VerifiedRows missing row
    const e05MissingRow = makeValidE05Metrics();
    const rows = (e05MissingRow.EXPERIMENT_BOX_TRUTH_VERIFICATION as Record<string, unknown>).s2VerifiedRows as Record<string, unknown>;
    delete rows['11'];
    expect(() => validateProcessEvidence('E05', e05MissingRow)).toThrow();

    // 15. E05: s4Diagnoses illegal IC fault
    const e05BadIc = makeValidE05Metrics();
    const diags = (e05BadIc.BLIND_LOGIC_IC_FAULT_DIAGNOSIS as Record<string, unknown>).s4Diagnoses as Record<string, unknown>;
    diags.IC_1 = 'BROKEN_CHIP';
    expect(() => validateProcessEvidence('E05', e05BadIc)).toThrow();

    // 16. E05: s5BuckleState illegal enum
    const e05BadBuckle = makeValidE05Metrics();
    (e05BadBuckle.ENGINEERING_REPAIR_AND_DELIVERY as Record<string, unknown>).s5BuckleState = 'HANGING';
    expect(() => validateProcessEvidence('E05', e05BadBuckle)).toThrow();
  });
});
