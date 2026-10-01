import { expect, test } from '@playwright/test';
import { login, logout } from './helpers';
import { CANONICAL_COURSE_REGISTRY } from '../../src/courses/registry';

const publishedLevels = CANONICAL_COURSE_REGISTRY.map(level => [level.canonicalId, level.canonicalId + ' ' + level.title] as const);

test('student login cannot reach teacher or administrator workspaces', async ({ page }) => {
  await login(page, 'student');
  await expect(page.getByText('教师工作台', { exact: true })).toHaveCount(0);
  await expect(page.getByText('系统管理控制台', { exact: true })).toHaveCount(0);
});

test('teacher direct preview opens every published level including F01', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page, 'teacher');
  await expect(page.getByRole('heading', { name: '任教班级学情与教学评价' })).toBeVisible();

  // 1. 验证教师工作台只读课程预览 28 关及教材依据
  await page.getByRole('button', { name: '课程预览' }).click();
  await expect(page.getByRole('heading', { name: '汽车电工电子全套实训关卡' })).toBeVisible();
  await expect(page.getByText('只读课程预览 · 标准关卡结构（共 28 关）')).toBeVisible();
  await expect(page.getByText('依据：课程导入与工位规范，为后续实训作准备。')).toBeVisible();
  await expect(page.getByText('依据：学习任务19 变压器的认知（扫描文件共13页，教材拓展/重庆2027备考必学，相关目标）')).toBeVisible();
  await page.getByRole('button', { name: '返回学情' }).click();
  await expect(page.getByRole('heading', { name: '任教班级学情与教学评价' })).toBeVisible();

  // 2. 遍历全量 28 关直达预览，并抽样验证实训工单标题与关闭
  for (const [levelId, title] of publishedLevels) {
    await page.goto(`/?level=${levelId}`);
    await expect(page.getByText(title, { exact: false }).first()).toBeVisible();

    // 对代表性关卡验证实际工单弹窗标题
    if (['O00', 'D01', 'D05', 'F01'].includes(levelId)) {
      const woBtn = page.getByRole('button', { name: '工单' });
      if (await woBtn.isVisible()) {
        await woBtn.click();
      }
      await expect(page.getByText(`${title} · 实训工单`).first()).toBeVisible();
      const closeBtn = page.getByRole('button', { name: /返回实训工位|已查阅|开始训练|关闭工单/ }).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  }

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '任教班级学情与教学评价' })).toBeVisible();
  await logout(page);
  await expect(page.getByRole('heading', { name: '汽车电工电子闯关实训' })).toBeVisible();
  await login(page, 'student');
  await page.goto('/?level=C01');
  await expect(page.getByRole('heading', { name: '关卡未解锁：前置课程尚未完成' })).toBeVisible();
});

test('admin login stays in the administration console', async ({ page }) => {
  await login(page, 'admin');
  await expect(page.getByText('系统管理控制台', { exact: true })).toBeVisible();
  await expect(page.getByText('任教班级学情与教学评价', { exact: true })).toHaveCount(0);
});
