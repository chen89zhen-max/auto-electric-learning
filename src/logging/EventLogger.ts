import type { EventAction, GameEvent } from '@/src/core/types';

const STORAGE_KEY = 'neev-training-sessions';

export class EventLogger {
  static createSessionId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  static createEvent(
    sessionId: string,
    levelId: string,
    stage: string,
    action: EventAction,
    payload: Record<string, unknown> = {},
  ): GameEvent {
    return { timestamp: new Date().toISOString(), sessionId, levelId, stage, action, payload };
  }

  static persist(events: GameEvent[]): void {
    if (typeof window === 'undefined' || events.length === 0) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const sessions = raw ? (JSON.parse(raw) as Record<string, GameEvent[]>) : {};
      sessions[events[0].sessionId] = events;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Local storage is a development convenience; gameplay must continue if unavailable.
    }
  }

  static download(events: GameEvent[]): void {
    if (typeof window === 'undefined') return;
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const levelId = events[0]?.levelId?.toLowerCase() ?? 'level';
    anchor.download = `${levelId}-session-${events[0]?.sessionId ?? 'empty'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
