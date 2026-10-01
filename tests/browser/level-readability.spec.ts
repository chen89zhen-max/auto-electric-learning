import { expect, test } from '@playwright/test';
import { login } from './helpers';

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  test(`E02 电容图文字在 ${viewport.width}px 下可读且页面不横向溢出`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await login(page, 'teacher');
    await page.goto('/?level=E02');

    const capacitorLabel = page.locator('svg text', { hasText: '电解电容' }).first();
    await expect(capacitorLabel).toBeVisible();
    const height = await capacitorLabel.evaluate((element) => element.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(14);
    if (viewport.width >= 1024) {
      const diagramFits = await capacitorLabel.evaluate((element) => {
        const diagram = element.closest('svg')!.getBoundingClientRect();
        const frame = element.closest('svg')!.parentElement!.getBoundingClientRect();
        return diagram.left >= frame.left - 1 && diagram.right <= frame.right + 1;
      });
      expect(diagramFits).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`e02-${viewport.width}.png`), fullPage: false });
  });
}

test('E04 电路元件标注不再使用 8px 微型字', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await login(page, 'teacher');
  await page.goto('/?level=E04');

  const resistorLabel = page.locator('svg text', { hasText: '2.2kΩ' }).first();
  await expect(resistorLabel).toBeVisible();
  expect(await resistorLabel.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(14);
});
