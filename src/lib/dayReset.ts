import type { EraState, ShiftType } from './types'
import { addDays, parseKey, toKey } from './dates'

/**
 * When a day hands over to the next one, in minutes after midnight. A day that was a night shift
 * can run into the next morning, so it has its own time.
 */
export interface ResetTimes { day: number; night: number }

/** The latest a reset can be: noon. Later than that and "today" would stop meaning anything. */
export const MAX_RESET = 12 * 60
export const RESET_STEP = 30
export const RESET_CHOICES = Array.from({ length: MAX_RESET / RESET_STEP + 1 }, (_, i) => i * RESET_STEP)

const clean = (v: unknown, fallback: number) => (typeof v === 'number' && isFinite(v) ? Math.min(MAX_RESET, Math.max(0, Math.round(v))) : fallback)

export function resetTimes(profile: Pick<EraState['profile'], 'dayReset' | 'nightReset'>): ResetTimes {
  const day = clean(profile.dayReset, 0)
  return { day, night: clean(profile.nightReset, day) }
}

type ShiftOf = (date: string) => ShiftType | undefined

/** The clock time on the following morning at which the given day ends. */
export const resetFor = (shift: ShiftType | undefined, r: ResetTimes) => (shift === 'night' ? r.night : r.day)

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes()

/**
 * Which day a moment belongs to. Each day ends at its own reset time on the following calendar
 * day, and the next day starts at that same moment, so there are no gaps and no overlaps.
 */
export function appDay(now: Date, r: ResetTimes, shiftOf: ShiftOf): string {
  const today = toKey(now)
  const before = addDays(today, -1)
  return minutesOf(now) < resetFor(shiftOf(before), r) ? before : today
}

/** The moment the given day ends. */
export function dayEnd(date: string, r: ResetTimes, shiftOf: ShiftOf): Date {
  const t = parseKey(addDays(date, 1))
  t.setHours(0, resetFor(shiftOf(date), r), 0, 0)
  return t
}

/** Minutes since midnight at the start of the given day. Past 1,440 once the calendar has moved on. */
export function minutesInto(date: string, now: Date): number {
  return Math.round((now.getTime() - parseKey(date).getTime()) / 60_000)
}

/** Set while the calendar has moved on but the day in progress has not ended yet. */
export function carryOver(now: Date, r: ResetTimes, shiftOf: ShiftOf): { date: string; shift: ShiftType | undefined; resetAt: number } | null {
  const date = appDay(now, r, shiftOf)
  if (date === toKey(now)) return null
  const shift = shiftOf(date)
  return { date, shift, resetAt: resetFor(shift, r) }
}
