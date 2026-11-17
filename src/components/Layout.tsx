import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, Target, CalendarDays, Swords, Trophy, Gift, BarChart3, Scale, BookHeart, Settings, LayoutGrid, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Toasts, UnlockModal } from './Toasts'
import { useUi, applyTheme } from '@/store/ui'
import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { useReminders } from '@/lib/reminders'
import { ConflictModal } from './Account'
import { ResetPrompt } from './DayReset'

export const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/today', label: 'Today’s Mission', icon: Target },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/bosses', label: 'Boss Battles', icon: Swords },
  { to: '/mystery', label: 'Mystery Missions', icon: Gift },
  { to: '/rewards', label: 'Rewards', icon: Trophy },
  { to: '/progress', label: 'Progress & Stats', icon: BarChart3 },
  { to: '/weight', label: 'Weight & Wins', icon: Scale },
  { to: '/journal', label: 'Journal', icon: BookHeart },
  { to: '/settings', label: 'Settings', icon: Settings },
]
const MOBILE_MAIN = ['/', '/today', '/calendar', '/bosses']

export function Layout() {
  const theme = useUi((s) => s.theme)
  const [more, setMore] = useState(false)
  const loc = useLocation()
  const stats = useStats()
  const name = useStore((s) => s.profile.name)
  useReminders()

  useEffect(() => {
    applyTheme(theme)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => applyTheme(useUi.getState().theme)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [theme])
  useEffect(() => {
    setMore(false)
    // A link such as /mystery#wheel lands on that section; any other move starts at the top.
    const target = loc.hash ? document.getElementById(loc.hash.slice(1)) : null
    if (target) target.scrollIntoView({ block: 'start' })
    else window.scrollTo({ top: 0 })
  }, [loc.pathname, loc.hash])
  useEffect(() => { useStore.getState().checkProgress() }, [stats.today])

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col gap-1 p-4 sticky top-0 h-screen overflow-y-auto border-r border-line bg-card/60 backdrop-blur">
        <div className="px-3 py-4">
          <div className="h-display text-2xl gradient-text">The 90-Day Era</div>
          <div className="text-xs text-muted">Your journey. Your rules. Your glow-up.</div>
        </div>
        <div className="mx-3 mb-3 card-pad !p-3 flex items-center gap-3">
          <div className="size-10 rounded-full bg-gradient-to-br from-lavender-400 to-blush-400 grid place-items-center text-white font-bold">{(name || 'E')[0].toUpperCase()}</div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{name || 'Era Explorer'}</div>
            <div className="text-xs text-muted">Lv {stats.level.level} {stats.level.title} · {stats.balanceXp} XP</div>
          </div>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => clsx('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition',
            isActive ? 'bg-gradient-to-r from-lavender-500 to-blush-400 text-white shadow-glow' : 'text-muted hover:bg-card-2 hover:text-ink')}>
            <n.icon size={18} /> {n.label}
          </NavLink>
        ))}
      </aside>

      <main className="px-4 pt-5 pb-28 lg:pb-10 lg:px-10 max-w-5xl w-full mx-auto">
        <Outlet />
      </main>
      <ResetPrompt />

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-card/85 backdrop-blur-xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5">
          {NAV.filter((n) => MOBILE_MAIN.includes(n.to)).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => clsx('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', isActive ? 'text-lavender-600 dark:text-lavender-300' : 'text-muted')}>
              {({ isActive }) => (<><span className={clsx('grid place-items-center size-8 rounded-xl transition', isActive && 'bg-lavender-100 dark:bg-lavender-500/20')}><n.icon size={20} /></span>{n.label.split(' ')[0].replace('’s', '')}</>)}
            </NavLink>
          ))}
          <button onClick={() => setMore(true)} className={clsx('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', more || !MOBILE_MAIN.includes(loc.pathname) ? 'text-lavender-600 dark:text-lavender-300' : 'text-muted')}>
            <span className={clsx('grid place-items-center size-8 rounded-xl', !MOBILE_MAIN.includes(loc.pathname) && 'bg-lavender-100 dark:bg-lavender-500/20')}><LayoutGrid size={20} /></span>More
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {more && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setMore(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute bottom-0 inset-x-0 card rounded-b-none p-5 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="h-display text-xl">Everything else</h3>
                <button className="btn-ghost p-2" onClick={() => setMore(false)}><X size={18} /></button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {NAV.filter((n) => !MOBILE_MAIN.includes(n.to)).map((n) => (
                  <NavLink key={n.to} to={n.to} className="flex flex-col items-center gap-2 rounded-2xl bg-card-2 p-3 text-center text-xs font-medium">
                    <span className="grid place-items-center size-11 rounded-2xl bg-gradient-to-br from-lavender-100 to-blush-100 dark:from-lavender-500/30 dark:to-blush-500/20 text-lavender-600 dark:text-lavender-200"><n.icon size={20} /></span>
                    {n.label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toasts />
      <UnlockModal />
      <ConflictModal />
    </div>
  )
}
