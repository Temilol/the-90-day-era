import { useState } from 'react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { questsFor, themeFor } from '@/lib/hooks'
import { walkXp, XP } from '@/lib/xp'
import type { ShiftType } from '@/lib/types'
import { THEMES } from '@/content/themes'
import { Check, Modal } from './ui'
import { burst, hearts } from './Celebrate'
import { Shuffle, Trash2 } from 'lucide-react'
import { todayKey, addDays, dayNumber } from '@/lib/dates'

export const SHIFTS: { id: ShiftType; label: string; emoji: string; sub: string }[] = [
  { id: 'day', label: 'Day shift', emoji: '🌤️', sub: '6 AM – 6 PM' },
  { id: 'night', label: 'Night shift', emoji: '🌙', sub: '6 PM – 6 AM' },
  { id: 'off', label: 'Day off', emoji: '🎀', sub: 'Yours entirely' },
  { id: 'recovery', label: 'Recovery', emoji: '🌿', sub: 'Planned rest' },
]

export function ShiftPicker({ date, compact }: { date: string; compact?: boolean }) {
  const shift = useStore((s) => s.days[date]?.shift)
  const setShift = useStore((s) => s.setShift)
  return (
    <div className={clsx('grid gap-2', compact ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4')}>
      {SHIFTS.map((s) => (
        <button key={s.id} onClick={() => setShift(date, shift === s.id ? undefined : s.id)}
          className={clsx('rounded-2xl border p-3 text-left transition active:scale-[0.98]',
            shift === s.id ? 'border-lavender-400 bg-lavender-50 dark:bg-lavender-500/15 shadow-glow' : 'border-line bg-card-2 hover:border-lavender-200')}>
          <div className="text-xl">{s.emoji}</div>
          <div className={clsx('font-semibold', compact ? 'text-xs' : 'text-sm')}>{s.label}</div>
          {!compact && <div className="text-xs text-muted">{s.sub}</div>}
        </button>
      ))}
    </div>
  )
}

export function WorkoutCard({ date, locked }: { date: string; locked?: boolean }) {
  const d = useStore((s) => s.days[date])
  const logWorkout = useStore((s) => s.logWorkout)
  const removeWorkout = useStore((s) => s.removeWorkout)
  const setRecovery = useStore((s) => s.setRecovery)
  const logStrength = useStore((s) => s.logStrength)
  const removeStrength = useStore((s) => s.removeStrength)
  const setThemeOverride = useStore((s) => s.setThemeOverride)
  const [custom, setCustom] = useState(false)
  const [minutes, setMinutes] = useState(20)
  const [incline, setIncline] = useState(12)
  const [speed, setSpeed] = useState(3)
  const [notes, setNotes] = useState('')
  const [strengthOpen, setStrengthOpen] = useState(false)
  const [strengthMin, setStrengthMin] = useState(10)
  const theme = themeFor(date, d?.themeOverride)
  const startDate = useStore((s) => s.profile.startDate)
  const yesterdayKey = addDays(date, -1)
  const yesterday = useStore((s) => s.days[yesterdayKey])
  const [toYesterday, setToYesterday] = useState(false)
  const lateNight = date === todayKey() && new Date().getHours() < 6 && !!startDate && dayNumber(startDate, yesterdayKey) >= 1 && !yesterday?.workout

  const done = !!d?.workout
  const complete = (mins: number, inc: number, spd: number, n?: string) => {
    const target = lateNight && toYesterday ? yesterdayKey : date
    logWorkout(target, { minutes: mins, incline: inc, speed: spd, theme: theme.id, notes: n })
    setToYesterday(false)
    if (mins >= 30) burst(); else hearts()
    setCustom(false)
  }
  const reroll = () => {
    const others = THEMES.filter((t) => t.id !== theme.id)
    setThemeOverride(date, others[Math.floor(Math.random() * others.length)].id)
  }

  return (
    <div className="card overflow-hidden">
      <div className={clsx('p-5 relative', done ? 'bg-gradient-to-br from-lavender-500 via-lavender-500 to-blush-400 text-white' : 'bg-gradient-to-br from-lavender-50 to-blush-50 dark:from-lavender-500/15 dark:to-blush-500/10')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={clsx('text-xs font-bold uppercase tracking-[0.2em]', done ? 'text-white/80' : 'text-lavender-500')}>{done ? 'Workout complete' : date === todayKey() ? 'Today’s workout' : 'The walk'}</div>
            <div className="h-display text-2xl mt-1">{done ? `${d!.workout!.minutes} min logged` : 'The Standard'}</div>
            <div className={clsx('text-sm mt-1', done ? 'text-white/85' : 'text-muted')}>
              {done ? `Incline ${d!.workout!.incline} · ${d!.workout!.speed} mph · +${walkXp(d!.workout!.minutes)} XP` : 'Incline 12 · 3.0 mph · 30 minutes'}
            </div>
          </div>
          <motion.div animate={done ? { rotate: [0, -10, 10, 0] } : {}} className="text-4xl">{done ? '🏆' : '🚶‍♀️'}</motion.div>
        </div>
        {!done && !locked && lateNight && (
          <button onClick={() => setToYesterday(!toYesterday)} className={clsx('mt-4 w-full rounded-2xl border p-3 text-left text-sm flex items-center gap-3 transition', toYesterday ? 'border-lavender-400 bg-white/70 dark:bg-white/10' : 'border-line bg-white/40 dark:bg-white/5')}>
            <span className={clsx('size-5 rounded-full grid place-items-center text-xs shrink-0', toYesterday ? 'bg-lavender-500 text-white' : 'border border-line bg-white dark:bg-white/10')}>{toYesterday ? '✓' : ''}</span>
            <span><span className="font-semibold">Post-shift walk? Count it toward yesterday</span><span className="block text-xs text-muted">It’s before 6 AM. Day {dayNumber(startDate!, yesterdayKey)} hasn’t got a walk yet.</span></span>
          </button>
        )}
        {!done && !locked && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-primary py-3" onClick={() => complete(30, 12, 3)}>Complete standard walk</button>
            <button className="btn bg-white/80 dark:bg-white/10 text-ink py-3" onClick={() => setCustom(true)}>Log a modified walk</button>
          </div>
        )}
        {done && !locked && (
          <div className="mt-4 flex gap-2 flex-wrap">
            <button className="btn bg-white/20 text-white hover:bg-white/30" onClick={() => { setMinutes(d!.workout!.minutes); setIncline(d!.workout!.incline); setSpeed(d!.workout!.speed); setNotes(d!.workout!.notes || ''); setCustom(true) }}>Edit</button>
            <button className="btn bg-white/20 text-white hover:bg-white/30" onClick={() => { if (confirm('Remove this workout log? Its XP will be removed too.')) removeWorkout(date) }}><Trash2 size={14} /> Remove</button>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-card-2 p-3">
          <div className="text-2xl">{theme.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Entertainment theme</div>
            <div className="font-semibold">{theme.name}</div>
            <div className="text-xs text-muted">{theme.blurb}</div>
          </div>
          {!done && !locked && <button onClick={reroll} className="btn-ghost p-2" title="Shuffle theme"><Shuffle size={16} /></button>}
        </div>

        {!done && (
          <div className="grid grid-cols-2 gap-2">
            <button disabled={locked} onClick={() => { setRecovery(date, !d?.recovery); if (!d?.recovery) hearts() }}
              className={clsx('rounded-2xl border p-3 text-left text-sm transition', d?.recovery ? 'border-mint-400 bg-mint-300/20' : 'border-line bg-card-2')}>
              <div className="font-semibold">🌿 {d?.recovery ? 'Recovery day logged' : 'Make this a recovery day'}</div>
              <div className="text-xs text-muted">Planned rest. Keeps your streak. +{XP.recovery} XP</div>
            </button>
            <button disabled={locked} onClick={() => setStrengthOpen(true)}
              className={clsx('rounded-2xl border p-3 text-left text-sm transition', d?.strength ? 'border-peach-400 bg-peach-300/20' : 'border-line bg-card-2')}>
              <div className="font-semibold">💪 {d?.strength ? `Strength: ${d.strength.minutes} min` : 'Add strength session'}</div>
              <div className="text-xs text-muted">Optional 10-minute session. +{XP.strength} XP</div>
            </button>
          </div>
        )}
        {done && (
          <button disabled={locked} onClick={() => setStrengthOpen(true)}
            className={clsx('w-full rounded-2xl border p-3 text-left text-sm transition', d?.strength ? 'border-peach-400 bg-peach-300/20' : 'border-line bg-card-2')}>
            <div className="font-semibold">💪 {d?.strength ? `Strength: ${d.strength.minutes} min logged` : 'Add an optional strength session'}</div>
            <div className="text-xs text-muted">Bodyweight, bands, dumbbells. +{XP.strength} XP</div>
          </button>
        )}

        <p className="text-xs text-muted leading-relaxed">
          Listen to your body: pain, dizziness, or heavy fatigue means shorten it or rest. A modified walk is a win. Sleep comes first after a night shift.
        </p>
      </div>

      <Modal open={custom} onClose={() => setCustom(false)} title={done ? 'Edit workout' : 'Log a modified walk'}>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between"><label className="label">Minutes</label><span className="text-sm font-semibold gradient-text">+{walkXp(minutes)} XP</span></div>
            <input type="range" min={5} max={60} value={minutes} onChange={(e) => setMinutes(+e.target.value)} className="w-full accent-lavender-500" />
            <div className="flex gap-2 mt-2 flex-wrap">{[10, 15, 20, 25, 30, 40].map((m) => <button key={m} onClick={() => setMinutes(m)} className={clsx('chip', minutes === m ? 'bg-lavender-500 text-white' : 'bg-card-2 text-muted')}>{m}</button>)}</div>
            <div className="text-center h-display text-3xl mt-2">{minutes} min</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Incline</label><input type="number" min={0} max={16} step={1} className="input" value={incline} onChange={(e) => setIncline(+e.target.value)} /></div>
            <div><label className="label">Speed (mph)</label><input type="number" min={0.5} max={6.2} step={0.1} className="input" value={speed} onChange={(e) => setSpeed(+e.target.value)} /></div>
          </div>
          <div><label className="label">Notes (optional)</label><input className="input" placeholder="How did it feel?" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <button className="btn-primary w-full py-3" onClick={() => complete(minutes, incline, speed, notes || undefined)}>Save workout</button>
        </div>
      </Modal>

      <Modal open={strengthOpen} onClose={() => setStrengthOpen(false)} title="Strength session">
        <div className="space-y-4">
          <p className="text-sm text-muted">Squats, glute bridges, push-ups on the counter, band rows, a 10-minute follow-along. Anything counts.</p>
          <div><label className="label">Minutes</label>
            <div className="flex gap-2 flex-wrap">{[5, 10, 15, 20, 30].map((m) => <button key={m} onClick={() => setStrengthMin(m)} className={clsx('chip', strengthMin === m ? 'bg-lavender-500 text-white' : 'bg-card-2 text-muted')}>{m} min</button>)}</div>
          </div>
          <div className="flex gap-2">
            {d?.strength && <button className="btn-danger" onClick={() => { removeStrength(date); setStrengthOpen(false) }}>Remove</button>}
            <button className="btn-primary flex-1" onClick={() => { logStrength(date, strengthMin); setStrengthOpen(false); hearts() }}>{d?.strength ? 'Update' : 'Log session'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export function QuestList({ date, locked }: { date: string; locked?: boolean }) {
  const d = useStore((s) => s.days[date])
  const toggleQuest = useStore((s) => s.toggleQuest)
  const completeBonus = useStore((s) => s.completeBonusMission)
  const clearBonus = useStore((s) => s.clearBonusMission)
  const quests = questsFor(date)
  const doneCount = quests.filter((q) => d?.quests?.[q.id]).length
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted px-1"><span>{doneCount}/{quests.length} complete · {XP.quest} XP each</span>{doneCount === quests.length && <span className="gradient-text font-bold">All done ✦</span>}</div>
      {quests.map((q) => (
        <Check key={q.id} disabled={locked} checked={!!d?.quests?.[q.id]} onChange={() => { toggleQuest(date, q.id); if (!d?.quests?.[q.id] && doneCount + 1 === quests.length) burst() }} label={q.title} sub={q.hint} emoji={q.emoji} />
      ))}
      {d?.bonusMission && (
        <div className="relative">
          <Check disabled={locked || !!d.bonusMission.done} checked={!!d.bonusMission.done} onChange={() => { completeBonus(date); hearts() }} label={d.bonusMission.text} sub={`Bonus mission · ${d.bonusMission.source} · +${XP.bonusMission} XP`} emoji="🎡" />
          {!d.bonusMission.done && !locked && <button onClick={() => clearBonus(date)} className="absolute right-2 top-2 btn-ghost p-1.5 text-xs">Skip</button>}
        </div>
      )}
    </div>
  )
}
