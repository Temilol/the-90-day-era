import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { dateForDay, formatDate, TOTAL_DAYS, weekOf, addDays } from '@/lib/dates'
import { CHAPTERS, MILESTONES } from '@/content/chapters'
import { BOSSES } from '@/content/bosses'
import { PageHeader, Modal, Card } from '@/components/ui'
import { ShiftPicker, WorkoutCard, QuestList, SHIFTS } from '@/components/DayPanel'
import { ShiftTracker } from './Shifts'

type Tab = 'days' | 'shifts'
const TABS: { id: Tab; label: string }[] = [{ id: 'days', label: 'Days' }, { id: 'shifts', label: 'Shifts' }]
const LAST_TAB = 'era-calendar-tab'
const lastTab = (): Tab => { try { return localStorage.getItem(LAST_TAB) === 'shifts' ? 'shifts' : 'days' } catch { return 'days' } }

export default function Calendar() {
  // The tab comes from the link (/calendar#shifts); with no tab, the one she used last.
  const loc = useLocation()
  const hash = loc.hash.slice(1)
  const tab: Tab = hash === 'shifts' || hash === 'days' ? hash : lastTab()
  useEffect(() => { if (hash) try { localStorage.setItem(LAST_TAB, tab) } catch { /* private mode */ } }, [tab, hash])

  const stats = useStats()
  const start = stats.startDate
  const daysToGo = Math.max(0, TOTAL_DAYS - stats.currentDay)
  const sub = !start ? 'Set a start date in Settings first.'
    : stats.finished ? 'Era complete.'
    : stats.started ? `${daysToGo} days until Day 90 · ${formatDate(dateForDay(start, 90), { month: 'long', day: 'numeric' })}`
    : `Starts ${formatDate(start, { month: 'long', day: 'numeric' })}`

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" emoji="🗓️" sub={sub} />

      <div role="tablist" aria-label="Calendar sections" className="grid grid-cols-2 gap-1 rounded-full bg-card-2 p-1 text-sm font-semibold -mt-2">
        {TABS.map((x) => (
          <Link key={x.id} to={`#${x.id}`} replace role="tab" aria-selected={tab === x.id} className={clsx('rounded-full py-2 text-center transition', tab === x.id ? 'bg-card shadow-soft text-ink' : 'text-muted')}>
            {x.label}
          </Link>
        ))}
      </div>

      {tab === 'shifts' ? <ShiftTracker /> : start && <DayGrid start={start} />}
    </div>
  )
}

/** The 90 days as coloured squares, in three chapter cards. A tap opens that day. */
function DayGrid({ start }: { start: string }) {
  const stats = useStats()
  const days = useStore((s) => s.days)
  const [sel, setSel] = useState<number | null>(null)
  // The chapter she is in starts open; the others fold into one line each.
  const currentChapter = (stats.finished ? CHAPTERS[CHAPTERS.length - 1] : CHAPTERS.find((c) => stats.displayDay >= c.from && stats.displayDay <= c.to) ?? CHAPTERS[0]).n
  const [open, setOpen] = useState<Set<number>>(() => new Set([currentChapter]))
  const [keyFor, setKeyFor] = useState<number | null>(null)
  const toggle = (n: number) => setOpen((o) => { const next = new Set(o); if (next.has(n)) next.delete(n); else next.add(n); return next })
  const applyFreeze = useStore((s) => s.applyFreeze)
  const removeFreeze = useStore((s) => s.removeFreeze)

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

  return (
    <>
      {CHAPTERS.map((c) => {
        const isOpen = open.has(c.n)
        const length = c.to - c.from + 1
        // Days of this chapter that have happened so far, and how many of them had a walk.
        const passed = Math.max(0, Math.min(c.to, stats.started || stats.finished ? stats.displayDay : 0) - c.from + 1)
        const walked = Array.from({ length: passed }, (_, i) => c.from + i).filter((n) => days[dateForDay(start, n)]?.workout).length
        const upcoming = passed === 0
        const finishedChapter = passed >= length
        const sub = upcoming ? `Days ${c.from} to ${c.to} · starts ${formatDate(dateForDay(start, c.from), { month: 'short', day: 'numeric' })}`
          : finishedChapter ? `Days ${c.from} to ${c.to} · ${walked} of ${length} walked`
          : `Days ${c.from} to ${c.to} · ${walked} of ${passed} walked so far`
        return (
          <Card key={c.n} className="relative overflow-hidden !p-0">
            <div className={`absolute -right-8 -top-8 size-32 rounded-full bg-gradient-to-br ${c.gradient} opacity-25 blur-2xl`} />
            <button type="button" aria-expanded={isOpen} onClick={() => toggle(c.n)} className="relative w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-lavender-500">Chapter {c.n}{c.n === currentChapter && !stats.finished && stats.started ? ' · now' : ''}</div>
                <div className="h-display text-xl">{c.emoji} {c.name}</div>
                <div className="text-xs text-muted">{sub}</div>
              </div>
              <ChevronDown size={16} className={clsx('text-muted shrink-0 transition', isOpen && 'rotate-180')} />
            </button>
            {isOpen && (
              <div className="relative px-4 pb-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-xs text-muted min-w-0">Tap a day to open it</span>
                  <button type="button" aria-expanded={keyFor === c.n} onClick={() => setKeyFor(keyFor === c.n ? null : c.n)} className="btn-soft !py-1 text-xs shrink-0"><HelpCircle size={14} /> Key</button>
                </div>
                {keyFor === c.n && (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl bg-card-2 p-3 mb-3 text-xs text-muted">
                    {[['done', 'Standard walk'], ['modified', 'Modified walk'], ['recovery', 'Recovery'], ['frozen', 'Streak freeze'], ['missed', 'Unlogged'], ['today', 'Today'], ['upcoming', 'Upcoming']].map(([k, l]) => (
                      <span key={k} className="inline-flex items-center gap-1.5"><span className={clsx('size-4 rounded-md inline-block shrink-0', dot[k])} />{l}</span>
                    ))}
                  </div>
                )}
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
              </div>
            )}
          </Card>
        )
      })}

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
                  ) : (() => { const chapterLeft = stats.freezesLeftByChapter[CHAPTERS.find((c) => sel >= c.from && sel <= c.to)!.n - 1]; const left = chapterLeft + stats.bonusFreezes; return (
                    <div className="rounded-2xl bg-card-2 p-3 text-sm flex items-center justify-between gap-3">
                      <div><div className="font-semibold">🧊 Life happened?</div><div className="text-xs text-muted">{chapterLeft > 0 ? `Use a streak freeze so this day doesn’t count against you. ${chapterLeft} left this chapter${stats.bonusFreezes ? `, plus ${stats.bonusFreezes} from envelopes` : ''}.` : stats.bonusFreezes > 0 ? `This chapter’s freeze is used, but you have ${stats.bonusFreezes} from envelopes.` : 'No freezes left this chapter. Logging a rest or walk here still repairs your streak.'}</div></div>
                      <button className="btn-soft !py-1.5 text-xs shrink-0" disabled={left <= 0} onClick={() => applyFreeze(selDate)}>Freeze</button>
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
    </>
  )
}
