/**
 * Universal Digital Multimeter (DMM) Model
 * Compliant with P2 specifications & Task Book Section 3 (V03, V04, V05, V06)
 */

export type MultimeterDialMode =
  | 'OFF'
  | 'DC_V'
  | 'AC_V'
  | 'RESISTANCE'
  | 'DC_A'
  | 'CONTINUITY';

export type MultimeterJack = 'COM' | 'V_OHM' | 'A_10A' | 'MA_UA';

export type MultimeterStatus =
  | 'NORMAL'
  | 'JACK_MISMATCH'
  | 'REFUSED_LIVE_CIRCUIT' // V05: Live network resistance measurement refused
  | 'REFUSED_SHORT_CIRCUIT' // V06: Direct battery bridge with A meter intercepted
  | 'OVER_LIMIT'          // O.L
  | 'FUSE_BLOWN';

export interface MultimeterState {
  dial: MultimeterDialMode;
  blackProbeJack: MultimeterJack;
  redProbeJack: MultimeterJack;
  redProbeTerminalId: string | null;
  blackProbeTerminalId: string | null;
  fuseBlown: boolean;
  status: MultimeterStatus;
  displayText: string;
  measuredValue: number | null;
  unit: string;
  warningMessage?: string;
}

export interface CircuitTerminalProbeInfo {
  terminalId: string;
  nodeId: string;
  componentId: string;
  isLiveNetwork?: boolean; // Is connected to an active power source
}

export class Multimeter {
  private state: MultimeterState;

  constructor() {
    this.state = {
      dial: 'OFF',
      blackProbeJack: 'COM',
      redProbeJack: 'V_OHM',
      redProbeTerminalId: null,
      blackProbeTerminalId: null,
      fuseBlown: false,
      status: 'NORMAL',
      displayText: '',
      measuredValue: null,
      unit: '',
    };
  }

  public getState(): MultimeterState {
    return { ...this.state };
  }

  public setDial(dial: MultimeterDialMode): void {
    this.state.dial = dial;
    this.state.status = 'NORMAL';
    this.state.warningMessage = undefined;
    if (dial === 'OFF') {
      this.state.displayText = '';
      this.state.measuredValue = null;
      this.state.unit = '';
      return;
    }
    if (dial === 'DC_A') {
      // Prompt if red probe is still in V_OHM
      if (this.state.redProbeJack === 'V_OHM') {
        this.state.redProbeJack = 'A_10A';
      }
    } else if (dial === 'DC_V' || dial === 'RESISTANCE' || dial === 'CONTINUITY') {
      if (this.state.redProbeJack === 'A_10A' || this.state.redProbeJack === 'MA_UA') {
        this.state.redProbeJack = 'V_OHM';
      }
    }
  }

  public setRedProbeJack(jack: MultimeterJack): void {
    this.state.redProbeJack = jack;
  }

  public setBlackProbeJack(jack: MultimeterJack): void {
    this.state.blackProbeJack = jack;
  }

  public attachRedProbe(terminalId: string | null): void {
    this.state.redProbeTerminalId = terminalId;
  }

  public attachBlackProbe(terminalId: string | null): void {
    this.state.blackProbeTerminalId = terminalId;
  }

  /**
   * Resets any blown fuse or warning status.
   */
  public resetFuse(): void {
    this.state.fuseBlown = false;
    this.state.status = 'NORMAL';
    this.state.warningMessage = undefined;
  }

