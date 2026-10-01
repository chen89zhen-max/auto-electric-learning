export function formatDurationMs(durationMs: number): string {
  const safeMs = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes === 0) return `${totalSeconds} 秒`;
  return `${minutes} 分 ${String(totalSeconds % 60).padStart(2, '0')} 秒`;
}

export function formatDateTimeSeconds(value: string | number): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
