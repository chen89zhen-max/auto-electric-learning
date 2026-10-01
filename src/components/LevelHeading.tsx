'use client';

import React from 'react';
import { getCourseLevel } from '@/src/courses/registry';
import { EXAM_NAME, TEXTBOOK_TASKS, getLevelCurriculum } from '@/src/courses/curriculum';

/** 页头只显示关卡ID；教材任务号只用于可折叠的学习依据。 */
export function LevelHeading({ levelId, children }: { levelId: string; children?: React.ReactNode }) {
  const level = getCourseLevel(levelId);
  const curriculum = getLevelCurriculum(levelId);
  if (!level) return null;
  const textbookTasks = curriculum?.textbookTaskIds.map(id => TEXTBOOK_TASKS.find(task => task.id === id)!).filter(Boolean) ?? [];
  return (
    <div className="level-heading" data-level-heading={level.canonicalId}>
      <div className="level-heading-main">
        <div className="level-heading-title">
          <p className="eyebrow">{level.chapterTitle}</p>
          <h1>{level.canonicalId} {level.title}</h1>
        </div>
        <details className="curriculum-details">
          <summary>教材与考纲</summary>
          <div className="curriculum-details-body">
            <p className="level-heading-subtitle">{level.subtitle}</p>
            <p className="level-heading-objective"><strong>本关目标：</strong>{level.description}</p>
            <p className="curriculum-badges">
              {level.curriculumRequirement === 'elective' && curriculum?.examRequired ? (
                <span>课程拓展 · 重庆2027备考必学</span>
              ) : (
                <>
                  <span>{level.curriculumRequirement === 'elective' ? '课程拓展' : '课程必学'}</span>
                  <span>{curriculum?.examRequired ? `${EXAM_NAME}备考必学` : '课程导入 / 应用训练'}</span>
                </>
              )}
            </p>
            {textbookTasks.map(task => <section key={task.id}>
              <p><strong>教材学习任务{task.id} · {task.title}</strong>（扫描文件共{task.filePages}页）</p>
              <p>重庆2027理论考纲 · 课程二 · 任务{task.id} · {task.examTitle ?? task.title} · PDF第{task.theoryPage}页</p>
              <ul>{task.requirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul>
            </section>)}
            <p>上述为相关教材与考纲要求，本关承担其中的相应目标；完成本关不等同于整项考纲达标。</p>
            {curriculum?.scopeNote && <p className="curriculum-scope">{curriculum.scopeNote}</p>}
          </div>
        </details>
      </div>
      {children}
    </div>
  );
}
