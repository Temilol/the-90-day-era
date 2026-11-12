export interface EnvelopeDef { id: string; title: string; trigger: { type: 'day'; value: number } | { type: 'workouts'; value: number } | { type: 'streak'; value: number } }
export const ENVELOPE_DEFS: EnvelopeDef[] = [
  { id: 'day7', title: 'One Week In', trigger: { type: 'day', value: 7 } },
  { id: 'w10', title: '10 Workouts', trigger: { type: 'workouts', value: 10 } },
  { id: 'day15', title: 'Halfway Through Chapter 1', trigger: { type: 'day', value: 15 } },
  { id: 'streak7', title: 'Seven-Day Streak', trigger: { type: 'streak', value: 7 } },
  { id: 'day30', title: 'Chapter 1 Complete', trigger: { type: 'day', value: 30 } },
  { id: 'w25', title: '25 Workouts', trigger: { type: 'workouts', value: 25 } },
  { id: 'day45', title: 'Halfway Hero', trigger: { type: 'day', value: 45 } },
  { id: 'day60', title: 'Chapter 2 Complete', trigger: { type: 'day', value: 60 } },
  { id: 'w50', title: '50 Workouts', trigger: { type: 'workouts', value: 50 } },
  { id: 'day75', title: 'The Final Stretch', trigger: { type: 'day', value: 75 } },
  { id: 'day90', title: 'The 90-Day Legend', trigger: { type: 'day', value: 90 } },
]

export interface EnvelopeReward { text: string; xp?: number; emoji: string }
export const ENVELOPE_REWARDS: EnvelopeReward[] = [
  { text: 'Bonus XP drop! Spend it or save it.', xp: 25, emoji: '💎' },
  { text: 'Rare XP drop! Your future self says thanks.', xp: 40, emoji: '💠' },
  { text: 'Free pass: pick one reward from the shop at 20% off (you set the price).', emoji: '🎟️' },
  { text: 'A guilt-free lazy evening. Pajamas by 8, phone on silent.', emoji: '🛋️' },
  { text: 'Treat yourself to a fancy drink on your next day off.', emoji: '🧋' },
  { text: 'Movie night: your pick, no compromises.', emoji: '🎬' },
  { text: 'Buy that one small thing you keep leaving in the cart.', emoji: '🛍️' },
  { text: 'Order in tonight. You’ve earned a night without cooking.', emoji: '🍜' },
  { text: 'Mini photoshoot mission: take a confident photo of yourself today.', emoji: '📸' },
  { text: 'Spa-at-home night: mask, candle, playlist, lights down.', emoji: '🕯️' },
  { text: 'Write a letter to Day-90 you. Open it at the finish line.', emoji: '💌' },
  { text: 'Surprise XP! The universe is on your side.', xp: 30, emoji: '🌟' },
]
