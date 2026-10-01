import { expect, test } from '@playwright/test';
import { login, logout } from './helpers';
import fs from 'node:fs';
import path from 'node:path';
import { makeValidAssessment, makeValidE03Metrics } from '../helpers/c7EvidenceFixtures';

test('C7 process evidence persistence, reload consistency, teacher tracing and authorization', async ({ page }) => {
  test.setTimeout(180_000);

  const assetsDir = path.resolve(process.cwd(), 'docs/verification/assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  // -------------------------------------------------------------
  // Student Phase: Submit E03 evidence, view panel on course map, reload and verify
  // -------------------------------------------------------------
  await login(page, 'student');
  await expect(page.getByRole('heading', { name: '汽车电工电子闯关实训' })).toBeVisible();

  // 1. Submit LEVEL_START and LEVEL_COMPLETE with valid E03 metrics & assessment
  const now = Date.now();
  const startEventId = `evt-start-e03-${now}`;
  const completeEventId = `evt-complete-e03-${now}`;

  const startRes = await page.request.post('/api/learning/events', {
    data: {
      eventId: startEventId,
      levelId: 'E03',
      eventType: 'LEVEL_START',
      payload: {},
      occurredAt: now - 5000,
    },
  });
  expect(startRes.ok()).toBe(true);

  const completeRes = await page.request.post('/api/learning/events', {
    data: {
      eventId: completeEventId,
      levelId: 'E03',
      eventType: 'LEVEL_COMPLETE',
      payload: {
        score: 100,
        mode: 'transfer',
        metrics: makeValidE03Metrics(),
        assessment: makeValidAssessment('E03'),
      },
      occurredAt: now,
    },
  });
  expect(completeRes.ok()).toBe(true);
  const completeJson = await completeRes.json() as { attemptId?: string };
  const expectedAttemptId = completeJson.attemptId;
  expect(expectedAttemptId).toBeTruthy();

  // 2. Refresh / navigate to course map and select completed E03
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '汽车电工电子闯关实训' })).toBeVisible();

  const checkpointE03 = page.locator('[data-map-checkpoint="E03"]');
  await checkpointE03.scrollIntoViewIfNeeded();
  await checkpointE03.click();

  // 3. Open 查看过程证据
  const viewEvidenceBtn = page.getByRole('button', { name: '查看过程证据' });
  await expect(viewEvidenceBtn).toBeVisible();
  await viewEvidenceBtn.click();

  // 4. Assert persisted attempt ID, labels, 15.47V/0.20V values, and five E03 stage headings
  const attemptIdLocator = page.locator('[data-testid="selected-attempt-id"]');
  await expect(attemptIdLocator).toBeVisible();
  await expect(attemptIdLocator).toHaveText(expectedAttemptId!);
  await expect(page.locator('[data-testid="selected-attempt-mode"]')).toBeVisible();
  await expect(page.locator('[data-testid="selected-attempt-started-at"]')).toBeVisible();

  await expect(page.getByText('服务端成绩')).toBeVisible();
  await expect(page.getByText('服务端成绩').locator('..').getByText('100 分', { exact: true })).toBeVisible();
  await expect(page.getByText('学生端过程记录（结构已校验，不作为成绩依据）')).toBeVisible();

  await expect(page.getByText('阶段1: 整流拓扑与三相导通观察：')).toBeVisible();
  await expect(page.getByText('阶段2: 桥式接线与万用表二极管档测量：')).toBeVisible();
  await expect(page.getByText('阶段3: 滤波电容效应与电压计算：')).toBeVisible();
  await expect(page.getByText(/15\.47V/)).toBeVisible();
  await expect(page.getByText(/0\.20V/)).toBeVisible();
  await expect(page.getByText('阶段4: 盲测整流电路故障排查：')).toBeVisible();
  await expect(page.getByText('阶段5: 工程修复与发动机运转交付：')).toBeVisible();

  // 5. Reload page, reopen E03 evidence, assert same attempt ID and values
  await page.reload();
  await expect(page.getByRole('heading', { name: '汽车电工电子闯关实训' })).toBeVisible();

  const checkpointE03Reload = page.locator('[data-map-checkpoint="E03"]');
  await checkpointE03Reload.scrollIntoViewIfNeeded();
  await checkpointE03Reload.click();

  const viewEvidenceBtnReload = page.getByRole('button', { name: '查看过程证据' });
  await expect(viewEvidenceBtnReload).toBeVisible();
  await viewEvidenceBtnReload.click();

  await expect(page.locator('[data-testid="selected-attempt-id"]')).toHaveText(expectedAttemptId!);
  await expect(page.locator('[data-testid="selected-attempt-mode"]')).toBeVisible();
  await expect(page.locator('[data-testid="selected-attempt-started-at"]')).toBeVisible();
  await expect(page.getByText('服务端成绩').locator('..').getByText('100 分', { exact: true })).toBeVisible();
  await expect(page.getByText(/15\.47V/)).toBeVisible();
  await expect(page.getByText(/0\.20V/)).toBeVisible();

  // 6. Capture desktop screenshot
  await page.screenshot({
    path: path.join(assetsDir, 'c7-student-e03-evidence-desktop.png'),
    fullPage: false,
  });

  // -------------------------------------------------------------
  // Teacher Phase: Log in as teacher, open StudentEvidence, open E03 tracing, mobile view
  // -------------------------------------------------------------
  await logout(page);
  await login(page, 'teacher');
  await expect(page.getByRole('heading', { name: '任教班级学情与教学评价' })).toBeVisible();

  // Find student1 ("张晓明") and open evidence
  const studentRow = page.getByRole('row').filter({ hasText: 'student1' });
  await expect(studentRow).toBeVisible();
  await studentRow.getByRole('button', { name: '查看证据' }).click();

  // Assert StudentEvidence is open for 张晓明
  await expect(page.getByRole('region', { name: '学生学习证据' })).toBeVisible();

  // Open E03 process evidence in 四关过程证据追溯
  const e03EvidenceBtn = page.getByRole('button', { name: /E03 过程证据/ });
  await e03EvidenceBtn.scrollIntoViewIfNeeded();
  await e03EvidenceBtn.click();

  // Assert same attempt ID and values
  const teacherAttemptIdLocator = page.locator('[data-testid="selected-attempt-id"]');
  await expect(teacherAttemptIdLocator).toBeVisible();
  await expect(teacherAttemptIdLocator).toHaveText(expectedAttemptId!);
  await expect(page.getByText('服务端成绩')).toBeVisible();
  await expect(page.getByText('100 分', { exact: true })).toBeVisible();
  await expect(page.getByText('学生端过程记录（结构已校验，不作为成绩依据）')).toBeVisible();
  await expect(page.getByText('阶段3: 滤波电容效应与电压计算：')).toBeVisible();
  await expect(page.getByText(/15\.47V/)).toBeVisible();
  await expect(page.getByText(/0\.20V/)).toBeVisible();

  // Switch to mobile viewport (390x844), assert no horizontal overflow, capture screenshot
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await teacherAttemptIdLocator.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(assetsDir, 'c7-teacher-e03-evidence-mobile.png'),
    fullPage: false,
  });

  // -------------------------------------------------------------
  // Authorization Phase: Query out-of-class student from teacher request context
  // -------------------------------------------------------------
  const forbiddenRes = await page.request.get('/api/teacher/attempts?studentId=usr_student2&levelId=E03');
  expect(forbiddenRes.status()).toBe(403);
  const forbiddenBody = await forbiddenRes.json() as { success: boolean; error: string };
  expect(forbiddenBody.success).toBe(false);
  expect(forbiddenBody.error).toContain('教师只能查看当前任教班级学生的过程证据');
});
