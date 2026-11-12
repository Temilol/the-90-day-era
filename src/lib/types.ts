export type ShiftType = 'day' | 'night' | 'off' | 'recovery'
export type WorkoutKind = 'standard' | 'modified' | 'extended'
export type Mood = 'amazing' | 'good' | 'okay' | 'tired' | 'rough'

export interface Workout {
  kind: WorkoutKind
  minutes: number
  incline: number
  speed: number
  theme?: string
  notes?: string
  loggedAt: string
}

export interface StrengthSession {
  minutes: number
  notes?: string
  loggedAt: string
}

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
  reward?: string
}

export interface WeightEntry { date: string; value: number }
export interface NSV { id: string; date: string; category: string; text: string }
export interface Reminder { id: string; label: string; time: string; shifts: ShiftType[]; enabled: boolean }
export interface Spin { at: string; category: string; result: string }

export interface EraState {
  version: number
  profile: { name: string; startDate: string | null; units: 'lb' | 'kg'; onboarded: boolean }
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
  reminders: Reminder[]
  spins: Spin[]
  celebrations: Record<string, string>
  freezes: Record<string, string> // date -> usedAt; patches a missed day for streak purposes
}
