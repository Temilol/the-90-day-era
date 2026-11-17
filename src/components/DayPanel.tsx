import { useState } from 'react'
import { clsx } from 'clsx'
import { useStore } from '@/store/useStore'
import { questsFor, themeFor } from '@/lib/hooks'
import { walkXp, XP, earnsShiftBonus, ACTIVITY_MIN_MINUTES, stepGoalOf } from '@/lib/xp'
import { DEFAULT_ELECTIVE } from '@/lib/walkPlan'
import type { ShiftType } from '@/lib/types'
import { THEMES } from '@/content/themes'
import { Check, Modal, Progress } from './ui'
import { waterSettings, fromMl, toMl, goalMet } from '@/lib/water'
import { burst, hearts } from './Celebrate'
import { tap } from '@/lib/haptics'
import { Shuffle, Trash2, Pencil, Flame, Plus, X, Repeat, Footprints } from 'lucide-react'
import { readyPrizes } from '@/lib/prizes'
import { todayKey, toKey, addDays, dayNumber } from '@/lib/dates'
import { WalkPlanPanel } from './WalkPlan'

export const SHIFTS: { id: ShiftType; label: string; short: string; emoji: string; sub: string }[] = [
  { id: 'day', label: 'Day shift', short: 'Day', emoji: '🌤️', sub: '6 AM – 6 PM' },
  { id: 'night', label: 'Night shift', short: 'Night', emoji: '🌙', sub: '6 PM – 6 AM' },
  { id: 'elective', label: 'Elective', short: 'Elective', emoji: '📚', sub: 'Your own hours' },
  { id: 'off', label: 'Day off', short: 'Off', emoji: '🎀', sub: 'Yours entirely' },
  { id: 'recovery', label: 'Recovery', short: 'Rest', emoji: '🌿', sub: 'Planned rest' },
]

export function ShiftPicker({ date, compact }: { date: string; compact?: boolean }) {
  const shift = useStore((s) => s.days[date]?.shift)
  const setShift = useStore((s) => s.setShift)
  const hours = useStore((s) => s.days[date]?.hours)
  const setShiftHours = useStore((s) => s.setShiftHours)
  const h = hours ?? DEFAULT_ELECTIVE
  return (
    <div>
    <div className={clsx('grid gap-2', compact ? 'grid-cols-5' : 'grid-cols-3 sm:grid-cols-5')}>
      {SHIFTS.map((s) => (
        <button key={s.id} onClick={() => setShift(date, shift === s.id ? undefined : s.id)}
          className={clsx('rounded-2xl border p-3 text-left transition active:scale-[0.98]',
            shift === s.id ? 'border-lavender-400 bg-lavender-50 dark:bg-lavender-500/15 shadow-glow' : 'border-line bg-card-2 hover:border-lavender-200')}>
          <div className="text-xl">{s.emoji}</div>
          <div className={clsx('font-semibold', compact ? 'text-[11px] leading-tight' : 'text-sm')}>{compact ? s.short : s.label}</div>
          {!compact && <div className="text-xs text-muted">{s.sub}</div>}
        </button>
      ))}
    </div>
    {shift === 'elective' && (
      <div className="mt-2 flex items-center gap-2 rounded-2xl bg-card-2 p-2.5 text-sm">
        <span className="text-muted shrink-0 hidden sm:inline">Hours</span>
        <input type="time" aria-label="Elective start time" className="input !py-1.5 flex-1 min-w-0" value={h.start} onChange={(e) => e.target.value && setShiftHours(date, { ...h, start: e.target.value })} />
        <span className="text-muted">to</span>
        <input type="time" aria-label="Elective end time" className="input !py-1.5 flex-1 min-w-0" value={h.end} onChange={(e) => e.target.value && setShiftHours(date, { ...h, end: e.target.value })} />
      </div>
    )}
    </div>
  )
}

