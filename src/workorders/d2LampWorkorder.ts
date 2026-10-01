export const D2_LAMP_SCENARIO_ID = 'D2_LAMP_VARIATION_V1' as const;

export type LampTestPoint = 'FUSE_OUTPUT' | 'RELAY_CONTROL' | 'LAMP_GROUND_DROP';
export type LampRepair = 'REPLACE_RELAY' | 'REPAIR_GROUND';

export interface LampWorkorderState {
  measurements: Partial<Record<LampTestPoint, number>>;
  candidateCauses: string[];
  repair: LampRepair | null;
  retestPassed: boolean;
}

export function createLampWorkorderState(): LampWorkorderState {
  return { measurements: {}, candidateCauses: ['FUSE_OPEN', 'RELAY_FAILURE', 'GROUND_OPEN'], repair: null, retestPassed: false };
}

export function recordLampMeasurement(state: LampWorkorderState, point: LampTestPoint, value: number): LampWorkorderState {
  const measurements = { ...state.measurements, [point]: value };
  const candidateCauses = measurements.FUSE_OUTPUT !== undefined && measurements.RELAY_CONTROL !== undefined && measurements.LAMP_GROUND_DROP !== undefined
    ? measurements.LAMP_GROUND_DROP > 0.5 ? ['GROUND_OPEN'] : ['RELAY_FAILURE']
    : state.candidateCauses;
  return { ...state, measurements, candidateCauses, retestPassed: false };
}

export function selectLampRepair(state: LampWorkorderState, repair: LampRepair): LampWorkorderState & { status: 'blocked' | 'ready' } {
  if (state.candidateCauses.length !== 1) return { ...state, status: 'blocked' };
  return { ...state, repair, retestPassed: false, status: 'ready' };
}

export function verifyLampRetest(state: LampWorkorderState, result: { lowBeam: boolean; highBeam: boolean; loadedGroundDrop: number }): LampWorkorderState & { status: 'blocked' | 'passed' } {
  const passed = !!state.repair && result.lowBeam && result.highBeam && result.loadedGroundDrop <= 0.2;
  return { ...state, retestPassed: passed, status: passed ? 'passed' : 'blocked' };
}
