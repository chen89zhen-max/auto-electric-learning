import { expect, test } from '@playwright/test';
import { login } from './helpers';
import fs from 'node:fs';
import path from 'node:path';

test('E04 Step 3 three-state interactive calculation is usable at 390px and 1366px with screenshot evidence', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await login(page, 'teacher');
  await expect(page.getByRole('heading', { name: '任教班级学情与教学评价' })).toBeVisible();

  const assetsDir = path.resolve(process.cwd(), 'docs/verification/assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/?level=E04');

    // 验证关卡加载
    await expect(page.getByRole('heading', { level: 1, name: /E04\s+用小信号控制负载/i })).toBeVisible();

    // 步骤 1：小控大原理认知 -> 答题并推进
    await page.getByRole('button', { name: /以微弱的单片机基极电流/i }).click();
    await page.getByRole('button', { name: '提交认知判定' }).click();
    await page.getByRole('button', { name: /进入步骤 2：引脚识别与 β 测量/i }).click();

    // 步骤 2：万用表识别与数据手册标准 -> 拨挡、答题并推进
    await page.getByRole('button', { name: 'DIODE', exact: true }).click();
    await page.getByRole('button', { name: /查阅对应原厂数据手册与封装引脚定义/i }).click();
    await page.getByRole('button', { name: '提交检测结论' }).click();
    await page.getByRole('button', { name: /进入步骤 3：三态定量切换计算/i }).click();

    // 确认已真实进入步骤 3
    const s3Title = page.getByText('工作状态分析仪：调节偏置实测三态');
    await expect(s3Title).toBeVisible();

    // 响应式无横向溢出断言
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

    const voltageInput = page.getByLabel(/基极输入电压 Ub:/i);
    const resistorInput = page.getByLabel(/基极限流电阻 Rb:/i);
    await expect(voltageInput).toBeVisible();
    await expect(resistorInput).toBeVisible();

    const cutoffBtn = page.getByRole('button', { name: /截止区 \(Cutoff\)/i });
    const activeBtn = page.getByRole('button', { name: /线性放大区 \(Active\)/i });
    const satBtn = page.getByRole('button', { name: /深度饱和区 \(Saturation\)/i });
    const verifyRecordBtn = page.getByRole('button', { name: '验证并记录当前状态' });
    const submitOrderBtn = page.getByRole('button', { name: /须先录齐三态 \(0\/3\)/i });

    await expect(cutoffBtn).toBeVisible();
    await expect(activeBtn).toBeVisible();
    await expect(satBtn).toBeVisible();
    await expect(verifyRecordBtn).toBeVisible();
    await expect(submitOrderBtn).toBeVisible();
    await expect(submitOrderBtn).toBeDisabled();

    // 若为 1366 桌面端，在步骤 3 初始状态截取上半部（万用表、偏置滑块与读数看板）
    if (viewport.width === 1366) {
      await s3Title.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'e04-step3-1366-top.png') });
    }

    const setRangeValue = async (locator: typeof voltageInput, val: string) => {
      await locator.evaluate((el: HTMLInputElement, value: string) => {
        const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (descriptor?.set) {
          descriptor.set.call(el, value);
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, val);
    };

    // 1. 记录饱和态 (默认 Ub=5.0V, Rb=2.2k)
    await satBtn.click();
    await verifyRecordBtn.click();
    await expect(page.getByText(/当前条件.*处于【深度饱和区/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /须先录齐三态 \(1\/3\)/i })).toBeVisible();

    // 2. 调至截止态 (Ub=0.5V)
    await setRangeValue(voltageInput, '0.5');
    // 滑块变化后，旧验证提示清除
    await expect(page.getByText(/当前条件.*处于【深度饱和区/i)).toHaveCount(0);

    await cutoffBtn.click();
    await verifyRecordBtn.click();
    await expect(page.getByText(/当前条件.*处于【截止区/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /须先录齐三态 \(2\/3\)/i })).toBeVisible();

    // 3. 调至线性放大态 (Ub=1.0V, Rb=30k)
    await setRangeValue(voltageInput, '1.0');
    await setRangeValue(resistorInput, '30000');

    await activeBtn.click();
    await verifyRecordBtn.click();
    await expect(page.getByText(/当前条件.*处于【线性放大区/i)).toBeVisible();

    // 3/3 齐备，工单提交按钮变为 "提交设计结论"
    const readySubmitBtn = page.getByRole('button', { name: '提交设计结论' });
    await expect(readySubmitBtn).toBeVisible();

    // 选择工单正确选项 A
    await page.getByRole('button', { name: /Uce ≤ 0.3V/i }).click();
    await expect(readySubmitBtn).toBeEnabled();

    // 提交工单
    await readySubmitBtn.click();

    // 验证锁定提示与重新测算按钮
    await expect(page.getByText('（已提交工单，控件锁定）')).toBeVisible();
    const recomputeBtn = page.getByRole('button', { name: '重新测算修改' });
    await expect(recomputeBtn).toBeVisible();

    // 截图存证：保存至 Playwright testInfo 路径和 docs/verification/assets
    const testInfoPath = testInfo.outputPath(`e04-step3-${viewport.width}.png`);
    await page.screenshot({ path: testInfoPath, fullPage: true });

    if (viewport.width === 1366) {
      await recomputeBtn.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'e04-step3-1366-bottom.png') });
      await page.screenshot({ path: path.join(assetsDir, 'e04-step3-1366.png') });
    } else {
      await page.screenshot({ path: path.join(assetsDir, 'e04-step3-390.png'), fullPage: true });
    }

    // 验证重新测算修改可解锁
    await recomputeBtn.click();
    await expect(page.getByText('（已提交工单，控件锁定）')).toHaveCount(0);

    // 验证底部栏重新开始重置整关至步骤 1
    const restartBtn = page.getByRole('button', { name: '重新开始' });
    await restartBtn.click();
    await expect(page.getByRole('heading', { level: 4, name: '认知判定与理论验证' })).toBeVisible();
  }
});
