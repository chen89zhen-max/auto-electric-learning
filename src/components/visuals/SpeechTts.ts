/**
 * TTS (Text-to-Speech) helper for Master Chen audio narration.
 * Uses Web Speech API (window.speechSynthesis) with graceful fallbacks.
 */

function getPreferredVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  // Look for Chinese voice (zh-CN, zh-HK, zh-TW, etc.)
  const zhVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith('zh') ||
      v.name.includes('Chinese') ||
      v.name.includes('Xiaoxiao') ||
      v.name.includes('Yunxi')
  );
  return zhVoice || null;
}

export function speakText(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel();

    // Clean text of markdown tokens, brackets, quotes for natural speech
    const clean = text
      .replace(/[*_#`~]/g, '')
      .replace(/[“”"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voice = getPreferredVoice();
    if (voice) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // Gracefully handle browser speech restrictions
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
