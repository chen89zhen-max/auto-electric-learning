export interface AbilityMetrics {
  firstAction: string | null;
  directContactAttempts: number;
  unsafeFireResponses: number;
  helpRequests: number;
  maxHintLevel: number;
  firstAidSequenceErrors: number;
  fireResponseErrors: number;
  environmentChecked: boolean;
  powerIsolated: boolean;
  firePowerIsolated: boolean;
  transferPassed: boolean;
}

export interface Level02AbilityMetrics {
  hotWiringAttempts: number;
  shortCircuitAttempts: number;
  invalidTerminalAttempts: number;
  openCircuitDiagnosisErrors: number;
  chassisGroundCompleted: boolean;
  transferCheckErrors: number;
  reflectionErrors: number;
  helpRequests: number;
}

export interface AbilityReportData {
  dimensions: Array<{ id: string; label: string; stars: number }>;
  summary: {
    directContactAttempts?: number;
    environmentChecked?: boolean;
    powerIsolated?: boolean;
    helpRequests: number;
    fireResponse?: string;
    hotWiringAttempts?: number;
    shortCircuitAttempts?: number;
    reflectionErrors?: number;
  };
}

const clamp = (value: number) => Math.max(1, Math.min(5, value));

export class AbilityTracker {
  generate(metrics: AbilityMetrics): AbilityReportData {
    const environment = clamp(3 + (metrics.firstAction === 'CHECK_ENVIRONMENT' ? 2 : 0) - Math.min(1, metrics.maxHintLevel > 1 ? 1 : 0));
    const recognition = clamp(5 - Math.min(2, metrics.directContactAttempts) - Math.min(2, metrics.unsafeFireResponses));
    const control = clamp(2 + (metrics.powerIsolated ? 2 : 0) + (metrics.firePowerIsolated ? 1 : 0));
    const emergency = clamp(5 - Math.min(2, metrics.firstAidSequenceErrors) - Math.min(2, metrics.fireResponseErrors));
    const standard = clamp(4 + (metrics.transferPassed ? 1 : 0) - Math.min(2, metrics.helpRequests > 2 ? 1 : 0));

    return {
      dimensions: [
        { id: 'ENVIRONMENT', label: '环境观察', stars: environment },
        { id: 'RISK', label: '危险识别', stars: recognition },
        { id: 'CONTROL', label: '危险源控制', stars: control },
        { id: 'DECISION', label: '应急决策', stars: emergency },
        { id: 'STANDARD', label: '规范操作', stars: standard },
      ],
      summary: {
        directContactAttempts: metrics.directContactAttempts,
        environmentChecked: metrics.environmentChecked,
        powerIsolated: metrics.powerIsolated,
        helpRequests: metrics.helpRequests,
        fireResponse: metrics.fireResponseErrors === 0 ? '独立完成' : '经反馈后完成',
      },
    };
  }

  generateLevel02(metrics: Level02AbilityMetrics): AbilityReportData {
    const wiringStandard = clamp(5 - metrics.hotWiringAttempts - metrics.invalidTerminalAttempts);
    const safetyAwareness = clamp(5 - metrics.shortCircuitAttempts * 2 - metrics.hotWiringAttempts);
    const troubleshooting = clamp(5 - metrics.openCircuitDiagnosisErrors * 2);
    const chassisUnderstanding = clamp(metrics.chassisGroundCompleted ? 5 - Math.min(2, metrics.reflectionErrors) : 2);
    const transferCapability = clamp(5 - metrics.transferCheckErrors - (metrics.helpRequests > 2 ? 1 : 0));

    return {
      dimensions: [
        { id: 'WIRING', label: '接线规范', stars: wiringStandard },
        { id: 'SAFETY', label: '安全意识', stars: safetyAwareness },
        { id: 'TROUBLESHOOTING', label: '排故思维', stars: troubleshooting },
        { id: 'CHASSIS', label: '单线制理解', stars: chassisUnderstanding },
        { id: 'TRANSFER', label: '迁移能力', stars: transferCapability },
      ],
      summary: {
        hotWiringAttempts: metrics.hotWiringAttempts,
        shortCircuitAttempts: metrics.shortCircuitAttempts,
        helpRequests: metrics.helpRequests,
        reflectionErrors: metrics.reflectionErrors,
      },
    };
  }
}

export const abilityTracker = new AbilityTracker();