  /**
   * Evaluates the measurement given the electrical node potentials or branch state.
   */
  public measure(context: {
    nodeVoltages?: Map<string, number>;
    redNode?: string;
    blackNode?: string;
    isCircuitPowered?: boolean;
    isolatedResistance?: number | null; // For cold resistance measurement
    branchCurrent?: number;             // For series ammeter measurement
    isDirectBatteryBridge?: boolean;     // If A-meter directly connects across battery terminals
  }): MultimeterState {
    if (this.state.dial === 'OFF') {
      this.state.displayText = '';
      this.state.measuredValue = null;
      this.state.unit = '';
      this.state.status = 'NORMAL';
      return this.getState();
    }

    if (this.state.fuseBlown) {
      this.state.status = 'FUSE_BLOWN';
      this.state.displayText = '0.00';
      this.state.measuredValue = 0;
      this.state.warningMessage = '万用表内部保险丝已熔断，无法测量！请更换保险丝。';
      return this.getState();
    }

    // Check jack sanity
    if (this.state.blackProbeJack !== 'COM') {
      this.state.status = 'JACK_MISMATCH';
      this.state.displayText = 'Err';
      this.state.measuredValue = null;
      this.state.warningMessage = '黑表笔必须插入 COM 公共插孔！';
      return this.getState();
    }

    // --- DC_V MODE ---
    if (this.state.dial === 'DC_V') {
      if (this.state.redProbeJack !== 'V_OHM') {
        this.state.status = 'JACK_MISMATCH';
        this.state.displayText = 'Err';
        this.state.measuredValue = null;
        this.state.warningMessage = '测量电压时，红表笔必须插入 VΩ 插孔！请切勿插在电流插孔。';
        return this.getState();
      }

      this.state.unit = 'V';
      if (!context.redNode || !context.blackNode || !context.nodeVoltages) {
        // Probes floating or not connected
        this.state.status = 'NORMAL';
        this.state.displayText = '0.00 V';
        this.state.measuredValue = 0.0;
        return this.getState();
      }

      const vRed = context.nodeVoltages.get(context.redNode) ?? 0;
      const vBlack = context.nodeVoltages.get(context.blackNode) ?? 0;
      // V03: Swapping probes flips sign cleanly (e.g. +12V -> -12V) without error!
      const vDiff = vRed - vBlack;

      this.state.status = 'NORMAL';
      this.state.measuredValue = vDiff;
      // Format with reasonable resolution
      this.state.displayText = `${vDiff >= 0 ? '' : '-'}${Math.abs(vDiff).toFixed(2)} V`;
      return this.getState();
    }

    // --- RESISTANCE (Ω) MODE ---
    if (this.state.dial === 'RESISTANCE') {
      if (this.state.redProbeJack !== 'V_OHM') {
        this.state.status = 'JACK_MISMATCH';
        this.state.displayText = 'Err';
        this.state.measuredValue = null;
        this.state.warningMessage = '测量电阻时，红表笔必须插入 VΩ 插孔！';
        return this.getState();
      }

      this.state.unit = 'Ω';

      // V05: Refuse measurement on live network!
      if (context.isCircuitPowered) {
        this.state.status = 'REFUSED_LIVE_CIRCUIT';
        this.state.displayText = 'Err';
        this.state.measuredValue = null;
        this.state.warningMessage = '安全规则拦截：严禁在带电网络中使用电阻挡！请先切断电源或断开被测元件隔离后再测。';
        return this.getState();
      }

      // Probes disconnected or open circuit
      if (context.isolatedResistance === undefined || context.isolatedResistance === null || context.isolatedResistance >= 1e8) {
        this.state.status = 'OVER_LIMIT';
        this.state.displayText = 'O.L';
        this.state.measuredValue = Infinity;
        return this.getState();
      }

      this.state.status = 'NORMAL';
      this.state.measuredValue = context.isolatedResistance;
      if (context.isolatedResistance >= 1000000) {
        this.state.displayText = `${(context.isolatedResistance / 1000000).toFixed(2)} MΩ`;
      } else if (context.isolatedResistance >= 1000) {
        this.state.displayText = `${(context.isolatedResistance / 1000).toFixed(2)} kΩ`;
      } else {
        this.state.displayText = `${context.isolatedResistance.toFixed(1)} Ω`;
      }
      return this.getState();
    }

    // --- DC_A MODE ---
    if (this.state.dial === 'DC_A') {
      if (this.state.redProbeJack !== 'A_10A' && this.state.redProbeJack !== 'MA_UA') {
        this.state.status = 'JACK_MISMATCH';
        this.state.displayText = 'Err';
        this.state.measuredValue = null;
        this.state.warningMessage = '测量电流时，红表笔必须插入 10A 或 mA/μA 插孔！';
        return this.getState();
      }

      this.state.unit = 'A';

      // V06: Dangerous short-circuit bridging check!
      if (context.isDirectBatteryBridge) {
        this.state.status = 'REFUSED_SHORT_CIRCUIT';
        this.state.displayText = 'Err';
        this.state.measuredValue = null;
        this.state.fuseBlown = true; // Blow fuse on execution
        this.state.warningMessage = '危险拦截：电流挡内阻极小，严禁直接并联/跨接在蓄电池或电源两端！此操作会导致蓄电池短路并将仪表保险丝瞬间熔断！';
        return this.getState();
      }

      const current = context.branchCurrent ?? 0;
      this.state.status = 'NORMAL';
      this.state.measuredValue = current;
      this.state.displayText = `${current.toFixed(2)} A`;
      return this.getState();
    }

    // --- CONTINUITY MODE ---
    if (this.state.dial === 'CONTINUITY') {
      if (context.isCircuitPowered) {
        this.state.status = 'REFUSED_LIVE_CIRCUIT';
        this.state.displayText = 'Err';
        this.state.measuredValue = null;
        this.state.warningMessage = '蜂鸣挡严禁在带电网络中测量！';
        return this.getState();
      }

      const r = context.isolatedResistance ?? Infinity;
      if (r < 50) {
        // Less than 50 Ohm: continuous beep!
        this.state.status = 'NORMAL';
        this.state.measuredValue = r;
        this.state.displayText = `${r.toFixed(1)} Ω 🔔`;
      } else {
        this.state.status = 'OVER_LIMIT';
        this.state.displayText = 'O.L';
        this.state.measuredValue = Infinity;
      }
      return this.getState();
    }

    return this.getState();
  }

  /**
   * Helper utility to verify resistor tolerance compliance (Benchmark V04).
   * E.g. 220Ω ± 5% -> bounds [209Ω, 231Ω].
   */
  public static evaluateTolerance(
    measured: number,
    nominal: number,
    tolerancePercent: number
  ): {
    isQualified: boolean;
    minAllowed: number;
    maxAllowed: number;
    errorRatio: number;
  } {
    const delta = nominal * (tolerancePercent / 100);
    const minAllowed = nominal - delta;
    const maxAllowed = nominal + delta;
    const isQualified = measured >= minAllowed - 1e-6 && measured <= maxAllowed + 1e-6;
    const errorRatio = Math.abs(measured - nominal) / nominal;

    return {
      isQualified,
      minAllowed,
      maxAllowed,
      errorRatio,
    };
  }
}
