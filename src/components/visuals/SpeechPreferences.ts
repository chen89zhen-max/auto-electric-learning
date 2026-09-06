export interface SpeechPreferences {
  autoRead: boolean;
  muted: boolean;
  volume: number; // 0.0 to 1.0
  rate: number; // 0.5 to 2.0
}

export const SPEECH_PREFERENCES_KEY = 'auto_elec_speech_preferences';

export const DEFAULT_SPEECH_PREFERENCES: SpeechPreferences = {
  autoRead: false, // Classroom noise control: default auto-read is OFF
  muted: false,
  volume: 1.0,
  rate: 1.0,
};

export function getSpeechPreferences(): SpeechPreferences {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { ...DEFAULT_SPEECH_PREFERENCES };
  }

  try {
    const raw = localStorage.getItem(SPEECH_PREFERENCES_KEY);
    if (!raw) return { ...DEFAULT_SPEECH_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<SpeechPreferences>;
    return {
      autoRead: typeof parsed.autoRead === 'boolean' ? parsed.autoRead : DEFAULT_SPEECH_PREFERENCES.autoRead,
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_SPEECH_PREFERENCES.muted,
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULT_SPEECH_PREFERENCES.volume,
      rate: typeof parsed.rate === 'number' ? Math.max(0.5, Math.min(2, parsed.rate)) : DEFAULT_SPEECH_PREFERENCES.rate,
    };
  } catch {
    return { ...DEFAULT_SPEECH_PREFERENCES };
  }
}

export function saveSpeechPreferences(prefs: SpeechPreferences): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SPEECH_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota or disabled localStorage errors
  }
}

export function updateSpeechPreferences(partial: Partial<SpeechPreferences>): SpeechPreferences {
  const current = getSpeechPreferences();
  const updated: SpeechPreferences = {
    ...current,
    ...partial,
  };
  saveSpeechPreferences(updated);
  return updated;
}

export function resetSpeechPreferences(): SpeechPreferences {
  saveSpeechPreferences(DEFAULT_SPEECH_PREFERENCES);
  return { ...DEFAULT_SPEECH_PREFERENCES };
}
