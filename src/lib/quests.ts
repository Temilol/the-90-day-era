import { seeded, pickN } from './dates'
import { HYDRATION_QUEST, QUEST_POOL, type Quest } from '@/content/quests'
import type { ShiftType } from './types'

/**
 * Daily quests for a date: hydration + 3 rotating, the same every time you look.
 * With a shift set, one of the three is drawn from quests that suit that kind of day, the other two
 * are random, and quests that can't be done on that shift are left out. Quests already ticked off
 * stay on the list even if the shift changes afterwards. Pass tomorrow's shift so quests about
 * getting ready for work are left out when tomorrow is a day off or a rest day.
 */
export function questsFor(date: string, shift?: ShiftType, done?: Record<string, string>, swaps?: string[], tomorrow?: ShiftType): Quest[] {
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
  // So is a getting-ready-for-work quest when there is no work tomorrow.
  const noWorkTomorrow = tomorrow === 'off' || tomorrow === 'recovery'
  const replace = [...(swaps ?? []), ...(noWorkTomorrow ? QUEST_POOL.filter((q) => q.beforeWork && !done?.[q.id]).map((q) => q.id) : [])]
  for (const gone of replace) {
    const i = picks.findIndex((q) => q.id === gone)
    if (i < 0) continue
    const options = QUEST_POOL.filter((q) => !picks.includes(q) && !replace.includes(q.id) && !(shift && q.avoid?.includes(shift)))
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
