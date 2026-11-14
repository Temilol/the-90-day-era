export type Tier = 'common' | 'rare' | 'legendary'
export interface EnvelopeDef { id: string; title: string; tier: Tier; trigger: { type: 'day'; value: number } | { type: 'workouts'; value: number } | { type: 'streak'; value: number } }

/** Bigger milestones hold better rewards. */
export const ENVELOPE_DEFS: EnvelopeDef[] = [
  { id: 'day7', title: 'One Week In', tier: 'common', trigger: { type: 'day', value: 7 } },
  { id: 'w10', title: '10 Workouts', tier: 'common', trigger: { type: 'workouts', value: 10 } },
  { id: 'day15', title: 'Halfway Through Chapter 1', tier: 'common', trigger: { type: 'day', value: 15 } },
  { id: 'streak7', title: 'Seven-Day Streak', tier: 'rare', trigger: { type: 'streak', value: 7 } },
  { id: 'day30', title: 'Chapter 1 Complete', tier: 'rare', trigger: { type: 'day', value: 30 } },
  { id: 'w25', title: '25 Workouts', tier: 'rare', trigger: { type: 'workouts', value: 25 } },
  { id: 'day45', title: 'Halfway Hero', tier: 'rare', trigger: { type: 'day', value: 45 } },
  { id: 'day60', title: 'Chapter 2 Complete', tier: 'legendary', trigger: { type: 'day', value: 60 } },
  { id: 'w50', title: '50 Workouts', tier: 'legendary', trigger: { type: 'workouts', value: 50 } },
  { id: 'day75', title: 'The Final Stretch', tier: 'legendary', trigger: { type: 'day', value: 75 } },
  { id: 'day90', title: 'The 90-Day Legend', tier: 'legendary', trigger: { type: 'day', value: 90 } },
]

export const TIERS: Record<Tier, { label: string; emoji: string; chip: string; ring: string }> = {
  common: { label: 'Common', emoji: '✉️', chip: 'bg-lavender-100 text-lavender-700 dark:bg-lavender-500/20 dark:text-lavender-200', ring: 'ring-lavender-300' },
  rare: { label: 'Rare', emoji: '💌', chip: 'bg-blush-100 text-blush-600 dark:bg-blush-500/20 dark:text-blush-200', ring: 'ring-blush-400' },
  legendary: { label: 'Legendary', emoji: '👑', chip: 'bg-gold-300/60 text-ink dark:bg-gold-300/25 dark:text-gold-300', ring: 'ring-gold-300' },
}

/**
 * What a prize does:
 *  xp       added the moment it is picked
 *  freeze   one extra streak freeze, used from the calendar
 *  double   doubles the XP of one day's walk, switched on for today
 *  discount a percentage off one shop reward
 *  swap     replace one of today's quests with a different one
 *  treat    a real-life treat, ticked off when enjoyed
 *  mission  a small one-off thing to do, ticked off when done
 */
export type PrizeKind = 'xp' | 'freeze' | 'double' | 'discount' | 'swap' | 'treat' | 'mission'
export interface PrizeDef { key: string; kind: PrizeKind; tiers: Tier[]; title: string; text: string; emoji: string; xp?: number; pct?: number }

export const PRIZES: PrizeDef[] = [
  // common
  { key: 'xp25', kind: 'xp', tiers: ['common'], title: '25 bonus XP', text: 'Added to your total straight away. Spend it or save it.', emoji: '💎', xp: 25 },
  { key: 'swap', kind: 'swap', tiers: ['common', 'rare'], title: 'Quest swap', text: 'Trade one of today’s quests for a different one, on a day of your choice.', emoji: '🔁' },
  { key: 'drink', kind: 'treat', tiers: ['common'], title: 'A fancy drink', text: 'Treat yourself to a fancy drink on your next day off.', emoji: '🧋' },
  { key: 'lazy', kind: 'treat', tiers: ['common'], title: 'A guilt-free lazy evening', text: 'Pajamas by 8, phone on silent, nothing on the list.', emoji: '🛋️' },
  { key: 'order-in', kind: 'treat', tiers: ['common'], title: 'Order in tonight', text: 'You’ve earned a night without cooking.', emoji: '🍜' },
  { key: 'photoshoot', kind: 'mission', tiers: ['common'], title: 'Mini photoshoot', text: 'Take one confident photo of yourself today. Keep it.', emoji: '📸' },
  // rare
  { key: 'xp40', kind: 'xp', tiers: ['rare'], title: '40 bonus XP', text: 'A rare drop, added to your total straight away.', emoji: '💠', xp: 40 },
  { key: 'freeze', kind: 'freeze', tiers: ['rare', 'legendary'], title: 'Extra streak freeze', text: 'Covers one missed day so it doesn’t break your streak. Use it from the calendar any time.', emoji: '🧊' },
  { key: 'double', kind: 'double', tiers: ['rare', 'legendary'], title: 'Double XP day', text: 'Switch it on for a day and that day’s walk earns double.', emoji: '⚡' },
  { key: 'off20', kind: 'discount', tiers: ['rare'], title: '20% off a shop reward', text: 'Use it when you unlock any reward in the shop.', emoji: '🎟️', pct: 20 },
  { key: 'movie', kind: 'treat', tiers: ['rare'], title: 'Movie night, your pick', text: 'Your choice, no compromises, good snacks.', emoji: '🎬' },
  { key: 'spa', kind: 'treat', tiers: ['rare'], title: 'Spa night at home', text: 'Mask, candle, playlist, lights down.', emoji: '🕯️' },
  // legendary
  { key: 'xp75', kind: 'xp', tiers: ['legendary'], title: '75 bonus XP', text: 'A legendary drop, added to your total straight away.', emoji: '🌟', xp: 75 },
  { key: 'off35', kind: 'discount', tiers: ['legendary'], title: '35% off a shop reward', text: 'Use it when you unlock any reward in the shop. Save it for a big one.', emoji: '🎫', pct: 35 },
  { key: 'cart', kind: 'treat', tiers: ['legendary'], title: 'Buy the thing in your cart', text: 'The one you keep leaving there. Today it’s allowed.', emoji: '🛍️' },
  { key: 'day-out', kind: 'treat', tiers: ['legendary'], title: 'A day out, planned by you', text: 'Somewhere you’ve been meaning to go. Put it in the calendar.', emoji: '🗺️' },
]
export const prizeDef = (key: string | undefined) => PRIZES.find((p) => p.key === key)

/** The older, untiered reward list. Kept so envelopes opened before tiers existed still show their emoji. */
export const LEGACY_REWARD_EMOJI: Record<string, string> = {
  'Bonus XP drop! Spend it or save it.': '💎', 'Rare XP drop! Your future self says thanks.': '💠', 'Surprise XP! The universe is on your side.': '🌟',
  'Free pass: pick one reward from the shop at 20% off (you set the price).': '🎟️', 'A guilt-free lazy evening. Pajamas by 8, phone on silent.': '🛋️',
  'Treat yourself to a fancy drink on your next day off.': '🧋', 'Movie night: your pick, no compromises.': '🎬', 'Buy that one small thing you keep leaving in the cart.': '🛍️',
  'Order in tonight. You’ve earned a night without cooking.': '🍜', 'Mini photoshoot mission: take a confident photo of yourself today.': '📸',
  'Spa-at-home night: mask, candle, playlist, lights down.': '🕯️', 'Write a letter to Day-90 you. Open it at the finish line.': '💌',
}
