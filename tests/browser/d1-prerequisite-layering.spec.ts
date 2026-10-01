import { expect, test } from '@playwright/test';
import { login } from './helpers';

const progressKey = 'NEV_ELECTRICAL_GAME_USER_PROGRESS_V1';

async function seedProgress(page: Parameters<typeof login>[0], completedIds: string[]) {
  await page.evaluate(({ key, ids }) => {
    const raw = localStorage.getItem(key);
    const current = raw ? JSON.parse(raw) : {};
    const levels = Object.fromEntries(ids.map((id) => [id, { status: 'completed', score: 90 }]));
    localStorage.setItem(key, JSON.stringify({
      ...current,
      currentActiveLevel: 'B04',
      teacherMode: false,
      lastUpdated: Date.now(),
      levels: { ...current.levels, ...levels },
    }));
  }, { key: progressKey, ids: completedIds });
  await page.reload();
  await expect(page.getByTestId('course-map-stage')).toBeVisible();
}

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  test(`D1 separates B04 recommendation from lock at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await login(page, 'student');
    await seedProgress(page, ['B02']);

    const b04 = page.locator('[data-level-id="B04"]');
    await b04.scrollIntoViewIfNeeded();
    await expect(b04).toHaveAttribute('data-state', /available|current/);
    await expect(b04).toContainText(/建议先学：.*B03/);
    await expect(b04).not.toContainText('需先完成');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

test('D1 retains B04 hard lock when B02 is not completed', async ({ page }) => {
  await login(page, 'student');
  await seedProgress(page, []);

  const b04 = page.locator('[data-level-id="B04"]');
  await b04.scrollIntoViewIfNeeded();
  await expect(b04).toHaveAttribute('data-state', 'locked');
  await expect(b04).toContainText('需先完成');
  await expect(b04).not.toContainText('建议先学');
});
