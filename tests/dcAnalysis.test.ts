import { describe, it, expect } from 'vitest';
import {
  calculateOhmsLaw,
  calculatePower,
  calculateEnergyBudget,
  calculateFullCircuit,
  calculateVoltageDivider,
  verifyKCL,
  verifyKVL,
} from '@/src/circuit/solver/DCAnalysisUtils';

describe('DC Circuit Analysis Utilities (P3)', () => {
  it('calculates Ohm\'s law correctly in all three forms', () => {
    // U = I * R -> 12V, 2A -> 6 Ohm
    const r1 = calculateOhmsLaw({ voltage: 12, current: 2 });
    expect(r1.resistance).toBeCloseTo(6.0, 6);

    // I = U / R -> 12V, 4 Ohm -> 3A
    const i1 = calculateOhmsLaw({ voltage: 12, resistance: 4 });
    expect(i1.current).toBeCloseTo(3.0, 6);

    // U = I * R -> 0.5A, 24 Ohm -> 12V
    const u1 = calculateOhmsLaw({ current: 0.5, resistance: 24 });
    expect(u1.voltage).toBeCloseTo(12.0, 6);
  });

  it('calculates actual power and flags overload accurately', () => {
    // 12V across 6 Ohm -> I = 2A, P = 24W
    const p1 = calculatePower({ voltage: 12, resistance: 6, ratedPower: 20 });
    expect(p1.current).toBeCloseTo(2.0, 6);
    expect(p1.actualPower).toBeCloseTo(24.0, 6);
    expect(p1.isOverloaded).toBe(true);

    // 6V across 6 Ohm -> P = 6W, rated 24W -> not overloaded
    const p2 = calculatePower({ voltage: 6, resistance: 6, ratedPower: 24 });
    expect(p2.actualPower).toBeCloseTo(6.0, 6);
    expect(p2.isOverloaded).toBe(false);
  });

  it('calculates workshop energy budget and costs accurately', () => {
    // Light 50W for 8h (400Wh), Diagnostic tool 30W for 8h (240Wh), Charger 200W for 8h (1600Wh)
    // Total power = 280W, Total energy = 2240Wh = 2.24 kWh
    // Price = 0.85 Yuan/kWh -> 2.24 * 0.85 = 1.904 Yuan
    const budget = calculateEnergyBudget({
      loads: [
        { name: '工作灯', powerWatts: 50, operatingHours: 8 },
        { name: '诊断平板', powerWatts: 30, operatingHours: 8 },
        { name: '电瓶充电机', powerWatts: 200, operatingHours: 8 },
      ],
      electricityPricePerKWh: 0.85,
    });

    expect(budget.totalPowerWatts).toBe(280);
    expect(budget.energyKWh).toBeCloseTo(2.24, 4);
    expect(budget.totalCostYuan).toBeCloseTo(1.904, 4);
  });

  it('calculates full circuit terminal voltage with internal resistance (V07 & Starter Motor)', () => {
    // E = 12V, r = 1 Ohm, R_load = 5 Ohm -> I = 2A, U_terminal = 10V
    const v07 = calculateFullCircuit({ emf: 12, internalResistance: 1, loadResistance: 5 });
    expect(v07.totalCurrent).toBeCloseTo(2.0, 6);
    expect(v07.terminalVoltage).toBeCloseTo(10.0, 6);
    expect(v07.internalDrop).toBeCloseTo(2.0, 6);

    // Starter motor simulation: E = 12.6V, aged battery r = 0.4 Ohm, starter R_load = 0.2 Ohm
    // Total R = 0.6 Ohm, I = 21A, internal drop = 8.4V, terminal voltage collapses to 4.2V!
    const starter = calculateFullCircuit({ emf: 12.6, internalResistance: 0.4, loadResistance: 0.2 });
    expect(starter.totalCurrent).toBeCloseTo(21.0, 6);
    expect(starter.internalDrop).toBeCloseTo(8.4, 6);
    expect(starter.terminalVoltage).toBeCloseTo(4.2, 6);
  });

  it('evaluates voltage divider unloaded vs loaded condition (V09 Counterexample)', () => {
    // 12V divider: R1 = 1k, R2 = 1k
    // Unloaded: 6V
    // Loaded with 1k: R2_eq = 500 Ohm, V_out = 12 * (500 / 1500) = 4.0V
    const div = calculateVoltageDivider({
      vSource: 12,
      r1: 1000,
      r2: 1000,
      loadResistance: 1000,
    });

    expect(div.unloadedVOut).toBeCloseTo(6.0, 6);
    expect(div.loadedVOut).toBeCloseTo(4.0, 6);
    expect(div.loadingErrorPercent).toBeCloseTo(33.3333, 2);
  });

  it('verifies KCL and KVL conservation', () => {
    // KCL at node: I_in = 5.0A, I_out1 = 2.0A, I_out2 = 3.0A
    expect(verifyKCL([5.0], [2.0, 3.0])).toBe(true);
    expect(verifyKCL([5.0], [2.0, 2.5])).toBe(false);

    // KVL in closed loop: +12V (source) - 7V (lamp1) - 5V (lamp2) = 0
    expect(verifyKVL([12.0, -7.0, -5.0])).toBe(true);
    expect(verifyKVL([12.0, -7.0, -4.0])).toBe(false);
  });
});
