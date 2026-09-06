/**
 * DC Circuit Analysis Utilities
 * Helper functions for Ohm's law, Kirchhoff's Laws (KCL, KVL),
 * Power & Energy calculations, Battery Internal Resistance, and Voltage Dividers.
 */

export interface PowerCalculation {
  voltage: number; // Volts
  current: number; // Amperes
  resistance: number; // Ohms
  actualPower: number; // Watts: P = U * I = U^2 / R = I^2 * R
  isOverloaded?: boolean;
}

export interface EnergyBudgetResult {
  totalPowerWatts: number;
  energyKWh: number; // kWh = (Watts * hours) / 1000
  totalCostYuan: number; // cost = kWh * pricePerKWh
}

export interface FullCircuitResult {
  emf: number; // Electromotive force E (Volts)
  internalResistance: number; // r (Ohms)
  loadResistance: number; // R_load (Ohms)
  totalCurrent: number; // I = E / (R_load + r)
  terminalVoltage: number; // U = E - I * r = I * R_load
  internalDrop: number; // U_drop = I * r
}

export interface VoltageDividerResult {
  vSource: number; // Supply voltage (e.g. 5V or 12V)
  r1: number; // Top resistor (Ohms)
  r2: number; // Bottom resistor (Ohms)
  loadResistance?: number; // Optional load in parallel with r2 (Ohms)
  unloadedVOut: number; // E * (r2 / (r1 + r2))
  loadedVOut: number; // E * (r2_eq / (r1 + r2_eq)) where r2_eq = r2 || load
  loadingErrorPercent: number; // ((unloaded - loaded) / unloaded) * 100
}

/**
 * Calculates part-circuit Ohm's law variables: U = I * R
 */
export function calculateOhmsLaw(params: {
  voltage?: number;
  current?: number;
  resistance?: number;
}): { voltage: number; current: number; resistance: number } {
  const { voltage, current, resistance } = params;

  if (voltage !== undefined && current !== undefined) {
    if (Math.abs(current) < 1e-12) {
      return { voltage, current: 0, resistance: Infinity };
    }
    const r = voltage / current;
    return { voltage, current, resistance: r };
  }

  if (voltage !== undefined && resistance !== undefined) {
    if (resistance <= 0) {
      return { voltage, current: Infinity, resistance };
    }
    const i = voltage / resistance;
    return { voltage, current: i, resistance };
  }

  if (current !== undefined && resistance !== undefined) {
    const v = current * resistance;
    return { voltage: v, current, resistance };
  }

  throw new Error('At least two parameters of Ohm\'s law must be specified');
}

/**
 * Calculates actual power and checks against rated power
 */
export function calculatePower(params: {
  voltage: number;
  resistance: number;
  ratedPower?: number;
}): PowerCalculation {
  const { voltage, resistance, ratedPower } = params;
  if (resistance <= 0) {
    return {
      voltage,
      current: Infinity,
      resistance,
      actualPower: Infinity,
      isOverloaded: true,
    };
  }

  const current = voltage / resistance;
  const actualPower = (voltage * voltage) / resistance;
  const isOverloaded = ratedPower !== undefined ? actualPower > ratedPower : false;

  return {
    voltage,
    current,
    resistance,
    actualPower,
    isOverloaded,
  };
}

/**
 * Calculates energy consumption and electrical billing budget
 */
export function calculateEnergyBudget(params: {
  loads: Array<{ name: string; powerWatts: number; operatingHours: number }>;
  electricityPricePerKWh: number; // e.g. 0.85 Yuan/kWh
}): EnergyBudgetResult {
  let totalPowerWatts = 0;
  let totalEnergyWattHours = 0;

  for (const load of params.loads) {
    totalPowerWatts += load.powerWatts;
    totalEnergyWattHours += load.powerWatts * load.operatingHours;
  }

  const energyKWh = totalEnergyWattHours / 1000.0;
  const totalCostYuan = energyKWh * params.electricityPricePerKWh;

  return {
    totalPowerWatts,
    energyKWh,
    totalCostYuan,
  };
}

/**
 * Evaluates full-circuit Ohm's law with power source internal resistance r
 * I = E / (R_load + r)
 * U = E - I * r
 */
export function calculateFullCircuit(params: {
  emf: number;
  internalResistance: number;
  loadResistance: number;
}): FullCircuitResult {
  const { emf, internalResistance, loadResistance } = params;
  const totalR = internalResistance + loadResistance;

  if (totalR <= 1e-9) {
    return {
      emf,
      internalResistance,
      loadResistance,
      totalCurrent: Infinity,
      terminalVoltage: 0,
      internalDrop: emf,
    };
  }

  const totalCurrent = emf / totalR;
  const internalDrop = totalCurrent * internalResistance;
  const terminalVoltage = emf - internalDrop;

  return {
    emf,
    internalResistance,
    loadResistance,
    totalCurrent,
    terminalVoltage,
    internalDrop,
  };
}

/**
 * Evaluates voltage divider with optional parallel load resistance
 */
