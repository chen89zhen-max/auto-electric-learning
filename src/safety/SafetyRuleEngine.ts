import ruleData from '@/src/safety/safetyRules.json';
import type { SafetyContext, SafetyDecision, SafetyRule } from '@/src/safety/safetyTypes';

const rules = ruleData.rules as SafetyRule[];

export class SafetyRuleEngine {
  constructor(private readonly configuredRules: SafetyRule[] = rules) {}

  evaluate(context: SafetyContext): SafetyDecision {
    const rule = this.configuredRules.find((candidate) =>
      Object.entries(candidate.when).every(([key, value]) => context[key as keyof SafetyContext] === value),
    );
    if (!rule) return { allowed: false, severity: 'WARNING', ruleId: 'NO_MATCHING_RULE', messageKey: 'REQUEST_GUIDANCE' };
    return {
      allowed: rule.allow,
      severity: rule.severity,
      ruleId: rule.id,
      messageKey: rule.messageKey,
      consequence: rule.consequence,
    };
  }
}

export const safetyRuleEngine = new SafetyRuleEngine();
