'use client';

import { useEffect, useState } from 'react';
import { TrainingPerson } from '@/src/components/visuals/TrainingPerson';
import {
  Activity,
  CheckCircle2,
  Heart,
  HeartPulse,
  Megaphone,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import firstAidConfig from '@/src/levels/level01/firstAidConfig.json';
import { useLevel01Store } from '@/src/stores/level01Store';
import { sounds } from '@/src/components/visuals/SoundEffects';

const assessmentSteps = [
  {
    id: 'CHECK_RESPONSE' as const,
    label: '1. 轻拍触电者双肩并大声呼唤（查意识）',
    detail: '观察面部与神志反应；切忌摇动头部，防止颈椎二次创伤',
    icon: UserCheck,
  },
  {
    id: 'CALL_HELP' as const,
    label: '2. 呼叫周围人员协助并拨打120（求援）',
    detail: '招呼车间师生取急救箱，解开触电者衣领、裤带，保持平坦仰卧',
    icon: Megaphone,
  },
  {
    id: 'CHECK_BREATHING' as const,
    label: '3. 试颈动脉搏动与口鼻气流（查生命体征）',
    detail: '面部贴近口鼻听气流、观胸部起伏；食指中指试一侧颈动脉（5~10秒内完成）',
    icon: Activity,
  },
];

export function FirstAidScene() {
  const { state, dispatch } = useLevel01Store();
  const [chestDepression, setChestDepression] = useState(false);

  // CPR Metronome & Frequency Monitoring
  const [metronomeAudio, setMetronomeAudio] = useState(false);
  const [metronomePulse, setMetronomePulse] = useState(false);

  const [lastPressTime, setLastPressTime] = useState<number | null>(null);
  const [recentBpm, setRecentBpm] = useState<number | null>(null);
  const [rhythmRating, setRhythmRating] = useState<'IDLE' | 'PERFECT' | 'TOO_SLOW' | 'TOO_FAST'>('IDLE');
  const [rhythmFeedback, setRhythmFeedback] = useState<string>('请跟随 110 BPM 心律光圈连续按压');

  // 110 BPM Metronome timer (60000 / 110 = 545.45 ms)
  useEffect(() => {
    if (state.currentStage !== 'FIRST_AID_ACTION') return;

    const interval = setInterval(() => {
      setMetronomePulse(true);
      setTimeout(() => setMetronomePulse(false), 140);

      if (metronomeAudio) {
        sounds.metronomeTick();
      }
    }, 545.45);

    return () => clearInterval(interval);
  }, [state.currentStage, metronomeAudio]);

  const handleAssessmentAction = (id: 'CHECK_RESPONSE' | 'CALL_HELP' | 'CHECK_BREATHING') => {
    sounds.click();
    dispatch({ type: 'FIRST_AID_ACTION', action: id });
  };

  const handleResetRhythm = () => {
    setLastPressTime(null);
    setRecentBpm(null);
    setRhythmRating('IDLE');
    setRhythmFeedback('已重置按压节拍，请重新跟随 110 BPM 心律光圈按压');
  };

  const handleCompress = () => {
    const now = Date.now();

    if (lastPressTime === null) {
      setLastPressTime(now);
      setChestDepression(true);
      setTimeout(() => setChestDepression(false), 180);
      sounds.heartbeat();
      setRhythmRating('IDLE');
      setRhythmFeedback('第 1 拍已记录！请跟随 110 BPM 节拍光圈连续按压...');
      return;
    }

    const dt = now - lastPressTime;
    setLastPressTime(now);

    // If gap between presses is too long (> 2.5s), the rhythm was interrupted
    if (dt > 2500) {
      sounds.warningBuzz();
      setRecentBpm(null);
      setRhythmRating('TOO_SLOW');
      setRhythmFeedback('按压中断间隔过长！心肺复苏不能随意停顿，请跟随节拍重新连续按压！');
      return;
    }

    // Calculate instantaneous BPM
    const bpm = Math.round(60000 / dt);
    setRecentBpm(bpm);

    // Standard CPR is 100 ~ 120 BPM. Human tolerance: 95 ~ 125 BPM.
    if (bpm < 95) {
      sounds.warningBuzz();
      setRhythmRating('TOO_SLOW');
      setRhythmFeedback(`⚠ 按压过慢（${bpm} 次/分）！低于 100~120 次/分标准，无法建立有效灌注压！`);
    } else if (bpm > 125) {
      sounds.warningBuzz();
      setRhythmRating('TOO_FAST');
      setRhythmFeedback(`⚠ 按压过快（${bpm} 次/分）！高于 100~120 次/分标准，胸骨未充分回弹！`);
    } else {
      sounds.heartbeat();
      setChestDepression(true);
      setTimeout(() => setChestDepression(false), 180);
      setRhythmRating('PERFECT');
      setRhythmFeedback(`✓ 节拍标准（${bpm} 次/分）！垂直下压有效、胸骨充分回弹！`);
      dispatch({ type: 'PRACTICE_FIRST_AID' });
    }
  };

  // Stage 1: FIRST_AID_ASSESSMENT (10-second assessment sequence)
  if (state.currentStage === 'FIRST_AID_ASSESSMENT') {
    return (
      <div className="relative z-10 w-full max-w-5xl xl:max-w-6xl bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-10 border-2 border-slate-200 shadow-2xl animate-in fade-in duration-300 my-auto">
        <div className="flex items-center justify-between pb-5 border-b border-slate-200 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-lg">
              <UserCheck size={30} />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-sky-700 font-mono">
                电源已隔离 · 现场环境安全
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 m-0">黄金10秒人员状态评估</h2>
            </div>
          </div>
          <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold font-mono">
            {state.firstAidStep} / 3 步骤已完成
          </span>
        </div>

        {/* Professional Review Status Disclaimer */}
        <div className="w-full bg-amber-50 border border-amber-300 rounded-2xl p-3 sm:p-4 mb-5 text-left flex items-start gap-3">
          <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
            <strong>教学与实操审定提示（{firstAidConfig.reviewStatus === 'PENDING_PROFESSIONAL_REVIEW' ? '待学校专业人员复核审定' : '已审定'}）：</strong>
            {firstAidConfig.disclaimer}。屏幕模拟仅用于树立“查反应、速求援、查生命体征”的规程意识，不可代替线下实操培训与按压手法的专业考核。
          </div>
        </div>

        <div className="relative w-full h-52 sm:h-60 rounded-3xl bg-slate-900 border-3 border-slate-700 p-6 flex items-center justify-center mb-6 overflow-hidden shadow-inner">
          <div className="w-full max-w-lg"><TrainingPerson pose="lying" /></div>
        </div>

        <div className="space-y-3.5 mb-6">
          {assessmentSteps.map(({ id, label, detail, icon: Icon }, index) => {
            const isDone = index < state.firstAidStep;
            const isCurrent = index === state.firstAidStep;

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleAssessmentAction(id)}
                disabled={!isCurrent}
                className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 flex items-center justify-between transition-all select-none ${
                  isDone
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 opacity-90'
                    : isCurrent
                    ? 'bg-sky-50 border-sky-400 text-sky-950 shadow-md ring-2 ring-sky-300/40 cursor-pointer hover:bg-sky-100/80'
                    : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                  </div>
                  <div>
                    <strong className="block text-sm sm:text-base font-bold">{label}</strong>
                    <span className="text-xs text-slate-500 mt-0.5 block">{detail}</span>
                  </div>
                </div>

                {isDone ? (
                  <span className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full">
                    已核验完成
                  </span>
                ) : isCurrent && (
                  <span className="text-xs sm:text-sm font-bold text-sky-700 bg-sky-100 px-3 py-1.5 rounded-full">
                    点击执行该项判定
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Stage 2: FIRST_AID_ACTION (Standard CPR Chest Compression & Frequency Monitoring)
  const isPracticeDone = state.firstAidPracticeCount >= firstAidConfig.practiceActionsRequired;
  const progressPercent = Math.min(100, (state.firstAidPracticeCount / firstAidConfig.practiceActionsRequired) * 100);
  const pointerPercent = recentBpm ? Math.min(100, Math.max(0, ((recentBpm - 60) / 100) * 100)) : 50;

  return (
    <div className="relative z-10 w-full max-w-5xl xl:max-w-6xl bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-10 border-2 border-slate-200 shadow-2xl animate-in fade-in duration-300 my-auto">
      <div className="flex items-center justify-between pb-5 border-b border-slate-200 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg">
            <HeartPulse size={30} />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-rose-700 font-mono">
              急救规程指引 · 成人 CPR 30:2 心肺复苏模拟
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 m-0">胸外心脏按压与实时频率监测</h2>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end text-xs sm:text-sm font-mono font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200">
          <span>按压频率: {firstAidConfig.compressionRate}</span>
          <span>按压深度: {firstAidConfig.compressionDepth}</span>
        </div>
      </div>

      {/* Professional Review Status Disclaimer */}
      <div className="w-full bg-amber-50 border border-amber-300 rounded-2xl p-3 sm:p-4 mb-5 text-left flex items-start gap-3">
        <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
          <strong>教学与实操审定提示（{firstAidConfig.reviewStatus === 'PENDING_PROFESSIONAL_REVIEW' ? '待学校专业人员复核审定' : '已审定'}）：</strong>
          {firstAidConfig.disclaimer}。网页节奏练习无法反映胸骨下陷深度与回弹手法，不可作为急救资质或实操技能考核通过依据。
        </div>
      </div>

      <div className="relative w-full h-[520px] sm:h-[540px] rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-3 border-slate-700 p-5 sm:p-6 flex flex-col items-center justify-between shadow-2xl overflow-hidden mb-6">
        <div className="w-full flex items-center justify-between text-xs font-mono px-2 opacity-80">
          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
            <Activity size={14} className="animate-pulse" />
            ECG MONITOR · 110 BPM RHYTHM GUIDE
          </span>
          <span className="text-slate-400 hidden sm:inline">心肺复苏标准按压频率监测系统</span>
        </div>

        <div className="w-full max-w-2xl bg-slate-950/80 rounded-2xl border border-slate-700/80 p-3 sm:p-4 my-2 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-400 font-mono font-bold">实时按压频率:</span>
              <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                rhythmRating === 'PERFECT'
                  ? 'text-emerald-400'
                  : rhythmRating === 'TOO_SLOW'
                  ? 'text-amber-400'
                  : rhythmRating === 'TOO_FAST'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}>
                {recentBpm ? `${recentBpm} BPM` : '-- BPM'}
              </span>
              <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border font-mono ${
                rhythmRating === 'PERFECT'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : rhythmRating === 'TOO_SLOW'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : rhythmRating === 'TOO_FAST'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {rhythmRating === 'PERFECT'
                  ? '● 频率合规 (有效按压)'
                  : rhythmRating === 'TOO_SLOW'
                  ? '▲ 频率过慢 (未达标)'
                  : rhythmRating === 'TOO_FAST'
                  ? '▼ 频率过快 (未达标)'
                  : '○ 准备起拍'}
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMetronomeAudio(!metronomeAudio)}
                className="h-7 px-2.5 text-[11px] font-bold border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
                title="开启或关闭 110 BPM 节拍辅助音"
              >
                {metronomeAudio ? (
                  <Volume2 size={13} className="text-emerald-400 mr-1" />
                ) : (
                  <VolumeX size={13} className="text-slate-500 mr-1" />
                )}
                节拍音: {metronomeAudio ? '开启' : '静音'}
              </Button>
              {lastPressTime !== null && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleResetRhythm}
                  className="h-7 px-2 text-[11px] border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200"
                  title="重新定节拍"
                  aria-label="重新定节拍"
                >
                  <RotateCcw size={12} />
                </Button>
              )}
            </div>
          </div>

          <div className="relative pt-3 pb-1">
            {recentBpm && (
              <div
                className="absolute top-0 -translate-x-1/2 transition-all duration-150 flex flex-col items-center"
                style={{ left: `${pointerPercent}%` }}
              >
                <span className={`text-[10px] font-mono font-black ${
                  rhythmRating === 'PERFECT' ? 'text-emerald-400' : rhythmRating === 'TOO_SLOW' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  ▼
                </span>
              </div>
            )}

            <div className="w-full h-3.5 rounded-full bg-slate-800 overflow-hidden flex border border-slate-700 shadow-inner">
              <div className="w-[40%] h-full bg-gradient-to-r from-amber-600/70 to-amber-500/80 relative flex items-center px-2" title="60~100 BPM 偏慢">
                <span className="text-[9px] text-amber-100 font-mono font-bold">偏慢 (&lt;100)</span>
              </div>
              <div className="w-[20%] h-full bg-emerald-500 relative flex items-center justify-center shadow-lg shadow-emerald-500/50" title="100~120 BPM 标准心肺复苏区间">
                <span className="text-[9px] text-emerald-950 font-bold tracking-tighter">100~120 标准 ★</span>
              </div>
              <div className="w-[40%] h-full bg-gradient-to-r from-rose-500/80 to-rose-600/70 relative flex items-center justify-end px-2" title="120~160 BPM 偏快">
                <span className="text-[9px] text-rose-100 font-mono font-bold">偏快 (&gt;120)</span>
              </div>
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>60</span>
              <span className="text-emerald-400 font-bold">100 (起始线)</span>
              <span className="text-emerald-300 font-bold">110 (基准)</span>
              <span className="text-emerald-400 font-bold">120 (上限线)</span>
              <span>160 BPM</span>
            </div>
          </div>
        </div>

        <div className="cpr-practice-row">
          <div className="cpr-model"><TrainingPerson pose="cpr" action={chestDepression} /><span>按压练习模型 · 随操作下压 / 回弹</span></div>
        <div className="relative my-auto flex flex-col items-center">
          <div
            className={`absolute -inset-6 rounded-full border-4 pointer-events-none transition-all duration-150 ${
              metronomePulse
                ? 'border-rose-400/90 scale-110 opacity-100 shadow-[0_0_35px_#f43f5e]'
                : 'border-rose-500/20 scale-95 opacity-30'
            }`}
          />

          {rhythmRating === 'PERFECT' && (
            <div className="absolute -inset-10 rounded-full border-3 border-emerald-400/60 animate-ping pointer-events-none" />
          )}

          <button
            type="button"
            className={`group relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-150 select-none ${
              chestDepression
                ? 'scale-90 shadow-2xl'
                : 'scale-100 hover:scale-105 shadow-2xl'
            } ${
              rhythmRating === 'PERFECT'
                ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-300 shadow-[0_0_40px_rgba(16,185,129,0.6)]'
                : rhythmRating === 'TOO_SLOW'
                ? 'bg-amber-600 hover:bg-amber-500 border-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.6)]'
                : rhythmRating === 'TOO_FAST'
                ? 'bg-rose-700 hover:bg-rose-600 border-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.6)]'
                : 'bg-rose-600 hover:bg-rose-500 border-yellow-400'
            }`}
            onClick={handleCompress}
            aria-label="按压胸骨中下1/3进行心肺复苏"
          >
            <Heart
              size={40}
              className={`drop-shadow-md mb-1 transition-transform ${
                metronomePulse ? 'scale-120 text-yellow-200' : 'scale-100 text-white'
              }`}
            />
            <strong className="text-white font-mono text-2xl sm:text-3xl font-black">
              {state.firstAidPracticeCount}
              <span className="text-sm text-yellow-200">/{firstAidConfig.practiceActionsRequired}</span>
            </strong>
            <span className="text-[10px] font-bold text-yellow-200 uppercase mt-0.5">
              垂直下压 5-6cm
            </span>
          </button>

          <div className="mt-3 text-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono transition-all border ${
                rhythmRating === 'PERFECT'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
                  : rhythmRating === 'TOO_SLOW'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : rhythmRating === 'TOO_FAST'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {rhythmFeedback}
            </span>
          </div>
        </div>

        <div className="w-full max-w-xl bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2 flex items-center gap-3 my-2">
          <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            陈
          </div>
          <p className="text-xs text-slate-300 font-medium m-0 leading-relaxed">
            {rhythmRating === 'TOO_FAST' ? (
              <span className="text-rose-300 font-bold">陈师傅提醒：频率太快了！不要狂点鼠标！按得太急胸廓无法充分回弹，心脏腔室没有时间回血充盈，请放缓节奏。</span>
            ) : rhythmRating === 'TOO_SLOW' ? (
              <span className="text-amber-300 font-bold">陈师傅提醒：手速慢了！按压频率低于 100 次/分无法维持大脑与重要器官供血，请加快按压节奏！</span>
            ) : rhythmRating === 'PERFECT' ? (
              <span className="text-emerald-300 font-bold">陈师傅赞许：节拍非常标准！保持在 110 次/分左右，垂直向下 5~6cm 充分回弹，有效供血！</span>
            ) : (
              <span>陈师傅指引：成人心肺复苏按压频率标准为 100~120 次/分（基准 110 BPM）。跟随光圈脉冲均匀按压，系统已开启实时频率监测。</span>
            )}
          </p>
        </div>

        </div>
        <div className="w-full max-w-xl px-4">
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-300 font-mono mb-2">
            <span>有效达标按压（深度5~6cm · 充分回弹 · 频率合规）</span>
            <span className="text-emerald-400 font-bold">
              {state.firstAidPracticeCount} / {firstAidConfig.practiceActionsRequired} 次 ({Math.round(progressPercent)}%)
            </span>
          </div>
          <div className="w-full h-4 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 via-amber-400 to-emerald-500 transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-100 border border-slate-200 text-sm">
          <Wind size={22} className="text-sky-600 shrink-0" />
          <div>
            <strong className="text-slate-800 block font-bold text-base">气道开放（仰头抬颏）</strong>
            <span className="text-slate-500 text-xs">清除口腔异物，使气道保持通畅直线</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-100 border border-slate-200 text-sm">
          <Heart size={22} className="text-rose-600 shrink-0" />
          <div>
            <strong className="text-slate-800 block font-bold text-base">30:2 循环吹气2次</strong>
            <span className="text-slate-500 text-xs">{firstAidConfig.breathConfig}</span>
          </div>
        </div>
      </div>

      <Button
        size="lg"
        className={`w-full h-14 rounded-2xl text-lg font-bold shadow-xl transition-all ${
          isPracticeDone
            ? 'bg-sky-700 hover:bg-sky-800 text-white animate-bounce'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
        disabled={!isPracticeDone}
        onClick={() => {
          sounds.success();
          dispatch({ type: 'COMPLETE_FIRST_AID' });
        }}
      >
        {isPracticeDone ? '初级急救施救已完成 · 处置车间后续火情 →' : '请跟随屏幕节拍完成规定按压次数'}
      </Button>

      <p className="text-center text-[11px] text-slate-400 mt-3">
        {firstAidConfig.disclaimer}
      </p>
    </div>
  );
}
