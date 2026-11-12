import { useState } from 'react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { BADGES, type BadgeDef } from '@/content/badges'
import { PageHeader, Modal, Progress } from '@/components/ui'

const GROUPS: { id: BadgeDef['group']; name: string; sub: string }[] = [
  { id: 'milestone', name: 'Milestones', sub: 'The big days.' },
  { id: 'workouts', name: 'Workouts', sub: 'Counting the walks.' },
  { id: 'habits', name: 'Habits & lifestyle', sub: 'The quiet wins.' },
  { id: 'hidden', name: 'Secret badges', sub: 'Revealed when you earn them.' },
]

export default function Achievements() {
  const badges = useStore((s) => s.badges)
  const [sel, setSel] = useState<BadgeDef | null>(null)
  const unlocked = Object.keys(badges).length
  return (
    <div className="space-y-6">
      <PageHeader title="Achievement Gallery" emoji="🏆" sub={`${unlocked} of ${BADGES.length} unlocked`} />
      <Progress value={unlocked / BADGES.length} />
      {GROUPS.map((g) => (
        <section key={g.id}>
          <div className="mb-3"><h2 className="h-display text-xl">{g.name}</h2><p className="text-sm text-muted">{g.sub}</p></div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {BADGES.filter((b) => b.group === g.id).map((b) => {
              const at = badges[b.id]
              const mystery = b.hidden && !at
              return (
                <motion.button key={b.id} whileTap={{ scale: 0.95 }} onClick={() => setSel(b)} className={clsx('card p-3 flex flex-col items-center text-center gap-1.5', !at && 'opacity-70')}>
                  <div className={clsx('size-14 rounded-full grid place-items-center text-3xl', at ? 'bg-gradient-to-br from-lavender-200 via-blush-100 to-gold-300 shadow-glow' : 'bg-card-2 grayscale')}>{mystery ? '❔' : b.emoji}</div>
                  <div className="text-xs font-semibold leading-tight">{mystery ? '???' : b.name}</div>
                </motion.button>
              )
            })}
          </div>
        </section>
      ))}
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
