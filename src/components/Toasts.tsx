import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useUi } from '@/store/ui'
import { burst } from './Celebrate'
import { clsx } from 'clsx'
import { Sparkles } from './ui'

export function Toasts() {
  const toasts = useUi((s) => s.toasts)
  return (
    <div className="fixed top-3 inset-x-0 z-[60] flex flex-col items-center gap-2 px-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ y: -20, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -10, opacity: 0 }}
            className={clsx('card px-4 py-2.5 flex items-center gap-3 min-w-[240px] max-w-sm shadow-glow',
              t.kind === 'xp' && 'border-lavender-300', t.kind === 'warn' && 'border-rose-200')}>
            <span className="text-xl">{t.kind === 'xp' ? '✨' : t.kind === 'success' ? '🎀' : t.kind === 'warn' ? '🌙' : '💫'}</span>
            <div className="min-w-0">
              <div className={clsx('font-semibold leading-tight', t.kind === 'xp' && 'gradient-text')}>{t.title}</div>
              {t.sub && <div className="text-xs text-muted truncate">{t.sub}</div>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function UnlockModal() {
  const unlock = useUi((s) => s.unlocks[0])
  const shift = useUi((s) => s.shiftUnlock)
  useEffect(() => { if (unlock) burst({ big: unlock.kind === 'boss' }) }, [unlock?.id, unlock?.kind, unlock])
  return (
    <AnimatePresence>
      {unlock && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink/50 dark:bg-black/70 backdrop-blur-sm" onClick={shift} />
          <motion.div initial={{ scale: 0.6, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }} className="relative card p-8 text-center max-w-sm w-full overflow-hidden">
            <Sparkles />
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-lavender-500">
              {unlock.kind === 'badge' ? 'Achievement unlocked' : unlock.kind === 'boss' ? 'Boss defeated' : unlock.kind === 'level' ? 'Level up' : 'Unlocked'}
            </div>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}
              className="mx-auto my-5 size-28 rounded-full grid place-items-center text-6xl bg-gradient-to-br from-lavender-200 via-blush-100 to-gold-300 shadow-glow">{unlock.emoji}</motion.div>
            <h3 className="h-display text-2xl">{unlock.name}</h3>
            <p className="text-muted mt-1">{unlock.desc}</p>
            <button onClick={shift} className="btn-primary mt-6 w-full">Love it</button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
