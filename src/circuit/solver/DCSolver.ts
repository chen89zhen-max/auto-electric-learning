/**
 * DC Circuit Modified Nodal Analysis (MNA) Solver
 * Accurately solves linear DC circuits containing:
 * - Voltage sources (ideal or with series internal resistance)
 * - Resistors & Potentiometers
 * - Switches (open/closed)
 * - Load devices (lamps, motors, resistors)
 * - Multimeter and clamp meter loading
 */

import { Matrix } from './Matrix';

export interface DCSolverVoltageSource {
  id: string;
  nodePos: string;
  nodeNeg: string;
  voltage: number;
  internalResistance?: number; // Internal resistance r >= 0
}

export interface DCSolverResistor {
  id: string;
  nodeA: string;
  nodeB: string;
  resistance: number; // Resistance in Ohms (R > 0)
}

export interface DCSolverSwitch {
  id: string;
  nodeA: string;
  nodeB: string;
  closed: boolean;
}

export interface DCSolverPotentiometer {
  id: string;
  nodeA: string;      // Fixed terminal A
  nodeB: string;      // Fixed terminal B
  nodeWiper: string;  // Wiper terminal W
  totalResistance: number;
  wiperRatio: number; // 0.0 to 1.0 (0.0 = all the way to A, 1.0 = all the way to B)
}

export interface DCSolverResult {
  success: boolean;
  errorMessage?: string;
  nodeVoltages: Map<string, number>;
  branchCurrents: Map<string, number>;
  branchVoltages: Map<string, number>;
  powers: Map<string, number>;
}

export class DCSolver {
  private voltageSources: DCSolverVoltageSource[] = [];
  private resistors: DCSolverResistor[] = [];
  private switches: DCSolverSwitch[] = [];
  private potentiometers: DCSolverPotentiometer[] = [];
  private groundNodeId: string = '0';

  constructor(groundNodeId = '0') {
    this.groundNodeId = groundNodeId;
  }

  public setGroundNode(nodeId: string): this {
    this.groundNodeId = nodeId;
    return this;
  }

  public addVoltageSource(source: DCSolverVoltageSource): this {
    this.voltageSources.push(source);
    return this;
  }

  public addResistor(resistor: DCSolverResistor): this {
    this.resistors.push(resistor);
    return this;
  }

  public addSwitch(sw: DCSolverSwitch): this {
    this.switches.push(sw);
    return this;
  }

  public addPotentiometer(pot: DCSolverPotentiometer): this {
    this.potentiometers.push(pot);
    return this;
  }

  public clear(): void {
    this.voltageSources = [];
    this.resistors = [];
    this.switches = [];
    this.potentiometers = [];
  }

