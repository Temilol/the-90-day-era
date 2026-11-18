import type { DayLog } from './types'
import { dayNumber, parseKey, TOTAL_DAYS } from './dates'
import { journalLength, JOURNAL_MIN_CHARS } from './journal'

/** The challenge days that have happened so far, in date order. */
function challengeLogs(days: Record<string, DayLog>, startDate: string | null, today: string): DayLog[] {
  if (!startDate) return []
  return Object.values(days)
    .filter((d) => { const n = dayNumber(startDate, d.date); return n >= 1 && n <= TOTAL_DAYS && d.date <= today })
    .sort((a, b) => a.date.localeCompare(b.date))
}
const walks = (logs: DayLog[]) => logs.filter((d) => d.workout && d.workout.minutes >= 5)

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export const WEEKDAY_NAMES = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'] as const

/** Walks on each weekday, Monday first. */
export function walksByWeekday(days: Record<string, DayLog>, startDate: string | null, today: string): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0]
  for (const d of walks(challengeLogs(days, startDate, today))) out[(parseKey(d.date).getDay() + 6) % 7]++
  return out
}

export const LENGTH_BUCKETS = [
  { id: 'short', label: '5 to 10 min', phrase: '5 to 10 minutes', min: 5, max: 10 },
  { id: 'medium', label: '11 to 20 min', phrase: '11 to 20 minutes', min: 11, max: 20 },
  { id: 'full', label: '21 to 30 min', phrase: '21 to 30 minutes', min: 21, max: 30 },
  { id: 'long', label: 'Over 30 min', phrase: 'over 30 minutes', min: 31, max: Infinity },
] as const

/** How many walks fall in each length bucket. */
export function walkLengthMix(days: Record<string, DayLog>, startDate: string | null, today: string): number[] {
  const out = LENGTH_BUCKETS.map(() => 0)
  for (const d of walks(challengeLogs(days, startDate, today))) {
    const i = LENGTH_BUCKETS.findIndex((b) => d.workout!.minutes >= b.min && d.workout!.minutes <= b.max)
    // Minutes can be fractional; anything between whole buckets goes with the shorter one.
    out[i >= 0 ? i : LENGTH_BUCKETS.findIndex((b) => d.workout!.minutes < b.max + 1)]++
  }
  return out
}

/** Walks per theme, most used first. Ties keep the order of the theme list. */
export function themeCounts(days: Record<string, DayLog>, startDate: string | null, today: string, order: string[]): { id: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const d of walks(challengeLogs(days, startDate, today))) { const t = d.workout!.theme; if (t && order.includes(t)) counts.set(t, (counts.get(t) ?? 0) + 1) }
  return [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || order.indexOf(a.id) - order.indexOf(b.id))
}

export interface ActivityRow { name: string; minutes: number; sessions: number }
/** Other activities grouped by name, ignoring case and extra spaces, most minutes first. */
export function activityRanking(days: Record<string, DayLog>, startDate: string | null, today: string): { rows: ActivityRow[]; minutes: number; sessions: number } {
  const groups = new Map<string, ActivityRow>()
  for (const d of challengeLogs(days, startDate, today)) {
    for (const a of d.activities ?? []) {
      const clean = a.name.trim().replace(/\s+/g, ' ')
      if (!clean) continue
      const key = clean.toLowerCase()
      const g = groups.get(key) ?? { name: clean, minutes: 0, sessions: 0 }
      g.minutes += a.minutes || 0
      g.sessions++
      groups.set(key, g)
    }
  }
  const rows = [...groups.values()].sort((a, b) => b.minutes - a.minutes || b.sessions - a.sessions || a.name.localeCompare(b.name))
  return { rows, minutes: rows.reduce((n, r) => n + r.minutes, 0), sessions: rows.reduce((n, r) => n + r.sessions, 0) }
}

/** Days with real journal writing, by the same rule that pays journal XP. */
export function journalDays(days: Record<string, DayLog>, startDate: string | null, today: string): number {
  return challengeLogs(days, startDate, today).filter((d) => journalLength(d.journal) >= JOURNAL_MIN_CHARS).length
}
