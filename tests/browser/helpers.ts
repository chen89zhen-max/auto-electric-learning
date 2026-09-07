import { expect, type Page } from '@playwright/test';

export async function login(page: Page, role: 'student' | 'teacher' | 'admin') {
  await page.goto('/');
  await page.getByRole('button', { name: '账号登录/激活' }).click();
  if (role === 'student') {
    await page.getByLabel('学号 / 账号').fill('student1');
    await page.getByLabel('登录密码').fill('Student#2026');
    await page.getByRole('button', { name: '登 录 实 训' }).click();
    await expect(page.getByRole('heading', { name: '汽车电工电子 · 课程地图与实训大厅' })).toBeVisible();
    return;
  }
  await page.getByRole('button', { name: role === 'teacher' ? '教师登录' : '系统管理登录' }).click();
  await page.getByLabel(role === 'teacher' ? '教师账号' : '系统管理员账号').fill(role === 'teacher' ? 'teacher' : 'admin');
  await page.getByLabel(role === 'teacher' ? '教师密码' : '系统管理员密码').fill(role === 'teacher' ? 'Teacher#2026' : 'Admin#2026');
  await page.getByRole('button', { name: role === 'teacher' ? '进 入 教 师 工 作 台' : '进 入 系 统 管 理 后 台' }).click();
}
