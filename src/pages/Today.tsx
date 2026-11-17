import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { useStats, quoteFor } from '@/lib/hooks'
import { formatDate, TOTAL_DAYS } from '@/lib/dates'
import { ShiftPicker, WorkoutCard, QuestList, SHIFTS } from '@/components/DayPanel'
import { workHours, clock } from '@/lib/walkPlan'
import { BONUS, journalEarns, journalLength } from '@/lib/bonuses'
import { DayResetBanner } from '@/components/DayReset'
import { Card, PageHeader, SectionTitle } from '@/components/ui'
import { CHAPTERS } from '@/content/chapters'
import { BookHeart, Gift } from 'lucide-react'

export default function Today() {
  const stats = useStats()
  const today = stats.today
  const d = useStore((s) => s.days[today])
  const quote = quoteFor(today)
  const [pickShift, setPickShift] = useState(false)
  const shiftDef = SHIFTS.find((s) => s.id === d?.shift)
  const shiftHours = workHours(d?.shift, d?.hours)
  const journalDone = journalLength(d?.journal) >= BONUS.journalMinChars
  const journalStarted = !!d?.journal && !journalDone
  const journalXp = !!d && journalEarns(d)
  const chapter = CHAPTERS[stats.chapter - 1]

  if (!stats.started) {
    return (
      <div>
        <PageHeader title="Today’s Mission" emoji="🎯" sub="Your challenge hasn’t started yet." />
        <Card className="text-center py-10"><div className="text-5xl">⏳</div><div className="mt-2 font-semibold">{stats.daysUntilStart} days until Day 1</div><div className="text-sm text-muted">You can log shifts now. Workouts and quests unlock on Day 1.</div><div className="mt-5"><ShiftPicker date={today} /></div></Card>
      </div>
    )
  }
  if (stats.finished) {
    return (
      <div>
        <PageHeader title="Today’s Mission" emoji="🎯" sub="The 90 days are complete." />
        <Card className="text-center py-10"><div className="text-5xl">👑</div><div className="mt-2 h-display text-2xl">Era complete</div><div className="text-sm text-muted">Your history, badges, and rewards are all saved. Start a new era from Settings whenever you’re ready.</div></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Today’s Mission" emoji="🎯" sub={`Day ${stats.displayDay} of ${TOTAL_DAYS} · ${formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })} · ${chapter.emoji} ${chapter.name}`} />
      <DayResetBanner />

      {shiftDef && !pickShift ? (
        // Once the shift is set it takes one line; "Change" brings the picker back.
        <div className="card !p-3 flex items-center gap-3">
          <span className="text-xl shrink-0">{shiftDef.emoji}</span>
          <div className="flex-1 min-w-0"><div className="font-semibold">{shiftDef.label}</div><div className="text-xs text-muted">{shiftHours ? `${clock(shiftHours.start)} to ${clock(shiftHours.end)}` : shiftDef.sub}</div></div>
          <button className="btn-soft !py-1.5 text-xs shrink-0" onClick={() => setPickShift(true)}>Change</button>
        </div>
      ) : (
        <section>
          <SectionTitle sub="Your shift sets today’s walk plan and shapes one of your quests." action={<Link to="/shifts" className="btn-soft !py-1.5 text-xs">Fill in schedule</Link>}>What kind of day is it?</SectionTitle>
          <ShiftPicker date={today} />
          {shiftDef && <button className="btn-soft w-full mt-3" onClick={() => setPickShift(false)}>Done</button>}
        </section>
      )}

      <section>
        <SectionTitle sub="The foundation. Standard or modified, it all counts.">The walk</SectionTitle>
        <WorkoutCard date={today} />
      </section>

      <section>
        <SectionTitle sub="Small habits, bonus XP. Tap to check off." action={<Link to="/mystery#wheel" className="btn-soft !py-1.5 text-xs"><Gift size={14} /> {d?.bonusMission?.done ? 'Spin for tomorrow' : d?.bonusMission ? 'Swap bonus' : 'Spin for a bonus'}</Link>}>Daily quests</SectionTitle>
        <QuestList date={today} />
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
        {journalDone ? (
          <Link to="/journal" className="card !px-3 !py-2 flex items-center gap-3 self-start hover:shadow-glow transition">
            <span className="grid place-items-center size-5 rounded-full shrink-0 text-[11px] font-bold bg-gradient-to-br from-lavender-500 to-blush-400 text-white" aria-hidden>✓</span>
            <span className="flex-1 min-w-0 text-sm text-muted"><span className="font-medium">Journal written</span>{journalXp ? ` · +${BONUS.journal} XP` : ''}</span>
            <span className="text-xs font-semibold underline text-lavender-600 dark:text-lavender-300 shrink-0">Edit</span>
          </Link>
        ) : (
          <Link to="/journal" className="card p-4 flex items-center gap-3 hover:shadow-glow transition">
            <span className="size-11 shrink-0 rounded-2xl grid place-items-center bg-lavender-100 dark:bg-lavender-500/20 text-lavender-600 dark:text-lavender-200"><BookHeart size={20} /></span>
            <div className="min-w-0"><div className="font-semibold">{journalStarted ? 'Journal started' : 'Write today’s journal'}</div><div className="text-xs text-muted">{journalStarted ? `Add a few words to earn +${BONUS.journal} XP.` : 'Mood, energy, gratitude, one small win.'}</div></div>
          </Link>
        )}
        <Card className="!p-4 flex items-center gap-3">
          <span className="text-2xl">💭</span>
          <div className="font-display italic text-sm leading-snug">“{quote.text}”</div>
        </Card>
      </section>
    </div>
  )
}
