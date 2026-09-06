import { CircuitGraph } from './CircuitGraph';
import {
  CircuitAnalysis,
  CircuitPath,
} from './CircuitTypes';

export class PathAnalyzer {
  static analyze(graph: CircuitGraph): CircuitAnalysis {
    const battery = Array.from(graph.components.values()).find(
      (c) => c.type === 'BATTERY'
    );

    if (!battery || battery.terminals.length < 2) {
      return {
        closedPaths: [],
        loadPowered: false,
        isSwitchOpen: false,
        isFuseBlown: false,
        hasOpenCircuit: true,
        hasShortCircuitRisk: false,
        missingReturnPath: true,
        directBatteryConnected: false,
        missingFuse: true,
        usesChassisGround: false,
        pathComponents: [],
      };
    }

    const batPos = battery.terminals.find((t) => t.polarity === 'POS')?.id || battery.terminals[0].id;
    const batNeg = battery.terminals.find((t) => t.polarity === 'NEG')?.id || battery.terminals[1].id;

    const adj = graph.buildAdjacency();

    // Check if BAT_POS and BAT_NEG are directly connected by an external wire
    const directShort = graph.connections.some(
      (c) =>
        (c.from === batPos && c.to === batNeg) ||
        (c.from === batNeg && c.to === batPos)
    );

    // Check if any lamp terminals are directly shorted together by an external bypass wire
    const lamp = Array.from(graph.components.values()).find((c) => c.type === 'LAMP');
    let lampDirectBypassed = false;
    if (lamp && lamp.terminals.length >= 2) {
      const l1 = lamp.terminals[0].id;
      const l2 = lamp.terminals[1].id;
      lampDirectBypassed = graph.connections.some(
        (c) => (c.from === l1 && c.to === l2) || (c.from === l2 && c.to === l1)
      );
    }

    // BFS/DFS search from BAT_POS to find all distinct paths returning to BAT_NEG
    const allPaths: string[][] = [];
    const visited = new Set<string>();

    function dfs(current: string, target: string, path: string[]) {
      if (current === target && path.length > 1) {
        allPaths.push([...path]);
        return;
      }
      visited.add(current);

      const neighbors = adj.get(current) || [];
      for (const next of neighbors) {
        if (!visited.has(next) || (next === target && path.length > 2)) {
          dfs(next, target, [...path, next]);
        }
      }

      visited.delete(current);
    }

    dfs(batPos, batNeg, [batPos]);

    const circuitPaths: CircuitPath[] = allPaths.map((nodePath) => {
      // A component is truly traversed by current ONLY if the path traverses
      // between its distinct terminals via its internal conductive mechanism.
      const traversedComponentIds = new Set<string>();
      for (let i = 0; i < nodePath.length - 1; i++) {
        const t1 = graph.getTerminal(nodePath[i]);
        const t2 = graph.getTerminal(nodePath[i + 1]);
        if (t1 && t2 && t1.componentId === t2.componentId && t1.id !== t2.id) {
          traversedComponentIds.add(t1.componentId);
        }
      }

      const compList = [battery.id, ...Array.from(traversedComponentIds)];
      // Has load ONLY if the lamp component was actually traversed from terminal to terminal
      const hasLoad = compList.some((cId) => graph.getComponent(cId)?.type === 'LAMP');
      const hasPowerSource = true;
      const isShort = !hasLoad;

      return {
        nodes: nodePath,
        components: compList,
        hasPowerSource,
        hasLoad,
        isClosed: true,
        isShortCircuit: isShort,
      };
    });

    const activeValidPath = circuitPaths.find((p) => p.hasLoad && !p.isShortCircuit);
    const hasShort = directShort || lampDirectBypassed || circuitPaths.some((p) => p.isShortCircuit);

    // Check if lamp is connected to pos but not neg (missing return path)
    const reachableFromPos = new Set<string>();
    const q = [batPos];
    const seen = new Set<string>([batPos]);
    while (q.length > 0) {
      const u = q.shift()!;
      reachableFromPos.add(u);
      for (const v of adj.get(u) || []) {
        if (!seen.has(v)) {
          seen.add(v);
          q.push(v);
        }
      }
    }

    const lampConnectedToPos = lamp
      ? lamp.terminals.some((t) => reachableFromPos.has(t.id))
      : false;
    const missingReturn = lampConnectedToPos && !activeValidPath && !hasShort;

    const isPowered = !!activeValidPath && !hasShort;

    // Check switch state: is switch open preventing an otherwise complete circuit with load?
    const sw = Array.from(graph.components.values()).find((c) => c.type === 'SWITCH');
    let isSwitchOpen = false;
    if (!isPowered && !hasShort && sw && sw.state === 'OPEN') {
      const swT1 = sw.terminals[0]?.id;
      const swT2 = sw.terminals[1]?.id;
      if (swT1 && swT2) {
        const testAdj = new Map<string, string[]>();
        for (const [k, v] of adj.entries()) {
          testAdj.set(k, [...v]);
        }
        if (!testAdj.has(swT1)) testAdj.set(swT1, []);
        if (!testAdj.has(swT2)) testAdj.set(swT2, []);
        if (!testAdj.get(swT1)!.includes(swT2)) testAdj.get(swT1)!.push(swT2);
        if (!testAdj.get(swT2)!.includes(swT1)) testAdj.get(swT2)!.push(swT1);

        const testPaths: string[][] = [];
        const testVisited = new Set<string>();
        const testDfs = (current: string, target: string, path: string[]) => {
          if (current === target && path.length > 1) {
            testPaths.push([...path]);
            return;
          }
          testVisited.add(current);
          const neighbors = testAdj.get(current) || [];
          for (const next of neighbors) {
            if (!testVisited.has(next) || (next === target && path.length > 2)) {
              testDfs(next, target, [...path, next]);
            }
          }
          testVisited.delete(current);
        };
        testDfs(batPos, batNeg, [batPos]);

        for (const testPath of testPaths) {
          let hasLampLoad = false;
          for (let i = 0; i < testPath.length - 1; i++) {
            const t1 = graph.getTerminal(testPath[i]);
            const t2 = graph.getTerminal(testPath[i + 1]);
            if (t1 && t2 && t1.componentId === t2.componentId && t1.id !== t2.id) {
              if (graph.getComponent(t1.componentId)?.type === 'LAMP') {
                hasLampLoad = true;
                break;
              }
            }
          }
          if (hasLampLoad) {
            isSwitchOpen = true;
            break;
          }
        }
      }
    }

    // Check fuse state
    const fuse = Array.from(graph.components.values()).find((c) => c.type === 'FUSE');
    const isFuseBlown = fuse ? fuse.state === 'BLOWN' : false;

    // Check if direct battery connected (no switch in path)
    const directBatteryConnected =
      !!activeValidPath && (!sw || !activeValidPath.components.includes(sw.id));

    // Check if fuse is missing in path
    const missingFuse =
      !fuse || (activeValidPath ? !activeValidPath.components.includes(fuse.id) : true);

    // Check if chassis ground is used
    const groundBus = Array.from(graph.components.values()).find(
      (c) => c.type === 'GROUND_BUS' || c.type === 'CHASSIS_POINT'
    );
    const usesChassisGround =
      !!groundBus && (activeValidPath ? activeValidPath.components.includes(groundBus.id) : false);

    return {
      closedPaths: circuitPaths,
      activePath: activeValidPath,
      loadPowered: isPowered,
      isSwitchOpen,
      isFuseBlown,
      hasOpenCircuit: !isPowered && !hasShort,
      hasShortCircuitRisk: hasShort,
      missingReturnPath: missingReturn,
      directBatteryConnected,
      missingFuse,
      usesChassisGround,
      pathComponents: activeValidPath ? activeValidPath.components : [],
    };
  }
}
