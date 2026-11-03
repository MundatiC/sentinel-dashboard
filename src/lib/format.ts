const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** "2026-03-02 10:03:30" in UTC. Security timelines are compared across systems, so we always show UTC. */
export function formatTimestamp(iso: string, withMillis = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return withMillis ? `${base}.${pad(d.getUTCMilliseconds(), 3)}` : base;
}

/** "4s ago", "12m ago", "3h ago", "2d ago". */
export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(seconds)) return iso;
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n);
