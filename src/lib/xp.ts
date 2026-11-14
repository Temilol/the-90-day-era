import type { ShiftType, WorkoutKind } from './types'

export const LEVELS: { level: number; title: string; xp: number }[] = [
  { level: 1, title: 'Rookie', xp: 0 },
  { level: 2, title: 'Explorer', xp: 150 },
  { level: 3, title: 'Warrior', xp: 400 },
  { level: 4, title: 'Champion', xp: 750 },
  { level: 5, title: 'Elite', xp: 1200 },
  { level: 6, title: 'Legend', xp: 1800 },
  { level: 7, title: 'Icon', xp: 2500 },
  { level: 8, title: 'Era Queen', xp: 3300 },
]

export const XP = {
  walkShort: 10, // 5-10 min
  walkMedium: 15, // 11-20 min
  walkFull: 25, // 21-30 min
  walkLong: 30, // >30 min
  shiftBonus: 5, // on top of any walk logged on a day or night shift
  activity: 10, // once a day, when the day's other activities add up to ACTIVITY_MIN_MINUTES or more
  strength: 15,
  boss: 25,
  reflection: 10,
  recovery: 10,
  quest: 5,
  bonusMission: 10,
} as const

/** Daily step goal until the person sets their own. */
export const DEFAULT_STEP_GOAL = 8000
export const stepGoalOf = (profile: { stepGoal?: number }) => (profile.stepGoal && profile.stepGoal > 0 ? Math.round(profile.stepGoal) : DEFAULT_STEP_GOAL)

/** How many minutes of other activity a day needs, in total, before it earns XP. */
export const ACTIVITY_MIN_MINUTES = 30

export function walkXp(minutes: number): number {
  if (minutes < 5) return 0
  if (minutes <= 10) return XP.walkShort
  if (minutes <= 20) return XP.walkMedium
  if (minutes <= 30) return XP.walkFull
  return XP.walkLong
}

/** Only the 12-hour day and night shifts earn the bonus. Electives, days off and recovery days don't. */
export function earnsShiftBonus(shift: ShiftType | undefined): boolean {
  return shift === 'day' || shift === 'night'
}

export function walkKind(minutes: number): WorkoutKind {
  if (minutes > 30) return 'extended'
  if (minutes >= 30) return 'standard'
  return 'modified'
}

export function levelFor(lifetimeXp: number) {
  let current = LEVELS[0]
  for (const l of LEVELS) if (lifetimeXp >= l.xp) current = l
  const next = LEVELS.find((l) => l.xp > current.xp) ?? null
  const span = next ? next.xp - current.xp : 1
  const into = next ? lifetimeXp - current.xp : span
  return {
    level: current.level,
    title: current.title,
    next,
    progress: next ? Math.min(1, into / span) : 1,
    toNext: next ? next.xp - lifetimeXp : 0,
  }
}
