import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { Clock } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { addDays } from '@/lib/dates'
import { minutesInto } from '@/lib/dayReset'
import { planFor, planStatus, usualWalkTime, clockRange, clock } from '@/lib/walkPlan'

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

/** "4:30 to 5:15 AM": the AM or PM is said once when both ends share it, so the row fits a narrow phone. */
function shortRange(w: { start: number; end: number }): string {
  const [a, b] = [clock(w.start), clock(w.end)]
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} to ${b}` : `${a} to ${b}`
}

/**
 * The same guidance in a small panel, for inside the walk card: a countdown, then one line per
 * window with the current or next one picked out and passed ones dimmed.
 */
export function WalkPlanPanel({ date, setShiftHref }: { date: string; setShiftHref?: string }) {
  const days = useStore((s) => s.days)
  const now = useNowMinutes(date)
  const d = days[date]
  const shift = d?.shift
  const usual = useMemo(() => (shift ? usualWalkTime(days, shift) : null), [days, shift])
  const box = 'mt-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-line/60 p-3'
  if (!shift) {
    return (
      <div className={clsx(box, 'flex items-center gap-2.5 text-sm')}>
        <Clock size={16} className="shrink-0 text-lavender-500" />
        <span className="flex-1 min-w-0 text-muted">Set today’s shift to see the best times to walk.</span>
        {setShiftHref && <Link to={setShiftHref} className="text-xs font-semibold underline text-lavender-600 dark:text-lavender-300 shrink-0">Set it</Link>}
      </div>
    )
  }
  const plan = planFor(shift, d?.hours, usual)
  const status = planStatus(plan, now)
  const offNights = days[addDays(date, -1)]?.shift === 'night' && now < 720 && shift !== 'recovery'
  return (
    <div className={box}>
      <div className="flex items-start gap-2 text-sm font-semibold text-lavender-600 dark:text-lavender-300">
        <Clock size={15} className="shrink-0 mt-0.5" />
        <span className="min-w-0">{status ? status.text : plan.headline}</span>
      </div>
      {plan.windows.length > 0 && (
        <div className="mt-2 space-y-1">
          {plan.windows.map((w, i) => {
            const current = status?.index === i
            return (
              <div key={w.label} className={clsx('flex items-center justify-between gap-3 rounded-xl px-2.5 py-1.5 text-sm', current && 'bg-lavender-100 dark:bg-lavender-500/20', !current && w.end <= now && 'opacity-50')}>
                <span className={clsx('min-w-0', current ? 'font-semibold' : 'text-muted')}>{w.label}</span>
                <span className="font-semibold whitespace-nowrap">{shortRange(w)}</span>
              </div>
            )
          })}
        </div>
      )}
      {offNights && <p className="text-xs text-muted mt-2">You came off a night shift this morning. Sleep first. The times above will still be there.</p>}
      {plan.note && <p className="text-xs text-muted mt-2">{plan.note}</p>}
      {plan.windows.some((w) => w.label === 'Your usual time') && <p className="text-xs text-muted mt-2">“Your usual time” comes from when you’ve logged walks on this kind of day.</p>}
    </div>
  )
}

/** The walk guidance as one line, for the mission card on Home. Nothing once the walk or a rest day is logged. */
export function WalkPlanLine({ date }: { date: string }) {
  const days = useStore((s) => s.days)
  const now = useNowMinutes(date)
  const d = days[date]
  const shift = d?.shift
  const usual = useMemo(() => (shift ? usualWalkTime(days, shift) : null), [days, shift])
  if (d?.workout || d?.recovery) return null
  const plan = shift ? planFor(shift, d?.hours, usual) : null
  const text = !plan ? 'Set today’s shift for the best times to walk' : planStatus(plan, now)?.text ?? plan.headline
  return <div className="text-xs font-semibold text-lavender-600 dark:text-lavender-300 mt-2 flex items-start gap-1.5"><Clock size={13} className="shrink-0 mt-0.5" /><span className="min-w-0">{text}</span></div>
}

/** One line about a coming day, for the dashboard. */
export function planSummary(shift: Parameters<typeof planFor>[0], hours: Parameters<typeof planFor>[1]): string {
  const plan = planFor(shift, hours)
  const times = plan.windows.map((w) => `${w.label}: ${clockRange(w)}`).join(' · ')
  return [plan.headline, times || plan.note].filter(Boolean).join('. ')
}
