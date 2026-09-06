import { expect, it } from 'vitest';
import { scoreFromDimensions } from '@/src/abilities/reportScore';
it('能力报告按各维度星级等权换算为百分制，错误操作影响归档成绩', () => {
  expect(scoreFromDimensions([{ stars: 5 }, { stars: 4 }, { stars: 3 }, { stars: 5 }, { stars: 4 }])).toBe(84);
  expect(scoreFromDimensions([{ stars: 5 }, { stars: 5 }])).toBe(100);
  expect(() => scoreFromDimensions([])).toThrow();
  expect(() => scoreFromDimensions([{ stars: NaN }])).toThrow();
});
