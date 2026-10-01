import { expect, test } from '@playwright/test';
import { login } from './helpers';
import fs from 'node:fs';
import path from 'node:path';

test('B02 Step 5 spotlight mod risk assessment and decision verification is usable at 390px and 1366px with screenshot evidence', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page, 'teacher');
  await expect(page.getByRole('heading', { name: '任教班级学情与教学评价' })).toBeVisible();

  const assetsDir = path.resolve(process.cwd(), 'docs/verification/assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/?level=B02');

    // 验证关卡加载
    await expect(page.getByRole('heading', { level: 1, name: /B02/i })).toBeVisible();

    // 步骤 1：串联分压 -> 闭合开关 -> 拧下灯泡1 -> 进入下一步
    await page.getByRole('button', { name: /闭合开关/i }).click();
    await page.getByRole('button', { name: /拧下灯泡1/i }).click();
    const nextToStep2Btn = page.getByRole('button', { name: /进入下一步/i });
    await expect(nextToStep2Btn).toBeVisible();
    await nextToStep2Btn.click();

    // 步骤 2：并联独立供电 -> 拆卸灯泡1 -> 进入下一步
    await page.getByRole('button', { name: /拆卸灯泡1/i }).click();
    const nextToStep3Btn = page.getByRole('button', { name: /进入下一步/i });
    await expect(nextToStep3Btn).toBeVisible();
    await nextToStep3Btn.click();

    // 步骤 3：混联计算与旁路
    const reqInput = page.getByLabel(/1\. 总等效电阻 Req/i);
    const itotalInput = page.getByLabel(/2\. 总回路电流 Itotal/i);
    const uparallelInput = page.getByLabel(/3\. 并联节点电压 Uparallel/i);
    const p1Input = page.getByLabel(/4\. 电阻 R1 消耗功率 P1/i);
    const p2Input = page.getByLabel(/5\. 电阻 R2 消耗功率 P2/i);
    const p3Input = page.getByLabel(/6\. 串联电阻 R3 功率 P3/i);
    const powerRatioInput = page.getByLabel(/7\. 功率分配比值 P1 \/ P2/i);

    // 1. 填写算例 A 并验证
    await reqInput.fill('6');
    await itotalInput.fill('2');
    await uparallelInput.fill('8');
    await p1Input.fill('10.67');
    await p2Input.fill('5.33');
    await p3Input.fill('8');
    await powerRatioInput.fill('2');
    await page.getByRole('button', { name: /验证【算例 A】计算/i }).click();
    await expect(page.getByText(/算例 A 核算完全正确/i)).toBeVisible();

    // 2. 切换并填写算例 B 并验证
    await page.getByRole('button', { name: /算例 B/i }).click();
    await reqInput.fill('8');
    await itotalInput.fill('1.5');
    await uparallelInput.fill('6');
    await p1Input.fill('3');
    await p2Input.fill('6');
    await p3Input.fill('9');
    await powerRatioInput.fill('0.5');
    await page.getByRole('button', { name: /验证【算例 B】计算/i }).click();
    await expect(page.getByText(/算例 B 核算完全正确/i)).toBeVisible();

    // 3. 旁路实验
    const bypassSimBtn = page.getByRole('button', { name: /教学仿真：短接 A–B 节点/i });
    await bypassSimBtn.click();
    await page.getByLabel(/并联组两端电压为零（R1 与 R2 被旁路），R3 仍串联限流，总电流增至 6A/i).click();
    await page.getByRole('button', { name: /验证旁路判断/i }).click();
    await expect(page.getByText(/判断完全正确！短路导线将 A–B 等电位跨接/i)).toBeVisible();

    // 4. 电气节点辨析工单
    await page.getByLabel(/A\. 说法错误：串联与并联的物理本质由“电气节点”决定/i).click();

    // 5. 提交整步工单并进入步骤 4
    const submitBtn3 = page.getByRole('button', { name: '提交混联分析工单' });
    await expect(submitBtn3).toBeEnabled();
    await submitBtn3.click();

    const nextToStep4Btn = page.getByRole('button', { name: /进入步骤 4：加装雾灯组推算/i });
    await expect(nextToStep4Btn).toBeVisible();
    await nextToStep4Btn.click();

    // 步骤 4：雾灯推算
    await expect(page.getByText('加装并联雾灯组等效阻值与总电流推算 · 独立盲测工单')).toBeVisible();
    await page.getByLabel(/A\. 总等效电阻 1\.2 Ω，总干路电流 10\.0 A/i).click();
    await page.getByRole('button', { name: /提交加装并联定量计算工单/i }).click();
    await expect(page.getByText(/推算完全精准！并联等效电阻计算/i)).toBeVisible();

    const nextToStep5Btn = page.getByRole('button', { name: /进入下一步/i });
    await expect(nextToStep5Btn).toBeVisible();
    await nextToStep5Btn.click();

    // 确认已真实进入步骤 5
    const s5Title = page.getByText('加装射灯熔断器熔断风险评估与处置决策', { exact: true });
    await expect(s5Title).toBeVisible();
    await expect(page.getByText('教学工况与负荷估算')).toBeVisible();

    // 响应式无横向溢出断言
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

    // 字号断言 >= 14px (允许亚像素渲染 13.9px)
    const optSpans = page.locator('label:has(input[name="step5_opt"]) span');
    const optSpanCount = await optSpans.count();
    expect(optSpanCount).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < optSpanCount; i++) {
      const fontSize = await optSpans.nth(i).evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
      expect(fontSize).toBeGreaterThanOrEqual(13.9);
    }

    if (viewport.width === 1366) {
      // 桌面题设截图存证
      await s5Title.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'b02-c5-desktop-prompt.png') });
    }

    // 错误选择测试：选择 OPT_B（换 40A 熔断器）
    const optB = page.getByLabel(/B\.\s*先把15A熔断器换为40A/i);
    await optB.click();
    const submitBtn5 = page.getByRole('button', { name: /提交改装安全整改工单/i });
    await submitBtn5.click();

    const errorFeedback = page.getByText(/危险方案：未经核对回路与保护配合直接换插 40A 熔断器/i);
    await expect(errorFeedback).toBeVisible();

    if (viewport.width === 390) {
      // 手机端错误反馈截图存证
      await errorFeedback.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'b02-c5-mobile-error.png') });
    }

    // 改选为 OPT_A：旧反馈清除
    const optA = page.getByLabel(/A\.\s*停用当前接法，先核对车型与灯具资料及回路保护配合/i);
    await optA.click();
    await expect(errorFeedback).not.toBeVisible();

    // 提交正确选项 OPT_A
    await submitBtn5.click();

    const successFeedback = page.getByText(/决策完全符合专业规范！/i);
    await expect(successFeedback).toBeVisible();
    await expect(page.getByText('决策工单已提交锁定')).toBeVisible();

    if (viewport.width === 390) {
      // 手机端成功反馈与工单锁定截图存证
      await successFeedback.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'b02-c5-mobile-success.png') });
    }

    // 验证顶栏出现通关报告按钮
    const reportBtn = page.getByRole('button', { name: /查看通关报告/i });
    await expect(reportBtn).toBeVisible();

    // 验证整关重新开始后回到步骤 1
    const restartBtn = page.getByRole('button', { name: '重新开始' });
    await restartBtn.click();
    await expect(page.getByText(/阶段 1 \/ 5 · 串联负载分压暗淡与相互制约缺陷验证/i)).toBeVisible();
  }
});
