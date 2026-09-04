import reviewData from '@/src/levels/level01/review.json';

interface ReflectionConfig {
  reflection: {
    correctOrder: string[];
  };
}

const config = reviewData as ReflectionConfig;

export class ReflectionEngine {
  evaluate(sequence: string[]): { correct: boolean; message: string } {
    const expected = config.reflection.correctOrder;
    const correct = sequence.length === expected.length && sequence.every((step, index) => step === expected[index]);
    return {
      correct,
      message: correct ? '安全处置链已形成。' : '顺序还不稳：先观察和判断，再控制危险、实施处置并确认安全。',
    };
  }
}

export const reflectionEngine = new ReflectionEngine();
