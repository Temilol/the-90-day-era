import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { SHIFTS } from '@/components/DayPanel'
import { addDays, dayNumber, formatDate } from '@/lib/dates'
import { waterSettings, fromMl } from '@/lib/water'
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
  const ws = waterSettings(useStore((s) => s.profile))
  const maxW = Math.max(1, ...stats.weekly.map((w) => w.workouts))
  const milestonesHit = MILESTONES.filter((m) => stats.currentDay >= m).length
  const hydration = stats.questCounts['hydrate'] || 0
  const lifestyle = [
    ['💧', 'Hydration', hydration], ['🥗', 'Nourishing meals', stats.questCounts['nourish'] || 0], ['🍳', 'Protein', stats.questCounts['protein'] || 0],
    ['🍓', 'Fruit & veg', stats.questCounts['fruitveg'] || 0], ['🌙', 'Sleep protected', stats.questCounts['sleep'] || 0], ['🛁', 'Self-care', stats.selfCareQuests],
  ] as const
  const maxL = Math.max(1, ...lifestyle.map((l) => l[2]))

  // Walks by kind of day. Recovery days are left out: they aren't meant to have a walk.
  const shiftRows = SHIFTS.filter((s) => s.id !== 'recovery').map((s) => ({ ...s, ...stats.byShift[s.id] })).filter((r) => r.days > 0).map((r) => ({ ...r, rate: r.walks / r.days }))
  const judged = shiftRows.filter((r) => r.days >= 3).sort((a, b) => b.rate - a.rate)
  const insight = judged.length >= 2 && judged[0].rate - judged[judged.length - 1].rate >= 0.15
    ? `You walk most on ${judged[0].label.toLowerCase()} days (${Math.round(judged[0].rate * 100)}%) and least on ${judged[judged.length - 1].label.toLowerCase()} days (${Math.round(judged[judged.length - 1].rate * 100)}%). That second one is where a different walk time would help most.`
    : judged.length >= 2 ? 'Your walking is steady across every kind of day. That is the hard part, done.' : null

  // Calories: typed-in numbers only.
  const cal = stats.calories
  const [calRange, setCalRange] = useState<'recent' | 'all'>('recent')
  const calDates: string[] = []
  if (stats.startDate && stats.started) {
    const end = stats.finished ? addDays(stats.startDate, TOTAL_DAYS - 1) : stats.today
    const first = calRange === 'all' ? stats.startDate : (addDays(end, -13) < stats.startDate ? stats.startDate : addDays(end, -13))
    for (let c = first; c <= end; c = addDays(c, 1)) calDates.push(c)
  }
  const calMax = Math.max(1, ...calDates.map((c) => cal.byDate[c] || 0))

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
        <SectionTitle sub="How often you walk on each kind of day.">Walks by shift</SectionTitle>
        <Card className="space-y-3">
          {shiftRows.length === 0 && <p className="text-sm text-muted">Nothing to show yet. <Link to="/shifts" className="text-lavender-600 dark:text-lavender-300 font-medium">Fill in your schedule</Link> and this will show which kind of day is easiest and hardest to walk on.</p>}
          {shiftRows.map((r) => (
            <div key={r.id}>
              <div className="flex justify-between gap-3 text-sm"><span>{r.emoji} {r.label}</span><span className="text-muted"><span className="font-semibold text-ink">{r.walks} of {r.days}</span> {r.days === 1 ? 'day' : 'days'} · {Math.round(r.rate * 100)}%{r.walks ? ` · avg ${Math.round(r.minutes / r.walks)} min` : ''}</span></div>
              <Progress value={r.rate} className="mt-1" height="h-1.5" />
            </div>
          ))}
          {insight && <p className="text-sm rounded-2xl bg-card-2 p-3">{insight}</p>}
        </Card>
      </section>

      <section>
        <SectionTitle sub="Only the numbers you typed in from your treadmill or watch. Nothing is estimated." action={cal.daysWithData > 0 ? <div className="grid grid-cols-2 gap-1 rounded-full bg-card-2 p-1 text-xs font-semibold">{([['recent', '2 weeks'], ['all', 'All']] as const).map(([id, label]) => <button key={id} onClick={() => setCalRange(id)} className={clsx('rounded-full px-3 py-1 transition whitespace-nowrap', calRange === id ? 'bg-card shadow-soft text-ink' : 'text-muted')}>{label}</button>)}</div> : undefined}>Calories burned</SectionTitle>
        <Card>
          {cal.daysWithData === 0 ? (
            <p className="text-sm text-muted">No calories logged yet. After a walk, type in the number your treadmill or watch shows. You can add it to strength sessions and other activities too.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-xl bg-card-2 p-2"><div className="font-bold text-base">{cal.total.toLocaleString()}</div><div className="text-muted">total</div></div>
                <div className="rounded-xl bg-card-2 p-2"><div className="font-bold text-base">{cal.walksWithData ? Math.round(cal.walkTotal / cal.walksWithData) : '–'}</div><div className="text-muted">avg per walk</div></div>
                <div className="rounded-xl bg-card-2 p-2"><div className="font-bold text-base">{Math.round(cal.total / cal.daysWithData)}</div><div className="text-muted">avg per logged day</div></div>
                <div className="rounded-xl bg-card-2 p-2"><div className="font-bold text-base">{cal.best?.value ?? '–'}</div><div className="text-muted">{cal.best ? `best, ${formatDate(cal.best.date, { month: 'short', day: 'numeric' })}` : 'best day'}</div></div>
              </div>
              <div className="flex items-end gap-[3px] h-36 mt-4" role="img" aria-label="Calories burned per day">
                {calDates.map((c) => { const v = cal.byDate[c] || 0; const n = stats.startDate ? dayNumber(stats.startDate, c) : 0; return (
                  <div key={c} className="flex-1 min-w-0 flex flex-col items-center gap-1 h-full justify-end" title={`${formatDate(c, { month: 'short', day: 'numeric' })}: ${v ? `${v} cal` : 'none logged'}`}>
                    {calDates.length <= 14 && <div className="text-[10px] text-muted">{v || ''}</div>}
                    <div className={clsx('w-full rounded-t-md', v ? 'bg-gradient-to-t from-peach-400 to-blush-300' : 'bg-line/60')} style={{ height: v ? `${Math.max(6, (v / calMax) * 100)}%` : '2px' }} />
                    <div className="text-[10px] text-muted h-3 leading-3">{calDates.length <= 14 || n % 10 === 0 || n === 1 ? n : ''}</div>
                  </div>
                ) })}
              </div>
              <p className="text-xs text-muted mt-2 text-center">Calories per challenge day. {cal.daysWithData} {cal.daysWithData === 1 ? 'day has' : 'days have'} a number; the rest are left blank.{stats.otherActivities ? ` Includes ${stats.otherActivities} other ${stats.otherActivities === 1 ? 'activity' : 'activities'}.` : ''}</p>
            </>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle sub="How often each habit got checked off.">Lifestyle habits</SectionTitle>
        <Card className="space-y-3">
          {lifestyle.map(([e, name, n]) => (
            <div key={name}><div className="flex justify-between text-sm"><span>{e} {name}</span><span className="font-semibold">{n}</span></div><Progress value={n / maxL} className="mt-1" height="h-1.5" /></div>
          ))}
          {stats.water.days > 0 && <p className="text-sm rounded-2xl bg-card-2 p-3">💧 You average <span className="font-semibold">{fromMl(stats.water.totalMl / stats.water.days, ws.unit)} {ws.unit}</span> on the {stats.water.days} {stats.water.days === 1 ? 'day' : 'days'} you logged water, and reached your goal on {hydration} of them.</p>}
        </Card>
      </section>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link to="/weight" className="card p-4 hover:shadow-glow transition"><div className="font-semibold">⚖️ Weight & non-scale victories</div><div className="text-xs text-muted">{stats.weights} weigh-ins · {stats.nsvs} victories recorded</div></Link>
        <Link to="/achievements" className="card p-4 hover:shadow-glow transition"><div className="font-semibold">🏆 Achievement gallery</div><div className="text-xs text-muted">{Object.keys(badges).length} badges unlocked</div></Link>
      </div>
    </div>
  )
}
