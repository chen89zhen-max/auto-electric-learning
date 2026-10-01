// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import fs from 'fs';
import { CANONICAL_COURSE_REGISTRY, getCourseLevel } from '@/src/courses/registry';
import { getLevelCurriculum, getRouteProgress, getNextLevelLabel, getLevelDisplayName, getLevelCurriculumSummary } from '@/src/courses/curriculum';
import { LevelHeading } from '@/src/components/LevelHeading';
import { AbilityReport } from '@/src/components/AbilityReport';
import { CurriculumRoutes } from '@/src/components/course-map/CurriculumRoutes';
import { buildCourseMapViewModel } from '@/src/components/course-map/courseMapModel';
import { createBaseUserProgress } from '@/src/types/progress';

afterEach(cleanup);

describe('统一课程名称', () => {
  it('旧ID和新ID始终使用同一关卡名称，不使用教材编号当游戏编号', () => {
    expect(getCourseLevel('LEVEL_03')?.title).toBe('识别与检测电阻');
    expect(getCourseLevel('LEVEL_03')?.title).toBe(getCourseLevel('A03')?.title);
    expect(getCourseLevel('A02')?.chapterTitle).toBe('篇章一：电路认知与基本测量');
    expect(CANONICAL_COURSE_REGISTRY).toHaveLength(28);
  });
});

