import { Link } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { useStats, quoteFor } from '@/lib/hooks'
import { formatDate, TOTAL_DAYS } from '@/lib/dates'
import { ShiftPicker, WorkoutCard, QuestList } from '@/components/DayPanel'
import { Card, PageHeader, SectionTitle } from '@/components/ui'
import { CHAPTERS } from '@/content/chapters'
import { BookHeart, Gift } from 'lucide-react'

export default function Today() {
  const stats = useStats()
  const today = stats.today
  const d = useStore((s) => s.days[today])
  const quote = quoteFor(today)
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

      <section>
        <SectionTitle sub="Log your shift so reminders and stats know the context.">1. What kind of day is it?</SectionTitle>
        <ShiftPicker date={today} />
        {d?.shift === 'night' && <p className="text-xs text-muted mt-2">Night shift tip: sleep first. A walk after you wake up counts just the same as one before work.</p>}
      </section>

      <section>
        <SectionTitle sub="The foundation. Standard or modified, it all counts.">2. The walk</SectionTitle>
        <WorkoutCard date={today} />
      </section>

      <section>
        <SectionTitle sub="Small habits, bonus XP. Tap to check off." action={<Link to="/mystery" className="btn-soft !py-1.5 text-xs"><Gift size={14} /> {d?.bonusMission?.done ? 'Spin for tomorrow' : d?.bonusMission ? 'Swap bonus' : 'Spin for a bonus'}</Link>}>3. Daily quests</SectionTitle>
        <QuestList date={today} />
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
        <Link to="/journal" className="card p-4 flex items-center gap-3 hover:shadow-glow transition">
          <span className="size-11 rounded-2xl grid place-items-center bg-lavender-100 dark:bg-lavender-500/20 text-lavender-600 dark:text-lavender-200"><BookHeart size={20} /></span>
          <div><div className="font-semibold">{d?.journal?.mood ? 'Journal started' : 'Write today’s journal'}</div><div className="text-xs text-muted">Mood, energy, gratitude, one small win.</div></div>
        </Link>
        <Card className="!p-4 flex items-center gap-3">
          <span className="text-2xl">💭</span>
          <div className="font-display italic text-sm leading-snug">“{quote.text}”</div>
        </Card>
      </section>
    </div>
  )
}
