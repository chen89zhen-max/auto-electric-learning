import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { VehicleElectricalMap } from '@/src/components/course-map/VehicleElectricalMap';
import { CurrentMissionPanel } from '@/src/components/course-map/CurrentMissionPanel';
import { FloatingMissionHud } from '@/src/components/course-map/FloatingMissionHud';
import { ChapterTaskPanel } from '@/src/components/course-map/ChapterTaskPanel';
import type { CourseMapChapterModel, CourseMapLevelModel } from '@/src/components/course-map/courseMapModel';

const levelFixture: CourseMapLevelModel = {
  id: 'B05',
  chapterId: 'chapter_b',
  num: 'B05',
  title: '电源内阻与端电压',
  subtitle: '闭合电路欧姆定律',
  description: '电源内阻实验与带载测量。',
  category: '电路规律',
  duration: '2 课时',
  isElective: false,
  state: 'available',
  prerequisiteName: 'B04',
  missingPrerequisiteNames: [],
  recommendedPriorLevelNames: ['B04 核算用电与功率'],
  attemptCount: 1,
};

const chapterFixture: CourseMapChapterModel[] = [
  { id: 'chapter_o', letter: 'O', num: '序章', title: '来到实训中心', description: '安全准入', state: 'completed', completedCount: 2, totalCount: 2, levels: [] },
  { id: 'chapter_a', letter: 'A', num: '篇章一', title: '把电路看明白', description: '基础回路', state: 'completed', completedCount: 4, totalCount: 4, levels: [] },
  {
    id: 'chapter_b',
    letter: 'B',
    num: '篇章二',
    title: '让电路按要求工作',
    description: '欧姆定律与规律',
    state: 'current',
    completedCount: 1,
    totalCount: 6,
    levels: [
      {
        ...levelFixture,
        state: 'completed',
        recentScore: 92,
        recentDurationMs: 120_000,
        attemptCount: 1,
      },
    ],
  },
  { id: 'chapter_c', letter: 'C', num: '篇章三', title: '凭证据找故障', description: '压降与排故', state: 'available', completedCount: 0, totalCount: 3, levels: [] },
  { id: 'chapter_d', letter: 'D', num: '篇章四', title: '让电和磁配合工作', description: '继电器与电机', state: 'locked', completedCount: 0, totalCount: 5, levels: [] },
  { id: 'chapter_e', letter: 'E', num: '篇章五', title: '让电路感知、判断和执行', description: '传感器与电子', state: 'locked', completedCount: 0, totalCount: 7, levels: [] },
  { id: 'chapter_f', letter: 'F', num: '篇章六', title: '完成综合交付', description: '综合工单', state: 'construction', completedCount: 0, totalCount: 1, levels: [] },
];

describe('vehicle electrical map visuals', () => {
  it('keeps the recommended task and C7 evidence access in the compact sidebar card', () => {
    const html = renderToStaticMarkup(
      <FloatingMissionHud
        level={{ ...levelFixture, id: 'E03', state: 'completed', recentScore: 86 }}
        onOpen={() => undefined}
      />,
    );
    expect(html).toContain('当前推荐');
    expect(html).toContain('查看过程证据');
    expect(html).toContain('再次复习实训');
    expect(html).not.toContain('考核五维');
  });
  it('renders seven accessible chapters and distinguishes the course route from actual wiring', () => {
    const html = renderToStaticMarkup(
      <VehicleElectricalMap
        chapters={chapterFixture}
        selectedChapterId="chapter_b"
        onSelectChapter={() => undefined}
        onPreviewChapter={() => undefined}
      />,
    );
    expect((html.match(/data-course-chapter=/g) ?? [])).toHaveLength(7);
    expect(html).toContain('道路表示课程学习顺序，不代表车辆电路连接或真实布线');
    expect(html).not.toContain('动力电池');
    expect(html).not.toContain('高压控制器');
  });

  it('shows a lightweight U9 map marker that can open the 3D model', () => {
    const html = renderToStaticMarkup(
      <VehicleElectricalMap
        chapters={chapterFixture}
        selectedChapterId="chapter_b"
        activeLevelId="B05"
        onSelectChapter={() => undefined}
        onPreviewChapter={() => undefined}
      />,
    );
    expect(html).toContain('aria-label="查看仰望 U9 三维模型"');
    expect(html).toContain('data-sprite=');
    expect(html).not.toContain('rotate(');
    expect(html).not.toContain('id="training-car-avatar"');
  });

  it('shows the latest score and second-precision duration for a completed current mission', () => {
    const html = renderToStaticMarkup(
      <CurrentMissionPanel
        level={{ ...levelFixture, state: 'completed', recentScore: 86, recentDurationMs: 365_000, attemptCount: 2 }}
        onOpen={() => undefined}
      />,
    );
    expect(html).toContain('最近成绩');
    expect(html).toContain('86分');
    expect(html).toContain('06:05');
    expect(html).toContain('第2次');
    expect(html).toContain('再次复习实训');
    expect(html).toContain('★★★★☆ 良好 · 熟练级');
    expect(html).toContain('考核五维');
  });

  it('renders the selected chapter tasks with state text and latest attempt data', () => {
    const html = renderToStaticMarkup(
      <ChapterTaskPanel
        chapters={chapterFixture}
        selectedChapterId="chapter_b"
        showAll={false}
        onSelectChapter={() => undefined}
        onToggleAll={() => undefined}
        onOpenLevel={() => undefined}
      />,
    );
    expect(html).toContain('篇章二：让电路按要求工作');
    expect(html).toContain('B05');
    expect(html).toContain('最近成绩');
    expect(html).toContain('查看全部28个任务');
  });

  it('shows recommended study without presenting an available task as locked', () => {
    const panelHtml = renderToStaticMarkup(<CurrentMissionPanel level={levelFixture} onOpen={() => undefined} />);
    const cardHtml = renderToStaticMarkup(
      <ChapterTaskPanel
        chapters={[{ ...chapterFixture[2], levels: [levelFixture] }]}
        selectedChapterId="chapter_b"
        showAll={false}
        onSelectChapter={() => undefined}
        onToggleAll={() => undefined}
        onOpenLevel={() => undefined}
      />,
    );

    expect(panelHtml).toContain('建议先学');
    expect(panelHtml).toContain('B04 核算用电与功率');
    expect(panelHtml).not.toContain('待解锁前置任务');
    expect(cardHtml).toContain('建议先学');
    expect(cardHtml).not.toContain('未解锁');

    const currentCardHtml = renderToStaticMarkup(
      <ChapterTaskPanel
        chapters={[{ ...chapterFixture[2], levels: [{ ...levelFixture, state: 'current' }] }]}
        selectedChapterId="chapter_b"
        showAll={false}
        onSelectChapter={() => undefined}
        onToggleAll={() => undefined}
        onOpenLevel={() => undefined}
      />,
    );
    expect(currentCardHtml).toContain('当前推荐实训任务');
    expect(currentCardHtml).toContain('建议先学：B04 核算用电与功率');
  });
});
