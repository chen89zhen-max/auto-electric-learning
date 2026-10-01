import { describe, expect, it } from 'vitest';
import {
  D2_LAMP_SCENARIO_ID,
  createLampWorkorderState,
  recordLampMeasurement,
  selectLampRepair,
  verifyLampRetest,
} from '@/src/workorders/d2LampWorkorder';

describe('D2 lamp variation workorder', () => {
  it('uses an independent scenario and requires distinguishing measurements before repair', () => {
    const state = createLampWorkorderState();
    expect(D2_LAMP_SCENARIO_ID).toBe('D2_LAMP_VARIATION_V1');
    expect(selectLampRepair(state, 'REPLACE_RELAY').status).toBe('blocked');

    const afterSupply = recordLampMeasurement(state, 'FUSE_OUTPUT', 12.4);
    const afterControl = recordLampMeasurement(afterSupply, 'RELAY_CONTROL', 12.1);
    const afterGround = recordLampMeasurement(afterControl, 'LAMP_GROUND_DROP', 3.8);
    expect(afterGround.candidateCauses).toEqual(['GROUND_OPEN']);
  });

  it('invalidates old retest evidence after repair and requires low/high beam functional retest', () => {
    let state = createLampWorkorderState();
    state = recordLampMeasurement(state, 'FUSE_OUTPUT', 12.4);
    state = recordLampMeasurement(state, 'RELAY_CONTROL', 12.1);
    state = recordLampMeasurement(state, 'LAMP_GROUND_DROP', 3.8);
    state = selectLampRepair(state, 'REPAIR_GROUND');
    expect(state.retestPassed).toBe(false);
    expect(verifyLampRetest(state, { lowBeam: true, highBeam: false, loadedGroundDrop: 0.1 }).status).toBe('blocked');
    expect(verifyLampRetest(state, { lowBeam: true, highBeam: true, loadedGroundDrop: 0.1 }).status).toBe('passed');
  });
});