export function calculateVoltageDivider(params: {
  vSource: number;
  r1: number;
  r2: number;
  loadResistance?: number;
}): VoltageDividerResult {
  const { vSource, r1, r2, loadResistance } = params;
  const unloadedVOut = vSource * (r2 / (r1 + r2));

  let loadedVOut = unloadedVOut;
  let loadingErrorPercent = 0;

  if (loadResistance !== undefined && loadResistance > 0) {
    const r2Eq = (r2 * loadResistance) / (r2 + loadResistance);
    loadedVOut = vSource * (r2Eq / (r1 + r2Eq));
    loadingErrorPercent = Math.abs((unloadedVOut - loadedVOut) / unloadedVOut) * 100;
  }

  return {
    vSource,
    r1,
    r2,
    loadResistance,
    unloadedVOut,
    loadedVOut,
    loadingErrorPercent,
  };
}

/**
 * Verifies Kirchhoff's Current Law (KCL) at a node:
 * Sum of incoming currents equals sum of outgoing currents
 */
export function verifyKCL(incomingCurrents: number[], outgoingCurrents: number[], tolerance = 1e-5): boolean {
  const sumIn = incomingCurrents.reduce((sum, val) => sum + val, 0);
  const sumOut = outgoingCurrents.reduce((sum, val) => sum + val, 0);
  return Math.abs(sumIn - sumOut) < tolerance;
}

/**
 * Verifies Kirchhoff's Voltage Law (KVL) around a closed loop:
 * Directed sum of potential changes equals 0
 */
export function verifyKVL(voltagesAlongLoop: number[], tolerance = 1e-5): boolean {
  const sum = voltagesAlongLoop.reduce((acc, v) => acc + v, 0);
  return Math.abs(sum) < tolerance;
}

export interface VoltageDropCircuitParams {
  sourceVoltage: number; // e.g. 12.0V
  loadResistance: number; // e.g. 6.0Ω (headlamp)
  supplyDropResistance: number; // e.g. 0.5Ω (fault/contact resistance on supply harness)
  groundDropResistance: number; // e.g. 0.1Ω (contact resistance on ground harness)
  isLoaded: boolean; // true = switch closed & loaded, false = switch open / unloaded
}

export interface VoltageDropCircuitResult {
  sourceVoltage: number;
  isLoaded: boolean;
  totalResistance: number;
  circuitCurrent: number;
  lampVoltage: number;
  lampPower: number;
  supplyVoltageDrop: number;
  groundVoltageDrop: number;
  batteryPositivePotential: number;
  fuseOutPotential: number;
  lampPositivePotential: number;
  lampNegativePotential: number;
  groundPotential: number;
}

/**
 * Calculates deterministic loaded and unloaded voltage drop diagnostic circuit
 * Corresponds to C01 Mid-term Diagnostic Benchmark (Learning Task 8, 9 pages)
 */
export function calculateVoltageDropCircuit(params: VoltageDropCircuitParams): VoltageDropCircuitResult {
  const { sourceVoltage, loadResistance, supplyDropResistance, groundDropResistance, isLoaded } = params;

  if (!isLoaded) {
    // Unloaded (switch open or circuit broken): circuit current is 0A!
    // No current -> No voltage drop across resistors (V_drop = I * R = 0).
    // Open circuit node potential upstream stays at full source voltage (12.0V), downstream stays at 0.0V.
    return {
      sourceVoltage,
      isLoaded: false,
      totalResistance: Infinity,
      circuitCurrent: 0,
      lampVoltage: 0,
      lampPower: 0,
      supplyVoltageDrop: 0,
      groundVoltageDrop: 0,
      batteryPositivePotential: sourceVoltage,
      fuseOutPotential: sourceVoltage,
      lampPositivePotential: sourceVoltage, // pin measures 12.0V false positive!
      lampNegativePotential: 0,
      groundPotential: 0,
    };
  }

  const totalResistance = supplyDropResistance + loadResistance + groundDropResistance;
  const circuitCurrent = totalResistance > 0 ? sourceVoltage / totalResistance : 0;
  const supplyVoltageDrop = circuitCurrent * supplyDropResistance;
  const groundVoltageDrop = circuitCurrent * groundDropResistance;
  const lampVoltage = circuitCurrent * loadResistance;
  const lampPower = lampVoltage * circuitCurrent;

  return {
    sourceVoltage,
    isLoaded: true,
    totalResistance,
    circuitCurrent,
    lampVoltage,
    lampPower,
    supplyVoltageDrop,
    groundVoltageDrop,
    batteryPositivePotential: sourceVoltage,
    fuseOutPotential: sourceVoltage - (supplyVoltageDrop * 0.2), // minor drop across fuse
    lampPositivePotential: sourceVoltage - supplyVoltageDrop,
    lampNegativePotential: groundVoltageDrop,
    groundPotential: 0,
  };
}

export type DiagnosticFaultType = 'NORMAL' | 'OPEN_CIRCUIT' | 'SHORT_TO_GROUND' | 'HIGH_RESISTANCE';

