import { CircuitGraph } from './CircuitGraph';
import { PathAnalyzer } from './PathAnalyzer';
import {
  CircuitAnalysis,
  CircuitComponent,
} from './CircuitTypes';

export class CircuitTopologyEngine {
  public graph: CircuitGraph;

  constructor() {
    this.graph = new CircuitGraph();
    this.initDefaultLevel02Components();
  }

  initDefaultLevel02Components(): void {
    const battery: CircuitComponent = {
      id: 'BAT1',
      type: 'BATTERY',
      name: '12V 直流蓄电池',
      terminals: [
        { id: 'BAT_POS', componentId: 'BAT1', name: '正极 (+)', polarity: 'POS' },
        { id: 'BAT_NEG', componentId: 'BAT1', name: '负极 (-)', polarity: 'NEG' },
      ],
      state: 'NORMAL',
      schematicSymbolId: 'SYM_BAT1',
    };

    const fuse: CircuitComponent = {
      id: 'F1',
      type: 'FUSE',
      name: '10A 熔断器',
      terminals: [
        { id: 'FUSE_T1', componentId: 'F1', name: '输入端' },
        { id: 'FUSE_T2', componentId: 'F1', name: '输出端' },
      ],
      state: 'NORMAL',
      schematicSymbolId: 'SYM_F1',
    };

    const sw: CircuitComponent = {
      id: 'S1',
      type: 'SWITCH',
      name: '检修灯开关',
      terminals: [
        { id: 'SW_T1', componentId: 'S1', name: '动触点 1' },
        { id: 'SW_T2', componentId: 'S1', name: '静触点 2' },
      ],
      state: 'OPEN',
      schematicSymbolId: 'SYM_S1',
    };

    const lamp: CircuitComponent = {
      id: 'L1',
      type: 'LAMP',
      name: '12V 检修工作灯',
      terminals: [
        { id: 'LAMP_T1', componentId: 'L1', name: '灯头正极' },
        { id: 'LAMP_T2', componentId: 'L1', name: '灯头负极' },
      ],
      state: 'NORMAL',
      schematicSymbolId: 'SYM_L1',
    };

    const groundBus: CircuitComponent = {
      id: 'GND_CHASSIS',
      type: 'GROUND_BUS',
      name: '车身金属搭铁总线',
      terminals: [
        { id: 'CHASSIS_BAT_LUG', componentId: 'GND_CHASSIS', name: '蓄电池搭铁螺栓' },
        { id: 'CHASSIS_LAMP_LUG', componentId: 'GND_CHASSIS', name: '灯头搭铁螺栓' },
      ],
      state: 'NORMAL',
      schematicSymbolId: 'SYM_GND',
    };

    this.graph.addComponent(battery);
    this.graph.addComponent(fuse);
    this.graph.addComponent(sw);
    this.graph.addComponent(lamp);
    this.graph.addComponent(groundBus);
  }

  connect(fromTerminal: string, toTerminal: string) {
    return this.graph.addConnection(fromTerminal, toTerminal);
  }

  disconnect(fromTerminal: string, toTerminal: string) {
    this.graph.removeConnection(fromTerminal, toTerminal);
  }

  clearAllConnections() {
    this.graph.clearConnections();
  }

  setSwitchState(state: 'OPEN' | 'CLOSED') {
    const sw = this.graph.getComponent('S1');
    if (sw) sw.state = state;
  }

  setFuseState(state: 'NORMAL' | 'BLOWN') {
    const fuse = this.graph.getComponent('F1');
    if (fuse) fuse.state = state;
  }

  analyze(): CircuitAnalysis {
    return PathAnalyzer.analyze(this.graph);
  }

  getGraph(): CircuitGraph {
    return this.graph;
  }
}

export const circuitTopologyEngine = new CircuitTopologyEngine();
