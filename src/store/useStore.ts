import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { DayLog, EraState, JournalEntry, Reminder, Reward, ShiftHours, ShiftType } from '@/lib/types'
import { DEFAULT_ELECTIVE } from '@/lib/walkPlan'
import { planFill, type FillOptions } from '@/lib/schedule'
import { todayKey, dayNumber, TOTAL_DAYS, weekOf, chapterOf } from '@/lib/dates'
import { XP, walkXp, walkKind, levelFor, earnsShiftBonus, ACTIVITY_MIN_MINUTES } from '@/lib/xp'
import { computeStats } from '@/lib/stats'
import { DEFAULT_REWARDS } from '@/content/rewards'
import { BADGES } from '@/content/badges'
import { BOSSES } from '@/content/bosses'
import { ENVELOPE_DEFS, prizeDef } from '@/content/envelopes'
import { drawOptions, readyPrizes } from '@/lib/prizes'
import { useUi } from './ui'

export const STATE_VERSION = 1

export function initialState(): EraState {
  return {
    version: STATE_VERSION,
    profile: { name: '', startDate: null, units: 'lb', onboarded: false },
    days: {},
    xp: [],
    purchases: [],
    rewards: DEFAULT_REWARDS.map((r) => ({ ...r })),
    badges: {},
    envelopes: {},
    bossTasks: {},
    reflections: {},
    weights: [],
    nsvs: [],
    photos: [],
    reminders: [
      { id: 'r1', label: 'Walk before shift', time: '04:30', shifts: ['day'], enabled: false },
      { id: 'r2', label: 'Walk after waking', time: '15:30', shifts: ['night'], enabled: false },
      { id: 'r3', label: 'Day-off walk', time: '10:00', shifts: ['off'], enabled: false },
    ],
    spins: [],
    celebrations: {},
    prizes: [],
    capsule: null,
    freezes: {},
  }
}

export interface Actions {
  setProfile: (p: Partial<EraState['profile']>) => void
  ensureDay: (date: string) => void
  setShift: (date: string, shift: ShiftType | undefined, hours?: ShiftHours) => void
  setShiftHours: (date: string, hours: ShiftHours) => void
  /** Fill a run of dates with a repeating pattern. Returns how many days were changed. */
  fillShifts: (o: FillOptions) => number
  setWorkoutCalories: (date: string, calories: number | undefined) => void
  addActivity: (date: string, a: { name: string; minutes: number; calories?: number }) => void
  removeActivity: (date: string, id: string) => void
  logWorkout: (date: string, w: { minutes: number; incline: number; speed: number; theme?: string; notes?: string }) => void
  removeWorkout: (date: string) => void
  logStrength: (date: string, minutes: number, notes?: string, calories?: number) => void
  removeStrength: (date: string) => void
  setRecovery: (date: string, on: boolean) => void
  toggleQuest: (date: string, questId: string) => void
  setBonusMission: (date: string, text: string, source: string) => void
  completeBonusMission: (date: string) => void
  clearBonusMission: (date: string) => void
  setThemeOverride: (date: string, themeId: string) => void
  saveJournal: (date: string, entry: Partial<JournalEntry>) => void
  toggleBossTask: (bossId: string, taskId: string) => void
  claimBoss: (bossId: string) => void
  saveReflection: (week: number, text: string) => void
  /** Pass a discount prize's id to take its percentage off. */
  buyReward: (rewardId: string, couponId?: string) => boolean
  redeemPurchase: (purchaseId: string) => void
  addReward: (r: Omit<Reward, 'id' | 'custom'>) => void
  updateReward: (id: string, patch: Partial<Reward>) => void
  removeReward: (id: string) => void
  /** Decide the three prizes inside an envelope. Done once, so reopening can't re-roll them. */
  drawEnvelope: (id: string) => void
  chooseEnvelope: (id: string, key: string) => void
  /** Use a prize that works by itself: tick off a treat or mission, or switch on double XP for today. */
  redeemPrize: (id: string) => void
  swapQuest: (date: string, questId: string) => boolean
  sealCapsule: (text: string) => void
  addWeight: (date: string, value: number) => void
  removeWeight: (date: string) => void
  addPhoto: (date: string, id: string) => void
  removePhoto: (id: string) => void
  addNsv: (category: string, text: string) => void
  removeNsv: (id: string) => void
  upsertReminder: (r: Reminder) => void
  removeReminder: (id: string) => void
  recordSpin: (category: string, result: string) => void
  markCelebration: (id: string) => void
  applyFreeze: (date: string) => boolean
  removeFreeze: (date: string) => void
  checkProgress: () => void
  importData: (raw: string) => { ok: boolean; error?: string }
  resetAll: () => void
}

