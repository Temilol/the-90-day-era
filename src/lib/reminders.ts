import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { useUi } from '@/store/ui'
import { todayKey } from './dates'
import { pushOnHere } from '@/store/push'

export function notificationsSupported() { return typeof Notification !== 'undefined' }
export async function requestNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.requestPermission()
}

/** Fires enabled reminders that match today's logged shift (or any shift if none logged) while the app is open. */
export function useReminders() {
  useEffect(() => {
    const fired = new Set<string>()
    const tick = () => {
      const s = useStore.getState()
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const today = todayKey()
      const shift = s.days[today]?.shift
      for (const r of s.reminders) {
        if (!r.enabled || r.time !== hhmm) continue
        if (shift && r.shifts.length && !r.shifts.includes(shift)) continue
        const key = `${today}:${r.id}`
        if (fired.has(key)) continue
        fired.add(key)
        const body = 'Incline 12 · 3 mph · 30 min. Or a shorter one, your call.'
        // With push on, the same reminder arrives from the server, so don't show it twice.
        if (!pushOnHere() && notificationsSupported() && Notification.permission === 'granted') {
          try { new Notification(r.label, { body, icon: '/icons/icon-192.png' }) } catch { /* ignore */ }
        }
        useUi.getState().pushToast({ title: r.label, sub: body, kind: 'info' })
      }
    }
    tick()
    const i = setInterval(tick, 20_000)
    return () => clearInterval(i)
  }, [])
}
