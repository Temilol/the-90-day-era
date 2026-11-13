import type { DayLog, ShiftHours, ShiftType } from './types'

/** Walk guidance for a day, worked out from the shift. Times are minutes after midnight on that day. */
export interface PlanWindow { start: number; end: number; label: string }
export interface WalkPlan {
  kind: 'none' | 'rest' | 'open' | 'work'
  headline: string
  windows: PlanWindow[]
  note?: string
}

export const DEFAULT_ELECTIVE: ShiftHours = { start: '08:00', end: '17:00' }

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
export function clock(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h % 12 === 0 ? 12 : h % 12}${mm ? `:${String(mm).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`
}
export const clockRange = (w: { start: number; end: number }) => `${clock(w.start)} to ${clock(w.end)}`

/** Start and end of work in minutes. An end earlier than the start means the shift runs past midnight. */
export function workHours(shift: ShiftType | undefined, hours?: ShiftHours): { start: number; end: number } | null {
  if (shift === 'day') return { start: 360, end: 1080 }
  if (shift === 'night') return { start: 1080, end: 360 }
  if (shift === 'elective') { const h = hours ?? DEFAULT_ELECTIVE; return { start: toMinutes(h.start), end: toMinutes(h.end) } }
  return null
}

/**
 * `usual` is the time this person tends to finish their walk on this kind of day, once there is
 * enough history. When it is known and sits outside working hours it leads the plan.
 */
export function planFor(shift: ShiftType | undefined, hours?: ShiftHours, usual?: number | null): WalkPlan {
  if (!shift) return { kind: 'none', headline: 'No shift set for this day', windows: [] }
  if (shift === 'recovery') return { kind: 'rest', headline: 'Rest is the plan today', windows: [], note: 'Nothing to make up. Log the recovery day and your streak carries on.' }

  let windows: PlanWindow[] = []
  let headline: string
  let note: string | undefined
  const work = workHours(shift, hours)
  if (!work) {
    headline = 'Day off: wide open'
    windows = [{ start: 540, end: 660, label: 'Mid-morning' }]
    note = 'Any time works today. Mid-morning is only a good default.'
  } else {
    const overnight = work.end <= work.start
    const lateStart = work.start >= 720
    const lead = lateStart ? 150 : work.start >= 540 ? 120 : 90
    const before: PlanWindow = { start: work.start - lead, end: work.start - (lateStart ? 75 : 45), label: lateStart ? 'After you wake, before work' : 'Before work' }
    if (before.start >= 240) windows.push(before)
    if (!overnight && work.end + 45 <= 1290) windows.push({ start: work.end + 45, end: Math.min(work.end + 150, 1320), label: 'After work' })
    headline = shift === 'night' ? 'Night shift: sleep first, then walk' : shift === 'day' ? 'Day shift: walk before work, or once you’re home' : `Elective, ${clock(work.start)} to ${clock(work.end)}`
    if (overnight) note = 'After the shift, bed comes before the treadmill.'
    else if (windows.length === 0) note = 'Tight day. Even ten minutes counts as a walk.'
  }

  if (usual != null && (!work || !insideWork(usual, work))) {
    const mine: PlanWindow = { start: Math.max(0, usual - 45), end: usual, label: 'Your usual time' }
    windows = [mine, ...windows.filter((w) => w.end <= mine.start || w.start >= mine.end)].sort((a, b) => a.start - b.start)
  }
  return { kind: work ? 'work' : 'open', headline, windows, note }
}

function insideWork(t: number, work: { start: number; end: number }): boolean {
  return work.end > work.start ? t > work.start && t < work.end : t > work.start || t < work.end
}

export interface PlanStatus { state: 'upcoming' | 'open' | 'passed'; text: string; index: number }

export function duration(min: number): string {
  const m = Math.max(1, Math.round(min))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`
}

/** Where the day stands right now against the plan's windows. `now` is minutes after midnight. */
export function planStatus(plan: WalkPlan, now: number): PlanStatus | null {
  if (plan.windows.length === 0) return null
  const open = plan.windows.findIndex((w) => now >= w.start && now < w.end)
  if (open >= 0) return { state: 'open', index: open, text: `Window open now, until ${clock(plan.windows[open].end)}` }
  const next = plan.windows.findIndex((w) => w.start > now)
  if (next >= 0) return { state: 'upcoming', index: next, text: `${next === 0 ? 'Your window' : 'Next window'} opens in ${duration(plan.windows[next].start - now)}` }
  return { state: 'passed', index: -1, text: 'The planned windows have passed. A short walk still counts.' }
}

/**
 * The time of day this person usually logs a walk on a given kind of day, as minutes after midnight.
 * Needs at least three walks logged on the day itself; returns null until then.
 */
export function usualWalkTime(days: Record<string, DayLog>, shift: ShiftType): number | null {
  const times: number[] = []
  for (const d of Object.values(days)) {
    if (d.shift !== shift || !d.workout?.loggedAt) continue
    const at = new Date(d.workout.loggedAt)
    if (isNaN(at.getTime())) continue
    const key = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
    if (key !== d.date) continue // logged afterwards, so the time says nothing about when the walk happened
    times.push(at.getHours() * 60 + at.getMinutes())
  }
  if (times.length < 3) return null
  times.sort((a, b) => a - b)
  return times[Math.floor(times.length / 2)]
}
