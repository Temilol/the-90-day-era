import type { DayLog, JournalEntry } from './types'
import { addDays, dayKeyAt } from './dates'

/** How much writing a journal entry needs before it counts. */
export const JOURNAL_MIN_CHARS = 20

/** Journal fields that hold her own writing; a mood tap is not writing. */
const JOURNAL_TEXT: (keyof JournalEntry)[] = ['workoutNotes', 'foodNotes', 'reflection', 'gratitude', 'victories', 'improve']
export const journalLength = (j: JournalEntry | undefined) => (j ? JOURNAL_TEXT.reduce((n, k) => n + String(j[k] ?? '').trim().length, 0) : 0)

/** A journal entry earns XP when it has real writing in it and was written on its day or the day after. */
export function journalEarns(d: DayLog): boolean {
  const j = d.journal
  if (!j || journalLength(j) < JOURNAL_MIN_CHARS) return false
  const at = new Date(j.qualifiedAt ?? j.updatedAt)
  if (isNaN(at.getTime())) return false
  return dayKeyAt(at) <= addDays(d.date, 1)
}
