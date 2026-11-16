import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { useUi } from '@/store/ui'
import { useStats, quoteFor, greeting, questsFor } from '@/lib/hooks'
import { formatDate, dateForDay, TOTAL_DAYS, addDays } from '@/lib/dates'
import { CHAPTERS, MILESTONES } from '@/content/chapters'
import { BOSSES, bossProgress } from '@/content/bosses'
import { weekLogs, chapterStats } from '@/lib/stats'
import { THEMES } from '@/content/themes'
import { BADGES } from '@/content/badges'
import { Card, Progress, Ring, Sparkles, Modal } from '@/components/ui'
import { burst } from '@/components/Celebrate'
import { RecapPhotos } from '@/components/Photos'
import { WalkPlanCard, planSummary } from '@/components/WalkPlan'
import { nextEnvelope } from '@/lib/prizes'
import { CAPSULE_FROM_DAY, CAPSULE_UNTIL_DAY } from '@/components/Envelopes'
import { SHIFTS } from '@/components/DayPanel'
import { ArrowRight, Flame, Sparkles as SparkIcon, Swords, Gift, CalendarDays, BookHeart, ShoppingBag, Trophy } from 'lucide-react'
import { DayResetBanner } from '@/components/DayReset'

export default function Dashboard() {
  const stats = useStats()
  const profile = useStore((s) => s.profile)
  const today = stats.today
  const d = useStore((s) => s.days[today])
  const envelopes = useStore((s) => s.envelopes)
  const celebrations = useStore((s) => s.celebrations)
  const markCelebration = useStore((s) => s.markCelebration)
  const celebration = useUi((s) => s.celebration)
  const setCelebration = useUi((s) => s.setCelebration)
  const quote = quoteFor(today)
  const quests = questsFor(today, d?.shift, d?.quests, d?.swaps, useStore.getState().days[addDays(today, 1)]?.shift)
  const questsDone = quests.filter((q) => d?.quests?.[q.id]).length
  const unopened = Object.values(envelopes).filter((e) => !e.openedAt).length
  const tomorrowKey = addDays(today, 1)
  const upcoming = nextEnvelope(stats, envelopes)
  const capsule = useStore((s) => s.capsule)
  const askCapsule = !capsule && stats.started && !stats.finished && stats.currentDay >= CAPSULE_FROM_DAY && stats.currentDay <= CAPSULE_UNTIL_DAY
  const tomorrow = useStore((s) => s.days[tomorrowKey])

  // Chapter celebrations, shown once each
  useEffect(() => {
    const due = CHAPTERS.find((c) => stats.currentDay > c.to && !celebrations[`ch${c.n}`])
    if (due && !celebration) { setCelebration(`ch${due.n}`); burst({ big: true }) }
  }, [stats.currentDay, celebrations, celebration, setCelebration])

  if (!stats.started) return <PreStart />

  const chapter = CHAPTERS[stats.chapter - 1]
  const chapterPct = (Math.min(stats.displayDay, chapter.to) - chapter.from + 1) / 30
  const nextMilestone = MILESTONES.find((m) => m > stats.displayDay) ?? 90
  const boss = BOSSES[stats.week - 1]
  const bp = bossProgress(boss, weekLogs(useStore.getState(), stats.week), stats, Object.keys(useStore.getState().bossTasks[boss.id] || {}).length)
  const bossDone = useStore.getState().xp.some((e) => e.id === `boss:${boss.id}`)
  const bossClose = !bossDone && bp.total > 0 && bp.total - bp.done <= 1
  const claimBoss = useStore.getState().claimBoss
  const workoutDone = !!d?.workout
  const restDone = !!d?.recovery

  return (
    <div className="space-y-6">
      <DayResetBanner />
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-muted">{greeting(profile.name)} 💗</div>
          <h1 className="h-display text-3xl sm:text-4xl">{stats.finished ? 'You finished your era.' : `Day ${stats.displayDay} of ${TOTAL_DAYS}`}</h1>
          <div className="text-sm text-muted">{formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })} · {chapter.emoji} Chapter {chapter.n}: {chapter.name}</div>
        </div>
        <Link to="/xp" className="card px-3 py-2 text-right shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Level {stats.level.level}</div>
          <div className="font-semibold gradient-text leading-tight">{stats.level.title}</div>
        </Link>
      </div>

      {/* Hero: today's mission */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/today" className="block card overflow-hidden relative">
          <div className={`p-5 sm:p-6 bg-gradient-to-br ${workoutDone ? 'from-lavender-500 to-blush-400 text-white' : 'from-lavender-50 via-card to-blush-50 dark:from-lavender-500/15 dark:via-card dark:to-blush-500/10'}`}>
            <Sparkles className={workoutDone ? 'text-white/60' : ''} />
            <div className="relative flex items-center gap-5">
              <Ring value={workoutDone ? 1 : restDone ? 1 : 0} size={96} stroke={9} color={workoutDone ? '#fff' : undefined}>
                <span className="text-3xl">{workoutDone ? '🏆' : restDone ? '🌿' : '🚶‍♀️'}</span>
              </Ring>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold uppercase tracking-[0.2em] ${workoutDone ? 'text-white/80' : 'text-lavender-500'}`}>{workoutDone ? 'Mission complete' : restDone ? 'Recovery day' : 'Today’s mission'}</div>
                <div className="h-display text-xl sm:text-2xl mt-0.5">{workoutDone ? `${d!.workout!.minutes}-minute walk done` : restDone ? 'Rest logged. Proud of you.' : 'Incline 12 · 3 mph · 30 min'}</div>
                <div className={`text-sm mt-1 ${workoutDone ? 'text-white/85' : 'text-muted'}`}>{questsDone}/{quests.length} daily quests · {d?.shift ? SHIFTS.find((x) => x.id === d.shift)?.label.toLowerCase() : 'shift not set'}</div>
              </div>
              <ArrowRight className={workoutDone ? 'text-white' : 'text-lavender-400'} />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="!p-4"><div className="text-xs font-semibold uppercase tracking-wider text-muted">Progress</div><div className="h-display text-2xl mt-1">{Math.round((stats.displayDay / TOTAL_DAYS) * 100)}%</div><Progress value={stats.displayDay / TOTAL_DAYS} className="mt-2" height="h-1.5" /></Card>
        <Card className="!p-4"><div className="text-xs font-semibold uppercase tracking-wider text-muted">Active days</div><div className="h-display text-2xl mt-1">{stats.daysLogged}</div><div className="text-xs text-muted">{stats.daysRemaining} days remaining</div></Card>
        <Card className="!p-4"><div className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1"><Flame size={12} className="text-blush-500" />Streak</div><div className="h-display text-2xl mt-1">{stats.streak}</div><div className="text-xs text-muted">best {stats.bestStreak} · {stats.freezesLeft} 🧊 left</div></Card>
        <Card className="!p-4"><div className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1"><SparkIcon size={12} className="text-lavender-500" />XP</div><div className="h-display text-2xl mt-1">{stats.balanceXp}</div><div className="text-xs text-muted">{stats.lifetimeXp} lifetime</div></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Chapter */}
        <Card className="relative overflow-hidden">
          <div className={`absolute -right-10 -top-10 size-40 rounded-full bg-gradient-to-br ${chapter.gradient} opacity-30 blur-2xl`} />
          <div className="relative">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-lavender-500">Chapter {chapter.n} · {chapter.range}</div>
            <div className="h-display text-2xl mt-1">{chapter.emoji} {chapter.name}</div>
            <p className="text-sm text-muted mt-1">{chapter.theme}</p>
            <Progress value={chapterPct} className="mt-4" />
            <div className="flex justify-between text-xs text-muted mt-1.5"><span>Day {chapter.from}</span><span>Next milestone: Day {nextMilestone} · {formatDate(dateForDay(stats.startDate!, nextMilestone))}</span></div>
            {CHAPTERS.filter((c) => stats.currentDay > c.to).length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">{CHAPTERS.filter((c) => stats.currentDay > c.to).map((c) => <button key={c.n} onClick={() => setCelebration(`ch${c.n}`)} className="chip bg-card-2 text-muted hover:text-ink">{c.emoji} Chapter {c.n} recap</button>)}</div>
            )}
          </div>
        </Card>

        {/* Boss */}
        <Link to="/bosses" className={`card p-5 flex items-center gap-4 hover:shadow-glow transition ${bossClose ? 'ring-2 ring-gold-400' : ''}`}>
          <div className="size-14 rounded-2xl grid place-items-center text-3xl bg-gradient-to-br from-lavender-100 to-blush-100 dark:from-lavender-500/30 dark:to-blush-500/20">{boss.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-lavender-500">Week {stats.week} boss</div>
            <div className="font-semibold truncate">{boss.name}</div>
            <Progress value={bossDone ? 1 : bp.pct} className="mt-2" height="h-1.5" color={bossDone ? 'from-mint-400 to-mint-300' : undefined} />
            <div className="text-xs text-muted mt-1">{bossDone ? 'Defeated ⚔️' : bp.complete ? 'Ready to claim!' : bossClose ? `One step left · ${bp.done}/${bp.total}` : `${Math.round(bp.pct * 100)}% · ${bp.done}/${bp.total}`}</div>
          </div>
          {bp.complete && !bossDone ? <button onClick={(e) => { e.preventDefault(); claimBoss(boss.id); burst({ big: true }) }} className="btn-primary !py-1.5 text-xs shrink-0">Claim</button> : <Swords className="text-lavender-400" size={18} />}
        </Link>
      </div>

      {stats.started && !stats.finished && <WalkPlanCard date={today} setShiftHref="/today" />}

      {stats.started && (unopened > 0 || upcoming) && (
        <Link to="/mystery" className="card !p-4 flex items-center gap-3 hover:shadow-glow transition min-w-0">
          <span className="text-2xl leading-none shrink-0">{unopened > 0 ? '💌' : '✉️'}</span>
          <div className="flex-1 min-w-0">
            {unopened > 0
              ? <><div className="text-sm font-semibold">{unopened} {unopened === 1 ? 'envelope is' : 'envelopes are'} ready to open</div><div className="text-xs text-muted">Pick one of three rewards.</div></>
              : <><div className="text-sm font-semibold break-words">{upcoming!.need} to your next envelope</div><div className="text-xs text-muted break-words">{upcoming!.title}</div></>}
          </div>
          <ArrowRight size={16} className="text-lavender-400 shrink-0" />
        </Link>
      )}
      {askCapsule && (
        <Link to="/mystery#capsule" className="card !p-4 flex items-center gap-3 hover:shadow-glow transition min-w-0">
          <span className="text-2xl leading-none shrink-0">💌</span>
          <div className="flex-1 min-w-0"><div className="text-sm font-semibold">Write to your Day 90 self</div><div className="text-xs text-muted">A short letter, sealed today and handed back at the finish.</div></div>
          <ArrowRight size={16} className="text-lavender-400 shrink-0" />
        </Link>
      )}

      {tomorrow?.shift && !stats.finished && (
        <Card className="!p-4 flex items-start gap-3">
          <span className="text-2xl">{SHIFTS.find((x) => x.id === tomorrow.shift)?.emoji}</span>
          <div><div className="text-xs font-bold uppercase tracking-[0.2em] text-lavender-500">Tomorrow · {formatDate(tomorrowKey)}</div><div className="text-sm mt-0.5">{planSummary(tomorrow.shift, tomorrow.hours)}</div></div>
        </Card>
      )}
      {!tomorrow?.shift && stats.started && !stats.finished && (
        <Link to="/shifts" className="card !p-4 flex items-center gap-3 hover:shadow-glow transition">
          <span className="text-2xl">📅</span>
          <div className="flex-1"><div className="text-sm font-semibold">Plan tomorrow</div><div className="text-xs text-muted">Fill in your schedule once and every day gets its own walk plan.</div></div>
          <ArrowRight size={16} className="text-lavender-400" />
        </Link>
      )}

      {/* Quote */}
      <Card className="text-center py-7 relative overflow-hidden">
        <Sparkles />
        <div className="relative">
          <div className="font-display italic text-xl sm:text-2xl leading-snug">“{quote.text}”</div>
          {quote.by && <div className="text-xs text-muted mt-2">{quote.by}</div>}
        </div>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { to: '/mystery', icon: Gift, label: 'Mystery', badge: unopened },
          { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
          { to: '/journal', icon: BookHeart, label: 'Journal' },
          { to: '/shop', icon: ShoppingBag, label: 'Shop' },
          { to: '/achievements', icon: Trophy, label: 'Badges' },
          { to: '/bosses', icon: Swords, label: 'Bosses' },
        ].map((q) => (
          <Link key={q.to} to={q.to} className="card p-3 flex flex-col items-center gap-1.5 text-xs font-medium relative hover:shadow-glow transition">
            <q.icon size={20} className="text-lavender-500" />{q.label}
            {!!q.badge && <span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-blush-500 text-white text-[10px] grid place-items-center font-bold">{q.badge}</span>}
          </Link>
        ))}
      </div>

      <Modal open={!!celebration} onClose={() => { if (celebration) markCelebration(celebration); setCelebration(null) }}>
        {celebration && (() => { const c = CHAPTERS.find((x) => `ch${x.n}` === celebration)!; const cs = chapterStats(useStore.getState(), c.n); const fav = THEMES.find((t) => t.id === cs.favoriteTheme); return (
          <div className="text-center relative overflow-hidden -m-5 sm:-m-6 p-8">
            <Sparkles />
            <div className="relative">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-lavender-500">{c.n === 3 ? 'Grand celebration' : 'Milestone celebration'}</div>
              <div className="text-7xl my-4 animate-float">{c.emoji}</div>
              <h3 className="h-display text-3xl gradient-text">{c.name} complete</h3>
              <p className="text-muted mt-3 leading-relaxed">{c.celebration}</p>
              <div className="grid grid-cols-3 gap-2 mt-5 text-left">
                {[['🚶‍♀️', cs.workouts, 'walks'], ['⏱️', cs.minutes, 'minutes'], ['✨', cs.xp, 'XP'], ['🔥', cs.bestStreak, 'best streak'], ['🗺️', cs.quests, 'quests'], ['⚔️', cs.bosses, 'bosses']].map(([e, v, l]) => (
                  <div key={l as string} className="rounded-2xl bg-card-2 p-2.5"><div className="text-lg leading-none">{e}</div><div className="h-display text-xl mt-1">{v}</div><div className="text-[11px] text-muted">{l}</div></div>
                ))}
              </div>
              {stats.startDate && <RecapPhotos upTo={dateForDay(stats.startDate, c.to)} />}
              {(cs.badges.length > 0 || fav) && (
                <div className="mt-4 text-sm text-muted space-y-1">
                  {fav && <div>Favourite theme: <span className="text-ink font-medium">{fav.emoji} {fav.name}</span></div>}
                  {cs.badges.length > 0 && <div className="flex flex-wrap justify-center gap-1 pt-1">{cs.badges.map((id) => { const b = BADGES.find((x) => x.id === id); return b ? <span key={id} className="chip bg-lavender-100 text-lavender-700 dark:bg-lavender-500/20 dark:text-lavender-200">{b.emoji} {b.name}</span> : null })}</div>}
                </div>
              )}
              <button className="btn-primary mt-6 w-full" onClick={() => { markCelebration(celebration); setCelebration(null); burst({ big: true }) }}>{c.n === 3 ? 'I’m a legend' : 'On to the next chapter'}</button>
            </div>
          </div>
        ) })()}
      </Modal>
    </div>
  )
}

function PreStart() {
  const stats = useStats()
  const profile = useStore((s) => s.profile)
  const start = profile.startDate
  return (
    <div className="space-y-6">
      <div>
        <div className="text-muted">{greeting(profile.name)} 💗</div>
        <h1 className="h-display text-3xl sm:text-4xl">Your era begins {stats.daysUntilStart === 1 ? 'tomorrow' : `in ${stats.daysUntilStart} days`}</h1>
        <div className="text-sm text-muted">Day 1 is {start ? formatDate(start, { weekday: 'long', month: 'long', day: 'numeric' }) : 'not set'}. Day 90 is {start ? formatDate(addDays(start, 89), { month: 'long', day: 'numeric' }) : ''}.</div>
      </div>
      <Card className="relative overflow-hidden text-center py-10">
        <Sparkles />
        <div className="relative">
          <div className="text-6xl animate-float">🌸</div>
          <div className="h-display text-6xl gradient-text mt-3">{stats.daysUntilStart}</div>
          <div className="text-muted">days until Day 1</div>
        </div>
      </Card>
      <div className="grid sm:grid-cols-3 gap-3">
        {CHAPTERS.map((c) => (
          <Card key={c.n}><div className="text-2xl">{c.emoji}</div><div className="font-semibold mt-1">Chapter {c.n}: {c.name}</div><div className="text-xs text-muted">{c.range}</div><p className="text-sm text-muted mt-2">{c.theme}</p></Card>
        ))}
      </div>
      <Card>
        <div className="font-semibold mb-2">While you wait</div>
        <ul className="text-sm text-muted space-y-1.5 list-disc pl-5">
          <li>Set up your <Link to="/shop" className="text-lavender-600 dark:text-lavender-300 font-medium">reward shop</Link> with prizes you actually want.</li>
          <li>Log your upcoming shifts in the <Link to="/shifts" className="text-lavender-600 dark:text-lavender-300 font-medium">shift tracker</Link> so reminders know when to nudge you.</li>
          <li>Change the start date any time in <Link to="/settings/account" className="text-lavender-600 dark:text-lavender-300 font-medium">Settings</Link>.</li>
        </ul>
      </Card>
    </div>
  )
}
