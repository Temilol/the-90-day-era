import type { JournalEntry } from './types'

/** Journal fields that hold her own writing; a mood tap is not writing. */
const JOURNAL_TEXT: (keyof JournalEntry)[] = ['workoutNotes', 'foodNotes', 'reflection', 'gratitude', 'victories', 'improve']
export const journalLength = (j: JournalEntry | undefined) => (j ? JOURNAL_TEXT.reduce((n, k) => n + String(j[k] ?? '').trim().length, 0) : 0)
