import type { DayLog, EraState } from './types'
import { chapterStats, isPerfectDay, type Stats } from './stats'
import { journalLength } from './journal'
import { waterSettings, goalMet } from './water'
import { CHAPTERS } from '@/content/chapters'
import { addDays, dateForDay, dayKeyAt, dayNumber, toKey, weekOf, TOTAL_DAYS } from './dates'
import { BADGES } from '@/content/badges'

/**
 * Bonus XP that is worked out from everything else she has logged, rather than awarded by one
 * action. Each bonus has a fixed ledger id, so recomputing is safe: an entry exists exactly while
 * its condition holds. That is also how past days get their bonuses the first time this runs.
 */
export interface Bonus { id: string; amount: number; reason: string; date: string }

export const BONUS = {
  streak: { 3: 10, 7: 20, 14: 30, 21: 40, 30: 50, 45: 60, 60: 75, 90: 100 } as Record<number, number>,
  weekWalks: 20, // five or more treadmill walks in a challenge week
  weekWalksNeeded: 5,
  fullQuests: 5, // all four quests in a day
  badge: 10,
  hiddenBadge: 20,
  journal: 5,
  journalMinChars: 20,
  checkIn: 10, // a weigh-in or progress photo, once per challenge week
  nsv: 5, // a non-scale victory, once per challenge week
  capsule: 20,
  chapter: { 1: 30, 2: 45, 3: 60 } as Record<number, number>, // a chapter finished with enough active days
  chapterActiveDays: 20, // two thirds of the chapter's 30 days
  comeback: 10, // a walk after a real break, once per challenge week
  comebackQuietDays: 3,
  perfectDay: 15, // everything in isPerfectDay, in one day
  waterWeek: 10, // the water goal met on every day of a challenge week
  journalWeek: 10, // a journal entry that earns on every day of a challenge week
  theme: 3, // the first walk in each new theme
} as const

/** Bonuses that go away again if what they depend on is removed. */
const FOLLOWING = ['streak:', 'week5:', 'fullquests:', 'badge:', 'journal:', 'checkin:', 'nsv:']
/** Bonuses that are kept once earned, even if a log is edited or deleted later. */
const KEPT = ['chapter:', 'comeback:', 'perfect:', 'waterweek:', 'journalweek:', 'theme:']
export const isBonusId = (id: string) => id === 'capsule' || FOLLOWING.some((p) => id.startsWith(p)) || KEPT.some((p) => id.startsWith(p))
const isKeptId = (id: string) => KEPT.some((p) => id.startsWith(p))

export { journalLength }

/** A journal entry earns XP when it has real writing in it and was written on its day or the day after. */
export function journalEarns(d: DayLog): boolean {
  const j = d.journal
  if (!j || journalLength(j) < BONUS.journalMinChars) return false
  const at = new Date(j.qualifiedAt ?? j.updatedAt)
  if (isNaN(at.getTime())) return false
  return dayKeyAt(at) <= addDays(d.date, 1)
}

