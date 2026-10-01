import { expect, test } from '@playwright/test';
import { login } from './helpers';

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  test(`Batch D workorders complete a lamp evidence loop without overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await login(page, 'student');
    await page.getByRole('button', { name: '低压故障练习工单' }).click();
    const panel = page.getByRole('region', { name: 'D批次低压系统诊断工单' });
    await panel.scrollIntoViewIfNeeded();
    await expect(panel.getByText('五张低压故障练习工单')).toBeVisible();
    await expect(panel.getByText('D2_LAMP_VARIATION_V1')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

    await panel.getByRole('button', { name: /记录：熔断器输出端/ }).click();
    await panel.getByRole('button', { name: /记录：继电器负载输出端/ }).click();
    await panel.getByRole('button', { name: /记录：灯泡搭铁端带载压降/ }).click();
    await panel.getByRole('button', { name: '灯泡搭铁开路／接触不良' }).click();
    await panel.getByRole('button', { name: '修复搭铁端并防腐紧固' }).click();
    await panel.getByLabel('近光灯正常点亮').check();
    await panel.getByLabel('远光灯正常切换').check();
    await panel.getByRole('button', { name: '提交功能复测' }).click();
    await expect(panel.getByText('本次练习流程已完成')).toBeVisible();
  });
}

test('Batch D starter workorder blocks measurement until safe state is confirmed', async ({ page }) => {
  await login(page, 'student');
  await page.getByRole('button', { name: '低压故障练习工单' }).click();
  const panel = page.getByRole('region', { name: 'D批次低压系统诊断工单' });
  await panel.getByRole('button', { name: /WO-D4-STARTER/ }).click();
  const firstMeasurement = panel.getByRole('button', { name: /记录：蓄电池静态电压/ });
  await expect(firstMeasurement).toBeDisabled();
  await panel.getByLabel('已确认 P/N 挡（或离合许可）及驻车制动').check();
  await expect(firstMeasurement).toBeEnabled();
});
