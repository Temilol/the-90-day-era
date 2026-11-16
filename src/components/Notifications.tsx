import { useState } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { ArrowRight, Bell, BellRing, Check, Plus, TriangleAlert } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { usePush, pushConfigured } from '@/store/push'
import { notificationsSupported, requestNotifications } from '@/lib/reminders'
import { pushSummary, clockLabel } from '@/lib/notifyText'
import { waterSettings } from '@/lib/water'
import { SHIFTS } from '@/components/DayPanel'
import { Card, Modal, SectionTitle } from './ui'
import { Toggle } from './Toggle'
import type { Reminder, ShiftType } from '@/lib/types'

const EXPLAIN: Record<string, string> = {
  'needs-install': 'On an iPhone, add the app to your Home Screen first: in Safari tap Share, then “Add to Home Screen”. Open it from the new icon and come back here.',
  unsupported: 'This browser can’t receive reminders while the app is closed.',
  blocked: 'Notifications are blocked for this app. Allow them in your phone or browser settings, then come back here.',
  off: 'Turn this on to get your reminders even when the app is closed.',
  on: 'Reminders arrive even when the app is closed.',
}

/** Everything that sends a reminder: the switch for this phone, the automatic nudges, and her own times. */
export function NotificationSettings() {
  const status = usePush((s) => s.status)
  const busy = usePush((s) => s.busy)
  const message = usePush((s) => s.message)
  const enable = usePush((s) => s.enable)
  const disable = usePush((s) => s.disable)
  const test = usePush((s) => s.test)
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const reminders = useStore((s) => s.reminders)
  const upsert = useStore((s) => s.upsertReminder)
  const remove = useStore((s) => s.removeReminder)
  const [edit, setEdit] = useState<Reminder | null>(null)
  const [perm, setPerm] = useState<string>(notificationsSupported() ? Notification.permission : 'unsupported')
  const walkReminders = profile.walkReminders !== false
  const nudges = waterSettings(profile).nudges
  const isNew = !!edit && !reminders.some((r) => r.id === edit.id)
  const canSwitch = status === 'on' || status === 'off'

  return (
    <div className="space-y-6">
      <section>
        <Card className="space-y-3">
          {pushConfigured ? (
            <>
              <div className="flex items-center gap-3">
                <BellRing size={18} className={clsx('shrink-0', status === 'on' ? 'text-lavender-500' : 'text-muted')} />
                <div className="flex-1 min-w-0 text-sm">
                  <div className="font-semibold">Reminders on this phone</div>
                  <div className="text-xs text-muted">{status === 'signed-out' ? <>Sign in under <Link to="/settings/account" className="underline font-medium text-lavender-600 dark:text-lavender-300">Account</Link> to get reminders with the app closed.</> : EXPLAIN[status]}</div>
                </div>
                {canSwitch && <Toggle on={status === 'on'} disabled={busy} onChange={() => void (status === 'on' ? disable() : enable())} label="Reminders on this phone" />}
              </div>
              {status === 'on' && <button className="btn-soft w-full" disabled={busy} onClick={() => void test()}>{busy ? 'Working…' : 'Send a test'}</button>}
              {message && <div role="status" className="text-xs text-lavender-600 dark:text-lavender-300">{message}</div>}
            </>
          ) : (
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-0"><Bell size={16} className="text-lavender-500 shrink-0" /><span>Notifications: <b>{perm === 'granted' ? 'on' : perm === 'denied' ? 'blocked in browser settings' : perm === 'unsupported' ? 'not supported here' : 'not enabled'}</b></span></div>
              {perm === 'default' && <button className="btn-primary !py-1.5 shrink-0" onClick={async () => setPerm(await requestNotifications())}>Enable</button>}
            </div>
          )}
        </Card>
      </section>

      {pushConfigured && (
        <section>
          <SectionTitle sub={status === 'on' ? undefined : 'These are sent once reminders are on for this phone.'}>Automatic</SectionTitle>
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0"><div className="font-semibold">Before each walk window</div><div className="text-xs text-muted">A nudge 15 minutes before the times in your walk plan. Skipped once you’ve walked or rested.</div></div>
              <Toggle on={walkReminders} onChange={() => setProfile({ walkReminders: !walkReminders })} label="Remind me before each walk window" />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0"><div className="font-semibold">Hydration nudges</div><div className="text-xs text-muted">Up to two a day, only when you’re behind your water goal.</div></div>
              <Toggle on={nudges} onChange={() => setProfile({ waterNudges: !nudges })} label="Hydration nudges" />
            </div>
          </Card>
        </section>
      )}

      <section>
        <SectionTitle sub="Your own times, for the kinds of day you choose.">Your reminders</SectionTitle>
        <Card className="space-y-3">
          {reminders.length === 0 && <p className="text-sm text-muted">None yet. Add one for a time that suits a kind of day, like 4 PM before a night shift.</p>}
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <button className="flex-1 min-w-0 text-left" onClick={() => setEdit(r)} aria-label={`Edit ${r.label}`}>
                <div className="font-medium text-sm"><span className="gradient-text font-bold">{clockLabel(r.time)}</span> · {r.label}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(r.shifts.length ? r.shifts.map((s) => SHIFTS.find((x) => x.id === s)?.label ?? s) : ['Every day']).map((t) => <span key={t} className="chip bg-lavender-100 text-lavender-700 dark:bg-lavender-500/20 dark:text-lavender-200">{t}</span>)}
                </div>
              </button>
              <Toggle on={r.enabled} onChange={() => upsert({ ...r, enabled: !r.enabled })} label={`${r.label} reminder`} />
            </div>
          ))}
          <button className="btn-soft w-full" onClick={() => setEdit({ id: `r${Date.now()}`, label: 'Walk time', time: '09:00', shifts: [], enabled: true })}><Plus size={14} /> Add a reminder</button>
          <p className="text-xs text-muted">A reminder is sent on days whose shift matches. On a day with no shift set, every reminder that is on is sent.{pushConfigured ? ' Changes reach your phone within a few seconds while you’re online.' : ''}</p>
        </Card>
      </section>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={isNew ? 'New reminder' : 'Reminder'}>
        {edit && (
          <div className="space-y-3">
            <div><label className="label">Name</label><input className="input" value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} /></div>
            <div><label className="label">Time</label><input type="time" className="input" value={edit.time} onChange={(e) => setEdit({ ...edit, time: e.target.value })} /></div>
            <div><label className="label">Only on these kinds of day (none = every day)</label>
              <div className="grid grid-cols-2 gap-2">{SHIFTS.map((s) => { const on = edit.shifts.includes(s.id); return <button key={s.id} onClick={() => setEdit({ ...edit, shifts: on ? edit.shifts.filter((x) => x !== s.id) : [...edit.shifts, s.id as ShiftType] })} className={on ? 'btn-primary !py-2' : 'btn-soft !py-2'}>{s.emoji} {s.label}</button> })}</div>
            </div>
            <button className="btn-primary w-full" disabled={!edit.time} onClick={() => { upsert({ ...edit, label: edit.label.trim() || 'Reminder' }); setEdit(null) }}>Save reminder</button>
            {!isNew && <button className="btn-ghost w-full text-sm text-rose-500" onClick={() => { remove(edit.id); setEdit(null) }}>Delete reminder</button>}
          </div>
        )}
      </Modal>
    </div>
  )
}

