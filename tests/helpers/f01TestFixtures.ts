import {
  F01_STAGES,
  F01_EXPECTED_FAULT_EVIDENCE,
  REQUIRED_EVIDENCE_TARGETS,
  type F01CompletionMetrics,
  type F01Seed,
} from '@/src/levels/f01/f01Model';

export function makeValidF01Metrics(seed: F01Seed): F01CompletionMetrics {
  const measurementLog = REQUIRED_EVIDENCE_TARGETS[seed].map((target, index) => ({
    id: `${seed}-e${index + 1}`,
    target,
    mode: target === 'main_current_series' ? 'DCA_10' as const
      : target === 'flyback_polarity' ? 'DIODE' as const
      : target === 'relay_coil_continuity' || target === 'board_supply_to_ground' ? 'OHM' as const
      : 'DCV_20' as const,
    value: F01_EXPECTED_FAULT_EVIDENCE[seed][target].value,
    unit: F01_EXPECTED_FAULT_EVIDENCE[seed][target].unit,
  }));
  return {
    schemaVersion: 1,
    seed,
    completedStages: [...F01_STAGES],
    prePowerDefectFixed: true,
    operationalFaultFixed: true,
    measurementLog,
    functionalMatrix: [
      { a: false, b: false, relayOn: false, lampOn: false, passed: true },
      { a: false, b: true, relayOn: false, lampOn: false, passed: true },
      { a: true, b: false, relayOn: false, lampOn: false, passed: true },
      { a: true, b: true, relayOn: true, lampOn: true, passed: true },
    ],
    transfer: { upperOhms: 2000, lowerOhms: 1000, dividerVoltage: 1.6667, sensorInput: false, relayOn: false, passed: true },
    defenseEvidenceIds: [measurementLog[0].id, measurementLog[1].id],
  };
}
