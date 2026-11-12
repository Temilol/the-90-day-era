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
]

export const SELF_CARE_IDS = new Set(['selfcare', 'sunlight', 'kindness', 'stretch'])
