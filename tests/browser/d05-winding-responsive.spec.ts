import { expect, test } from '@playwright/test';
import { login } from './helpers';
import fs from 'node:fs';
import path from 'node:path';

test('D05 Step 1 transformer winding inspection is fully operable and responsive at 1366px and 390px with screenshots', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await login(page, 'teacher');
  await expect(page.getByRole('heading', { name: '任教班级学情与教学评价' })).toBeVisible();

  const assetsDir = path.resolve(process.cwd(), 'docs/verification/assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/?level=D05');

    // 1. 验证关卡加载与步骤 1 标题
    await expect(page.getByRole('heading', { level: 1, name: /D05/i })).toBeVisible();
    const s1Title = page.getByText(/实训步骤 1：变压器铁芯结构、交变磁通与断电绕组初检/i);
    await expect(s1Title).toBeVisible();

    // 2. 响应式无横向溢出断言
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

    // 3. 检查步骤 1 看板关键字号真实浏览器 computed font-size >= 13.9px
    const boardSpans = page.locator('[data-testid="d05-winding-board"] span');
    const spanCount = await boardSpans.count();
    expect(spanCount).toBeGreaterThan(0);
    for (let i = 0; i < spanCount; i++) {
      const fontSize = await boardSpans.nth(i).evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
      expect(fontSize).toBeGreaterThanOrEqual(13.9);
    }

    // 初始状态截图（测量区上部：变压器仿真与万用表仪表）
    await page.evaluate(() => window.scrollTo(0, 0));
    if (viewport.width === 1366) {
      await page.screenshot({ path: path.join(assetsDir, 'd05-c3-1366-top.png') });
    } else {
      await page.screenshot({ path: path.join(assetsDir, 'd05-c3-390-top.png') });
      // 手机端补充截取万用表与挡位操作区
      const meterEl = page.locator('div:has-text("工业级万用表 (VC890D)")').last();
      await meterEl.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'd05-c3-390-meter.png') });
    }

    // 4. 四步安全前置动作：初级断电 -> 隔离外部接线 -> 确认台架无电压 -> 切换200Ω挡 -> 表笔自检
    await page.getByRole('button', { name: /初级输入交流激励/i }).click(); // 断电
    await page.getByRole('button', { name: /隔离外部接线/i }).click(); // 隔离
    await page.getByRole('button', { name: /确认台架无电压/i }).click(); // 验电
    await page.getByRole('button', { name: /Ω 200Ω/i }).click(); // 200Ω 挡
    await page.getByRole('button', { name: /表笔短接自检/i }).click(); // 自检

    const measureBtn = page.getByRole('button', { name: /执行测量并记录/i });

    // 5. 测量样本 A (4对: 1-2, 3-4, 1-3, 1-K) 并诊断
    await page.getByRole('button', { name: /端子 1 – 2/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 3 – 4/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 1 – 3/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 1 – 铁芯 K/i }).click();
    await measureBtn.click();

    // 提交样本 A 诊断：两绕组通路正常 (未见断路)
    await page.getByLabel(/两绕组通路正常 \(未见断路\)/i).click();
    await page.getByRole('button', { name: /提交【样本 A】诊断工单/i }).click();

    // 6. 切换到样本 B (5对: 1-2低阻, 1-2高阻复核, 3-4, 1-3, 1-K) 并诊断
    await page.getByRole('button', { name: /^样本 B/i }).click();
    // 验证切换样本后液晶屏立即撤销旧读数显示“未测量”
    await expect(page.getByTestId('multimeter-lcd')).toHaveText('未测量');

    await page.getByRole('button', { name: /端子 1 – 2/i }).click();
    await measureBtn.click(); // 200Ω 测出 OL
    await page.getByRole('button', { name: /Ω 200kΩ/i }).click();
    await measureBtn.click(); // 200kΩ 复核仍为 OL
    await page.getByRole('button', { name: /Ω 200Ω/i }).click(); // 换回 200Ω
    await page.getByRole('button', { name: /端子 3 – 4/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 1 – 3/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 1 – 铁芯 K/i }).click();
    await measureBtn.click();

    // 提交样本 B 诊断：初级疑似断路
    await page.getByLabel(/初级疑似断路/i).click();
    await page.getByRole('button', { name: /提交【样本 B】诊断工单/i }).click();

    // 7. 切换到样本 C (4对: 1-2, 3-4, 1-3, 1-K) 并诊断
    await page.getByRole('button', { name: /^样本 C/i }).click();
    await page.getByRole('button', { name: /端子 1 – 2/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 3 – 4/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 1 – 3/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 1 – 铁芯 K/i }).click();
    await measureBtn.click();

    // 提交样本 C 诊断：两绕组低阻 (需结合基准复核)
    await page.getByLabel(/两绕组低阻 \(需结合基准复核\)/i).click();
    await page.getByRole('button', { name: /提交【样本 C】诊断工单/i }).click();

    // 8. 提交共享边界题
    await page.getByLabel(/1–3与1–K在普通万用表下显示OL，仅表示在当前量程\/测试电压下未检出导通/i).click();
    await page.getByRole('button', { name: /提交边界辨析/i }).click();

    // 9. 真实浏览器验证认知题防试探：先选错误项 B 尝试提交，断言拦截与提示，再改选正确项 A
    await page.getByLabel(/变压器绝缘层内部有微小的无线电发射天线/i).click();
    await expect(page.getByText(/交变磁通耦合认知题 \(已选择\)/i)).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /提交步骤1工单/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 验证错误拦截提示且不能进入步骤 2
    await expect(page.getByText(/交变磁通原理认知判断错误/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /完成步骤1，进入步骤2/i })).not.toBeVisible();

    // 改选正确项 A
    await page.getByLabel(/初级交流电在闭合铁芯中激发出交变磁通/i).click();

    // 确认 13 条记录与 6 项门槛全部达成
    await expect(page.getByText(/总测量记录：/i)).toContainText('13 / 13');
    await expect(page.getByText(/6 \/ 6 达成/i)).toBeVisible();

    // 截取下部记录与诊断区域
    if (viewport.width === 1366) {
      await submitBtn.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'd05-c3-1366-bottom.png') });
    } else {
      // 手机端先截取测量数据表与样本诊断
      const recordsTable = page.locator('table').last();
      await recordsTable.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'd05-c3-390-records.png') });

      // 手机端再截取门槛清单与提交锁定区
      await submitBtn.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'd05-c3-390-bottom.png') });
    }

    await submitBtn.click();

    // 验证锁定提示与进入步骤 2 按钮
    await expect(page.getByText(/步骤 1 绕组初检与交变磁通工单已锁定提交！/i)).toBeVisible();
    const nextToStep2Btn = page.getByRole('button', { name: /完成步骤1，进入步骤2/i });
    await expect(nextToStep2Btn).toBeVisible();

    // 10. 点击推进到步骤 2，验证进入变压比与变流比实验
    await nextToStep2Btn.click();
    await expect(page.getByText('步骤2: 变压比与变流比')).toBeVisible();

    // 11. 验证重新开始：点击底部“重新开始”，确认重置并归零
    const restartBtn = page.getByRole('button', { name: /重新开始/i });
    await restartBtn.click();
    await expect(page.getByText(/实训步骤 1：变压器铁芯结构、交变磁通与断电绕组初检/i)).toBeVisible();
    await expect(page.getByText(/总测量记录：/i)).toContainText('0 / 13');
    await expect(page.getByText(/0 \/ 6 达成/i)).toBeVisible();

    // 保存全页备份
    const testInfoPath = testInfo.outputPath(`d05-c3-${viewport.width}.png`);
    await page.screenshot({ path: testInfoPath, fullPage: true });
  }
});
