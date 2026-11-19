import confetti from 'canvas-confetti'

const COLORS = ['#f9a8d4', '#c4b5fd', '#8b5cf6', '#fcd34d', '#ffffff', '#5eead4']

export function burst(opts: { big?: boolean } = {}) {
  const base = { colors: COLORS, disableForReducedMotion: true }
  if (opts.big) {
    const end = Date.now() + 1800
    const frame = () => {
      confetti({ ...base, particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } })
      confetti({ ...base, particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
    confetti({ ...base, particleCount: 160, spread: 100, origin: { y: 0.6 }, scalar: 1.1 })
  } else {
    confetti({ ...base, particleCount: 70, spread: 80, origin: { y: 0.7 } })
  }
}

export function hearts() {
  // Plain pink shapes, not emoji bitmaps: much lighter on a phone's graphics memory.
  confetti({ colors: ['#f9a8d4', '#f472b6', '#c4b5fd'], shapes: ['circle'], scalar: 0.9, particleCount: 14, spread: 80, gravity: 0.9, ticks: 120, origin: { y: 0.7 }, disableForReducedMotion: true })
}
