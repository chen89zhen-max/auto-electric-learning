import { describe, expect, it } from 'vitest';
import {
  LOW_VOLTAGE_WORKORDERS,
  createWorkorderAttempt,
  recordWorkorderMeasurement,
  selectWorkorderCause,
  selectWorkorderRepair,
  verifyWorkorderRetest,
  confirmWorkorderSafety,
  resetWorkorderDiagnosis,
} from '@/src/workorders/lowVoltageWorkorders';

describe('D-batch low-voltage workorders', () => {
  it('publishes five independent scenarios, each tied to an existing level without changing its id', () => {
    expect(LOW_VOLTAGE_WORKORDERS.map((item) => item.scenarioId)).toEqual([
      'D2_LAMP_VARIATION_V1',
      'D3_HORN_DIAGNOSIS_V1',
      'D4_START_CONTROL_V1',
      'D5_WINDOW_MIRROR_V1',
      'D6_LOW_VOLTAGE_CHARGING_V1',
    ]);
    expect(LOW_VOLTAGE_WORKORDERS.map((item) => item.associatedLevelId)).toEqual(['C01', 'D01', 'D02', 'D02', 'D03']);
  });

  it('blocks starter measurements before P/N-or-clutch safe-state confirmation and resets window evidence after a layout change', () => {
    const starter = LOW_VOLTAGE_WORKORDERS[2];
    const blocked = recordWorkorderMeasurement(starter, createWorkorderAttempt(starter), starter.measurementPlan[0].id, 12.5);
    expect(blocked.measurements).toEqual({});
    expect(confirmWorkorderSafety(starter, blocked).safetyConfirmed).toBe(true);

    const windowWorkorder = LOW_VOLTAGE_WORKORDERS[3];
    const measured = recordWorkorderMeasurement(windowWorkorder, createWorkorderAttempt(windowWorkorder), windowWorkorder.measurementPlan[0].id, 12.2);
    expect(resetWorkorderDiagnosis(windowWorkorder, measured).measurements).toEqual({});
  });

  it('requires complete measurement records, a correct diagnosis and a functional retest before completion', () => {
    const lamp = LOW_VOLTAGE_WORKORDERS[0];
    let attempt = createWorkorderAttempt(lamp);
    expect(selectWorkorderRepair(lamp, attempt, 'REPAIR_GROUND').status).toBe('blocked');

    for (const point of lamp.measurementPlan) {
      attempt = recordWorkorderMeasurement(lamp, attempt, point.id, point.expectedValue);
    }
    expect(selectWorkorderCause(lamp, attempt, 'GROUND_OPEN').status).toBe('ready');
    attempt = selectWorkorderRepair(lamp, attempt, 'REPAIR_GROUND');
    expect(verifyWorkorderRetest(lamp, attempt, { lowBeam: true, highBeam: false }).status).toBe('blocked');
    expect(verifyWorkorderRetest(lamp, attempt, { lowBeam: true, highBeam: true }).status).toBe('passed');
  });

  it('clears the previous retest when a measurement or repair changes', () => {
    const charging = LOW_VOLTAGE_WORKORDERS[4];
    let attempt = createWorkorderAttempt(charging);
    for (const point of charging.measurementPlan) attempt = recordWorkorderMeasurement(charging, attempt, point.id, point.expectedValue);
    attempt = selectWorkorderCause(charging, attempt, charging.correctCauseId);
    attempt = selectWorkorderRepair(charging, attempt, charging.correctRepairId);
    attempt = verifyWorkorderRetest(charging, attempt, { chargingVoltageNormal: true, warningLampOff: true, rippleNormal: true });
    expect(attempt.status).toBe('passed');
    expect(recordWorkorderMeasurement(charging, attempt, charging.measurementPlan[0].id, charging.measurementPlan[0].expectedValue).retestPassed).toBe(false);
  });
});
