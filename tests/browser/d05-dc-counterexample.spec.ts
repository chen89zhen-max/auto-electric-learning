import { expect, test } from '@playwright/test';
import { login } from './helpers';
import fs from 'node:fs';
import path from 'node:path';

test('D05 Step 3 DC counterexample is operable, responsive, and verified at 1366px and 390px with screenshots', async ({ page }, testInfo) => {
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
    await expect(page.getByText(/实训步骤 1：变压器铁芯结构、交变磁通与断电绕组初检/i)).toBeVisible();

    // 2. 正常推进步骤 1（四步安全前置 + 13项测量 + 3项诊断 + 边界题 + 认知题）
    await page.getByRole('button', { name: /初级输入交流激励/i }).click(); // 断电
    await page.getByRole('button', { name: /隔离外部接线/i }).click(); // 隔离
    await page.getByRole('button', { name: /确认台架无电压/i }).click(); // 验电
    await page.getByRole('button', { name: /Ω 200Ω/i }).click(); // 200Ω 挡
    await page.getByRole('button', { name: /表笔短接自检/i }).click(); // 自检

    const measureBtn = page.getByRole('button', { name: /执行测量并记录/i });

    // 样本 A
    await page.getByRole('button', { name: /端子 1 – 2/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 3 – 4/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 1 – 3/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 1 – 铁芯 K/i }).click();
    await measureBtn.click();
    await page.getByLabel(/两绕组通路正常 \(未见断路\)/i).click();
    await page.getByRole('button', { name: /提交【样本 A】诊断工单/i }).click();

    // 样本 B (含 200kΩ 复核)
    await page.getByRole('button', { name: /^样本 B/i }).click();
    await page.getByRole('button', { name: /端子 1 – 2/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /Ω 200kΩ/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /Ω 200Ω/i }).click();
    await page.getByRole('button', { name: /端子 3 – 4/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 1 – 3/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 1 – 铁芯 K/i }).click();
    await measureBtn.click();
    await page.getByLabel(/初级疑似断路/i).click();
    await page.getByRole('button', { name: /提交【样本 B】诊断工单/i }).click();

    // 样本 C
    await page.getByRole('button', { name: /^样本 C/i }).click();
    await page.getByRole('button', { name: /端子 1 – 2/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 3 – 4/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 1 – 3/i }).click();
    await measureBtn.click();
    await page.getByRole('button', { name: /端子 1 – 铁芯 K/i }).click();
    await measureBtn.click();
    await page.getByLabel(/两绕组低阻 \(需结合基准复核\)/i).click();
    await page.getByRole('button', { name: /提交【样本 C】诊断工单/i }).click();

    // 边界题
    await page.getByLabel(/1–3与1–K在普通万用表下显示OL，仅表示在当前量程\/测试电压下未检出导通/i).click();
    await page.getByRole('button', { name: /提交边界辨析/i }).click();

    // 认知题并提交步骤 1 工单
    await page.getByLabel(/初级交流电在闭合铁芯中激发出交变磁通/i).click();
    const s1SubmitBtn = page.getByRole('button', { name: /提交步骤1工单/i });
    await s1SubmitBtn.click();

    // 进入步骤 2
    const nextToStep2Btn = page.getByRole('button', { name: /完成步骤1，进入步骤2/i });
    await nextToStep2Btn.click();
    await expect(page.getByText('步骤2: 变压比与变流比')).toBeVisible();

    // 3. 正常推进步骤 2
    await page.getByText(/次级电流\(5A\)远大于初级电流\(0.27A\)/i).click();
    await page.getByRole('button', { name: /提交变比与线径分析/i }).click();
    const nextToStep3Btn = page.getByRole('button', { name: /规律准确！进入恒定直流误接反例分析/i });
    await expect(nextToStep3Btn).toBeVisible();
    await nextToStep3Btn.click();

    // 4. 到达步骤 3：恒定直流误接：暂态与过流风险
    await expect(page.getByText(/步骤3: 恒定直流误接：暂态与过流风险/i)).toBeVisible();

    // 仪表区定性说明检查：无假读数、无旋钮、显示说明
    await expect(page.getByText('定性演示／未进行仪表测量')).toBeVisible();
    await expect(page.getByText('本步不使用仪表')).toBeVisible();

    // 严格防泄露检查 1：未开始观察时，卡片和题目中不得出现 40A 或 40.0A 计算答案
    const step3Card = page.locator('[data-testid="d05-dc-counterexample-card"]');
    await expect(step3Card).toBeVisible();
    await expect(step3Card).not.toContainText(/(?:^|[^\d.])40(?:\.0+)?\s*A\b/i);

    // 严格防泄露检查 2：打开步骤 3 实训工单对话框，检查工单内严禁出现 40A 或 40.0A 答案
    const workOrderBtn = page.getByRole('button', { name: '工单', exact: true });
    await workOrderBtn.click();
    const workOrderDialog = page.getByRole('dialog', { name: /D05 实训任务书/ });
    await expect(workOrderDialog).toBeVisible();
    await expect(workOrderDialog).not.toContainText(/(?:^|[^\d.])40(?:\.0+)?\s*A\b/i);
    // 关闭工单
    await page.getByRole('button', { name: /已查阅，继续实训/ }).click();
    await expect(workOrderDialog).not.toBeVisible();

    // 无横向溢出断言
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

    // 检查核心说明与选项字体 >= 13.9px
    const texts = step3Card.locator('p, span, label, div, strong');
    const textCount = await texts.count();
    for (let i = 0; i < Math.min(textCount, 25); i++) {
      const el = texts.nth(i);
      const isVisible = await el.isVisible();
      if (isVisible) {
        const fsVal = await el.evaluate((node) => parseFloat(window.getComputedStyle(node).fontSize));
        if (fsVal > 0) {
          expect(fsVal).toBeGreaterThanOrEqual(13.9);
        }
      }
    }

    // 桌面端截图 1：未答状态截图
    if (viewport.width === 1366) {
      await step3Card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'd05-c4-1366-unanswered.png') });
    }

    // 5. 观察两阶段：未完成前提交按钮禁用
    const s3SubmitBtn = page.getByRole('button', { name: /提交直流误接分析工单/i });
    await expect(s3SubmitBtn).toBeDisabled();
    await expect(page.getByText(/⚠️ 提交前提：请先在上方完成“接通暂态”与“理想稳态”两阶段观察/i)).toBeVisible();

    // 点击暂态观察
    await page.getByRole('button', { name: /观察恒定直流误接（虚拟演示）/i }).click();
    await expect(page.getByText(/接通暂态：电流与磁通经历变化/i)).toBeVisible();
    await expect(s3SubmitBtn).toBeDisabled();

    // 点击稳态观察
    await page.getByRole('button', { name: /查看理想稳态与风险/i }).click();
    await expect(page.getByText(/已完成两阶段观察（暂态与稳态）/i)).toBeVisible();
    await expect(page.getByText(/⚠️ 提交前提：请先在上方完成“接通暂态”与“理想稳态”两阶段观察/i)).not.toBeVisible();

    // 严格防泄露检查 3：两阶段观察完成但未提交前，卡片和题目严禁泄露 40A 或 40.0A
    await expect(step3Card).not.toContainText(/(?:^|[^\d.])40(?:\.0+)?\s*A\b/i);

    // 6. 错误提交测试：填入错误数据并提交，断言分类报错
    const currentInput = page.locator('#s3-current-input');
    await currentInput.fill('999');
    await page.getByLabel(/整个过程副边始终零电压/i).click();
    await page.getByLabel(/只要发生过流，熔断器就会立即熔断/i).click();
    await page.getByLabel(/电池直接接原边就能持续升压/i).click();

    await expect(s3SubmitBtn).toBeEnabled();
    await s3SubmitBtn.click();

    // 验证错误提示浮现
    const alertBox = page.getByRole('alert');
    await expect(alertBox).toBeVisible();
    await expect(alertBox).toContainText('已记入 1 次计算阶段错误扣分');
    await expect(alertBox).toContainText('电流估算偏差');
    await expect(alertBox).toContainText('暂态与稳态机理判断有误');
    await expect(alertBox).toContainText('保护动作判定不科学');
    await expect(alertBox).toContainText('逆变器原理理解有误');

    // 手机端截图 2：错误反馈截图
    if (viewport.width === 390) {
      await alertBox.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'd05-c4-390-error-feedback.png') });
    }

    // 7. 改正提交测试：修改为正确答案并提交，验证通过与锁定
    await currentInput.fill('40.0');
    // 修改输入应立即清除错误框
    await expect(alertBox).not.toBeVisible();

    await page.getByLabel(/接通时可能有瞬态感应，理想稳态无持续感应输出/i).click();
    await page.getByLabel(/存在过流风险，信息不足以断言熔断时刻/i).click();
    await page.getByLabel(/经开关电路变为适当的时变激励后驱动变压器/i).click();

    await s3SubmitBtn.click();

    // 验证通过卡片与理论推导显示
    await expect(page.getByText(/直流误接机理分析与稳态估算通过！工单已锁定/i)).toBeVisible();
    await expect(page.getByText(/12V ÷ 0.30Ω = 40.0A/i)).toBeVisible();
    // 验证输入控件已禁用锁定
    await expect(currentInput).toBeDisabled();

    // 8. 进入步骤 4 前检查推进按钮并截取完整成功卡片（包含公式、假设与前进按钮）
    const nextToStep4Btn = page.getByRole('button', { name: /进入同名端极性测试/i });
    await expect(nextToStep4Btn).toBeVisible();

    // 手机端截图 3：成功反馈卡单独滚动定位，完整覆盖公式、假设与前进按钮
    if (viewport.width === 390) {
      await nextToStep4Btn.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(assetsDir, 'd05-c4-390-success-feedback.png') });
    }

    await nextToStep4Btn.click();
    await expect(page.getByText(/步骤4: 同名端极性测试/i)).toBeVisible();

    // 9. 验证重新开始生命周期
    const restartBtn = page.getByRole('button', { name: /重新开始/i });
    await restartBtn.click();
    await expect(page.getByText(/实训步骤 1：变压器铁芯结构、交变磁通与断电绕组初检/i)).toBeVisible();
    await expect(page.getByText(/总测量记录：/i)).toContainText('0 / 13');

    // 全页备份截图
    const testInfoPath = testInfo.outputPath(`d05-c4-${viewport.width}.png`);
    await page.screenshot({ path: testInfoPath, fullPage: true });
  }
});
