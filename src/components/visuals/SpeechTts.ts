import { getSpeechPreferences } from './SpeechPreferences';

/**
 * TTS (Text-to-Speech) helper for Master Chen audio narration.
 * Uses Web Speech API (window.speechSynthesis) with classroom controls and graceful fallbacks.
 */

export type SpeechResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'blocked' | 'no_voice' | 'error' };

export interface SpeakOptions {
  isAuto?: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  if (typeof window.speechSynthesis.addEventListener === 'function') {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      cachedVoices = window.speechSynthesis.getVoices();
    });
  } else if ('onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  }
}

function getPreferredVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return null;
  }

  // 1. Select zh-CN first
  const zhCnVoice = voices.find((v) => v.lang.toLowerCase() === 'zh-cn');
  if (zhCnVoice) return zhCnVoice;

  // 2. Select other Chinese voices second (zh-HK, zh-TW, Xiaoxiao, Yunxi, etc.)
  const anyZhVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith('zh') ||
      v.name.includes('Chinese') ||
      v.name.includes('Xiaoxiao') ||
      v.name.includes('Yunxi')
  );
  return anyZhVoice || voices[0] || null;
}

export function speakText(text: string, options?: SpeakOptions): SpeechResult {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  const prefs = getSpeechPreferences();

  if (prefs.muted) {
    return { ok: false, reason: 'blocked' };
  }

  if (options?.isAuto && !prefs.autoRead) {
    return { ok: false, reason: 'blocked' };
  }

  try {
    window.speechSynthesis.cancel();

    // Clean text of markdown tokens, brackets, quotes for natural speech
    const clean = text
      .replace(/[*_#`~]/g, '')
      .replace(/[“”"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) {
      return { ok: false, reason: 'error' };
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'zh-CN';
    utterance.rate = options?.rate ?? prefs.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? prefs.volume ?? 1.0;

    const voice = getPreferredVoice();
    if (voice) {
      utterance.voice = voice;
    }

    if (options?.onEnd) {
      utterance.onend = () => options.onEnd?.();
    }
    if (options?.onError) {
      utterance.onerror = (e) => options.onError?.(e);
    }

    window.speechSynthesis.speak(utterance);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore errors on cancel
    }
  }
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
