import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { todayKey, formatDate, addDays, dayNumber, dateForDay, weekOf, TOTAL_DAYS } from '@/lib/dates'
import type { DayLog, JournalEntry, Mood } from '@/lib/types'
import { PageHeader, Card, SectionTitle, Modal } from '@/components/ui'
import { ShiftPicker, SHIFTS } from '@/components/DayPanel'
import { hearts } from '@/components/Celebrate'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

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
  const openEntry = (d: string) => { setParams({ date: d }); window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60) }
  const today = todayKey()
  const entries = Object.values(days).filter((x) => x.journal).sort((a, b) => b.date.localeCompare(a.date))
  const dirty = JSON.stringify({ ...draft, updatedAt: 0 }) !== JSON.stringify({ ...(d?.journal ?? {}), updatedAt: 0 })
  const doSave = () => { save(date, draft); setSaved(true); hearts() }
  const hasContent = Object.entries(draft).some(([k, v]) => k !== 'updatedAt' && v !== undefined && v !== '')
  const timer = useRef<number | null>(null)
  useEffect(() => {
    if (!dirty || !hasContent) return
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { save(date, draft); setSaved(true) }, 900)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [draft, dirty, hasContent, date, save])
  const dayN = stats.startDate ? dayNumber(stats.startDate, date) : 0

  return (
    <div className="space-y-6">
      <PageHeader title="Journal" emoji="📓" sub="A few honest lines a day. Autosaves as you type. Edit any past entry." />
      <Card>
        <div className="flex items-center justify-between mb-4">
          <button className="btn-ghost p-2" onClick={() => go(-1)}><ChevronLeft /></button>
          <div className="text-center"><div className="font-semibold">{formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}</div><div className="text-xs text-muted">{dayN >= 1 && dayN <= 90 ? `Day ${dayN}` : 'Outside the challenge'}{date === todayKey() ? ' · today' : ''}</div></div>
          <button className="btn-ghost p-2" disabled={date >= todayKey()} onClick={() => go(1)}><ChevronRight /></button>
        </div>

        {date !== today && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-card-2 px-3 py-2 mb-4">
            <span className="text-xs text-muted min-w-0">{date < today ? 'Editing a past entry' : 'Writing ahead'}</span>
            <button type="button" className="btn-soft !py-1.5 text-xs shrink-0" onClick={() => setParams({})}>Back to today</button>
          </div>
        )}

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
            <button className="btn-primary" disabled={!dirty && saved} onClick={doSave}>{saved && !dirty ? 'Saved ✓' : dirty ? 'Save now' : 'Save entry'}</button>
          </div>
        </div>
      </Card>

      <PastEntries entries={entries} selected={date} today={today} start={stats.startDate} onOpen={openEntry} />
    </div>
  )
}

interface Group { key: string; title: string; sub: string; current: boolean; entries: DayLog[] }

/** Newest first in, one group per challenge week out, in the same order. */
function groupByWeek(entries: DayLog[], start: string | null | undefined, today: string): Group[] {
  const groups = new Map<string, Group>()
  const short = { month: 'short', day: 'numeric' } as const
  for (const e of entries) {
    const n = start ? dayNumber(start, e.date) : 0
    const key = !start ? 'all' : n < 1 ? 'before' : n > TOTAL_DAYS ? 'after' : String(weekOf(n))
    let g = groups.get(key)
    if (!g) {
      g = { key, title: 'Entries', sub: '', current: false, entries: [] }
      if (start && key !== 'before' && key !== 'after') {
        const w = Number(key)
        const from = dateForDay(start, (w - 1) * 7 + 1)
        const to = dateForDay(start, Math.min(w * 7, TOTAL_DAYS))
        g.current = today >= from && today <= to
        g.title = g.current ? `This week · Week ${w}` : `Week ${w}`
        g.sub = `${formatDate(from, short)} to ${formatDate(to, short)}`
      } else if (key === 'before') g.title = 'Before you started'
      else if (key === 'after') g.title = 'After day 90'
      groups.set(key, g)
    }
    g.entries.push(e)
  }
  return [...groups.values()]
}

const RECENT_WEEKS = 3

function PastEntries({ entries, selected, today, start, onOpen }: { entries: DayLog[]; selected: string; today: string; start: string | null | undefined; onOpen: (date: string) => void }) {
  const groups = groupByWeek(entries, start, today)
  // This week starts open, and so does the week of an entry she was sent to.
  const [open, setOpen] = useState<Set<string>>(() => new Set(groups.filter((g) => g.current || g.entries.some((e) => e.date === selected)).map((g) => g.key)))
  const [showAll, setShowAll] = useState(false)
  const toggle = (key: string) => setOpen((o) => { const n = new Set(o); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const anyOpen = groups.some((g) => open.has(g.key))
  const pick = (date: string) => { setShowAll(false); onOpen(date) }

  const renderGroup = (g: Group) => {
    const isOpen = open.has(g.key)
    return (
      <div key={g.key} className="card !p-0 overflow-hidden">
        <button type="button" aria-expanded={isOpen} onClick={() => toggle(g.key)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
          <div className="min-w-0">
            <div className="text-sm font-medium">{g.title}</div>
            <div className="text-xs text-muted">{g.sub && `${g.sub} · `}{g.entries.length} {g.entries.length === 1 ? 'entry' : 'entries'}</div>
          </div>
          <ChevronDown size={16} className={clsx('text-muted shrink-0 transition', isOpen && 'rotate-180')} />
        </button>
        {isOpen && (
          <div className="border-t border-line">
            {g.entries.map((e) => (
              <button key={e.date} type="button" onClick={() => pick(e.date)} className={clsx('w-full px-4 py-3 text-left flex items-center gap-3 border-t border-line first:border-t-0', e.date === selected && 'bg-lavender-50 dark:bg-lavender-500/10')}>
                <span className="text-2xl">{MOODS.find((m) => m.id === e.journal!.mood)?.emoji ?? '📝'}</span>
                <div className="flex-1 min-w-0"><div className="font-medium text-sm">{formatDate(e.date, { weekday: 'short', month: 'short', day: 'numeric' })}{e.shift && <span className="text-muted font-normal"> · {SHIFTS.find((x) => x.id === e.shift)?.label}</span>}</div><div className="text-xs text-muted truncate">{e.journal!.reflection || e.journal!.victories || e.journal!.gratitude || e.journal!.workoutNotes || 'Mood & energy logged'}</div></div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Kept in place (just hidden) when nothing is open, so the list never jumps.
  const collapseAll = (
    <button type="button" disabled={!anyOpen} onClick={() => setOpen(new Set())} className="text-xs font-medium text-lavender-600 dark:text-lavender-300 shrink-0 disabled:invisible">Collapse all</button>
  )

  return (
    <section>
      <SectionTitle sub={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`} action={collapseAll}>Past entries</SectionTitle>
      <div className="space-y-2">{groups.slice(0, RECENT_WEEKS).map(renderGroup)}</div>
      {groups.length > RECENT_WEEKS && <button type="button" className="btn-soft w-full mt-3" onClick={() => setShowAll(true)}>See all entries ({entries.length})</button>}
      <Modal open={showAll} onClose={() => setShowAll(false)} title="All journal entries">
        <div className="flex justify-end mb-2">{collapseAll}</div>
        <div className="space-y-2">{groups.map(renderGroup)}</div>
      </Modal>
    </section>
  )
}
