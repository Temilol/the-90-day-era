import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { LEVELS, LEVEL_EMOJI, XP } from '@/lib/xp'
import { dayKeyAt, formatDate } from '@/lib/dates'
import { Card, Progress, Ring, SectionTitle, Empty, Modal } from '@/components/ui'
import { clsx } from 'clsx'
import { ChevronDown, ChevronRight, HelpCircle } from 'lucide-react'
import { BONUS } from '@/lib/bonuses'
import { OwedNote } from '@/components/OwedNote'

export function XpPanel() {
  const stats = useStats()
  const maxWeek = Math.max(1, ...stats.weekly.map((w) => w.xp))
  const [view, setView] = useState<'ladder' | 'weekly'>('ladder')
  const [rules, setRules] = useState(false)

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted -mt-2">Lifetime XP sets your level. Spending XP in the shop never lowers it.</p>
      <Card className="flex flex-col sm:flex-row items-center gap-6">
        <Ring value={stats.level.progress} size={150} stroke={12}>
          <div className="text-center"><div className="text-[10px] font-bold uppercase tracking-wider text-muted">Level</div><div className="h-display text-4xl gradient-text">{stats.level.level}</div><div className="text-xs font-semibold">{stats.level.title}</div></div>
        </Ring>
        <div className="flex-1 w-full">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-card-2 p-3"><div className="text-xs text-muted">Spendable</div><div className="h-display text-2xl">{stats.balanceXp} XP</div></div>
            <div className="rounded-2xl bg-card-2 p-3"><div className="text-xs text-muted">Lifetime</div><div className="h-display text-2xl">{stats.lifetimeXp} XP</div></div>
          </div>
          <OwedNote owed={stats.owedXp} />
          <div className="mt-3 text-sm text-muted">{stats.level.next ? <>{stats.level.toNext} XP to <span className="font-semibold text-ink">Level {stats.level.next.level}: {stats.level.next.title}</span></> : 'Max level reached. Legendary.'}</div>
          <Progress value={stats.level.progress} className="mt-2" />
        </div>
      </Card>

      <button type="button" onClick={() => setRules(true)} className="card w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:shadow-glow transition">
        <span className="flex items-center gap-2 text-sm font-semibold"><HelpCircle size={18} className="text-lavender-500 shrink-0" />How do I earn XP?</span>
        <ChevronRight size={16} className="text-lavender-400 shrink-0" />
      </button>

      <section>
        <div role="tablist" aria-label="Level ladder or weekly XP" className="grid grid-cols-2 gap-1 rounded-full bg-card-2 p-1 text-sm font-semibold mb-3">
          {([['ladder', 'Ladder'], ['weekly', 'Weekly XP']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={clsx('rounded-full py-2 text-center transition', view === id ? 'bg-card shadow-soft text-ink' : 'text-muted')}>{label}</button>
          ))}
        </div>
        {view === 'ladder' ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {LEVELS.map((l) => (
              <div key={l.level} className={clsx('card p-3 text-center', stats.level.level === l.level && 'ring-2 ring-lavender-400', stats.lifetimeXp < l.xp && 'opacity-60')}>
                <div className="text-2xl">{LEVEL_EMOJI[l.level - 1]}</div>
                <div className="font-semibold text-sm">{l.title}</div>
                <div className="text-xs text-muted">{l.xp} XP</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-3">Earned per challenge week</p>
            <Card>
              <div className="flex items-end gap-1 sm:gap-1.5 h-32">
                {stats.weekly.map((w) => (
                  <div key={w.week} className="flex-1 min-w-0 flex flex-col items-center gap-1 h-full justify-end">
                    <div className="text-[9px] sm:text-[10px] text-muted whitespace-nowrap">{w.xp || ''}</div>
                    <div className={clsx('w-full rounded-t-lg bg-gradient-to-t from-lavender-500 to-blush-300 transition-all', w.week === stats.week && 'ring-2 ring-blush-400')} style={{ height: `${Math.max(w.xp ? 6 : 2, (w.xp / maxWeek) * 100)}%` }} />
                    <div className="text-[10px] text-muted"><span className="hidden sm:inline">W</span>{w.week}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </section>

      <Modal open={rules} onClose={() => setRules(false)} wide title="How XP works">
        <div className="text-sm">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {[['5–10 min modified walk', XP.walkShort], ['11–20 min modified walk', XP.walkMedium], ['21–30 min walk', XP.walkFull], ['Walk longer than 30 min', XP.walkLong], ['Bonus for any walk on a day or night shift', XP.shiftBonus], ['Other activities adding up to 30+ minutes, once a day', XP.activity], ['10-minute strength session', XP.strength], ['Weekly boss battle', XP.boss], ['Weekly reflection', XP.reflection], ['Planned recovery day', XP.recovery], ['Daily quest', XP.quest], ['Bonus mission from the wheel', XP.bonusMission]].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-3 border-b border-line py-1.5"><span className="text-muted min-w-0">{k}</span><span className="font-semibold shrink-0 whitespace-nowrap">+{v} XP</span></div>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">One workout reward per day. Editing a workout replaces its XP instead of stacking it.</p>
            <div className="label mt-5">Bonuses</div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {([['Streak of 3, 7, 14, 21, 30, 45, 60 and 90 days, once each', `+${Object.values(BONUS.streak)[0]} to +${Object.values(BONUS.streak).slice(-1)[0]}`], ['Five treadmill walks in a challenge week', `+${BONUS.weekWalks}`], ['All four quests in a day', `+${BONUS.fullQuests}`], ['Each badge (hidden ones pay double)', `+${BONUS.badge}`], ['Journal entry, written that day or the next', `+${BONUS.journal}`], ['Weigh-in or progress photo, once a week', `+${BONUS.checkIn}`], ['Non-scale victory, once a week', `+${BONUS.nsv}`], ['Sealing your time capsule', `+${BONUS.capsule}`]] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5"><span className="text-muted min-w-0">{k}</span><span className="font-semibold shrink-0 whitespace-nowrap">{v} XP</span></div>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">Bonuses follow what you’ve logged. If something they depend on is removed, the bonus goes with it.</p>
        </div>
      </Modal>

      <section>
        <XpHistory today={stats.today} />
      </section>
    </div>
  )
}

interface HistoryEntry { at: string; date: string; amount: number; reason: string }
interface DayGroup { date: string; total: number; entries: HistoryEntry[] }

/** Newest first in, one group per day out, in the same order. */
function groupByDay(list: HistoryEntry[]): DayGroup[] {
  const groups = new Map<string, DayGroup>()
  for (const e of list) {
    const g = groups.get(e.date) ?? { date: e.date, total: 0, entries: [] }
    g.total += e.amount
    g.entries.push(e)
    groups.set(e.date, g)
  }
  return [...groups.values()]
}

const RECENT_DAYS = 7

function XpHistory({ today }: { today: string }) {
  const xp = useStore((s) => s.xp)
  const purchases = useStore((s) => s.purchases)
  // Today starts open, so the newest breakdown is visible straight away.
  const [open, setOpen] = useState<Set<string>>(() => new Set([today]))
  const [showAll, setShowAll] = useState(false)
  const entries: HistoryEntry[] = [
    ...xp.map((e) => ({ at: e.at, date: e.date, amount: e.amount, reason: e.reason })),
    ...purchases.map((p) => ({ at: p.at, date: dayKeyAt(new Date(p.at)), amount: -p.cost, reason: `Bought: ${p.name}` })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  const days = groupByDay(entries)
  const toggle = (date: string) => setOpen((s) => { const n = new Set(s); if (n.has(date)) n.delete(date); else n.add(date); return n })

  const anyOpen = days.some((g) => open.has(g.date))
  // Kept in place (just hidden) when nothing is open, so the list never jumps.
  const collapseAll = (cls = '') => (
    <button type="button" disabled={!anyOpen} onClick={() => setOpen(new Set())} className={clsx('text-xs font-medium text-lavender-600 dark:text-lavender-300 shrink-0 disabled:invisible', cls)}>Collapse all</button>
  )

  if (days.length === 0) return <><SectionTitle>History</SectionTitle><Empty emoji="✨" title="No XP yet" sub="Your first walk starts the ledger." /></>

  const renderDay = (g: DayGroup) => {
    const isOpen = open.has(g.date)
    return (
      <div key={g.date} className="card !p-0 overflow-hidden">
        <button type="button" aria-expanded={isOpen} onClick={() => toggle(g.date)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
          <div className="min-w-0">
            <div className="text-sm font-medium">{g.date === today ? 'Today · ' : ''}{formatDate(g.date, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
            <div className="text-xs text-muted">{g.entries.length} {g.entries.length === 1 ? 'entry' : 'entries'}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={clsx('font-bold', g.total > 0 ? 'gradient-text' : 'text-rose-500')}>{g.total > 0 ? '+' : ''}{g.total} XP</span>
            <ChevronDown size={16} className={clsx('text-muted transition', isOpen && 'rotate-180')} />
          </div>
        </button>
        {isOpen && (
          <div className="border-t border-line px-4">
            {g.entries.map((h, i) => (
              <div key={`${h.at}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm border-t border-line first:border-t-0">
                <span className="min-w-0">{h.reason}</span>
                <span className={clsx('font-semibold shrink-0', h.amount > 0 ? 'gradient-text' : 'text-rose-500')}>{h.amount > 0 ? '+' : ''}{h.amount} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <SectionTitle sub="Tap a day to see what it came from" action={collapseAll()}>History</SectionTitle>
      <div className="space-y-2">{days.slice(0, RECENT_DAYS).map(renderDay)}</div>
      {days.length > RECENT_DAYS && <button type="button" className="btn-soft w-full mt-3" onClick={() => setShowAll(true)}>See all history ({days.length} days)</button>}
      <Modal open={showAll} onClose={() => setShowAll(false)} title="XP history">
        <div className="flex justify-end mb-2">{collapseAll()}</div>
        <div className="space-y-2">{days.map(renderDay)}</div>
      </Modal>
    </>
  )
}
