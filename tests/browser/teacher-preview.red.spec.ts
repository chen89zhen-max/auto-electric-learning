import { expect, test } from '@playwright/test';

test('teacher direct C01 preview renders the level after real dialog login', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '账号登录/激活' }).click();
  await page.getByRole('button', { name: '教师登录' }).click();
  await page.getByLabel('教师账号').fill('teacher');
  await page.getByLabel('教师密码').fill('Teacher#2026');
  await page.getByRole('button', { name: '进 入 教 师 工 作 台' }).click();
  await expect(page.getByRole('heading', { name: '任教班级学情与教学评价' })).toBeVisible();

  await page.goto('/?level=C01');

  await expect(page.getByRole('heading', { name: /C01.*电压降分析与虚接诊断/ })).toBeVisible();
});
