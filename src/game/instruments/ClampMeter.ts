/**
 * Automotive Non-Contact Clamp Meter Model
 * Used for A04 clamp meter task
 */

export interface ClampedWire {
  id: string;
  name: string;
  current: number; // Signed current flowing through conductor
  direction: 'FEED' | 'RETURN';
}

export interface ClampMeterState {
  dial: 'OFF' | 'DC_A' | 'AC_A';
  jawOpen: boolean;
  clampedWireIds: string[];
  displayText: string;
  measuredCurrent: number;
  unit: string;
  educationalNote?: string;
}

export class ClampMeter {
  private state: ClampMeterState;

  constructor() {
    this.state = {
      dial: 'OFF',
      jawOpen: false,
      clampedWireIds: [],
      displayText: '',
      measuredCurrent: 0,
      unit: '',
    };
  }

  public getState(): ClampMeterState {
    return { ...this.state };
  }

  public setDial(dial: 'OFF' | 'DC_A' | 'AC_A'): void {
    this.state.dial = dial;
    if (dial === 'OFF') {
      this.state.displayText = '';
      this.state.measuredCurrent = 0;
      this.state.unit = '';
    } else {
      this.state.unit = 'A';
    }
  }

  public openJaw(): void {
    this.state.jawOpen = true;
  }

  public closeJaw(): void {
    this.state.jawOpen = false;
  }

  public clampWires(wires: ClampedWire[]): ClampMeterState {
    this.state.clampedWireIds = wires.map((w) => w.id);

    if (this.state.dial === 'OFF') {
      this.state.displayText = '';
      this.state.measuredCurrent = 0;
      return this.getState();
    }

    if (wires.length === 0) {
      this.state.measuredCurrent = 0;
      this.state.displayText = '0.00 A';
      this.state.educationalNote = undefined;
      return this.getState();
    }

    // Single conductor clamped
    if (wires.length === 1) {
      const current = Math.abs(wires[0].current);
      this.state.measuredCurrent = current;
      this.state.displayText = `${current.toFixed(2)} A`;
      this.state.educationalNote = `非接触钳测成功：测得 ${wires[0].name} 支路电流为 ${current.toFixed(2)}A。无需剥线断开回路。`;
      return this.getState();
    }

    // Multiple conductors clamped simultaneously (e.g. feed + return wire)
    // Ampere's Law: Net flux = sum of signed currents
    let netCurrent = 0;
    for (const w of wires) {
      netCurrent += w.direction === 'FEED' ? w.current : -w.current;
    }
    const netMagnitude = Math.abs(netCurrent);

    this.state.measuredCurrent = netMagnitude;
    this.state.displayText = `${netMagnitude.toFixed(2)} A`;
    if (netMagnitude < 0.05 && wires.some((w) => Math.abs(w.current) > 0.5)) {
      this.state.educationalNote =
        '教学反例提醒：同时钳入供电线与搭铁回路时，两根导线磁场相互抵消，钳形表示数近似为 0A！在实际车辆排故中，必须单独钳入单根导线。';
    }

    return this.getState();
  }
}
