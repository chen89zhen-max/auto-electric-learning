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

export const DEFAULT_MALE_PITCH = 0.88;
export const DEFAULT_MALE_RATE = 0.98;

let cachedVoices: SpeechSynthesisVoice[] = [];
let lockedPreferredVoice: SpeechSynthesisVoice | null = null;

function hasSpeechSynthesis(): boolean {
  return typeof window !== 'undefined'
    && typeof window.speechSynthesis !== 'undefined'
    && typeof window.speechSynthesis.speak === 'function';
}

function updateVoices(): void {
  if (!hasSpeechSynthesis()) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
    lockedPreferredVoice = findMiddleAgedMaleVoice(voices);
  }
}

if (hasSpeechSynthesis()) {
  updateVoices();
  if (typeof window.speechSynthesis.addEventListener === 'function') {
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
  } else if ('onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }
}

/**
 * Searches and prioritizes Chinese middle-aged male voices (中年男声，稳重沉着，大师傅风范)
 */
function findMiddleAgedMaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // Filter for Chinese voices first
  const zhVoices = voices.filter((v) => {
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    return (
      lang.includes('zh') ||
      lang.includes('cmn') ||
      name.includes('chinese') ||
      name.includes('中文') ||
      name.includes('普通话')
    );
  });

  const candidates = zhVoices.length > 0 ? zhVoices : voices;

  // Priority 1: Yunyang (云扬) - Middle-aged mature broadcaster male (Windows / Edge flagship male voice)
  const yunyang = candidates.find((v) => /yunyang|云扬/i.test(v.name));
  if (yunyang) return yunyang;

  // Priority 2: Yunjian (云健) - Mature male
  const yunjian = candidates.find((v) => /yunjian|云健/i.test(v.name));
  if (yunjian) return yunjian;

  // Priority 3: Kangkang (康康) - Windows native offline male
  const kangkang = candidates.find((v) => /kangkang|康康/i.test(v.name));
  if (kangkang) return kangkang;

  // Priority 4: Yunxi (云希) - Male
  const yunxi = candidates.find((v) => /yunxi|云希/i.test(v.name));
  if (yunxi) return yunxi;

  // Priority 5: Any explicit male voice, excluding known female keywords
  const explicitMale = candidates.find((v) => {
    const name = v.name.toLowerCase();
    const hasMale = /male|man|boy|男|nan|danny|zhiwei|sinji|li-mu/i.test(name);
    const hasFemale = /female|女|nv|xiaoxiao|huihui|yaoyao|xiaoyi|tingting|meijia|shanchan|xiaomo/i.test(name);
    return hasMale && !hasFemale;
  });
  if (explicitMale) return explicitMale;

  // Priority 6: Chinese voice that is NOT explicitly female
  const nonFemale = candidates.find((v) => {
    const name = v.name.toLowerCase();
    return !/female|女|nv|xiaoxiao|huihui|yaoyao|xiaoyi|tingting|meijia|shanchan|xiaomo/i.test(name);
  });
  if (nonFemale) return nonFemale;

  // Priority 7: zh-CN voice
  const zhCn = candidates.find((v) => (v.lang || '').toLowerCase() === 'zh-cn');
  if (zhCn) return zhCn;

  return candidates[0] || null;
}

export function getPreferredVoice(): SpeechSynthesisVoice | null {
  if (!hasSpeechSynthesis()) {
    return null;
  }
  if (lockedPreferredVoice) {
    return lockedPreferredVoice;
  }
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  lockedPreferredVoice = findMiddleAgedMaleVoice(voices);
  return lockedPreferredVoice;
}

export function speakText(text: string, options?: SpeakOptions): SpeechResult {
  if (!hasSpeechSynthesis()) {
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
    utterance.rate = options?.rate ?? prefs.rate ?? DEFAULT_MALE_RATE;
    // Default to middle-aged male pitch (0.88: resonant, deep, steady Master Chen tone)
    utterance.pitch = options?.pitch ?? DEFAULT_MALE_PITCH;
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
  if (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.speechSynthesis.cancel === 'function'
  ) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore errors on cancel
    }
  }
}

export function isSpeechSupported(): boolean {
  return hasSpeechSynthesis();
}

export { findMiddleAgedMaleVoice };

export function resetVoiceCache(): void {
  cachedVoices = [];
  lockedPreferredVoice = null;
}
