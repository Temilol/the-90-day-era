export type ShiftType = 'day' | 'night' | 'off' | 'recovery' | 'elective'
/** Working hours as 24-hour 'HH:MM'. Only elective days carry their own; day and night shifts are always 6 to 6. */
export interface ShiftHours { start: string; end: string }
export type WorkoutKind = 'standard' | 'modified' | 'extended'
export type Mood = 'amazing' | 'good' | 'okay' | 'tired' | 'rough'

export interface Workout {
  kind: WorkoutKind
  minutes: number
  incline: number
  speed: number
  theme?: string
  notes?: string
  calories?: number // only ever a number the person typed in
  loggedAt: string
}

export interface StrengthSession {
  minutes: number
  calories?: number
  notes?: string
  loggedAt: string
}

/** Any other exercise. Recorded for stats only: it earns no XP and doesn't affect the streak. */
export interface Activity { id: string; name: string; minutes: number; calories?: number; loggedAt: string }

export interface JournalEntry {
  mood?: Mood
  energy?: number // 1-5
  workoutNotes?: string
  foodNotes?: string
  reflection?: string
  gratitude?: string
  victories?: string
  improve?: string
  updatedAt: string
}

export interface DayLog {
  date: string // yyyy-mm-dd
  shift?: ShiftType
  hours?: ShiftHours // elective days only
  shiftSet?: 'me' | 'plan' // 'plan' = filled in by the schedule form; anything else was set by hand
  activities?: Activity[]
  doubleXp?: string // id of the double-XP prize switched on for this day
  swaps?: string[] // quests traded away on this day
  workout?: Workout
  strength?: StrengthSession
  recovery?: boolean // planned recovery day
  quests: Record<string, string> // questId -> completedAt
  bonusMission?: { text: string; source: string; done?: string }
  themeOverride?: string
  journal?: JournalEntry
}

export interface XpEntry {
  id: string // unique action key, e.g. workout:2026-01-05
  amount: number
  reason: string
  date: string
  at: string
}

export interface Reward {
  id: string
  name: string
  cost: number
  emoji: string
  custom?: boolean
  image?: string // small data URL
  budget?: number // optional spending cap in your currency
  link?: string
  note?: string
}

export interface Purchase {
  id: string
  rewardId: string
  name: string
  cost: number
  at: string
  redeemed?: string
}

export interface Envelope {
  id: string
  unlockedAt: string
  openedAt?: string
  reward?: string // what was won, in words
  options?: string[] // the three prizes inside, fixed the first time the envelope is opened
  rewardKey?: string // the prize that was picked
}

/** A prize won from an envelope and kept until it is used. */
export interface Prize { id: string; key: string; from: string; wonAt: string; usedAt?: string; usedOn?: string; note?: string }
/** A letter written early in the challenge, sealed until Day 90. */
export interface Capsule { text: string; sealedAt: string; day: number }

export interface WeightEntry { date: string; value: number }
/** A progress photo. The picture itself is stored separately; this is just its label. */
export interface ProgressPhoto { id: string; date: string; addedAt: string }
export interface NSV { id: string; date: string; category: string; text: string }
export interface Reminder { id: string; label: string; time: string; shifts: ShiftType[]; enabled: boolean }
export interface Spin { at: string; category: string; result: string }

export interface EraState {
  version: number
  profile: { name: string; startDate: string | null; units: 'lb' | 'kg'; onboarded: boolean; walkReminders?: boolean /* remind before each walk window; on unless set to false */ }
  days: Record<string, DayLog>
  xp: XpEntry[]
  purchases: Purchase[]
  rewards: Reward[]
  badges: Record<string, string> // badgeId -> unlockedAt
  envelopes: Record<string, Envelope>
  bossTasks: Record<string, Record<string, string>> // bossId -> taskId -> doneAt
  reflections: Record<number, { text: string; at: string }>
  weights: WeightEntry[]
  nsvs: NSV[]
  photos: ProgressPhoto[] // at most one per date, oldest first
  reminders: Reminder[]
  spins: Spin[]
  celebrations: Record<string, string>
  prizes: Prize[]
  capsule: Capsule | null
  freezes: Record<string, string> // date -> usedAt; patches a missed day for streak purposes
}
