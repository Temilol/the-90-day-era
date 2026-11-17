import { useState } from 'react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { weekLogs } from '@/lib/stats'
import { BOSSES, bossProgress } from '@/content/bosses'
import { XP } from '@/lib/xp'
import { dateForDay, formatDate } from '@/lib/dates'
import { PageHeader, Progress, Check, Card } from '@/components/ui'
import { burst } from '@/components/Celebrate'
import { ChevronDown } from 'lucide-react'

export default function Bosses() {
  const stats = useStats()
  const store = useStore()
  const [open, setOpen] = useState<number>(stats.finished ? 13 : stats.started ? stats.week : 1)
  const [showPast, setShowPast] = useState(false)
  const [showAhead, setShowAhead] = useState(false)
  const [reflectionText, setReflectionText] = useState<Record<number, string>>({})

  const renderBoss = (b: (typeof BOSSES)[number]) => {
    const defeated = store.xp.some((e) => e.id === `boss:${b.id}`)
    const tasks = store.bossTasks[b.id] || {}
    const p = bossProgress(b, weekLogs(store, b.week), stats, Object.keys(tasks).length)
    const current = b.week === stats.week && stats.started && !stats.finished
    const locked = !stats.startDate || b.week > stats.week
    const past = stats.startDate && b.week < stats.week
    const isOpen = open === b.week
    const reflection = store.reflections[b.week]
    const text = reflectionText[b.week] ?? reflection?.text ?? ''
    return (
      <motion.div layout key={b.id} className={clsx('card overflow-hidden', current && 'ring-2 ring-lavender-400', defeated && 'border-mint-400/60')}>
        <button className="w-full text-left p-4 flex items-center gap-4" onClick={() => setOpen(isOpen ? 0 : b.week)}>
          <div className={clsx('size-14 shrink-0 rounded-2xl grid place-items-center text-3xl', defeated ? 'bg-gradient-to-br from-mint-300 to-lavender-200' : locked ? 'bg-card-2 grayscale opacity-60' : 'bg-gradient-to-br from-lavender-100 to-blush-100 dark:from-lavender-500/30 dark:to-blush-500/20')}>{locked ? '🔒' : b.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-lavender-500">Week {b.week}{stats.startDate && ` · ${formatDate(dateForDay(stats.startDate, (b.week - 1) * 7 + 1), { month: 'short', day: 'numeric' })}`}{current && ' · now'}</div>
            <div className="font-semibold leading-tight break-words">{b.name}</div>
            <div className="text-xs text-muted italic break-words">{b.tagline}</div>
            {!locked && <Progress value={defeated ? 1 : p.pct} className="mt-2" height="h-1.5" color={defeated ? 'from-mint-400 to-mint-300' : undefined} />}
          </div>
          <div className="text-right shrink-0">{defeated ? <span className="chip bg-mint-300/50 text-ink">Defeated</span> : <span className="chip bg-card-2 text-muted">+{XP.boss} XP</span>}</div>
        </button>
        {isOpen && !locked && (
          <div className="px-4 pb-4 space-y-4 border-t border-line pt-4">
            <p className="text-sm">{b.desc}</p>
            {b.auto && (
              <div className="rounded-2xl bg-card-2 p-3">
                <div className="flex justify-between text-sm"><span className="font-medium">{b.auto.label}</span><span className="font-semibold gradient-text">{p.autoVal}/{p.autoTarget}</span></div>
                <Progress value={p.autoTarget ? p.autoVal / p.autoTarget : 0} className="mt-2" height="h-2" />
                <div className="text-xs text-muted mt-1.5">Tracked automatically from your logs{past && !defeated ? '. You can still log past days from the calendar.' : '.'}</div>
              </div>
            )}
            {b.tasks.length > 0 && (
              <div className="space-y-2">
                {b.tasks.map((t) => <Check key={t.id} checked={!!tasks[t.id]} onChange={() => store.toggleBossTask(b.id, t.id)} label={t.text} disabled={defeated} />)}
              </div>
            )}
            {!defeated && (
              <button disabled={!p.complete} className="btn-primary w-full py-3" onClick={() => { store.claimBoss(b.id); burst({ big: true }) }}>
                {p.complete ? `Defeat ${b.name}` : `${p.done}/${p.total} · keep going`}
              </button>
            )}
            <div>
              <div className="label">Weekly reflection · +{XP.reflection} XP</div>
              <textarea className="input min-h-24" placeholder="What worked this week? What got in the way? What are you proud of? (20+ characters)" value={text} onChange={(e) => setReflectionText({ ...reflectionText, [b.week]: e.target.value })} />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted">{reflection ? `Saved ${new Date(reflection.at).toLocaleDateString()}` : 'Not saved yet'}</span>
                <button className="btn-soft" disabled={text.trim().length < 1 || text === reflection?.text} onClick={() => store.saveReflection(b.week, text)}>Save reflection</button>
              </div>
            </div>
          </div>
        )}
        {isOpen && locked && <div className="px-4 pb-4 text-sm text-muted border-t border-line pt-4">Unlocks in week {b.week}. {b.tagline}</div>}
      </motion.div>
    )
  }

  // The boss for the week she is in comes first; earlier ones fold into "Past bosses", later ones into "Coming up".
  const featuredWeek = stats.finished ? 13 : stats.started ? stats.week : 1
  const featured = BOSSES.find((x) => x.week === featuredWeek)!
  const isDefeated = (id: string) => store.xp.some((e) => e.id === `boss:${id}`)
  const earlier = BOSSES.filter((x) => x.week < featuredWeek)
  const pastDefeated = earlier.filter((x) => isDefeated(x.id)).length
  // Anything still to finish comes first.
  const pastOrdered = [...earlier.filter((x) => !isDefeated(x.id)), ...earlier.filter((x) => isDefeated(x.id))]
  const ahead = BOSSES.filter((x) => x.week > featuredWeek)
  const unlocks = stats.startDate && ahead.length ? formatDate(dateForDay(stats.startDate, featuredWeek * 7 + 1), { month: 'short', day: 'numeric' }) : null
  const pastSub = earlier.length === 1 ? (pastDefeated ? 'Defeated' : 'Not defeated yet') : pastDefeated === earlier.length ? `All ${earlier.length} defeated` : `${pastDefeated} of ${earlier.length} defeated`

  const groupRow = (title: string, sub: string, isOpen: boolean, toggle: () => void, accent = false) => (
    <button type="button" aria-expanded={isOpen} onClick={toggle} className="card w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
      <div className="min-w-0"><div className="text-sm font-medium">{title}</div><div className={clsx('text-xs', accent ? 'text-lavender-600 dark:text-lavender-300 font-medium' : 'text-muted')}>{sub}</div></div>
      <ChevronDown size={16} className={clsx('text-muted shrink-0 transition', isOpen && 'rotate-180')} />
    </button>
  )

  return (
    <div className="space-y-5">
      <PageHeader title="Weekly Boss Battles" emoji="⚔️" sub="Thirteen weeks, thirteen bosses. Flexible around your shifts. Defeat them for 25 XP each." />
      <div className="space-y-3">
        {renderBoss(featured)}
        {earlier.length > 0 && (
          <>
            {groupRow('Past bosses', pastSub, showPast, () => setShowPast((v) => !v), pastDefeated < earlier.length)}
            {showPast && <div className="space-y-3">{pastOrdered.map(renderBoss)}</div>}
          </>
        )}
        {ahead.length > 0 && (
          <>
            {groupRow('Coming up', `${ahead.length} more ${ahead.length === 1 ? 'boss' : 'bosses'}${unlocks ? ` · next one unlocks ${unlocks}` : ''}`, showAhead, () => setShowAhead((v) => !v))}
            {showAhead && <div className="space-y-3">{ahead.map(renderBoss)}</div>}
          </>
        )}
      </div>
      <Card className="text-sm text-muted">Bosses never require doubling up after a missed day. If a week gets away from you, the next boss is a fresh start.</Card>
    </div>
  )
}
