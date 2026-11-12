import { useRef, useState } from 'react'
import { clsx } from 'clsx'
import { useStore, exportJson } from '@/store/useStore'
import { useUi, type Theme } from '@/store/ui'
import { useStats } from '@/lib/hooks'
import { todayKey, addDays, formatDate } from '@/lib/dates'
import { PageHeader, Card, SectionTitle, Modal } from '@/components/ui'
import { Download, Upload, Moon, Sun, Monitor } from 'lucide-react'

export default function SettingsPage() {
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const importData = useStore((s) => s.importData)
  const resetAll = useStore((s) => s.resetAll)
  const theme = useUi((s) => s.theme)
  const setTheme = useUi((s) => s.setTheme)
  const stats = useStats()
  const [name, setName] = useState(profile.name)
  const [start, setStart] = useState(profile.startDate ?? todayKey())
  const [resetOpen, setResetOpen] = useState(false)
  const [resetText, setResetText] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const hasLogs = stats.daysLogged > 0 || stats.lifetimeXp > 0

  const doExport = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `90-day-era-${todayKey()}.json`; a.click()
    URL.revokeObjectURL(a.href)
  }
  const doImport = async (f: File) => {
    const text = await f.text()
    if (!confirm('Importing replaces everything currently saved on this device. Continue?')) return
    const r = importData(text)
    setMsg(r.ok ? 'Import complete.' : r.error || 'Import failed.')
    if (r.ok) { setName(useStore.getState().profile.name); setStart(useStore.getState().profile.startDate ?? todayKey()) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" emoji="⚙️" />
      <section>
        <SectionTitle>Profile</SectionTitle>
        <Card className="space-y-4">
          <div><label className="label">Name</label><div className="flex gap-2"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn-soft" disabled={name.trim() === profile.name} onClick={() => setProfile({ name: name.trim() })}>Save</button></div></div>
          <div>
            <label className="label">Weight units</label>
            <div className="grid grid-cols-2 gap-2">{(['lb', 'kg'] as const).map((u) => <button key={u} className={profile.units === u ? 'btn-primary' : 'btn-soft'} onClick={() => setProfile({ units: u })}>{u}</button>)}</div>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle sub={hasLogs ? 'You have logged days. Changing the start date shifts which calendar day each log belongs to, so only do this if Day 1 was set wrong.' : 'Change freely until you log your first day.'}>Challenge start date</SectionTitle>
        <Card>
          <div className="flex gap-2"><input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} /><button className="btn-primary" disabled={start === profile.startDate} onClick={() => { if (!hasLogs || confirm('Change start date? Existing logs stay on their calendar dates but their Day numbers will shift.')) setProfile({ startDate: start }) }}>Set</button></div>
          <div className="text-xs text-muted mt-2">Day 1: {formatDate(start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · Day 90: {formatDate(addDays(start, 89), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </Card>
      </section>

      <section>
        <SectionTitle>Appearance</SectionTitle>
        <Card>
          <div className="grid grid-cols-3 gap-2">
            {([['system', 'System', Monitor], ['light', 'Light', Sun], ['dark', 'Dark', Moon]] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setTheme(id as Theme)} className={clsx('rounded-2xl border p-3 flex flex-col items-center gap-1 text-sm font-medium transition', theme === id ? 'border-lavender-400 bg-lavender-50 dark:bg-lavender-500/15 shadow-glow' : 'border-line bg-card-2')}><Icon size={18} />{label}</button>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle sub="Everything lives in this browser. Export regularly, or to move to another device.">Your data</SectionTitle>
        <Card className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-2">
            <button className="btn-soft py-3" onClick={doExport}><Download size={16} /> Export backup (.json)</button>
            <button className="btn-soft py-3" onClick={() => fileRef.current?.click()}><Upload size={16} /> Import backup</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = '' }} />
          </div>
          {msg && <div className="text-sm text-lavender-600 dark:text-lavender-300">{msg}</div>}
          <div className="text-xs text-muted">{stats.daysLogged} active days · {stats.lifetimeXp} lifetime XP · {Object.keys(useStore.getState().badges).length} badges</div>
        </Card>
      </section>

      <section>
        <SectionTitle>Danger zone</SectionTitle>
        <Card className="flex items-center justify-between gap-3">
          <div className="text-sm"><div className="font-semibold">Reset everything</div><div className="text-muted text-xs">Deletes all logs, XP, badges, and rewards on this device. Export first.</div></div>
          <button className="btn-danger" onClick={() => { setResetText(''); setResetOpen(true) }}>Reset</button>
        </Card>
      </section>

      <div className="text-center text-xs text-muted pt-4">The 90-Day Era · v1.0 · Incline 12 · 3 mph · 30 min 💗</div>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset everything?">
        <p className="text-sm text-muted">This cannot be undone. Type <b className="text-ink">RESET</b> to confirm.</p>
        <input className="input mt-3" value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder="RESET" />
        <div className="flex gap-2 mt-4"><button className="btn-soft flex-1" onClick={() => setResetOpen(false)}>Keep my data</button><button className="btn-danger flex-1" disabled={resetText !== 'RESET'} onClick={() => { resetAll(); setResetOpen(false) }}>Delete it all</button></div>
      </Modal>
    </div>
  )
}
