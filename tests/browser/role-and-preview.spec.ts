import { expect, test } from '@playwright/test';
import { login } from './helpers';

const publishedLevels = [
  ['O00', '见习技师入职训练'], ['O01', '实训车间突发事故——安全用电'], ['A01', '学习任务2：点亮第一盏检修灯——电路的认知'], ['A02', '学习任务4：给电路做体检——电压分析与测量'], ['A03', '学习任务3：元件身份核验——电阻识别与测量'], ['A04', '学习任务4：电流到底走哪里——电流分析与测量'],
  ['B01', '学习任务5：找出变化规律——欧姆定律应用'], ['B02', '学习任务6：灯组改装——负载的连接'], ['B03', '学习任务7：追踪节点与回路——基尔霍夫定律'], ['B04', '学习任务7：工位用电预算——电能与电功率分析'], ['B05', '电源为什么带不动——全电路欧姆定律与内阻'], ['B06', '传感器信号与分压——NTC、水温与带载失真'],
  ['C01', 'C01 越来越暗的灯——电压降分析与虚接诊断'], ['C02', 'C02 同样不亮，原因不同——电路断路与短路综合排查'], ['C03', 'C03 第一次独立交车——综合直流诊断与修复复检'], ['D01', '汽车继电器原理、引脚辨识与驱动控制'], ['D02', 'D02 让电机转起来——直流电动机认知'], ['D03', 'D03 转动为什么能发电——电磁感应与交流发电机'], ['D04', 'D04 断开开关后的现象——自感与互感分析'], ['D05', 'D05 变压器实验室——变压器认知与测试'],
  ['E01', 'E01 电流的单向通道——二极管及其应用'], ['E02', 'E02 断电后为何还有电——电容器及其特性'], ['E03', 'E03 从交流到直流——整流滤波电路'], ['E04', 'E04 小信号控制负载——三极管放大与开关'], ['E05', 'E05 电路的条件判断——逻辑门电路认知'], ['E06', 'E06 转速信号寻踪——转速传感器与信号调理'], ['E07', 'E07 装配一块训练板——PCB焊接工艺与检测'],
] as const;

test('student login cannot reach teacher or administrator workspaces', async ({ page }) => {
  await login(page, 'student');
  await expect(page.getByText('教师工作台', { exact: true })).toHaveCount(0);
  await expect(page.getByText('系统管理控制台', { exact: true })).toHaveCount(0);
});

test('teacher direct preview opens every published level and refuses F01', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page, 'teacher');
  await expect(page.getByRole('heading', { name: '任教班级学情与教学评价' })).toBeVisible();

  for (const [levelId, title] of publishedLevels) {
    await page.goto(`/?level=${levelId}`);
    await expect(page.getByText(title, { exact: false }).first()).toBeVisible();
  }

  await page.goto('/?level=F01');
  await expect(page.getByRole('heading', { name: '任教班级学情与教学评价' })).toBeVisible();

  await page.getByRole('button', { name: '退出' }).click();
  await expect(page.getByRole('heading', { name: '汽车电工电子 · 课程地图与实训大厅' })).toBeVisible();
  await login(page, 'student');
  await page.goto('/?level=C01');
  await expect(page.getByRole('heading', { name: '关卡未解锁：前置课程尚未完成' })).toBeVisible();
});

test('admin login stays in the administration console', async ({ page }) => {
  await login(page, 'admin');
  await expect(page.getByText('系统管理控制台', { exact: true })).toBeVisible();
  await expect(page.getByText('任教班级学情与教学评价', { exact: true })).toHaveCount(0);
});