export function expectedBonuses(s: EraState, stats: Stats): Bonus[] {
  const out: Bonus[] = []
  const start = s.profile.startDate
  if (!start) return out
  const today = stats.today
  const keyOf = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? today : toKey(d) }
  const dayOf = (date: string) => dayNumber(start, date)
  const inChallenge = (date: string) => { const n = dayOf(date); return n >= 1 && n <= TOTAL_DAYS }
  const logs = Object.values(s.days).filter((d) => inChallenge(d.date)).sort((a, b) => a.date.localeCompare(b.date))

  for (const [days, amount] of Object.entries(BONUS.streak)) {
    if (stats.bestStreak >= Number(days)) out.push({ id: `streak:${days}`, amount, reason: `${days}-day streak`, date: today })
  }

  const walksByWeek = new Map<number, string[]>()
  for (const d of logs) {
    if (!d.workout || d.workout.minutes < 5) continue
    const w = weekOf(dayOf(d.date))
    walksByWeek.set(w, [...(walksByWeek.get(w) ?? []), d.date])
  }
  for (const [w, dates] of walksByWeek) {
    if (dates.length >= BONUS.weekWalksNeeded) out.push({ id: `week5:${w}`, amount: BONUS.weekWalks, reason: `Five walks in week ${w}`, date: dates[BONUS.weekWalksNeeded - 1] })
  }

  for (const d of logs) {
    if (Object.keys(d.quests || {}).length >= 4) out.push({ id: `fullquests:${d.date}`, amount: BONUS.fullQuests, reason: 'All four quests done', date: d.date })
    if (journalEarns(d)) out.push({ id: `journal:${d.date}`, amount: BONUS.journal, reason: 'Journal entry', date: d.date })
  }

  for (const id of Object.keys(s.badges)) {
    const b = BADGES.find((x) => x.id === id)
    if (b) out.push({ id: `badge:${id}`, amount: b.hidden ? BONUS.hiddenBadge : BONUS.badge, reason: `Badge: ${b.name}`, date: keyOf(s.badges[id]) })
  }

  const firstByWeek = (dates: string[]) => {
    const first = new Map<number, string>()
    for (const date of [...dates].sort()) { if (!inChallenge(date)) continue; const w = weekOf(dayOf(date)); if (!first.has(w)) first.set(w, date) }
    return first
  }
  for (const [w, date] of firstByWeek([...s.weights.map((x) => x.date), ...(s.photos ?? []).map((x) => x.date)])) out.push({ id: `checkin:${w}`, amount: BONUS.checkIn, reason: `Week ${w} check-in`, date })
  for (const [w, date] of firstByWeek(s.nsvs.map((x) => x.date))) out.push({ id: `nsv:${w}`, amount: BONUS.nsv, reason: 'Non-scale victory', date })

  // The bonuses below are kept once earned (see KEPT), so they only ever add.
  const end = Math.min(dayOf(today), TOTAL_DAYS)
  for (const c of CHAPTERS) {
    if (dayOf(today) > c.to && chapterStats(s, c.n).activeDays >= BONUS.chapterActiveDays) out.push({ id: `chapter:${c.n}`, amount: BONUS.chapter[c.n], reason: `Chapter ${c.n} complete`, date: dateForDay(start, c.to) })
  }

  for (const d of logs) if (isPerfectDay(d)) out.push({ id: `perfect:${d.date}`, amount: BONUS.perfectDay, reason: 'A perfect day', date: d.date })

  // A walk after a break of three or more quiet days, the first one in each challenge week.
  let quiet = 0
  let seenActive = false
  const comebackWeeks = new Set<number>()
  for (let n = 1; n <= end; n++) {
    const date = dateForDay(start, n)
    const d = s.days[date]
    if (d?.workout) {
      const w = weekOf(n)
      if (quiet >= BONUS.comebackQuietDays && seenActive && !comebackWeeks.has(w)) { comebackWeeks.add(w); out.push({ id: `comeback:${w}`, amount: BONUS.comeback, reason: 'Back after a break', date }) }
      quiet = 0; seenActive = true
    } else if (d?.recovery) { quiet = 0; seenActive = true } else quiet++
  }

  const goalMl = waterSettings(s.profile).goalMl
  for (let w = 1; w <= 13; w++) {
    const dates = Array.from({ length: Math.min(w * 7, TOTAL_DAYS) - (w - 1) * 7 }, (_, i) => dateForDay(start, (w - 1) * 7 + i + 1))
    const last = dates[dates.length - 1]
    if (dates.every((date) => goalMet(s.days[date]?.water, goalMl))) out.push({ id: `waterweek:${w}`, amount: BONUS.waterWeek, reason: `Water goal met all of week ${w}`, date: last })
    if (dates.every((date) => !!s.days[date] && journalEarns(s.days[date]))) out.push({ id: `journalweek:${w}`, amount: BONUS.journalWeek, reason: `Journal written all of week ${w}`, date: last })
  }

  const themeFirst = new Map<string, string>()
  for (const d of logs) { const t = d.workout?.theme; if (t && !themeFirst.has(t)) themeFirst.set(t, d.date) }
  for (const [t, date] of themeFirst) out.push({ id: `theme:${t}`, amount: BONUS.theme, reason: 'A new walk theme', date })

  if (s.capsule) out.push({ id: 'capsule', amount: BONUS.capsule, reason: 'Time capsule sealed', date: keyOf(s.capsule.sealedAt) })
  return out
}

/** What has to change in the XP ledger for the bonuses to match what is expected. */
export function diffBonuses(s: EraState, stats: Stats): { add: Bonus[]; remove: string[]; change: Bonus[] } {
  const expected = expectedBonuses(s, stats)
  const want = new Map(expected.map((b) => [b.id, b]))
  const have = new Map(s.xp.filter((e) => isBonusId(e.id)).map((e) => [e.id, e.amount]))
  return {
    add: expected.filter((b) => !have.has(b.id)),
    remove: [...have.keys()].filter((id) => !want.has(id) && !isKeptId(id)),
    change: expected.filter((b) => have.has(b.id) && have.get(b.id) !== b.amount),
  }
}