/** Calories for the walk. Only ever what gets typed here: the app never guesses a number. */
function WalkCalories({ date, locked }: { date: string; locked?: boolean }) {
  const saved = useStore((s) => s.days[date]?.workout?.calories)
  const setCalories = useStore((s) => s.setWorkoutCalories)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  if (saved && !editing) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-card-2 p-3 text-sm">
        <Flame size={18} className="text-peach-400 shrink-0" />
        <div className="flex-1"><span className="font-semibold">{saved} cal</span> <span className="text-muted">burned on this walk</span></div>
        {!locked && <button className="btn-ghost !py-1 text-xs" onClick={() => { setValue(String(saved)); setEditing(true) }}>Edit</button>}
      </div>
    )
  }
  if (locked) return null
  return (
    <form className="flex items-center gap-2 rounded-2xl bg-card-2 p-2.5" onSubmit={(e) => { e.preventDefault(); setCalories(date, value.trim() ? parseFloat(value) : undefined); setEditing(false); setValue('') }}>
      <Flame size={18} className="text-peach-400 shrink-0 ml-1" />
      <input type="number" inputMode="numeric" min={1} max={5000} className="input !py-2 flex-1 min-w-0" placeholder="Calories" aria-label="Calories burned on this walk, optional" value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn-soft !py-2 shrink-0" type="submit" disabled={!editing && !value.trim()}>Save</button>
    </form>
  )
}

/** The day's step count, typed in from a watch or phone. Tracked only: no XP, no effect on the streak. */
function StepsRow({ date, locked }: { date: string; locked?: boolean }) {
  const saved = useStore((s) => s.days[date]?.steps)
  const goal = useStore((s) => stepGoalOf(s.profile))
  const setSteps = useStore((s) => s.setSteps)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const isToday = date === todayKey()
  const save = () => {
    const n = parseFloat(value)
    const reaches = n >= goal && !(saved && saved >= goal)
    setSteps(date, value.trim() ? n : undefined)
    setEditing(false); setValue('')
    if (reaches) burst(); else if (n > 0) tap()
  }
  if (saved && !editing) {
    const met = saved >= goal
    return (
      <div className="rounded-2xl bg-card-2 p-3 text-sm">
        <div className="flex items-center gap-3">
          <Footprints size={18} className="text-lavender-500 shrink-0" />
          <div className="flex-1 min-w-0"><span className="font-semibold">{saved.toLocaleString()}</span> <span className="text-muted">of {goal.toLocaleString()} steps{met ? '. Goal reached' : ''}</span></div>
          {!locked && <button className="btn-ghost !py-1 text-xs shrink-0" onClick={() => { setValue(String(saved)); setEditing(true) }}>Edit</button>}
        </div>
        <Progress value={Math.min(1, saved / goal)} className="mt-2" height="h-1.5" />
      </div>
    )
  }
  if (locked) return null
  return (
    <form className="flex items-center gap-2 rounded-2xl bg-card-2 p-2.5" onSubmit={(e) => { e.preventDefault(); save() }}>
      <Footprints size={18} className="text-lavender-500 shrink-0 ml-1" />
      <input type="number" inputMode="numeric" min={1} max={200000} className="input !py-2 flex-1 min-w-0" placeholder={isToday ? 'Steps today' : 'Steps that day'} aria-label={`Step count, from your watch or phone. Goal ${goal.toLocaleString()}`} value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn-soft !py-2 shrink-0" type="submit" disabled={!editing && !value.trim()}>Save</button>
    </form>
  )
}

const ACTIVITY_IDEAS = ['Stairs', 'Short walk', 'Bike', 'Run', 'Swim', 'Yoga', 'Class', 'Sport', 'Hike']
const ADD_MINUTES = 5

