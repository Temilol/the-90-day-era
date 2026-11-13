import type { DayLog, EraState, ShiftType } from './types'
import { TOTAL_DAYS, addDays, dayNumber, dateForDay, todayKey, weekOf, chapterOf, parseKey } from './dates'
import { levelFor } from './xp'
import { SELF_CARE_IDS } from '@/content/quests'

export const FREEZES_PER_CHAPTER = 1

export interface Stats {
  today: string
  startDate: string | null
  started: boolean
  finished: boolean
  currentDay: number // 0 before start, 1..90 during, 91 after
  displayDay: number // clamped 1..90
  daysUntilStart: number
  chapter: 1 | 2 | 3
  week: number
  daysLogged: number
  daysRemaining: number
  workouts: number
  fullWorkouts: number
  walkingMinutes: number
  strengthSessions: number
  strengthMinutes: number
  recoveryDays: number
  streak: number
  bestStreak: number
  lifetimeXp: number
  spentXp: number
  spendableXp: number
  level: ReturnType<typeof levelFor>
  questsCompleted: number
  questCounts: Record<string, number>
  selfCareQuests: number
  journalEntries: number
  nightShiftWorkouts: number
  dayShiftWorkouts: number
  /** For each kind of day that has happened so far: how many there were and how many had a walk. */
  byShift: Record<ShiftType, { days: number; walks: number; minutes: number }>
  /** Calories burned, from typed-in numbers only. Nothing here is estimated. */
  calories: { total: number; byDate: Record<string, number>; daysWithData: number; walksWithData: number; walkTotal: number; best: { date: string; value: number } | null }
  otherActivities: number
  bossesDefeated: number
  reflections: number
  purchases: number
  spins: number
  envelopesOpened: number
  comebacks: number
  themesUsed: string[]
  bonusMissions: number
  weekly: { week: number; workouts: number; minutes: number; xp: number; quests: number; strength: number }[]
  nsvs: number
  weights: number
  activeDates: Set<string>
  frozenDates: Set<string>
  freezesLeft: number // in the current chapter
  freezesLeftByChapter: number[]
}

export function isActiveDay(d?: DayLog): boolean {
  return !!d && (!!d.workout || !!d.recovery)
}

