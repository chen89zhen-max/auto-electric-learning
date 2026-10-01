import React, { useState } from 'react';
import { Award, ChevronRight, Clock3, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttemptEvidencePanel } from '@/src/components/evidence/AttemptEvidencePanel';
import { formatDurationMs } from '@/src/lib/formatDuration';
import { isC7EvidenceLevelId } from '@/src/types/attemptEvidence';
import type { CourseMapLevelModel } from './courseMapModel';

interface FloatingMissionHudProps {
  level: CourseMapLevelModel;
  onOpen: (level: CourseMapLevelModel) => void;
  isPreview?: boolean;
  onReturnCurrent?: () => void;
}

export function FloatingMissionHud({ level, onOpen, isPreview = false, onReturnCurrent }: FloatingMissionHudProps) {
  const [showEvidence, setShowEvidence] = useState(false);
  const isCompleted = level.state === 'completed';
  const score = level.recentScore;
  const starsEarned = !isCompleted || score === undefined ? 0
    : score >= 90 ? 5 : score >= 80 ? 4 : score >= 70 ? 3 : score >= 60 ? 2 : 1;
  const buttonText = isCompleted ? '再次复习实训'
    : level.state === 'locked' ? '查看解锁条件'
      : level.state === 'construction' ? '查看建设状态' : '进入实训';

  return (
    <section
      aria-label="当前实训任务"
      data-testid="current-mission-card"
      className="min-w-0 w-full rounded-2xl border border-cyan-700/60 bg-slate-900 p-5 text-slate-100 shadow-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-md border border-cyan-600/60 bg-cyan-950 px-2.5 py-1 text-sm font-bold text-cyan-200">
          {isPreview ? '任务预览' : '当前推荐'}
        </span>
        <span className="text-sm font-bold text-cyan-300">{level.category} · {level.duration}</span>
      </div>

      <div className="mt-5 flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-500 font-mono text-lg font-black text-slate-950">
          {level.num}
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-black leading-snug text-white">{level.title}</h2>
          <p className="mt-1 text-base leading-relaxed text-slate-300">{level.subtitle}</p>
        </div>
      </div>

      {level.description && <p className="mt-4 text-base leading-relaxed text-slate-200">{level.description}</p>}

      <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="flex items-center justify-between gap-2 text-sm font-bold text-amber-300">
          <span className="flex items-center gap-2"><Award size={18} /> 本关记录</span>
          <span>{isCompleted ? score === undefined ? '已完成 · 暂无成绩' : `${score} 分` : '尚未通关'}</span>
        </div>
        {isCompleted && score !== undefined && (
          <div className="mt-3 flex items-center gap-1" aria-label={`${starsEarned}星`}>
            {[1, 2, 3, 4, 5].map((index) => <Star key={index} size={20}
              className={index <= starsEarned ? 'fill-amber-400 text-amber-400' : 'text-slate-500'} />)}
          </div>
        )}
        {isCompleted && (
          <div className="mt-3 space-y-1 text-sm leading-relaxed text-slate-300">
            {level.recentDurationMs !== undefined && <p className="flex items-center gap-2"><Clock3 size={16} /> 最近用时：{formatDurationMs(level.recentDurationMs)}</p>}
            <p>训练次数：{level.attemptCount} 次</p>
          </div>
        )}
      </div>

      {level.missingPrerequisiteNames.length > 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-amber-200">待解锁前置任务：{level.missingPrerequisiteNames.join('、')}</p>
      ) : level.recommendedPriorLevelNames.length > 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-cyan-200">建议先学：{level.recommendedPriorLevelNames.join('、')}</p>
      ) : null}

      {isPreview && onReturnCurrent && (
        <button type="button" onClick={onReturnCurrent} className="mt-4 text-sm font-bold text-cyan-300 underline underline-offset-4">
          返回当前任务
        </button>
      )}
      <Button
        size="lg"
        className="mt-5 min-h-12 w-full bg-cyan-500 text-base font-bold text-slate-950 hover:bg-cyan-400"
        onClick={() => onOpen(level)}
      >
        {buttonText}<ChevronRight size={20} />
      </Button>

      {!isPreview && isCompleted && isC7EvidenceLevelId(level.id) && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <button type="button" onClick={() => setShowEvidence((open) => !open)}
            className="min-h-11 w-full rounded-lg border border-cyan-700 bg-cyan-950/50 px-3 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-900/60">
            {showEvidence ? '收起过程证据' : '查看过程证据'}
          </button>
          {showEvidence && <div className="mt-3 max-w-full overflow-x-auto"><AttemptEvidencePanel levelId={level.id} viewer={{ kind: 'student' }} initiallyOpen /></div>}
        </div>
      )}
    </section>
  );
}
