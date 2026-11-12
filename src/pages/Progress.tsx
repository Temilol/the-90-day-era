import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { TOTAL_DAYS } from '@/lib/dates'
import { BADGES } from '@/content/badges'
import { MILESTONES } from '@/content/chapters'
import { PageHeader, Card, Stat, SectionTitle, Progress } from '@/components/ui'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'

export default function ProgressPage() {
  const stats = useStats()
  const badges = useStore((s) => s.badges)
  const maxW = Math.max(1, ...stats.weekly.map((w) => w.workouts))
  const milestonesHit = MILESTONES.filter((m) => stats.currentDay >= m).length
  const hydration = stats.questCounts['hydrate'] || 0
  const lifestyle = [
    ['💧', 'Hydration', hydration], ['🥗', 'Nourishing meals', stats.questCounts['nourish'] || 0], ['🍳', 'Protein', stats.questCounts['protein'] || 0],
    ['🍓', 'Fruit & veg', stats.questCounts['fruitveg'] || 0], ['🌙', 'Sleep protected', stats.questCounts['sleep'] || 0], ['🛁', 'Self-care', stats.selfCareQuests],
  ] as const
  const maxL = Math.max(1, ...lifestyle.map((l) => l[2]))

  return (
    <div className="space-y-6">
      <PageHeader title="Progress & Statistics" emoji="📊" sub={stats.started ? `Day ${stats.displayDay} · ${Math.round((stats.displayDay / TOTAL_DAYS) * 100)}% through the era` : 'Your numbers will appear once the challenge begins.'} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat emoji="🚶‍♀️" label="Workouts" value={stats.workouts} sub={`${stats.fullWorkouts} standard`} />
        <Stat emoji="⏱️" label="Walking minutes" value={stats.walkingMinutes} sub={`${(stats.walkingMinutes / 60).toFixed(1)} hours`} />
        <Stat emoji="✨" label="Lifetime XP" value={stats.lifetimeXp} sub={`Level ${stats.level.level} ${stats.level.title}`} />
        <Stat emoji="🔥" label="Streak" value={stats.streak} sub={`best ${stats.bestStreak}`} />
        <Stat emoji="💪" label="Strength sessions" value={stats.strengthSessions} sub={`${stats.strengthMinutes} min`} />
        <Stat emoji="🌿" label="Recovery days" value={stats.recoveryDays} />
        <Stat emoji="🗺️" label="Quests done" value={stats.questsCompleted} />
        <Stat emoji="⭐" label="Milestones" value={`${milestonesHit}/${MILESTONES.length}`} sub={`${Object.keys(badges).length}/${BADGES.length} badges`} />
      </div>

      <section>
        <SectionTitle sub="Workouts per challenge week. Any length counts.">Weekly consistency</SectionTitle>
        <Card>
          <div className="flex items-end gap-1.5 h-36">
            {stats.weekly.map((w) => (
              <div key={w.week} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="text-[10px] text-muted">{w.workouts || ''}</div>
                <div className={clsx('w-full rounded-t-lg bg-gradient-to-t from-lavender-500 to-blush-300', w.week === stats.week && 'ring-2 ring-blush-400')} style={{ height: `${Math.max(w.workouts ? 6 : 2, (w.workouts / maxW) * 100)}%` }} />
                <div className="text-[10px] text-muted">W{w.week}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
            <div className="rounded-xl bg-card-2 p-2"><div className="font-bold">{stats.weekly[stats.week - 1]?.workouts ?? 0}</div><div className="text-muted">this week</div></div>
            <div className="rounded-xl bg-card-2 p-2"><div className="font-bold">{stats.weekly[stats.week - 1]?.minutes ?? 0}</div><div className="text-muted">minutes</div></div>
            <div className="rounded-xl bg-card-2 p-2"><div className="font-bold">{stats.weekly[stats.week - 1]?.xp ?? 0}</div><div className="text-muted">XP</div></div>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle sub="How often each habit got checked off.">Lifestyle habits</SectionTitle>
        <Card className="space-y-3">
          {lifestyle.map(([e, name, n]) => (
            <div key={name}><div className="flex justify-between text-sm"><span>{e} {name}</span><span className="font-semibold">{n}</span></div><Progress value={n / maxL} className="mt-1" height="h-1.5" /></div>
          ))}
        </Card>
      </section>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link to="/weight" className="card p-4 hover:shadow-glow transition"><div className="font-semibold">⚖️ Weight & non-scale victories</div><div className="text-xs text-muted">{stats.weights} weigh-ins · {stats.nsvs} victories recorded</div></Link>
        <Link to="/achievements" className="card p-4 hover:shadow-glow transition"><div className="font-semibold">🏆 Achievement gallery</div><div className="text-xs text-muted">{Object.keys(badges).length} badges unlocked</div></Link>
      </div>
    </div>
  )
}
