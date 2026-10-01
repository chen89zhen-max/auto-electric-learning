import React, { useState } from 'react';
import { ChevronRight, Clock, History, Sparkles, Star, Target, Trophy, Wrench, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTimeSeconds, formatDurationMs } from '@/src/lib/formatDuration';
import { getLevelHardwareInfo } from './courseLevelHardware';
import { HardwareBenchIllustration } from './HardwareBenchIllustration';
import type { CourseMapLevelModel } from './courseMapModel';
import { isC7EvidenceLevelId } from '@/src/types/attemptEvidence';
import { AttemptEvidencePanel } from '@/src/components/evidence/AttemptEvidencePanel';

interface CurrentMissionPanelProps {
  level: CourseMapLevelModel;
  onOpen: (level: CourseMapLevelModel) => void;
  isPreview?: boolean;
}

function formatMmSs(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function CurrentMissionPanel({ level, onOpen, isPreview = false }: CurrentMissionPanelProps) {
  const [showEvidence, setShowEvidence] = useState(false);
  const isCompleted = level.state === 'completed';
  const hardware = getLevelHardwareInfo(level.id);

  // 5-Star Rating logic coupled with scoreAssessment.ts
  const score = level.recentScore ?? 0;
  const starsEarned = !isCompleted
    ? 0
    : score >= 90
    ? 5
    : score >= 80
    ? 4
    : score >= 70
    ? 3
    : score >= 60
    ? 2
    : 1;

  const getStarTierInfo = () => {
    if (!isCompleted) {
      return {
        badgeText: '☆☆☆☆☆ 待挑战夺星',
        tag: '待评定',
        tagClass: 'text-slate-400 border-slate-700 bg-slate-800/80',
        summary: '通关实训且成绩达到90分即可夺得5星满星勋章！',
        guide: '严格遵循操作规程与仪表防呆，独立完成排故闭环。',
      };
    }
    if (starsEarned === 5) {
      return {
        badgeText: '★★★★★ 卓越 · 专家级',
        tag: '5星 卓越',
        tagClass: 'text-amber-300 border-amber-500/60 bg-amber-950/80',
        summary: '满星达成！自主排故达标，已掌握高阶技能迁移应用。',
        guide: '操作规范扎实，已达到中高级技能实操考核水准。',
      };
    }
    if (starsEarned === 4) {
      const diff = 90 - score;
      return {
        badgeText: '★★★★☆ 良好 · 熟练级',
        tag: '4星 良好',
        tagClass: 'text-cyan-300 border-cyan-500/60 bg-cyan-950/80',
        summary: `规范熟练，距 5 星仅差 ${diff > 0 ? diff : 1} 分！`,
        guide: '再次挑战减少求助与重试次数，即可冲击满星专家级。',
      };
    }
    if (starsEarned === 3) {
      const diff = 80 - score;
      return {
        badgeText: '★★★☆☆ 中等 · 进阶级',
        tag: '3星 进阶',
        tagClass: 'text-blue-300 border-blue-500/60 bg-blue-950/80',
        summary: `基本掌握原理，距 4 星熟练级还差 ${diff > 0 ? diff : 1} 分。`,
        guide: '注意闭合回路测量规范与极性识别，避免线路虚接。',
      };
    }
    if (starsEarned === 2) {
      const diff = 70 - score;
      return {
        badgeText: '★★☆☆☆ 及格 · 达标级',
        tag: '2星 达标',
        tagClass: 'text-emerald-300 border-emerald-500/60 bg-emerald-950/80',
        summary: `基本完成实训，距进阶还差 ${diff > 0 ? diff : 1} 分。`,
        guide: '过程依赖系统引导纠偏，建议按规程重新自主实测。',
      };
    }
    return {
      badgeText: '★☆☆☆☆ 见习 · 待提升',
      tag: '1星 见习',
      tagClass: 'text-rose-300 border-rose-500/60 bg-rose-950/80',
      summary: '实训考核未达合格线（<60分）。',
      guide: '建议跟随系统演示完整复习基本工具操作与安全规范。',
    };
  };

  const starTier = getStarTierInfo();

  const getButtonText = () => {
    if (isCompleted) return '再次复习实训';
    if (level.state === 'construction') return '实训建设中';
    if (level.state === 'locked') return '前置未解锁';
    return '继续实训';
  };

  return (
    <section
      aria-label="当前实训台架与考核规范"
      className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl shadow-black/50 relative overflow-hidden min-w-0"
    >
      {/* Tech glow accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="space-y-2.5">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} />
            {isPreview ? '正在预览的实训任务' : '当前推荐实训任务'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-cyan-300">
              {hardware.hardwareCategory}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              {level.category} · {level.duration}
            </span>
          </div>
        </div>

        {/* Level Title & Badges */}
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 font-mono font-bold text-base text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
            {level.num}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-black text-slate-100 leading-snug truncate">
              {level.title}
            </h2>
            <p className="text-xs text-cyan-300 font-medium truncate">
              {level.subtitle}
            </p>
          </div>
        </div>

        {/* Realistic Hardware Bench Showcase */}
        <div className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1 truncate">
              <Wrench size={13} className="text-cyan-400 shrink-0" />
              <span className="truncate">{hardware.hardwareName}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono shrink-0">
              {hardware.hardwareSpecs}
            </span>
          </div>

          <HardwareBenchIllustration hardware={hardware} className="my-0.5" />

          {/* Training Targets */}
          <div className="grid grid-cols-1 gap-0.5 text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
            {hardware.trainingTargets.map((target, idx) => (
              <div key={idx} className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span className="truncate">{target}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5-Star Rating and Attempt Stats */}
        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
          {/* Star Rating Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((starIdx) => (
                <Star
                  key={starIdx}
                  size={15}
                  className={`${
                    starIdx <= starsEarned
                      ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                      : 'text-slate-700 fill-slate-800/50'
                  }`}
                />
              ))}
              <span className="ml-1.5 font-bold text-[11px] text-amber-300 truncate">
                {starTier.badgeText}
              </span>
            </div>
            {isCompleted && level.recentScore !== undefined && (
              <span className="font-mono font-bold text-emerald-400 text-xs shrink-0">
                {level.recentScore}分
              </span>
            )}
          </div>

          {/* Star Tier Feedback & Improvement Guide */}
          <div className="text-[11px] text-slate-400 leading-tight">
            <span>{starTier.summary}</span>
            <span className="text-cyan-300/80 ml-1">{starTier.guide}</span>
          </div>

          {/* 5-Stage Capability Breakdown Chips */}
          <div className="flex items-center gap-1 pt-1 border-t border-slate-800/60 overflow-x-auto scrollbar-none text-[10px]">
            <span className="text-slate-500 font-mono flex items-center gap-0.5 shrink-0">
              <ShieldCheck size={11} className="text-cyan-400" />
              考核五维:
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-300 shrink-0">
              认知(10)
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-300 shrink-0">
              规范(20)
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-300 shrink-0">
              理论(20)
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-300 shrink-0">
              排故(25)
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-300 shrink-0">
              迁移(25)
            </span>
          </div>

          {isCompleted ? (
            <div className="pt-1 border-t border-slate-800/80 space-y-1 text-slate-300">
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span className="flex items-center gap-1">
                  <Trophy size={13} />
                  最近成绩
                </span>
                <span className="font-mono font-black">
                  {level.recentScore !== undefined ? `${level.recentScore}分` : '历史记录未提供'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  最近用时
                </span>
                <span className="font-mono text-slate-200">
                  {level.recentDurationMs !== undefined
                    ? `${formatDurationMs(level.recentDurationMs)} (${formatMmSs(level.recentDurationMs)})`
                    : '历史记录未提供'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1">
                  <History size={12} />
                  训练次数
                </span>
                <span className="font-mono text-slate-200">
                  第{level.attemptCount}次
                </span>
              </div>

              {level.recentCompletedAt && (
                <div className="text-[10px] text-slate-500 text-right font-mono">
                  完成时间：{formatDateTimeSeconds(level.recentCompletedAt)}
                </div>
              )}

              {!isPreview && isC7EvidenceLevelId(level.id) && (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEvidence((prev) => !prev);
                    }}
                    className="w-full text-xs border-cyan-700/60 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:text-cyan-200"
                  >
                    {showEvidence ? '收起过程证据' : '查看过程证据'}
                  </Button>
                  {showEvidence && (
                    <div className="mt-2 text-left">
                      <AttemptEvidencePanel levelId={level.id} viewer={{ kind: 'student' }} initiallyOpen={true} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : level.missingPrerequisiteNames.length > 0 ? (
            <div className="text-amber-300/90 pt-1">
              <span className="font-bold block mb-0.5 text-[11px]">🔒 待解锁前置任务：</span>
              <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-400">
                {level.missingPrerequisiteNames.map((name) => (
                  <li key={name} className="truncate">{name}</li>
                ))}
              </ul>
            </div>
          ) : level.recommendedPriorLevelNames.length > 0 ? (
            <div className="text-sky-300/90 pt-1 text-[11px] leading-relaxed">
              <span className="font-bold">建议先学：</span>
              <span>{level.recommendedPriorLevelNames.join('、')}</span>
            </div>
          ) : (
            <div className="text-cyan-300/90 flex items-center gap-1.5 pt-1 text-[11px]">
              <Target size={14} className="shrink-0" />
              <span>已具备前置知识，可立即开启实训闭环！</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Action Button */}
      <div className="mt-2.5 pt-1">
        <Button
          size="lg"
          onClick={() => onOpen(level)}
          className={`w-full font-bold text-sm sm:text-base py-2.5 min-h-[44px] shadow-lg flex items-center justify-center gap-2 ${
            isCompleted
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              : level.state === 'construction'
              ? 'bg-slate-800 hover:bg-slate-750 text-slate-400 border border-slate-700'
              : level.state === 'locked'
              ? 'bg-slate-800 hover:bg-slate-750 text-slate-400 border border-slate-700'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-amber-500/25'
          }`}
        >
          <span>{getButtonText()}</span>
          <ChevronRight size={18} />
        </Button>
      </div>
    </section>
  );
}
