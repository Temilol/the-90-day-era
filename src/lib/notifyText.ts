import type { PushStatus } from '@/store/push'

/** One short line on whether reminders reach this phone, for menus and summaries. */
export function pushSummary(status: PushStatus): { text: string; ok: boolean } {
  switch (status) {
    case 'on': return { text: 'On for this phone', ok: true }
    case 'off': return { text: 'Off on this phone', ok: false }
    case 'blocked': return { text: 'Blocked in this phone’s settings', ok: false }
    case 'signed-out': return { text: 'Sign in to turn them on', ok: false }
    case 'needs-install': return { text: 'Add the app to your Home Screen first', ok: false }
    case 'unsupported': return { text: 'Not available in this browser', ok: false }
    default: return { text: 'Shown while the app is open', ok: true }
  }
}

/** "16:00" as "4 PM", "07:30" as "7:30 AM". */
export function clockLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const hour = ((h || 0) % 24 + 24) % 24
  return `${hour % 12 === 0 ? 12 : hour % 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${hour < 12 ? 'AM' : 'PM'}`
}
