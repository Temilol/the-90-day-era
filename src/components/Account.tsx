import { useState } from 'react'
import { clsx } from 'clsx'
import { Cloud, CloudOff, RefreshCw, LogOut, Check, TriangleAlert, Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react'
import { useSync, syncConfigured, type Conflict } from '@/store/sync'
import { useStore } from '@/store/useStore'
import { computeStats } from '@/lib/stats'
import { Modal } from './ui'
import type { EraState } from '@/lib/types'

type Mode = 'signin' | 'signup' | 'reset' | 'verify' | 'reset-code'

/** Password field with a show/hide toggle. */
export function PasswordInput({ value, onChange, placeholder, autoComplete }: { value: string; onChange: (v: string) => void; placeholder: string; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} className="input pr-12" placeholder={placeholder} autoComplete={autoComplete} minLength={6} required value={value} onChange={(e) => onChange(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="absolute right-1.5 top-1/2 -translate-y-1/2 size-9 grid place-items-center rounded-full text-muted hover:text-ink">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
    </div>
  )
}

function ChangePassword({ onDone }: { onDone: () => void }) {
  const change = useSync((s) => s.changePassword)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault()
      if (next === current) { setMsg({ ok: false, text: 'New password must be different from the current one.' }); return }
      setBusy(true); setMsg(null)
      const r = await change(current, next)
      setBusy(false); setMsg({ ok: r.ok, text: r.message || '' })
      if (r.ok) { setCurrent(''); setNext(''); setTimeout(onDone, 1200) }
    }}>
      <PasswordInput value={current} onChange={setCurrent} placeholder="Current password" autoComplete="current-password" />
      <PasswordInput value={next} onChange={setNext} placeholder="New password (6+ characters)" autoComplete="new-password" />
      {msg && <div className={clsx('text-sm', msg.ok ? 'text-lavender-600 dark:text-lavender-300' : 'text-rose-500')}>{msg.text}</div>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
      <p className="text-xs text-muted">Other devices stay signed in. Use the new password next time you sign in anywhere.</p>
    </form>
  )
}

function DeleteAccount({ onDone }: { onDone: () => void }) {
  const del = useSync((s) => s.deleteAccount)
  const email = useSync((s) => s.email)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">This permanently deletes the account <b className="text-ink">{email}</b> and the copy of your progress stored in the cloud. It cannot be undone.</p>
      <p className="text-sm text-muted">Progress saved on this device stays here, so you can keep using the app without an account. Other devices keep their own copy but stop syncing.</p>
      <p className="text-sm text-muted">Type <b className="text-ink">DELETE</b> to confirm.</p>
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="DELETE" autoCapitalize="characters" />
      {err && <div className="text-sm text-rose-500">{err}</div>}
      <div className="flex gap-2">
        <button className="btn-soft flex-1" onClick={onDone}>Keep my account</button>
        <button className="btn-danger flex-1" disabled={text !== 'DELETE' || busy} onClick={async () => { setBusy(true); setErr(null); const r = await del(); setBusy(false); if (r.ok) onDone(); else setErr(r.message || 'Could not delete the account.') }}>{busy ? 'Deleting…' : 'Delete account'}</button>
      </div>
    </div>
  )
}