export type Store = EraState & Actions

function toast(title: string, sub?: string, kind: 'xp' | 'info' | 'warn' | 'success' = 'xp') {
  useUi.getState().pushToast({ title, sub, kind })
}

/** Idempotent XP award: the ledger id is the uniqueness key. */
function award(s: EraState, id: string, amount: number, reason: string, date: string): boolean {
  if (amount <= 0) return false
  if (s.xp.some((e) => e.id === id)) return false
  s.xp.push({ id, amount, reason, date, at: new Date().toISOString() })
  return true
}
function revoke(s: EraState, id: string) {
  const i = s.xp.findIndex((e) => e.id === id)
  if (i >= 0) s.xp.splice(i, 1)
}
/**
 * Keeps the shift bonus in step with the day: there when a walk sits on a day or night shift, gone
 * otherwise. Walks logged under the older, higher walk values keep what they earned and get no bonus on top.
 * Returns true when the bonus was newly added.
 */
function syncShiftBonus(s: EraState, date: string): boolean {
  const id = `shiftbonus:${date}`
  const d = s.days[date]
  const base = s.xp.find((e) => e.id === `workout:${date}`)
  const had = s.xp.some((e) => e.id === id)
  revoke(s, id)
  if (!d?.workout || !base || !earnsShiftBonus(d.shift) || base.amount > walkXp(d.workout.minutes)) return false
  award(s, id, XP.shiftBonus, `Walked on a ${d.shift} shift`, date)
  return !had
}
/** Double XP: an extra entry equal to the day's walk XP (and shift bonus), kept in step as the walk changes. */
function syncDouble(s: EraState, date: string) {
  const id = `double:${date}`
  revoke(s, id)
  const d = s.days[date]
  if (!d?.doubleXp || !d.workout) return
  const amount = (s.xp.find((e) => e.id === `workout:${date}`)?.amount ?? 0) + (s.xp.find((e) => e.id === `shiftbonus:${date}`)?.amount ?? 0)
  award(s, id, amount, 'Double XP day', date)
}
/**
 * Other activities earn XP once per day, as long as at least one of them is long enough.
 * The award belongs to the day, so removing one activity keeps it while another still qualifies.
 * Returns true when it was newly added.
 */
function syncActivityXp(s: EraState, date: string): boolean {
  const id = `activity:${date}`
  const had = s.xp.some((e) => e.id === id)
  const earned = (s.days[date]?.activities ?? []).some((a) => a.minutes >= ACTIVITY_MIN_MINUTES)
  if (!earned) { revoke(s, id); return false }
  if (!had) award(s, id, XP.activity, 'Other activity', date)
  return !had
}
const cleanCalories = (n: number | undefined) => (typeof n === 'number' && isFinite(n) && n > 0 ? Math.round(n) : undefined)
function lastElectiveHours(s: EraState): ShiftHours {
  const found = Object.values(s.days).filter((d) => d.shift === 'elective' && d.hours).sort((a, b) => b.date.localeCompare(a.date))[0]
  return found?.hours ? { ...found.hours } : { ...DEFAULT_ELECTIVE }
}
function day(s: EraState, date: string): DayLog {
  if (!s.days[date]) s.days[date] = { date, quests: {} }
  if (!s.days[date].quests) s.days[date].quests = {}
  return s.days[date]
}
function inChallenge(s: EraState, date: string): boolean {
  if (!s.profile.startDate) return false
  const n = dayNumber(s.profile.startDate, date)
  return n >= 1 && n <= TOTAL_DAYS && date <= todayKey()
}

