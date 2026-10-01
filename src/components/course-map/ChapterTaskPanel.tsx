import React from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Layers,
  Lock,
  Play,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChapterId } from '@/src/courses/registry';
import { formatDateTimeSeconds, formatDurationMs } from '@/src/lib/formatDuration';
import type { CourseMapChapterModel, CourseMapLevelModel } from './courseMapModel';
import styles from './CourseMapLobby.module.css';

interface ChapterTaskPanelProps {
  chapters: CourseMapChapterModel[];
  selectedChapterId: ChapterId;
  showAll: boolean;
  onSelectChapter: (chapterId: ChapterId) => void;
  onToggleAll: () => void;
  onOpenLevel: (level: CourseMapLevelModel) => void;
}

export function ChapterTaskPanel({
  chapters,
  selectedChapterId,
  showAll,
  onSelectChapter,
  onToggleAll,
  onOpenLevel,
}: ChapterTaskPanelProps) {
  const totalTasks = chapters.reduce((sum, ch) => sum + ch.totalCount, 0);
  const currentChapter =
    chapters.find((ch) => ch.id === selectedChapterId) || chapters[0];

  const renderTaskCard = (level: CourseMapLevelModel) => {
    const isCompleted = level.state === 'completed';
    const isPlayable = level.state !== 'construction';

    return (
      <button
        type="button"
        key={level.id}
        data-level-id={level.id}
        data-state={level.state}
        onClick={() => onOpenLevel(level)}
        className={`${styles.taskCard} ${
          isCompleted
            ? 'border-emerald-700/60 bg-slate-900/90'
            : level.state === 'current'
            ? 'border-amber-500/80 bg-slate-900/95 ring-1 ring-amber-400/30'
            : level.state === 'available'
            ? 'border-cyan-700/60 bg-slate-900/80'
            : 'border-slate-800 bg-slate-950/60 opacity-80'
        }`}
      >
        {/* Card Header Strip */}
        <div className="flex items-start justify-between gap-2.5 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`w-9 h-9 rounded-lg font-mono text-sm font-bold flex items-center justify-center border shrink-0 ${
                isCompleted
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                  : level.state === 'current'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/80'
                  : level.state === 'available'
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              {level.num}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
              {level.category}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {level.duration}
            </span>
            {level.isElective && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800">
                课程拓展 · 重庆2027备考必学
              </span>
            )}
          </div>

          {/* State Badge */}
          <div className="shrink-0">
            {isCompleted ? (
              <span className="text-xs bg-emerald-950/90 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-700/80 flex items-center gap-1">
                <CheckCircle2 size={13} />
                已完成
              </span>
            ) : level.state === 'construction' ? (
              <span className="text-xs bg-slate-800 text-violet-300 font-bold px-2.5 py-1 rounded-full border border-violet-700/60 flex items-center gap-1">
                <Wrench size={13} />
                建设中
              </span>
            ) : level.state === 'current' ? (
              <span className="text-xs bg-amber-950/90 text-amber-300 font-bold px-2.5 py-1 rounded-full border border-amber-500/80 flex items-center gap-1">
                <Sparkles size={13} />
                当前推荐
              </span>
            ) : level.state === 'available' ? (
              <span className="text-xs bg-cyan-950/90 text-cyan-300 font-bold px-2.5 py-1 rounded-full border border-cyan-600/80 flex items-center gap-1">
                <Play size={12} className="fill-cyan-300" />
                可实训
              </span>
            ) : (
              <span className="text-xs bg-slate-900 text-slate-400 font-bold px-2 py-1 rounded-full border border-slate-700 flex items-center gap-1">
                <Lock size={12} />
                未解锁
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="my-2 w-full">
          <h3 className="text-base sm:text-lg font-bold text-slate-100">
            {level.title}
          </h3>
          <h4 className="text-xs sm:text-sm font-semibold text-cyan-300/90 mt-0.5">
            {level.subtitle}
          </h4>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {level.description}
          </p>
        </div>

        {/* Card Footer */}
        <div className="border-t border-slate-800 pt-2.5 flex items-center justify-between text-xs w-full gap-2">
          <div className="min-w-0">
            {isCompleted ? (
              <span className="text-emerald-400 font-medium">
                已完成实训 · 最近成绩 ({level.recentScore !== undefined ? `${level.recentScore}分` : '历史记录未提供'})
                {level.recentDurationMs !== undefined && ` · 用时${formatDurationMs(level.recentDurationMs)}`}
                {level.recentCompletedAt && ` · 完成${formatDateTimeSeconds(level.recentCompletedAt)}`}
                {level.attemptCount > 1 && ` · 练习${level.attemptCount}次`}
              </span>
            ) : level.state === 'construction' ? (
              <span className="text-slate-400 font-medium">
                按教材大纲规划中 · 建设中
              </span>
            ) : level.state === 'current' ? (
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <span className="text-amber-400 font-bold">当前推荐实训任务</span>
                {level.recommendedPriorLevelNames.length > 0 && (
                  <span className="text-sky-300 font-medium">
                    建议先学：{level.recommendedPriorLevelNames.join('、')}
                  </span>
                )}
              </div>
            ) : level.state === 'available' ? (
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <span className="text-cyan-300 font-medium">已解锁 · 随时开始实训</span>
                {level.recommendedPriorLevelNames.length > 0 && (
                  <span className="text-sky-300 font-medium">
                    建议先学：{level.recommendedPriorLevelNames.join('、')}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-slate-400">
                {level.missingPrerequisiteNames.length > 0
                  ? `需先完成：${level.missingPrerequisiteNames.join('、')}`
                  : level.prerequisiteName
                  ? `需先完成：${level.prerequisiteName}`
                  : '前置考核未完成'}
              </span>
            )}
          </div>

          <div className="shrink-0 font-bold">
            {isPlayable ? (
              <span
                className={`flex items-center gap-0.5 ${
                  isCompleted ? 'text-slate-300 hover:text-white' : 'text-cyan-300'
                }`}
              >
                {isCompleted ? '重新实训' : '进入任务'}
                <ChevronRight size={14} />
              </span>
            ) : (
              <span className="text-slate-500">开发建设中</span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <section aria-label="篇章实训任务列表" className="w-full flex flex-col gap-4">
      {/* Chapter Filter Toolbar & Full Curriculum Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3">
        {/* Chapter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {chapters.map((ch) => {
            const isSelected = selectedChapterId === ch.id && !showAll;
            return (
              <button
                type="button"
                key={ch.id}
                onClick={() => {
                  onSelectChapter(ch.id);
                  if (showAll) onToggleAll();
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span className="font-mono text-cyan-200">{ch.letter}</span>
                <span>{ch.title}</span>
                <span className="text-[11px] opacity-75 font-mono">
                  ({ch.completedCount}/{ch.totalCount})
                </span>
              </button>
            );
          })}
        </div>

        {/* Show All 28 Tasks Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleAll}
          className={`text-xs shrink-0 flex items-center gap-1.5 border-slate-700 ${
            showAll
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Layers size={14} />
          <span>{showAll ? '返回篇章视图' : `查看全部${totalTasks}个任务`}</span>
        </Button>
      </div>

      {/* Task Panel Heading */}
      <div className="flex items-center justify-between px-1">
        <h2
          id="chapter-task-panel-heading"
          tabIndex={-1}
          className="text-base sm:text-lg font-bold text-slate-100 outline-none flex items-center gap-2"
        >
          {showAll ? (
            <span>七篇章 · {totalTasks}个汽车电工电子实训任务</span>
          ) : (
            <span>
              {currentChapter.num}：{currentChapter.title}
            </span>
          )}
        </h2>
        <span className="text-xs text-slate-400 font-medium">
          {showAll
            ? '全景课程地图 · 规范进阶与能力进阶'
            : currentChapter.description}
        </span>
      </div>

      {/* Tasks View: Single Selected Chapter or Full Chapter-by-Chapter Panorama */}
      {!showAll ? (
        <div className={styles.taskGrid}>
          {currentChapter.levels.map(renderTaskCard)}
        </div>
      ) : (
        <div className="space-y-6">
          {chapters.map((ch) => (
            <div key={ch.id} className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="w-6 h-6 rounded bg-slate-800 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center">
                  {ch.letter}
                </span>
                <h3 className="text-sm font-bold text-slate-200">
                  {ch.num}：{ch.title}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  ({ch.completedCount}/{ch.totalCount} 已完成)
                </span>
              </div>
              <div className={styles.taskGrid}>
                {ch.levels.map(renderTaskCard)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
