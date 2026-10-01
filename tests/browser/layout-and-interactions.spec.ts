import { expect, test, type Locator, type Page } from '@playwright/test';
import { login } from './helpers';

type LevelCheck = { id: string; primaryActionName: string; focusTarget: (page: Page) => Locator };
const cWorkOrder = (page: Page) => page.getByRole('button', { name: '工单', exact: true });
// Each row identifies the first-stage action rendered by that level. This avoids
// accidentally passing on shell controls such as "返回大厅" or "重新开始".
const practiceLevels: readonly LevelCheck[] = [
  { id: 'B05', primaryActionName: '确认已完成本阶段实测与数据记录', focusTarget: cWorkOrder },
  { id: 'B06', primaryActionName: '确认已完成本阶段实测与数据记录', focusTarget: cWorkOrder },
  { id: 'C01', primaryActionName: '提交假设分析', focusTarget: cWorkOrder },
  { id: 'C02', primaryActionName: '提交工具认知工单', focusTarget: cWorkOrder },
  { id: 'C03', primaryActionName: '提交初检问诊单', focusTarget: cWorkOrder },
  { id: 'D01', primaryActionName: '提交电学决策结论', focusTarget: cWorkOrder },
  { id: 'D02', primaryActionName: '提交受力方向判别', focusTarget: cWorkOrder },
  { id: 'D03', primaryActionName: '提交感应电流方向判定', focusTarget: cWorkOrder },
  { id: 'D04', primaryActionName: '请先在左侧断开开关观察打火', focusTarget: cWorkOrder },
  { id: 'D05', primaryActionName: '确认台架无电压与断电隔离 (模拟台架状态确认)', focusTarget: cWorkOrder },
  { id: 'E01', primaryActionName: '提交判定', focusTarget: cWorkOrder },
  { id: 'E02', primaryActionName: '提交认知判定', focusTarget: cWorkOrder },
  { id: 'E03', primaryActionName: '提交认知判定', focusTarget: cWorkOrder },
  { id: 'E04', primaryActionName: '提交认知判定', focusTarget: cWorkOrder },
  { id: 'E05', primaryActionName: '提交认知判定', focusTarget: cWorkOrder },
  { id: 'E06', primaryActionName: '提交认知判定', focusTarget: cWorkOrder },
  { id: 'E07', primaryActionName: '提交工艺判定', focusTarget: cWorkOrder },
];

const viewports = [{ label: '1366x768', width: 1366, height: 768 }, { label: '1920x1080', width: 1920, height: 1080 }] as const;

async function assertVisibleAndUncovered(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  expect(await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return Boolean(hit && (hit === element || element.contains(hit) || hit.contains(element)));
  })).toBe(true);
}

async function tabToVisibleFocus(page: Page, target: Locator) {
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  for (let tabCount = 0; tabCount < 80; tabCount += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => document.activeElement === element)) break;
  }
  await expect(target).toBeFocused();
  expect(await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.outlineStyle !== 'none' || style.outlineWidth !== '0px' || style.boxShadow !== 'none';
  })).toBe(true);
}

test.describe('P4-P6 rendered accessibility at classroom viewport and 200% text', () => {
  for (const viewport of viewports) {
    for (const fontScale of [100, 200] as const) {
      for (const level of practiceLevels) {
        test(`${level.id} at ${viewport.label} / ${fontScale}% remains usable`, async ({ page }) => {
          await page.setViewportSize(viewport);
          await login(page, 'teacher');
          await page.goto(`/?level=${level.id}`);
          await page.evaluate((scale) => { document.documentElement.style.fontSize = `${scale}%`; }, fontScale);

          const stage = ['B05', 'B06'].includes(level.id)
            ? page.getByText(/阶段 1\/3/).first()
            : page.getByText(new RegExp(`${level.id}.*实训步骤\\s*1`)).first();
          const primaryAction = page.getByRole('button', { name: level.primaryActionName, exact: true });
          const focusTarget = level.focusTarget(page);
          const shell = page.locator('main.app-shell');
          const workspace = page.locator('section.workspace');
          const scenePanel = workspace.locator('.scene-panel');
          const tutorPanel = workspace.locator('aside.tutor-panel');
          await expect(shell.locator('header.topbar')).toBeVisible();
          await expect(workspace).toBeVisible();
          await expect(scenePanel).toBeVisible();
          await expect(tutorPanel).toBeVisible();
          await expect(shell.locator('nav.bottom-bar')).toBeVisible();
          const [sceneBox, tutorBox] = await Promise.all([
            scenePanel.boundingBox(),
            tutorPanel.boundingBox(),
          ]);
          expect(sceneBox).not.toBeNull();
          expect(tutorBox).not.toBeNull();
          expect(tutorBox!.x).toBeGreaterThan(sceneBox!.x);
          await assertVisibleAndUncovered(stage);
          await assertVisibleAndUncovered(primaryAction);
          await expect(page.getByText(/正确答案|答案揭示|参考答案/)).toHaveCount(0);
          await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
          await tabToVisibleFocus(page, focusTarget);
        });
      }
    }
  }
});

test.describe('level-specific rendered interactions', () => {
  test('C02 changes the rendered active measurement tool', async ({ page }) => {
    await login(page, 'teacher');
    await page.goto('/?level=C02');
    const meter = page.getByRole('button', { name: '数字万用表 (定量)' });
    await meter.click();
    await expect(meter).toHaveClass(/bg-amber-500/);
  });

  test('C03 opens the work order dialog', async ({ page }) => {
    await login(page, 'teacher');
    await page.goto('/?level=C03');
    await page.getByRole('button', { name: '工单' }).click();
    await expect(page.getByRole('dialog', { name: 'C03 实训工单' })).toBeVisible();
  });
});
