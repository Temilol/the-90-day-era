import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { PageHeader } from '@/components/ui'
import { XpPanel } from './Xp'
import { BadgesPanel } from './Achievements'
import { ShopPanel } from './Shop'

type Tab = 'xp' | 'badges' | 'shop'
const TABS: { id: Tab; label: string }[] = [{ id: 'xp', label: 'Levels' }, { id: 'badges', label: 'Badges' }, { id: 'shop', label: 'Shop' }]
const LAST_TAB = 'era-rewards-tab'
const lastTab = (): Tab => { try { const v = localStorage.getItem(LAST_TAB); return v === 'badges' || v === 'shop' ? v : 'xp' } catch { return 'xp' } }

export default function Rewards() {
  // The tab comes from the link (/rewards#shop); with no tab, the one she used last.
  const loc = useLocation()
  const hash = loc.hash.slice(1)
  const tab: Tab = hash === 'badges' || hash === 'shop' ? hash : hash === 'xp' ? 'xp' : lastTab()
  // Only a tab she chose herself is remembered.
  useEffect(() => { if (hash) try { localStorage.setItem(LAST_TAB, tab) } catch { /* private mode */ } }, [tab, hash])

  return (
    <div className="space-y-6">
      <PageHeader title="Rewards" emoji="🏅" sub="Your level, your badges and the treats you’re walking toward." />

      <div role="tablist" aria-label="Rewards sections" className="grid grid-cols-3 gap-1 rounded-full bg-card-2 p-1 text-sm font-semibold -mt-2">
        {TABS.map((x) => (
          <Link key={x.id} to={`#${x.id}`} replace role="tab" aria-selected={tab === x.id} className={clsx('rounded-full py-2 text-center transition', tab === x.id ? 'bg-card shadow-soft text-ink' : 'text-muted')}>
            {x.label}
          </Link>
        ))}
      </div>

      {tab === 'xp' && <XpPanel />}
      {tab === 'badges' && <BadgesPanel />}
      {tab === 'shop' && <ShopPanel />}
    </div>
  )
}