  /**
   * Solves the circuit using Modified Nodal Analysis (MNA).
   */
  public solve(): DCSolverResult {
    // 1. Collect all effective resistors
    interface EffectiveResistor {
      id: string;
      nodeA: string;
      nodeB: string;
      r: number;
    }

    const allResistors: EffectiveResistor[] = [];

    // Normal resistors
    for (const r of this.resistors) {
      if (r.resistance <= 0) {
        // Guard against division by zero: minimum resistance 1e-6 Ohm
        allResistors.push({ id: r.id, nodeA: r.nodeA, nodeB: r.nodeB, r: 1e-6 });
      } else {
        allResistors.push({ id: r.id, nodeA: r.nodeA, nodeB: r.nodeB, r: r.resistance });
      }
    }

    // Switches: closed = tiny resistance, open = huge resistance
    for (const sw of this.switches) {
      const r = sw.closed ? 1e-6 : 1e11;
      allResistors.push({ id: sw.id, nodeA: sw.nodeA, nodeB: sw.nodeB, r });
    }

    // Potentiometers: split into two variable resistors (A-Wiper and Wiper-B)
    for (const pot of this.potentiometers) {
      const ratio = Math.max(0, Math.min(1, pot.wiperRatio));
      const totalR = Math.max(1e-6, pot.totalResistance);
      const rAW = Math.max(1e-6, totalR * ratio);
      const rWB = Math.max(1e-6, totalR * (1 - ratio));

      allResistors.push({ id: `${pot.id}_AW`, nodeA: pot.nodeA, nodeB: pot.nodeWiper, r: rAW });
      allResistors.push({ id: `${pot.id}_WB`, nodeA: pot.nodeWiper, nodeB: pot.nodeB, r: rWB });
    }

    // 2. Identify all unique nodes
    const nodeSet = new Set<string>();
    nodeSet.add(this.groundNodeId);

    for (const r of allResistors) {
      nodeSet.add(r.nodeA);
      nodeSet.add(r.nodeB);
    }
    for (const vs of this.voltageSources) {
      nodeSet.add(vs.nodePos);
      nodeSet.add(vs.nodeNeg);
    }

    // Non-ground nodes map to matrix indices [0 .. N-1]
    const nonGroundNodes: string[] = [];
    const nodeToIndex = new Map<string, number>();

    for (const node of nodeSet) {
      if (node !== this.groundNodeId) {
        nodeToIndex.set(node, nonGroundNodes.length);
        nonGroundNodes.push(node);
      }
    }

    const N = nonGroundNodes.length;
    const M = this.voltageSources.length;
    const totalDim = N + M;

    if (totalDim === 0) {
      return {
        success: true,
        nodeVoltages: new Map(),
        branchCurrents: new Map(),
        branchVoltages: new Map(),
        powers: new Map(),
      };
    }

    // Initialize MNA matrix A and RHS vector b
    const A: number[][] = Array.from({ length: totalDim }, () => Array.from({ length: totalDim }, () => 0));
    const b: number[] = Array.from({ length: totalDim }, () => 0);

    // Add minimal conductance to ground (1e-12 S = 1 TOhm) to all nodes
    // to prevent matrix singularity from floating/disconnected passive subcircuits
    const G_MIN = 1e-12;
    for (let i = 0; i < N; i++) {
      A[i][i] += G_MIN;
    }

    // 3. Stamp conductances into G submatrix (N x N)
    for (const res of allResistors) {
      if (res.nodeA === res.nodeB) continue; // Shorted to self
      const G = 1.0 / res.r;

      const idxA = nodeToIndex.get(res.nodeA);
      const idxB = nodeToIndex.get(res.nodeB);

      if (idxA !== undefined && idxB !== undefined) {
        A[idxA][idxA] += G;
        A[idxB][idxB] += G;
        A[idxA][idxB] -= G;
        A[idxB][idxA] -= G;
      } else if (idxA !== undefined) {
        // nodeB is ground
        A[idxA][idxA] += G;
      } else if (idxB !== undefined) {
        // nodeA is ground
        A[idxB][idxB] += G;
      }
    }

    // 4. Stamp voltage sources into B (N x M), C (M x N), D (M x M)
    for (let m = 0; m < M; m++) {
      const vs = this.voltageSources[m];
      const vsRow = N + m;

      const idxPos = nodeToIndex.get(vs.nodePos);
      const idxNeg = nodeToIndex.get(vs.nodeNeg);

      if (idxPos !== undefined) {
        A[idxPos][vsRow] += 1.0;
        A[vsRow][idxPos] += 1.0;
      }
      if (idxNeg !== undefined) {
        A[idxNeg][vsRow] -= 1.0;
        A[vsRow][idxNeg] -= 1.0;
      }

      // Internal resistance r: equation is Vpos - Vneg - r * I = V_emf
      const rInt = vs.internalResistance ?? 0;
      if (rInt > 0) {
        A[vsRow][vsRow] = -rInt;
      }

      b[vsRow] = vs.voltage;
    }

    // 5. Solve linear system A * x = b
    const solution = Matrix.solveLinearSystem(A, b);

    if (!solution) {
      return {
        success: false,
        errorMessage: 'MNA Solver failed to solve circuit equations (singular or invalid topology)',
        nodeVoltages: new Map(),
        branchCurrents: new Map(),
        branchVoltages: new Map(),
        powers: new Map(),
      };
    }

    // 6. Extract node potentials
    const nodeVoltages = new Map<string, number>();
    nodeVoltages.set(this.groundNodeId, 0.0);

    for (let i = 0; i < N; i++) {
      const nodeName = nonGroundNodes[i];
      nodeVoltages.set(nodeName, solution[i]);
    }

    const branchCurrents = new Map<string, number>();
    const branchVoltages = new Map<string, number>();
    const powers = new Map<string, number>();

    // 7. Calculate resistor currents and powers
    for (const res of allResistors) {
      const vA = nodeVoltages.get(res.nodeA) ?? 0;
      const vB = nodeVoltages.get(res.nodeB) ?? 0;
      const vDrop = vA - vB;
      const current = vDrop / res.r; // From A to B
      const p = Math.abs(vDrop * current);

      branchVoltages.set(res.id, Math.abs(vDrop));
      branchCurrents.set(res.id, Math.abs(current));
      powers.set(res.id, p);
    }

    // For potentiometers, also report total resistance and total voltage drop
    for (const pot of this.potentiometers) {
      const vA = nodeVoltages.get(pot.nodeA) ?? 0;
      const vB = nodeVoltages.get(pot.nodeB) ?? 0;
      const vW = nodeVoltages.get(pot.nodeWiper) ?? 0;
      branchVoltages.set(`${pot.id}_TOTAL`, Math.abs(vA - vB));
      branchVoltages.set(`${pot.id}_AW`, Math.abs(vA - vW));
      branchVoltages.set(`${pot.id}_WB`, Math.abs(vW - vB));
    }

    // 8. Calculate voltage source currents and terminal voltages
    for (let m = 0; m < M; m++) {
      const vs = this.voltageSources[m];
      const vsRow = N + m;
      // Current flowing OUT of the positive terminal into the circuit
      const iSource = -solution[vsRow];
      const vPos = nodeVoltages.get(vs.nodePos) ?? 0;
      const vNeg = nodeVoltages.get(vs.nodeNeg) ?? 0;
      const vTerminal = vPos - vNeg;

      branchCurrents.set(vs.id, iSource);
      branchVoltages.set(vs.id, vTerminal);
      powers.set(vs.id, vTerminal * iSource);
    }

    return {
      success: true,
      nodeVoltages,
      branchCurrents,
      branchVoltages,
      powers,
    };
  }
}