/** Anything else you did. Thirty minutes in total earns a little XP, once a day. The streak stays about the walk. */
function OtherActivities({ date, locked }: { date: string; locked?: boolean }) {
  const list = useStore((s) => s.days[date]?.activities)
  const addActivity = useStore((s) => s.addActivity)
  const removeActivity = useStore((s) => s.removeActivity)
  const addActivityMinutes = useStore((s) => s.addActivityMinutes)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [mins, setMins] = useState('30')
  const earned = useStore((s) => s.xp.some((e) => e.id === `activity:${date}`))
  const total = (list ?? []).reduce((n, a) => n + (a.minutes || 0), 0)
  const wouldEarn = !earned && total + (parseFloat(mins) || 0) >= ACTIVITY_MIN_MINUTES
  const [cal, setCal] = useState('')
  const save = () => {
    if (!name.trim()) return
    addActivity(date, { name, minutes: parseFloat(mins) || 0, calories: cal.trim() ? parseFloat(cal) : undefined })
    setOpen(false); setName(''); setMins('30'); setCal(''); hearts()
  }
  return (
    <div className="space-y-2">
      {(list ?? []).map((a) => (
        <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-card-2 p-3 text-sm min-w-0">
          <span className="text-lg shrink-0">🏃‍♀️</span>
          <div className="flex-1 min-w-0"><div className="font-semibold break-words">{a.name}</div><div className="text-xs text-muted">{a.minutes ? `${a.minutes} min` : 'Logged'}{a.calories ? ` · ${a.calories} cal` : ''}</div></div>
          {!locked && <button className="btn-soft !py-1 !px-2.5 text-xs shrink-0 whitespace-nowrap" onClick={() => { addActivityMinutes(date, a.id, ADD_MINUTES); tap() }} aria-label={`Add ${ADD_MINUTES} minutes to ${a.name}`}>+{ADD_MINUTES} min</button>}
          {!locked && <button className="btn-ghost p-1.5" onClick={() => removeActivity(date, a.id)} aria-label={`Remove ${a.name}`}><X size={14} /></button>}
        </div>
      ))}
      {(list ?? []).length > 0 && (
        <div className="flex items-center justify-between gap-3 px-1 text-xs">
          <span className="text-muted">{total} min of other activity today</span>
          {earned ? <span className="chip bg-lavender-500 text-white shrink-0 whitespace-nowrap">+{XP.activity} XP earned</span> : <span className="text-muted shrink-0 whitespace-nowrap">{Math.max(0, ACTIVITY_MIN_MINUTES - total)} min to +{XP.activity} XP</span>}
        </div>
      )}
      {!locked && <button className="w-full rounded-2xl border border-dashed border-line p-3 text-sm text-muted hover:text-ink transition flex items-center justify-center gap-2" onClick={() => setOpen(true)}><Plus size={16} /> Log another activity</button>}
      <Modal open={open} onClose={() => setOpen(false)} title="Other activity">
        <div className="space-y-4">
          <p className="text-sm text-muted">Stairs at work, a class, a bike ride. It goes into your stats. Once the day’s activities add up to {ACTIVITY_MIN_MINUTES} minutes you earn +{XP.activity} XP, once a day. Short bursts count: log the first, then tap +{ADD_MINUTES} min each time. Your streak still comes from the walk.</p>
          <div><label className="label">What was it?</label>
            <input className="input" placeholder="Spin class" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2 mt-2 flex-wrap">{ACTIVITY_IDEAS.map((n) => <button key={n} type="button" onClick={() => setName(n)} className={clsx('chip', name === n ? 'bg-lavender-500 text-white' : 'bg-card-2 text-muted')}>{n}</button>)}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Minutes</label><input type="number" inputMode="numeric" min={0} max={600} className="input" value={mins} onChange={(e) => setMins(e.target.value)} /></div>
            <div><label className="label">Calories</label><input type="number" inputMode="numeric" min={1} max={5000} className="input" placeholder="Optional" aria-label="Calories burned, optional" value={cal} onChange={(e) => setCal(e.target.value)} /></div>
          </div>
          <button className="btn-primary w-full py-3" disabled={!name.trim()} onClick={save}>Save activity{wouldEarn ? ` (+${XP.activity} XP)` : ''}</button>
          {earned && <p className="text-xs text-muted text-center">Today’s activity XP is already earned. This one is still recorded.</p>}
        </div>
      </Modal>
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
  const [strengthCal, setStrengthCal] = useState('')
  const openStrength = () => { setStrengthMin(d?.strength?.minutes ?? 10); setStrengthCal(d?.strength?.calories ? String(d.strength.calories) : ''); setStrengthOpen(true) }
  const walkEarned = useStore((s) => s.xp.find((e) => e.id === `workout:${date}`)?.amount ?? 0)
  const bonusEarned = useStore((s) => s.xp.find((e) => e.id === `shiftbonus:${date}`)?.amount ?? 0)
  const bonusDay = earnsShiftBonus(d?.shift)
  const doubleEarned = useStore((s) => s.xp.find((e) => e.id === `double:${date}`)?.amount ?? 0)
  const doubleOn = useStore((s) => !!s.days[date]?.doubleXp && s.prizes.some((p) => p.id === s.days[date]!.doubleXp))
  const theme = themeFor(date, d?.themeOverride)
  const startDate = useStore((s) => s.profile.startDate)
  const yesterdayKey = addDays(date, -1)
  const yesterday = useStore((s) => s.days[yesterdayKey])
  const [toYesterday, setToYesterday] = useState(false)
  // Only offered when the day in progress is the calendar day: a night-shift day that is still open already takes the walk.
  const lateNight = date === todayKey() && date === toKey() && new Date().getHours() < 6 && !!startDate && dayNumber(startDate, yesterdayKey) >= 1 && !yesterday?.workout

  const done = !!d?.workout
  const complete = (mins: number, inc: number, spd: number, n?: string) => {
    const target = lateNight && toYesterday ? yesterdayKey : date
    logWorkout(target, { minutes: mins, incline: inc, speed: spd, theme: theme.id, notes: n })
    tap([15, 40, 25])
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
      {done ? (
        // A finished walk shrinks to one row, in the same place.
        <div className="px-4 py-3 flex items-center gap-2.5 bg-gradient-to-br from-lavender-500 via-lavender-500 to-blush-400 text-white">
          <span className="grid place-items-center size-5 rounded-full shrink-0 bg-white/25 text-[11px] font-bold" aria-hidden>✓</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">Walk done · {d!.workout!.minutes} min</div>
            <div className="text-xs text-white/85">+{walkEarned} XP{bonusEarned ? ` · +${bonusEarned} shift bonus` : ''}{doubleEarned ? ` · +${doubleEarned} double XP` : ''}</div>
          </div>
          {!locked && (
            <div className="flex items-center gap-1 shrink-0">
              <button className="rounded-full bg-white/20 hover:bg-white/30 p-2" aria-label="Edit this walk" onClick={() => { setMinutes(d!.workout!.minutes); setIncline(d!.workout!.incline); setSpeed(d!.workout!.speed); setNotes(d!.workout!.notes || ''); setCustom(true) }}><Pencil size={14} /></button>
              <button className="rounded-full bg-white/20 hover:bg-white/30 p-2" aria-label="Remove this walk" onClick={() => { if (confirm('Remove this workout log? Its XP will be removed too.')) removeWorkout(date) }}><Trash2 size={14} /></button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5 relative bg-gradient-to-br from-lavender-50 to-blush-50 dark:from-lavender-500/15 dark:to-blush-500/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-lavender-500">{date === todayKey() ? 'Today’s workout' : 'The walk'}</div>
              <div className="h-display text-2xl mt-1">The Standard</div>
              <div className="text-sm mt-1 text-muted">Incline 12 · 3.0 mph · 30 minutes</div>
              {(bonusDay || doubleOn) && <div className="mt-2 flex flex-wrap gap-1.5">{bonusDay && <span className="chip bg-lavender-500 text-white">🛡️ Shift day: +{XP.shiftBonus} bonus XP</span>}{doubleOn && <span className="chip bg-blush-500 text-white">⚡ Double XP is on</span>}</div>}
            </div>
            <div className="text-4xl">🚶‍♀️</div>
          </div>
          {/* When to walk today, worked out from the shift. Gone once a rest day is logged. */}
          {date === todayKey() && !d?.recovery && <WalkPlanPanel date={date} />}
        {!done && !locked && lateNight && (
          <button onClick={() => setToYesterday(!toYesterday)} className={clsx('mt-4 w-full rounded-2xl border p-3 text-left text-sm flex items-center gap-3 transition', toYesterday ? 'border-lavender-400 bg-white/70 dark:bg-white/10' : 'border-line bg-white/40 dark:bg-white/5')}>
            <span className={clsx('size-5 rounded-full grid place-items-center text-xs shrink-0', toYesterday ? 'bg-lavender-500 text-white' : 'border border-line bg-white dark:bg-white/10')}>{toYesterday ? '✓' : ''}</span>
            <span><span className="font-semibold">Post-shift walk? Count it toward yesterday</span><span className="block text-xs text-muted">It’s before 6 AM. Day {dayNumber(startDate!, yesterdayKey)} hasn’t got a walk yet.</span></span>
          </button>
        )}
          {!locked && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn-primary py-3" onClick={() => complete(30, 12, 3)}>Complete standard walk</button>
              <button className="btn bg-white/80 dark:bg-white/10 text-ink py-3" onClick={() => setCustom(true)}>Log a modified walk</button>
            </div>
          )}
        </div>
      )}

      <div className="p-5 space-y-4">
        {!done && <div className="flex items-center gap-3 rounded-2xl bg-card-2 p-3">
          <div className="text-2xl">{theme.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Entertainment theme</div>
            <div className="font-semibold">{theme.name}</div>
            <div className="text-xs text-muted">{theme.blurb}</div>
          </div>
          {!locked && <button onClick={reroll} className="btn-ghost p-2" title="Shuffle theme"><Shuffle size={16} /></button>}
        </div>}

        {!done && (
          <div className="grid grid-cols-2 gap-2">
            <button disabled={locked} onClick={() => { setRecovery(date, !d?.recovery); if (!d?.recovery) hearts() }}
              className={clsx('rounded-2xl border p-3 text-left text-sm transition', d?.recovery ? 'border-mint-400 bg-mint-300/20' : d?.shift === 'recovery' ? 'border-mint-400 ring-2 ring-mint-300/60 bg-card-2' : 'border-line bg-card-2')}>
              <div className="font-semibold">🌿 {d?.recovery ? 'Recovery day logged' : d?.shift === 'recovery' ? 'You planned rest. Tap to log it' : 'Make this a recovery day'}</div>
              <div className="text-xs text-muted">Planned rest. Keeps your streak. +{XP.recovery} XP</div>
            </button>
            <button disabled={locked} onClick={openStrength}
              className={clsx('rounded-2xl border p-3 text-left text-sm transition', d?.strength ? 'border-peach-400 bg-peach-300/20' : 'border-line bg-card-2')}>
              <div className="font-semibold">💪 {d?.strength ? `Strength: ${d.strength.minutes} min${d.strength.calories ? ` · ${d.strength.calories} cal` : ''}` : 'Add strength session'}</div>
              <div className="text-xs text-muted">Optional 10-minute session. +{XP.strength} XP</div>
            </button>
          </div>
        )}
        {done && <WalkCalories date={date} locked={locked} />}
        {done && (
          <button disabled={locked} onClick={openStrength}
            className={clsx('w-full rounded-2xl border p-3 text-left text-sm transition', d?.strength ? 'border-peach-400 bg-peach-300/20' : 'border-line bg-card-2')}>
            <div className="font-semibold">💪 {d?.strength ? `Strength: ${d.strength.minutes} min logged${d.strength.calories ? ` · ${d.strength.calories} cal` : ''}` : 'Add an optional strength session'}</div>
            <div className="text-xs text-muted">Bodyweight, bands, dumbbells. +{XP.strength} XP</div>
          </button>
        )}

        <OtherActivities date={date} locked={locked} />
        <StepsRow date={date} locked={locked} />

        <p className="text-xs text-muted leading-relaxed">
          Listen to your body: pain, dizziness, or heavy fatigue means shorten it or rest. A modified walk is a win. Sleep comes first after a night shift.
        </p>
      </div>

      <Modal open={custom} onClose={() => setCustom(false)} title={done ? 'Edit workout' : 'Log a modified walk'}>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between"><label className="label">Minutes</label><span className="text-sm font-semibold gradient-text">+{walkXp(minutes)} XP{bonusDay ? ` +${XP.shiftBonus} shift bonus` : ''}</span></div>
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
          <div><label className="label">Calories burned (optional)</label><input type="number" inputMode="numeric" min={1} max={5000} className="input" placeholder="From your watch" value={strengthCal} onChange={(e) => setStrengthCal(e.target.value)} /></div>
          <div className="flex gap-2">
            {d?.strength && <button className="btn-danger" onClick={() => { removeStrength(date); setStrengthOpen(false) }}>Remove</button>}
            <button className="btn-primary flex-1" onClick={() => { logStrength(date, strengthMin, d?.strength?.notes, strengthCal.trim() ? parseFloat(strengthCal) : undefined); setStrengthOpen(false); hearts() }}>{d?.strength ? 'Update' : 'Log session'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/** Hydration is logged, not ticked: the quest completes itself when the day's water reaches the goal. */
function HydrationCard({ date, locked, hint }: { date: string; locked?: boolean; hint?: string }) {
  const water = useStore((s) => s.days[date]?.water)
  const canUndo = useStore((s) => (s.days[date]?.waterAdds?.length ?? 0) > 0)
  const done = useStore((s) => !!s.days[date]?.quests?.hydrate)
  const profile = useStore((s) => s.profile)
  const addWater = useStore((s) => s.addWater)
  const undoWater = useStore((s) => s.undoWater)
  const [custom, setCustom] = useState(false)
  const [amount, setAmount] = useState('')
  const [more, setMore] = useState(false) // goal reached, but she wants to keep logging
  const ws = waterSettings(profile)
  const have = fromMl(water ?? 0, ws.unit)
  const goal = fromMl(ws.goalMl, ws.unit)
  const tickedByHand = done && water === undefined // from before water was logged
  const add = (ml: number) => {
    if (!(ml > 0)) return
    const reaches = !done && goalMet((water ?? 0) + ml, ws.goalMl)
    addWater(date, ml)
    tap()
    if (reaches) burst()
  }
  const status = tickedByHand ? 'Ticked off before water logging' : done ? `${have} of ${goal} ${ws.unit}. Goal reached` : `${have} of ${goal} ${ws.unit}`
  // Once the goal is reached the card shrinks to one row where it is; "Log more" opens it again.
  if (done && !more) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border px-3 py-2 border-lavender-300 bg-lavender-50 dark:bg-lavender-500/15 dark:border-lavender-500/40">
        <span className="grid place-items-center size-5 rounded-full shrink-0 text-[11px] font-bold bg-gradient-to-br from-lavender-500 to-blush-400 text-white shadow-glow" aria-hidden>✓</span>
        <span className="text-base shrink-0">💧</span>
        <span className="flex-1 min-w-0 text-sm text-muted" role="status"><span className="font-medium">Hydration</span> · {tickedByHand ? 'ticked off' : `${have} of ${goal} ${ws.unit}`}</span>
        {!locked && !tickedByHand && <button type="button" className="text-xs font-semibold underline text-lavender-600 dark:text-lavender-300 shrink-0 whitespace-nowrap" onClick={() => setMore(true)}>Log more</button>}
      </div>
    )
  }
  return (
    <div className={clsx('rounded-2xl border p-3 transition', done ? 'border-lavender-300 bg-lavender-50 dark:bg-lavender-500/15 dark:border-lavender-500/40' : 'border-line bg-card-2')}>
      <div className="flex items-center gap-3">
        <span className={clsx('grid place-items-center size-7 rounded-full shrink-0 text-sm font-bold', done ? 'bg-gradient-to-br from-lavender-500 to-blush-400 text-white shadow-glow' : 'bg-white dark:bg-white/10 border border-line')} aria-hidden>{done ? '✓' : ''}</span>
        <span className="text-xl shrink-0">💧</span>
        <span className="flex-1 min-w-0">
          <span className="block font-medium">Hydration</span>
          <span className="block text-xs text-muted break-words" role="status">{status}</span>
        </span>
      </div>
      {!tickedByHand && <Progress value={Math.min(1, (water ?? 0) / ws.goalMl)} className="mt-2.5" height="h-2" />}
      {!locked && (
        <>
          <div className="grid grid-cols-3 gap-1.5 mt-2.5">
            {([['Glass', ws.glassMl], ['Bottle', ws.bottleMl]] as const).map(([label, ml]) => (
              <button key={label} type="button" onClick={() => add(ml)} className="rounded-xl bg-card py-1.5 text-center transition active:scale-95 border border-line min-w-0" aria-label={`Add a ${label.toLowerCase()}, ${fromMl(ml, ws.unit)} ${ws.unit}`}>
                <span className="block text-xs font-semibold">{label}</span><span className="block text-[11px] text-muted">+{fromMl(ml, ws.unit)} {ws.unit}</span>
              </button>
            ))}
            <button type="button" onClick={() => setCustom((v) => !v)} className={clsx('rounded-xl py-1.5 text-center transition active:scale-95 border min-w-0', custom ? 'border-lavender-400 bg-lavender-50 dark:bg-lavender-500/15' : 'border-line bg-card')}>
              <span className="block text-xs font-semibold">Other</span><span className="block text-[11px] text-muted">amount</span>
            </button>
          </div>
          {custom && (
            <form className="flex items-center gap-2 mt-2" onSubmit={(e) => { e.preventDefault(); add(toMl(parseFloat(amount) || 0, ws.unit)); setAmount(''); setCustom(false) }}>
              <input type="number" inputMode="decimal" min={1} max={ws.unit === 'oz' ? 200 : 6000} step="any" autoFocus className="input !py-2 flex-1 min-w-0" placeholder={`Amount in ${ws.unit}`} aria-label={`Amount in ${ws.unit}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
              <button type="submit" className="btn-soft !py-2 shrink-0" disabled={!(parseFloat(amount) > 0)}>Add</button>
            </form>
          )}
          <div className="flex items-center justify-between gap-2 mt-2 text-xs text-muted">
            <span className="min-w-0 break-words">{hint}</span>
            {canUndo && <button type="button" className="underline shrink-0 whitespace-nowrap" onClick={() => undoWater(date)}>Undo last</button>}
          </div>
        </>
      )}
    </div>
  )
}

export function QuestList({ date, locked }: { date: string; locked?: boolean }) {
  const d = useStore((s) => s.days[date])
  const toggleQuest = useStore((s) => s.toggleQuest)
  const completeBonus = useStore((s) => s.completeBonusMission)
  const clearBonus = useStore((s) => s.clearBonusMission)
  const tomorrowShift = useStore((s) => s.days[addDays(date, 1)]?.shift)
  const quests = questsFor(date, d?.shift, d?.quests, d?.swaps, tomorrowShift)
  const swapQuest = useStore((s) => s.swapQuest)
  const swapsLeft = useStore((s) => readyPrizes(s, 'swap', todayKey()).length)
  const canSwap = !locked && swapsLeft > 0 && date === todayKey()
  const doneCount = quests.filter((q) => d?.quests?.[q.id]).length
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted px-1"><span>{doneCount}/{quests.length} complete · {XP.quest} XP each</span>{doneCount === quests.length && <span className="gradient-text font-bold">All done ✦</span>}</div>
      {canSwap && <div className="text-xs text-lavender-600 dark:text-lavender-300 px-1">🔁 You have {swapsLeft} quest {swapsLeft === 1 ? 'swap' : 'swaps'}. Tap the swap icon on a quest you’d rather trade.</div>}
      {quests.map((q) => (
        q.id === 'hydrate' ? <HydrationCard key={q.id} date={date} locked={locked} hint={q.hint} /> :
        <div key={q.id} className={clsx('relative', canSwap && q.id !== 'hydrate' && !d?.quests?.[q.id] && '[&>button:first-child]:pr-11')}>
          <Check disabled={locked} checked={!!d?.quests?.[q.id]} onChange={() => { toggleQuest(date, q.id); tap(); if (!d?.quests?.[q.id] && doneCount + 1 === quests.length) burst() }} label={q.title} sub={q.hint} emoji={q.emoji} shrinkWhenDone />
          {canSwap && q.id !== 'hydrate' && !d?.quests?.[q.id] && <button onClick={() => { if (swapQuest(date, q.id)) hearts() }} className="absolute right-2 top-2 btn-ghost p-1.5" aria-label={`Swap “${q.title}” for a different quest`}><Repeat size={14} /></button>}
        </div>
      ))}
      {d?.bonusMission && (
        <div className={clsx('relative', !d.bonusMission.done && !locked && '[&>button:first-child]:pr-14')}>
          <Check disabled={locked || !!d.bonusMission.done} checked={!!d.bonusMission.done} onChange={() => { completeBonus(date); hearts() }} label={d.bonusMission.text} sub={`Bonus mission · ${d.bonusMission.source} · +${XP.bonusMission} XP`} emoji="🎡" shrinkWhenDone />
          {!d.bonusMission.done && !locked && <button onClick={() => clearBonus(date)} className="absolute right-2 top-2 btn-ghost p-1.5 text-xs">Skip</button>}
        </div>
      )}
    </div>
  )
}
