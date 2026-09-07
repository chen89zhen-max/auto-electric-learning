import { expect, test } from '@playwright/test';
import { login } from './helpers';

async function openTeacherPreview(page: import('@playwright/test').Page, levelId: string) {
  await login(page, 'teacher');
  await page.goto(`/?level=${levelId}`);
}

test.describe('P5 observation-before-answer guards', () => {
  test('D02 blocks H-bridge submission until a real up/down observation is made', async ({ page }) => {
    await openTeacherPreview(page, 'D02');
    await page.getByRole('button', { name: /向右 \(手心向上/ }).click();
    await page.getByRole('button', { name: '提交受力方向判别' }).click();
    await page.getByRole('button', { name: /完全正确！进入换向器/ }).click();
    await page.getByRole('button', { name: /当线圈刚转过平衡位置/ }).click();
    await page.getByRole('button', { name: '提交换向原理分析' }).click();
    await page.getByRole('button', { name: /分析透彻！进入双继电器 H 桥/ }).click();
    await page.getByRole('button', { name: /通过切换继电器触点/ }).click();
    const submit = page.getByRole('button', { name: '请先在左侧操作升窗/降窗按钮' });
    await expect(submit).toBeDisabled();
    await expect(page.getByRole('button', { name: /H 桥极性分析正确/ })).toHaveCount(0);
  });

  test('D03 blocks AC effective-value submission until DCV/ACV is compared', async ({ page }) => {
    await openTeacherPreview(page, 'D03');
    await page.getByRole('button', { name: /垂直纸面向外/ }).click();
    await page.getByRole('button', { name: '提交感应电流方向判定' }).click();
    await page.getByRole('button', { name: /完全正确！进入正弦交流电/ }).click();
    await page.getByRole('button', { name: /交流电正负半周对称抵消/ }).click();
    const submit = page.getByRole('button', { name: '请先在左下方对比 DCV 与 ACV 挡位显示' });
    await expect(submit).toBeDisabled();
    await expect(page.getByRole('button', { name: /深刻破除仪表误区/ })).toHaveCount(0);
  });

  test('D04 keeps the answer and next-step reveal blocked before its spark observation', async ({ page }) => {
    await openTeacherPreview(page, 'D04');
    await page.getByRole('button', { name: /线圈自感阻止电流突变/ }).click();
    const submit = page.getByRole('button', { name: '请先在左侧断开开关观察打火' });
    await expect(submit).toBeDisabled();
    await expect(page.getByRole('button', { name: /深刻洞察！进入续流二极管/ })).toHaveCount(0);
  });
});

test('C01 loaded-lamp operation changes the rendered voltage state', async ({ page }) => {
  await openTeacherPreview(page, 'C01');
  const lamp = page.getByRole('button', { name: '插上车灯 (带载 10.9V 发黄)' });
  await lamp.click();
  await expect(lamp).toHaveClass(/bg-amber-600/);
});

test('C03 performs a real Wiggle Test and exposes its transient voltage evidence', async ({ page }) => {
  await openTeacherPreview(page, 'C03');
  await page.getByRole('button', { name: /假说 A：插头插针/ }).click();
  await page.getByRole('button', { name: '提交初检问诊单' }).click();
  await page.getByRole('button', { name: /进入步骤 2：自主排故策略/ }).click();
  await page.getByRole('button', { name: /策略 A：带载通电状态下/ }).click();
  await page.getByRole('button', { name: '提交排故策略方案' }).click();
  await page.getByRole('button', { name: /进入步骤 3：动态无损排查执行/ }).click();
  await page.getByRole('button', { name: /模拟路面颠簸·线束摇晃测试/ }).click();
  await expect(page.getByText(/瞬态晃动跳变为0V|插针松旷脱落失电/)).toBeVisible();
});

for (const levelId of ['D01', 'D05', 'E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07']) {
  test(`${levelId} opens and closes its rendered work order`, async ({ page }) => {
    await openTeacherPreview(page, levelId);
    const workOrder = page.getByTitle('查看实训工单与步骤指南');
    await workOrder.click();
    await expect(page.getByText(/实训工单/).last()).toBeVisible();
    await page.keyboard.press('Escape');
  });
}
