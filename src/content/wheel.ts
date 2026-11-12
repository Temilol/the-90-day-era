export interface WheelCategory { id: string; name: string; emoji: string; color: string; items: string[] }
export const WHEEL: WheelCategory[] = [
  { id: 'playlist', name: 'Playlist Theme', emoji: '🎧', color: '#a78bfa', items: [
    'Songs you loved at 15', 'Only songs with a color in the title', 'A full album start to finish', 'Soundtrack of your favorite movie', 'Songs that make you feel unstoppable', 'A genre you never listen to', 'Your most-played songs this year', 'Songs to walk down a runway to',
  ] },
  { id: 'selfcare', name: 'Self-Care Mission', emoji: '🌸', color: '#f9a8d4', items: [
    'Ten-minute face mask and do nothing else', 'Paint your nails a color you’d never pick', 'Make your bed beautiful before sleep', 'A long shower with your favorite scent', 'Twenty minutes with a book and tea', 'Write yourself a thank-you note', 'A phone-free meal', 'Stretch in bed for five minutes',
  ] },
  { id: 'motivation', name: 'Motivational Mission', emoji: '💫', color: '#fcd34d', items: [
    'Text a friend one thing you’re proud of', 'Write down what Day-90 you is doing', 'Say your goal out loud in the mirror', 'List three non-scale wins so far', 'Pick one word for this week and live it', 'Rewatch something that makes you feel brave', 'Set your lock screen to a reminder of why', 'Plan your Day-90 celebration outfit',
  ] },
  { id: 'mini', name: 'Mini Challenge', emoji: '⚡', color: '#5eead4', items: [
    'Add 2 bonus minutes to today’s walk (only if you feel good)', 'Drink a full glass of water before coffee', 'Take the stairs once at work', 'Do 10 squats before your walk', 'Walk with no phone scrolling, just music', 'Add a vegetable to every meal today', 'Go to bed 20 minutes earlier', 'Post-walk stretch for 5 minutes',
  ] },
]
