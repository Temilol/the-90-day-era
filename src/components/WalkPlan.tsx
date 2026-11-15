import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { ArrowRight, Clock } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { addDays, todayKey } from '@/lib/dates'
import { minutesInto } from '@/lib/dayReset'
import { planFor, planStatus, usualWalkTime, clockRange } from '@/lib/walkPlan'
import { earnsShiftBonus, XP } from '@/lib/xp'

/**
 * Minutes since midnight at the start of the given day, refreshed every half minute so the countdown
 * stays honest. Goes past 1,440 when the day is still running the next morning.
 */
function useNowMinutes(date: string): number {
  const read = () => minutesInto(date, new Date())
  const [now, setNow] = useState(read)
  useEffect(() => {
    const tick = () => setNow(minutesInto(date, new Date()))
    tick()
    const i = setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', tick) }
  }, [date])
  return now
}

/** The day's walk guidance, front and centre. Hidden once the walk or a rest day is logged. */
export function WalkPlanCard({ date, setShiftHref }: { date: string; setShiftHref?: string }) {
  const days = useStore((s) => s.days)
  const now = useNowMinutes(date)
  const d = days[date]
  const shift = d?.shift
  const usual = useMemo(() => (shift ? usualWalkTime(days, shift) : null), [days, shift])
  if (d?.workout || d?.recovery) return null
  const isToday = date === todayKey()

  if (!shift) {
    const body = (
      <>
        <span className="size-11 shrink-0 rounded-2xl grid place-items-center bg-lavender-100 dark:bg-lavender-500/20 text-lavender-600 dark:text-lavender-200"><Clock size={20} /></span>
        <div className="flex-1"><div className="font-semibold">No walk plan yet</div><div className="text-xs text-muted">Set {isToday ? 'today’s' : 'this day’s'} shift and you’ll get the best times to walk around it.</div></div>
      </>
    )
    return setShiftHref
      ? <Link to={setShiftHref} className="card !p-4 flex items-center gap-3 hover:shadow-glow transition">{body}<ArrowRight size={16} className="text-lavender-400" /></Link>
      : <div className="card !p-4 flex items-center gap-3">{body}</div>
  }

  const plan = planFor(shift, d?.hours, usual)
  const status = isToday ? planStatus(plan, now) : null
  const open = status?.state === 'open'
  const offNights = isToday && days[addDays(date, -1)]?.shift === 'night' && now < 720 && shift !== 'recovery'
  return (
    <div className={clsx('card overflow-hidden', open && 'ring-2 ring-blush-400 shadow-glow')}>
      <div className={clsx('p-5', open ? 'bg-gradient-to-br from-lavender-500 to-blush-400 text-white' : 'bg-gradient-to-br from-lavender-50 to-blush-50 dark:from-lavender-500/15 dark:to-blush-500/10')}>
        <div className={clsx('text-xs font-bold uppercase tracking-[0.2em]', open ? 'text-white/80' : 'text-lavender-500')}>{isToday ? 'Today’s walk plan' : 'Walk plan'}</div>
        <div className="h-display text-xl sm:text-2xl mt-1">{plan.kind === 'rest' ? '🌿 ' : ''}{plan.headline}</div>
        {status && <div className={clsx('mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold', open ? 'bg-white/25' : status.state === 'upcoming' ? 'bg-lavender-500 text-white' : 'bg-card text-muted')}><Clock size={14} /> {status.text}</div>}
      </div>
      {(plan.windows.length > 0 || plan.note || offNights || earnsShiftBonus(shift)) && (
        <div className="p-5 space-y-2">
          {offNights && <p className="text-sm">You came off a night shift this morning. Sleep first. The times below will still be there.</p>}
          {plan.windows.map((w, i) => (
            <div key={w.label} className={clsx('flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm', status?.index === i ? 'bg-lavender-100 dark:bg-lavender-500/20' : 'bg-card-2')}>
              <span className={clsx(status?.index === i ? 'font-semibold' : 'text-muted')}>{w.label}</span>
              <span className="font-semibold whitespace-nowrap">{clockRange(w)}</span>
            </div>
          ))}
          {plan.note && <p className="text-xs text-muted">{plan.note}</p>}
          {plan.windows.some((w) => w.label === 'Your usual time') && <p className="text-xs text-muted">“Your usual time” comes from when you’ve logged walks on this kind of day.</p>}
          {earnsShiftBonus(shift) && <p className="text-xs font-medium text-lavender-600 dark:text-lavender-300">🛡️ Walking on a shift day earns +{XP.shiftBonus} bonus XP.</p>}
        </div>
      )}
    </div>
  )
}

/** One line about a coming day, for the dashboard. */
export function planSummary(shift: Parameters<typeof planFor>[0], hours: Parameters<typeof planFor>[1]): string {
  const plan = planFor(shift, hours)
  const times = plan.windows.map((w) => `${w.label}: ${clockRange(w)}`).join(' · ')
  return [plan.headline, times || plan.note].filter(Boolean).join('. ')
}
