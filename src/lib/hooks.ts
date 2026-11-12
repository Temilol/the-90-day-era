import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { computeStats } from './stats'
import { todayKey, seeded, pickN } from './dates'
import { HYDRATION_QUEST, QUEST_POOL, type Quest } from '@/content/quests'
import { THEMES } from '@/content/themes'
import { QUOTES } from '@/content/quotes'

/** Today's date key, re-evaluated every minute so midnight rollover works while the app is open. */
export function useToday(): string {
  const [t, setT] = useState(todayKey)
  useEffect(() => {
    const i = setInterval(() => { const k = todayKey(); setT((p) => (p === k ? p : k)) }, 30_000)
    const onVis = () => setT(todayKey())
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  return t
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
  return useMemo(() => computeStats(useStore.getState(), today), [today, days, xp, purchases, profile, reflections, envelopes, spins, nsvs, weights])
}

/** Daily quests for a date: hydration + 3 rotating, deterministic per date. */
export function questsFor(date: string): Quest[] {
  return [HYDRATION_QUEST, ...pickN(QUEST_POOL, 3, seeded(`quests:${date}`))]
}

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
