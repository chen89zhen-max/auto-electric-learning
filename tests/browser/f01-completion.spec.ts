import { expect, test, type Page } from '@playwright/test';
import { login } from './helpers';
import { selectF01ScenarioSeed, type F01MeterRequest, type F01Seed } from '@/src/levels/f01/f01Model';

type BrowserMeterRequest = Pick<F01MeterRequest, 'mode' | 'redJack' | 'target'>;

function prePowerRepairLabel(seed: F01Seed): string {
  return seed === 'F01-A' ? '纠正续流二极管极性'
    : seed === 'F01-B' ? '清除+12V与地之间焊桥'
    : '返修继电器线圈端虚焊';
}

function operationalRepairLabel(seed: F01Seed): string {
  return seed === 'F01-A' ? '修复电源正极连接器接触面并恢复端子夹紧力'
    : seed === 'F01-B' ? '修复传感器分压上支路开路点'
    : '清洁并紧固灯组搭铁连接点';
}

function evidenceRequests(seed: F01Seed): BrowserMeterRequest[] {
  if (seed === 'F01-A') return [
    { mode: 'DIODE', redJack: 'V_OHM', target: 'flyback_polarity' },
    { mode: 'DCV_20', redJack: 'V_OHM', target: 'supply_connector_drop' },
    { mode: 'DCV_20', redJack: 'V_OHM', target: 'lamp_voltage' },
    { mode: 'DCA_10', redJack: '10A', target: 'main_current_series' },
  ];
  if (seed === 'F01-B') return [
    { mode: 'OHM', redJack: 'V_OHM', target: 'board_supply_to_ground' },
    { mode: 'DCV_20', redJack: 'V_OHM', target: 'divider_output' },
    { mode: 'DCV_20', redJack: 'V_OHM', target: 'relay_coil_voltage' },
    { mode: 'OHM', redJack: 'V_OHM', target: 'relay_coil_continuity' },
  ];
  return [
    { mode: 'OHM', redJack: 'V_OHM', target: 'relay_coil_continuity' },
    { mode: 'DCV_20', redJack: 'V_OHM', target: 'ground_drop' },
    { mode: 'DCV_20', redJack: 'V_OHM', target: 'lamp_voltage' },
    { mode: 'DCA_10', redJack: '10A', target: 'main_current_series' },
  ];
}

async function performMeasurement(page: Page, request: BrowserMeterRequest) {
  const resistanceLike = request.mode === 'OHM' || request.mode === 'CONTINUITY' || request.mode === 'DIODE';
  const openPower = page.getByRole('button', { name: '断开总电源' });
  const closePower = page.getByRole('button', { name: '闭合总电源' });
  if (resistanceLike && (await openPower.count()) > 0) await openPower.click();
  if (!resistanceLike && (await closePower.count()) > 0) await closePower.click();
  await page.getByLabel('万用表挡位').selectOption(request.mode);
  await page.getByLabel('红表笔插孔').selectOption(request.redJack);
  await page.getByLabel('测量目标').selectOption(request.target);
  await page.getByRole('button', { name: '执行测量' }).click();
  await expect(page.getByRole('status')).toContainText(/已记录|测量结果/);
}

async function setLogicInputs(page: Page, a: boolean, b: boolean) {
  const inputA = page.getByLabel('维护使能 A');
  const inputB = page.getByLabel('光照条件 B');
  if (a) await inputA.check(); else await inputA.uncheck();
  if (b) await inputB.check(); else await inputB.uncheck();
}

