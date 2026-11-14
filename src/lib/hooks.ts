import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { computeStats } from './stats'
import { todayKey, seeded, pickN } from './dates'
import { HYDRATION_QUEST, QUEST_POOL, type Quest } from '@/content/quests'
import { THEMES } from '@/content/themes'
import type { ShiftType } from './types'
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
  const freezes = useStore((s) => s.freezes)
  const prizes = useStore((s) => s.prizes)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the store slices computeStats reads
  return useMemo(() => computeStats(useStore.getState(), today), [today, days, xp, purchases, profile, reflections, envelopes, spins, nsvs, weights, freezes, prizes])
}

/**
 * Daily quests for a date: hydration + 3 rotating, the same every time you look.
 * With a shift set, one of the three is drawn from quests that suit that kind of day, the other two
 * are random, and quests that can't be done on that shift are left out. Quests already ticked off
 * stay on the list even if the shift changes afterwards.
 */
export function questsFor(date: string, shift?: ShiftType, done?: Record<string, string>, swaps?: string[]): Quest[] {
  let picks: Quest[]
  if (!shift) {
    picks = pickN(QUEST_POOL, 3, seeded(`quests:${date}`))
  } else {
    const rnd = seeded(`quests:${date}:${shift}`)
    const fit = pickN(QUEST_POOL.filter((q) => q.fits?.includes(shift)), 1, rnd)
    const rest = pickN(QUEST_POOL.filter((q) => !fit.includes(q) && !q.avoid?.includes(shift)), 3 - fit.length, rnd)
    picks = [...fit, ...rest]
  }
  // A quest traded away with a quest-swap prize is replaced by another that suits the day.
  for (const gone of swaps ?? []) {
    const i = picks.findIndex((q) => q.id === gone)
    if (i < 0) continue
    const options = QUEST_POOL.filter((q) => !picks.includes(q) && !(swaps ?? []).includes(q.id) && !(shift && q.avoid?.includes(shift)))
    const next = pickN(options, 1, seeded(`swap:${date}:${gone}`))[0]
    if (next) picks[i] = next
  }
  if (done) {
    for (const q of QUEST_POOL) {
      if (!done[q.id] || picks.includes(q)) continue
      let slot = -1
      for (let i = picks.length - 1; i >= 0; i--) if (!done[picks[i].id]) { slot = i; break }
      if (slot >= 0) picks[slot] = q
      else picks.push(q)
    }
  }
  return [HYDRATION_QUEST, ...picks]
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
