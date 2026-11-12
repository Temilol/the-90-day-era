import type { Reward } from '@/lib/types'
export const DEFAULT_REWARDS: Reward[] = [
  { id: 'coffee', name: 'Favorite coffee or drink', cost: 100, emoji: '☕' },
  { id: 'accessory', name: 'New workout accessory', cost: 200, emoji: '🎀' },
  { id: 'beauty', name: 'Beauty or skincare treat', cost: 350, emoji: '✨' },
  { id: 'outfit', name: 'New workout outfit', cost: 500, emoji: '🩷' },
  { id: 'spa', name: 'Spa day or massage', cost: 700, emoji: '💆‍♀️' },
  { id: 'grand', name: 'Special grand prize', cost: 1000, emoji: '👑' },
]
