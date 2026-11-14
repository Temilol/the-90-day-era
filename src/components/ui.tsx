import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={clsx('card p-5', onClick && 'cursor-pointer hover:shadow-glow transition', className)}>{children}</div>
}

export function SectionTitle({ children, action, sub }: { children: ReactNode; action?: ReactNode; sub?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div>
        <h2 className="h-display text-xl">{children}</h2>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ title, sub, emoji, action }: { title: string; sub?: string; emoji?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="h-display text-3xl sm:text-4xl flex items-center gap-2">{emoji && <span className="text-2xl">{emoji}</span>}{title}</h1>
        {sub && <p className="text-muted mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function Progress({ value, className, color = 'from-lavender-500 to-blush-400', height = 'h-2.5' }: { value: number; className?: string; color?: string; height?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100))
  return (
    <div className={clsx('w-full rounded-full bg-lavender-100 dark:bg-white/10 overflow-hidden', height, className)}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        className={clsx('h-full rounded-full bg-gradient-to-r relative', color)}>
        <div className="absolute inset-0 shimmer" />
      </motion.div>
    </div>
  )
}

export function Ring({ value, size = 120, stroke = 10, children, color = 'url(#ringGrad)' }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-lavender-100 dark:stroke-white/10" fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke={color} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ type: 'spring', stiffness: 50, damping: 16 }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

export function Stat({ label, value, sub, emoji }: { label: string; value: ReactNode; sub?: string; emoji?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1">{emoji && <span>{emoji}</span>}{label}</div>
      <div className="h-display text-2xl mt-1">{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  )
}

export function Modal({ open, onClose, children, title, wide }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-ink/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className={clsx('relative card w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-b-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="flex items-center justify-between mb-3">
          {title ? <h3 className="h-display text-xl">{title}</h3> : <span />}
          <button onClick={onClose} className="btn-ghost p-2 -mr-2" aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

export function Check({ checked, onChange, label, sub, emoji, disabled }: { checked: boolean; onChange: () => void; label: string; sub?: string; emoji?: string; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onChange}
      className={clsx('w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] disabled:opacity-50',
        checked ? 'border-lavender-300 bg-lavender-50 dark:bg-lavender-500/15 dark:border-lavender-500/40' : 'border-line bg-card-2 hover:border-lavender-200')}>
      <motion.span animate={checked ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}
        className={clsx('grid place-items-center size-7 rounded-full shrink-0 text-sm font-bold transition',
          checked ? 'bg-gradient-to-br from-lavender-500 to-blush-400 text-white shadow-glow' : 'bg-white dark:bg-white/10 border border-line')}>
        {checked ? '✓' : ''}
      </motion.span>
      {emoji && <span className="text-xl">{emoji}</span>}
      <span className="flex-1 min-w-0">
        <span className={clsx('block font-medium', checked && 'line-through text-muted')}>{label}</span>
        {sub && <span className="block text-xs text-muted break-words">{sub}</span>}
      </span>
    </button>
  )
}

export function Empty({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <div className="text-center py-10 text-muted">
      <div className="text-4xl mb-2">{emoji}</div>
      <div className="font-semibold text-ink">{title}</div>
      {sub && <div className="text-sm mt-1">{sub}</div>}
    </div>
  )
}

export function Sparkles({ className }: { className?: string }) {
  return (
    <div className={clsx('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {[...Array(7)].map((_, i) => (
        <span key={i} className="absolute text-blush-300 dark:text-lavender-300 animate-twinkle" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${i * 0.3}s`, fontSize: 10 + (i % 3) * 4 }}>✦</span>
      ))}
    </div>
  )
}

export function confirmDialog(message: string) {
  return window.confirm(message)
}
