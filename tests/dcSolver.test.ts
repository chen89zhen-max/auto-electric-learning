import { describe, it, expect } from 'vitest';
import { DCSolver } from '../src/circuit/solver/DCSolver';

describe('DCSolver - MNA Engine Benchmark Tests (Task Book Section 3)', () => {
  // V01: 12V 串联 6Ω、6Ω -> I=1A；各压降6V；总功率12W
  it('V01: 12V series with two 6Ω resistors produces 1A current, 6V drops, and 12W total power', () => {
    const solver = new DCSolver('0');
    solver.addVoltageSource({ id: 'BAT', nodePos: '1', nodeNeg: '0', voltage: 12 });
    solver.addResistor({ id: 'R1', nodeA: '1', nodeB: '2', resistance: 6 });
    solver.addResistor({ id: 'R2', nodeA: '2', nodeB: '0', resistance: 6 });

    const res = solver.solve();
    expect(res.success).toBe(true);

    const v1 = res.nodeVoltages.get('1')!;
    const v2 = res.nodeVoltages.get('2')!;
    const v0 = res.nodeVoltages.get('0')!;

    expect(v1).toBeCloseTo(12, 6);
    expect(v2).toBeCloseTo(6, 6);
    expect(v0).toBeCloseTo(0, 6);

    const iBat = res.branchCurrents.get('BAT')!;
    const iR1 = res.branchCurrents.get('R1')!;
    const iR2 = res.branchCurrents.get('R2')!;

    expect(iBat).toBeCloseTo(1.0, 6);
    expect(iR1).toBeCloseTo(1.0, 6);
    expect(iR2).toBeCloseTo(1.0, 6);

    const vDropR1 = res.branchVoltages.get('R1')!;
    const vDropR2 = res.branchVoltages.get('R2')!;
    expect(vDropR1).toBeCloseTo(6.0, 6);
    expect(vDropR2).toBeCloseTo(6.0, 6);

    const pTotal = res.powers.get('BAT')!;
    expect(pTotal).toBeCloseTo(12.0, 6);
  });

  // V02: 12V 并联 6Ω、6Ω -> 各2A，总4A；等效3Ω；断一支另支仍2A
  it('V02: 12V parallel with two 6Ω resistors produces 2A each, total 4A, Req=3Ω; disconnecting one leaves other at 2A', () => {
    const solver = new DCSolver('0');
    solver.addVoltageSource({ id: 'BAT', nodePos: '1', nodeNeg: '0', voltage: 12 });
    solver.addResistor({ id: 'R1', nodeA: '1', nodeB: '0', resistance: 6 });
    solver.addResistor({ id: 'R2', nodeA: '1', nodeB: '0', resistance: 6 });

    const res = solver.solve();
    expect(res.success).toBe(true);

    expect(res.branchCurrents.get('R1')).toBeCloseTo(2.0, 6);
    expect(res.branchCurrents.get('R2')).toBeCloseTo(2.0, 6);
    expect(res.branchCurrents.get('BAT')).toBeCloseTo(4.0, 6);

    // Equivalent resistance = V / I_tot = 12 / 4 = 3 Ohm
    const req = 12.0 / res.branchCurrents.get('BAT')!;
    expect(req).toBeCloseTo(3.0, 6);

    // Disconnect R2 (e.g. by clearing and adding only R1)
    const solverDisconnected = new DCSolver('0');
    solverDisconnected.addVoltageSource({ id: 'BAT', nodePos: '1', nodeNeg: '0', voltage: 12 });
    solverDisconnected.addResistor({ id: 'R1', nodeA: '1', nodeB: '0', resistance: 6 });
    const resDisc = solverDisconnected.solve();
    expect(resDisc.branchCurrents.get('R1')).toBeCloseTo(2.0, 6);
    expect(resDisc.branchCurrents.get('BAT')).toBeCloseTo(2.0, 6);
  });

  // V07: 12V源，内阻1Ω，负载5Ω -> I=2A，端电压10V，内压降2V；开路端电压12V
  it('V07: 12V source with 1Ω internal resistance and 5Ω load yields I=2A, Vterm=10V, Vint=2V; open circuit Vterm=12V', () => {
    const solver = new DCSolver('0');
    solver.addVoltageSource({ id: 'BAT', nodePos: '1', nodeNeg: '0', voltage: 12, internalResistance: 1.0 });
    solver.addResistor({ id: 'R_LOAD', nodeA: '1', nodeB: '0', resistance: 5.0 });

    const res = solver.solve();
    expect(res.success).toBe(true);

    const i = res.branchCurrents.get('BAT')!;
    const vTerm = res.branchVoltages.get('BAT')!;
    const vInt = 12.0 - vTerm;

    expect(i).toBeCloseTo(2.0, 6);
    expect(vTerm).toBeCloseTo(10.0, 6);
    expect(vInt).toBeCloseTo(2.0, 6);

    // Open circuit test (no load)
    const openSolver = new DCSolver('0');
    openSolver.addVoltageSource({ id: 'BAT', nodePos: '1', nodeNeg: '0', voltage: 12, internalResistance: 1.0 });
    const openRes = openSolver.solve();
    expect(openRes.success).toBe(true);
    expect(openRes.nodeVoltages.get('1')).toBeCloseTo(12.0, 6);
    expect(openRes.branchCurrents.get('BAT')).toBeCloseTo(0.0, 6);
  });

  // V08: 12V；6Ω灯＋0.5Ω供电接点＋0.1Ω搭铁 -> I≈1.818181818A；灯压≈10.909090909V；两侧压降和灯压相加12V
  it('V08: 12V circuit with 6Ω lamp + 0.5Ω supply contact + 0.1Ω chassis ground contact', () => {
    const solver = new DCSolver('0');
    solver.addVoltageSource({ id: 'BAT', nodePos: '1', nodeNeg: '0', voltage: 12.0 });
    solver.addResistor({ id: 'R_SUPPLY', nodeA: '1', nodeB: '2', resistance: 0.5 });
    solver.addResistor({ id: 'R_LAMP', nodeA: '2', nodeB: '3', resistance: 6.0 });
    solver.addResistor({ id: 'R_GROUND', nodeA: '3', nodeB: '0', resistance: 0.1 });

    const res = solver.solve();
    expect(res.success).toBe(true);

    const current = res.branchCurrents.get('R_LAMP')!;
    const expectedCurrent = 12.0 / 6.6; // ≈ 1.818181818 A
    expect(current).toBeCloseTo(expectedCurrent, 6);

    const vLamp = res.branchVoltages.get('R_LAMP')!;
    const vSupply = res.branchVoltages.get('R_SUPPLY')!;
    const vGround = res.branchVoltages.get('R_GROUND')!;

    expect(vLamp).toBeCloseTo(10.909090909, 6);
    expect(vSupply).toBeCloseTo(0.909090909, 6);
    expect(vGround).toBeCloseTo(0.181818182, 6);

    // Sum of drops equals battery voltage (KVL)
    expect(vLamp + vSupply + vGround).toBeCloseTo(12.0, 6);
  });

  // V09: 12V分压，上下各1kΩ；给下支并接1kΩ负载 -> 空载输出6V，带载输出4V；不能仍显示6V
  it('V09: 12V divider with two 1kΩ resistors yields unloaded 6V, loaded 4V with 1kΩ parallel load', () => {
    // Unloaded
    const unloadedSolver = new DCSolver('0');
    unloadedSolver.addVoltageSource({ id: 'BAT', nodePos: '1', nodeNeg: '0', voltage: 12.0 });
    unloadedSolver.addResistor({ id: 'R_TOP', nodeA: '1', nodeB: '2', resistance: 1000.0 });
    unloadedSolver.addResistor({ id: 'R_BOTTOM', nodeA: '2', nodeB: '0', resistance: 1000.0 });

    const unloadedRes = unloadedSolver.solve();
    expect(unloadedRes.success).toBe(true);
    expect(unloadedRes.nodeVoltages.get('2')).toBeCloseTo(6.0, 6);

    // Loaded: parallel 1kΩ across R_BOTTOM
    const loadedSolver = new DCSolver('0');
    loadedSolver.addVoltageSource({ id: 'BAT', nodePos: '1', nodeNeg: '0', voltage: 12.0 });
    loadedSolver.addResistor({ id: 'R_TOP', nodeA: '1', nodeB: '2', resistance: 1000.0 });
    loadedSolver.addResistor({ id: 'R_BOTTOM', nodeA: '2', nodeB: '0', resistance: 1000.0 });
    loadedSolver.addResistor({ id: 'R_LOAD', nodeA: '2', nodeB: '0', resistance: 1000.0 });

    const loadedRes = loadedSolver.solve();
    expect(loadedRes.success).toBe(true);
    // Req_bottom = 500Ω, Vout = 12 * 500 / 1500 = 4.0V
    expect(loadedRes.nodeVoltages.get('2')).toBeCloseTo(4.0, 6);
    expect(loadedRes.nodeVoltages.get('2')).not.toBeCloseTo(6.0, 1);
  });

  // Switch testing
  it('correctly models switch open and closed states', () => {
    const solver = new DCSolver('0');
    solver.addVoltageSource({ id: 'BAT', nodePos: '1', nodeNeg: '0', voltage: 12.0 });
    solver.addSwitch({ id: 'SW1', nodeA: '1', nodeB: '2', closed: false });
    solver.addResistor({ id: 'LAMP', nodeA: '2', nodeB: '0', resistance: 6.0 });

    // Open switch: current is 0, lamp voltage is 0, switch voltage is 12V
    const openRes = solver.solve();
    expect(openRes.branchCurrents.get('LAMP')).toBeCloseTo(0.0, 4);
    expect(openRes.branchVoltages.get('LAMP')).toBeCloseTo(0.0, 4);
    expect(openRes.nodeVoltages.get('2')).toBeCloseTo(0.0, 4);
    expect(openRes.branchVoltages.get('SW1')).toBeCloseTo(12.0, 4);

    // Closed switch: current is 2A, lamp voltage is 12V, switch voltage is 0V
    const closedSolver = new DCSolver('0');
    closedSolver.addVoltageSource({ id: 'BAT', nodePos: '1', nodeNeg: '0', voltage: 12.0 });
    closedSolver.addSwitch({ id: 'SW1', nodeA: '1', nodeB: '2', closed: true });
    closedSolver.addResistor({ id: 'LAMP', nodeA: '2', nodeB: '0', resistance: 6.0 });

    const closedRes = closedSolver.solve();
    expect(closedRes.branchCurrents.get('LAMP')).toBeCloseTo(2.0, 4);
    expect(closedRes.branchVoltages.get('LAMP')).toBeCloseTo(12.0, 4);
    expect(closedRes.branchVoltages.get('SW1')).toBeCloseTo(0.0, 4);
  });

  // Potentiometer testing
  it('correctly models potentiometer division at various wiper ratios', () => {
    const potSolver = new DCSolver('0');
    potSolver.addVoltageSource({ id: 'BAT', nodePos: '1', nodeNeg: '0', voltage: 10.0 });
    potSolver.addPotentiometer({
      id: 'POT1',
      nodeA: '1',
      nodeB: '0',
      nodeWiper: 'W',
      totalResistance: 10000,
      wiperRatio: 0.7, // 70% from A to B: R_AW = 7000Ω, R_WB = 3000Ω
    });

    const potRes = potSolver.solve();
    expect(potRes.success).toBe(true);
    // V_A = 10V, V_B = 0V. V_W = 10 * 3000 / 10000 = 3.0V (or with ratio 0.7 from A, V_W = 3V)
    expect(potRes.nodeVoltages.get('W')).toBeCloseTo(3.0, 4);
  });
});
