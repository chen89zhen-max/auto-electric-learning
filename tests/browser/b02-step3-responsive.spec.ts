import { expect, test } from '@playwright/test';
import { login } from './helpers';
import fs from 'node:fs';
import path from 'node:path';

test('B02 Step 3 compound circuit calculation and bypass verification is usable at 390px and 1366px with screenshot evidence', async ({ page }, testInfo) => {
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

    // 确认已真实进入步骤 3
    const s3Title = page.getByText('混联电路定量计算与短路旁路分析');
    await expect(s3Title).toBeVisible();

    // 响应式无横向溢出断言
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

    // 初始状态截图（计算区上部）
    await s3Title.scrollIntoViewIfNeeded();
    if (viewport.width === 1366) {
      await page.screenshot({ path: path.join(assetsDir, 'b02-c2-1366-top.png') });
    } else {
      await page.screenshot({ path: path.join(assetsDir, 'b02-c2-390-top.png') });
    }

    // 检查步骤 3 看板的关键字号在真实浏览器下 >= 14px
    const boardSpans = page.locator('[data-testid="b02-circuit-board"] span');
    const spanCount = await boardSpans.count();
    expect(spanCount).toBeGreaterThan(0);
    for (let i = 0; i < spanCount; i++) {
      const fontSize = await boardSpans.nth(i).evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
      expect(fontSize).toBeGreaterThanOrEqual(13.9);
    }

    const reqInput = page.getByLabel(/1\. 总等效电阻 Req/i);
    const itotalInput = page.getByLabel(/2\. 总回路电流 Itotal/i);
    const uparallelInput = page.getByLabel(/3\. 并联节点电压 Uparallel/i);
    const p1Input = page.getByLabel(/4\. 电阻 R1 消耗功率 P1/i);
    const p2Input = page.getByLabel(/5\. 电阻 R2 消耗功率 P2/i);
    const p3Input = page.getByLabel(/6\. 串联电阻 R3 功率 P3/i);
    const powerRatioInput = page.getByLabel(/7\. 功率分配比值 P1 \/ P2/i);

    // 验证占位符中性，不透露答案
    await expect(reqInput).toHaveAttribute('placeholder', '请输入计算结果');

    // 截取输入区域（特别确保手机端覆盖全部 7 项输入表单）
    if (viewport.width === 390) {
      // 上半张：滚动到第 1 项，显示第 1~4 项及第 5 项标题
      await reqInput.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'b02-c2-390-inputs.png') });

      // 下半张：滚动到第 7 项，显示第 5~7 项及验证按钮
      await powerRatioInput.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'b02-c2-390-inputs-part2.png') });

      // 元素级截图：完整捕捉包含全部 7 项表单的输入容器卡片
      const formCard = page.locator('div:has(> div > span:has-text("切换参数算例："))').first();
      await formCard.screenshot({ path: path.join(assetsDir, 'b02-c2-390-inputs-full.png') });
    }

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

    // 3. 旁路实验：从算例 B 点击仿真，触发自动切回算例 A 图示与数据
    const bypassSimBtn = page.getByRole('button', { name: /教学仿真：短接 A–B 节点/i });
    await bypassSimBtn.click();
    await page.getByLabel(/并联组两端电压为零（R1 与 R2 被旁路），R3 仍串联限流，总电流增至 6A/i).click();
    await page.getByRole('button', { name: /验证旁路判断/i }).click();
    await expect(page.getByText(/判断完全正确！短路导线将 A–B 等电位跨接/i)).toBeVisible();

    // 截取旁路对照卡片
    const bypassCard = page.getByText(/算例 A 旁路实验（基于算例 A 拓扑）/i);
    await bypassCard.scrollIntoViewIfNeeded();
    if (viewport.width === 1366) {
      await page.screenshot({ path: path.join(assetsDir, 'b02-c2-1366-bypass.png') });
    } else {
      await page.screenshot({ path: path.join(assetsDir, 'b02-c2-390-bypass.png') });
    }

    // 4. 电气节点本质辨析工单：勾选正确项 A
    await page.getByLabel(/A\. 说法错误：串联与并联的物理本质由“电气节点”决定/i).click();

    // 5. 提交整步工单
    const submitBtn = page.getByRole('button', { name: '提交混联分析工单' });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 验证锁定提示与进入步骤 4 按钮
    await expect(page.getByText('（已提交工单，控件锁定）')).toBeVisible();
    const nextToStep4Btn = page.getByRole('button', { name: /进入步骤 4：加装雾灯组推算/i });
    await expect(nextToStep4Btn).toBeVisible();

    // 截图存证（完成/旁路区下部）
    await nextToStep4Btn.scrollIntoViewIfNeeded();
    if (viewport.width === 1366) {
      await page.screenshot({ path: path.join(assetsDir, 'b02-c2-1366-bottom.png') });
    } else {
      await page.screenshot({ path: path.join(assetsDir, 'b02-c2-390-bottom.png') });
    }

    // 保存全页备份
    const testInfoPath = testInfo.outputPath(`b02-c2-${viewport.width}.png`);
    await page.screenshot({ path: testInfoPath, fullPage: true });

    // 6. 实际进入步骤 4 并完成回归验证（选择 1.2Ω/10A 并通过）
    await nextToStep4Btn.click();
    await expect(page.getByText('加装并联雾灯组等效阻值与总电流推算 · 独立盲测工单')).toBeVisible();
    await page.getByLabel(/A\. 总等效电阻 1\.2 Ω，总干路电流 10\.0 A/i).click();
    await page.getByRole('button', { name: /提交加装并联定量计算工单/i }).click();
    await expect(page.getByText(/推算完全精准！并联等效电阻计算/i)).toBeVisible();

    // 7. 验证点击底部栏“重新开始”后步骤 3 门槛归零
    const restartBtn = page.getByRole('button', { name: '重新开始' });
    await restartBtn.click();
    await expect(page.getByText(/阶段 1 \/ 5 · 串联负载分压暗淡与相互制约缺陷验证/i)).toBeVisible();

    // 再次进入步骤 3
    await page.getByRole('button', { name: /闭合开关/i }).click();
    await page.getByRole('button', { name: /拧下灯泡1/i }).click();
    await page.getByRole('button', { name: /进入下一步/i }).click();
    await page.getByRole('button', { name: /拆卸灯泡1/i }).click();
    await page.getByRole('button', { name: /进入下一步/i }).click();

    // 确认门槛彻底清空为 0 / 4
    await expect(page.getByText(/完成进度: 0 \/ 4/i)).toBeVisible();
    await expect(page.getByLabel(/1\. 总等效电阻 Req/i)).toHaveValue('');
  }
});