export function AccountPanel({ onSignedIn }: { onSignedIn?: () => void }) {
  const sync = useSync()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [dialog, setDialog] = useState<'password' | 'delete' | null>(null)
  const [code, setCode] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState(0)

  if (!syncConfigured) {
    return <p className="text-sm text-muted">Cloud sync isn’t switched on for this copy of the app yet. Your data is saved on this device, and you can move it with Export and Import.</p>
  }
  if (!sync.ready) return <p className="text-sm text-muted">Checking your account…</p>

  if (sync.recovery) {
    return (
      <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await sync.setNewPassword(password); setBusy(false); setPassword(''); setMsg({ ok: r.ok, text: r.message || '' }) }}>
        <div className="font-semibold">Choose a new password</div>
        <PasswordInput value={password} onChange={setPassword} placeholder="New password (6+ characters)" autoComplete="new-password" />
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
        <div className="flex items-center justify-between pt-1 text-xs">
          <button className="inline-flex items-center gap-1.5 text-muted hover:text-ink font-medium" onClick={() => setDialog('password')}><KeyRound size={13} /> Change password</button>
          <button className="inline-flex items-center gap-1.5 text-rose-500 font-medium" onClick={() => setDialog('delete')}><Trash2 size={13} /> Delete account</button>
        </div>
        <Modal open={dialog === 'password'} onClose={() => setDialog(null)} title="Change password"><ChangePassword onDone={() => setDialog(null)} /></Modal>
        <Modal open={dialog === 'delete'} onClose={() => setDialog(null)} title="Delete account?"><DeleteAccount onDone={() => setDialog(null)} /></Modal>
      </div>
    )
  }

  const clean = code.replace(/\D/g, '')
  const go = (m: Mode) => { setMode(m); setMsg(null); setCode('') }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const r = mode === 'signin' ? await sync.signIn(email, password)
      : mode === 'signup' ? await sync.signUp(email, password)
      : mode === 'reset' ? await sync.sendReset(email)
      : mode === 'verify' ? await sync.verifySignup(email, clean)
      : await sync.resetWithCode(email, clean, password)
    setBusy(false)
    if (r.step === 'code') {
      setCode(''); setCooldownUntil(Date.now() + 60_000)
      setMode(mode === 'reset' ? 'reset-code' : 'verify')
      if (mode === 'reset') setPassword('')
      setMsg(r.message ? { ok: true, text: r.message } : null)
      return
    }
    if (r.message) setMsg({ ok: r.ok, text: r.message })
    if (r.ok) { setPassword(''); setCode(''); onSignedIn?.() }
  }

  const resend = async () => {
    if (Date.now() < cooldownUntil) { setMsg({ ok: false, text: 'Give it a minute before asking for another code.' }); return }
    setBusy(true)
    const r = await sync.resendCode(email, mode === 'verify' ? 'signup' : 'reset')
    setBusy(false)
    if (r.ok) setCooldownUntil(Date.now() + 60_000)
    setMsg({ ok: r.ok, text: r.message || '' })
  }

  const message = msg && <div role="status" className={clsx('text-sm', msg.ok ? 'text-lavender-600 dark:text-lavender-300' : 'text-rose-500')}>{msg.text}</div>

  if (mode === 'verify' || mode === 'reset-code') {
    return (
      <form className="space-y-3" onSubmit={submit}>
        <div>
          <div className="font-semibold">{mode === 'verify' ? 'Enter your confirmation code' : 'Reset your password'}</div>
          <p className="text-sm text-muted mt-0.5">We emailed a code to <b className="text-ink break-all">{email}</b>. It can take a minute, and may land in spam.</p>
        </div>
        <input className="input text-center text-2xl tracking-[0.3em] font-semibold" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={12} placeholder="••••••" aria-label="Code from your email" required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9 ]/g, ''))} />
        {mode === 'reset-code' && <PasswordInput value={password} onChange={setPassword} placeholder="New password (6+ characters)" autoComplete="new-password" />}
        {message}
        <button className="btn-primary w-full" disabled={busy || clean.length < 6}>{busy ? 'One moment…' : mode === 'verify' ? 'Confirm and sign in' : 'Set new password'}</button>
        <div className="flex items-center justify-between text-xs">
          <button type="button" className="text-muted underline" onClick={() => go('signin')}>Back to sign in</button>
          <button type="button" className="text-muted underline" disabled={busy} onClick={() => void resend()}>Send a new code</button>
        </div>
      </form>
    )
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-card-2 p-1 text-sm font-semibold">
        {(['signin', 'signup'] as const).map((m) => <button type="button" key={m} onClick={() => go(m)} className={clsx('rounded-full py-2 transition', mode === m ? 'bg-card shadow-soft text-ink' : 'text-muted')}>{m === 'signin' ? 'Sign in' : 'Create account'}</button>)}
      </div>
      <input type="email" className="input" placeholder="Email" autoComplete="email" autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} />
      {mode !== 'reset' && <PasswordInput value={password} onChange={setPassword} placeholder={mode === 'signup' ? 'Password (6+ characters)' : 'Password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />}
      {mode === 'reset' && <p className="text-xs text-muted">We’ll email you a code. Enter it here with a new password.</p>}
      {message}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Email me a code'}</button>
      <div className="text-center text-xs">
        {mode === 'reset'
          ? <button type="button" className="text-muted underline" onClick={() => go('signin')}>Back to sign in</button>
          : <button type="button" className="text-muted underline" onClick={() => go('reset')}>Forgot password?</button>}
      </div>
      {mode === 'signup' && <p className="text-xs text-muted">We’ll email a short code to confirm it’s you. Your account keeps your progress backed up and in step across your phone and computer.</p>}
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
