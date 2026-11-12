import type { DayLog } from '@/lib/types'
import type { Stats } from '@/lib/stats'
import { SELF_CARE_IDS } from './quests'

export interface BossDef {
  week: number
  id: string
  name: string
  emoji: string
  tagline: string
  desc: string
  tasks: { id: string; text: string }[]
  auto?: { label: string; target: number; measure: (week: DayLog[], s: Stats) => number }
}

const workouts = (w: DayLog[]) => w.filter((d) => d.workout && d.workout.minutes >= 5).length
const minutes = (w: DayLog[]) => w.reduce((a, d) => a + (d.workout?.minutes || 0), 0)
const quest = (w: DayLog[], id: string) => w.filter((d) => d.quests?.[id]).length

export const BOSSES: BossDef[] = [
  { week: 1, id: 'consistency-monster', name: 'The Consistency Monster', emoji: '👾', tagline: 'It feeds on “I’ll start tomorrow.”',
    desc: 'Show up four times this week. Shift pattern doesn’t matter, the order doesn’t matter. Four logged walks, any length.',
    tasks: [], auto: { label: 'Workouts this week', target: 4, measure: workouts } },
  { week: 2, id: 'playlist-battle', name: 'The Playlist Battle', emoji: '🎧', tagline: 'Boring music is the real enemy.',
    desc: 'Build a brand-new walking playlist and take it for a spin. Fresh sound, same incline.',
    tasks: [{ id: 'build', text: 'Build a new playlist with at least 10 songs' }, { id: 'share', text: 'Name it something dramatic' }],
    auto: { label: 'Walks this week', target: 3, measure: workouts } },
  { week: 3, id: 'comeback-quest', name: 'The Comeback Quest', emoji: '🎯', tagline: 'Missing a day is nothing. Never coming back is the boss.',
    desc: 'Life happens in week three. Your only job: keep returning. Log three walks and forgive one imperfect day in your journal.',
    tasks: [{ id: 'forgive', text: 'Write one kind sentence about a day that didn’t go to plan' }],
    auto: { label: 'Walks this week', target: 3, measure: workouts } },
  { week: 4, id: 'endurance-explorer', name: 'The Endurance Explorer', emoji: '🧭', tagline: 'Your lungs have a map now.',
    desc: 'Four walks, and notice how the full 30 feels compared to week one. Write it down.',
    tasks: [{ id: 'notice', text: 'Note how the last 5 minutes feel now versus Day 1' }],
    auto: { label: 'Workouts this week', target: 4, measure: workouts } },
  { week: 5, id: 'main-character', name: 'The Main Character Week', emoji: '👑', tagline: 'The camera is on. Act accordingly.',
    desc: 'This week is about presence. Dress for the walk you want, take a photo you like, and do at least one Main Character Walk.',
    tasks: [{ id: 'outfit', text: 'Wear your favorite workout outfit' }, { id: 'photo', text: 'Take a confident photo of yourself' }],
    auto: { label: 'Main Character Walks', target: 1, measure: (w) => w.filter((d) => d.workout?.theme === 'main-character').length } },
  { week: 6, id: 'incline-explorer', name: 'The Incline Explorer', emoji: '⛰️', tagline: 'A tiny hill, a big flex.',
    desc: 'Optional play with intensity. If you feel strong, try two extra minutes or a short burst at incline 13. If not, a strength session counts instead.',
    tasks: [{ id: 'explore', text: 'Try 2 extra minutes OR a 3-minute burst at incline 13 (only if you feel great)' }],
    auto: { label: 'Workouts or strength sessions', target: 3, measure: (w) => w.filter((d) => d.workout || d.strength).length } },
  { week: 7, id: 'self-care-boss', name: 'The Self-Care Boss', emoji: '🛁', tagline: 'Burnout can’t hit what it can’t find.',
    desc: 'Halfway there. Complete four self-care quests and one at-home spa night. Walks still count, rest counts more.',
    tasks: [{ id: 'spa', text: 'One at-home spa night (mask, music, lights low)' }],
    auto: { label: 'Self-care quests', target: 4, measure: (w) => w.reduce((a, d) => a + Object.keys(d.quests || {}).filter((q) => SELF_CARE_IDS.has(q)).length, 0) } },
  { week: 8, id: 'level-up-battle', name: 'The Level-Up Battle', emoji: '⚡', tagline: 'XP is just effort with receipts.',
    desc: 'Earn 120 XP this week from any mix of walks, quests, strength, and reflections.',
    tasks: [], auto: { label: 'XP earned this week', target: 120, measure: (_w, s) => s.weekly[7]?.xp ?? 0 } },
  { week: 9, id: 'confidence-challenge', name: 'The Confidence Challenge', emoji: '💄', tagline: 'Say it like you mean it.',
    desc: 'Three walks plus three acts of confidence. Nobody has to see them but you.',
    tasks: [{ id: 'proud', text: 'Write three things you are proud of so far' }, { id: 'compliment', text: 'Give yourself a genuine compliment in the journal' }, { id: 'wear', text: 'Wear something that makes you feel powerful' }],
    auto: { label: 'Walks this week', target: 3, measure: workouts } },
  { week: 10, id: 'endurance-boss', name: 'The Endurance Boss', emoji: '🐉', tagline: 'Big lungs, bigger heart.',
    desc: 'Walk 150 total minutes this week. Five standard walks does it, or mix lengths however your shifts allow.',
    tasks: [], auto: { label: 'Walking minutes', target: 150, measure: minutes } },
  { week: 11, id: 'recovery-champion', name: 'The Recovery Champion', emoji: '🌿', tagline: 'Rest like it’s part of the training. Because it is.',
    desc: 'Protect sleep four times, log one planned recovery day, and stretch properly once.',
    tasks: [{ id: 'stretch', text: 'One 10-minute stretch or mobility session' }, { id: 'recovery', text: 'Log one planned recovery day' }],
    auto: { label: 'Sleep quests', target: 4, measure: (w) => quest(w, 'sleep') } },
  { week: 12, id: 'final-countdown', name: 'The Final Countdown', emoji: '⏳', tagline: 'You can hear the credits music.',
    desc: 'Four walks, and write a letter to Day-90 you. You’ll read it next week.',
    tasks: [{ id: 'letter', text: 'Write your Day-90 letter in the journal' }],
    auto: { label: 'Workouts this week', target: 4, measure: workouts } },
  { week: 13, id: 'victory-quest', name: 'The Victory Quest', emoji: '🏆', tagline: 'The era ends. The habits don’t.',
    desc: 'Three final walks, plan your celebration, and write down what the next era looks like.',
    tasks: [{ id: 'celebrate', text: 'Plan your Day-90 celebration' }, { id: 'next', text: 'Write your “next era” plan' }],
    auto: { label: 'Walks this week', target: 3, measure: workouts } },
]

export function bossProgress(b: BossDef, week: DayLog[], s: Stats, tasksDone: number) {
  const autoVal = b.auto ? Math.min(b.auto.target, b.auto.measure(week, s)) : 0
  const autoTarget = b.auto?.target ?? 0
  const total = b.tasks.length + autoTarget
  const done = tasksDone + autoVal
  return { autoVal, autoTarget, total, done, pct: total ? done / total : 0, complete: done >= total && total > 0 }
}
