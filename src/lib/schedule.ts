import type { DayLog, ShiftHours, ShiftType } from './types'
import { addDays } from './dates'

export interface FillOptions { from: string; to: string; pattern: ShiftType[]; hours?: ShiftHours; keepMine: boolean }
/** One day of a schedule fill. `kept` means the day is left exactly as it is. */
export interface FillDay { date: string; shift: ShiftType | undefined; kept: boolean }

export const MAX_FILL_DAYS = 200

/**
 * Works out what filling a run of dates with a repeating pattern would do, without changing anything.
 * Days set by hand are kept when asked, and a day with a walk or rest already logged always keeps
 * the shift it was logged under.
 */
export function planFill(days: Record<string, DayLog>, o: FillOptions): FillDay[] {
  const out: FillDay[] = []
  if (!o.pattern.length || o.to < o.from) return out
  let i = 0
  for (let date = o.from; date <= o.to && i < MAX_FILL_DAYS; date = addDays(date, 1), i++) {
    const existing = days[date]
    const mine = !!existing?.shift && existing.shiftSet !== 'plan'
    const logged = !!existing?.shift && (!!existing.workout || !!existing.recovery)
    if ((o.keepMine && mine) || logged) out.push({ date, shift: existing!.shift, kept: true })
    else out.push({ date, shift: o.pattern[i % o.pattern.length], kept: false })
  }
  return out
}
