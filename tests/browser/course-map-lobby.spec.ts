import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { login } from './helpers';

const screenshotDir = path.resolve(process.cwd(), 'tmp/course-map-acceptance');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

test('anonymous lobby renders the real seven-chapter map and asks for login before entering', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '汽车电工电子闯关实训' })).toBeVisible();
  await expect(page.getByTestId('course-map-stage')).toBeVisible();
  await expect(page.locator('[data-course-chapter]')).toHaveCount(7);
  await expect(page.getByText('28个任务', { exact: false })).toBeVisible();
  await page.locator('[data-level-id="O00"]').click();
  await expect(page.getByRole('dialog')).toContainText('账号登录');
});

test('student selects a chapter and enters an unlocked task through the existing route', async ({ page }) => {
  await login(page, 'student');
  await page.locator('[data-course-chapter="O"]').click();
  await expect(page.getByRole('heading', { name: /序章：实训准备与安全/ })).toBeVisible();
  await page.locator('[data-level-id="O00"]').click();
  await expect(page.getByRole('heading', { level: 1, name: 'O00 走进实训中心' })).toBeVisible();
});

const viewports = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

for (const viewport of viewports) {
  test(`course lobby remains usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByTestId('course-map-stage')).toBeVisible();
    await expect(page.getByTestId('current-mission-card')).toBeVisible();
    await expect(page.getByRole('region', { name: '当前实训台架与考核规范' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /账号登录\/激活/ })).toBeVisible();
    const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(noHorizontalOverflow).toBe(true);

    const placement = await page.evaluate(() => {
      const map = document.querySelector<HTMLElement>('[data-testid="course-map-stage"]')!.getBoundingClientRect();
      const recommendation = document.querySelector<HTMLElement>('[data-testid="current-mission-card"]')!.getBoundingClientRect();
      return { mapRight: map.right, mapBottom: map.bottom, cardLeft: recommendation.left, cardTop: recommendation.top };
    });
    if (viewport.width >= 1280) expect(placement.mapRight).toBeLessThanOrEqual(placement.cardLeft);
    else expect(placement.mapBottom).toBeLessThanOrEqual(placement.cardTop);

    const alignment = await page.evaluate(() => {
      const svg = document.querySelector<SVGSVGElement>('svg[viewBox="0 0 1376 768"]')!;
      const box = svg.getBoundingClientRect();
      const checkpoints = [...document.querySelectorAll<HTMLElement>('[data-map-checkpoint]')];
      const obstacles = [...document.querySelectorAll<HTMLElement>('[data-course-chapter], [data-testid="current-mission-card"]')];
      const blocked = checkpoints.filter(checkpoint => obstacles.some(obstacle => {
        const a = checkpoint.getBoundingClientRect(), b = obstacle.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      })).map(checkpoint => checkpoint.dataset.mapCheckpoint);
      const car = document.querySelector<HTMLElement>('[data-motion]')!.getBoundingClientRect();
      const marker = document.querySelector<SVGGElement>('#track-checkpoints > g')!;
      const point = new DOMPoint(0, 0).matrixTransform(marker.getScreenCTM()!);
      return { ratio: box.width / box.height, blocked, count: checkpoints.length,
        error: Math.hypot(car.x + car.width / 2 - point.x, car.y + car.height / 2 - point.y) };
    });
    expect(alignment.count).toBe(28);
    expect(alignment.ratio).toBeCloseTo(1376 / 768, 3);
    expect(alignment.blocked).toEqual([]);
    expect(alignment.error).toBeLessThan(0.5);
  });
}

test('supports keyboard navigation between chapters and reduces motion when requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  // Verify reduced motion on animation
  const routeAnimation = await page.locator('#circuit-paths path').first().evaluate(
    (el) => window.getComputedStyle(el).animationName
  );
  expect(routeAnimation).toBe('none');

  const currentRing = page.locator('div[class*="currentRing"]');
  if (await currentRing.count() > 0) {
    const ringAnimation = await currentRing.first().evaluate(
      (el) => window.getComputedStyle(el).animationName
    );
    expect(ringAnimation).toBe('none');
  }

  // Keyboard focus navigation
  const nodeO = page.locator('[data-course-chapter="O"]');
  await nodeO.focus();
  await expect(nodeO).toBeFocused();

  await page.keyboard.press('ArrowRight');
  const nodeA = page.locator('[data-course-chapter="A"]');
  await expect(nodeA).toBeFocused();

  // Enter selects Chapter A and focuses heading
  await page.keyboard.press('Enter');
  const heading = page.locator('#chapter-task-panel-heading');
  await expect(heading).toContainText('篇章一：电路认知与基本测量');
  await expect(heading).toBeFocused();
});

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`supports 200% font scaling at ${viewport.width}x${viewport.height} without page overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await expect(page.getByRole('heading', { name: '汽车电工电子闯关实训' })).toBeVisible();
    await expect(page.getByTestId('course-map-stage')).toBeVisible();
    await expect(page.locator('#chapter-task-panel-heading')).toBeVisible();

    const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(noHorizontalOverflow).toBe(true);
  });
}

test('first screen at multiple resolutions shows all core elements within viewport', async ({ page }) => {
  for (const vp of [
    { width: 1366, height: 768, tag: '1366x768' },
    { width: 1920, height: 1080, tag: '1920x1080' },
    { width: 1920, height: 1200, tag: '1920x1200-16-10' },
    { width: 1440, height: 900, tag: '1440x900-16-10' },
  ]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await login(page, 'student');

    const header = page.getByRole('heading', { name: '汽车电工电子闯关实训' });
    const stage = page.getByTestId('course-map-stage');
    const nodes = page.locator('[data-course-chapter]');
    const currentMissionCard = page.locator('section[aria-label="当前实训任务"]');
    const mainActionBtn = currentMissionCard.getByRole('button', { name: /进入实训|再次复习实训|查看解锁条件|查看建设状态/ });

    await expect(header).toBeVisible();
    await expect(stage).toBeVisible();
    await expect(nodes).toHaveCount(7);
    await expect(currentMissionCard).toBeVisible();
    await expect(mainActionBtn).toBeVisible();

    // The map starts in the first screen and may continue below it; the action stays visible.
    const headerBox = await header.boundingBox();
    const stageBox = await stage.boundingBox();
    const btnBox = await mainActionBtn.boundingBox();

    expect(headerBox).not.toBeNull();
    expect(stageBox).not.toBeNull();
    expect(btnBox).not.toBeNull();

    if (headerBox && stageBox && btnBox) {
      expect(headerBox.y).toBeGreaterThanOrEqual(0);
      expect(stageBox.y).toBeLessThanOrEqual(vp.height);
      expect(btnBox.y + btnBox.height).toBeLessThanOrEqual(vp.height + 15);
    }

    // Capture screenshot for acceptance artifact
    await page.screenshot({
      path: path.join(screenshotDir, `${vp.tag}-student-first-screen.png`),
      fullPage: false,
    });

    if (vp.tag === '1366x768') {
      // Also click chapter E and screenshot tasks panel
      await page.locator('[data-course-chapter="E"]').click();
      await expect(page.locator('#chapter-task-panel-heading')).toContainText('篇章五：电子器件与控制电路');
      await page.screenshot({
        path: path.join(screenshotDir, '1366x768-chapter-e-tasks.png'),
        fullPage: false,
      });
    }

    // Logout for next viewport
    const logoutBtn = page.getByRole('button', { name: '退出', exact: true });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page.getByRole('button', { name: /账号登录\/激活/ })).toBeVisible();
    }
  }
});
