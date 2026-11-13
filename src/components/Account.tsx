import { useState } from 'react'
import { clsx } from 'clsx'
import { Cloud, CloudOff, RefreshCw, LogOut, Check, TriangleAlert } from 'lucide-react'
import { useSync, syncConfigured, type Conflict } from '@/store/sync'
import { useStore } from '@/store/useStore'
import { computeStats } from '@/lib/stats'
import { Modal } from './ui'
import type { EraState } from '@/lib/types'

type Mode = 'signin' | 'signup' | 'reset'

export function AccountPanel({ onSignedIn }: { onSignedIn?: () => void }) {
  const sync = useSync()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  if (!syncConfigured) {
    return <p className="text-sm text-muted">Cloud sync isn’t switched on for this copy of the app yet. Your data is saved on this device, and you can move it with Export and Import.</p>
  }
  if (!sync.ready) return <p className="text-sm text-muted">Checking your account…</p>

  if (sync.recovery) {
    return (
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await sync.setNewPassword(password); setBusy(false); setPassword(''); setMsg({ ok: r.ok, text: r.message || '' }) }}>
        <div className="font-semibold">Choose a new password</div>
        <input type="password" className="input" placeholder="New password (6+ characters)" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
        {msg && <div className={clsx('text-sm', msg.ok ? 'text-lavender-600 dark:text-lavender-300' : 'text-rose-500')}>{msg.text}</div>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
      </form>
    )
  }

  if (sync.userId) {
    const label: Record<string, string> = { syncing: 'Syncing…', synced: 'Everything is backed up', pending: sync.conflict ? 'Waiting for your choice' : 'Changes waiting to upload', offline: 'Offline. Will sync when you’re back', error: sync.error || 'Sync problem', 'signed-out': '' }
    const Icon = sync.status === 'synced' ? Check : sync.status === 'offline' ? CloudOff : sync.status === 'error' ? TriangleAlert : RefreshCw
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="size-10 rounded-full grid place-items-center bg-gradient-to-br from-lavender-400 to-blush-400 text-white shrink-0"><Cloud size={18} /></span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{sync.email}</div>
            <div className={clsx('text-xs flex items-center gap-1', sync.status === 'error' ? 'text-rose-500' : 'text-muted')}><Icon size={12} className={sync.status === 'syncing' ? 'animate-spin' : ''} />{label[sync.status]}</div>
          </div>
        </div>
        {sync.lastSyncedAt && <div className="text-xs text-muted">Last synced {new Date(sync.lastSyncedAt).toLocaleString()}</div>}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-soft" disabled={sync.status === 'syncing'} onClick={() => void sync.syncNow()}><RefreshCw size={15} /> Sync now</button>
          <button className="btn-ghost border border-line" onClick={() => { if (confirm('Sign out? Your data stays on this device and in the cloud.')) void sync.signOut() }}><LogOut size={15} /> Sign out</button>
        </div>
      </div>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const r = mode === 'signin' ? await sync.signIn(email, password) : mode === 'signup' ? await sync.signUp(email, password) : await sync.sendReset(email)
    setBusy(false)
    if (r.message) setMsg({ ok: r.ok, text: r.message })
    if (r.ok && mode !== 'reset') { setPassword(''); if (!r.message) onSignedIn?.() }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-card-2 p-1 text-sm font-semibold">
        {(['signin', 'signup'] as const).map((m) => <button type="button" key={m} onClick={() => { setMode(m); setMsg(null) }} className={clsx('rounded-full py-2 transition', mode === m ? 'bg-card shadow-soft text-ink' : 'text-muted')}>{m === 'signin' ? 'Sign in' : 'Create account'}</button>)}
      </div>
      <input type="email" className="input" placeholder="Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      {mode !== 'reset' && <input type="password" className="input" placeholder={mode === 'signup' ? 'Password (6+ characters)' : 'Password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />}
      {msg && <div className={clsx('text-sm', msg.ok ? 'text-lavender-600 dark:text-lavender-300' : 'text-rose-500')}>{msg.text}</div>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Email me a reset link'}</button>
      <div className="text-center text-xs">
        {mode === 'reset'
          ? <button type="button" className="text-muted underline" onClick={() => { setMode('signin'); setMsg(null) }}>Back to sign in</button>
          : <button type="button" className="text-muted underline" onClick={() => { setMode('reset'); setMsg(null) }}>Forgot password?</button>}
      </div>
      {mode === 'signup' && <p className="text-xs text-muted">Your account keeps your progress backed up and in step across your phone and computer.</p>}
    </form>
  )
}

function summary(data: EraState) {
  const s = computeStats(data)
  return { name: data.profile?.name || 'No name', days: s.daysLogged, xp: s.lifetimeXp, workouts: s.workouts }
}

/** Shown when this device and the cloud both hold data and one would overwrite the other. */
export function ConflictModal() {
  const conflict = useSync((s) => s.conflict)
  const resolve = useSync((s) => s.resolveConflict)
  const [busy, setBusy] = useState(false)
  if (!conflict) return null
  return <ConflictBody conflict={conflict} busy={busy} onPick={async (k) => { setBusy(true); await resolve(k); setBusy(false) }} />
}

function ConflictBody({ conflict, busy, onPick }: { conflict: Conflict; busy: boolean; onPick: (k: 'cloud' | 'device') => void }) {
  const local = summary(useStore.getState() as unknown as EraState)
  const remote = summary(conflict.remote)
  const Option = ({ title, sub, s, k }: { title: string; sub: string; s: ReturnType<typeof summary>; k: 'cloud' | 'device' }) => (
    <button disabled={busy} onClick={() => onPick(k)} className="w-full text-left rounded-2xl border border-line bg-card-2 p-4 hover:border-lavender-400 transition disabled:opacity-50">
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-muted">{sub}</div>
      <div className="text-sm mt-2">{s.name} · {s.days} active days · {s.workouts} walks · {s.xp} XP</div>
    </button>
  )
  return (
    <Modal open onClose={() => { /* a choice is required */ }} title="Which progress should we keep?">
      <p className="text-sm text-muted mb-4">This device and your cloud account both have progress, and they differ. Pick the one to keep everywhere. The other is replaced.</p>
      <div className="space-y-3">
        <Option k="cloud" title="Keep the cloud copy" sub={`Saved ${new Date(conflict.remoteUpdatedAt).toLocaleString()}. This device’s copy is kept as a backup in Settings.`} s={remote} />
        <Option k="device" title="Keep this device’s copy" sub="Overwrites what is in the cloud." s={local} />
      </div>
    </Modal>
  )
}
