import { useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { useStore, exportJson } from '@/store/useStore'
import { useUi, type Theme } from '@/store/ui'
import { useStats } from '@/lib/hooks'
import { todayKey, addDays, formatDate } from '@/lib/dates'
import { resetTimes } from '@/lib/dayReset'
import { ResetSelect } from '@/components/DayReset'
import { PageHeader, Card, SectionTitle, Modal, confirmDialog } from '@/components/ui'
import { Download, Upload, Moon, Sun, Monitor, Vibrate, EyeOff, Images, ChevronRight, ChevronLeft, UserRound, Bell, Target, Clock, Palette, ShieldCheck, type LucideIcon } from 'lucide-react'
import { downloadAllPhotos } from '@/store/photos'
import { waterSettings, fromMl, toMl, convertWaterSettings, type WaterUnit } from '@/lib/water'
import { usePush } from '@/store/push'
import { pushSummary } from '@/lib/notifyText'
import { clock } from '@/lib/walkPlan'
import { NotificationSettings } from '@/components/Notifications'
import { stepGoalOf } from '@/lib/xp'
import { hapticsSupported, tap } from '@/lib/haptics'
import { AccountPanel } from '@/components/Account'
import { useSync, syncConfigured, hasLocalBackup, localBackupJson } from '@/store/sync'

function useSettings() {
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const importData = useStore((s) => s.importData)
  const resetAll = useStore((s) => s.resetAll)
  const theme = useUi((s) => s.theme)
  const setTheme = useUi((s) => s.setTheme)
  const haptics = useUi((s) => s.haptics)
  const setHaptics = useUi((s) => s.setHaptics)
  const blurPhotos = useUi((s) => s.blurPhotos)
  const setBlurPhotos = useUi((s) => s.setBlurPhotos)
  const photoCount = useStore((s) => s.photos.length)
  const [zipping, setZipping] = useState(false)
  const savePhotos = async () => {
    setZipping(true); setMsg(null)
    const r = await downloadAllPhotos().catch(() => null)
    setZipping(false)
    setMsg(!r || r.saved === 0 ? 'Your photos couldn’t be fetched. Check your connection and try again.' : r.missed ? `Saved ${r.saved} ${r.saved === 1 ? 'photo' : 'photos'}. ${r.missed} couldn’t be fetched right now.` : `Saved ${r.saved} ${r.saved === 1 ? 'photo' : 'photos'}.`)
  }
  const stats = useStats()
  const ws = waterSettings(profile)
  const reset = resetTimes(profile)
  const [goalText, setGoalText] = useState(String(fromMl(ws.goalMl, ws.unit)))
  const [bottleText, setBottleText] = useState(String(fromMl(ws.bottleMl, ws.unit)))
  const [stepText, setStepText] = useState(String(stepGoalOf(profile)))
  const switchWaterUnit = (u: WaterUnit) => {
    if (u === ws.unit) return
    const next = convertWaterSettings(profile, u)
    setProfile(next)
    setGoalText(String(fromMl(next.waterGoal!, u))); setBottleText(String(fromMl(next.waterBottle!, u)))
  }
  const saveWater = (field: 'waterGoal' | 'waterBottle', text: string) => { const v = parseFloat(text); if (v > 0) setProfile({ [field]: toMl(v, ws.unit) }) }
  const [name, setName] = useState(profile.name)
  const [start, setStart] = useState(profile.startDate ?? todayKey())
  const [resetOpen, setResetOpen] = useState(false)
  const [resetText, setResetText] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const hasLogs = stats.daysLogged > 0 || stats.lifetimeXp > 0
  const signedIn = useSync((s) => !!s.userId)
  const backupAt = hasLocalBackup()
  const downloadBackup = () => {
    const json = localBackupJson(); if (!json) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = '90-day-era-device-backup.json'; a.click()
    URL.revokeObjectURL(a.href)
  }

  const doExport = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `90-day-era-${todayKey()}.json`; a.click()
    URL.revokeObjectURL(a.href)
  }
  const doImport = async (f: File) => {
    const text = await f.text()
    if (!(await confirmDialog('Importing replaces everything currently saved on this device. Continue?', { confirmLabel: 'Import', danger: true }))) return
    const r = importData(text)
    setMsg(r.ok ? 'Import complete.' : r.error || 'Import failed.')
    if (r.ok) { setName(useStore.getState().profile.name); setStart(useStore.getState().profile.startDate ?? todayKey()) }
  }

  return { profile, setProfile, theme, setTheme, haptics, setHaptics, blurPhotos, setBlurPhotos, photoCount, zipping, savePhotos, stats, ws, reset, goalText, setGoalText, bottleText, setBottleText, stepText, setStepText, switchWaterUnit, saveWater, name, setName, start, setStart, resetOpen, setResetOpen, resetText, setResetText, msg, fileRef, hasLogs, signedIn, backupAt, downloadBackup, doExport, doImport, resetAll }
}