export const useStore = create<Store>()(
  persist(
    immer((set, get) => {
      const lifetime = (s: EraState) => s.xp.reduce((a, e) => a + Math.max(0, e.amount), 0)
      const mutate = (fn: (s: EraState) => void) => {
        const before = levelFor(lifetime(get())).level
        set((s) => { fn(s) })
        const after = levelFor(lifetime(get()))
        if (after.level > before) {
          useUi.getState().pushUnlock({ id: `level-${after.level}`, name: `Level ${after.level}: ${after.title}`, emoji: ['🌱', '🧭', '⚔️', '🏅', '💎', '🐉', '🌟', '👑'][after.level - 1] ?? '✨', desc: after.next ? `${after.toNext} XP to ${after.next.title}.` : 'Top of the ladder. Nothing left to prove.', kind: 'level' })
        }
        get().checkProgress()
      }
      return {
        ...initialState(),

        setProfile: (p) => set((s) => { Object.assign(s.profile, p) }),
        ensureDay: (date) => set((s) => { day(s, date) }),
        setShift: (date, shift, hours) => {
          const loggable = shift === 'recovery' && inChallenge(get(), date)
          mutate((s) => {
            const d = day(s, date)
            d.shift = shift
            if (shift) d.shiftSet = 'me'; else delete d.shiftSet
            if (shift === 'elective') d.hours = hours ?? d.hours ?? lastElectiveHours(s); else delete d.hours
            if (syncShiftBonus(s, date)) toast(`+${XP.shiftBonus} XP`, 'Shift bonus for that walk')
            syncDouble(s, date)
            if (loggable && !d.workout && !d.recovery) {
              if (s.freezes[date]) delete s.freezes[date]
              d.recovery = true
              if (award(s, `recovery:${date}`, XP.recovery, 'Planned recovery day', date)) toast(`+${XP.recovery} XP`, 'Recovery day logged. Rest is part of the plan')
            }
          })
        },

        setShiftHours: (date, hours) => set((s) => { const d = day(s, date); if (d.shift === 'elective') { d.hours = hours; d.shiftSet = 'me' } }),
        fillShifts: (o) => {
          const plan = planFill(get().days, o).filter((p) => !p.kept && p.shift)
          if (!plan.length) return 0
          mutate((s) => {
            for (const p of plan) {
              const d = day(s, p.date)
              d.shift = p.shift
              d.shiftSet = 'plan'
              if (p.shift === 'elective') d.hours = { ...(o.hours ?? DEFAULT_ELECTIVE) }; else delete d.hours
              syncShiftBonus(s, p.date)
              syncDouble(s, p.date)
            }
          })
          return plan.length
        },
        setWorkoutCalories: (date, calories) => set((s) => { const w = s.days[date]?.workout; if (!w) return; const c = cleanCalories(calories); if (c) w.calories = c; else delete w.calories }),
        addActivity: (date, a) => {
          if (!inChallenge(get(), date) || !a.name.trim()) return
          mutate((s) => {
            const d = day(s, date)
            ;(d.activities ||= []).push({ id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: a.name.trim().slice(0, 40), minutes: Math.max(0, Math.round(a.minutes) || 0), calories: cleanCalories(a.calories), loggedAt: new Date().toISOString() })
            if (syncActivityXp(s, date)) toast(`+${XP.activity} XP`, 'Activity logged. That counts.')
          })
        },
        removeActivity: (date, id) => mutate((s) => { const d = s.days[date]; if (d?.activities) { d.activities = d.activities.filter((x) => x.id !== id); syncActivityXp(s, date) } }),

        logWorkout: (date, w) => {
          if (!inChallenge(get(), date)) return
          const minutes = Math.max(0, Math.round(w.minutes))
          mutate((s) => {
            const d = day(s, date)
            const earned = () => ['workout', 'shiftbonus', 'double'].reduce((a, k) => a + (s.xp.find((e) => e.id === `${k}:${date}`)?.amount ?? 0), 0)
            const prevXp = earned()
            if (s.freezes[date]) delete s.freezes[date]
            // Editing keeps the original time, so the walk-plan can learn when you usually walk.
            d.workout = { kind: walkKind(minutes), minutes, incline: w.incline, speed: w.speed, theme: w.theme, notes: w.notes, calories: d.workout?.calories, loggedAt: d.workout?.loggedAt ?? new Date().toISOString() }
            if (d.recovery) { d.recovery = false; revoke(s, `recovery:${date}`) }
            const xp = walkXp(minutes)
            revoke(s, `workout:${date}`)
            award(s, `workout:${date}`, xp, `${minutes}-minute walk`, date)
            syncShiftBonus(s, date)
            syncDouble(s, date)
            const bonus = s.xp.find((e) => e.id === `shiftbonus:${date}`)?.amount ?? 0
            const doubled = s.xp.find((e) => e.id === `double:${date}`)?.amount ?? 0
            const total = earned()
            if (total !== prevXp && xp > 0) toast(`+${total} XP`, prevXp ? 'Workout updated' : doubled ? `Double XP day: ${xp + bonus} × 2. Proud of you.` : bonus ? `Walk +${xp}, shift bonus +${bonus}. Proud of you.` : 'Workout logged. Proud of you.')
          })
        },
        removeWorkout: (date) => mutate((s) => { const d = s.days[date]; if (d) { delete d.workout; revoke(s, `workout:${date}`); revoke(s, `shiftbonus:${date}`); revoke(s, `double:${date}`) } }),

        logStrength: (date, minutes, notes, calories) => {
          if (!inChallenge(get(), date)) return
          mutate((s) => {
            const d = day(s, date)
            const first = !d.strength
            d.strength = { minutes, notes, calories: cleanCalories(calories), loggedAt: new Date().toISOString() }
            if (first && award(s, `strength:${date}`, XP.strength, 'Strength session', date)) toast(`+${XP.strength} XP`, 'Strength session logged')
          })
        },
        removeStrength: (date) => mutate((s) => { const d = s.days[date]; if (d) { delete d.strength; revoke(s, `strength:${date}`) } }),

        setRecovery: (date, on) => {
          if (!inChallenge(get(), date)) return
          mutate((s) => {
            const d = day(s, date)
            if (on && d.workout) return
            if (on && s.freezes[date]) delete s.freezes[date]
            d.recovery = on
            if (on) { if (award(s, `recovery:${date}`, XP.recovery, 'Planned recovery day', date)) toast(`+${XP.recovery} XP`, 'Rest is part of the plan') }
            else revoke(s, `recovery:${date}`)
          })
        },

        toggleQuest: (date, questId) => {
          if (!inChallenge(get(), date)) return
          mutate((s) => {
            const d = day(s, date)
            const id = `quest:${date}:${questId}`
            if (d.quests[questId]) { delete d.quests[questId]; revoke(s, id) }
            else { d.quests[questId] = new Date().toISOString(); if (award(s, id, XP.quest, 'Daily quest', date)) toast(`+${XP.quest} XP`, 'Quest complete') }
          })
        },

        setBonusMission: (date, text, source) => set((s) => { const d = day(s, date); if (d.bonusMission?.done) return; d.bonusMission = { text, source } }),
        completeBonusMission: (date) => mutate((s) => {
          const d = day(s, date)
          if (!d.bonusMission || d.bonusMission.done) return
          d.bonusMission.done = new Date().toISOString()
          if (award(s, `bonus:${date}`, XP.bonusMission, 'Bonus mission', date)) toast(`+${XP.bonusMission} XP`, 'Bonus mission complete')
        }),
        clearBonusMission: (date) => mutate((s) => { const d = s.days[date]; if (d?.bonusMission && !d.bonusMission.done) delete d.bonusMission }),
        setThemeOverride: (date, themeId) => set((s) => { day(s, date).themeOverride = themeId }),

        saveJournal: (date, entry) => mutate((s) => {
          const d = day(s, date)
          d.journal = { ...(d.journal || { updatedAt: '' }), ...entry, updatedAt: new Date().toISOString() }
        }),

        toggleBossTask: (bossId, taskId) => set((s) => {
          const t = (s.bossTasks[bossId] ||= {})
          if (t[taskId]) delete t[taskId]; else t[taskId] = new Date().toISOString()
        }),
        claimBoss: (bossId) => mutate((s) => {
          const b = BOSSES.find((x) => x.id === bossId)
          if (!b) return
          if (award(s, `boss:${bossId}`, XP.boss, `Defeated ${b.name}`, todayKey())) {
            toast(`+${XP.boss} XP`, `${b.name} defeated`)
            useUi.getState().pushUnlock({ id: bossId, name: b.name, emoji: b.emoji, desc: 'Boss defeated. Week conquered.', kind: 'boss' })
          }
        }),
        saveReflection: (week, text) => mutate((s) => {
          s.reflections[week] = { text, at: new Date().toISOString() }
          if (text.trim().length >= 20 && award(s, `reflection:${week}`, XP.reflection, `Week ${week} reflection`, todayKey())) toast(`+${XP.reflection} XP`, 'Weekly reflection saved')
        }),

        buyReward: (rewardId, couponId) => {
          const s = get()
          const r = s.rewards.find((x) => x.id === rewardId)
          if (!r) return false
          const stats = computeStats(s)
          const coupon = couponId ? readyPrizes(s, 'discount', todayKey()).find((p) => p.id === couponId) : undefined
          const pct = coupon ? prizeDef(coupon.key)?.pct ?? 0 : 0
          const cost = Math.round(r.cost * (1 - pct / 100))
          if (stats.spendableXp < cost) { toast('Not enough XP yet', `${cost - stats.spendableXp} more to go`, 'warn'); return false }
          const now = new Date().toISOString()
          mutate((st) => {
            st.purchases.push({ id: `p${Date.now()}`, rewardId: r.id, name: r.name, cost, at: now })
            const p = coupon && st.prizes.find((x) => x.id === coupon.id)
            if (p) { p.usedAt = now; p.note = r.name }
          })
          toast(`Unlocked: ${r.name}`, `-${cost} XP${pct ? ` with ${pct}% off` : ''}. Enjoy it, you earned it.`, 'success')
          return true
        },
        redeemPurchase: (id) => set((s) => { const p = s.purchases.find((x) => x.id === id); if (p) p.redeemed = p.redeemed ? undefined : new Date().toISOString() }),
        addReward: (r) => set((s) => { s.rewards.push({ ...r, id: `c${Date.now()}`, custom: true }) }),
        updateReward: (id, patch) => set((s) => { const r = s.rewards.find((x) => x.id === id); if (r) Object.assign(r, patch) }),
        removeReward: (id) => set((s) => { s.rewards = s.rewards.filter((x) => x.id !== id) }),

        drawEnvelope: (id) => set((s) => {
          const e = s.envelopes[id]
          const def = ENVELOPE_DEFS.find((d) => d.id === id)
          if (!e || !def || e.openedAt || e.options?.length) return
          e.options = drawOptions(def.tier, s.prizes ?? [])
        }),
        chooseEnvelope: (id, key) => mutate((s) => {
          const e = s.envelopes[id]
          const def = prizeDef(key)
          if (!e || !def || e.openedAt || !e.options?.includes(key)) return
          const now = new Date().toISOString()
          e.openedAt = now
          e.rewardKey = key
          e.reward = def.title
          const prize = { id: `z${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, key, from: id, wonAt: now } as EraState['prizes'][number]
          if (def.xp) { award(s, `envelope:${id}`, def.xp, 'Mystery envelope', todayKey()); prize.usedAt = now }
          ;(s.prizes ||= []).push(prize)
        }),
        redeemPrize: (id) => {
          const s0 = get()
          const p0 = (s0.prizes ?? []).find((x) => x.id === id)
          const kind = prizeDef(p0?.key)?.kind
          if (!p0) return
          const today = todayKey()
          const now = new Date().toISOString()
          if (kind === 'treat' || kind === 'mission') {
            set((s) => { const p = s.prizes.find((x) => x.id === id)!; if (p.usedAt) delete p.usedAt; else p.usedAt = now })
            return
          }
          if (kind !== 'double' || !readyPrizes(s0, 'double', today).some((x) => x.id === id)) return
          if (!inChallenge(s0, today)) { toast('Not right now', 'Double XP can be switched on during the challenge', 'warn'); return }
          const active = s0.days[today]?.doubleXp
          if (active && (s0.prizes ?? []).some((x) => x.id === active)) { toast('Double XP is already on today', undefined, 'info'); return }
          mutate((s) => {
            const p = s.prizes.find((x) => x.id === id)!
            day(s, today).doubleXp = id
            p.usedOn = today
            p.usedAt = now
            syncDouble(s, today)
          })
          toast('Double XP is on for today', s0.days[today]?.workout ? 'Today’s walk has been doubled' : 'Your walk today earns double', 'success')
        },
        swapQuest: (date, questId) => {
          const s0 = get()
          const prize = readyPrizes(s0, 'swap', todayKey())[0]
          if (!prize || date !== todayKey() || !inChallenge(s0, date) || s0.days[date]?.quests?.[questId] || questId === 'hydrate') return false
          const now = new Date().toISOString()
          set((s) => {
            const d = day(s, date)
            ;(d.swaps ||= []).push(questId)
            const p = s.prizes.find((x) => x.id === prize.id)!
            p.usedAt = now; p.usedOn = date; p.note = questId
          })
          toast('Quest swapped', 'A fresh one has taken its place', 'success')
          return true
        },
        sealCapsule: (text) => {
          const clean = text.trim().slice(0, 4000)
          if (!clean || get().capsule) return
          const stats = computeStats(get())
          set((s) => { s.capsule = { text: clean, sealedAt: new Date().toISOString(), day: stats.displayDay } })
          toast('Letter sealed', 'It comes back to you on Day 90', 'success')
        },

        addWeight: (date, value) => set((s) => { s.weights = [...s.weights.filter((w) => w.date !== date), { date, value }].sort((a, b) => a.date.localeCompare(b.date)) }),
        removeWeight: (date) => set((s) => { s.weights = s.weights.filter((w) => w.date !== date) }),
        addPhoto: (date, id) => set((s) => { s.photos = [...(s.photos ?? []).filter((p) => p.date !== date), { id, date, addedAt: new Date().toISOString() }].sort((a, b) => a.date.localeCompare(b.date)) }),
        removePhoto: (id) => set((s) => { s.photos = (s.photos ?? []).filter((p) => p.id !== id) }),
        addNsv: (category, text) => mutate((s) => { s.nsvs.unshift({ id: `n${Date.now()}`, date: todayKey(), category, text }) }),
        removeNsv: (id) => set((s) => { s.nsvs = s.nsvs.filter((n) => n.id !== id) }),
        upsertReminder: (r) => set((s) => { const i = s.reminders.findIndex((x) => x.id === r.id); if (i >= 0) s.reminders[i] = r; else s.reminders.push(r) }),
        removeReminder: (id) => set((s) => { s.reminders = s.reminders.filter((x) => x.id !== id) }),
        recordSpin: (category, result) => mutate((s) => { s.spins.push({ at: new Date().toISOString(), category, result }) }),
        markCelebration: (id) => set((s) => { s.celebrations[id] = new Date().toISOString() }),
        applyFreeze: (date) => {
          const s = get()
          const stats = computeStats(s)
          if (!s.profile.startDate || date >= todayKey() || !inChallenge(s, date)) return false
          const d = s.days[date]
          if (d?.workout || d?.recovery || s.freezes[date]) return false
          const ch = chapterOf(dayNumber(s.profile.startDate, date))
          // The chapter's own freeze goes first; an envelope freeze covers the day once that is gone.
          const prize = stats.freezesLeftByChapter[ch - 1] > 0 ? undefined : readyPrizes(s, 'freeze', todayKey())[0]
          if (stats.freezesLeftByChapter[ch - 1] <= 0 && !prize) { toast('No freezes left this chapter', 'You get one per chapter', 'warn'); return false }
          const now = new Date().toISOString()
          mutate((st) => {
            st.freezes[date] = now
            const p = prize && st.prizes.find((x) => x.id === prize.id)
            if (p) { p.usedOn = date; p.usedAt = now }
          })
          toast(prize ? 'Envelope freeze used' : 'Streak freeze used', 'That day no longer breaks your streak', 'success')
          return true
        },
        removeFreeze: (date) => mutate((s) => { delete s.freezes[date] }),

        checkProgress: () => {
          const before = get()
          const stats = computeStats(before)
          const newBadges = BADGES.filter((b) => !before.badges[b.id] && b.check(stats))
          const newEnvelopes = ENVELOPE_DEFS.filter((e) => {
            if (before.envelopes[e.id]) return false
            const t = e.trigger
            if (t.type === 'day') return stats.currentDay >= t.value && stats.daysLogged >= Math.ceil(t.value / 3)
            if (t.type === 'workouts') return stats.workouts >= t.value
            if (t.type === 'secret') return stats.secrets[t.key]
            return stats.bestStreak >= t.value
          })
          if (!newBadges.length && !newEnvelopes.length) return
          set((s) => {
            const now = new Date().toISOString()
            for (const b of newBadges) s.badges[b.id] = now
            for (const e of newEnvelopes) s.envelopes[e.id] = { id: e.id, unlockedAt: now }
          })
          const ui = useUi.getState()
          for (const b of newBadges) ui.pushUnlock({ id: b.id, name: b.name, emoji: b.emoji, desc: b.desc, kind: 'badge' })
          for (const e of newEnvelopes) ui.pushToast({ title: e.trigger.type === 'secret' ? 'You found a secret envelope' : 'Mystery envelope unlocked', sub: e.title, kind: 'success' })
        },

        importData: (raw) => {
          try {
            const data = JSON.parse(raw)
            if (!data || typeof data !== 'object' || !data.profile || !data.days) return { ok: false, error: 'That file doesn’t look like a 90-Day Era export.' }
            const base = initialState()
            set(() => ({ ...base, ...data, photos: Array.isArray(data.photos) ? data.photos : [], prizes: Array.isArray(data.prizes) ? data.prizes : [], capsule: data.capsule ?? null, version: STATE_VERSION }))
            return { ok: true }
          } catch {
            return { ok: false, error: 'Could not read that file.' }
          }
        },
        resetAll: () => set(() => ({ ...initialState() })),
      }
    }),
    {
      name: 'era-data',
      version: STATE_VERSION,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<EraState>
        const merged = { ...current, ...p } as Store
        if (!Array.isArray(merged.photos)) merged.photos = []
        if (!Array.isArray(merged.prizes)) merged.prizes = []
        if (merged.capsule === undefined) merged.capsule = null
        // backfill budgets on untouched default rewards
        merged.rewards = (merged.rewards || []).map((r) => {
          const def = DEFAULT_REWARDS.find((d) => d.id === r.id)
          if (!def || r.custom) return r
          const out = { ...r }
          if (out.budget === undefined) out.budget = def.budget
          if (def.id === 'coffee' && out.name === 'Favorite coffee or drink') { out.name = def.name; out.emoji = def.emoji }
          return out
        })
        return merged
      },
      partialize: (s) => {
        const { setProfile: _a, ...rest } = s as unknown as Record<string, unknown>
        const out: Record<string, unknown> = {}
        for (const k of Object.keys(initialState())) out[k] = rest[k]
        return out as unknown as Store
      },
    },
  ),
)

/** Just the saved data, without the action functions. */
export function snapshot(): EraState {
  const s = useStore.getState() as unknown as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(initialState())) out[k] = s[k]
  return out as unknown as EraState
}

/** Replace all saved data with a copy from elsewhere (cloud sync). Missing fields fall back to defaults. */
export function applySnapshot(data: Partial<EraState>) {
  useStore.setState({ ...initialState(), ...data, photos: Array.isArray(data.photos) ? data.photos : [], prizes: Array.isArray(data.prizes) ? data.prizes : [], capsule: data.capsule ?? null, version: STATE_VERSION })
}

export function exportJson(): string {
  return JSON.stringify({ ...snapshot(), exportedAt: new Date().toISOString() }, null, 2)
}

export function currentWeek(): number {
  const s = useStore.getState()
  if (!s.profile.startDate) return 1
  return weekOf(Math.min(TOTAL_DAYS, Math.max(1, dayNumber(s.profile.startDate, todayKey()))))
}
