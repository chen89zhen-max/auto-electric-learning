import { describe, expect, it } from 'vitest';
import {
  calculateParallelPlateCapacitance,
  calculateTauSeconds,
} from '@/src/levels/e02/e02Training';
import {
  STARTER_MOTOR_COMPONENTS,
  MAGNETIC_FIELD_COMPARISON,
} from '@/src/levels/d02/d02Training';
import {
  E07_PRE_POWER_CHECKLIST,
  E07_STAGE_CONTENT,
} from '@/src/levels/e07/e07Training';
import {
  getCourseLevel,
  CANONICAL_COURSE_REGISTRY,
} from '@/src/courses/registry';
import { C01_STAGE_CONTENT } from '@/src/levels/c01/c01Training';

describe('Task 6: Textbook Capability Gaps Remediation', () => {
  describe('E02: Parallel Plate Capacitor Control-Variable Experiment (C = ε * S / d)', () => {
    it('correctly models parallel plate capacitor control-variable experiment C = ε * S / d', () => {
      // Base 470uF with areaRatio=1, distanceRatio=1, εr=1
      const baseC = calculateParallelPlateCapacitance({ baseUf: 470, areaRatio: 1.0, distanceRatio: 1.0 });
      expect(baseC).toBe(470);

      // Doubling plate area S doubles capacitance
      const doubleAreaC = calculateParallelPlateCapacitance({ baseUf: 470, areaRatio: 2.0, distanceRatio: 1.0 });
      expect(doubleAreaC).toBe(940);

      // Doubling plate distance d halves capacitance
      const doubleDistC = calculateParallelPlateCapacitance({ baseUf: 470, areaRatio: 1.0, distanceRatio: 2.0 });
      expect(doubleDistC).toBe(235);

      // Dielectric constant 3.0 triples capacitance
      const dielectricC = calculateParallelPlateCapacitance({
        baseUf: 470,
        areaRatio: 1.0,
        distanceRatio: 1.0,
        dielectricConstant: 3.0,
      });
      expect(dielectricC).toBe(1410);

      // τ also scales with C: τ = R * C
      const tauBase = calculateTauSeconds(10000, baseC);
      const tauDoubleArea = calculateTauSeconds(10000, doubleAreaC);
      expect(tauDoubleArea).toBeCloseTo(tauBase * 2, 2);
    });
  });

  describe('D02: Starter Motor Structure Mapping and Rotating Field Comparison', () => {
    it('defines starter motor physical structure mapping with 6 core components', () => {
      expect(STARTER_MOTOR_COMPONENTS.length).toBeGreaterThanOrEqual(6);
      const ids = STARTER_MOTOR_COMPONENTS.map((c) => c.id);
      expect(ids).toContain('ARMATURE');
      expect(ids).toContain('STATOR_FIELD');
      expect(ids).toContain('COMMUTATOR');
      expect(ids).toContain('CARBON_BRUSHES');
      expect(ids).toContain('SOLENOID_SWITCH');
      expect(ids).toContain('DRIVE_PINION');
    });

    it('contrasts single-phase pulsating magnetic field vs three-phase rotating magnetic field', () => {
      expect(MAGNETIC_FIELD_COMPARISON.singlePhase.isSelfStarting).toBe(false);
      expect(MAGNETIC_FIELD_COMPARISON.threePhase.isRotating).toBe(true);
      expect(MAGNETIC_FIELD_COMPARISON.threePhase.phaseDifferenceDegrees).toBe(120);
    });
  });

  describe('E07: Pre-power Checklist and IPC-A-610 Joint Standard', () => {
    it('mandates 6 pre-power safety checklist items before soldering iron heating', () => {
      expect(E07_PRE_POWER_CHECKLIST.length).toBe(6);
      const checklistIds = E07_PRE_POWER_CHECKLIST.map((item) => item.id);
      expect(checklistIds).toContain('GROUNDING');
      expect(checklistIds).toContain('TIP_SCREW');
      expect(checklistIds).toContain('STAND_WEIGHT');
      expect(checklistIds).toContain('SPONGE_WET');
      expect(checklistIds).toContain('VENTILATION');
      expect(checklistIds).toContain('GOGGLES');
    });

    it('adheres to IPC-A-610 standard solder joint wetting angle and geometry', () => {
      const stage3 = E07_STAGE_CONTENT.SOLDER_JOINT_QUALITY_STANDARD;
      expect(stage3.objective).toContain('IPC-A-610');
      expect(stage3.actions.some((a) => a.includes('良好润湿饱满度') && a.includes('凹面半月形'))).toBe(true);
    });
  });

  describe('Course Registry & Course Map: Curriculum Requirement Tagging', () => {
    it('correctly tags curriculum requirements (required vs elective) and marks D05 as elective', () => {
      const d05 = getCourseLevel('D05');
      expect(d05).toBeDefined();
      expect(d05?.curriculumRequirement).toBe('elective');

      const c01 = getCourseLevel('C01');
      expect(c01?.curriculumRequirement ?? 'required').toBe('required');

      // D05 is not a prerequisite for any other course in the registry
      for (const lvl of CANONICAL_COURSE_REGISTRY) {
        expect(lvl.prerequisiteLevelIds).not.toContain('D05');
      }
    });
  });

  describe('C01: Voltage Drop Guideline OEM Workshop Manual Clarification', () => {
    it('clarifies voltage drop limit wording in C01 with OEM workshop manuals', () => {
      const stage2 = C01_STAGE_CONTENT.LOADED_VOLTAGE_DROP_TEST;
      expect(stage2.mentorPrompt).toContain('OEM');
      expect(stage2.actions.some((a) => a.includes('OEM'))).toBe(true);
    });
  });
});
