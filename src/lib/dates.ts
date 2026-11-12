export const TOTAL_DAYS = 90

/** Local-date ISO key (yyyy-mm-dd). Rollover at local midnight. */
export function toKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

/** Whole days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  const ms = parseKey(b).getTime() - parseKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** Challenge day number for a date (1-based). <1 before start, >90 after. */
export function dayNumber(startDate: string, dateKey: string): number {
  return diffDays(startDate, dateKey) + 1
}

export function dateForDay(startDate: string, day: number): string {
  return addDays(startDate, day - 1)
}

export function weekOf(day: number): number {
  return Math.min(13, Math.max(1, Math.ceil(day / 7)))
}

export function chapterOf(day: number): 1 | 2 | 3 {
  if (day <= 30) return 1
  if (day <= 60) return 2
  return 3
}

export function formatDate(key: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }): string {
  return parseKey(key).toLocaleDateString(undefined, opts)
}

export function todayKey(): string {
  return toKey(new Date())
}

/** Deterministic pseudo-random in [0,1) from a string seed. */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

export function pickN<T>(arr: T[], n: number, rnd: () => number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (out.length < n && copy.length) {
    const i = Math.floor(rnd() * copy.length)
    out.push(copy.splice(i, 1)[0])
  }
  return out
}
