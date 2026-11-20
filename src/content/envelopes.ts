export type Tier = 'common' | 'rare' | 'legendary'
export type SecretKey = 'showedUp' | 'restWalk' | 'perfectDay' | 'goingLong' | 'perfectWeek' | 'nightShiftHero' | 'hydrationHero' | 'dearDiary' | 'themeExplorer' | 'fifteenThousand' | 'perfectChapter'
export interface EnvelopeDef {
  id: string; title: string; tier: Tier
  trigger: { type: 'day'; value: number } | { type: 'workouts'; value: number } | { type: 'streak'; value: number } | { type: 'strength'; value: number } | { type: 'bosses'; value: number } | { type: 'newBosses'; value: number } | { type: 'secret'; key: SecretKey }
  found?: string // secrets only: how it was found, shown once it has been opened
}

/** Bigger milestones hold better rewards. */
export const ENVELOPE_DEFS: EnvelopeDef[] = [
  { id: 'day5', title: 'Five Days In', tier: 'common', trigger: { type: 'day', value: 5 } },
  { id: 'boss-down', title: 'Boss Down', tier: 'common', trigger: { type: 'newBosses', value: 1 } },
  { id: 'day7', title: 'One Week In', tier: 'common', trigger: { type: 'day', value: 7 } },
  { id: 'w10', title: '10 Workouts', tier: 'common', trigger: { type: 'workouts', value: 10 } },
  { id: 'day15', title: 'Halfway Through Chapter 1', tier: 'common', trigger: { type: 'day', value: 15 } },
  { id: 'streak7', title: 'Seven-Day Streak', tier: 'rare', trigger: { type: 'streak', value: 7 } },
  { id: 'streak14', title: 'Two-Week Streak', tier: 'rare', trigger: { type: 'streak', value: 14 } },
  { id: 'str10', title: 'Strong Ten', tier: 'rare', trigger: { type: 'strength', value: 10 } },
  { id: 'boss5', title: 'Boss Hunter', tier: 'rare', trigger: { type: 'bosses', value: 5 } },
  { id: 'day30', title: 'Chapter 1 Complete', tier: 'rare', trigger: { type: 'day', value: 30 } },
  { id: 'w25', title: '25 Workouts', tier: 'rare', trigger: { type: 'workouts', value: 25 } },
  { id: 'day45', title: 'Halfway Hero', tier: 'rare', trigger: { type: 'day', value: 45 } },
  { id: 'day60', title: 'Chapter 2 Complete', tier: 'legendary', trigger: { type: 'day', value: 60 } },
  { id: 'w50', title: '50 Workouts', tier: 'legendary', trigger: { type: 'workouts', value: 50 } },
  { id: 'w75', title: '75 Workouts', tier: 'legendary', trigger: { type: 'workouts', value: 75 } },
  { id: 'streak30', title: 'Thirty-Day Streak', tier: 'legendary', trigger: { type: 'streak', value: 30 } },
  { id: 'day75', title: 'The Final Stretch', tier: 'legendary', trigger: { type: 'day', value: 75 } },
  { id: 'day90', title: 'The 90-Day Legend', tier: 'legendary', trigger: { type: 'day', value: 90 } },
  // Secrets: shown as "???" with no hint until found. The rules live in computeStats (stats.secrets).
  { id: 'secret-showed-up', title: 'Showed Up Anyway', tier: 'common', trigger: { type: 'secret', key: 'showedUp' }, found: 'You logged a short walk on a shift day when skipping would have been easier.' },
  { id: 'secret-rest-walk', title: 'Couldn’t Sit Still', tier: 'common', trigger: { type: 'secret', key: 'restWalk' }, found: 'You walked on a day you had planned as rest.' },
  { id: 'secret-perfect-day', title: 'The Perfect Day', tier: 'rare', trigger: { type: 'secret', key: 'perfectDay' }, found: 'A 30-minute walk, a strength session, 30 minutes of other movement, every quest, the bonus mission and a journal entry, all in one day.' },
  { id: 'secret-going-long', title: 'Going Long', tier: 'rare', trigger: { type: 'secret', key: 'goingLong' }, found: 'Ten walks longer than 30 minutes.' },
  { id: 'secret-perfect-week', title: 'The Perfect Week', tier: 'legendary', trigger: { type: 'secret', key: 'perfectWeek' }, found: 'Six walks, four strength sessions, the weekly reflection and the boss, all in one week.' },
  { id: 'secret-night-shift-hero', title: 'Night Shift Hero', tier: 'common', trigger: { type: 'secret', key: 'nightShiftHero' }, found: 'You walked for 30 minutes or more on a night shift.' },
  { id: 'secret-hydration-hero', title: 'Hydration Hero', tier: 'rare', trigger: { type: 'secret', key: 'hydrationHero' }, found: 'You met your water goal seven days in a row.' },
  { id: 'secret-dear-diary', title: 'Dear Diary', tier: 'rare', trigger: { type: 'secret', key: 'dearDiary' }, found: 'You wrote in your journal seven days in a row.' },
  { id: 'secret-theme-explorer', title: 'Theme Explorer', tier: 'rare', trigger: { type: 'secret', key: 'themeExplorer' }, found: 'You walked in every one of the walk themes.' },
  { id: 'secret-fifteen-thousand', title: 'Fifteen Thousand', tier: 'rare', trigger: { type: 'secret', key: 'fifteenThousand' }, found: 'You logged 15,000 steps in a single day.' },
  { id: 'secret-perfect-chapter', title: 'The Perfect Chapter', tier: 'legendary', trigger: { type: 'secret', key: 'perfectChapter' }, found: 'Every single day of a chapter had a walk or a planned recovery day, with no streak freeze.' },
]
export const isSecret = (def: EnvelopeDef) => def.trigger.type === 'secret'

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
export interface PrizeDef { key: string; kind: PrizeKind; tiers: Tier[]; title: string; text: string; emoji: string; xp?: number; pct?: number; days?: number /* double XP: how many days in a row */ }

