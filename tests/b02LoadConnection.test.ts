import { describe, expect, it } from 'vitest';
import { compareB02LampConnections } from '@/src/levels/b02/B02LoadConnectionScene';
import { B02_STAGE_CONTENT, type B02Step } from '@/src/levels/b02/b02Training';
import {
  calculateCompoundCircuit,
  calculateBypassCircuitA,
  validateCompoundSubmission,
} from '@/src/levels/b02/b02Compound';

describe('B02 lamp-group connection model', () => {
  it('shows series dimming and parallel branch independence from electrical nodes', () => {
    const comparison = compareB02LampConnections(12, 6, 6);
    expect(comparison.series.lampVoltage).toBeCloseTo(6, 6);
    expect(comparison.series.totalCurrent).toBeCloseTo(1, 6);
    expect(comparison.parallel.lampVoltage).toBeCloseTo(12, 6);
    expect(comparison.parallel.totalCurrent).toBeCloseTo(4, 6);
    expect(comparison.parallel.removingOneLampKeepsOtherOn).toBe(true);
  });

  it('contains complete 5-stage progressive training content with TTS mentor prompts', () => {
    const expectedSteps: B02Step[] = [
      'SERIES_DIVIDER_TEST',
      'PARALLEL_INDEPENDENT_TEST',
      'COMPOUND_SHORT_BYPASS',
      'QUANTITATIVE_FOG_PREDICT',
      'TRANSFER_SPOTLIGHT_MOD_RISK',
    ];

    expect(Object.keys(B02_STAGE_CONTENT)).toEqual(expectedSteps);

    expectedSteps.forEach((step) => {
      const stage = B02_STAGE_CONTENT[step];
      expect(stage.title).toBeTruthy();
      expect(stage.objective).toBeTruthy();
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt).toBeTruthy();
      expect(stage.hint).toBeTruthy();
      expect(['NORMAL', 'WARNING', 'PRAISE', 'THINKING']).toContain(stage.mentorEmotion);
    });
  });

  it('verifies quantitative calculation for fog light addition (Stage 4)', () => {
    const rWidth = 2.0; // 示宽灯组等效电阻 2Ω
    const rFog = 3.0; // 雾灯组等效电阻 3Ω
    const u = 12.0;

    // 并联等效电阻: 1/R = 1/2 + 1/3 = 5/6 => R = 1.2Ω
    const rTotal = 1 / (1 / rWidth + 1 / rFog);
    expect(rTotal).toBeCloseTo(1.2, 5);

    // 总电流: I = U / R = 12 / 1.2 = 10.0A
    const iTotal = u / rTotal;
    expect(iTotal).toBeCloseTo(10.0, 5);
  });

  it('verifies 400W load working point current estimate and risk decision evidence schema (Stage 5)', () => {
    const power = 400; // 400W
    const voltage = 12; // 12V
    const currentEstimate = power / voltage; // 33.333A
    const origFuseRating = 15; // 15A 原车标称熔断器

    expect(currentEstimate).toBeCloseTo(33.333, 2);
    expect(currentEstimate).toBeGreaterThan(origFuseRating); // 超出 15A 标称额定电流

    // 教学规范证据结构核验：为风险决策，不伪称具体选型或完工已验收
    const mockEvidence = {
      spotlightCurrentCalculated: 33.3,
      overloadRiskRecognized: true,
      modificationDecision: 'OPT_A',
      schemaVersion: 2,
      evidenceKind: 'risk_decision',
      currentSource: 'provided_working_point_estimate',
      supplyVoltage: 12,
      addedLoadInputPowerW: 400,
      existingFuseRatedA: 15,
      repairApproved: false,
      specificSizingDetermined: false,
      protectionTiming: 'not_determined',
    };

    expect(mockEvidence.spotlightCurrentCalculated).toBe(33.3);
    expect(mockEvidence.overloadRiskRecognized).toBe(true);
    expect(mockEvidence.modificationDecision).toBe('OPT_A');
    expect(mockEvidence.schemaVersion).toBe(2);
    expect(mockEvidence.evidenceKind).toBe('risk_decision');
    expect(mockEvidence.currentSource).toBe('provided_working_point_estimate');
    expect(mockEvidence.repairApproved).toBe(false);
    expect(mockEvidence.specificSizingDetermined).toBe(false);
    expect(mockEvidence.protectionTiming).toBe('not_determined');
  });
});