export function computeStats(s: EraState, today: string = todayKey()): Stats {
  const startDate = s.profile.startDate
  const started = !!startDate && startDate <= today
  const rawDay = startDate ? dayNumber(startDate, today) : 0
  const currentDay = !startDate ? 0 : rawDay < 1 ? 0 : Math.min(rawDay, TOTAL_DAYS + 1)
  const finished = currentDay > TOTAL_DAYS
  const displayDay = Math.min(Math.max(currentDay, 1), TOTAL_DAYS)
  const daysUntilStart = startDate && !started ? -rawDay + 1 : 0

  const days = Object.values(s.days)
  const inChallenge = (d: DayLog) => !!startDate && dayNumber(startDate, d.date) >= 1 && dayNumber(startDate, d.date) <= TOTAL_DAYS
  const logs = days.filter(inChallenge)

  const workoutsList = logs.filter((d) => d.workout && d.workout.minutes >= 5)
  const workouts = workoutsList.length
  const fullWorkouts = workoutsList.filter((d) => d.workout!.minutes >= 30).length
  const walkingMinutes = workoutsList.reduce((a, d) => a + d.workout!.minutes, 0)
  const strengthList = logs.filter((d) => d.strength)
  const strengthSessions = strengthList.length
  const strengthMinutes = strengthList.reduce((a, d) => a + (d.strength!.minutes || 0), 0)
  const recoveryDays = logs.filter((d) => d.recovery && !d.workout).length

  const activeDates = new Set(logs.filter(isActiveDay).map((d) => d.date))
  const frozenDates = new Set(Object.keys(s.freezes || {}).filter((d) => !!startDate && dayNumber(startDate, d) >= 1 && dayNumber(startDate, d) <= TOTAL_DAYS))
  const streakDates = new Set([...activeDates, ...frozenDates])

  // streak: walk back from today (or yesterday if today not yet logged)
  let streak = 0
  if (startDate && started) {
    let cursor = streakDates.has(today) ? today : addDays(today, -1)
    while (cursor >= startDate && streakDates.has(cursor)) {
      streak++
      cursor = addDays(cursor, -1)
    }
  }
  let bestStreak = 0
  if (startDate) {
    let run = 0
    const end = finished ? dateForDay(startDate, TOTAL_DAYS) : today
    for (let c = startDate; c <= end; c = addDays(c, 1)) {
      if (streakDates.has(c)) { run++; bestStreak = Math.max(bestStreak, run) } else { run = 0 }
    }
  }

  const lifetimeXp = s.xp.reduce((a, e) => a + Math.max(0, e.amount), 0)
  const spentXp = s.purchases.reduce((a, p) => a + p.cost, 0)
  const spendableXp = lifetimeXp - spentXp

  const questCounts: Record<string, number> = {}
  let questsCompleted = 0
  let selfCareQuests = 0
  for (const d of logs) {
    for (const q of Object.keys(d.quests || {})) {
      questCounts[q] = (questCounts[q] || 0) + 1
      questsCompleted++
      if (SELF_CARE_IDS.has(q)) selfCareQuests++
    }
  }

  const journalEntries = logs.filter((d) => d.journal && Object.values(d.journal).some((v) => v && v !== d.journal!.updatedAt)).length
  const nightShiftWorkouts = workoutsList.filter((d) => d.shift === 'night').length
  const dayShiftWorkouts = workoutsList.filter((d) => d.shift === 'day').length
  const byShift: Stats['byShift'] = { day: { days: 0, walks: 0, minutes: 0 }, night: { days: 0, walks: 0, minutes: 0 }, elective: { days: 0, walks: 0, minutes: 0 }, off: { days: 0, walks: 0, minutes: 0 }, recovery: { days: 0, walks: 0, minutes: 0 } }
  for (const d of logs) {
    if (!d.shift || d.date > today || !byShift[d.shift]) continue
    const b = byShift[d.shift]
    b.days++
    if (d.workout && d.workout.minutes >= 5) { b.walks++; b.minutes += d.workout.minutes }
  }
  const calories: Stats['calories'] = { total: 0, byDate: {}, daysWithData: 0, walksWithData: 0, walkTotal: 0, best: null }
  let otherActivities = 0
  for (const d of logs) {
    const walk = d.workout?.calories && d.workout.calories > 0 ? d.workout.calories : 0
    const acts = d.activities ?? []
    otherActivities += acts.length
    const sum = walk + (d.strength?.calories && d.strength.calories > 0 ? d.strength.calories : 0) + acts.reduce((a, x) => a + (x.calories && x.calories > 0 ? x.calories : 0), 0)
    if (walk) { calories.walksWithData++; calories.walkTotal += walk }
    if (sum <= 0) continue
    calories.byDate[d.date] = sum
    calories.total += sum
    calories.daysWithData++
    if (!calories.best || sum > calories.best.value) calories.best = { date: d.date, value: sum }
  }
  const bossesDefeated = s.xp.filter((e) => e.id.startsWith('boss:')).length
  const reflections = Object.keys(s.reflections).length
  const envelopesOpened = Object.values(s.envelopes).filter((e) => e.openedAt).length
  const themesUsed = [...new Set(workoutsList.map((d) => d.workout!.theme).filter(Boolean) as string[])]
  const bonusMissions = logs.filter((d) => d.bonusMission?.done).length

  // comebacks: a workout logged after 2+ consecutive inactive challenge days
  let comebacks = 0
  if (startDate) {
    let gap = 0
    let seenActive = false
    const end = finished ? dateForDay(startDate, TOTAL_DAYS) : today
    for (let c = startDate; c <= end; c = addDays(c, 1)) {
      const d = s.days[c]
      if (d?.workout) { if (gap >= 2 && seenActive) comebacks++; gap = 0; seenActive = true } else if (isActiveDay(d)) { gap = 0; seenActive = true } else { gap++ }
    }
  }

  const weekly = Array.from({ length: 13 }, (_, i) => ({ week: i + 1, workouts: 0, minutes: 0, xp: 0, quests: 0, strength: 0 }))
  if (startDate) {
    for (const d of logs) {
      const w = weekly[weekOf(dayNumber(startDate, d.date)) - 1]
      if (d.workout && d.workout.minutes >= 5) { w.workouts++; w.minutes += d.workout.minutes }
      if (d.strength) w.strength++
      w.quests += Object.keys(d.quests || {}).length
    }
    for (const e of s.xp) {
      const n = dayNumber(startDate, e.date)
      if (n >= 1 && n <= TOTAL_DAYS && e.amount > 0) weekly[weekOf(n) - 1].xp += e.amount
    }
  }

  const daysLogged = activeDates.size
  const freezesLeftByChapter = [1, 2, 3].map((ch) => Math.max(0, FREEZES_PER_CHAPTER - [...frozenDates].filter((d) => chapterOf(dayNumber(startDate!, d)) === ch).length))
  const freezesLeft = startDate ? freezesLeftByChapter[chapterOf(displayDay) - 1] : 0
  return {
    today, startDate, started, finished, currentDay, displayDay, daysUntilStart,
    chapter: chapterOf(displayDay), week: weekOf(displayDay),
    daysLogged, daysRemaining: Math.max(0, TOTAL_DAYS - Math.min(currentDay, TOTAL_DAYS)),
    workouts, fullWorkouts, walkingMinutes, strengthSessions, strengthMinutes, recoveryDays,
    streak, bestStreak, lifetimeXp, spentXp, spendableXp, level: levelFor(lifetimeXp),
    questsCompleted, questCounts, selfCareQuests, journalEntries, nightShiftWorkouts, dayShiftWorkouts, byShift, calories, otherActivities,
    bossesDefeated, reflections, purchases: s.purchases.length, spins: s.spins.length, envelopesOpened,
    comebacks, themesUsed, bonusMissions, weekly, nsvs: s.nsvs.length, weights: s.weights.length, activeDates, frozenDates, freezesLeft, freezesLeftByChapter,
  }
}

