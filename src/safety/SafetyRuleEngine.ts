import ruleData from '@/src/safety/safetyRules.json';
import type { SafetyContext, SafetyDecision, SafetyRule } from '@/src/safety/safetyTypes';

const rules = ruleData.rules as SafetyRule[];

export class SafetyRuleEngine {
  constructor(private readonly configuredRules: SafetyRule[] = rules) {}

  evaluate(context: SafetyContext): SafetyDecision {
    // Find all rules that match the context
    const matchingRules = this.configuredRules.filter((candidate) =>
      Object.entries(candidate.when).every(([key, value]) => {
        if (value === undefined) return true;
        return context[key as keyof SafetyContext] === value;
      })
    );

    if (matchingRules.length === 0) {
      // Unknown safety-sensitive operation is rejected by default
      return {
        allowed: false,
        severity: 'WARNING',
        ruleId: 'NO_MATCHING_RULE',
        messageKey: 'OPERATION_NOT_PERMITTED',
        consequence: '未匹配到明确的安全允许规则，系统默认阻止执行',
      };
    }

    // Sort by priority descending, then by number of specific constraints descending
    matchingRules.sort((a, b) => {
      const pA = a.priority ?? 0;
      const pB = b.priority ?? 0;
      if (pA !== pB) return pB - pA;
      const keysA = Object.keys(a.when).length;
      const keysB = Object.keys(b.when).length;
      return keysB - keysA;
    });

    const selectedRule = matchingRules[0];

    return {
      allowed: selectedRule.allow,
      severity: selectedRule.severity,
      ruleId: selectedRule.id,
      messageKey: selectedRule.messageKey,
      consequence: selectedRule.consequence,
    };
  }
}

export const safetyRuleEngine = new SafetyRuleEngine();
