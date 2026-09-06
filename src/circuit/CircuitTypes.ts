/**
 * CircuitTopologyEngine Data Types & Interfaces
 * Sprint 2 Foundation for Task 2-9
 */

export type ComponentType =
  | 'BATTERY'
  | 'FUSE'
  | 'SWITCH'
  | 'LAMP'
  | 'WIRE'
  | 'GROUND_BUS'
  | 'CHASSIS_POINT'
  | 'RESISTOR'
  | 'POTENTIOMETER'
  | 'MULTIMETER'
  | 'CLAMP_METER';

export type ComponentState = 'NORMAL' | 'OPEN' | 'CLOSED' | 'BLOWN';

export interface Terminal {
  id: string; // e.g. 'BAT_POS', 'BAT_NEG', 'SW_IN', 'SW_OUT'
  componentId: string; // e.g. 'BAT1', 'S1'
  name: string;
  polarity?: 'POS' | 'NEG';
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  name: string;
  terminals: Terminal[];
  state: ComponentState;
  schematicSymbolId: string;
  voltage?: number;             // Nominal/actual voltage in Volts
  internalResistance?: number;  // Internal resistance in Ohms
  resistance?: number;          // Nominal resistance in Ohms
  ratedCurrent?: number;        // Fuse/load rated current in Amperes
  wiperRatio?: number;          // Potentiometer wiper ratio (0.0 to 1.0)
}

export interface Connection {
  id: string;
  from: string; // Terminal ID
  to: string;   // Terminal ID
}

export interface CircuitPath {
  nodes: string[]; // Sequence of terminal IDs in loop
  components: string[]; // Sequence of component IDs in loop
  hasPowerSource: boolean;
  hasLoad: boolean;
  isClosed: boolean;
  isShortCircuit: boolean;
}

export interface CircuitAnalysis {
  closedPaths: CircuitPath[];
  activePath?: CircuitPath;
  loadPowered: boolean;
  isSwitchOpen: boolean;
  isFuseBlown: boolean;
  hasOpenCircuit: boolean;
  hasShortCircuitRisk: boolean;
  missingReturnPath: boolean;
  directBatteryConnected: boolean; // Direct connect without switch
  missingFuse: boolean;
  usesChassisGround: boolean;
  pathComponents: string[];
}
