import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { computeStats } from './stats'
import { todayKey, seeded } from './dates'
import { THEMES } from '@/content/themes'
import { QUOTES } from '@/content/quotes'

/**
 * The day in progress, re-checked every half minute so the rollover works while the app is open,
 * and straight away when a shift or reset time changes.
 */
export function useToday(): string {
  const fromStore = useStore(() => todayKey())
  const [t, setT] = useState(todayKey)
  useEffect(() => {
    const i = setInterval(() => { const k = todayKey(); setT((p) => (p === k ? p : k)) }, 30_000)
    const onVis = () => setT(todayKey())
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  // Whichever was worked out last wins: both come from the same clock and the same settings.
  return fromStore === t ? t : todayKey()
}

export function useStats() {
  const today = useToday()
  const days = useStore((s) => s.days)
  const xp = useStore((s) => s.xp)
  const purchases = useStore((s) => s.purchases)
  const profile = useStore((s) => s.profile)
  const reflections = useStore((s) => s.reflections)
  const envelopes = useStore((s) => s.envelopes)
  const spins = useStore((s) => s.spins)
  const nsvs = useStore((s) => s.nsvs)
  const weights = useStore((s) => s.weights)
  const freezes = useStore((s) => s.freezes)
  const prizes = useStore((s) => s.prizes)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the store slices computeStats reads
  return useMemo(() => computeStats(useStore.getState(), today), [today, days, xp, purchases, profile, reflections, envelopes, spins, nsvs, weights, freezes, prizes])
}

export { questsFor } from './quests'

export function themeFor(date: string, override?: string) {
  if (override) return THEMES.find((t) => t.id === override) ?? THEMES[0]
  const rnd = seeded(`theme:${date}`)
  return THEMES[Math.floor(rnd() * THEMES.length)]
}

export function quoteFor(date: string) {
  const rnd = seeded(`quote:${date}`)
  return QUOTES[Math.floor(rnd() * QUOTES.length)]
}

export function greeting(name: string, date: string = todayKey()) {
  void date
  const h = new Date().getHours()
  const part = h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Late night'
  return name ? `${part}, ${name}` : part
}
