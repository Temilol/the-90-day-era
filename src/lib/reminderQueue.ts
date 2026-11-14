import type { EraState } from './types'
import { addDays, dayNumber, parseKey, toKey, TOTAL_DAYS } from './dates'
import { planFor, usualWalkTime, clock, toMinutes } from './walkPlan'

/** A reminder waiting to be delivered to the phone, as an exact moment in time. */
export interface QueuedReminder { fire_at: string; title: string; body: string; url: string }

export const WINDOW_LEAD_MINUTES = 15
const CUSTOM_BODY = 'Incline 12 · 3 mph · 30 min. Or a shorter one, your call.'

/**
 * Every reminder due over the coming days: one shortly before each walk window, plus the person's
 * own reminders on days whose shift matches. Days that already have a walk or a rest day get none.
 */
export function buildReminderQueue(s: EraState, now: Date, daysAhead = 7): QueuedReminder[] {
  const start = s.profile.startDate
  if (!start) return []
  const out: QueuedReminder[] = []
  const today = toKey(now)
  const usualByShift = new Map<string, number | null>()
  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(today, i)
    const n = dayNumber(start, date)
    if (n < 1 || n > TOTAL_DAYS) continue
    const d = s.days[date]
    if (d?.workout || d?.recovery) continue
    const at = (minutes: number) => { const t = parseKey(date); t.setHours(0, minutes, 0, 0); return t }
    const add = (minutes: number, title: string, body: string) => {
      const when = at(minutes)
      if (when.getTime() > now.getTime()) out.push({ fire_at: when.toISOString(), title, body, url: '/today' })
    }
    if (s.profile.walkReminders !== false && d?.shift) {
      if (!usualByShift.has(d.shift)) usualByShift.set(d.shift, usualWalkTime(s.days, d.shift))
      for (const w of planFor(d.shift, d.hours, usualByShift.get(d.shift)).windows) {
        add(w.start - WINDOW_LEAD_MINUTES, `Walk window opens at ${clock(w.start)}`, `${w.label}, Day ${n}. Open until ${clock(w.end)}. A shorter walk counts too.`)
      }
    }
    for (const r of s.reminders ?? []) {
      if (!r.enabled) continue
      if (d?.shift && r.shifts.length && !r.shifts.includes(d.shift)) continue
      add(toMinutes(r.time), r.label, CUSTOM_BODY)
    }
  }
  return out.sort((a, b) => a.fire_at.localeCompare(b.fire_at)).slice(0, 80)
}