type SectionId = 'account' | 'notifications' | 'goals' | 'day-reset' | 'appearance' | 'data'
const SECTIONS: { id: SectionId; title: string; emoji: string; icon: LucideIcon }[] = [
  { id: 'account', title: 'Account', emoji: '👤', icon: UserRound },
  { id: 'notifications', title: 'Notifications', emoji: '🔔', icon: Bell },
  { id: 'goals', title: 'Goals', emoji: '🎯', icon: Target },
  { id: 'day-reset', title: 'Day reset', emoji: '🕛', icon: Clock },
  { id: 'appearance', title: 'Appearance', emoji: '🎨', icon: Palette },
  { id: 'data', title: 'Data and privacy', emoji: '🔒', icon: ShieldCheck },
]

export default function SettingsPage() {
  const { section } = useParams()
  const v = useSettings()
  const { profile, setProfile, theme, setTheme, haptics, setHaptics, blurPhotos, setBlurPhotos, photoCount, zipping, savePhotos, stats, ws, reset, goalText, setGoalText, bottleText, setBottleText, stepText, setStepText, switchWaterUnit, saveWater, name, setName, start, setStart, resetOpen, setResetOpen, resetText, setResetText, msg, fileRef, hasLogs, signedIn, backupAt, downloadBackup, doExport, doImport, resetAll } = v
  const pushStatus = usePush((s) => s.status)
  const push = pushSummary(pushStatus)

  const current = SECTIONS.find((s) => s.id === section)
  if (section && !current) return <Navigate to="/settings" replace />

  if (!current) {
    // What each row is set to right now, so most answers are visible without opening anything.
    const summary: Record<SectionId, string> = {
      account: [syncConfigured ? (signedIn ? 'Signed in' : 'Not signed in') : profile.name || 'Your name', profile.startDate ? `Day 1 was ${formatDate(profile.startDate, { month: 'short', day: 'numeric' })}` : 'No start date'].join(' · '),
      notifications: push.text,
      goals: `${fromMl(ws.goalMl, ws.unit)} ${ws.unit} water · ${stepGoalOf(profile).toLocaleString()} steps`,
      'day-reset': reset.night === reset.day ? `${clock(reset.day)} every day` : `${clock(reset.day)} · ${clock(reset.night)} after a night shift`,
      appearance: `${theme === 'system' ? 'Follows your phone' : theme === 'dark' ? 'Dark' : 'Light'} · haptics ${haptics ? 'on' : 'off'}`,
      data: 'Backup, photos, reset',
    }
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" emoji="⚙️" />
        <Card className="!p-0 overflow-hidden divide-y divide-line">
          {SECTIONS.map((s) => (
            <Link key={s.id} to={`/settings/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-card-2 transition">
              <span className="size-10 shrink-0 rounded-2xl grid place-items-center bg-lavender-100 dark:bg-lavender-500/20 text-lavender-600 dark:text-lavender-200"><s.icon size={18} /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{s.title}</span>
                <span className={clsx('block text-xs', s.id === 'notifications' && !push.ok ? 'text-amber-600 dark:text-amber-300 font-medium' : 'text-muted')}>{summary[s.id]}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-muted" />
            </Link>
          ))}
        </Card>
        <div className="text-center text-xs text-muted pt-4">The 90-Day Era · v1.0 · Incline 12 · 3 mph · 30 min 💗</div>
      </div>
    )
  }

  const screens: Record<SectionId, ReactNode> = {
    account: (
      <>
      <section>
        <SectionTitle sub={syncConfigured ? 'Sign in to back up your progress and keep your phone and computer in step.' : undefined}>Account & sync</SectionTitle>
        <Card>
          <AccountPanel />
          {backupAt && <button className="text-xs text-muted underline mt-3" onClick={downloadBackup}>Download this device’s replaced copy from {new Date(backupAt).toLocaleString()}</button>}
        </Card>
      </section>

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
          <div className="flex gap-2"><input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} /><button className="btn-primary" disabled={start === profile.startDate} onClick={async () => { if (!hasLogs || await confirmDialog('Change start date? Existing logs stay on their calendar dates but their Day numbers will shift.', { confirmLabel: 'Change it' })) setProfile({ startDate: start }) }}>Set</button></div>
          <div className="text-xs text-muted mt-2">Day 1: {formatDate(start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · Day 90: {formatDate(addDays(start, 89), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </Card>
      </section>
      </>
    ),
    notifications: <NotificationSettings />,
    goals: (
      <>
      <section>
        <SectionTitle sub="The hydration quest ticks itself when the day’s water reaches your goal.">Hydration</SectionTitle>
        <Card className="space-y-4">
          <div>
            <label className="label">Units</label>
            <div className="grid grid-cols-2 gap-2">{(['oz', 'ml'] as const).map((u) => <button key={u} className={ws.unit === u ? 'btn-primary' : 'btn-soft'} onClick={() => switchWaterUnit(u)}>{u === 'oz' ? 'Ounces (oz)' : 'Millilitres (ml)'}</button>)}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Daily goal ({ws.unit})</label><input type="number" inputMode="decimal" min={1} className="input" aria-label={`Daily water goal in ${ws.unit}`} value={goalText} onChange={(e) => { setGoalText(e.target.value); saveWater('waterGoal', e.target.value) }} /></div>
            <div><label className="label">My bottle ({ws.unit})</label><input type="number" inputMode="decimal" min={1} className="input" aria-label={`Bottle size in ${ws.unit}`} value={bottleText} onChange={(e) => { setBottleText(e.target.value); saveWater('waterBottle', e.target.value) }} /></div>
          </div>
          <p className="text-xs text-muted">A new goal applies from your next drink. Days already completed stay as they are.</p>
        </Card>
      </section>

      <section>
        <SectionTitle sub="Typed in from your watch or phone. Tracked for your stats, with no XP.">Steps</SectionTitle>
        <Card>
          <label className="label">Daily step goal</label>
          <input type="number" inputMode="numeric" min={1} className="input" aria-label="Daily step goal" value={stepText} onChange={(e) => { setStepText(e.target.value); const v = parseFloat(e.target.value); if (v > 0) setProfile({ stepGoal: Math.round(v) }) }} />
          <p className="text-xs text-muted mt-2">Changing it re-counts how many days reached the goal, including earlier days.</p>
        </Card>
      </section>
      </>
    ),
    'day-reset': (
      <>
      <section>
        <SectionTitle sub="Water, quests, steps and walks all start fresh at this time.">When your day resets</SectionTitle>
        <Card className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Most days</label><ResetSelect name="Reset time on most days" value={reset.day} onChange={(m) => setProfile({ dayReset: m, nightReset: reset.night, resetAsked: true })} /></div>
            <div><label className="label">After a night shift</label><ResetSelect name="Reset time after a night shift" value={reset.night} onChange={(m) => setProfile({ nightReset: m, resetAsked: true })} /></div>
          </div>
          <p className="text-xs text-muted">A later time after a night shift keeps the whole shift on one day, so a drink at 3 AM still counts toward the day the shift started. Changes apply from now on. Days already logged stay as they are.</p>
        </Card>
      </section>
      </>
    ),
    appearance: (
      <>
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
        <SectionTitle>Touch</SectionTitle>
        <Card className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm"><Vibrate size={18} className="text-lavender-500" /><div><div className="font-semibold">Haptic taps</div><div className="text-xs text-muted">{hapticsSupported() ? 'A short buzz when you complete quests and workouts.' : 'Not supported on this device or browser. iPhones only buzz in installed apps on recent iOS.'}</div></div></div>
          <button role="switch" aria-checked={haptics} onClick={() => { const on = !haptics; setHaptics(on); if (on) setTimeout(() => tap(), 0) }} className={clsx('w-11 h-6 rounded-full relative transition shrink-0', haptics ? 'bg-gradient-to-r from-lavender-500 to-blush-400' : 'bg-line')}><span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition', haptics ? 'left-5.5' : 'left-0.5')} /></button>
        </Card>
      </section>
      </>
    ),
    data: (
      <>
      <section>
        <SectionTitle>Privacy</SectionTitle>
        <Card className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm"><EyeOff size={18} className="text-lavender-500" /><div><div className="font-semibold">Blur progress photos</div><div className="text-xs text-muted">Photos stay blurred in lists until you tap one, in case someone glances at your screen.</div></div></div>
          <button role="switch" aria-checked={blurPhotos} aria-label="Blur progress photos" onClick={() => setBlurPhotos(!blurPhotos)} className={clsx('w-11 h-6 rounded-full relative transition shrink-0', blurPhotos ? 'bg-gradient-to-r from-lavender-500 to-blush-400' : 'bg-line')}><span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition', blurPhotos ? 'left-5.5' : 'left-0.5')} /></button>
        </Card>
      </section>

      <section>
        <SectionTitle sub={signedIn ? 'Synced to your account. Export gives you an extra copy you hold yourself.' : 'Everything lives in this browser. Export regularly, or to move to another device.'}>Your data</SectionTitle>
        <Card className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-2">
            <button className="btn-soft py-3" onClick={doExport}><Download size={16} /> Export backup (.json)</button>
            <button className="btn-soft py-3" onClick={() => fileRef.current?.click()}><Upload size={16} /> Import backup</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = '' }} />
          </div>
          {photoCount > 0 && <button className="btn-soft py-3 w-full" disabled={zipping} onClick={() => void savePhotos()}><Images size={16} /> {zipping ? 'Gathering photos…' : `Download my photos (${photoCount}, .zip)`}</button>}
          {photoCount > 0 && <div className="text-xs text-muted">The backup file holds your logs but not your photos. Download those separately.</div>}
          {msg && <div className="text-sm text-lavender-600 dark:text-lavender-300">{msg}</div>}
          <div className="text-xs text-muted">{stats.daysLogged} active days · {stats.lifetimeXp} lifetime XP · {Object.keys(useStore.getState().badges).length} badges</div>
        </Card>
      </section>

      <section>
        <SectionTitle>Danger zone</SectionTitle>
        <Card className="flex items-center justify-between gap-3">
          <div className="text-sm"><div className="font-semibold">Reset everything</div><div className="text-muted text-xs">{signedIn ? 'Deletes all logs, XP, badges, rewards, and photos on every synced device and in the cloud. Export first.' : 'Deletes all logs, XP, badges, rewards, and photos on this device. Export first.'}</div></div>
          <button className="btn-danger" onClick={() => { setResetText(''); setResetOpen(true) }}>Reset</button>
        </Card>
      </section>
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset everything?">
        <p className="text-sm text-muted">This cannot be undone. Type <b className="text-ink">RESET</b> to confirm.</p>
        <input className="input mt-3" value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder="RESET" />
        <div className="flex gap-2 mt-4"><button className="btn-soft flex-1" onClick={() => setResetOpen(false)}>Keep my data</button><button className="btn-danger flex-1" disabled={resetText !== 'RESET'} onClick={() => { resetAll(); setResetOpen(false) }}>Delete it all</button></div>
      </Modal>
      </>
    ),
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/settings" className="inline-flex items-center gap-1 text-sm font-medium text-lavender-600 dark:text-lavender-300 -ml-1 mb-2"><ChevronLeft size={16} /> Settings</Link>
        <PageHeader title={current.title} emoji={current.emoji} />
      </div>
      {screens[current.id]}
    </div>
  )
}
