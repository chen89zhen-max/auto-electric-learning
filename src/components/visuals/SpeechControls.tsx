'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Settings2, Square } from 'lucide-react';
import {
  getSpeechPreferences,
  updateSpeechPreferences,
  type SpeechPreferences,
} from './SpeechPreferences';
import { speakText, stopSpeaking, isSpeechSupported } from './SpeechTts';

interface SpeechControlsProps {
  currentText: string;
  className?: string;
}

export function SpeechControls({ currentText, className = '' }: SpeechControlsProps) {
  const [prefs, setPrefs] = useState<SpeechPreferences>(getSpeechPreferences());
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [unsupportedNotice, setUnsupportedNotice] = useState<boolean>(false);

  useEffect(() => {
    // When text changes, if autoRead is ON, speak automatically
    const currentPrefs = getSpeechPreferences();
    if (currentPrefs.autoRead && !currentPrefs.muted && currentText) {
      const res = speakText(currentText, {
        isAuto: true,
        onEnd: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
      if (res.ok) {
        queueMicrotask(() => setIsPlaying(true));
      }
    } else {
      stopSpeaking();
      queueMicrotask(() => setIsPlaying(false));
    }

    return () => {
      stopSpeaking();
    };
  }, [currentText]);

  const handlePlayOrReplay = () => {
    if (!isSpeechSupported()) {
      setUnsupportedNotice(true);
      setTimeout(() => setUnsupportedNotice(false), 4000);
      return;
    }

    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }

    // Force play regardless of autoRead preference when student manually triggers
    const res = speakText(currentText, {
      isAuto: false,
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });

    if (res.ok) {
      setIsPlaying(true);
    } else if (res.reason === 'blocked') {
      // Unmute if student clicked play while muted
      const updated = updateSpeechPreferences({ muted: false });
      setPrefs(updated);
      const retryRes = speakText(currentText, {
        isAuto: false,
        onEnd: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
      if (retryRes.ok) setIsPlaying(true);
    } else if (res.reason === 'unsupported') {
      setUnsupportedNotice(true);
      setTimeout(() => setUnsupportedNotice(false), 4000);
    }
  };

  const handleStop = () => {
    stopSpeaking();
    setIsPlaying(false);
  };

  const toggleMute = () => {
    const updated = updateSpeechPreferences({ muted: !prefs.muted });
    setPrefs(updated);
    if (updated.muted) {
      stopSpeaking();
      setIsPlaying(false);
    }
  };

  const toggleAutoRead = () => {
    const updated = updateSpeechPreferences({ autoRead: !prefs.autoRead });
    setPrefs(updated);
  };

  const setRate = (rate: number) => {
    const updated = updateSpeechPreferences({ rate });
    setPrefs(updated);
  };

  return (
    <div
      data-testid="speech-controls"
      className={`relative inline-flex items-center gap-1.5 ${className}`}
    >
      {/* Play / Replay button */}
      <button
        type="button"
        data-testid="speech-play-btn"
        onClick={handlePlayOrReplay}
        title={isPlaying ? '停止朗读' : '朗读陈师傅讲解'}
        aria-label={isPlaying ? '停止朗读' : '朗读陈师傅讲解'}
        className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-sm font-semibold ${
          isPlaying
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
        }`}
      >
        {isPlaying ? <Square size={16} className="fill-amber-400" /> : <Volume2 size={16} />}
        <span className="hidden sm:inline">{isPlaying ? '正在朗读' : '朗读'}</span>
      </button>

      {/* Stop button (visible when playing) */}
      {isPlaying && (
        <button
          type="button"
          data-testid="speech-stop-btn"
          onClick={handleStop}
          title="停止播放"
          aria-label="停止播放"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 border border-slate-700 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
        >
          <Square size={16} />
        </button>
      )}

      {/* Quick Mute button */}
      <button
        type="button"
        data-testid="speech-mute-btn"
        onClick={toggleMute}
        title={prefs.muted ? '取消静音' : '快速静音'}
        aria-label={prefs.muted ? '取消静音' : '快速静音'}
        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
          prefs.muted
            ? 'bg-rose-950/40 border-rose-800/60 text-rose-400'
            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400'
        }`}
      >
        {prefs.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      {/* Settings toggle */}
      <button
        type="button"
        data-testid="speech-settings-btn"
        onClick={() => setShowSettings((v) => !v)}
        title="语音设置（机房防吵与语速）"
        aria-label="语音设置"
        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
          showSettings
            ? 'bg-amber-600/30 border-amber-500/50 text-amber-300'
            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400'
        }`}
      >
        <Settings2 size={16} />
      </button>

      {/* Non-blocking unsupported toast */}
      {unsupportedNotice && (
        <output
          data-testid="unsupported-speech-toast"
          aria-live="polite"
          className="absolute top-full mt-2 left-0 z-50 bg-slate-900 border border-amber-500/40 text-amber-200 text-xs px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap block"
        >
          当前浏览器不支持语音合成，已保持文字指引。
        </output>
      )}

      {/* Settings popup modal/dropdown */}
      {showSettings && (
        <div className="absolute top-full mt-2 right-0 z-50 w-64 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-slate-200 text-sm flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-bold text-slate-100">课堂语音设置</span>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Auto read switch */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-200">自动朗读关卡指引</div>
              <div className="text-xs text-slate-400">机房防吵：建议默认关闭</div>
            </div>
            <button
              type="button"
              data-testid="auto-read-toggle"
              onClick={toggleAutoRead}
              className={`px-2.5 py-1 rounded text-sm font-bold transition-colors cursor-pointer ${
                prefs.autoRead
                  ? 'bg-amber-600 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {prefs.autoRead ? '已开启' : '关闭'}
            </button>
          </div>

          {/* Mute switch */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-200">全局静音</span>
            <button
              type="button"
              data-testid="mute-toggle"
              onClick={toggleMute}
              className={`px-2.5 py-1 rounded text-sm font-bold transition-colors cursor-pointer ${
                prefs.muted
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {prefs.muted ? '静音中' : '正常'}
            </button>
          </div>

          {/* Rate selector */}
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-slate-200">讲解语速</span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: '0.8x 慢速', val: 0.8 },
                { label: '1.0x 标准', val: 1.0 },
                { label: '1.2x 快速', val: 1.2 },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setRate(item.val)}
                  className={`py-1 rounded text-center text-sm font-semibold transition-colors cursor-pointer ${
                    prefs.rate === item.val
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