async function completeF01(page: Page, seed: F01Seed, requestHint = false) {
  await page.getByRole('button', { name: '确认功率回路' }).click();
  await page.getByRole('button', { name: '确认控制回路' }).click();
  await page.getByLabel('初始假设1').selectOption('POWER_PATH');
  await page.getByLabel('初始假设2').selectOption('CONTROL_PATH');
  await page.getByRole('button', { name: '提交接单分析' }).click();

  if (requestHint) await page.getByRole('button', { name: '请师傅提示' }).click();
  await performMeasurement(page, evidenceRequests(seed)[0]);
  await page.getByRole('button', { name: prePowerRepairLabel(seed) }).click();
  await page.getByLabel('测量计划顺序').selectOption('OFF_INSPECT_ON_MEASURE_OFF_REPAIR_ON_RETEST');
  await page.getByRole('button', { name: '提交安全审查' }).click();

  await page.getByLabel('正常主回路电流').fill('2.00');
  await page.getByLabel('正常灯端电压').fill('10.00');
  await page.getByLabel('正常分压点电压').fill('2.50');
  await page.getByLabel('与门输出序列').fill('0001');
  await page.getByRole('button', { name: '提交正常值基准' }).click();

  for (const request of evidenceRequests(seed).slice(1)) await performMeasurement(page, request);
  await page.getByRole('button', { name: operationalRepairLabel(seed) }).click();
  await page.getByRole('button', { name: '提交诊断与修复' }).click();

  // Stage 5: ensure power is closed for functional verification
  const closePower = page.getByRole('button', { name: '闭合总电源' });
  if ((await closePower.count()) > 0) await closePower.click();

  for (const [a, b] of [[false, false], [false, true], [true, false], [true, true]] as const) {
    await setLogicInputs(page, a, b);
    await page.getByRole('button', { name: '记录当前工况' }).click();
  }
  await page.getByLabel('迁移分压点电压').fill('1.67');
  await page.getByLabel('迁移工况判断').selectOption('RELAY_OFF_LAMP_OFF');
  const evidenceBoxes = page.getByRole('checkbox', { name: /作为答辩证据/ });
  await evidenceBoxes.nth(0).check();
  await evidenceBoxes.nth(1).check();
  await page.waitForTimeout(1_100);
  await page.getByRole('button', { name: '提交终检交付' }).click();
}

