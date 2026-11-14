import type { ShiftType } from '@/lib/types'

export interface Quest {
  id: string; title: string; emoji: string
  category: 'hydration' | 'nutrition' | 'sleep' | 'selfcare' | 'movement' | 'mind' | 'prep'
  hint?: string
  fits?: ShiftType[] // especially suited to these kinds of day: one quest a day is drawn from the matching ones
  avoid?: ShiftType[] // can't sensibly be done on these kinds of day: left out of that day's draw
  beforeWork?: boolean // only makes sense when the next day is a work day: replaced when tomorrow is off or rest
}

export const HYDRATION_QUEST: Quest = { id: 'hydrate', title: 'Hydration', emoji: '💧', category: 'hydration', hint: 'Ticks itself when you reach your goal.' }

export const QUEST_POOL: Quest[] = [
  { id: 'nourish', title: 'Eat a nourishing meal', emoji: '🥗', category: 'nutrition', hint: 'Something that makes your body feel good.' },
  { id: 'protein', title: 'Include protein', emoji: '🍳', category: 'nutrition', hint: 'A protein-focused meal or snack.' },
  { id: 'fruitveg', title: 'Eat fruit or vegetables', emoji: '🍓', category: 'nutrition' },
  { id: 'sleep', title: 'Protect your sleep', emoji: '🌙', category: 'sleep', hint: 'A wind-down routine, blackout curtains, phone away.', fits: ['night', 'recovery'] },
  { id: 'selfcare', title: 'One self-care activity', emoji: '🛁', category: 'selfcare', hint: 'Skincare, a bath, a candle, a slow cup of tea.', fits: ['off', 'recovery'] },
  { id: 'stretch', title: 'Stretch for 5 minutes', emoji: '🧘‍♀️', category: 'movement', fits: ['off', 'recovery'] },
  { id: 'playlist', title: 'Listen to something new', emoji: '🎧', category: 'mind', hint: 'A new playlist, album, or podcast.' },
  { id: 'journal', title: 'Write a journal entry', emoji: '📓', category: 'mind' },
  { id: 'mealprep', title: 'Prep food for work', emoji: '🍱', category: 'prep', fits: ['day', 'elective', 'off'], avoid: ['recovery'] },
  { id: 'victory', title: 'Celebrate a small victory', emoji: '🎉', category: 'mind', hint: 'Say it out loud or write it down.' },
  { id: 'steps', title: 'Take a 5-minute movement break', emoji: '🚶‍♀️', category: 'movement', hint: 'A short lap during your shift counts.', fits: ['day', 'elective'] },
  { id: 'sunlight', title: 'Get some daylight', emoji: '☀️', category: 'selfcare', hint: 'Even a few minutes helps reset your rhythm.', fits: ['off'], avoid: ['night'] },
  { id: 'kindness', title: 'Say something kind to yourself', emoji: '💗', category: 'mind' },
  { id: 'screens', title: 'Screen-free 20 minutes before sleep', emoji: '📵', category: 'sleep' },
  { id: 'layout', title: 'Lay out tomorrow’s workout gear', emoji: '👟', category: 'prep', fits: ['day', 'elective'] },
  { id: 'breakfast', title: 'Eat a real first meal', emoji: '🥣', category: 'nutrition', hint: 'Whatever “breakfast” means on your shift.' },
  { id: 'snack', title: 'Pack a protein snack for work', emoji: '🧀', category: 'prep', fits: ['day', 'night', 'elective'], avoid: ['off', 'recovery'] },
  { id: 'caffeine', title: 'Last caffeine 6+ hours before sleep', emoji: '☕', category: 'sleep', fits: ['night'] },
  { id: 'nap', title: 'Take a planned nap if you need one', emoji: '😴', category: 'sleep', hint: 'Twenty minutes, alarm set. Especially around night shifts.', fits: ['night', 'recovery'] },
  { id: 'posture', title: 'Posture reset: roll shoulders, lift chin', emoji: '🧍‍♀️', category: 'movement' },
  { id: 'squats', title: 'Ten squats, anywhere', emoji: '🏋️‍♀️', category: 'movement', avoid: ['recovery'] },
  { id: 'music', title: 'Add one new song to your walk playlist', emoji: '🎵', category: 'mind' },
  { id: 'affirm', title: 'Read your “why” out loud', emoji: '🪞', category: 'mind' },
  { id: 'photo', title: 'Take one photo you like of yourself', emoji: '📸', category: 'mind' },
  { id: 'tidy', title: 'Clear your treadmill space', emoji: '🧹', category: 'prep', hint: 'Zero friction for tomorrow.', fits: ['off'] },
  { id: 'friend', title: 'Tell someone one win from this week', emoji: '💬', category: 'mind' },
  { id: 'veg-dinner', title: 'Half the plate vegetables at one meal', emoji: '🥦', category: 'nutrition', fits: ['off'] },
  { id: 'skin', title: 'Full skincare routine, no shortcuts', emoji: '🧴', category: 'selfcare', fits: ['recovery'] },
  { id: 'breathe', title: 'Two minutes of slow breathing', emoji: '🌬️', category: 'selfcare', hint: 'In for four, out for six.', fits: ['recovery'] },
  // shift-specific
  { id: 'quiet-break', title: 'Two minutes of quiet with your eyes closed on a break', emoji: '😌', category: 'selfcare', fits: ['day', 'night', 'elective'], avoid: ['off', 'recovery'] },
  { id: 'meal-away', title: 'Eat your meal away from your work station', emoji: '🍽️', category: 'nutrition', fits: ['day', 'night', 'elective'], avoid: ['off', 'recovery'] },
  { id: 'text-love', title: 'Text someone you love on your break', emoji: '💌', category: 'mind', fits: ['day', 'night', 'elective'], avoid: ['off', 'recovery'] },
  { id: 'pack-bag', title: 'Pack tomorrow’s bag before bed', emoji: '🎒', category: 'prep', hint: 'One less thing to think about in the morning.', fits: ['day', 'elective'], avoid: ['night', 'recovery'], beforeWork: true },
  { id: 'dark-room', title: 'Make your room properly dark before you sleep', emoji: '🕶️', category: 'sleep', hint: 'Blackout curtains, eye mask, phone face down.', fits: ['night'], avoid: ['day', 'off', 'elective'] },
  { id: 'pre-shift-meal', title: 'Eat a real meal before your shift', emoji: '🍲', category: 'nutrition', hint: 'Not just snacks from the break room.', fits: ['night', 'day'], avoid: ['off', 'recovery'] },
  { id: 'straight-to-bed', title: 'Straight to bed after the shift', emoji: '🛌', category: 'sleep', hint: 'Errands can wait until you’ve slept.', fits: ['night'], avoid: ['day', 'off', 'elective', 'recovery'] },
  { id: 'early-night', title: 'Lights out in time for a 6 AM start', emoji: '🛏️', category: 'sleep', fits: ['day'], avoid: ['night', 'off', 'recovery'] },
  { id: 'stairs', title: 'Take the stairs once at work', emoji: '🪜', category: 'movement', fits: ['day', 'elective'], avoid: ['off', 'recovery'] },
  { id: 'batch-cook', title: 'Cook once for your next two shifts', emoji: '🥘', category: 'prep', fits: ['off'], avoid: ['day', 'night', 'elective', 'recovery'] },
  { id: 'outside', title: 'Spend 20 minutes outside', emoji: '🌳', category: 'selfcare', fits: ['off'], avoid: ['day', 'night'] },
  { id: 'plan-walks', title: 'Look at the week ahead and pick your walk times', emoji: '🗓️', category: 'prep', fits: ['off', 'elective'] },
  { id: 'mobility', title: 'Loosen up: 5 slow minutes for hips, calves and ankles', emoji: '🦶', category: 'movement', hint: 'Hip circles, a calf stretch on the wall, ankle rolls. Nothing that feels like work.', fits: ['recovery', 'off'] },
  { id: 'unwind', title: 'Do one thing purely because you enjoy it', emoji: '🎨', category: 'selfcare', fits: ['recovery', 'off'] },
]

export const SELF_CARE_IDS = new Set(['selfcare', 'sunlight', 'kindness', 'stretch', 'skin', 'breathe', 'nap', 'outside', 'unwind', 'mobility', 'quiet-break'])