export const PRIZES: PrizeDef[] = [
  // common
  { key: 'xp25', kind: 'xp', tiers: ['common'], title: '25 bonus XP', text: 'Added to your total straight away. Spend it or save it.', emoji: '💎', xp: 25 },
  { key: 'swap', kind: 'swap', tiers: ['common', 'rare'], title: 'Quest swap', text: 'Trade one of today’s quests for a different one, on a day of your choice.', emoji: '🔁' },
  { key: 'drink', kind: 'treat', tiers: ['common'], title: 'A fancy drink', text: 'Treat yourself to a fancy drink on your next day off.', emoji: '🧋' },
  { key: 'lazy', kind: 'treat', tiers: ['common'], title: 'A guilt-free lazy evening', text: 'Pajamas by 8, phone on silent, nothing on the list.', emoji: '🛋️' },
  { key: 'order-in', kind: 'treat', tiers: ['common'], title: 'Order in tonight', text: 'You’ve earned a night without cooking.', emoji: '🍜' },
  { key: 'snack', kind: 'treat', tiers: ['common'], title: 'A favorite snack or drink', text: 'Your pick, up to $10.', emoji: '🍫' },
  { key: 'bath', kind: 'treat', tiers: ['common'], title: 'A long bath or shower', text: 'No rushing, no phone.', emoji: '🛁' },
  { key: 'flowers', kind: 'treat', tiers: ['common'], title: 'Fresh flowers for your space', text: 'Pick up a bunch, up to $20.', emoji: '💐' },
  { key: 'facemask', kind: 'treat', tiers: ['common'], title: 'A face mask night', text: 'One sheet mask, up to $5.', emoji: '🧖‍♀️' },
  { key: 'prettywalk', kind: 'mission', tiers: ['common'], title: 'Take your walk somewhere pretty', text: 'Do one walk outside, somewhere you like to look at.', emoji: '🌳' },
  { key: 'photoshoot', kind: 'mission', tiers: ['common'], title: 'Mini photoshoot', text: 'Take one confident photo of yourself today. Keep it.', emoji: '📸' },
  // rare
  { key: 'xp40', kind: 'xp', tiers: ['rare'], title: '40 bonus XP', text: 'A rare drop, added to your total straight away.', emoji: '💠', xp: 40 },
  { key: 'freeze', kind: 'freeze', tiers: ['rare', 'legendary'], title: 'Extra streak freeze', text: 'Covers one missed day so it doesn’t break your streak. Use it from the calendar any time.', emoji: '🧊' },
  { key: 'double', kind: 'double', tiers: ['rare', 'legendary'], title: 'Double XP day', text: 'Switch it on for a day and that day’s walk earns double.', emoji: '⚡' },
  { key: 'off20', kind: 'discount', tiers: ['rare'], title: '20% off a shop reward', text: 'Use it when you unlock any reward in the shop.', emoji: '🎟️', pct: 20 },
  { key: 'movie', kind: 'treat', tiers: ['rare'], title: 'Movie night, your pick', text: 'Your choice, no compromises, good snacks.', emoji: '🎬' },
  { key: 'spa', kind: 'treat', tiers: ['rare'], title: 'Spa night at home', text: 'Mask, candle, playlist, lights down.', emoji: '🕯️' },
  { key: 'brunch', kind: 'treat', tiers: ['rare'], title: 'Breakfast out', text: 'Somewhere you like, up to $25.', emoji: '🥞' },
  { key: 'shopping', kind: 'treat', tiers: ['rare'], title: 'A self-care shopping trip', text: 'Browse, pick, enjoy it. Up to $60.', emoji: '🛒' },
  { key: 'candle', kind: 'treat', tiers: ['rare'], title: 'A candle or small cosy thing for home', text: 'Up to $30.', emoji: '🕯️' },
  { key: 'pedicure', kind: 'treat', tiers: ['rare'], title: 'A pedicure', text: 'Your colour, your pick, up to $40.', emoji: '💅' },
  { key: 'takeout', kind: 'treat', tiers: ['rare'], title: 'Takeout from a place you’ve never tried', text: 'Something new, up to $30.', emoji: '🥡' },
  { key: 'dessert', kind: 'treat', tiers: ['rare'], title: 'A dessert out', text: 'Something sweet, up to $20.', emoji: '🍰' },
  { key: 'bathset', kind: 'treat', tiers: ['rare'], title: 'A bath set, bombs or oils', text: 'Up to $20.', emoji: '🫧' },
  { key: 'lunch', kind: 'treat', tiers: ['rare'], title: 'A lunch out on a shift day', text: 'Skip the packed lunch for once, up to $20.', emoji: '🥗' },
  { key: 'hair', kind: 'treat', tiers: ['rare'], title: 'Hair accessories', text: 'Scrunchies, clips or a headband, up to $20.', emoji: '🎀' },
  { key: 'casual-dinner', kind: 'treat', tiers: ['rare'], title: 'A casual dinner out', text: 'Somewhere relaxed, up to $35.', emoji: '🍝' },
  { key: 'bake', kind: 'treat', tiers: ['rare'], title: 'Something to bake or cook', text: 'The ingredients for something you’ve wanted to make, up to $30.', emoji: '🧁' },
  { key: 'audio', kind: 'treat', tiers: ['rare'], title: 'An audiobook or a magazine', text: 'Your pick, up to $20.', emoji: '📚' },
  // legendary
  { key: 'xp75', kind: 'xp', tiers: ['legendary'], title: '75 bonus XP', text: 'A legendary drop, added to your total straight away.', emoji: '🌟', xp: 75 },
  { key: 'off35', kind: 'discount', tiers: ['legendary'], title: '35% off a shop reward', text: 'Use it when you unlock any reward in the shop. Save it for a big one.', emoji: '🎫', pct: 35 },
  { key: 'cart', kind: 'treat', tiers: ['legendary'], title: 'Buy the thing in your cart', text: 'The one you keep leaving there. Today it’s allowed, up to $80.', emoji: '🛍️' },
  { key: 'dinner', kind: 'treat', tiers: ['legendary'], title: 'A meal out at a restaurant you pick', text: 'Somewhere you’ve wanted to try, up to $60.', emoji: '🍽️' },
  { key: 'book', kind: 'treat', tiers: ['legendary'], title: 'A new book, game or hobby item', text: 'Something just for you, up to $50.', emoji: '📖' },
  { key: 'earrings', kind: 'treat', tiers: ['legendary'], title: 'Earrings or a small piece of jewellery', text: 'A little something to wear and keep, up to $80.', emoji: '💍' },
  { key: 'fragrance', kind: 'treat', tiers: ['legendary'], title: 'A nice fragrance', text: 'One you’ll think of as yours, up to $50.', emoji: '🌸' },
  { key: 'concert', kind: 'treat', tiers: ['legendary'], title: 'A concert, show or event ticket', text: 'Your choice, up to $70.', emoji: '🎟️' },
  { key: 'pajamas', kind: 'treat', tiers: ['legendary'], title: 'A pajama or loungewear set', text: 'Soft, cosy and yours, up to $50.', emoji: '🌙' },
  { key: 'outing', kind: 'treat', tiers: ['legendary'], title: 'An outing, your choice', text: 'Mini golf, bowling, an escape room. Up to $50.', emoji: '🎳' },
  { key: 'fancy-brunch', kind: 'treat', tiers: ['legendary'], title: 'A fancy brunch', text: 'Somewhere special, the full menu, up to $60.', emoji: '🥂' },
  { key: 'double2', kind: 'double', tiers: ['legendary'], title: 'Double XP, two days in a row', text: 'Switch it on and today’s and tomorrow’s walks both earn double.', emoji: '⚡', days: 2 },
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
