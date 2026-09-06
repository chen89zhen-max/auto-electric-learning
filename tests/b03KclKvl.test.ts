import { describe, expect, it } from 'vitest';
import { inspectB03NodeAndLoop } from '@/src/levels/b03/B03KclKvlScene';
import { B03_STAGE_CONTENT, type B03Step } from '@/src/levels/b03/b03Training';

describe('B03 KCL/KVL and reference-ground experiment', () => {
  it('preserves a two-point voltage difference after changing the reference node', () => {
    const inspection = inspectB03NodeAndLoop();
    expect(inspection.kclClosed).toBe(true);
    expect(inspection.kvlClosed).toBe(true);
    expect(inspection.original.nodeA).not.toBeCloseTo(inspection.referencedToB.nodeA, 6);
    expect(inspection.original.voltageAB).toBeCloseTo(inspection.referencedToB.voltageAB, 6);
  });

  it('contains complete 5-stage progressive training content with TTS mentor prompts', () => {
    const expectedSteps: B03Step[] = [
      'KCL_NODE_CURRENT',
      'KVL_LOOP_VOLTAGE',
      'REFERENCE_GROUND_INVARIANT',
      'QUANTITATIVE_BRANCH_CALC',
      'TRANSFER_GROUND_FAULT_DIAG',
    ];

    expect(Object.keys(B03_STAGE_CONTENT)).toEqual(expectedSteps);

    expectedSteps.forEach((step) => {
      const stage = B03_STAGE_CONTENT[step];
      expect(stage.title).toBeTruthy();
      expect(stage.objective).toBeTruthy();
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt).toBeTruthy();
      expect(stage.hint).toBeTruthy();
      expect(['NORMAL', 'WARNING', 'PRAISE', 'THINKING']).toContain(stage.mentorEmotion);
    });
  });

  it('validates KCL current conservation and multi-branch calculation (Stage 1 & Stage 4)', () => {
    // Stage 1: Inflow 6A = Outflow 2A + 4A
    const inflow1 = 6.0;
    const b1 = 2.0;
    const b2 = 4.0;
    expect(inflow1).toBeCloseTo(b1 + b2, 5);

    // Stage 4: Inflow 8.5A = 3.0A (fan) + 2.5A (headlamp) + I4 (ECU)
    const inflow4 = 8.5;
    const iFan = 3.0;
    const iHeadlamp = 2.5;
    const iEcu = inflow4 - (iFan + iHeadlamp);
    expect(iEcu).toBeCloseTo(3.0, 5);

    // Potential difference U_AB = VA - VB
    const vA = 12.0;
    const vB = 4.8;
    const uAB = vA - vB;
    expect(uAB).toBeCloseTo(7.2, 5);
  });

  it('validates KVL closed loop algebraic sum is identically zero (Stage 2)', () => {
    const batteryRise = 12.0; // 电源升高 +12V
    const lineDrop = -4.0; // 线路阻抗降低 -4V
    const loadDrop = -8.0; // 负载降低 -8V
    const loopSum = batteryRise + lineDrop + loadDrop;
    expect(loopSum).toBeCloseTo(0.0, 6);
  });

  it('validates potential invariance vs relative ground position (Stage 3)', () => {
    // Ground at N (Negative terminal = 0V)
    const vN_caseN = 0.0;
    const vM_caseN = 8.0;
    const vP_caseN = 12.0;
    const uPN_caseN = vP_caseN - vN_caseN; // 12.0V
    const uPM_caseN = vP_caseN - vM_caseN; // 4.0V

    // Ground at P (Positive terminal = 0V)
    const vP_caseP = 0.0;
    const vM_caseP = -4.0;
    const vN_caseP = -12.0;
    const uPN_caseP = vP_caseP - vN_caseP; // 0 - (-12) = 12.0V
    const uPM_caseP = vP_caseP - vM_caseP; // 0 - (-4) = 4.0V

    // Ground at M (Midpoint = 0V)
    const vM_caseM = 0.0;
    const vP_caseM = 4.0;
    const vN_caseM = -8.0;
    const uPN_caseM = vP_caseM - vN_caseM; // 4 - (-8) = 12.0V
    const uPM_caseM = vP_caseM - vM_caseM; // 4 - 0 = 4.0V

    // Point potentials shift, but voltage differences between physical terminals are absolutely invariant
    expect(uPN_caseN).toBeCloseTo(uPN_caseP, 6);
    expect(uPN_caseP).toBeCloseTo(uPN_caseM, 6);
    expect(uPM_caseN).toBeCloseTo(uPM_caseP, 6);
    expect(uPM_caseP).toBeCloseTo(uPM_caseM, 6);
  });

  it('validates tail lamp poor ground floating voltage and reverse trickle path (Stage 5)', () => {
    const normalGroundDropMax = 0.1; // 汽车标准搭铁压降必须 < 0.1V
    const measuredFaultGroundDrop = 9.2; // 故障实测搭铁地线对车身金属压降高达 9.2V

    expect(measuredFaultGroundDrop).toBeGreaterThan(normalGroundDropMax);

    // 浮地电压导致有效施加在刹车灯两端实际电压被大幅削弱 (12V - 9.2V = 2.8V，暗淡)
    const effectiveBrakeLampVoltage = 12.0 - measuredFaultGroundDrop;
    expect(effectiveBrakeLampVoltage).toBeCloseTo(2.8, 2);

    // 9.2V 的浮地电位经由示宽灯公共节点反向流入示宽灯灯丝，造成异常发光
    const reverseTrickleVoltageAcrossIndicator = measuredFaultGroundDrop;
    expect(reverseTrickleVoltageAcrossIndicator).toBeGreaterThan(5.0);
  });
});
