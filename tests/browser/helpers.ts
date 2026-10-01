import { expect, type Page } from '@playwright/test';

export async function login(page: Page, role: 'student' | 'teacher' | 'admin') {
  await page.goto('/');
  await page.getByRole('button', { name: '账号登录/激活' }).click();
  if (role === 'student') {
    await page.getByLabel('学号 / 账号').fill('student1');
    await page.getByLabel('登录密码').fill('Student#2026');
    const loginResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/auth/login') && response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: '登 录 实 训' }).click();
    expect((await loginResponse).ok()).toBe(true);
    await expect(page.getByRole('heading', { name: '汽车电工电子闯关实训' })).toBeVisible();
    await expect.poll(async () =>
      (await page.context().cookies()).some((cookie) => cookie.name === 'nev_session' && cookie.value.length > 0)
    ).toBe(true);
    return;
  }
  await page.getByRole('button', { name: role === 'teacher' ? '教师登录' : '系统管理登录' }).click();
  await page.getByLabel(role === 'teacher' ? '教师账号' : '系统管理员账号').fill(role === 'teacher' ? 'teacher' : 'admin');
  await page.getByLabel(role === 'teacher' ? '教师密码' : '系统管理员密码').fill(role === 'teacher' ? 'Teacher#2026' : 'Admin#2026');
  await page.getByRole('button', { name: role === 'teacher' ? '进 入 教 师 工 作 台' : '进 入 系 统 管 理 后 台' }).click();
}

export async function logout(page: Page) {
  const logoutResponse = page.waitForResponse((response) =>
    response.url().endsWith('/api/auth/logout') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: '退出', exact: true }).click();
  await logoutResponse;
  await expect(page.getByRole('button', { name: '账号登录/激活' })).toBeVisible();
}
