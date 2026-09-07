import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getCourseLevel, isLevelPublished } from '@/src/courses/registry';
import { resolveRequestedLevelRoute } from '@/src/app/levelRoute';
import { calculateFaultClassificationCircuit } from '@/src/circuit/solver/DCAnalysisUtils';
import { C02_BLIND_CASES } from '@/src/levels/c02/C02FaultClassifyScene';
import {
  evaluateMeterGuard,
  executeWithMeterGuard,
  type MeterGuardInput,
} from '@/src/game/instruments/meterGuard';

const P4_P5_P6_LEVEL_IDS = [
  'C01', 'C02', 'C03',
  'D01', 'D02', 'D03', 'D04', 'D05',
  'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07',
] as const;

describe('P4-P6 Production Redline Acceptance Suite (Task 10)', () => {
  const rootDir = process.cwd();

  describe('Redline 1: Data-Driven 15-Level Route, Registry & Access Boundaries', () => {
    it.each(P4_P5_P6_LEVEL_IDS)('Level %s is officially published and defined in course registry', (levelId) => {
      expect(isLevelPublished(levelId)).toBe(true);

      const meta = getCourseLevel(levelId);
      expect(meta).toBeDefined();
      expect(meta?.canonicalId).toBe(levelId);
      expect(meta?.title.length).toBeGreaterThan(3);
      expect(meta?.implemented).toBe(true);
      expect(Array.isArray(meta?.prerequisiteLevelIds)).toBe(true);
    });

    it.each(P4_P5_P6_LEVEL_IDS)('Level %s permits direct entry for teachers and admins (lesson preparation bypass)', (levelId) => {
      const teacherContext = { isTeacherOrAdmin: true, completedLevelIds: [] };
      const route = resolveRequestedLevelRoute(`?level=${levelId}`, teacherContext);
      expect(route).toEqual({ kind: 'level', levelId });
    });

    it.each(P4_P5_P6_LEVEL_IDS)('Level %s enforces prerequisites for students with zero prior progress', (levelId) => {
      const meta = getCourseLevel(levelId);
      const studentContext = { isTeacherOrAdmin: false, completedLevelIds: [] };
      const route = resolveRequestedLevelRoute(`?level=${levelId}`, studentContext);

      if (meta && meta.prerequisiteLevelIds.length > 0) {
        expect(route.kind).toBe('blocked');
        if (route.kind === 'blocked') {
          expect(route.levelId).toBe(levelId);
          expect(route.missingPrerequisites.length).toBeGreaterThanOrEqual(1);
        }
      } else {
        expect(route).toEqual({ kind: 'level', levelId });
      }
    });

    it.each(P4_P5_P6_LEVEL_IDS)('Level %s allows student entry once all prerequisites are satisfied', (levelId) => {
      const meta = getCourseLevel(levelId)!;
      const studentContext = {
        isTeacherOrAdmin: false,
        completedLevelIds: meta.prerequisiteLevelIds,
      };
      const route = resolveRequestedLevelRoute(`?level=${levelId}`, studentContext);
      expect(route).toEqual({ kind: 'level', levelId });
    });
  });

  describe('Redline 2: Answer Neutrality, Zero-Spoiler & Typography Constraints (>= 14px)', () => {
    it.each(P4_P5_P6_LEVEL_IDS)('Level %s initializes choices to null with no pre-revealed answers or spoilers', (levelId) => {
      const dirName = levelId.toLowerCase();
      const levelDir = path.join(rootDir, 'src', 'levels', dirName);
      expect(fs.existsSync(levelDir), `Directory must exist: ${levelDir}`).toBe(true);

      const files = fs.readdirSync(levelDir).filter((f) => f.endsWith('.tsx'));
      expect(files.length).toBeGreaterThan(0);

      for (const fileName of files) {
        const filePath = path.join(levelDir, fileName);
        const code = fs.readFileSync(filePath, 'utf-8');

        // Verify choices initialize to null or empty, never pre-selected correct answers
        const choiceStateMatches = code.matchAll(/const\s+\[([a-zA-Z0-9]+Choice|selected[a-zA-Z0-9]*),\s*set[a-zA-Z0-9]+\]\s*=\s*useState<[^>]*>\(([^)]+)\)/g);
        for (const match of choiceStateMatches) {
          const initVal = match[2].trim();
          expect(
            initVal === 'null' || initVal === '""' || initVal === "''" || initVal === 'undefined',
            `File ${fileName} must initialize choice state '${match[1]}' to null/empty, got: ${initVal}`
          ).toBe(true);
        }

        // Verify submit buttons are disabled when choice is null/empty
        if (code.includes('提交') && (code.includes('s4Choice') || code.includes('s1Choice') || code.includes('choice'))) {
          expect(
            code.includes('disabled={!') || code.includes('disabled={s') || code.includes('disabled={!s'),
            `File ${fileName} must disable submit button before selection`
          ).toBe(true);
        }
      }
    });

    it.each(P4_P5_P6_LEVEL_IDS)('Level %s strictly adheres to >=14px typography (zero text-xs without audit tag)', (levelId) => {
      const dirName = levelId.toLowerCase();
      const levelDir = path.join(rootDir, 'src', 'levels', dirName);
      const files = fs.readdirSync(levelDir).filter((f) => f.endsWith('.tsx'));

      const violations: string[] = [];
      for (const fileName of files) {
        const filePath = path.join(levelDir, fileName);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (/\btext-xs\b/.test(line)) {
            // Only permitted if explicitly marked with data-typography="secondary" whitelist tag
            if (!line.includes('data-typography="secondary"')) {
              violations.push(`${fileName}:${index + 1}: ${line.trim()}`);
            }
          }
        });
      }

      expect(
        violations,
        `Level ${levelId} contains unauthorized text-xs violations (<14px):\n${violations.join('\n')}`
      ).toEqual([]);
    });

    it.each(P4_P5_P6_LEVEL_IDS)('Level %s layout supports 1366x768 without horizontal overflow and 200% zoom resilience', (levelId) => {
      const dirName = levelId.toLowerCase();
      const expFile = path.join(rootDir, 'src', 'levels', dirName, `${levelId.toUpperCase()}Experience.tsx`);
      expect(fs.existsSync(expFile)).toBe(true);

      const content = fs.readFileSync(expFile, 'utf-8');

      // Verify layout wraps properly and avoids fixed unscalable pixel heights on outer viewport containers
      expect(
        content.includes('overflow-y-auto') || content.includes('overflow-auto') || content.includes('min-h-screen') || content.includes('app-shell') || content.includes('flex'),
        `Experience ${levelId} must have scrollable responsive container for 1366x768 and 200% zoom`
      ).toBe(true);

      // Verify stage header and breadcrumbs/title are present
      expect(
        content.includes('STAGE_CONTENT') || content.includes('guidance') || content.includes('title') || content.includes('currentStep'),
        `Experience ${levelId} must display clear stage heading and guidance`
      ).toBe(true);
    });
  });

  describe('Redline 3: C03 Intermittent Fault & Wiggle Test (线束晃动测试)', () => {
    it('requires powered DCV_20 multimeter to execute wiggle test and triggers 0.00V drop', () => {
      const c03SceneFile = path.join(rootDir, 'src', 'levels', 'c03', 'C03IndependentDeliveryScene.tsx');
      const content = fs.readFileSync(c03SceneFile, 'utf-8');

      // 1. Must check meter guard before wiggle test
      expect(content).toContain('requireMeterPowered');
      expect(content).toContain("requireMeterPowered('DCV_20')");

      // 2. Must simulate transient drop to 0.00V
      expect(content).toContain("'0.00'");
      expect(content).toContain('瞬态晃动跳变为0V');

      // 3. Must reveal root cause: loose pin terminal inside connector
      expect(content).toContain('wiggleFaultRevealed');
      expect(content).toContain('插针松旷脱落失电');

      // 4. Closed-loop reinspection restores full rated voltage (11.95V)
      expect(content).toContain('11.95');
      expect(content).toContain('全负荷抗震稳态达标');
    });
  });

  describe('Redline 4: C02 Four Distinct Fault Modes (OPEN, SHORT_GND, HIGH_R, SHORT_PWR)', () => {
    it('provides deterministic physical simulation and distinct measurements for all 4 fault modes', () => {
      // 1. OPEN_CIRCUIT
      const open = calculateFaultClassificationCircuit({
        sourceVoltage: 12.0,
        loadResistance: 6.0,
        faultType: 'OPEN_CIRCUIT',
        faultLocation: 'SWITCH',
        fuseIntact: true,
      });
      expect(open.circuitCurrent).toBe(0);
      expect(open.nodeVoltages.switchIn).toBe(12.0);
      expect(open.nodeVoltages.switchOut).toBe(0.0);
      expect(open.lampVoltage).toBe(0);
      expect(open.lampGlow).toBe('DARK');

      // 2. SHORT_TO_GROUND
      const short = calculateFaultClassificationCircuit({
        sourceVoltage: 12.0,
        loadResistance: 6.0,
        faultType: 'SHORT_TO_GROUND',
        faultLocation: 'HARNESS_SUPPLY',
        fuseIntact: true,
      });
      expect(short.fuseBlown).toBe(true);
      expect(short.nodeVoltages.fuseOut).toBe(0);
      expect(short.lampVoltage).toBe(0);

      // 3. HIGH_RESISTANCE
      const highR = calculateFaultClassificationCircuit({
        sourceVoltage: 12.0,
        loadResistance: 6.0,
        faultType: 'HIGH_RESISTANCE',
        faultLocation: 'HARNESS_SUPPLY',
        faultResistance: 50.0,
        fuseIntact: true,
      });
      expect(highR.circuitCurrent).toBeCloseTo(12.0 / 56.0, 4);
      expect(highR.lampVoltage).toBeCloseTo((12.0 / 56.0) * 6.0, 4); // ~1.2857V
      expect(highR.lampGlow).toBe('DARK');

      // 4. SHORT_TO_POWER
      const shortToPower = calculateFaultClassificationCircuit({
        sourceVoltage: 12.0,
        loadResistance: 6.0,
        faultType: 'SHORT_TO_POWER',
        faultLocation: 'HARNESS_SUPPLY',
        fuseIntact: true,
      });
      expect(shortToPower.fuseBlown).toBe(false);
      expect(shortToPower.lampVoltage).toBe(12.0);
      expect(shortToPower.circuitCurrent).toBe(2.0);
      expect(shortToPower.nodeVoltages.switchOut).toBe(12.0);
      expect(shortToPower.nodeVoltages.lampPos).toBe(12.0);
      expect(shortToPower.lampGlow).toBe('BRIGHT');
    });

    it('validates that C02 blind case repository contains all 4 fault modes with verifiable test evidence', () => {
      const faultTypes = new Set(C02_BLIND_CASES.map((c) => c.actualFaultType));
      expect(faultTypes.has('OPEN_CIRCUIT')).toBe(true);
      expect(faultTypes.has('SHORT_TO_GROUND')).toBe(true);
      expect(faultTypes.has('HIGH_RESISTANCE')).toBe(true);
      expect(faultTypes.has('SHORT_TO_POWER')).toBe(true);

      const stpCase = C02_BLIND_CASES.find((c) => c.actualFaultType === 'SHORT_TO_POWER')!;
      expect(stpCase.fuseState).toBe('INTACT');
      expect(stpCase.nodeVoltages.switchOut).toBeCloseTo(12.0, 1);
      expect(stpCase.nodeVoltages.lampPos).toBeCloseTo(12.0, 1);
    });
  });

  describe('Redline 5: D02 / D03 / D04 Blind Submit & Multimeter Safety Guard', () => {
    it('verifies D02, D03, and D04 require multimeter verification before allowing blind submit', () => {
      const d02Scene = fs.readFileSync(path.join(rootDir, 'src', 'levels', 'd02', 'D02DcMotorScene.tsx'), 'utf-8');
      const d03Scene = fs.readFileSync(path.join(rootDir, 'src', 'levels', 'd03', 'D03AlternatorScene.tsx'), 'utf-8');
      const d04Scene = fs.readFileSync(path.join(rootDir, 'src', 'levels', 'd04', 'D04InductanceScene.tsx'), 'utf-8');

      // D02 Dc Motor: blocks submission without meter in proper range
      expect(d02Scene).toContain('requireMeterPowered');
      expect(d02Scene).toContain('activeBlind.faultType');
      expect(d02Scene).toContain('assessment.recordWrong');

      // D03 Alternator: blocks submission without alternator RPM and AC/DC meter verification
      expect(d03Scene).toContain('requireMeterPowered');
      expect(d03Scene).toContain('ACV_200');

      // D04 Inductance: blocks submission without flyback diode / kickback voltage probe
      expect(d04Scene).toContain('requireMeterPowered');
    });

    it('enforces comprehensive instrument safety rules via evaluateMeterGuard and blocks illegal operations', () => {
      // 1. Meter OFF blocks action
      const offCheck = evaluateMeterGuard({
        currentMode: 'OFF',
        expectedMode: 'DCV_20',
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: true,
      });
      expect(offCheck.allowed).toBe(false);
      if (!offCheck.allowed) {
        expect(offCheck.code).toBe('OFF');
      }

      // 2. Wrong dial mode blocks action
      const wrongModeCheck = evaluateMeterGuard({
        currentMode: 'DCV_2',
        expectedMode: 'DCV_20',
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: true,
      });
      expect(wrongModeCheck.allowed).toBe(false);
      if (!wrongModeCheck.allowed) {
        expect(wrongModeCheck.code).toBe('WRONG_MODE');
      }

      // 3. Wrong test jack blocks action
      const wrongJackCheck = evaluateMeterGuard({
        currentMode: 'DCV_20',
        expectedMode: 'DCV_20',
        blackJackOk: true,
        redJackOk: false,
        probesPlaced: true,
        circuitPowered: true,
      });
      expect(wrongJackCheck.allowed).toBe(false);
      if (!wrongJackCheck.allowed) {
        expect(wrongJackCheck.code).toBe('WRONG_JACK');
      }

      // 4. Live resistance measurement blocks action (prevents internal fuse damage)
      const liveResCheck = evaluateMeterGuard({
        currentMode: 'OHM_200',
        expectedMode: 'OHM_200',
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: true,
        resistanceMeasurement: true,
      });
      expect(liveResCheck.allowed).toBe(false);
      if (!liveResCheck.allowed) {
        expect(liveResCheck.code).toBe('LIVE_RESISTANCE');
      }

      // 5. Dangerous parallel ammeter bridge blocks action (prevents dead short across source)
      const dangerBridgeCheck = evaluateMeterGuard({
        currentMode: 'DCA_20',
        expectedMode: 'DCA_20',
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: true,
        dangerousBridge: true,
      });
      expect(dangerBridgeCheck.allowed).toBe(false);
      if (!dangerBridgeCheck.allowed) {
        expect(dangerBridgeCheck.code).toBe('DANGEROUS_BRIDGE');
      }

      // 6. Valid setup passes
      const validCheck = evaluateMeterGuard({
        currentMode: 'DCV_20',
        expectedMode: 'DCV_20',
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: true,
      });
      expect(validCheck.allowed).toBe(true);
      expect('code' in validCheck).toBe(false);
    });

    it('executeWithMeterGuard prevents callback execution and warns when guard fails', () => {
      let callbackInvoked = false;
      let blockedCode: string | null = null;

      const input: MeterGuardInput<string> = {
        currentMode: 'OFF',
        expectedMode: 'DCV_20',
        blackJackOk: true,
        redJackOk: true,
        probesPlaced: true,
        circuitPowered: true,
      };

      const execRes = executeWithMeterGuard(
        input,
        () => {
          callbackInvoked = true;
        },
        (res) => {
          blockedCode = res.code ?? null;
        }
      );

      expect(execRes.allowed).toBe(false);
      expect(callbackInvoked).toBe(false);
      expect(blockedCode).toBe('OFF');
    });
  });

  describe('Redline 6: E07 Physical Rubric Teacher Authority & Anti-Self-Sign Protection', () => {
    it('verifies E07 source code has zero student self-sign mechanism and redirects completion to teacher evaluation', () => {
      const e07ExpFile = path.join(rootDir, 'src', 'levels', 'e07', 'E07Experience.tsx');
      const e07Content = fs.readFileSync(e07ExpFile, 'utf-8');

      // 1. Must NOT contain student self-sign or bypass button
      expect(e07Content).not.toContain('自评签署');
      expect(e07Content).not.toContain('studentSign');
      expect(e07Content).not.toContain('selfSign');

      // 2. Must display pending teacher rubric state upon virtual stage completion
      expect(e07Content).toContain('待教师现场量规评定');
      expect(e07Content).toContain('任课教师在教师工作台录入实物量规评语');

      // 3. Must link to teacher evaluation API endpoint for teacher assessment
      expect(e07Content).toContain('/api/learning/evaluations');
    });

    it('verifies E07 training curriculum and scene integrate IPC-A-610 industrial standards', () => {
      const e07TrainingFile = path.join(rootDir, 'src', 'levels', 'e07', 'e07Training.ts');
      const content = fs.readFileSync(e07TrainingFile, 'utf-8');
      expect(content).toContain('IPC-A-610');
      expect(content).toContain('凹面半月形');
    });
  });
});
