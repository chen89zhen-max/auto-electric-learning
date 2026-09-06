import { describe, it, expect } from 'vitest';
import {
  E07_STAGE_CONTENT,
  E07_DEFECTS,
} from '../src/levels/e07/e07Training';

describe('E07 PCB Assembly and Soldering Suite', () => {
  it('covers all 5 progressive training stages with comprehensive pedagogy', () => {
    const steps = Object.keys(E07_STAGE_CONTENT);
    expect(steps).toEqual([
      'SOLDERING_SAFETY_AND_FIVE_STEPS',
      'VIRTUAL_PCB_INSERTION_AND_WELD',
      'SOLDER_JOINT_QUALITY_STANDARD',
      'BLIND_PCB_DEFECT_INSPECTION',
      'ENGINEERING_REPAIR_AND_DELIVERY',
    ]);
    steps.forEach((step) => {
      const stage = E07_STAGE_CONTENT[step as keyof typeof E07_STAGE_CONTENT];
      expect(stage.title).toBeTruthy();
      expect(stage.objective).toBeTruthy();
      expect(stage.actions.length).toBeGreaterThanOrEqual(3);
      expect(stage.mentorPrompt).toBeTruthy();
    });
  });

  it('contains valid 4-type PCB defect samples covering bridging, cold solder, reversed polarity, pad lift', () => {
    expect(E07_DEFECTS.length).toBe(4);
    const types = E07_DEFECTS.map((s) => s.actualDefect);
    expect(types).toContain('BRIDGING');
    expect(types).toContain('COLD_SOLDER');
    expect(types).toContain('REVERSED_POLARITY');
    expect(types).toContain('PAD_LIFT');
  });
});
