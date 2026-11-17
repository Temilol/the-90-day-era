import { useState } from 'react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { BADGES, type BadgeDef } from '@/content/badges'
import { Modal, Progress } from '@/components/ui'

type Group = BadgeDef['group']
const GROUPS: { id: Group; tile: string; name: string; sub: string }[] = [
  { id: 'milestone', tile: 'Milestones', name: 'Milestones', sub: 'The big days.' },
  { id: 'workouts', tile: 'Workouts', name: 'Workouts', sub: 'Counting the walks.' },
  { id: 'habits', tile: 'Habits', name: 'Habits & lifestyle', sub: 'The quiet wins.' },
  { id: 'hidden', tile: 'Secret', name: 'Secret badges', sub: 'Revealed when you earn them.' },
]
const LAST_GROUP = 'era-badges-group'
const storedGroup = (): Group | null => { try { const v = localStorage.getItem(LAST_GROUP); return GROUPS.some((g) => g.id === v) ? (v as Group) : null } catch { return null } }

export function BadgesPanel() {
  const badges = useStore((s) => s.badges)
  const [sel, setSel] = useState<BadgeDef | null>(null)
  // The group she last opened; the first time, the group of the badge she earned most recently.
  const [group, setGroup] = useState<Group>(() => {
    const saved = storedGroup()
    if (saved) return saved
    const latest = Object.entries(badges).sort((a, b) => b[1].localeCompare(a[1]))[0]
    return BADGES.find((b) => b.id === latest?.[0])?.group ?? 'milestone'
  })
  const pick = (g: Group) => { setGroup(g); try { localStorage.setItem(LAST_GROUP, g) } catch { /* private mode */ } }
  const unlocked = Object.keys(badges).length
  const current = GROUPS.find((g) => g.id === group)!
  // Earned badges first, newest on top; the ones still to earn follow in their usual order.
  const inGroup = BADGES.filter((b) => b.group === group)
  const shown = [...inGroup.filter((b) => badges[b.id]).sort((a, b) => badges[b.id].localeCompare(badges[a.id])), ...inGroup.filter((b) => !badges[b.id])]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted -mt-2 mb-3">{unlocked} of {BADGES.length} unlocked</p>
        <Progress value={unlocked / BADGES.length} />
      </div>

      <div role="tablist" aria-label="Badge groups" className="grid grid-cols-2 gap-2">
        {GROUPS.map((g) => {
          const total = BADGES.filter((b) => b.group === g.id).length
          const got = BADGES.filter((b) => b.group === g.id && badges[b.id]).length
          return (
            <button key={g.id} type="button" role="tab" aria-selected={group === g.id} onClick={() => pick(g.id)} className={clsx('card px-3 py-2.5 text-center transition', group === g.id && 'ring-2 ring-lavender-400')}>
              <div className="text-sm font-semibold">{g.tile}</div>
              <div className="text-xs text-muted">{got} of {total}</div>
            </button>
          )
        })}
      </div>

      <section>
        <div className="mb-3"><h2 className="h-display text-xl">{current.name}</h2><p className="text-sm text-muted">{current.sub}</p></div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {shown.map((b) => {
            const at = badges[b.id]
            const mystery = b.hidden && !at
            return (
              <motion.button key={b.id} whileTap={{ scale: 0.95 }} onClick={() => setSel(b)} className={clsx('card p-3 flex flex-col items-center text-center gap-1.5', !at && 'opacity-70')}>
                <div className={clsx('size-14 rounded-full grid place-items-center text-3xl', at ? 'bg-gradient-to-br from-lavender-200 via-blush-100 to-gold-300 shadow-glow' : 'bg-card-2 grayscale')}>{mystery ? '❔' : b.emoji}</div>
                <div className="text-xs font-semibold leading-tight break-words min-w-0">{mystery ? '???' : b.name}</div>
              </motion.button>
            )
          })}
        </div>
      </section>

      <Modal open={!!sel} onClose={() => setSel(null)}>
        {sel && (() => { const at = badges[sel.id]; const mystery = sel.hidden && !at; return (
          <div className="text-center py-2">
            <div className={clsx('mx-auto size-24 rounded-full grid place-items-center text-5xl', at ? 'bg-gradient-to-br from-lavender-200 via-blush-100 to-gold-300 shadow-glow' : 'bg-card-2 grayscale')}>{mystery ? '❔' : sel.emoji}</div>
            <h3 className="h-display text-2xl mt-4">{mystery ? 'Secret badge' : sel.name}</h3>
            <p className="text-muted mt-1">{mystery ? 'Keep exploring. This one reveals itself when you earn it.' : sel.desc}</p>
            <div className="text-xs text-muted mt-3">{at ? `Unlocked ${new Date(at).toLocaleDateString()}` : 'Locked'}</div>
          </div>
        ) })()}
      </Modal>
    </div>
  )
}
