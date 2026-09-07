import { expect, test, type Page } from '@playwright/test';
import { login } from './helpers';

async function loginAsTeacher(page: Page, username: 'teacher' | 'teacher2') {
  await page.goto('/');
  await page.getByRole('button', { name: '账号登录/激活' }).click();
  await page.getByRole('button', { name: '教师登录' }).click();
  await page.getByLabel('教师账号').fill(username);
  await page.getByLabel('教师密码').fill('Teacher#2026');
  await page.getByRole('button', { name: '进 入 教 师 工 作 台' }).click();
  await expect(page.getByRole('heading', { name: '任教班级学情与教学评价' })).toBeVisible();
}

test.describe.serial('three-role organization and E07 signature lifecycle', () => {
  test('teacher A sees only Student A while teacher B is denied A-class APIs', async ({ page }, testInfo) => {
    const attemptId = `browser_e07_${testInfo.project.name}`;
    await loginAsTeacher(page, 'teacher');
    await expect(page.getByRole('cell', { name: 'student1' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'student2' })).toHaveCount(0);

    await page.getByRole('button', { name: '退出' }).click();
    await loginAsTeacher(page, 'teacher2');
    await expect(page.getByRole('cell', { name: 'student2' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'student1' })).toHaveCount(0);

    const listResponse = await page.request.get('/api/teacher/students?classId=class_24new1');
    expect(listResponse.status()).toBe(403);
    const signResponse = await page.request.post('/api/teacher/evaluations', {
      data: {
        studentId: 'usr_student1',
        attemptId,
        evaluationType: 'PHYSICAL_RUBRIC',
        rubricVersion: 'E07-PHYSICAL-v1',
        rubricItems: {
          pre_power_check: 20,
          component_orientation: 20,
          solder_quality: 30,
          safety_process: 20,
          evidence_explanation: 10,
        },
      },
    });
    expect(signResponse.status()).toBe(403);
  });

  test('teacher A signs the seeded E07 attempt and the signed card becomes read-only', async ({ page }, testInfo) => {
    const attemptId = `browser_e07_${testInfo.project.name}`;
    await loginAsTeacher(page, 'teacher');
    const row = page.getByRole('row').filter({ hasText: 'student1' });
    await row.getByRole('button', { name: '查看证据' }).click();

    const attemptCard = page.getByText(new RegExp(`记录编号: ${attemptId}`))
      .locator('xpath=ancestor::div[.//button[normalize-space()="签署实物量规并存证"]][1]');
    await expect(attemptCard.getByText('待验收签署：E07 实物焊接工单')).toBeVisible();
    await attemptCard.getByPlaceholder('现场观察评语（选填）').fill('浏览器端现场验收通过');
    await attemptCard.getByRole('button', { name: '签署实物量规并存证' }).click();

    const signedCard = page.getByText(/实物量规已由.*教师完成验收签署/)
      .locator('xpath=ancestor::div[contains(@class,"border-emerald-300")][1]');
    await expect(signedCard).toBeVisible();
    await expect(signedCard.getByText('实物总分: 100 / 100 分')).toBeVisible();
    await expect(signedCard.locator('input, button')).toHaveCount(0);

    await page.getByRole('button', { name: '退出' }).click();
    await login(page, 'student');
    const { status, payload } = await page.evaluate(async (id) => {
      const response = await fetch(`/api/learning/evaluations?attemptId=${encodeURIComponent(id)}`, { cache: 'no-store' });
      return { status: response.status, payload: await response.json() };
    }, attemptId);
    expect(status).toBe(200);
    expect(payload.evaluation).toMatchObject({
      attemptId,
      score: 100,
      comment: '浏览器端现场验收通过',
      rubricVersion: 'E07-PHYSICAL-v1',
      rubricData: {
        pre_power_check: 20,
        component_orientation: 20,
        solder_quality: 30,
        safety_process: 20,
        evidence_explanation: 10,
      },
    });
  });

  test('administrator creates and archives a class, assigns Teacher A, and moves Student A with cleanup', async ({ page }, testInfo) => {
    const className = `浏览器验收${testInfo.project.name}班`;
    await login(page, 'admin');
    await page.getByRole('button', { name: '班级', exact: true }).click();
    await page.getByPlaceholder('班级名称').fill(className);
    await page.getByPlaceholder('年级').fill('2026级');
    await page.getByRole('button', { name: '创建班级' }).click();
    const classCard = page.locator('article').filter({ hasText: className });
    await expect(classCard).toContainText('active');

    await page.getByRole('button', { name: '教学关系' }).click();
    const teacherForm = page.locator('form').filter({ hasText: '选择教师' });
    await teacherForm.locator('select').nth(0).selectOption({ label: '陈老师（1班任课教师）' });
    await teacherForm.locator('select').nth(1).selectOption({ label: className });
    await teacherForm.getByRole('button', { name: '分配任教' }).click();
    await expect(page.getByText(`陈老师（1班任课教师） → ${className}`)).toBeVisible();

    const studentForm = page.locator('form').filter({ hasText: '选择学生' });
    await studentForm.locator('select').nth(0).selectOption({ label: '张晓明（student1）' });
    await studentForm.locator('select').nth(1).selectOption({ label: className });
    await studentForm.getByRole('button', { name: '执行转班' }).click();
    await expect(page.getByText(`张晓明 → ${className}`)).toBeVisible();

    await page.getByRole('button', { name: '退出' }).click();
    await loginAsTeacher(page, 'teacher');
    await expect(page.getByRole('cell', { name: 'student1' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'student2' })).toHaveCount(0);

    await page.getByRole('button', { name: '退出' }).click();
    await login(page, 'admin');
    await page.getByRole('button', { name: '教学关系' }).click();
    const cleanupStudentForm = page.locator('form').filter({ hasText: '选择学生' });
    await cleanupStudentForm.locator('select').nth(0).selectOption({ label: '张晓明（student1）' });
    await cleanupStudentForm.locator('select').nth(1).selectOption({ label: '24新能源1班' });
    await cleanupStudentForm.getByRole('button', { name: '执行转班' }).click();
    await expect(page.getByText('张晓明 → 24新能源1班')).toBeVisible();

    const assignment = page.getByRole('listitem').filter({ hasText: `陈老师（1班任课教师） → ${className}` });
    await assignment.getByRole('button', { name: '撤销' }).click();
    await expect(assignment).toHaveCount(0);

    await page.getByRole('button', { name: '班级', exact: true }).click();
    const cleanupClassCard = page.locator('article').filter({ hasText: className });
    await cleanupClassCard.getByRole('button', { name: '归档班级' }).click();
    await expect(cleanupClassCard).toContainText('archived');
  });
});
