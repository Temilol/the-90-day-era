export interface WheelCategory { id: string; name: string; emoji: string; color: string; items: string[] }
export const WHEEL: WheelCategory[] = [
  // What to listen to on the walk. Each one says so, because it can end up as a bonus mission on its own.
  { id: 'playlist', name: 'Walk Playlist', emoji: '🎧', color: '#a78bfa', items: [
    'Walk to the songs you loved at 15', 'Walk to songs with a colour in the title', 'Walk to one full album, start to finish, no skipping', 'Walk to the soundtrack of your favourite movie', 'Walk to the songs that make you feel unstoppable', 'Walk to a genre you never listen to', 'Walk to your most-played songs this year (your “Top Songs” or “Replay” playlist)', 'Walk like it’s a runway: songs that make you strut',
  ] },
  { id: 'selfcare', name: 'Self-Care Mission', emoji: '🌸', color: '#f9a8d4', items: [
    'Ten-minute face mask and do nothing else', 'Paint your nails a color you’d never pick', 'Make your bed beautiful before sleep', 'A long shower with your favorite scent', 'Twenty minutes with a book and tea', 'Write yourself a thank-you note', 'A phone-free meal', 'Stretch in bed for five minutes',
  ] },
  { id: 'motivation', name: 'Motivational Mission', emoji: '💫', color: '#fcd34d', items: [
    'Text a friend one thing you’re proud of', 'Write down what Day-90 you is doing', 'Say your goal out loud in the mirror', 'List three non-scale wins so far', 'Pick one word for this week and live it', 'Rewatch something that makes you feel brave', 'Set your lock screen to a reminder of why', 'Plan your Day-90 celebration outfit',
  ] },
  { id: 'mini', name: 'Mini Challenge', emoji: '⚡', color: '#5eead4', items: [
    'Add 2 bonus minutes to today’s walk (only if you feel good)', 'Hold a 30-second wall sit', 'Ten calf raises while you wait for something', 'Do 10 squats before your walk', 'Walk with no phone scrolling, just music', 'Add a vegetable to every meal today', 'Go to bed 20 minutes earlier', 'Post-walk stretch for 5 minutes',
  ] },
]
