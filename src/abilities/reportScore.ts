/** 五星为满分，各能力维度等权；与学生报告使用相同的数据。 */
export function scoreFromDimensions(dimensions: ReadonlyArray<{ stars: number }>): number {
  if (!dimensions.length || dimensions.some(({ stars }) => !Number.isFinite(stars) || stars < 0 || stars > 5)) {
    throw new Error('能力报告数据不完整，无法保存成绩');
  }
  return Math.round(dimensions.reduce((total, { stars }) => total + stars, 0) / (dimensions.length * 5) * 100);
}
