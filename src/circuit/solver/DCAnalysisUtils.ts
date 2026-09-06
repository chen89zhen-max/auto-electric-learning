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