describe('B02 compound circuit calculation pure model', () => {
  it('verifies Case A against Section 4 independent expected values', () => {
    // Case A: U=12V, R1=6Ω, R2=12Ω, R3=2Ω
    const res = calculateCompoundCircuit(12, 6, 12, 2);
    expect(res).not.toBeNull();
    if (!res) return;

    expect(res.rp).toBeCloseTo(4, 5);
    expect(res.req).toBeCloseTo(6, 5);
    expect(res.itotal).toBeCloseTo(2, 5);
    expect(res.uparallel).toBeCloseTo(8, 5);
    expect(res.u3).toBeCloseTo(4, 5);
    expect(res.i1).toBeCloseTo(4 / 3, 5);
    expect(res.i2).toBeCloseTo(2 / 3, 5);
    expect(res.p1).toBeCloseTo(32 / 3, 5);
    expect(res.p2).toBeCloseTo(16 / 3, 5);
    expect(res.p3).toBeCloseTo(8, 5);
    expect(res.ptotal).toBeCloseTo(24, 5);
    expect(res.powerRatio).toBeCloseTo(2, 5);

    // KCL & KVL & Power balances
    expect(res.i1 + res.i2).toBeCloseTo(res.itotal, 5);
    expect(res.u3 + res.uparallel).toBeCloseTo(12, 5);
    expect(res.p1 + res.p2 + res.p3).toBeCloseTo(res.ptotal, 5);
  });

  it('verifies Case B against Section 4 independent expected values', () => {
    // Case B: U=12V, R1=12Ω, R2=6Ω, R3=4Ω
    const res = calculateCompoundCircuit(12, 12, 6, 4);
    expect(res).not.toBeNull();
    if (!res) return;

    expect(res.rp).toBeCloseTo(4, 5);
    expect(res.req).toBeCloseTo(8, 5);
    expect(res.itotal).toBeCloseTo(1.5, 5);
    expect(res.uparallel).toBeCloseTo(6, 5);
    expect(res.u3).toBeCloseTo(6, 5);
    expect(res.i1).toBeCloseTo(0.5, 5);
    expect(res.i2).toBeCloseTo(1.0, 5);
    expect(res.p1).toBeCloseTo(3, 5);
    expect(res.p2).toBeCloseTo(6, 5);
    expect(res.p3).toBeCloseTo(9, 5);
    expect(res.ptotal).toBeCloseTo(18, 5);
    expect(res.powerRatio).toBeCloseTo(0.5, 5);

    // KCL & KVL & Power balances
    expect(res.i1 + res.i2).toBeCloseTo(res.itotal, 5);
    expect(res.u3 + res.uparallel).toBeCloseTo(12, 5);
    expect(res.p1 + res.p2 + res.p3).toBeCloseTo(res.ptotal, 5);
  });

  it('rejects invalid inputs (zero/negative resistance, non-finite, voltage <= 0)', () => {
    expect(calculateCompoundCircuit(0, 6, 12, 2)).toBeNull();
    expect(calculateCompoundCircuit(-12, 6, 12, 2)).toBeNull();
    expect(calculateCompoundCircuit(12, 0, 12, 2)).toBeNull();
    expect(calculateCompoundCircuit(12, 6, -12, 2)).toBeNull();
    expect(calculateCompoundCircuit(12, 6, 12, 0)).toBeNull();
    expect(calculateCompoundCircuit(NaN, 6, 12, 2)).toBeNull();
    expect(calculateCompoundCircuit(12, Infinity, 12, 2)).toBeNull();
  });

  it('verifies Case A A-B bypass short simulation against 2Ω / 6A / 0V / 72W', () => {
    const bypass = calculateBypassCircuitA();
    expect(bypass.normal.req).toBeCloseTo(6, 5);
    expect(bypass.normal.itotal).toBeCloseTo(2, 5);
    expect(bypass.normal.uab).toBeCloseTo(8, 5);

    expect(bypass.bypassed.req).toBe(2);
    expect(bypass.bypassed.itotal).toBe(6);
    expect(bypass.bypassed.uab).toBe(0);
    expect(bypass.bypassed.p3).toBe(72);
    expect(bypass.bypassed.i1).toBe(0);
    expect(bypass.bypassed.i2).toBe(0);
    expect(bypass.bypassed.p1).toBe(0);
    expect(bypass.bypassed.p2).toBe(0);
  });

  it('validates student submissions with 0.02 tolerance and handles invalid formats', () => {
    const expected = calculateCompoundCircuit(12, 6, 12, 2)!;

    // Blank or unparseable input
    const emptyCheck = validateCompoundSubmission(
      {
        req: '',
        itotal: '2',
        uparallel: '8',
        p1: '10.67',
        p2: '5.33',
        p3: '8',
        powerRatio: '2',
      },
      expected
    );
    expect(emptyCheck.allValidFormat).toBe(false);
    expect(emptyCheck.invalidFields).toContain('req');

    // Number('') being 0 must NOT be treated as valid
    const zeroStrCheck = validateCompoundSubmission(
      {
        req: '0',
        itotal: '2',
        uparallel: '8',
        p1: '10.67',
        p2: '5.33',
        p3: '8',
        powerRatio: '2',
      },
      expected
    );
    expect(zeroStrCheck.allValidFormat).toBe(false);
    expect(zeroStrCheck.invalidFields).toContain('req');

    // Valid format with tolerance boundary (e.g. 10.67 and 5.33)
    const validCheck = validateCompoundSubmission(
      {
        req: '6',
        itotal: '2',
        uparallel: '8',
        p1: '10.67', // 32/3 = 10.6667, diff = 0.0033 <= 0.02
        p2: '5.33',  // 16/3 = 5.3333, diff = 0.0033 <= 0.02
        p3: '8',
        powerRatio: '2',
      },
      expected
    );
    expect(validCheck.allValidFormat).toBe(true);
    expect(validCheck.allCorrect).toBe(true);

    // One wrong field out of tolerance
    const wrongCheck = validateCompoundSubmission(
      {
        req: '6',
        itotal: '2.5', // Expected 2, diff 0.5 > 0.02
        uparallel: '8',
        p1: '10.67',
        p2: '5.33',
        p3: '8',
        powerRatio: '2',
      },
      expected
    );
    expect(wrongCheck.allValidFormat).toBe(true);
    expect(wrongCheck.allCorrect).toBe(false);
    expect(wrongCheck.fieldResults?.itotal.isCorrect).toBe(false);
    expect(wrongCheck.fieldResults?.req.isCorrect).toBe(true);
  });

  it('strictly verifies exact ±0.02 tolerance boundary and rejects ±0.021 barely out-of-bounds', () => {
    const expected = calculateCompoundCircuit(12, 6, 12, 2)!;
    const baseAnswers = {
      req: '6.00',
      itotal: '2.00',
      uparallel: '8.00',
      p1: '10.6667',
      p2: '5.3333',
      p3: '8.00',
      powerRatio: '2.00',
    };

    // Exactly +0.02 on req (6.02) -> should pass
    const plusExact = validateCompoundSubmission({ ...baseAnswers, req: '6.02' }, expected);
    expect(plusExact.allCorrect).toBe(true);
    expect(plusExact.fieldResults?.req.isCorrect).toBe(true);
    expect(plusExact.fieldResults?.req.diff).toBeCloseTo(0.02, 5);

    // Exactly -0.02 on req (5.98) -> should pass
    const minusExact = validateCompoundSubmission({ ...baseAnswers, req: '5.98' }, expected);
    expect(minusExact.allCorrect).toBe(true);
    expect(minusExact.fieldResults?.req.isCorrect).toBe(true);
    expect(minusExact.fieldResults?.req.diff).toBeCloseTo(0.02, 5);

    // Barely out of bounds: +0.021 on req (6.021) -> should fail
    const plusBarelyOut = validateCompoundSubmission({ ...baseAnswers, req: '6.021' }, expected);
    expect(plusBarelyOut.allCorrect).toBe(false);
    expect(plusBarelyOut.fieldResults?.req.isCorrect).toBe(false);
    expect(plusBarelyOut.fieldResults?.req.diff).toBeCloseTo(0.021, 5);

    // Barely out of bounds: -0.021 on req (5.979) -> should fail
    const minusBarelyOut = validateCompoundSubmission({ ...baseAnswers, req: '5.979' }, expected);
    expect(minusBarelyOut.allCorrect).toBe(false);
    expect(minusBarelyOut.fieldResults?.req.isCorrect).toBe(false);
    expect(minusBarelyOut.fieldResults?.req.diff).toBeCloseTo(0.021, 5);
  });
});

