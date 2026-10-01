import { type Locator, expect, test } from '@playwright/test';
import { login } from './helpers';

async function assertElementWithinHorizontalBounds(locator: Locator, viewportWidth: number) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 2);
  }
}

test('curriculum route references and responsive level headings stay usable', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await page.getByRole('button', { name: '重庆2027考纲关卡索引' }).click();
  await page.getByText('查看19项考纲要求与对应关卡', { exact: true }).click();
  await expect(page.getByRole('region', { name: '学习路线与教材考纲' }).getByRole('button', { name: /D05 认识与检测变压器/ })).toBeVisible();
  await page.getByRole('button', { name: '低压故障练习工单' }).click();
  await expect(page.getByText(/转向、危险警告、制动、倒车等独立线路工单尚未覆盖/)).toBeVisible();
  await login(page, 'teacher');
  await expect(page.getByRole('heading', { name: '任教班级学情与教学评价' })).toBeVisible();

  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const [id, name] of [['A02', '给电路做体检'], ['A03', '识别与检测电阻'], ['D02', '控制电机正反转'], ['D05', '认识与检测变压器'], ['E03', '把交流变成直流'], ['E05', '让电路按条件动作']]) {
      await page.goto(`/?level=${id}`);
      await expect(page.getByRole('heading', { level: 1, name: `${id} ${name}`, exact: true })).toBeVisible();
      const references = page.locator('.curriculum-details');
      await expect(references).not.toHaveAttribute('open');
      await references.locator('summary').click();
      await expect(references).toHaveAttribute('open');
      await expect(references).toContainText('教材学习任务');
      if (id === 'D05') await expect(references).toContainText('重庆2027备考必学');
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const workOrder = page.getByRole('button', { name: '工单', exact: true });
      await workOrder.scrollIntoViewIfNeeded();
      await expect(workOrder).toBeVisible();
      await workOrder.click();
      const close = page.getByRole('button', { name: /^(关闭工单|返回实训工位|已查阅，继续实训)$/ }).first();
      await expect(close).toBeVisible();
      await close.click();
      await references.locator('summary').scrollIntoViewIfNeeded();
      await references.locator('summary').click();

      // Deep responsive & visibility assertions for E03 and E05
      if (id === 'E03') {
        const boundaryText = page.getByText(/训练边界：单相电容滤波台架与车用三相整流分别演示/);
        await assertElementWithinHorizontalBounds(boundaryText, viewport.width);

        const diodeKnob = page.getByRole('button', { name: 'DIODE', exact: true });
        await assertElementWithinHorizontalBounds(diodeKnob, viewport.width);
        await diodeKnob.click();

        const stepAngleBtn = page.getByRole('button', { name: '推进三相电角度 60°' });
        await assertElementWithinHorizontalBounds(stepAngleBtn, viewport.width);
        await stepAngleBtn.click();

        const phaseSelect = page.getByLabel('独立判断：U=8V、V=-3V、W=-5V时的导通相对');
        await assertElementWithinHorizontalBounds(phaseSelect, viewport.width);
      }

      if (id === 'E05') {
        const norGateBtn = page.getByRole('button', { name: 'NOR', exact: true });
        await assertElementWithinHorizontalBounds(norGateBtn, viewport.width);
        await norGateBtn.click();

        const ohmKnob = page.getByRole('button', { name: 'OHM_200', exact: true });
        await assertElementWithinHorizontalBounds(ohmKnob, viewport.width);
        await ohmKnob.click();

        const gateVerifyTitle = page.getByText('五种门输入输出验证');
        await assertElementWithinHorizontalBounds(gateVerifyTitle, viewport.width);

        const record0Btn = page.getByRole('button', { name: '判读输出 0 并记录' });
        await assertElementWithinHorizontalBounds(record0Btn, viewport.width);
      }

      await page.screenshot({ path: testInfo.outputPath(`${id}-${viewport.width}.png`), fullPage: true });
    }
  }
});
