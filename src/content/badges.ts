import type { Stats } from '@/lib/stats'

export interface BadgeDef {
  id: string
  name: string
  emoji: string
  desc: string
  group: 'milestone' | 'workouts' | 'habits' | 'hidden'
  hidden?: boolean
  check: (s: Stats) => boolean
}

export const BADGES: BadgeDef[] = [
  // milestones (by challenge day reached with an active log that day or later)
  { id: 'first-steps', name: 'First Steps', emoji: '👟', desc: 'Complete Day 1.', group: 'milestone', check: (s) => s.workouts >= 1 || s.daysLogged >= 1 },
  { id: 'committed', name: 'Committed', emoji: '💍', desc: 'Reach Day 15.', group: 'milestone', check: (s) => s.currentDay >= 15 && s.daysLogged >= 8 },
  { id: 'consistency-queen', name: 'Consistency Queen', emoji: '👑', desc: 'Reach Day 30 with 15+ active days.', group: 'milestone', check: (s) => s.currentDay >= 30 && s.daysLogged >= 15 },
  { id: 'halfway-hero', name: 'Halfway Hero', emoji: '🦋', desc: 'Reach Day 45.', group: 'milestone', check: (s) => s.currentDay >= 45 && s.daysLogged >= 20 },
  { id: 'glow-up-era', name: 'Glow-Up Era', emoji: '✨', desc: 'Reach Day 60 with 30+ active days.', group: 'milestone', check: (s) => s.currentDay >= 60 && s.daysLogged >= 30 },
  { id: 'legend-90', name: '90-Day Legend', emoji: '🏆', desc: 'Complete the full 90-day challenge.', group: 'milestone', check: (s) => s.currentDay >= 90 && s.daysLogged >= 45 },
  // workouts
  { id: 'w5', name: 'Warming Up', emoji: '🌱', desc: 'Complete 5 workouts.', group: 'workouts', check: (s) => s.workouts >= 5 },
  { id: 'w10', name: 'Double Digits', emoji: '🔟', desc: 'Complete 10 workouts.', group: 'workouts', check: (s) => s.workouts >= 10 },
  { id: 'w25', name: 'Quarter Century', emoji: '🌙', desc: 'Complete 25 workouts.', group: 'workouts', check: (s) => s.workouts >= 25 },
  { id: 'w50', name: 'Fifty & Fabulous', emoji: '💎', desc: 'Complete 50 workouts.', group: 'workouts', check: (s) => s.workouts >= 50 },
  { id: 'w75', name: 'Unstoppable', emoji: '🚀', desc: 'Complete 75 workouts.', group: 'workouts', check: (s) => s.workouts >= 75 },
  { id: 'full-90', name: 'The Full Era', emoji: '🌟', desc: 'Complete the whole challenge with 60+ workouts.', group: 'workouts', check: (s) => s.currentDay >= 90 && s.workouts >= 60 },
  { id: 'strength-1', name: 'Strong Start', emoji: '💪', desc: 'Complete your first strength session.', group: 'workouts', check: (s) => s.strengthSessions >= 1 },
  { id: 'strength-10', name: 'Iron Butterfly', emoji: '🦋', desc: 'Complete 10 strength sessions.', group: 'workouts', check: (s) => s.strengthSessions >= 10 },
  { id: 'minutes-500', name: '500 Minutes', emoji: '⏱️', desc: 'Walk 500 total minutes.', group: 'workouts', check: (s) => s.walkingMinutes >= 500 },
  { id: 'minutes-1500', name: '1,500 Minutes', emoji: '🏔️', desc: 'Walk 1,500 total minutes.', group: 'workouts', check: (s) => s.walkingMinutes >= 1500 },
  // habits
  { id: 'boss-1', name: 'Boss Slayer', emoji: '⚔️', desc: 'Defeat your first weekly boss.', group: 'habits', check: (s) => s.bossesDefeated >= 1 },
  { id: 'boss-5', name: 'Raid Leader', emoji: '🛡️', desc: 'Defeat 5 weekly bosses.', group: 'habits', check: (s) => s.bossesDefeated >= 5 },
  { id: 'streak-7', name: 'Seven Straight', emoji: '🔥', desc: 'Keep a 7-day active streak.', group: 'habits', check: (s) => s.bestStreak >= 7 },
  { id: 'streak-14', name: 'Two-Week Flame', emoji: '🔥', desc: 'Keep a 14-day active streak.', group: 'habits', check: (s) => s.bestStreak >= 14 },
  { id: 'selfcare-10', name: 'Soft Life', emoji: '🛁', desc: 'Complete 10 self-care missions.', group: 'habits', check: (s) => s.selfCareQuests >= 10 },
  { id: 'hydration-20', name: 'Hydration Hero', emoji: '💧', desc: 'Complete the hydration check-in 20 times.', group: 'habits', check: (s) => (s.questCounts['hydrate'] || 0) >= 20 },
  { id: 'journal-10', name: 'Dear Diary', emoji: '📓', desc: 'Write 10 journal entries.', group: 'habits', check: (s) => s.journalEntries >= 10 },
  { id: 'quests-50', name: 'Quest Collector', emoji: '🗺️', desc: 'Complete 50 daily quests.', group: 'habits', check: (s) => s.questsCompleted >= 50 },
  { id: 'reflect-4', name: 'Deep Thinker', emoji: '🪞', desc: 'Complete 4 weekly reflections.', group: 'habits', check: (s) => s.reflections >= 4 },
  { id: 'recovery-3', name: 'Rest Is Productive', emoji: '🌿', desc: 'Log 3 planned recovery days.', group: 'habits', check: (s) => s.recoveryDays >= 3 },
  // hidden
  { id: 'night-owl', name: 'Night Owl', emoji: '🦉', desc: 'Complete 5 workouts on night-shift days.', group: 'hidden', hidden: true, check: (s) => s.nightShiftWorkouts >= 5 },
  { id: 'comeback-kid', name: 'Comeback Kid', emoji: '🎯', desc: 'Return with a workout after two or more quiet days.', group: 'hidden', hidden: true, check: (s) => s.comebacks >= 1 },
  { id: 'first-purchase', name: 'Treat Yourself', emoji: '🛍️', desc: 'Buy your first reward.', group: 'hidden', hidden: true, check: (s) => s.purchases >= 1 },
  { id: 'spin-10', name: 'Wheel of Fortune', emoji: '🎡', desc: 'Spin the mystery wheel 10 times.', group: 'hidden', hidden: true, check: (s) => s.spins >= 10 },
  { id: 'themes-5', name: 'Genre Hopper', emoji: '🎭', desc: 'Walk with 5 different entertainment themes.', group: 'hidden', hidden: true, check: (s) => s.themesUsed.length >= 5 },
  { id: 'envelope-5', name: 'Secret Admirer', emoji: '💌', desc: 'Open 5 mystery envelopes.', group: 'hidden', hidden: true, check: (s) => s.envelopesOpened >= 5 },
  { id: 'nsv-5', name: 'More Than a Number', emoji: '🪄', desc: 'Record 5 non-scale victories.', group: 'hidden', hidden: true, check: (s) => s.nsvs >= 5 },
  { id: 'level-legend', name: 'Legendary', emoji: '🐉', desc: 'Reach Level 6: Legend.', group: 'hidden', hidden: true, check: (s) => s.level.level >= 6 },
]
