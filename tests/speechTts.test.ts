// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSpeechPreferences,
  updateSpeechPreferences,
  SPEECH_PREFERENCES_KEY,
} from '@/src/components/visuals/SpeechPreferences';
import { speakText, stopSpeaking } from '@/src/components/visuals/SpeechTts';

describe('SpeechPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides classroom-safe defaults with auto-read disabled by default', () => {
    const prefs = getSpeechPreferences();
    expect(prefs.autoRead).toBe(false); // Classroom noise control
    expect(prefs.muted).toBe(false);
    expect(prefs.volume).toBe(1.0);
    expect(prefs.rate).toBe(1.0);
  });

  it('persists and updates preferences to localStorage', () => {
    updateSpeechPreferences({ autoRead: true, volume: 0.8, rate: 1.2 });
    const stored = JSON.parse(localStorage.getItem(SPEECH_PREFERENCES_KEY) || '{}');
    expect(stored.autoRead).toBe(true);
    expect(stored.volume).toBe(0.8);
    expect(stored.rate).toBe(1.2);

    const loaded = getSpeechPreferences();
    expect(loaded.autoRead).toBe(true);
    expect(loaded.volume).toBe(0.8);
    expect(loaded.rate).toBe(1.2);
  });

  it('gracefully handles corrupted JSON in localStorage', () => {
    localStorage.setItem(SPEECH_PREFERENCES_KEY, 'invalid json');
    const prefs = getSpeechPreferences();
    expect(prefs.autoRead).toBe(false);
    expect(prefs.volume).toBe(1.0);
  });
});

describe('SpeechTts', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    if (typeof SpeechSynthesisUtterance === 'undefined') {
      // @ts-expect-error Mocking SpeechSynthesisUtterance for jsdom
      globalThis.SpeechSynthesisUtterance = class {
        text: string;
        lang = '';
        rate = 1;
        pitch = 1;
        volume = 1;
        voice: SpeechSynthesisVoice | null = null;
        onend: (() => void) | null = null;
        onerror: ((err: unknown) => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      };
    }
  });

  it('returns unsupported when window.speechSynthesis is not available', () => {
    const originalSpeechSynthesis = window.speechSynthesis;
    // @ts-expect-error simulating unsupported environment
    delete window.speechSynthesis;

    const result = speakText('测试语音');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unsupported');
    }

    window.speechSynthesis = originalSpeechSynthesis;
  });

  it('returns blocked when muted in preferences', () => {
    updateSpeechPreferences({ muted: true });
    const mockSpeak = vi.fn();
    const mockCancel = vi.fn();
    window.speechSynthesis = {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: () => [],
      speaking: false,
      paused: false,
      pending: false,
      onvoiceschanged: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
    } as unknown as SpeechSynthesis;

    const result = speakText('测试语音');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('blocked');
    }
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('speaks text when synthesis is available and cleans markdown tokens', () => {
    const mockSpeak = vi.fn();
    const mockCancel = vi.fn();
    window.speechSynthesis = {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: () => [
        {
          name: 'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)',
          lang: 'zh-CN',
          default: true,
          localService: false,
          voiceURI: 'Xiaoxiao',
        } as SpeechSynthesisVoice,
      ],
      speaking: false,
      paused: false,
      pending: false,
      onvoiceschanged: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
    } as unknown as SpeechSynthesis;

    const result = speakText('**注意**：`0.2V` 是*参考值*！');
    expect(result.ok).toBe(true);
    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalled();

    const utterance = mockSpeak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.text).not.toContain('*');
    expect(utterance.text).not.toContain('`');
    expect(utterance.lang).toBe('zh-CN');
  });

  it('stopSpeaking safely cancels current speech', () => {
    const mockCancel = vi.fn();
    window.speechSynthesis = {
      cancel: mockCancel,
    } as unknown as SpeechSynthesis;

    stopSpeaking();
    expect(mockCancel).toHaveBeenCalled();
  });
});
