/**
 * Format minutes into a human-readable time string.
 * e.g. 45 → "45 min", 60 → "1h", 90 → "1h 30m", 270 → "4h 30m"
 */
export function formatTime(minutes: number): string {
  if (minutes <= 0) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
