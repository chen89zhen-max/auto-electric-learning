import { expect, test } from '@playwright/test';
import { login } from './helpers';

for (const levelId of ['O01', 'A02', 'D03', 'E07', 'F01']) {
  test(`${levelId} keeps the shared header compact at 1920x1080`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page, 'teacher');
    await page.goto(`/?level=${levelId}`);
    if (levelId === 'O01') await page.getByRole('button', { name: '关闭工单' }).click();

    const shell = page.locator('main.app-shell');
    const header = shell.locator('header.topbar');
    const workbench = shell.locator('section.workspace');
    await expect(header).toBeVisible();
    await expect(workbench).toBeVisible();
    const headerBox = await header.boundingBox();
    const workbenchBox = await workbench.boundingBox();
    expect(headerBox!.height).toBeLessThanOrEqual(105);
    expect(workbenchBox!.height).toBeGreaterThanOrEqual(900);

    const references = header.locator('.curriculum-details');
    await references.locator('summary').click();
    await expect(references.getByText('本关目标：')).toBeVisible();
    const expandedWorkbenchBox = await workbench.boundingBox();
    expect(expandedWorkbenchBox!.height).toBe(workbenchBox!.height);
  });
}

for (const levelId of ['O01', 'E07']) {
  test(`${levelId} keeps a usable workbench at 1366x768`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page, 'teacher');
    await page.goto(`/?level=${levelId}`);
    if (levelId === 'O01') await page.getByRole('button', { name: '关闭工单' }).click();
    const headerBox = await page.locator('main.app-shell > header.topbar').boundingBox();
    const workbenchBox = await page.locator('main.app-shell > section.workspace').boundingBox();
    expect(headerBox!.height).toBeLessThanOrEqual(110);
    expect(workbenchBox!.height).toBeGreaterThanOrEqual(590);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

test('compact header preserves access to references on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 'teacher');
  await page.goto('/?level=O01');
  await page.getByRole('button', { name: '关闭工单' }).click();
  const references = page.locator('.level-heading .curriculum-details');
  await references.locator('summary').click();
  await expect(references.getByText('本关目标：')).toBeVisible();
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll<HTMLElement>('*')]
      .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 10)
      .map((element) => ({ tag: element.tagName, className: String(element.className).slice(0, 80), right: element.getBoundingClientRect().right })),
  }));
  expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width + 1);
});