describe('教材与考纲分层', () => {
  it('D05教材选学但重庆2027备考必学，路线完成度去重且不由F01代替', () => {
    expect(getLevelCurriculum('D05')?.examRequired).toBe(true);
    const done = CANONICAL_COURSE_REGISTRY.filter(l => l.canonicalId !== 'D05').map(l => l.canonicalId);
    expect(getRouteProgress(done, 'course').missingIds).toEqual([]);
    expect(getRouteProgress(done, 'exam').missingIds).toEqual(['D05']);
    expect(getRouteProgress(['O00', 'LEVEL_00', 'F01', 'UNKNOWN'], 'course').completed).toBe(2);
    expect(getNextLevelLabel('F01')).not.toContain('全部28');
    expect(getNextLevelLabel('B03')).toContain('B04');
    expect(getNextLevelLabel('B03')).not.toContain('学习任务');
  });
  it('跨任务引用保留真实来源，E05不是教材18', () => {
    expect(getLevelCurriculum('E05')?.textbookTaskIds).toEqual([17]);
    expect(getLevelCurriculum('B03')?.textbookTaskIds).toEqual([4, 6]);
    expect(getLevelCurriculum('LEVEL_02')?.textbookTaskIds).toEqual([2]);
  });
  it('页头短标题、独立副标题和默认折叠的学习依据', () => {
    render(<LevelHeading levelId="A02" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('A02 给电路做体检');
    expect(screen.getByText('电压分析与测量')).toBeTruthy();
    const details = screen.getByText('教材与考纲').closest('details');
    expect(details?.open).toBe(false);
    expect(details?.textContent).toContain('教材学习任务4');
    expect(details?.textContent).toContain('文件共18页');
    expect(details?.textContent).not.toContain('教材第18页');
  });
  it('备考入口显示变压器并保留先修状态，技能入口说明覆盖边界', () => {
    const model = buildCourseMapViewModel(createBaseUserProgress('学员'));
    const opened: string[] = [];
    render(<CurriculumRoutes levels={model.chapters.flatMap(c => c.levels)} onOpenLevel={level => opened.push(level.state)} />);
    fireEvent.click(screen.getByRole('button', { name: '重庆2027考纲关卡索引' }));
    expect(screen.getByText(/本区不是独立题库/)).toBeTruthy();
    expect(screen.getByText(/考纲对应关卡已通关/)).toBeTruthy();
    const transformer = screen.getByRole('button', { name: /D05 认识与检测变压器/, hidden: true });
    expect(transformer.textContent).toContain('需先修');
    fireEvent.click(transformer);
    expect(opened).toEqual(['locked']);
    fireEvent.click(screen.getByRole('button', { name: '低压故障练习工单' }));
    expect(screen.getByText('五张低压故障练习工单')).toBeTruthy();
    expect(screen.getByText(/不生成技能考核成绩/)).toBeTruthy();
    expect(screen.getByText(/转向、危险警告、制动、倒车等独立线路仍未覆盖/)).toBeTruthy();
  });

  it('全量28关统一依据来源，规范标注扫描总页数与相关目标，不宣称F01全覆盖', () => {
    for (const level of CANONICAL_COURSE_REGISTRY) {
      const summary = getLevelCurriculumSummary(level.canonicalId);
      expect(summary).toBeTruthy();
      if (summary.includes('页')) {
        expect(summary).toContain('扫描文件共');
        expect(summary).not.toContain('教材第');
      }
    }
    expect(getLevelCurriculumSummary('F01')).not.toContain('T01~T18');
    expect(getLevelCurriculumSummary('F01')).toContain('非全项覆盖');
    expect(getLevelCurriculumSummary('C03')).toContain('非全项覆盖');
    expect(getLevelCurriculumSummary('B06')).toContain('任务3、任务6');
    expect(getLevelCurriculumSummary('D05')).toContain('重庆2027备考必学');
  });

  it('全量28关 getLevelDisplayName 均返回 canonicalId + 标准短名称', () => {
    for (const level of CANONICAL_COURSE_REGISTRY) {
      expect(getLevelDisplayName(level.canonicalId)).toBe(`${level.canonicalId} ${level.title}`);
    }
  });

  it('能力报告组件动态解析关卡标准名称与报告后缀', () => {
    render(<AbilityReport levelId="B04" onReturn={() => {}} />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('B04 核算用电与功率 · 能力报告');
  });

  it('28关实训工单模板均静态绑定 getLevelDisplayName 或标准名称', () => {
    const woFileMap: Record<string, string> = {
      O00: 'src/components/WorkOrderPanel.tsx',
      O01: 'src/levels/level01/components/Level01WorkOrder.tsx',
      A01: 'src/levels/level02/components/Level02WorkOrder.tsx',
      A02: 'src/levels/a02/A02Experience.tsx',
      A03: 'src/levels/a03/A03Experience.tsx',
      A04: 'src/levels/a04/A04Experience.tsx',
      B01: 'src/levels/b01/B01Experience.tsx',
      B02: 'src/levels/b02/B02Experience.tsx',
      B03: 'src/levels/b03/B03Experience.tsx',
      B04: 'src/levels/b04/B04Experience.tsx',
      B05: 'src/levels/chapterB/ChapterBExperience.tsx',
      B06: 'src/levels/chapterB/ChapterBExperience.tsx',
      C01: 'src/levels/c01/C01Experience.tsx',
      C02: 'src/levels/c02/C02Experience.tsx',
      C03: 'src/levels/c03/C03Experience.tsx',
      D01: 'src/levels/d01/D01Experience.tsx',
      D02: 'src/levels/d02/D02Experience.tsx',
      D03: 'src/levels/d03/D03Experience.tsx',
      D04: 'src/levels/d04/D04Experience.tsx',
      D05: 'src/levels/d05/D05Experience.tsx',
      E01: 'src/levels/e01/E01Experience.tsx',
      E02: 'src/levels/e02/E02Experience.tsx',
      E03: 'src/levels/e03/E03Experience.tsx',
      E04: 'src/levels/e04/E04Experience.tsx',
      E05: 'src/levels/e05/E05Experience.tsx',
      E06: 'src/levels/e06/E06Experience.tsx',
      E07: 'src/levels/e07/E07Experience.tsx',
      F01: 'src/levels/f01/F01Experience.tsx',
    };

    for (const level of CANONICAL_COURSE_REGISTRY) {
      const file = woFileMap[level.canonicalId];
      expect(file).toBeDefined();
      const content = fs.readFileSync(file, 'utf-8');
      const hasBinding =
        content.includes(`getLevelDisplayName('${level.canonicalId}')`) ||
        content.includes('getLevelDisplayName(levelId)') ||
        content.includes(level.title);
      expect(hasBinding).toBe(true);
    }
  });
});
