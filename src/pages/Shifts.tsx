import { useState } from 'react'
import { clsx } from 'clsx'
import { useStore } from '@/store/useStore'
import { todayKey, addDays, formatDate } from '@/lib/dates'
import { SHIFTS } from '@/components/DayPanel'
import { PageHeader, Card, SectionTitle, Modal } from '@/components/ui'
import { notificationsSupported, requestNotifications } from '@/lib/reminders'
import type { Reminder, ShiftType } from '@/lib/types'
import { Bell, Plus, Trash2 } from 'lucide-react'

export default function Shifts() {
  const days = useStore((s) => s.days)
  const setShift = useStore((s) => s.setShift)
  const reminders = useStore((s) => s.reminders)
  const upsert = useStore((s) => s.upsertReminder)
  const remove = useStore((s) => s.removeReminder)
  const [offset, setOffset] = useState(0)
  const [edit, setEdit] = useState<Reminder | null>(null)
  const [perm, setPerm] = useState<string>(notificationsSupported() ? Notification.permission : 'unsupported')
  const today = todayKey()
  const start = addDays(today, offset * 14 - 3)
  const range = Array.from({ length: 14 }, (_, i) => addDays(start, i))
  const counts = Object.values(days).reduce((a, d) => { if (d.shift) a[d.shift] = (a[d.shift] || 0) + 1; return a }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <PageHeader title="Shift Tracker" emoji="🕑" sub="Plan ahead or log as you go. Tap a day, then a shift type." />
      <Card>
        <div className="flex items-center justify-between mb-3">
          <button className="btn-soft !py-1.5" onClick={() => setOffset(offset - 1)}>← Earlier</button>
          <div className="text-sm font-semibold">{formatDate(range[0], { month: 'short', day: 'numeric' })} – {formatDate(range[13], { month: 'short', day: 'numeric' })}</div>
          <button className="btn-soft !py-1.5" onClick={() => setOffset(offset + 1)}>Later →</button>
        </div>
        <div className="space-y-1.5">
          {range.map((date) => {
            const sh = days[date]?.shift
            return (
              <div key={date} className={clsx('flex items-center gap-2 rounded-2xl p-2', date === today && 'bg-lavender-50 dark:bg-lavender-500/10 ring-1 ring-lavender-300')}>
                <div className="w-20 shrink-0 text-xs"><div className="font-semibold">{formatDate(date, { weekday: 'short' })}</div><div className="text-muted">{formatDate(date, { month: 'short', day: 'numeric' })}</div></div>
                <div className="flex-1 grid grid-cols-4 gap-1">
                  {SHIFTS.map((s) => <button key={s.id} onClick={() => setShift(date, sh === s.id ? undefined : s.id)} className={clsx('rounded-xl py-1.5 text-xs font-medium transition', sh === s.id ? 'bg-gradient-to-r from-lavender-500 to-blush-400 text-white shadow-glow' : 'bg-card-2 text-muted hover:text-ink')}>{s.emoji} <span className="hidden sm:inline">{s.label.split(' ')[0]}</span></button>)}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-3 mt-4 text-xs text-muted flex-wrap">{SHIFTS.map((s) => <span key={s.id}>{s.emoji} {s.label}: <b className="text-ink">{counts[s.id] || 0}</b></span>)}</div>
      </Card>

      <section>
        <SectionTitle sub="A visible schedule, plus a notification while the app is open or installed on your home screen." action={<button className="btn-soft !py-1.5" onClick={() => setEdit({ id: `r${Date.now()}`, label: 'Walk time', time: '09:00', shifts: [], enabled: true })}><Plus size={14} /> Add</button>}>Workout reminders</SectionTitle>
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-card-2 p-3 text-sm">
            <div className="flex items-center gap-2"><Bell size={16} className="text-lavender-500" /><span>Notifications: <b>{perm === 'granted' ? 'on' : perm === 'denied' ? 'blocked in browser settings' : perm === 'unsupported' ? 'not supported here' : 'not enabled'}</b></span></div>
            {perm === 'default' && <button className="btn-primary !py-1.5" onClick={async () => setPerm(await requestNotifications())}>Enable</button>}
          </div>
          {reminders.length === 0 && <p className="text-sm text-muted">No reminders yet.</p>}
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <button onClick={() => upsert({ ...r, enabled: !r.enabled })} className={clsx('w-11 h-6 rounded-full relative transition shrink-0', r.enabled ? 'bg-gradient-to-r from-lavender-500 to-blush-400' : 'bg-line')}><span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition', r.enabled ? 'left-5.5' : 'left-0.5')} /></button>
              <button className="flex-1 text-left" onClick={() => setEdit(r)}>
                <div className="font-medium text-sm">{r.label} · <span className="gradient-text font-bold">{r.time}</span></div>
                <div className="text-xs text-muted">{r.shifts.length ? r.shifts.map((s) => SHIFTS.find((x) => x.id === s)?.label).join(', ') : 'Every day'}</div>
              </button>
              <button className="btn-ghost p-1.5" onClick={() => remove(r.id)}><Trash2 size={14} /></button>
            </div>
          ))}
          <p className="text-xs text-muted">Reminders fire on days whose logged shift matches. If a day has no shift logged, every enabled reminder fires. Install the app from your browser menu for the best experience.</p>
        </Card>
      </section>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Reminder">
        {edit && (
          <div className="space-y-3">
            <div><label className="label">Label</label><input className="input" value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} /></div>
            <div><label className="label">Time</label><input type="time" className="input" value={edit.time} onChange={(e) => setEdit({ ...edit, time: e.target.value })} /></div>
            <div><label className="label">Only on these shift types (none = every day)</label>
              <div className="grid grid-cols-2 gap-2">{SHIFTS.map((s) => { const on = edit.shifts.includes(s.id); return <button key={s.id} onClick={() => setEdit({ ...edit, shifts: on ? edit.shifts.filter((x) => x !== s.id) : [...edit.shifts, s.id as ShiftType] })} className={on ? 'btn-primary !py-2' : 'btn-soft !py-2'}>{s.emoji} {s.label}</button> })}</div>
            </div>
            <button className="btn-primary w-full" onClick={() => { upsert(edit); setEdit(null) }}>Save reminder</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
