import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { todayKey, formatDate, addDays, dayNumber } from '@/lib/dates'
import type { JournalEntry, Mood } from '@/lib/types'
import { PageHeader, Card, SectionTitle } from '@/components/ui'
import { ShiftPicker, SHIFTS } from '@/components/DayPanel'
import { hearts } from '@/components/Celebrate'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MOODS: { id: Mood; emoji: string; label: string }[] = [
  { id: 'amazing', emoji: '🤩', label: 'Amazing' }, { id: 'good', emoji: '😊', label: 'Good' }, { id: 'okay', emoji: '😐', label: 'Okay' }, { id: 'tired', emoji: '🥱', label: 'Tired' }, { id: 'rough', emoji: '😮‍💨', label: 'Rough' },
]
const FIELDS: { key: keyof JournalEntry; label: string; ph: string }[] = [
  { key: 'workoutNotes', label: 'Workout notes', ph: 'How did the walk feel? Anything to remember?' },
  { key: 'foodNotes', label: 'Food & hydration', ph: 'What fuelled you today?' },
  { key: 'reflection', label: 'Reflection', ph: 'What’s on your mind?' },
  { key: 'gratitude', label: 'Gratitude', ph: 'Three small things.' },
  { key: 'victories', label: 'Personal victories', ph: 'Even tiny ones count.' },
  { key: 'improve', label: 'Tomorrow, I’ll…', ph: 'One thing to tweak.' },
]

export default function Journal() {
  const [params, setParams] = useSearchParams()
  const stats = useStats()
  const date = params.get('date') || todayKey()
  const days = useStore((s) => s.days)
  const d = days[date]
  const save = useStore((s) => s.saveJournal)
  const [draft, setDraft] = useState<Partial<JournalEntry>>(d?.journal ?? {})
  const [saved, setSaved] = useState(false)
  useEffect(() => { setDraft(days[date]?.journal ?? {}); setSaved(false) }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (n: number) => setParams({ date: addDays(date, n) })
  const entries = Object.values(days).filter((x) => x.journal).sort((a, b) => b.date.localeCompare(a.date))
  const dirty = JSON.stringify({ ...draft, updatedAt: 0 }) !== JSON.stringify({ ...(d?.journal ?? {}), updatedAt: 0 })
  const doSave = () => { save(date, draft); setSaved(true); hearts() }
  const dayN = stats.startDate ? dayNumber(stats.startDate, date) : 0

  return (
    <div className="space-y-6">
      <PageHeader title="Journal" emoji="📓" sub="A few honest lines a day. Edit any past entry." />
      <Card>
        <div className="flex items-center justify-between mb-4">
          <button className="btn-ghost p-2" onClick={() => go(-1)}><ChevronLeft /></button>
          <div className="text-center"><div className="font-semibold">{formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}</div><div className="text-xs text-muted">{dayN >= 1 && dayN <= 90 ? `Day ${dayN}` : 'Outside the challenge'}{date === todayKey() ? ' · today' : ''}</div></div>
          <button className="btn-ghost p-2" disabled={date >= todayKey()} onClick={() => go(1)}><ChevronRight /></button>
        </div>

        <div className="space-y-5">
          <div><div className="label">Shift</div><ShiftPicker date={date} compact /></div>
          <div>
            <div className="label">Mood</div>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((m) => <button key={m.id} onClick={() => setDraft({ ...draft, mood: m.id })} className={clsx('rounded-2xl border p-2 text-center transition', draft.mood === m.id ? 'border-lavender-400 bg-lavender-50 dark:bg-lavender-500/15 shadow-glow' : 'border-line bg-card-2')}><div className="text-2xl">{m.emoji}</div><div className="text-[11px] font-medium">{m.label}</div></button>)}
            </div>
          </div>
          <div>
            <div className="flex justify-between"><div className="label">Energy</div><span className="text-xs text-muted">{draft.energy ? ['', 'Running on empty', 'Low', 'Steady', 'Good', 'Fully charged'][draft.energy] : 'Not set'}</span></div>
            <div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setDraft({ ...draft, energy: n })} className={clsx('flex-1 h-10 rounded-xl text-lg transition', (draft.energy ?? 0) >= n ? 'bg-gradient-to-br from-lavender-400 to-blush-400 text-white' : 'bg-card-2 text-muted')}>⚡</button>)}</div>
          </div>
          {FIELDS.map((f) => (
            <div key={f.key}><label className="label">{f.label}</label><textarea className="input min-h-20" placeholder={f.ph} value={(draft[f.key] as string) || ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} /></div>
          ))}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{d?.journal?.updatedAt ? `Last saved ${new Date(d.journal.updatedAt).toLocaleString()}` : 'Not saved yet'}</span>
            <button className="btn-primary" disabled={!dirty && saved} onClick={doSave}>{saved && !dirty ? 'Saved ✓' : 'Save entry'}</button>
          </div>
        </div>
      </Card>

      <section>
        <SectionTitle sub={`${entries.length} entries`}>Past entries</SectionTitle>
        <div className="space-y-2">
          {entries.slice(0, 30).map((e) => (
            <button key={e.date} onClick={() => setParams({ date: e.date })} className={clsx('card w-full p-3 text-left flex items-center gap-3', e.date === date && 'ring-2 ring-lavender-400')}>
              <span className="text-2xl">{MOODS.find((m) => m.id === e.journal!.mood)?.emoji ?? '📝'}</span>
              <div className="flex-1 min-w-0"><div className="font-medium text-sm">{formatDate(e.date, { weekday: 'short', month: 'short', day: 'numeric' })}{e.shift && <span className="text-muted font-normal"> · {SHIFTS.find((s) => s.id === e.shift)?.label}</span>}</div><div className="text-xs text-muted truncate">{e.journal!.reflection || e.journal!.victories || e.journal!.gratitude || e.journal!.workoutNotes || 'Mood & energy logged'}</div></div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