/** Logs for a given challenge week (1..13). */
export function weekLogs(s: EraState, week: number): DayLog[] {
  const start = s.profile.startDate
  if (!start) return []
  const out: DayLog[] = []
  for (let day = (week - 1) * 7 + 1; day <= Math.min(week * 7, TOTAL_DAYS); day++) {
    const d = s.days[dateForDay(start, day)]
    if (d) out.push(d)
  }
  return out
}

export interface ChapterStats {
  chapter: number
  workouts: number
  fullWorkouts: number
  minutes: number
  strength: number
  recovery: number
  xp: number
  quests: number
  bestStreak: number
  activeDays: number
  badges: string[]
  bosses: number
  favoriteTheme: string | null
  journalEntries: number
}

/** Stats confined to one chapter's 30 days. Badge attribution uses unlock timestamps within the chapter's date range. */
export function chapterStats(s: EraState, chapter: 1 | 2 | 3): ChapterStats {
  const start = s.profile.startDate
  const empty: ChapterStats = { chapter, workouts: 0, fullWorkouts: 0, minutes: 0, strength: 0, recovery: 0, xp: 0, quests: 0, bestStreak: 0, activeDays: 0, badges: [], bosses: 0, favoriteTheme: null, journalEntries: 0 }
  if (!start) return empty
  const from = dateForDay(start, (chapter - 1) * 30 + 1)
  const to = dateForDay(start, chapter * 30)
  const out = { ...empty }
  const themes: Record<string, number> = {}
  let run = 0
  const frozen = new Set(Object.keys(s.freezes || {}))
  for (let c = from; c <= to; c = addDays(c, 1)) {
    const d = s.days[c]
    if (d?.workout && d.workout.minutes >= 5) {
      out.workouts++; out.minutes += d.workout.minutes
      if (d.workout.minutes >= 30) out.fullWorkouts++
      if (d.workout.theme) themes[d.workout.theme] = (themes[d.workout.theme] || 0) + 1
    }
    if (d?.strength) out.strength++
    if (d?.recovery && !d.workout) out.recovery++
    if (d) out.quests += Object.keys(d.quests || {}).length
    if (d?.journal) out.journalEntries++
    if (isActiveDay(d)) out.activeDays++
    if (isActiveDay(d) || frozen.has(c)) { run++; out.bestStreak = Math.max(out.bestStreak, run) } else { run = 0 }
  }
  for (const e of s.xp) if (e.date >= from && e.date <= to && e.amount > 0) out.xp += e.amount
  out.bosses = s.xp.filter((e) => e.id.startsWith('boss:') && e.date >= from && e.date <= to).length
  const fromIso = parseKey(from).toISOString()
  const toIso = new Date(parseKey(to).getTime() + 86_400_000).toISOString()
  out.badges = Object.entries(s.badges).filter(([, at]) => at >= fromIso && at < toIso).map(([id]) => id)
  const fav = Object.entries(themes).sort((a, b) => b[1] - a[1])[0]
  out.favoriteTheme = fav ? fav[0] : null
  return out
}
