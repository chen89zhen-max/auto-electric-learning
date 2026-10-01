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

const P4_P5_P6_SCENES = [
  ['c01', 'C01VoltageDropScene.tsx'], ['c02', 'C02FaultClassifyScene.tsx'], ['c03', 'C03IndependentDeliveryScene.tsx'],
  ['d01', 'D01RelayControlScene.tsx'], ['d02', 'D02DcMotorScene.tsx'], ['d03', 'D03AlternatorScene.tsx'],
  ['d04', 'D04InductanceScene.tsx'], ['d05', 'D05TransformerScene.tsx'], ['e01', 'E01DiodeScene.tsx'],
  ['e02', 'E02CapacitorScene.tsx'], ['e03', 'E03RectifierScene.tsx'], ['e04', 'E04TransistorScene.tsx'],
  ['e05', 'E05LogicGatesScene.tsx'], ['e06', 'E06SpeedSensorScene.tsx'], ['e07', 'E07PcbAssemblyScene.tsx'],
] as const;

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

  it('keeps hint effects stable and connects real wrong, hint, and meter-block branches in all 15 scenes', () => {
    for (const [directory, file] of P4_P5_P6_SCENES) {
      const content = fs.readFileSync(path.join(process.cwd(), 'src', 'levels', directory, file), 'utf-8');
      expect(content, `${file} must record wrong answers`).toContain('assessment.recordWrong');
      expect(content, `${file} must record hint requests`).toContain('assessment.requestHint');
      expect(content, `${file} must record meter safety blocks`).toContain('assessment.recordMeterBlocked');
      expect(content, `${file} must not depend on the unstable assessment wrapper`).not.toMatch(
        /\[[^\]]*hintRequested[^\]]*,\s*currentStep[^\]]*,\s*assessment\s*\]/,
      );
    }
  });
});
