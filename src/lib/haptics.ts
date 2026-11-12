export function tap(pattern: number | number[] = 12) {
  try { if ('vibrate' in navigator) navigator.vibrate(pattern) } catch { /* ignore */ }
}
