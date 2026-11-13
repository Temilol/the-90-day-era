import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { LEVELS, XP } from '@/lib/xp'
import { formatDate } from '@/lib/dates'
import { PageHeader, Card, Progress, Ring, SectionTitle, Empty } from '@/components/ui'
import { clsx } from 'clsx'

export default function XpPage() {
  const stats = useStats()
  const xp = useStore((s) => s.xp)
  const purchases = useStore((s) => s.purchases)
  const history = [...xp.map((e) => ({ at: e.at, date: e.date, amount: e.amount, reason: e.reason })), ...purchases.map((p) => ({ at: p.at, date: p.at.slice(0, 10), amount: -p.cost, reason: `Reward: ${p.name}` }))]
    .sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60)
  const maxWeek = Math.max(1, ...stats.weekly.map((w) => w.xp))

  return (
    <div className="space-y-6">
      <PageHeader title="XP & Levels" emoji="✨" sub="Lifetime XP sets your level. Spending XP in the shop never lowers it." />
      <Card className="flex flex-col sm:flex-row items-center gap-6">
        <Ring value={stats.level.progress} size={150} stroke={12}>
          <div className="text-center"><div className="text-[10px] font-bold uppercase tracking-wider text-muted">Level</div><div className="h-display text-4xl gradient-text">{stats.level.level}</div><div className="text-xs font-semibold">{stats.level.title}</div></div>
        </Ring>
        <div className="flex-1 w-full">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-card-2 p-3"><div className="text-xs text-muted">Spendable</div><div className="h-display text-2xl">{stats.spendableXp} XP</div></div>
            <div className="rounded-2xl bg-card-2 p-3"><div className="text-xs text-muted">Lifetime</div><div className="h-display text-2xl">{stats.lifetimeXp} XP</div></div>
          </div>
          <div className="mt-3 text-sm text-muted">{stats.level.next ? <>{stats.level.toNext} XP to <span className="font-semibold text-ink">Level {stats.level.next.level}: {stats.level.next.title}</span></> : 'Max level reached. Legendary.'}</div>
          <Progress value={stats.level.progress} className="mt-2" />
        </div>
      </Card>

      <section>
        <SectionTitle>Level ladder</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LEVELS.map((l) => (
            <div key={l.level} className={clsx('card p-3 text-center', stats.level.level === l.level && 'ring-2 ring-lavender-400', stats.lifetimeXp < l.xp && 'opacity-60')}>
              <div className="text-2xl">{['🌱', '🧭', '⚔️', '🏅', '💎', '🐉', '🌟', '👑'][l.level - 1]}</div>
              <div className="font-semibold text-sm">{l.title}</div>
              <div className="text-xs text-muted">{l.xp} XP</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle sub="Earned per challenge week">Weekly XP</SectionTitle>
        <Card>
          <div className="flex items-end gap-1.5 h-32">
            {stats.weekly.map((w) => (
              <div key={w.week} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="text-[10px] text-muted">{w.xp || ''}</div>
                <div className={clsx('w-full rounded-t-lg bg-gradient-to-t from-lavender-500 to-blush-300 transition-all', w.week === stats.week && 'ring-2 ring-blush-400')} style={{ height: `${Math.max(w.xp ? 6 : 2, (w.xp / maxWeek) * 100)}%` }} />
                <div className="text-[10px] text-muted">W{w.week}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>How XP works</SectionTitle>
        <Card className="text-sm">
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {[['5–10 min modified walk', XP.walkShort], ['11–20 min modified walk', XP.walkMedium], ['21–30 min walk', XP.walkFull], ['Walk longer than 30 min', XP.walkLong], ['10-minute strength session', XP.strength], ['Weekly boss battle', XP.boss], ['Weekly reflection', XP.reflection], ['Planned recovery day', XP.recovery], ['Daily quest', XP.quest], ['Bonus mission from the wheel', XP.bonusMission]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between border-b border-line py-1.5"><span className="text-muted">{k}</span><span className="font-semibold">+{v} XP</span></div>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">One workout reward per day. Editing a workout replaces its XP instead of stacking it.</p>
        </Card>
      </section>

      <section>
        <SectionTitle>History</SectionTitle>
        {history.length === 0 ? <Empty emoji="✨" title="No XP yet" sub="Your first walk starts the ledger." /> : (
          <Card className="!p-0 divide-y divide-line">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div><div className="font-medium">{h.reason}</div><div className="text-xs text-muted">{formatDate(h.date)}</div></div>
                <div className={clsx('font-bold', h.amount > 0 ? 'gradient-text' : 'text-rose-500')}>{h.amount > 0 ? '+' : ''}{h.amount}</div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}
