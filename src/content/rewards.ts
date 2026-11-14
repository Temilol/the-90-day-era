import type { Reward } from '@/lib/types'
export const DEFAULT_REWARDS: Reward[] = [
  { id: 'coffee', budget: 10, name: 'Favorite snack or drink treat', cost: 200, emoji: '🧋' },
  { id: 'accessory', budget: 30, name: 'New workout accessory', cost: 500, emoji: '🎀' },
  { id: 'beauty', budget: 50, name: 'Beauty or skincare treat', cost: 900, emoji: '✨' },
  { id: 'outfit', budget: 100, name: 'New workout outfit', cost: 1300, emoji: '🩷' },
  { id: 'spa', budget: 150, name: 'Spa day or massage', cost: 1900, emoji: '💆‍♀️' },
  { id: 'grand', budget: 300, name: 'Special grand prize', cost: 3200, emoji: '👑' },
]

/** Current round of default prices. Saved data on an older round has its untouched defaults moved up once. */
export const PRICE_REV = 2
/** What each default reward cost in the first round, so only prices nobody edited are changed. */
export const FIRST_PRICES: Record<string, number> = { coffee: 100, accessory: 200, beauty: 350, outfit: 500, spa: 700, grand: 1000 }