/** On the Shift Tracker: what reminders can do for her shifts, and the way to them. */
export function ReminderInvite() {
  const status = usePush((s) => s.status)
  const count = useStore((s) => s.reminders.filter((r) => r.enabled).length)
  const summary = pushSummary(status)
  const set = count === 0 ? 'No reminders of your own yet' : `${count} ${count === 1 ? 'reminder' : 'reminders'} set`
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="size-11 shrink-0 rounded-2xl grid place-items-center bg-lavender-100 dark:bg-lavender-500/20 text-lavender-600 dark:text-lavender-200"><Bell size={20} /></span>
        <div className="min-w-0">
          <div className="font-semibold">Reminders that fit your shifts</div>
          <p className="text-sm text-muted mt-0.5">Set a walk reminder for each kind of day, like 4 PM before a night shift or 7 AM on a day off.</p>
        </div>
      </div>
      <div className={clsx('mt-3 text-sm flex items-start gap-2', summary.ok ? 'text-muted' : 'text-amber-600 dark:text-amber-300 font-medium')}>
        {summary.ok ? <Check size={16} className="shrink-0 mt-0.5 text-lavender-500" /> : <TriangleAlert size={16} className="shrink-0 mt-0.5" />}
        <span className="min-w-0">{summary.ok ? `${set} · ${summary.text}` : `Reminders: ${summary.text.charAt(0).toLowerCase()}${summary.text.slice(1)}`}</span>
      </div>
      <Link to="/settings/notifications" className="btn-primary w-full mt-4">{count === 0 ? 'Set up reminders' : 'Manage reminders'} <ArrowRight size={16} /></Link>
    </Card>
  )
}
