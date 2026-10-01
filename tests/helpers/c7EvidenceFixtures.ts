import type { LevelAssessmentResult } from '@/src/assessment/assessmentTypes';
import { calculateRectifierOutput } from '@/src/levels/e03/e03Training';
import {
  GATE_REQUIRED_INPUTS,
  evaluateLogicGate,
  gateReadingKey,
  type GateReading,
  type LogicGateType,
} from '@/src/levels/e05/e05Training';

export function makeValidA03Metrics(): Record<string, unknown> {
  return {
    COLOR_CODE_CALC: {
      resistorId: 'RES_220_G',
      resistorName: '红·红·棕·金 (标称 220Ω ±5%)',
      nominal: 220,
      tolerance: 5,
      min: 209,
      max: 231,
      mode: 'transfer',
    },
    SAMPLE_MEASUREMENT: {
      sampleA: 224,
      sampleB: 330,
      sampleC: 'O.L',
      v04Passed: true,
      v05Encountered: false,
      mode: 'transfer',
    },
    POTENTIOMETER_TEST: {
      totalResistance: 10000,
      recordedPoints: ['1-2@0%', '1-2@25%', '1-2@50%', '1-2@75%'],
      v04PotentiometerPassed: true,
      mode: 'transfer',
    },
    INDEPENDENT_EVAL: {
      choice: '985_QUALIFIED',
      measured: 985.0,
      passed: true,
      mode: 'transfer',
    },
    TRANSFER_NTC: {
      choice: 'NTC_NORMAL',
      passed: true,
      coolantTemp: 80,
      sensitiveResistors: {
        points: {
          NTC: [
            { condition: 20, resistance: 2500 },
            { condition: 80, resistance: 300 },
          ],
          LDR: [
            { condition: 10, resistance: 5000 },
            { condition: 80, resistance: 2222 },
          ],
          FSR: [
            { condition: 0, resistance: 20000 },
            { condition: 50, resistance: 3333 },
          ],
        },
        trends: {
          NTC: 'decrease',
          LDR: 'decrease',
          FSR: 'decrease',
        },
      },
      mode: 'transfer',
    },
  };
}

export function makeValidD02Metrics(): Record<string, unknown> {
  return {
    LORENTZ_FORCE_AND_LEFT_HAND_RULE: {
      choice: 'B',
    },
    COMMUTATOR_AND_CONTINUOUS_ROTATION: {
      choice: 'A',
      inductionMotor: {
        parts: ['定子', '鼠笼转子'],
        observedSpeeds: [1440, 1450],
        slipPercent: 4,
        mechanism: 'INDUCTION',
        verified: true,
      },
    },
    H_BRIDGE_RELAY_DUAL_DIRECTION_CONTROL: {
      choice: 'A',
    },
    BLIND_DC_MOTOR_FAULT_ISOLATION: {
      caseId: 'CASE_1',
      choice: 'A',
    },
    ENGINEERING_REPAIR_AND_COMMISSIONING: {
      repaired: true,
      current: 3.2,
      signed: true,
    },
  };
}

export function makeValidE03Metrics(): Record<string, unknown> {
  const filteredOutput = calculateRectifierOutput(12, 'FULL_BRIDGE', true);
  return {
    RECTIFIER_TOPOLOGY_COGNITION: {
      s1Choice: 'A',
      s1Topology: 'FULL_BRIDGE',
      threePhase: {
        observedAngles: [30, 90, 150],
        pair: 'U-V',
        pulses: 6,
        verified: true,
      },
    },
    BRIDGE_WIRING_AND_MULTIMETER_TEST: {
      s2Choice: 'A',
      s2SelectedArm: 'D1',
    },
    FILTER_CAPACITOR_AND_VOLTAGE_CALC: {
      s3Choice: 'A',
      s3HasCapacitor: true,
      regulation: 'FIELD_REGULATION',
      modelScope: 'SINGLE_PHASE_BENCH',
      filteredOutput,
    },
    BLIND_RECTIFIER_FAULT_DIAGNOSIS: {
      s4Diagnoses: {
        RECT_1: 'GOOD',
        RECT_2: 'DIODE_SHORT',
        RECT_3: 'DIODE_OPEN',
        RECT_4: 'CAP_DISCONNECTED',
      },
    },
    ENGINEERING_REPAIR_AND_DELIVERY: {
      s5Repaired: true,
      s5EngineRunning: true,
    },
  };
}

export function makeValidE05Metrics(): Record<string, unknown> {
  const gateReadings: Record<string, GateReading> = {};
  (Object.keys(GATE_REQUIRED_INPUTS) as LogicGateType[]).forEach((gate) => {
    GATE_REQUIRED_INPUTS[gate].forEach((inputStr) => {
      const a = inputStr[0] === '1';
      const b = inputStr.length > 1 ? inputStr[1] === '1' : false;
      const output = evaluateLogicGate(gate, a, b);
      const key = gateReadingKey(gate, a, b);
      gateReadings[key] = { gate, a, b, output };
    });
  });

  return {
    LOGIC_GATE_SYMBOLS_AND_TRUTH_TABLE: {
      s1Choice: 'A',
      s1Gate: 'AND',
      gateReadings,
    },
    EXPERIMENT_BOX_TRUTH_VERIFICATION: {
      s2Choice: 'A',
      s2VerifiedRows: {
        '00': false,
        '01': false,
        '10': false,
        '11': true,
      },
    },
    VEHICLE_SAFETY_INTERLOCK_LOGIC: {
      s3Choice: 'A',
      s3AlarmTriggered: true,
    },
    BLIND_LOGIC_IC_FAULT_DIAGNOSIS: {
      s4Diagnoses: {
        IC_1: 'GOOD',
        IC_2: 'VCC_DISCONNECTED',
        IC_3: 'INPUT_FLOATING',
        IC_4: 'OUTPUT_SHORT_GND',
      },
    },
    ENGINEERING_REPAIR_AND_DELIVERY: {
      s5Repaired: true,
      s5BuckleState: 'LATCHED',
    },
  };
}

export function makeValidAssessment(levelId: 'D02' | 'E03' | 'E05'): LevelAssessmentResult {
  const stageIds = ['cognition', 'standard', 'calculation', 'blind_test', 'transfer'] as const;
  return {
    schemaVersion: 1,
    levelId,
    rubricVersion: 'v2',
    startedAt: 1_700_000_000_000,
    completedAt: 1_700_000_120_000,
    stages: stageIds.map((stageId, i) => ({
      stageId,
      mode: stageId === 'transfer' ? 'transfer' : 'independent',
      startedAt: 1_700_000_000_000 + i * 20_000,
      completedAt: 1_700_000_000_000 + (i + 1) * 20_000,
      wrongAttempts: 0,
      hintRequests: 0,
      meterGuardBlocks: 0,
      unsafeActions: 0,
      retries: 0,
      completed: true,
    })),
  };
}
