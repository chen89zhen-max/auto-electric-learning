import type { CircuitAnalysis } from './CircuitTypes';

/** 相对于导线绘制方向的约定电流方向；无有效负载回路时停止动画。 */
export function currentDirection(analysis: CircuitAnalysis, from: string, to: string): -1 | 0 | 1 {
  if (!analysis.loadPowered || analysis.hasShortCircuitRisk) return 0;
  const nodes = analysis.activePath?.nodes ?? [];
  for (let i = 0; i < nodes.length - 1; i++) {
    if (nodes[i] === from && nodes[i + 1] === to) return 1;
    if (nodes[i] === to && nodes[i + 1] === from) return -1;
  }
  return 0;
}
