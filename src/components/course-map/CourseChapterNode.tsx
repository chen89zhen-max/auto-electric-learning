import React from 'react';
import type { ChapterId } from '@/src/courses/registry';
import type { CourseMapChapterModel, CourseMapItemState } from './courseMapModel';
import styles from './CourseMapLobby.module.css';

interface CourseChapterNodeProps {
  chapter: CourseMapChapterModel;
  selected: boolean;
  position: { x: number; y: number };
  onSelect: (chapterId: ChapterId) => void;
  onPreview: (chapterId: ChapterId | null) => void;
  onMove: (chapterId: ChapterId, direction: -1 | 1) => void;
}

const STATE_CONFIG: Record<
  CourseMapItemState,
  { label: string; className: string }
> = {
  completed: {
    label: '已完成',
    className: styles.nodeCompleted,
  },
  current: {
    label: '当前',
    className: styles.nodeCurrent,
  },
  available: {
    label: '可学习',
    className: styles.nodeAvailable,
  },
  locked: {
    label: '未解锁',
    className: styles.nodeLocked,
  },
  construction: {
    label: '建设中',
    className: styles.nodeConstruction,
  },
};

export function CourseChapterNode({
  chapter,
  selected,
  position,
  onSelect,
  onPreview,
  onMove,
}: CourseChapterNodeProps) {
  const config = STATE_CONFIG[chapter.state];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onMove(chapter.id, -1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onMove(chapter.id, 1);
    }
  };

  return (
    <button
      type="button"
      data-course-chapter={chapter.letter}
      data-state={chapter.state}
      title={chapter.title}
      aria-pressed={selected}
      aria-label={`篇章${chapter.letter}：${chapter.title}，已完成 ${chapter.completedCount}/${chapter.totalCount} 任务，当前状态：${config.label}`}
      className={`${styles.chapterNode} ${config.className} ${selected ? styles.chapterNodeSelected : ''}`}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      onClick={() => onSelect(chapter.id)}
      onMouseEnter={() => onPreview(chapter.id)}
      onMouseLeave={() => onPreview(null)}
      onFocus={() => onPreview(chapter.id)}
      onBlur={() => onPreview(null)}
      onKeyDown={handleKeyDown}
    >
      {chapter.state === 'current' && <div className={styles.currentRing} aria-hidden="true" />}
      <span className={styles.chapterLetter} aria-hidden="true">{chapter.letter}</span>
      <span className={styles.chapterLabelCopy}>
        <strong>{chapter.title}</strong>
        <span>{chapter.completedCount}/{chapter.totalCount} · {config.label}</span>
      </span>
    </button>
  );
}
