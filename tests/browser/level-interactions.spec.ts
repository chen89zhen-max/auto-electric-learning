import { expect, test } from '@playwright/test';
import { login } from './helpers';

async function openTeacherPreview(page: import('@playwright/test').Page, levelId: string) {
  await login(page, 'teacher');
  await page.goto(`/?level=${levelId}`);
}

test.describe('P5 observation-before-answer guards', () => {
  test('D02 blocks H-bridge submission until a real up/down observation is made', async ({ page }) => {
    await openTeacherPreview(page, 'D02');
    await page.getByRole('button', { name: /向右 \(手心向上/ }).click();
    await page.getByRole('button', { name: '提交受力方向判别' }).click();
    await page.getByRole('button', { name: /完全正确！进入换向器/ }).click();
    await page.getByRole('button', { name: /当线圈刚转过平衡位置/ }).click();
    await page.getByRole('button', { name: '提交换向原理分析' }).click();
    await page.getByRole('button', { name: /分析透彻！进入双继电器 H 桥/ }).click();
    await page.getByRole('button', { name: /通过切换继电器触点/ }).click();
    const submit = page.getByRole('button', { name: '请先在左侧操作升窗/降窗按钮' });
    await expect(submit).toBeDisabled();
    await expect(page.getByRole('button', { name: /H 桥极性分析正确/ })).toHaveCount(0);
  });

  test('D03 blocks AC effective-value submission until DCV/ACV is compared', async ({ page }) => {
    await openTeacherPreview(page, 'D03');
    await page.getByRole('button', { name: /垂直纸面向外/ }).click();
    await page.getByRole('button', { name: '提交感应电流方向判定' }).click();
    await page.getByRole('button', { name: /完全正确！进入正弦交流电/ }).click();
    await page.getByRole('button', { name: /交流电正负半周对称抵消/ }).click();
    const submit = page.getByRole('button', { name: '请先在左下方对比 DCV 与 ACV 挡位显示' });
    await expect(submit).toBeDisabled();
    await expect(page.getByRole('button', { name: /深刻破除仪表误区/ })).toHaveCount(0);
  });

  test('D04 keeps the answer and next-step reveal blocked before its spark observation', async ({ page }) => {
    await openTeacherPreview(page, 'D04');
    await page.getByRole('button', { name: /线圈自感阻止电流突变/ }).click();
    const submit = page.getByRole('button', { name: '请先在左侧断开开关观察打火' });
    await expect(submit).toBeDisabled();
    await expect(page.getByRole('button', { name: /深刻洞察！进入续流二极管/ })).toHaveCount(0);
  });
});

test('C01 loaded-lamp operation changes the rendered voltage state', async ({ page }) => {
  await openTeacherPreview(page, 'C01');
  const lamp = page.getByRole('button', { name: '插上车灯 (带载 10.9V 发黄)' });
  await lamp.click();
  await expect(lamp).toHaveClass(/bg-amber-600/);
});

test('C02 reaches the independent diagnosis stage and lets the learner switch among all four fault types', async ({ page }) => {
  await openTeacherPreview(page, 'C02');
  await page.getByRole('button', { name: /选项 A：试灯直观快速逐点查通断/ }).click();
  await page.getByRole('button', { name: '提交工具认知工单' }).click();
  await page.getByRole('button', { name: /进入步骤 2：断路故障排查/ }).click();

  await page.getByRole('button', { name: /结论 A：开关内部触点断开/ }).click();
  await page.getByRole('button', { name: '提交断路诊断工单' }).click();
  await page.getByRole('button', { name: /进入步骤 3：短路烧保险排查/ }).click();

  await page.getByRole('button', { name: /禁忌 A：严禁私自换装 30A/ }).click();
  await page.getByRole('button', { name: '提交短路诊断工单' }).click();
  await page.getByRole('button', { name: /进入步骤 4：独立实车盲测/ }).click();

  for (const faultName of [
    /故障 A：回路断路/,
    /故障 B：供电线对地短路/,
    /故障 C：接触不良高阻虚接/,
    /故障 D：短路到电源/,
  ]) {
    const fault = page.getByRole('button', { name: faultName });
    await fault.click();
    await expect(fault).toHaveClass(/border-amber-500/);
  }
});

test('C03 performs a real Wiggle Test and exposes its transient voltage evidence', async ({ page }) => {
  await openTeacherPreview(page, 'C03');
  await page.getByRole('button', { name: /假说 A：插头插针/ }).click();
  await page.getByRole('button', { name: '提交初检问诊单' }).click();
  await page.getByRole('button', { name: /进入步骤 2：自主排故策略/ }).click();
  await page.getByRole('button', { name: /策略 A：带载通电状态下/ }).click();
  await page.getByRole('button', { name: '提交排故策略方案' }).click();
  await page.getByRole('button', { name: /进入步骤 3：动态无损排查执行/ }).click();
  await page.getByRole('button', { name: 'DC 20V' }).click();
  await page.getByRole('button', { name: /模拟路面颠簸·线束摇晃测试/ }).click();
  await expect(page.getByText(/瞬态晃动跳变为0V|插针松旷脱落失电/)).toBeVisible();
});

test('E07 completes the virtual PCB workflow and enters the teacher-acceptance waiting state', async ({ page }) => {
  await openTeacherPreview(page, 'E07');

  for (const checklistItem of [
    /1\. 烙铁接地保护与电源线绝缘完好无破损/,
    /2\. 烙铁头固定螺丝紧固无松晃/,
    /3\. 烙铁架配重稳固且远离易燃物品/,
    /4\. 耐高温清洁海绵已注水润湿挤干/,
    /5\. 抽风排烟装置已就位开启/,
    /6\. 防护目镜已佩戴/,
  ]) {
    await page.getByRole('button', { name: checklistItem }).click();
  }
  await page.getByRole('button', { name: /通电前点检完毕 · 开启焊台加热/ }).click();
  await page.getByRole('button', { name: /五步法为准备-加热-送丝-移丝-撤烙铁/ }).click();
  await page.getByRole('button', { name: '提交工艺判定' }).click();
  await page.getByRole('button', { name: /进入步骤 2：PCB 插装与焊接实操/ }).click();

  await page.getByRole('button', { name: '折弯引脚并插装' }).click();
  await page.getByRole('button', { name: '核对色环方向插装' }).click();
  await page.getByRole('button', { name: '核对极性插装' }).click();
  await page.getByRole('button', { name: '执行 330°C 五步法施焊' }).click();
  await page.getByRole('button', { name: '斜口钳剪脚并酒精清洗' }).click();
  await page.getByRole('button', { name: /电容外壳带白色箭头\/粗线条的一侧为负极/ }).click();
  await page.getByRole('button', { name: '提交装配检验' }).click();
  await page.getByRole('button', { name: /进入步骤 3：焊点质量形态标准/ }).click();

  await page.getByRole('button', { name: /表面光亮圆润，呈半月形凹面裙摆圆锥体/ }).click();
  await page.getByRole('button', { name: '提交标准判定' }).click();
  await page.getByRole('button', { name: /进入步骤 4：典型工艺缺陷盲测/ }).click();

  const diagnoses = [
    ['芯片 U1 Pin 3-4', '桥连连锡短路'],
    ['电阻 R3 焊盘', '虚焊/冷焊接触不良'],
    ['电容 C2 丝印位', '极性反向插装'],
    ['三极管 Q1 基极', '焊盘起皮撕裂'],
  ] as const;
  for (const [location, diagnosis] of diagnoses) {
    const reportCard = page.getByText(location, { exact: true }).locator('..');
    await reportCard.getByRole('button', { name: diagnosis, exact: true }).click();
  }
  await page.getByRole('button', { name: 'BUZZER_OHM' }).click();
  await page.getByRole('button', { name: '提交四处质检结论' }).click();
  await page.getByRole('button', { name: /进入步骤 5：实车工程返修与交付/ }).click();

  await page.getByRole('button', { name: '使用吸锡带吸除电源短路桥连' }).click();
  await page.getByRole('button', { name: '涂抹助焊剂补焊 LED 虚焊点' }).click();
  await page.getByRole('button', { name: '接入 12V 供电试机' }).click();
  await page.getByRole('button', { name: '完成虚拟排故与通电测试并提交' }).click();
  await expect(page.getByText('虚拟训练已完成，实物焊接等待任课教师验收').last()).toBeVisible();
});

for (const levelId of ['D01', 'D05', 'E01', 'E02', 'E03', 'E04', 'E05', 'E06']) {
  test(`${levelId} opens and closes its rendered work order`, async ({ page }) => {
    await openTeacherPreview(page, levelId);
    const workOrder = page.getByRole('button', { name: '工单', exact: true });
    await workOrder.click();
    await expect(page.getByRole('heading', { name: /实训任务书/ })).toBeVisible();
    await page.getByRole('button', { name: /已查阅，继续实训|关闭实训任务书/ }).first().click();
  });
}
