import type { Reward } from '@/lib/types'
export const DEFAULT_REWARDS: Reward[] = [
  { id: 'coffee', budget: 10, name: 'Favorite coffee or drink', cost: 100, emoji: '☕' },
  { id: 'accessory', budget: 30, name: 'New workout accessory', cost: 200, emoji: '🎀' },
  { id: 'beauty', budget: 50, name: 'Beauty or skincare treat', cost: 350, emoji: '✨' },
  { id: 'outfit', budget: 100, name: 'New workout outfit', cost: 500, emoji: '🩷' },
  { id: 'spa', budget: 150, name: 'Spa day or massage', cost: 700, emoji: '💆‍♀️' },
  { id: 'grand', budget: 300, name: 'Special grand prize', cost: 1000, emoji: '👑' },
]
