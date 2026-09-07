import { expect, test, type Locator, type Page } from '@playwright/test';
import { login } from './helpers';

type LevelCheck = { id: string; primaryActionName: string; focusTarget: (page: Page) => Locator };
const iconWorkOrder = (page: Page) => page.getByTitle('查看实训工单与步骤指南');
const labeledWorkOrder = (page: Page) => page.getByRole('button', { name: '工单卡', exact: true });
const cWorkOrder = (page: Page) => page.getByRole('button', { name: '工单', exact: true });
// Each row identifies the first-stage action rendered by that level. This avoids
// accidentally passing on shell controls such as "返回大厅" or "重新开始".
const practiceLevels: readonly LevelCheck[] = [
  { id: 'C01', primaryActionName: '提交假设分析', focusTarget: cWorkOrder },
  { id: 'C02', primaryActionName: '提交工具认知工单', focusTarget: cWorkOrder },
  { id: 'C03', primaryActionName: '提交初检问诊单', focusTarget: cWorkOrder },
  { id: 'D01', primaryActionName: '提交电学决策结论', focusTarget: iconWorkOrder },
  { id: 'D02', primaryActionName: '提交受力方向判别', focusTarget: labeledWorkOrder },
  { id: 'D03', primaryActionName: '提交感应电流方向判定', focusTarget: labeledWorkOrder },
  { id: 'D04', primaryActionName: '请先在左侧断开开关观察打火', focusTarget: labeledWorkOrder },
  { id: 'D05', primaryActionName: '提交磁耦合原理分析', focusTarget: iconWorkOrder },
  { id: 'E01', primaryActionName: '提交判定', focusTarget: iconWorkOrder },
  { id: 'E02', primaryActionName: '提交认知判定', focusTarget: iconWorkOrder },
  { id: 'E03', primaryActionName: '提交认知判定', focusTarget: iconWorkOrder },
  { id: 'E04', primaryActionName: '提交认知判定', focusTarget: iconWorkOrder },
  { id: 'E05', primaryActionName: '提交认知判定', focusTarget: iconWorkOrder },
  { id: 'E06', primaryActionName: '提交认知判定', focusTarget: iconWorkOrder },
  { id: 'E07', primaryActionName: '提交工艺判定', focusTarget: iconWorkOrder },
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

          const stage = page.getByText(new RegExp(`${level.id}.*实训步骤\\s*1`)).first();
          const primaryAction = page.getByRole('button', { name: level.primaryActionName, exact: true });
          const focusTarget = level.focusTarget(page);
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
