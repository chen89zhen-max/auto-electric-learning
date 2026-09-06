/**
 * Universal Multimeter Safety Guard (Task 4)
 * Strict anti-misoperation gates across diagnostic levels.
 */

export interface MeterGuardInput<Mode extends string = string> {
  currentMode: Mode;
  expectedMode: Mode | Mode[];
  blackJackOk?: boolean;
  redJackOk?: boolean;
  probesPlaced?: boolean;
  circuitPowered?: boolean;
  resistanceMeasurement?: boolean;
  dangerousBridge?: boolean;
}

export type MeterGuardResult =
  | { allowed: true }
  | {
      allowed: false;
      code: 'OFF' | 'WRONG_MODE' | 'WRONG_JACK' | 'PROBE_MISSING' | 'LIVE_RESISTANCE' | 'DANGEROUS_BRIDGE';
      message: string;
    };

/**
 * Checks if a mode string represents an internal resistance or continuity measurement.
 */
export function isResistanceMode(mode: string): boolean {
  const upper = mode.toUpperCase();
  return (
    upper.includes('OHM') ||
    upper.includes('RES') ||
    upper.includes('CONT') ||
    upper.includes('BUZZER')
  );
}

/**
 * Pure evaluation function for multimeter safety and setting gates.
 */
export function evaluateMeterGuard<Mode extends string>(
  input: MeterGuardInput<Mode>
): MeterGuardResult {
  const {
    currentMode,
    expectedMode,
    blackJackOk = true,
    redJackOk = true,
    probesPlaced = true,
    circuitPowered = false,
    resistanceMeasurement = false,
    dangerousBridge = false,
  } = input;

  // 1. Off state
  if (currentMode === 'OFF') {
    return {
      allowed: false,
      code: 'OFF',
      message: '⚠️ 万用表处于关机 OFF 状态！请先拨动旋钮开机并选择测量档位。',
    };
  }

  // 2. Dangerous short-circuit bridge (e.g. current meter bridged directly across power source)
  if (dangerousBridge) {
    return {
      allowed: false,
      code: 'DANGEROUS_BRIDGE',
      message: '⚠️ 危险短路拦截！严禁使用低内阻电流挡或表笔直接跨接电源两端，以防瞬间过流炸表现场事故！',
    };
  }

  // 3. Live resistance / continuity measurement
  if ((resistanceMeasurement || isResistanceMode(currentMode)) && circuitPowered) {
    return {
      allowed: false,
      code: 'LIVE_RESISTANCE',
      message: '⚠️ 严禁带电测量电阻/通断！带电打阻值会导致外部高压倒灌烧毁仪表内部分流电阻，请先切断电源！',
    };
  }

  // 4. Dial mode mismatch
  const expectedModes = Array.isArray(expectedMode) ? expectedMode : [expectedMode];
  if (!expectedModes.includes(currentMode)) {
    return {
      allowed: false,
      code: 'WRONG_MODE',
      message: `⚠️ 档位量程不匹配！当前为 [${currentMode}]，需要切至 [${expectedModes.join(' / ')}] 档位。`,
    };
  }

  // 5. Jack mismatch
  if (!blackJackOk || !redJackOk) {
    return {
      allowed: false,
      code: 'WRONG_JACK',
      message: '⚠️ 表笔插孔错误！黑表笔必须插入 COM 端口，红表笔须对应测量功能插孔！',
    };
  }

  // 6. Probes not placed
  if (!probesPlaced) {
    return {
      allowed: false,
      code: 'PROBE_MISSING',
      message: '⚠️ 表笔未就位！请将红黑表笔探针准确接触被测电路测量点。',
    };
  }

  return { allowed: true };
}

/**
 * Runner wrapper ensuring caller action is ONLY executed when guard passes.
 */
export function executeWithMeterGuard<Mode extends string, T>(
  input: MeterGuardInput<Mode>,
  action: () => T,
  onBlocked?: (blocked: Extract<MeterGuardResult, { allowed: false }>) => void
): { allowed: true; result: T } | { allowed: false; guard: Extract<MeterGuardResult, { allowed: false }> } {
  const guard = evaluateMeterGuard(input);
  if (!guard.allowed) {
    onBlocked?.(guard);
    return { allowed: false, guard };
  }
  return { allowed: true, result: action() };
}
