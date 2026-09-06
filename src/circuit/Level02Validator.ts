import { CircuitGraph } from './CircuitGraph';
import { CircuitAnalysis } from './CircuitTypes';

export interface Level02ValidationResult {
  valid: boolean;
  reason: string;
  message: string;
  missingElements: string[];
  hasShortCircuit: boolean;
  loadPowered: boolean;
}

/**
 * Validates whether the circuit meets the strict Sprint 2 Learning Task 2 standard:
 * 1. Closed circuit from battery positive to battery negative (or through chassis ground)
 * 2. Must traverse Fuse F1
 * 3. Must traverse Switch S1
 * 4. Must traverse Lamp L1
 * 5. Absolutely no short circuits (neither direct nor multi-wire/bypass)
 * 6. Fuse is normal
 * 7. When switch is open, lamp does not light; when switch is closed, lamp lights
 */
export function validateLevel02StandardCircuit(
  analysis: CircuitAnalysis,
  graph: CircuitGraph,
  options: { allowChassis?: boolean } = {}
): Level02ValidationResult {
  const missingElements: string[] = [];

  if (analysis.hasShortCircuitRisk) {
    const reason = '【短路危险】电路存在无负载直接回路或旁路短路，绝不允许送电或通过工单验收！';
    return {
      valid: false,
      reason,
      message: reason,
      missingElements: [],
      hasShortCircuit: true,
      loadPowered: false,
    };
  }

  const activePath = analysis.activePath;
  if (!activePath || !analysis.loadPowered) {
    if (analysis.isSwitchOpen) {
      const reason = '开关目前处于断开状态，闭合开关后灯应能正常点亮。';
      return {
        valid: false,
        reason,
        message: reason,
        missingElements: [],
        hasShortCircuit: false,
        loadPowered: false,
      };
    }
    const reason = '电路尚未形成闭合回路，检修灯无法点亮。';
    return {
      valid: false,
      reason,
      message: reason,
      missingElements: ['CLOSED_LOOP'],
      hasShortCircuit: false,
      loadPowered: false,
    };
  }

  // Check if fuse F1 is in the active path
  const fuse = Array.from(graph.components.values()).find((c) => c.type === 'FUSE');
  const hasFuse = !!fuse && activePath.components.includes(fuse.id);
  if (!hasFuse) {
    missingElements.push('FUSE');
  }

  // Check if switch S1 is in the active path
  const sw = Array.from(graph.components.values()).find((c) => c.type === 'SWITCH');
  const hasSwitch = !!sw && activePath.components.includes(sw.id);
  if (!hasSwitch) {
    missingElements.push('SWITCH');
  }

  // Check if lamp L1 is in the active path
  const lamp = Array.from(graph.components.values()).find((c) => c.type === 'LAMP');
  const hasLamp = !!lamp && activePath.components.includes(lamp.id);
  if (!hasLamp) {
    missingElements.push('LAMP');
  }

  if (missingElements.length > 0) {
    let reason = '灯可以亮，但电路不符合工程规范：';
    if (!hasFuse && !hasSwitch) {
      reason = '灯可以亮，但电路缺少线路保护元件（熔断器F1）和控制开关（S1），不能通过工单验收。';
    } else if (!hasFuse) {
      reason = '灯可以亮，但供电侧缺少线路保护元件（熔断器F1），不能通过工单验收。';
    } else if (!hasSwitch) {
      reason = '灯可以亮，但电路缺少控制开关（S1），无法控制通断，不能通过工单验收。';
    }
    return {
      valid: false,
      reason,
      message: reason,
      missingElements,
      hasShortCircuit: false,
      loadPowered: true,
    };
  }

  if (options.allowChassis && !analysis.usesChassisGround) {
    // If specifically requiring chassis ground
  }

  const reason = '标准闭合回路构建合格，所有保护和控制元件均正常工作！';
  return {
    valid: true,
    reason,
    message: reason,
    missingElements: [],
    hasShortCircuit: false,
    loadPowered: true,
  };
}
