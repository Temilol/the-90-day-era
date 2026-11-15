import type { DayLog, EraState } from './types'
import { addDays, dayNumber, parseKey, TOTAL_DAYS } from './dates'
import { planFor, usualWalkTime, clock, toMinutes, workHours } from './walkPlan'
import { waterSettings, fromMl } from './water'
import { appDay, resetFor, resetTimes } from './dayReset'

/** A reminder waiting to be delivered to the phone, as an exact moment in time. */
export interface QueuedReminder { fire_at: string; title: string; body: string; url: string }

export const WINDOW_LEAD_MINUTES = 15
const CUSTOM_BODY = 'Incline 12 · 3 mph · 30 min. Or a shorter one, your call.'

/**
 * When to check on water, as [minutes after midnight, share of the goal expected by then].
 * On a work day it is a third and two thirds of the way through the shift, as long as that falls
 * before the day ends (`dayEnds`, which is past 1,440 when the day runs into the next morning).
 * Otherwise it is midday and late afternoon.
 */
function nudgeTimes(d: DayLog | undefined, dayEnds: number): [number, number][] {
  const work = workHours(d?.shift, d?.hours)
  if (!work) return [[12 * 60, 1 / 3], [17 * 60, 2 / 3]]
  const length = work.end > work.start ? work.end - work.start : work.end + 1440 - work.start
  return ([[work.start + length / 3, 1 / 3], [work.start + (2 * length) / 3, 2 / 3]] as [number, number][]).filter(([m]) => m < dayEnds)
}

/**
 * Every reminder due over the coming days: one shortly before each walk window, plus the person's
 * own reminders on days whose shift matches. Days that already have a walk or a rest day get none.
 */
export function buildReminderQueue(s: EraState, now: Date, daysAhead = 7): QueuedReminder[] {
  const start = s.profile.startDate
  if (!start) return []
  const out: QueuedReminder[] = []
  const reset = resetTimes(s.profile)
  // Start from the day in progress, which is yesterday's date while a night shift is still running.
  const today = appDay(now, reset, (date) => s.days[date]?.shift)
  const usualByShift = new Map<string, number | null>()
  const water = waterSettings(s.profile)
  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(today, i)
    const n = dayNumber(start, date)
    if (n < 1 || n > TOTAL_DAYS) continue
    const d = s.days[date]
    const at = (minutes: number) => { const t = parseKey(date); t.setHours(0, minutes, 0, 0); return t }
    const add = (minutes: number, title: string, body: string) => {
      const when = at(minutes)
      if (when.getTime() > now.getTime()) out.push({ fire_at: when.toISOString(), title, body, url: '/today' })
    }
    // Hydration: two check-ins a day, each only if she is behind where the goal says she should be by then.
    if (water.nudges && !d?.quests?.hydrate) {
      for (const [minutes, share] of nudgeTimes(d, 1440 + resetFor(d?.shift, reset))) {
        const target = water.goalMl * share
        if ((d?.water ?? 0) + 0.5 < target) add(minutes, 'Water check', `Aim for about ${fromMl(target, water.unit)} ${water.unit} by now. You’re at ${fromMl(d?.water ?? 0, water.unit)}.`)
      }
    }
    if (d?.workout || d?.recovery) continue
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
