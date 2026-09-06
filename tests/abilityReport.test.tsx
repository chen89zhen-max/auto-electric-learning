import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AbilityReport } from '@/src/components/AbilityReport';
import { scoreFromDimensions } from '@/src/abilities/reportScore';

describe('全关卡通关报告标准化 (AbilityReport) 测试', () => {
  it('1. LEVEL_01 默认向后兼容性：不传自定义参数时完美展示原有安全作业报告', () => {
    const mockReport = {
      dimensions: [
        { id: 'ENV', label: '环境观察', stars: 5 },
        { id: 'RISK', label: '危险识别', stars: 4 },
        { id: 'SOURCE', label: '危险源控制', stars: 5 },
        { id: 'DECISION', label: '应急决策', stars: 4 },
        { id: 'STANDARD', label: '规范操作', stars: 5 },
      ],
      summary: {
        directContactAttempts: 0,
        environmentChecked: true,
        powerIsolated: true,
        helpRequests: 1,
        fireResponse: '经反馈后完成',
      },
    };
    const mockMetrics = {
      unsafeFireResponses: 0,
      levelDuration: 95000,
    };

    const html = renderToStaticMarkup(
      <AbilityReport
        report={mockReport}
        metrics={mockMetrics}
        onRestart={vi.fn()}
        onReturn={vi.fn()}
      />
    );

    expect(html).toContain('技能解锁 · 安全作业Ⅰ');
    expect(html).toContain('安全作业能力报告');
    expect(html).toContain('环境观察');
    expect(html).toContain('危险识别');
    expect(html).toContain('危险源控制');
    expect(html).toContain('应急决策');
    expect(html).toContain('规范操作');
    expect(html).toContain('危险操作尝试');
    expect(html).toContain('主动查看设备状态');
    expect(html).toContain('主动切断危险源');
    expect(html).toContain('提示使用');
    expect(html).toContain('火情处置');
    expect(html).toContain('本关用时');
    expect(html).toContain('2 分钟');
    expect(html).toContain('重新开始本关');
    expect(html).toContain('返回任务大厅');
  });

  it('2. A02 电压分析与测量能力报告：正确呈现专属五维能力与 6 项工单数据指标', () => {
    const a02Dimensions = [
      { id: 'METER_PREP', label: '仪表准备与挡位选择', stars: 5 },
      { id: 'POLARITY', label: '表笔极性与符号识别', stars: 5 },
      { id: 'VOLTAGE_MEASURE', label: '两点测压与通路验证', stars: 5 },
      { id: 'DROP_DIAGNOSIS', label: '接触电阻与压降诊断', stars: 5 },
      { id: 'DECISION', label: '维修决策与逻辑表达', stars: 5 },
    ];
    const a02Summary = [
      { label: '测量记录项数', value: '4 / 4 环节' },
      { label: '正反极性验证', value: '±12V 准确识别' },
      { label: '开关通断核验', value: '0V / 12V 明确' },
      { label: '异常压降定位', value: '供电侧 0.91V' },
      { label: '维修处理建议', value: '清洁紧固氧化触点' },
      { label: '本关用时', value: '1 分钟' },
    ];

    const html = renderToStaticMarkup(
      <AbilityReport
        levelId="A02"
        domainLabel="技能领域 · 电压分析与测量"
        title="电压分析与测量能力报告"
        dimensions={a02Dimensions}
        summaryItems={a02Summary}
        nextTask="学习任务3《元件身份核验——电阻识别与测量》"
        onRestart={vi.fn()}
        onReturn={vi.fn()}
      />
    );

    expect(html).toContain('技能领域 · 电压分析与测量');
    expect(html).toContain('电压分析与测量能力报告');
    expect(html).toContain('仪表准备与挡位选择');
    expect(html).toContain('表笔极性与符号识别');
    expect(html).toContain('两点测压与通路验证');
    expect(html).toContain('接触电阻与压降诊断');
    expect(html).toContain('维修决策与逻辑表达');
    expect(html).toContain('测量记录项数');
    expect(html).toContain('4 / 4 环节');
    expect(html).toContain('正反极性验证');
    expect(html).toContain('±12V 准确识别');
    expect(html).toContain('异常压降定位');
    expect(html).toContain('供电侧 0.91V');
    expect(html).toContain('维修处理建议');
    expect(html).toContain('清洁紧固氧化触点');
    expect(html).toContain('重新开始本关');
    expect(html).toContain('返回任务大厅');
  });

  it('3. A03、A04、B01~B06 全量关卡维度星级换算 100 分制正确性', () => {
    const fiveStarDimensions = [
      { id: 'D1', label: '维度1', stars: 5 },
      { id: 'D2', label: '维度2', stars: 5 },
      { id: 'D3', label: '维度3', stars: 5 },
      { id: 'D4', label: '维度4', stars: 5 },
      { id: 'D5', label: '维度5', stars: 5 },
    ];
    expect(scoreFromDimensions(fiveStarDimensions)).toBe(100);

    const mixedDimensions = [
      { id: 'D1', label: '维度1', stars: 4 },
      { id: 'D2', label: '维度2', stars: 5 },
      { id: 'D3', label: '维度3', stars: 3 },
      { id: 'D4', label: '维度4', stars: 4 },
      { id: 'D5', label: '维度5', stars: 4 },
    ];
    expect(scoreFromDimensions(mixedDimensions)).toBe(80);
  });

  it('4. LEVEL_00 入职培训报告结构统一性', () => {
    const html = renderToStaticMarkup(
      <AbilityReport
        levelId="LEVEL_00"
        domainLabel="技能领域 · 车间入职认知"
        title="见习学员入职培训能力报告"
        dimensions={[
          { id: 'WORK_ORDER', label: '工作任务认知', stars: 5 },
          { id: 'BASIC_OP', label: '基础工具操作', stars: 5 },
          { id: 'SAFETY_PREP', label: '安全着装准备', stars: 5 },
          { id: 'HELP_SEEKING', label: '教学求助规范', stars: 5 },
          { id: 'FLOW_STANDARD', label: '工位交接流程', stars: 5 },
        ]}
        summaryItems={[
          { label: '操作违规尝试', value: '0 次' },
          { label: '工作任务理解', value: '已熟悉' },
          { label: '安全准备规范', value: '已完成' },
          { label: '教学帮助响应', value: '已掌握' },
          { label: '工单流程交接', value: '已确认' },
          { label: '本关用时', value: '1 分钟' },
        ]}
        nextTask="学习任务1《安全用电》"
        onRestart={vi.fn()}
        onReturn={vi.fn()}
      />
    );

    expect(html).toContain('技能领域 · 车间入职认知');
    expect(html).toContain('见习学员入职培训能力报告');
    expect(html).toContain('工作任务认知');
    expect(html).toContain('工位交接流程');
    expect(html).toContain('重新开始本关');
    expect(html).toContain('返回任务大厅');
  });
});
