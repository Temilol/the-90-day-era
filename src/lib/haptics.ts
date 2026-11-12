import { useUi } from '@/store/ui'

export function hapticsSupported() { return typeof navigator !== 'undefined' && 'vibrate' in navigator }

export function tap(pattern: number | number[] = 12) {
  try { if (useUi.getState().haptics && hapticsSupported()) navigator.vibrate(pattern) } catch { /* ignore */ }
}
