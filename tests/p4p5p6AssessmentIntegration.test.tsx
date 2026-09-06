// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const P4_P5_P6_LEVELS = [
  { id: 'c01', name: 'C01Experience.tsx' },
  { id: 'c02', name: 'C02Experience.tsx' },
  { id: 'c03', name: 'C03Experience.tsx' },
  { id: 'd01', name: 'D01Experience.tsx' },
  { id: 'd02', name: 'D02Experience.tsx' },
  { id: 'd03', name: 'D03Experience.tsx' },
  { id: 'd04', name: 'D04Experience.tsx' },
  { id: 'd05', name: 'D05Experience.tsx' },
  { id: 'e01', name: 'E01Experience.tsx' },
  { id: 'e02', name: 'E02Experience.tsx' },
  { id: 'e03', name: 'E03Experience.tsx' },
  { id: 'e04', name: 'E04Experience.tsx' },
  { id: 'e05', name: 'E05Experience.tsx' },
  { id: 'e06', name: 'E06Experience.tsx' },
  { id: 'e07', name: 'E07Experience.tsx' },
];

describe('P4/P5/P6 15-Level Assessment Integration & Anti-Fabrication Guard (Task 2)', () => {
  it('forbids fabricated fixed assessment values (stars: 5, fixed 2 min, mode="guided") across all 15 Experience files', () => {
    const rootDir = process.cwd();
    const violations: Array<{ file: string; reason: string }> = [];

    for (const lvl of P4_P5_P6_LEVELS) {
      const filePath = path.join(rootDir, 'src', 'levels', lvl.id, lvl.name);
      expect(fs.existsSync(filePath), `Experience file must exist: ${filePath}`).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');

      // 1. Forbid hardcoded stars: 5 across all dimensions
      if (/stars:\s*5/.test(content)) {
        violations.push({ file: lvl.name, reason: 'contains hardcoded "stars: 5"' });
      }

      // 2. Forbid hardcoded "本关用时...2 分钟" or fake duration
      if (/本关用时.*2\s*分钟/.test(content)) {
        violations.push({ file: lvl.name, reason: 'contains hardcoded "本关用时...2 分钟"' });
      }

      // 3. Forbid hardcoded mode="guided"
      if (/mode=["']guided["']/.test(content)) {
        violations.push({ file: lvl.name, reason: 'contains hardcoded mode="guided"' });
      }

      // 4. Must handle LevelAssessmentResult from scene onComplete
      if (!content.includes('LevelAssessmentResult') && !content.includes('assessment')) {
        violations.push({ file: lvl.name, reason: 'does not accept or pass LevelAssessmentResult' });
      }
    }

    expect(
      violations,
      `Detected fabricated assessment patterns in Experience files:\n${violations.map((v) => `${v.file}: ${v.reason}`).join('\n')}`
    ).toEqual([]);
  });
});
