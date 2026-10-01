import { expect, test, type Locator } from '@playwright/test';
import { login } from './helpers';
import fs from 'node:fs';
import path from 'node:path';

test('E03 Step 3 filter capacitor guard and responsive verification across desktop and mobile', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page, 'teacher');
  await expect(page.getByRole('heading', { name: '任教班级学情与教学评价' })).toBeVisible();

  const assetsDir = path.resolve(process.cwd(), 'docs/verification/assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  // 1. 桌面端视口 (1366x768): 验证未接滤波电容时禁用提交，显示提示，截取桌面图
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/?level=E03');
  await expect(page.getByRole('heading', { level: 1, name: /E03 把交流变成直流/ })).toBeVisible();

  // 步骤 1: 推进电角度并完成三相独立验证与单相选项
  await page.getByRole('button', { name: '推进三相电角度 60°' }).click();
  await page.getByRole('button', { name: '推进三相电角度 60°' }).click();
  await page.getByLabel('独立判断：U=8V、V=-3V、W=-5V时的导通相对').selectOption('U-W');
  await page.getByLabel('三相整流每周期脉波数').selectOption('6');
  await page.getByRole('button', { name: '验证三相整流' }).click();
  await expect(page.getByText('三相独立验证通过。')).toBeVisible();

  await page.getByText(/桥式整流将正负半周全部利用/).click();
  await page.getByRole('button', { name: '提交认知判定' }).click();
  const toStep2Btn = page.getByRole('button', { name: /进入步骤 2：/ });
  await expect(toStep2Btn).toBeVisible();
  await toStep2Btn.click();

  // 步骤 2: 拨动二极管档，选择选项A，提交进入步骤 3
  await page.getByRole('button', { name: 'DIODE', exact: true }).click();
  await page.getByText(/其中某只二极管正反向测量均为 0.00V/).click();
  await page.getByRole('button', { name: '提交检测结论' }).click();
  const toStep3Btn = page.getByRole('button', { name: /进入步骤 3：/ });
  await expect(toStep3Btn).toBeVisible();
  await toStep3Btn.click();

  const assertMinFontSize = async (locator: Locator, minPx = 13.9) => {
    const fontSizeStr = await locator.evaluate((el: Element) => window.getComputedStyle(el).fontSize);
    const fontSize = parseFloat(fontSizeStr);
    expect(fontSize).toBeGreaterThanOrEqual(minPx);
  };

  // 步骤 3 桌面端：未接电容，选择计算项 A 与调压机制
  const optADesktop = page.getByText(/Uo ≈ √2 × 12 −/);
  await optADesktop.click();
  await page.getByLabel('汽车充电电压的控制机制').selectOption('FIELD_REGULATION');

  // 验证提交按钮禁用，前置提示可见，并核验证查关键正文、计算选项与警告提示字号下限 >= 14px (13.9px 浮点容差)
  const promptDesktop = page.getByText(/单相桥式台架12Vrms、50Hz/);
  await assertMinFontSize(promptDesktop);
  await assertMinFontSize(optADesktop);

  const submitBtnDesktop = page.getByRole('button', { name: '提交计算结论' });
  await expect(submitBtnDesktop).toBeDisabled();
  const blockedPrompt = page.getByText(/前置实验未完成：请先在左侧点击接入滤波电容并观察平滑波形与参数变化。/);
  await expect(blockedPrompt).toBeVisible();
  await assertMinFontSize(blockedPrompt);
  await submitBtnDesktop.scrollIntoViewIfNeeded();

  // 截取桌面端未接电容拦截图
  await page.screenshot({
    path: path.join(assetsDir, 'e03-c6-desktop-no-cap-blocked.png'),
    fullPage: false,
  });

  // 2. 移动端视口 (390x844): 切换视口并完成步骤 3
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  // 点击接入滤波电容
  const capBtn = page.getByRole('button', { name: '未接滤波电容 (脉动波形)' });
  await capBtn.scrollIntoViewIfNeeded();
  await capBtn.click();
  const connectedCapBtn = page.getByRole('button', { name: /滤波电容已接入/ });
  await expect(connectedCapBtn).toBeVisible();

  // 提示消失，提交按钮启用
  await expect(blockedPrompt).not.toBeVisible();
  const submitBtnMobile = page.getByRole('button', { name: '提交计算结论' });
  await submitBtnMobile.scrollIntoViewIfNeeded();
  await expect(submitBtnMobile).toBeEnabled();

  // 提交并验证成功
  await submitBtnMobile.click();
  const successBanner = page.getByText('验证通过：15.47V仅是本题台架小纹波近似结果，不能推出车辆统一充电电压。');
  await expect(successBanner).toBeVisible();
  await assertMinFontSize(successBanner);

  const toStep4Btn = page.getByRole('button', { name: /进入步骤 4：/ });
  await expect(toStep4Btn).toBeVisible();
  await assertMinFontSize(toStep4Btn);

  // 核心阻断守卫回归：成功后电容按钮必须处于禁用锁定状态，且参数保持已滤波状态
  await expect(connectedCapBtn).toBeDisabled();
  await connectedCapBtn.click({ force: true }).catch(() => {});
  await expect(page.getByRole('button', { name: /未接滤波电容/ })).not.toBeVisible();
  await expect(page.getByText('15.47 V', { exact: true })).toBeVisible();
  await expect(page.getByText('0.20 V', { exact: true })).toBeVisible();

  // 确保无横向溢出
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  // 截取移动端成功图 (聚焦展示成功卡片、进入步骤4按钮及锁定状态)
  await toStep4Btn.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(assetsDir, 'e03-c6-mobile-cap-success.png'),
    fullPage: false,
  });
});
