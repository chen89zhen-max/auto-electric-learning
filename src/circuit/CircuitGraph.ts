import {
  CircuitComponent,
  Connection,
  Terminal,
} from './CircuitTypes';

export class CircuitGraph {
  public components: Map<string, CircuitComponent> = new Map();
  public terminals: Map<string, Terminal> = new Map();
  public connections: Connection[] = [];

  addComponent(component: CircuitComponent): void {
    this.components.set(component.id, component);
    for (const t of component.terminals) {
      this.terminals.set(t.id, t);
    }
  }

  addConnection(fromTerminalId: string, toTerminalId: string): Connection | null {
    if (!fromTerminalId || !toTerminalId) return null;
    if (fromTerminalId === toTerminalId) return null;

    // Reject non-existent terminals
    if (!this.terminals.has(fromTerminalId) || !this.terminals.has(toTerminalId)) {
      return null;
    }

    const exists = this.connections.some(
      (c) =>
        (c.from === fromTerminalId && c.to === toTerminalId) ||
        (c.from === toTerminalId && c.to === fromTerminalId)
    );
    if (exists) return null;

    const connection: Connection = {
      id: `conn-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      from: fromTerminalId,
      to: toTerminalId,
    };
    this.connections.push(connection);
    return connection;
  }

  removeConnection(fromTerminalId: string, toTerminalId: string): void {
    this.connections = this.connections.filter(
      (c) =>
        !(
          (c.from === fromTerminalId && c.to === toTerminalId) ||
          (c.from === toTerminalId && c.to === fromTerminalId)
        )
    );
  }

  clearConnections(): void {
    this.connections = [];
  }

  getComponent(componentId: string): CircuitComponent | undefined {
    return this.components.get(componentId);
  }

  getTerminal(terminalId: string): Terminal | undefined {
    return this.terminals.get(terminalId);
  }

  /**
   * Build adjacency list across terminals.
   * Internal component connections (conductive path inside closed switch, fuse, lamp)
   * and external wire connections are unified into the graph.
   */
  buildAdjacency(): Map<string, string[]> {
    const adj = new Map<string, string[]>();

    const addEdge = (u: string, v: string) => {
      if (!adj.has(u)) adj.set(u, []);
      if (!adj.has(v)) adj.set(v, []);
      if (!adj.get(u)!.includes(v)) adj.get(u)!.push(v);
      if (!adj.get(v)!.includes(u)) adj.get(v)!.push(u);
    };

    // 1. External wire connections
    for (const conn of this.connections) {
      addEdge(conn.from, conn.to);
    }

    // 2. Internal component pass-throughs
    for (const comp of this.components.values()) {
      if (comp.type === 'FUSE') {
        if (comp.state === 'NORMAL') {
          addEdge(comp.terminals[0].id, comp.terminals[1].id);
        }
      } else if (comp.type === 'SWITCH') {
        if (comp.state === 'CLOSED') {
          addEdge(comp.terminals[0].id, comp.terminals[1].id);
        }
      } else if (comp.type === 'LAMP') {
        // Lamp filament conducts current through load
        if (comp.terminals.length >= 2) {
          addEdge(comp.terminals[0].id, comp.terminals[1].id);
        }
      } else if (comp.type === 'GROUND_BUS') {
        // Ground bus internally interconnects all chassis ground terminals
        for (let i = 0; i < comp.terminals.length; i++) {
          for (let j = i + 1; j < comp.terminals.length; j++) {
            addEdge(comp.terminals[i].id, comp.terminals[j].id);
          }
        }
      }
    }

    return adj;
  }
}
