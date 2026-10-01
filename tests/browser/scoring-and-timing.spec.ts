import { expect, test } from '@playwright/test';
import { login } from './helpers';

interface EventResponse {
  success: boolean;
  durationMs?: number;
  projection: {
    levels: {
      LEVEL_00: {
        score?: number;
        attemptCount?: number;
        recentRecord?: {
          score: number;
          startedAt?: string;
          completedAt: string;
          durationMs?: number;
          timingSource?: string;
        };
      };
    };
  };
}

test('a repeated completion becomes the latest score and second-accurate wall-clock record', async ({ page }) => {
  await login(page, 'student');

  const submitEvent = async (eventType: 'LEVEL_START' | 'LEVEL_COMPLETE', score?: number) => {
    const response = await page.evaluate(async ({ eventType, score }) => {
      const eventId = `browser_${eventType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const result = await fetch('/api/learning/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          eventId,
          levelId: 'O00',
          eventType,
          payload: eventType === 'LEVEL_COMPLETE' ? { score, mode: 'guided' } : {},
          occurredAt: Date.now(),
        }),
      });
      return { status: result.status, body: await result.json() };
    }, { eventType, score });
    expect(response.status).toBe(200);
    return response.body as EventResponse;
  };

  await submitEvent('LEVEL_START');
  await page.waitForTimeout(2_250);
  await submitEvent('LEVEL_COMPLETE', 91);

  await submitEvent('LEVEL_START');
  await page.waitForTimeout(2_250);
  const latest = await submitEvent('LEVEL_COMPLETE', 73);
  const level = latest.projection.levels.LEVEL_00;

  expect(level.score).toBe(73);
  expect(level.recentRecord).toMatchObject({
    score: 73,
    timingSource: 'server',
  });
  expect(level.recentRecord?.startedAt).toBeTruthy();
  expect(level.recentRecord?.completedAt).toBeTruthy();
  expect(level.recentRecord?.durationMs).toBeGreaterThanOrEqual(2_000);
  expect(level.recentRecord?.durationMs).toBeLessThan(5_000);

  await page.reload();
  const levelCard = page.getByRole('button').filter({ hasText: '走进实训中心' });
  await expect(levelCard).toContainText('最近成绩 (73分)');
  await expect(levelCard).toContainText(/用时[2-4] 秒/);
  await expect(levelCard).toContainText(/完成.*:\d{2}:\d{2}/);
});
