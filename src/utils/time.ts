export function formatMMSS(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function formatRelativeTimeAgo(dateInput?: string | number): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'number' ? new Date(dateInput) : new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return formatRelativeTime(date.toISOString());
}

export function formatActivityElapsedTime(timestamps?: { start?: number; end?: number }): string {
  if (!timestamps) return '';

  if (timestamps.start && timestamps.end) {
    const currentPos = Math.max(0, Date.now() - timestamps.start);
    const totalDuration = timestamps.end - timestamps.start;
    const currentTime = formatMMSS(currentPos);
    const totalTime = formatMMSS(totalDuration);

    const progress = Math.min(1, Math.max(0, currentPos / totalDuration));
    const barLength = 8;
    const dotPos = Math.round(progress * barLength);
    const leftDashes = '─'.repeat(dotPos);
    const rightDashes = '─'.repeat(barLength - dotPos);

    return `${currentTime} ${leftDashes}●${rightDashes} ${totalTime}`;
  }

  if (timestamps.start) {
    const diffSec = Math.max(0, Math.floor((Date.now() - timestamps.start) / 1000));
    const mins = Math.floor(diffSec / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return hrs > 0 ? `${hrs}h ${remMins}m elapsed` : `${mins}m elapsed`;
  }

  return '';
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) {
    return `${hrs}h ${remMins}m`;
  }
  return `${mins}m`;
}