test.describe.serial('F01 browser end-to-end delivery lifecycle', () => {
  test('guest cannot access F01 without prerequisites or login', async ({ page }) => {
    const guestWrites: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/api/learning/events') && request.method() === 'POST') guestWrites.push(request.url());
    });
    await page.goto('/?level=F01');
    await expect(page.getByRole('heading', { name: '关卡未解锁：前置课程尚未完成' })).toBeVisible();
    expect(guestWrites).toEqual([]);
  });

  test('student completes F01, verifies wall-clock timing, recent record, and rotates seed on replay', async ({ page }) => {
    test.setTimeout(180_000);
    await login(page, 'student');
    await page.goto('/?level=F01');
    await expect(page.getByRole('heading', { name: 'F01 实训中心交付挑战——智能检修灯控制总成终检' })).toBeVisible();
    await expect(page.getByText('阶段 1/5')).toBeVisible();

    const ordinal1 = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('NEV_ELECTRICAL_GAME_USER_PROGRESS_V1');
        const progress = raw ? JSON.parse(raw) : null;
        return ((progress?.levels?.F01?.attemptCount as number) ?? 0) + 1;
      } catch {
        return 1;
      }
    });
    const seed1 = selectF01ScenarioSeed('student1', ordinal1);

    const completePromise1 = page.waitForResponse(
      (res) => Boolean(res.url().endsWith('/api/learning/events') && res.request().method() === 'POST' && res.request().postData()?.includes('LEVEL_COMPLETE'))
    );

    await completeF01(page, seed1, false);

    const res1 = await completePromise1;
    expect(res1.ok()).toBe(true);
    const body1 = await res1.json();
    const f01Progress1 = body1.projection.levels.F01;
    expect(f01Progress1.status).toBe('completed');
    expect(f01Progress1.score).toBe(100);
    expect(f01Progress1.attemptCount).toBe(ordinal1);
    expect(f01Progress1.recentRecord).toMatchObject({
      score: 100,
      timingSource: 'server',
    });
    expect(f01Progress1.recentRecord?.durationMs).toBeGreaterThanOrEqual(1000);

    // AbilityReport is shown
    await expect(page.getByText('智能检修灯控制总成终检能力报告')).toBeVisible();
    await expect(page.getByText(/学习结果已保存|用时/)).toBeVisible();

    // Return to lobby
    await page.getByRole('button', { name: '返回任务大厅' }).click();
    await expect(page.getByRole('heading', { name: '汽车电工电子 · 课程地图与实训大厅' })).toBeVisible();

    // Check Chapter F tab or task card
    const showAllBtn = page.getByRole('button', { name: /查看全部.*个任务/ });
    if ((await showAllBtn.count()) > 0) {
      await showAllBtn.click();
    }
    const f01Card = page.locator('[data-level-id="F01"]');
    await expect(f01Card).toBeVisible();
    await expect(f01Card).toContainText('最近成绩 (100分)');
    await expect(f01Card).toContainText(/用时\s*\d+\s*秒/);

    // Re-enter F01 for second attempt (replay)
    await f01Card.click();
    await expect(page.getByRole('heading', { name: 'F01 实训中心交付挑战——智能检修灯控制总成终检' })).toBeVisible();

    // Rotate seed to next attempt
    const ordinal2 = ordinal1 + 1;
    const seed2 = selectF01ScenarioSeed('student1', ordinal2);
    expect(seed2).not.toBe(seed1);

    const completePromise2 = page.waitForResponse(
      (res) => Boolean(res.url().endsWith('/api/learning/events') && res.request().method() === 'POST' && res.request().postData()?.includes('LEVEL_COMPLETE'))
    );

    // Intentionally request hint to lower score
    await completeF01(page, seed2, true);

    const res2 = await completePromise2;
    expect(res2.ok()).toBe(true);
    const body2 = await res2.json();
    const f01Progress2 = body2.projection.levels.F01;
    expect(f01Progress2.attemptCount).toBe(ordinal2);
    expect(f01Progress2.score).toBeLessThan(100);
    expect(f01Progress2.recentRecord?.score).toBe(f01Progress2.score);
    expect(f01Progress2.firstRecord?.score).toBe(100);
    expect(f01Progress2.recentRecord?.durationMs).toBeGreaterThanOrEqual(1000);
  });

  test('stage 4 responsive layout at 200% equivalent viewport has no horizontal overflow', async ({ page }) => {
    await login(page, 'student');
    await page.setViewportSize({ width: 683, height: 768 });
    await page.goto('/?level=F01');

    const attemptCount = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('NEV_ELECTRICAL_GAME_USER_PROGRESS_V1');
        const progress = raw ? JSON.parse(raw) : null;
        return (progress?.levels?.F01?.attemptCount as number) ?? 0;
      } catch {
        return 0;
      }
    });
    const seed = selectF01ScenarioSeed('student1', attemptCount + 1);

    // Fast-forward to Stage 4
    await page.getByRole('button', { name: '确认功率回路' }).click();
    await page.getByRole('button', { name: '确认控制回路' }).click();
    await page.getByLabel('初始假设1').selectOption('POWER_PATH');
    await page.getByLabel('初始假设2').selectOption('CONTROL_PATH');
    await page.getByRole('button', { name: '提交接单分析' }).click();

    await performMeasurement(page, evidenceRequests(seed)[0]);
    await page.getByRole('button', { name: prePowerRepairLabel(seed) }).click();
    await page.getByLabel('测量计划顺序').selectOption('OFF_INSPECT_ON_MEASURE_OFF_REPAIR_ON_RETEST');
    await page.getByRole('button', { name: '提交安全审查' }).click();

    await page.getByLabel('正常主回路电流').fill('2.00');
    await page.getByLabel('正常灯端电压').fill('10.00');
    await page.getByLabel('正常分压点电压').fill('2.50');
    await page.getByLabel('与门输出序列').fill('0001');
    await page.getByRole('button', { name: '提交正常值基准' }).click();

    // We are in Stage 4
    await expect(page.getByRole('button', { name: '提交诊断与修复' })).toBeVisible();
    await expect(page.getByLabel('陈师傅实训指导')).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });
});