export interface FaultDiagnosticCircuitParams {
  sourceVoltage: number; // 12.0V
  loadResistance: number; // 6.0Ω
  faultType: DiagnosticFaultType;
  faultLocation: 'HARNESS_SUPPLY' | 'SWITCH' | 'HARNESS_GROUND';
  faultResistance?: number; // e.g. 50Ω for high resistance
  fuseIntact: boolean; // false if fuse is blown
}

export interface FaultDiagnosticCircuitResult {
  circuitCurrent: number;
  lampVoltage: number;
  lampGlow: 'BRIGHT' | 'DIM' | 'DARK';
  fuseBlown: boolean;
  nodeVoltages: {
    batPos: number;
    fuseIn: number;
    fuseOut: number;
    switchIn: number;
    switchOut: number;
    lampPos: number;
    lampNeg: number;
    gndStud: number;
  };
}

/**
 * Deterministic circuit model for C02: Three Classic Faults (Open, Short, High Resistance)
 */
export function calculateFaultClassificationCircuit(params: FaultDiagnosticCircuitParams): FaultDiagnosticCircuitResult {
  const { sourceVoltage, loadResistance, faultType, faultLocation, faultResistance = 50.0, fuseIntact } = params;

  if (!fuseIntact) {
    // Blown fuse halts all power downstream
    return {
      circuitCurrent: 0,
      lampVoltage: 0,
      lampGlow: 'DARK',
      fuseBlown: true,
      nodeVoltages: {
        batPos: sourceVoltage,
        fuseIn: sourceVoltage,
        fuseOut: 0,
        switchIn: 0,
        switchOut: 0,
        lampPos: 0,
        lampNeg: 0,
        gndStud: 0,
      },
    };
  }

  if (faultType === 'NORMAL') {
    const current = sourceVoltage / loadResistance;
    return {
      circuitCurrent: current,
      lampVoltage: sourceVoltage,
      lampGlow: 'BRIGHT',
      fuseBlown: false,
      nodeVoltages: {
        batPos: sourceVoltage,
        fuseIn: sourceVoltage,
        fuseOut: sourceVoltage,
        switchIn: sourceVoltage,
        switchOut: sourceVoltage,
        lampPos: sourceVoltage,
        lampNeg: 0,
        gndStud: 0,
      },
    };
  }

  if (faultType === 'SHORT_TO_GROUND') {
    // Short circuit upstream of lamp draws massive current that blows the fuse immediately
    return {
      circuitCurrent: 0,
      lampVoltage: 0,
      lampGlow: 'DARK',
      fuseBlown: true,
      nodeVoltages: {
        batPos: sourceVoltage,
        fuseIn: sourceVoltage,
        fuseOut: 0,
        switchIn: 0,
        switchOut: 0,
        lampPos: 0,
        lampNeg: 0,
        gndStud: 0,
      },
    };
  }

  if (faultType === 'OPEN_CIRCUIT') {
    // Circuit is broken at faultLocation, current = 0A
    let switchIn = sourceVoltage;
    let switchOut = sourceVoltage;
    let lampPos = sourceVoltage;
    let lampNeg = 0;

    if (faultLocation === 'HARNESS_SUPPLY') {
      switchIn = 0;
      switchOut = 0;
      lampPos = 0;
    } else if (faultLocation === 'SWITCH') {
      switchIn = sourceVoltage;
      switchOut = 0;
      lampPos = 0;
    } else if (faultLocation === 'HARNESS_GROUND') {
      // Floating ground: upstream side of open ground float to 12V!
      lampNeg = sourceVoltage;
    }

    return {
      circuitCurrent: 0,
      lampVoltage: 0,
      lampGlow: 'DARK',
      fuseBlown: false,
      nodeVoltages: {
        batPos: sourceVoltage,
        fuseIn: sourceVoltage,
        fuseOut: sourceVoltage,
        switchIn,
        switchOut,
        lampPos,
        lampNeg,
        gndStud: 0,
      },
    };
  }

  // HIGH_RESISTANCE (e.g. 50Ω corroded pin)
  const totalR = loadResistance + faultResistance;
  const current = sourceVoltage / totalR;
  const lampVoltage = current * loadResistance; // e.g. 12 * 6 / 56 ≈ 1.28V (too low to light bulb)

  let lampPos = lampVoltage;
  let lampNeg = 0;

  if (faultLocation === 'HARNESS_SUPPLY' || faultLocation === 'SWITCH') {
    lampPos = lampVoltage;
    lampNeg = 0;
  } else if (faultLocation === 'HARNESS_GROUND') {
    lampPos = sourceVoltage;
    lampNeg = current * faultResistance; // floating ground drop
  }

  return {
    circuitCurrent: current,
    lampVoltage,
    lampGlow: lampVoltage > 8.0 ? 'BRIGHT' : lampVoltage > 2.0 ? 'DIM' : 'DARK',
    fuseBlown: false,
    nodeVoltages: {
      batPos: sourceVoltage,
      fuseIn: sourceVoltage,
      fuseOut: sourceVoltage,
      switchIn: sourceVoltage,
      switchOut: sourceVoltage,
      lampPos,
      lampNeg,
      gndStud: 0,
    },
  };
}
