export interface Quest { id: string; title: string; emoji: string; category: 'hydration' | 'nutrition' | 'sleep' | 'selfcare' | 'movement' | 'mind' | 'prep'; hint?: string }

export const HYDRATION_QUEST: Quest = { id: 'hydrate', title: 'Hydration check-in', emoji: '💧', category: 'hydration', hint: 'Water with you at work, sips through the shift.' }

export const QUEST_POOL: Quest[] = [
  { id: 'nourish', title: 'Eat a nourishing meal', emoji: '🥗', category: 'nutrition', hint: 'Something that makes your body feel good.' },
  { id: 'protein', title: 'Include protein', emoji: '🍳', category: 'nutrition', hint: 'A protein-focused meal or snack.' },
  { id: 'fruitveg', title: 'Eat fruit or vegetables', emoji: '🍓', category: 'nutrition' },
  { id: 'sleep', title: 'Protect your sleep', emoji: '🌙', category: 'sleep', hint: 'A wind-down routine, blackout curtains, phone away.' },
  { id: 'selfcare', title: 'One self-care activity', emoji: '🛁', category: 'selfcare', hint: 'Skincare, a bath, a candle, a slow cup of tea.' },
  { id: 'stretch', title: 'Stretch for 5 minutes', emoji: '🧘‍♀️', category: 'movement' },
  { id: 'playlist', title: 'Listen to something new', emoji: '🎧', category: 'mind', hint: 'A new playlist, album, or podcast.' },
  { id: 'journal', title: 'Write a journal entry', emoji: '📓', category: 'mind' },
  { id: 'mealprep', title: 'Prep food for work', emoji: '🍱', category: 'prep' },
  { id: 'victory', title: 'Celebrate a small victory', emoji: '🎉', category: 'mind', hint: 'Say it out loud or write it down.' },
  { id: 'steps', title: 'Take a 5-minute movement break', emoji: '🚶‍♀️', category: 'movement', hint: 'A short lap during your shift counts.' },
  { id: 'sunlight', title: 'Get some daylight', emoji: '☀️', category: 'selfcare', hint: 'Even a few minutes helps reset your rhythm.' },
  { id: 'kindness', title: 'Say something kind to yourself', emoji: '💗', category: 'mind' },
  { id: 'screens', title: 'Screen-free 20 minutes before sleep', emoji: '📵', category: 'sleep' },
  { id: 'layout', title: 'Lay out tomorrow’s workout gear', emoji: '👟', category: 'prep' },
  { id: 'breakfast', title: 'Eat a real first meal', emoji: '🥣', category: 'nutrition', hint: 'Whatever “breakfast” means on your shift.' },
  { id: 'snack', title: 'Pack a protein snack for work', emoji: '🧀', category: 'prep' },
  { id: 'caffeine', title: 'Last caffeine 6+ hours before sleep', emoji: '☕', category: 'sleep' },
  { id: 'nap', title: 'Take a planned nap if you need one', emoji: '😴', category: 'sleep', hint: 'Twenty minutes, alarm set. Especially around night shifts.' },
  { id: 'posture', title: 'Posture reset: roll shoulders, lift chin', emoji: '🧍‍♀️', category: 'movement' },
  { id: 'squats', title: 'Ten squats, anywhere', emoji: '🏋️‍♀️', category: 'movement' },
  { id: 'music', title: 'Add one new song to your walk playlist', emoji: '🎵', category: 'mind' },
  { id: 'affirm', title: 'Read your “why” out loud', emoji: '🪞', category: 'mind' },
  { id: 'photo', title: 'Take one photo you like of yourself', emoji: '📸', category: 'mind' },
  { id: 'tidy', title: 'Clear your treadmill space', emoji: '🧹', category: 'prep', hint: 'Zero friction for tomorrow.' },
  { id: 'friend', title: 'Tell someone one win from this week', emoji: '💬', category: 'mind' },
  { id: 'veg-dinner', title: 'Half the plate vegetables at one meal', emoji: '🥦', category: 'nutrition' },
  { id: 'water-bottle', title: 'Finish your bottle before the shift ends', emoji: '🫗', category: 'hydration' },
  { id: 'skin', title: 'Full skincare routine, no shortcuts', emoji: '🧴', category: 'selfcare' },
  { id: 'breathe', title: 'Two minutes of slow breathing', emoji: '🌬️', category: 'selfcare', hint: 'In for four, out for six.' },
]

export const SELF_CARE_IDS = new Set(['selfcare', 'sunlight', 'kindness', 'stretch', 'skin', 'breathe', 'nap'])
