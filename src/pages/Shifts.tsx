import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { useStore } from '@/store/useStore'
import { todayKey, addDays, formatDate, dateForDay, parseKey, TOTAL_DAYS } from '@/lib/dates'
import { planFill, MAX_FILL_DAYS } from '@/lib/schedule'
import { DEFAULT_ELECTIVE } from '@/lib/walkPlan'
import { useUi } from '@/store/ui'
import { usePush, pushConfigured } from '@/store/push'
import { SHIFTS } from '@/components/DayPanel'
import { PageHeader, Card, SectionTitle, Modal } from '@/components/ui'
import { notificationsSupported, requestNotifications } from '@/lib/reminders'
import type { Reminder, ShiftHours, ShiftType } from '@/lib/types'
import { Bell, BellRing, Plus, Trash2, CalendarRange, X } from 'lucide-react'

const Toggle = ({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) => (
  <button role="switch" aria-checked={on} aria-label={label} onClick={onChange} className={clsx('w-11 h-6 rounded-full relative transition shrink-0', on ? 'bg-gradient-to-r from-lavender-500 to-blush-400' : 'bg-line')}><span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition', on ? 'left-5.5' : 'left-0.5')} /></button>
)

/** Reminders that reach the phone with the app closed. */
function PushPanel() {
  const status = usePush((s) => s.status)
  const busy = usePush((s) => s.busy)
  const message = usePush((s) => s.message)
  const enable = usePush((s) => s.enable)
  const disable = usePush((s) => s.disable)
  const test = usePush((s) => s.test)
  const walkReminders = useStore((s) => s.profile.walkReminders !== false)
  const setProfile = useStore((s) => s.setProfile)
  const explain: Record<string, string> = {
    'needs-install': 'On an iPhone, add the app to your Home Screen first: in Safari tap Share, then “Add to Home Screen”. Open it from the new icon and come back here.',
    unsupported: 'This browser can’t receive reminders while the app is closed.',
    'signed-out': 'Sign in from Settings to get reminders with the app closed.',
    blocked: 'Notifications are blocked for this app. Allow them in your device or browser settings, then come back here.',
    off: 'Get your reminders even when the app is closed.',
    on: 'On for this device. Reminders arrive even when the app is closed.',
  }
  return (
    <div className="rounded-2xl bg-card-2 p-3 space-y-3">
      <div className="flex items-center gap-3">
        <BellRing size={18} className={clsx('shrink-0', status === 'on' ? 'text-lavender-500' : 'text-muted')} />
        <div className="flex-1 text-sm"><div className="font-semibold">Reminders on this device</div><div className="text-xs text-muted">{explain[status]}</div></div>
        {status === 'off' && <button className="btn-primary !py-1.5 shrink-0" disabled={busy} onClick={() => void enable()}>{busy ? '…' : 'Turn on'}</button>}
      </div>
      {status === 'on' && (
        <>
          <div className="flex items-center justify-between gap-3 text-sm">
            <div><div className="font-medium">Before each walk window</div><div className="text-xs text-muted">A nudge 15 minutes before the times in your walk plan. Skipped once you’ve walked or rested.</div></div>
            <Toggle on={walkReminders} onChange={() => setProfile({ walkReminders: !walkReminders })} label="Remind me before each walk window" />
          </div>
          <div className="flex gap-2">
            <button className="btn-soft !py-1.5 flex-1" disabled={busy} onClick={() => void test()}>{busy ? 'Working…' : 'Send a test'}</button>
            <button className="btn-ghost !py-1.5 text-muted" disabled={busy} onClick={() => void disable()}>Turn off</button>
          </div>
        </>
      )}
      {message && <div role="status" className="text-xs text-lavender-600 dark:text-lavender-300">{message}</div>}
    </div>
  )
}

/** Fill a run of dates in one go: pick the dates, build the repeating pattern, check the preview. */
function ScheduleFill({ open, onClose }: { open: boolean; onClose: () => void }) {
  const days = useStore((s) => s.days)
  const startDate = useStore((s) => s.profile.startDate)
  const fillShifts = useStore((s) => s.fillShifts)
  const today = todayKey()
  const lastDay = startDate ? dateForDay(startDate, TOTAL_DAYS) : null
  const [from, setFrom] = useState(startDate && startDate > today ? startDate : today)
  const [to, setTo] = useState(lastDay && lastDay >= today ? lastDay : addDays(today, 27))
  const [pattern, setPattern] = useState<ShiftType[]>([])
  const [hours, setHours] = useState<ShiftHours>(() => {
    const last = Object.values(days).filter((d) => d.shift === 'elective' && d.hours).sort((a, b) => b.date.localeCompare(a.date))[0]
    return last?.hours ? { ...last.hours } : { ...DEFAULT_ELECTIVE }
  })
  const [keepMine, setKeepMine] = useState(true)
  const preview = useMemo(() => planFill(days, { from, to, pattern, hours, keepMine }), [days, from, to, pattern, hours, keepMine])
  const willChange = preview.filter((p) => !p.kept).length
  const kept = preview.length - willChange
  const tooLong = to >= from && Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / 86400000) + 1 > MAX_FILL_DAYS
  const hasElective = pattern.includes('elective')
  const emoji = (s?: ShiftType) => SHIFTS.find((x) => x.id === s)?.emoji ?? '·'
  const apply = () => {
    const n = fillShifts({ from, to, pattern, hours, keepMine })
    useUi.getState().pushToast({ title: `Schedule filled: ${n} ${n === 1 ? 'day' : 'days'}`, sub: 'Tap any day to change it', kind: 'success' })
    setPattern([])
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Fill in my schedule" wide>
      <div className="space-y-5">
        <div>
          <div className="label">1. Which dates</div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="input" aria-label="From date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
            <input type="date" className="input" aria-label="To date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
          </div>
          {to < from && <p className="text-xs text-rose-500 mt-1">The end date is before the start date.</p>}
          {tooLong && <p className="text-xs text-muted mt-1">Only the first {MAX_FILL_DAYS} days will be filled.</p>}
        </div>

        <div>
          <div className="label">2. What repeats</div>
          <p className="text-xs text-muted mb-2">Tap shifts in the order you work them. The pattern repeats across the dates. For a stretch that is the same every day, tap one.</p>
          <div className="grid grid-cols-5 gap-1.5">
            {SHIFTS.map((s) => <button key={s.id} type="button" onClick={() => setPattern((p) => (p.length < 60 ? [...p, s.id] : p))} className="rounded-2xl border border-line bg-card-2 py-2 text-center transition active:scale-95 hover:border-lavender-300"><div className="text-lg leading-none">{s.emoji}</div><div className="text-[10px] mt-1 text-muted">{s.short}</div></button>)}
          </div>
          <div className="mt-3 min-h-11 rounded-2xl bg-card-2 p-2 flex flex-wrap gap-1.5 items-center">
            {pattern.length === 0 && <span className="text-xs text-muted px-1">Your pattern appears here.</span>}
            {pattern.map((s, i) => <button key={i} type="button" onClick={() => setPattern((p) => p.filter((_, j) => j !== i))} aria-label={`Remove ${SHIFTS.find((x) => x.id === s)?.label} from position ${i + 1}`} className="chip bg-card text-ink shadow-soft">{emoji(s)} <X size={11} className="text-muted" /></button>)}
            {pattern.length > 0 && <button type="button" className="text-xs text-muted underline ml-auto px-1" onClick={() => setPattern([])}>Clear</button>}
          </div>
          {hasElective && (
            <div className="mt-2 rounded-2xl bg-card-2 p-2.5 text-sm">
              <div className="text-xs text-muted mb-1.5">📚 Elective hours. You can change them on any single day later.</div>
              <div className="flex items-center gap-2">
              <input type="time" aria-label="Elective start time" className="input !py-1.5 flex-1 min-w-0" value={hours.start} onChange={(e) => e.target.value && setHours({ ...hours, start: e.target.value })} />
              <span className="text-muted">to</span>
              <input type="time" aria-label="Elective end time" className="input !py-1.5 flex-1 min-w-0" value={hours.end} onChange={(e) => e.target.value && setHours({ ...hours, end: e.target.value })} />
              </div>
            </div>
          )}
        </div>

        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <input type="checkbox" className="size-4 accent-lavender-500" checked={keepMine} onChange={(e) => setKeepMine(e.target.checked)} />
          <span>Keep days I set by hand<span className="block text-xs text-muted">Days with a walk or rest already logged are always kept.</span></span>
        </label>

        {preview.length > 0 && (
          <div>
            <div className="label">3. Preview</div>
            <div className="grid grid-cols-7 gap-1 max-h-56 overflow-y-auto rounded-2xl bg-card-2 p-2">
              {preview.map((p) => (
                <div key={p.date} title={`${formatDate(p.date, { weekday: 'short', month: 'short', day: 'numeric' })}${p.kept ? ' (kept)' : ''}`} className={clsx('rounded-xl py-1 text-center', p.kept ? 'opacity-50' : 'bg-card')}>
                  <div className="text-[9px] text-muted leading-none">{formatDate(p.date, { month: 'numeric', day: 'numeric' })}</div>
                  <div className="text-sm leading-tight mt-0.5">{emoji(p.shift)}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-1.5">{willChange} {willChange === 1 ? 'day' : 'days'} will be filled{kept ? `, ${kept} kept as ${kept === 1 ? 'it is' : 'they are'} (shown faded)` : ''}.</p>
          </div>
        )}

        <button className="btn-primary w-full py-3" disabled={willChange === 0} onClick={apply}>{pattern.length === 0 ? 'Build a pattern first' : willChange === 0 ? 'Nothing to fill' : `Fill ${willChange} ${willChange === 1 ? 'day' : 'days'}`}</button>
      </div>
    </Modal>
  )
}

export default function Shifts() {
  const days = useStore((s) => s.days)
  const setShift = useStore((s) => s.setShift)
  const setShiftHours = useStore((s) => s.setShiftHours)
  const [fillOpen, setFillOpen] = useState(false)
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
      <PageHeader title="Shift Tracker" emoji="🕑" sub="Fill in your schedule once, then change any single day with a tap." action={<button className="btn-primary whitespace-nowrap" onClick={() => setFillOpen(true)}><CalendarRange size={16} /> Fill in</button>} />
      <ScheduleFill key={fillOpen ? 'open' : 'closed'} open={fillOpen} onClose={() => setFillOpen(false)} />
      <Card>
        <div className="flex items-center justify-between mb-3">
          <button className="btn-soft !py-1.5" onClick={() => setOffset(offset - 1)}>← Earlier</button>
          <div className="text-sm font-semibold">{formatDate(range[0], { month: 'short', day: 'numeric' })} – {formatDate(range[13], { month: 'short', day: 'numeric' })}</div>
          <button className="btn-soft !py-1.5" onClick={() => setOffset(offset + 1)}>Later →</button>
        </div>
        <div className="space-y-1.5">
          {range.map((date) => {
            const sh = days[date]?.shift
            const hrs = days[date]?.hours ?? DEFAULT_ELECTIVE
            return (
              <div key={date} className={clsx('rounded-2xl p-2', date === today && 'bg-lavender-50 dark:bg-lavender-500/10 ring-1 ring-lavender-300')}>
              <div className="flex items-center gap-2">
                <div className="w-20 shrink-0 text-xs"><div className="font-semibold">{formatDate(date, { weekday: 'short' })}</div><div className="text-muted">{formatDate(date, { month: 'short', day: 'numeric' })}</div></div>
                <div className="flex-1 grid grid-cols-5 gap-1">
                  {SHIFTS.map((s) => <button key={s.id} onClick={() => setShift(date, sh === s.id ? undefined : s.id)} className={clsx('rounded-xl py-1.5 text-xs font-medium transition', sh === s.id ? 'bg-gradient-to-r from-lavender-500 to-blush-400 text-white shadow-glow' : 'bg-card-2 text-muted hover:text-ink')}>{s.emoji} <span className="hidden sm:inline">{s.short}</span></button>)}
                </div>
              </div>
              {sh === 'elective' && (
                <div className="mt-1.5 flex items-center justify-end gap-1.5 text-xs text-muted">
                  <input type="time" aria-label={`Elective start time on ${formatDate(date)}`} className="input !py-1 !px-2 !text-xs !w-32" value={hrs.start} onChange={(e) => e.target.value && setShiftHours(date, { ...hrs, start: e.target.value })} />
                  <span>to</span>
                  <input type="time" aria-label={`Elective end time on ${formatDate(date)}`} className="input !py-1 !px-2 !text-xs !w-32" value={hrs.end} onChange={(e) => e.target.value && setShiftHours(date, { ...hrs, end: e.target.value })} />
                </div>
              )}
              </div>
            )
          })}
        </div>
        <div className="flex gap-3 mt-4 text-xs text-muted flex-wrap">{SHIFTS.map((s) => <span key={s.id}>{s.emoji} {s.label}: <b className="text-ink">{counts[s.id] || 0}</b></span>)}</div>
      </Card>

      <section>
        <SectionTitle sub={pushConfigured ? 'Your own reminder times, plus a nudge before each walk window.' : 'A visible schedule, plus a notification while the app is open.'} action={<button className="btn-soft !py-1.5" onClick={() => setEdit({ id: `r${Date.now()}`, label: 'Walk time', time: '09:00', shifts: [], enabled: true })}><Plus size={14} /> Add</button>}>Workout reminders</SectionTitle>
        <Card className="space-y-3">
          {pushConfigured && <PushPanel />}
          <div className={clsx('flex items-center justify-between gap-3 rounded-2xl bg-card-2 p-3 text-sm', pushConfigured && 'hidden')}>
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
          <p className="text-xs text-muted">Each reminder fires on days whose shift matches. If a day has no shift, every enabled reminder fires. {pushConfigured ? 'Changes reach your phone within a few seconds while you’re online.' : 'Install the app from your browser menu for the best experience.'}</p>
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
