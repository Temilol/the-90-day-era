import type { Envelope, EraState, Prize } from './types'
import type { Stats } from './stats'
import { ENVELOPE_DEFS, PRIZES, prizeDef, type PrizeDef, type PrizeKind } from '@/content/envelopes'

/**
 * Whether a prize has been spent. Freezes and double-XP days are worked out from what they were
 * used on, so they come back by themselves if that use is undone: a freeze returns when the day
 * gets a walk or the freeze is removed, a double-XP day returns if no walk was logged that day.
 */
export function prizeUsed(p: Prize, s: Pick<EraState, 'days' | 'freezes'>, today: string): boolean {
  const kind = prizeDef(p.key)?.kind
  if (kind === 'freeze') return !!p.usedOn && !!s.freezes[p.usedOn]
  if (kind === 'double') return !!p.usedOn && s.days[p.usedOn]?.doubleXp === p.id && (p.usedOn >= today || !!s.days[p.usedOn]?.workout)
  return !!p.usedAt
}

export function readyPrizes(s: Pick<EraState, 'prizes' | 'days' | 'freezes'>, kind: PrizeKind, today: string): Prize[] {
  return (s.prizes ?? []).filter((p) => prizeDef(p.key)?.kind === kind && !prizeUsed(p, s, today))
}

/** Three different prizes from the envelope's tier. Treats and missions already won are avoided while others remain. */
export function drawOptions(tier: PrizeDef['tiers'][number], won: Prize[], rnd: () => number = Math.random): string[] {
  const pool = PRIZES.filter((p) => p.tiers.includes(tier))
  const had = new Set(won.map((p) => p.key))
  const fresh = pool.filter((p) => !((p.kind === 'treat' || p.kind === 'mission') && had.has(p.key)))
  const from = [...(fresh.length >= 3 ? fresh : pool)]
  const out: string[] = []
  while (out.length < 3 && from.length) out.push(from.splice(Math.floor(rnd() * from.length), 1)[0].key)
  return out
}

/** The locked envelope that is closest to unlocking, and what is still needed for it. */
export function nextEnvelope(stats: Stats, envelopes: Record<string, Envelope>): { title: string; need: string } | null {
  let best: { title: string; need: string; distance: number } | null = null
  const plural = (n: number, word: string) => `${n} more ${word}${n === 1 ? '' : 's'}`
  for (const def of ENVELOPE_DEFS) {
    if (envelopes[def.id]) continue
    const t = def.trigger
    if (t.type === 'secret') continue // never hinted at
    let distance: number
    let need: string
    if (t.type === 'day') {
      const days = t.value - stats.currentDay
      const active = Math.ceil(t.value / 3) - stats.daysLogged
      distance = Math.max(days, active)
      need = days >= active ? plural(days, 'day') : plural(active, 'active day')
    } else if (t.type === 'workouts') {
      distance = t.value - stats.workouts
      need = plural(distance, 'walk')
    } else {
      distance = t.value - stats.streak
      need = `${plural(distance, 'day')} in a row`
    }
    if (distance <= 0) continue // about to unlock on the next check
    if (!best || distance < best.distance) best = { title: def.title, need, distance }
  }
  return best ? { title: best.title, need: best.need } : null
}
