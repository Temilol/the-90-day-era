import { useState } from 'react'
import { clsx } from 'clsx'
import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { dateForDay, formatDate, TOTAL_DAYS, weekOf, addDays } from '@/lib/dates'
import { CHAPTERS, MILESTONES } from '@/content/chapters'
import { BOSSES } from '@/content/bosses'
import { PageHeader, Modal, Card } from '@/components/ui'
import { ShiftPicker, WorkoutCard, QuestList, SHIFTS } from '@/components/DayPanel'
import { Link } from 'react-router-dom'

export default function Calendar() {
  const stats = useStats()
  const days = useStore((s) => s.days)
  const start = stats.startDate
  const [sel, setSel] = useState<number | null>(null)
  const useFreeze = useStore((s) => s.useFreeze)
  const removeFreeze = useStore((s) => s.removeFreeze)

  if (!start) return <PageHeader title="90-Day Calendar" emoji="🗓️" sub="Set a start date in Settings first." />

  const status = (n: number) => {
    const date = dateForDay(start, n)
    const d = days[date]
    if (date > stats.today) return 'upcoming'
    if (d?.workout) return d.workout.minutes >= 30 ? 'done' : 'modified'
    if (d?.recovery) return 'recovery'
    if (stats.frozenDates.has(date)) return 'frozen'
    if (date === stats.today) return 'today'
    return 'missed'
  }
  const dot: Record<string, string> = {
    done: 'bg-gradient-to-br from-lavender-500 to-blush-400 text-white shadow-glow',
    modified: 'bg-lavender-200 dark:bg-lavender-500/50 text-lavender-800 dark:text-white',
    recovery: 'bg-mint-300/60 dark:bg-mint-400/30 text-ink',
    frozen: 'bg-sky-200/70 dark:bg-sky-400/25 text-ink',
    missed: 'bg-card-2 text-muted',
    today: 'bg-card ring-2 ring-lavender-400 text-ink',
    upcoming: 'bg-card border border-line text-muted/70',
  }
  const selDate = sel ? dateForDay(start, sel) : null
  const selLog = selDate ? days[selDate] : undefined
  const daysToGo = Math.max(0, TOTAL_DAYS - stats.currentDay)

  return (
    <div className="space-y-6">
      <PageHeader title="90-Day Calendar" emoji="🗓️" sub={stats.finished ? 'Era complete.' : stats.started ? `${daysToGo} days until Day 90 · ${formatDate(dateForDay(start, 90), { month: 'long', day: 'numeric' })}` : `Starts ${formatDate(start, { month: 'long', day: 'numeric' })}`} />

      <div className="flex flex-wrap gap-2 text-xs">
        {[['done', 'Standard walk'], ['modified', 'Modified walk'], ['recovery', 'Recovery'], ['frozen', 'Streak freeze'], ['missed', 'Unlogged'], ['today', 'Today'], ['upcoming', 'Upcoming']].map(([k, l]) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-muted"><span className={clsx('size-4 rounded-md inline-block', dot[k])} />{l}</span>
        ))}
      </div>

      {CHAPTERS.map((c) => (
        <Card key={c.n} className="relative overflow-hidden">
          <div className={`absolute -right-8 -top-8 size-32 rounded-full bg-gradient-to-br ${c.gradient} opacity-25 blur-2xl`} />
          <div className="relative flex items-baseline justify-between mb-3">
            <div><span className="text-xs font-bold uppercase tracking-[0.2em] text-lavender-500">Chapter {c.n}</span><div className="h-display text-xl">{c.emoji} {c.name}</div></div>
            <div className="text-xs text-muted">{c.range}</div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: 30 }, (_, i) => c.from + i).map((n) => {
              const st = status(n)
              const date = dateForDay(start, n)
              const isMilestone = MILESTONES.includes(n)
              const isBossEnd = n % 7 === 0 || n === 90
              const shift = days[date]?.shift
              return (
                <button key={n} onClick={() => setSel(n)} title={formatDate(date)}
                  className={clsx('relative aspect-square rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition active:scale-95 flex flex-col items-center justify-center', dot[st])}>
                  <span>{n}</span>
                  {shift && <span className="text-[9px] leading-none opacity-80">{SHIFTS.find((s) => s.id === shift)?.emoji}</span>}
                  {isMilestone && <span className="absolute -top-1 -right-1 text-[10px]">⭐</span>}
                  {isBossEnd && !isMilestone && <span className="absolute -top-1 -right-1 text-[10px]">⚔️</span>}
                </button>
              )
            })}
          </div>
        </Card>
      ))}

      <Modal open={sel !== null} onClose={() => setSel(null)} wide title={sel ? `Day ${sel} · ${formatDate(selDate!, { weekday: 'long', month: 'long', day: 'numeric' })}` : ''}>
        {sel && selDate && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="chip bg-lavender-100 text-lavender-700 dark:bg-lavender-500/20 dark:text-lavender-200">Week {weekOf(sel)} · {BOSSES[weekOf(sel) - 1].emoji} {BOSSES[weekOf(sel) - 1].name}</span>
              {MILESTONES.includes(sel) && <span className="chip bg-gold-300/50 text-ink">⭐ Milestone day</span>}
              <span className="chip bg-card-2 text-muted">Chapter {CHAPTERS.find((c) => sel >= c.from && sel <= c.to)!.n}</span>
            </div>
            {selDate > stats.today ? (
              <div>
                <p className="text-sm text-muted mb-3">This day is {selDate === addDays(stats.today, 1) ? 'tomorrow' : 'coming up'}. You can plan your shift now; workouts unlock on the day.</p>
                <ShiftPicker date={selDate} />
              </div>
            ) : (
              <>
                <div><div className="label">Shift</div><ShiftPicker date={selDate} compact /></div>
                {selDate < stats.today && !selLog?.workout && !selLog?.recovery && (
                  stats.frozenDates.has(selDate) ? (
                    <div className="rounded-2xl border border-sky-300/60 bg-sky-200/30 dark:bg-sky-400/15 p-3 text-sm flex items-center justify-between gap-3">
                      <div><div className="font-semibold">🧊 Streak freeze applied</div><div className="text-xs text-muted">This day doesn’t break your streak. Logging a walk or rest here gives the freeze back.</div></div>
                      <button className="btn-ghost !py-1.5 text-xs" onClick={() => removeFreeze(selDate)}>Undo</button>
                    </div>
                  ) : (() => { const left = stats.freezesLeftByChapter[CHAPTERS.find((c) => sel >= c.from && sel <= c.to)!.n - 1]; return (
                    <div className="rounded-2xl bg-card-2 p-3 text-sm flex items-center justify-between gap-3">
                      <div><div className="font-semibold">🧊 Life happened?</div><div className="text-xs text-muted">{left > 0 ? `Use a streak freeze so this day doesn’t count against you. ${left} left this chapter.` : 'No freezes left this chapter. Logging a rest or walk here still repairs your streak.'}</div></div>
                      <button className="btn-soft !py-1.5 text-xs shrink-0" disabled={left <= 0} onClick={() => useFreeze(selDate)}>Freeze</button>
                    </div>
                  ) })()
                )}
                <WorkoutCard date={selDate} />
                <div><div className="label">Quests</div><QuestList date={selDate} /></div>
                {selLog?.journal && <div className="text-xs text-muted">Journal entry saved · <Link to={`/journal?date=${selDate}`} className="text-lavender-600 dark:text-lavender-300 font-medium">open</Link></div>}
                {!selLog?.journal && <Link to={`/journal?date=${selDate}`} className="btn-soft w-full">Write a journal entry for this day</Link>}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
