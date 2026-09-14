import { describe, expect, it } from 'vitest';
import { F01_STAGES } from '@/src/levels/f01/f01Model';
import { F01_STAGE_CONTENT, F01_STAGE_ORDER, F01_FAULT_COPY } from '@/src/levels/f01/f01Training';

describe('F01 training contract', () => {
  it('defines exactly five ordered stages with complete mentor copy', () => {
    expect(F01_STAGE_ORDER).toEqual(F01_STAGES);
    for (const stage of F01_STAGE_ORDER) {
      expect(F01_STAGE_CONTENT[stage].title.length).toBeGreaterThan(4);
      expect(F01_STAGE_CONTENT[stage].objective.length).toBeGreaterThan(12);
      expect(F01_STAGE_CONTENT[stage].mentorPrompt.length).toBeGreaterThan(12);
      expect(F01_STAGE_CONTENT[stage].hint.length).toBeGreaterThan(12);
    }
  });

  it('uses restrained simulation safety language', () => {
    const allCopy = JSON.stringify({ F01_STAGE_CONTENT, F01_FAULT_COPY });
    expect(allCopy).not.toMatch(/纳秒级|1200A|真实断路器|瞬间炸表/);
    expect(allCopy).toContain('仿真安全规则已在送电前阻断操作');
    expect(allCopy).toContain('本实训模型参数');
  });
});
