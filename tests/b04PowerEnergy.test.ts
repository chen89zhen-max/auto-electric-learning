import { describe, expect, it } from 'vitest';
import { buildB04WorkshopBudget } from '@/src/levels/b04/B04PowerEnergyScene';

describe('B04 workstation power and fuse budget', () => {
  it('distinguishes actual power from rating and blocks overload with a fuse', () => {
    const budget = buildB04WorkshopBudget();
    expect(budget.deratedLamp.actualPower).toBeCloseTo(6, 6);
    expect(budget.deratedLamp.isOverloaded).toBe(false);
    expect(budget.eightHour.energyKWh).toBeCloseTo(2.24, 6);
    expect(budget.overloaded.totalCurrent).toBeGreaterThan(budget.fuseRatingAmps);
    expect(budget.overloaded.fuseProtectsCircuit).toBe(true);
  });
});
