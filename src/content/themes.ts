export interface WalkTheme { id: string; name: string; emoji: string; blurb: string }
export const THEMES: WalkTheme[] = [
  { id: 'main-character', name: 'Main Character Walk', emoji: '👑', blurb: 'Cinematic playlist. You are the protagonist. Walk like the camera is on you.' },
  { id: 'throwback', name: 'Throwback Playlist Walk', emoji: '📼', blurb: 'Songs from your teenage years only. No skips allowed.' },
  { id: 'tv-show', name: 'Favorite TV Show Walk', emoji: '📺', blurb: 'One episode, one walk. The treadmill is your only screen time for this one.' },
  { id: 'podcast', name: 'Podcast Walk', emoji: '🎙️', blurb: 'Pick an episode you keep saving for later. Later is now.' },
  { id: 'movie', name: 'Movie Marathon Walk', emoji: '🍿', blurb: 'Start a movie. Walk the first 30 minutes, finish it from the couch.' },
  { id: 'power', name: 'Power Playlist Walk', emoji: '⚡', blurb: 'High-BPM only. Match the beat with your steps.' },
  { id: 'self-care', name: 'Self-Care Walk', emoji: '🌸', blurb: 'Face mask on, calm playlist, soft lighting. Slow and gentle on purpose.' },
  { id: 'audiobook', name: 'Audiobook Walk', emoji: '📚', blurb: 'One chapter per walk. Plot twists make the time fly.' },
  { id: 'daydream', name: 'Daydream Walk', emoji: '☁️', blurb: 'Instrumental music. Imagine your Day-90 self and what she’s doing.' },
  { id: 'kpop', name: 'Dance Hits Walk', emoji: '💃', blurb: 'Pop, dance, K-pop, whatever makes you want to move.' },
]
