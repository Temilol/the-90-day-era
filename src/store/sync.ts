import { create } from 'zustand'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useStore, snapshot, applySnapshot } from './useStore'
import { useUi } from './ui'
import { decide, EMPTY_META, type SyncMeta } from '@/lib/syncLogic'

export type { SyncMeta }
import type { EraState } from '@/lib/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const syncConfigured = !!(SUPABASE_URL && SUPABASE_KEY)
/** Emails carry a code to type in, instead of a link. Needs custom email templates in Supabase. */
export const EMAIL_CODES = import.meta.env.VITE_AUTH_EMAIL_CODES === 'true'

const TABLE = 'era_state'
/** Private storage bucket for progress photos. Each person's files sit in a folder named after their user id. */
export const PHOTO_BUCKET = 'progress-photos'
const META_KEY = 'era-sync'
const BACKUP_KEY = 'era-data-backup'

export interface AuthResult { ok: boolean; message?: string; step?: 'code' | 'link' }
export type SyncStatus = 'signed-out' | 'syncing' | 'synced' | 'pending' | 'offline' | 'error'
export interface Conflict { remote: EraState; remoteVersion: number; remoteUpdatedAt: string }

interface SyncState {
  ready: boolean
  email: string | null
  userId: string | null
  status: SyncStatus
  error: string | null
  lastSyncedAt: string | null
  conflict: Conflict | null
  recovery: boolean // arrived from a password-reset email
  arrivedFrom: 'signup' | null // arrived from a confirmation email link
  dismissArrival: () => void
  signUp: (email: string, password: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  verifySignup: (email: string, code: string) => Promise<AuthResult>
  resendCode: (email: string, kind: 'signup' | 'reset') => Promise<AuthResult>
  resetWithCode: (email: string, code: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  sendReset: (email: string) => Promise<AuthResult>
  setNewPassword: (password: string) => Promise<{ ok: boolean; message?: string }>
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; message?: string }>
  deleteAccount: () => Promise<{ ok: boolean; message?: string }>
  syncNow: () => Promise<void>
  resolveConflict: (keep: 'cloud' | 'device') => Promise<void>
}

// ---------- device-local sync bookkeeping ----------
function readMeta(): SyncMeta {
  try { return { ...EMPTY_META, ...JSON.parse(localStorage.getItem(META_KEY) || '{}') } } catch { return { ...EMPTY_META } }
}
function writeMeta(patch: Partial<SyncMeta>) {
  const next = { ...readMeta(), ...patch }
  try { localStorage.setItem(META_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  return next
}

let client: SupabaseClient | null = null
export const getClient = () => client
let applying = false // true while cloud data is being written into the local store
let changeCounter = 0
let pushTimer: ReturnType<typeof setTimeout> | null = null
let busy = false
let again = false
let codeReset = false // a reset-by-code is in progress, so don't show the separate recovery form

function friendly(message: string | undefined): string {
  const m = (message || '').toLowerCase()
  if (m.includes('invalid login')) return 'That email and password don’t match.'
  if (m.includes('already registered')) return 'That email already has an account. Try signing in.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox.'
  if (m.includes('password should be')) return 'Password needs at least 6 characters.'
  if (m.includes('different from the old')) return 'New password must be different from the current one.'
  if (m.includes('weak') || m.includes('pwned')) return 'That password is too easy to guess. Try a longer one.'
  if (m.includes('rate limit')) return 'Too many emails requested. Wait a while and try again.'
  if (m.includes('expired') || m.includes('invalid') && m.includes('token') || m.includes('otp')) return 'That code is wrong or has expired. Check it, or request a new one.'
  if (m.includes('security purposes')) return 'Please wait a minute before requesting another code.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Can’t reach the server. Check your connection.'
  return message || 'Something went wrong.'
}
const isNetwork = (message: string | undefined) => /failed to fetch|network|load failed/i.test(message || '')

/** Which kind of email link (if any) opened this page. Read before Supabase clears it from the address. */
function readArrival(): 'recovery' | 'signup' | null {
  try {
    const raw = `${window.location.hash}&${window.location.search}`
    if (/error_code=otp_expired|error=access_denied/.test(raw)) return 'recovery' // shows the 'link expired' page
    if (/type=recovery/.test(raw)) return 'recovery'
    if (/type=signup/.test(raw)) return 'signup'
  } catch { /* not in a browser */ }
  return null
}
const arrival = readArrival()

export const useSync = create<SyncState>()((set, get) => {
  const fail = (message: string | undefined) => {
    if (isNetwork(message) || (typeof navigator !== 'undefined' && navigator.onLine === false)) set({ status: 'offline', error: null })
    else set({ status: 'error', error: friendly(message) })
  }

  const pull = (remote: EraState, version: number, uid: string) => {
    applying = true
    try { applySnapshot(remote) } finally { applying = false }
    const now = new Date().toISOString()
    writeMeta({ userId: uid, version, dirty: false, lastSyncedAt: now })
    set({ status: 'synced', error: null, lastSyncedAt: now })
  }

  /** Upload local data. `expected` is the cloud version we believe is current (0 = no row yet). */
  const push = async (uid: string, expected: number): Promise<'ok' | 'stale' | 'failed'> => {
    if (!client) return 'failed'
    const startedAt = changeCounter
    const data = snapshot()
    const now = new Date().toISOString()
    if (expected === 0) {
      const { error } = await client.from(TABLE).insert({ user_id: uid, data, version: 1, updated_at: now })
      if (error) { if (error.code === '23505') return 'stale'; fail(error.message); return 'failed' }
    } else {
      const { data: rows, error } = await client.from(TABLE).update({ data, version: expected + 1, updated_at: now }).eq('user_id', uid).eq('version', expected).select('version')
      if (error) { fail(error.message); return 'failed' }
      if (!rows || rows.length === 0) return 'stale'
    }
    const stillDirty = changeCounter !== startedAt
    writeMeta({ userId: uid, version: expected + 1, dirty: stillDirty, lastSyncedAt: now })
    set({ status: stillDirty ? 'pending' : 'synced', error: null, lastSyncedAt: now })
    if (stillDirty) schedulePush(1500)
    return 'ok'
  }

  const reconcile = async () => {
    const uid = get().userId
    if (!client || !uid) return
    if (get().conflict) return // waiting for the person to choose
    if (busy) { again = true; return }
    busy = true
    set({ status: 'syncing' })
    try {
      const { data: row, error } = await client.from(TABLE).select('data,version,updated_at').eq('user_id', uid).maybeSingle()
      if (error) { fail(error.message); return }
      const meta = readMeta()
      const localHasData = useStore.getState().profile.onboarded
      const action = decide({ uid, meta, remoteVersion: row ? Number(row.version) : null, localHasData })
      if (action === 'noop') {
        const now = new Date().toISOString()
        if (row) writeMeta({ userId: uid, version: Number(row.version), lastSyncedAt: now })
        set({ status: 'synced', error: null, lastSyncedAt: row ? now : get().lastSyncedAt })
      } else if (action === 'pull') {
        pull(row!.data as EraState, Number(row!.version), uid)
      } else if (action === 'ask') {
        set({ status: 'pending', conflict: { remote: row!.data as EraState, remoteVersion: Number(row!.version), remoteUpdatedAt: row!.updated_at as string } })
      } else {
        const result = await push(uid, action === 'create' ? 0 : meta.version)
        if (result === 'stale') again = true
      }
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e))
    } finally {
      busy = false
      if (again) { again = false; void reconcile() }
    }
  }

  const schedulePush = (delay = 2500) => {
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => { pushTimer = null; void reconcile() }, delay)
  }

  const init = async () => {
    if (!syncConfigured) { set({ ready: true }); return }
    try {
      const { createClient } = await import('@supabase/supabase-js')
      client = createClient(SUPABASE_URL!, SUPABASE_KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    } catch {
      set({ ready: true }); return
    }

    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && !codeReset) set({ recovery: true })
      const uid = session?.user?.id ?? null
      const changed = uid !== get().userId
      set({ ready: true, userId: uid, email: session?.user?.email ?? null, ...(uid ? {} : { status: 'signed-out' as SyncStatus, conflict: null }) })
      // Defer: Supabase holds a lock during this callback, so queries must not run inside it.
      if (uid && (changed || event === 'SIGNED_IN')) setTimeout(() => void reconcile(), 0)
    })

    // Track local edits so they get uploaded.
    const keys = Object.keys(snapshot()) as (keyof EraState)[]
    useStore.subscribe((state, prev) => {
      if (applying) return
      if (!keys.some((k) => state[k] !== prev[k])) return
      changeCounter++
      if (readMeta().userId) writeMeta({ dirty: true }) // remembered even while signed out
      if (!get().userId) return
      if (get().status === 'synced') set({ status: 'pending' })
      schedulePush()
    })

    document.addEventListener('visibilitychange', () => {
      if (!get().userId) return
      if (document.visibilityState === 'visible') void reconcile()
      else if (readMeta().dirty) { if (pushTimer) { clearTimeout(pushTimer); pushTimer = null } void reconcile() }
    })
    window.addEventListener('online', () => { if (get().userId) void reconcile() })
  }
  void init()

  return {
    ready: false,
    email: null,
    userId: null,
    status: 'signed-out',
    error: null,
    lastSyncedAt: readMeta().lastSyncedAt,
    conflict: null,
    recovery: arrival === 'recovery',
    arrivedFrom: arrival === 'signup' ? 'signup' : null,
    dismissArrival: () => set({ arrivedFrom: null, recovery: false }),

    signUp: async (email, password) => {
      if (!client) return { ok: false, message: 'Sync isn’t set up on this build.' }
      const { data, error } = await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } })
      if (error) return { ok: false, message: friendly(error.message) }
      // Supabase hides whether an email is taken; an account with no identities means it already exists.
      if (data.user && data.user.identities && data.user.identities.length === 0) return { ok: false, message: 'That email already has an account. Try signing in.' }
      if (!data.session) return { ok: true, step: EMAIL_CODES ? 'code' : 'link' }
      return { ok: true }
    },
    verifySignup: async (email, code) => {
      if (!client) return { ok: false, message: 'Sync isn’t set up on this build.' }
      const { error } = await client.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'signup' })
      return error ? { ok: false, message: friendly(error.message) } : { ok: true }
    },
    resendCode: async (email, kind) => {
      if (!client) return { ok: false, message: 'Sync isn’t set up on this build.' }
      const { error } = kind === 'signup'
        ? await client.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: window.location.origin } })
        : await client.auth.resetPasswordForEmail(email.trim())
      return error ? { ok: false, message: friendly(error.message) } : { ok: true, message: EMAIL_CODES ? 'New code sent. The older one no longer works.' : 'Email sent again. Use the newest one.' }
    },
    resetWithCode: async (email, code, password) => {
      if (!client) return { ok: false, message: 'Sync isn’t set up on this build.' }
      codeReset = true
      try {
        const { error } = await client.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' })
        if (error) return { ok: false, message: friendly(error.message) }
        const upd = await client.auth.updateUser({ password })
        if (upd.error) {
          // The code was right and you're signed in, but the new password was rejected: finish on the recovery form.
          set({ recovery: true })
          return { ok: false, message: friendly(upd.error.message) }
        }
        set({ recovery: false })
        return { ok: true }
      } finally {
        codeReset = false
      }
    },
    signIn: async (email, password) => {
      if (!client) return { ok: false, message: 'Sync isn’t set up on this build.' }
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (error && /email not confirmed/i.test(error.message)) {
        if (!EMAIL_CODES) return { ok: false, step: 'link', message: 'Not confirmed yet. Tap the link in the email first.' }
        await client.auth.resend({ type: 'signup', email: email.trim() })
        return { ok: false, step: 'code', message: 'Confirm your email first. We just sent you a code.' }
      }
      return error ? { ok: false, message: friendly(error.message) } : { ok: true }
    },
    signOut: async () => {
      if (!client) return
      if (get().userId && readMeta().dirty && !get().conflict) await reconcile() // last chance to upload
      await client.auth.signOut()
      set({ userId: null, email: null, status: 'signed-out', conflict: null, error: null, lastSyncedAt: null })
    },
    sendReset: async (email) => {
      if (!client) return { ok: false, message: 'Sync isn’t set up on this build.' }
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
      if (error) return { ok: false, message: friendly(error.message) }
      return EMAIL_CODES ? { ok: true, step: 'code' } : { ok: true, message: 'Check your email for a reset link. Open it, choose a new password on the page that appears, then come back here and sign in.' }
    },
    setNewPassword: async (password) => {
      if (!client) return { ok: false, message: 'Sync isn’t set up on this build.' }
      const { error } = await client.auth.updateUser({ password })
      if (error) return { ok: false, message: friendly(error.message) }
      return { ok: true, message: 'Password updated.' }
    },
    changePassword: async (current, next) => {
      const email = get().email
      if (!client || !email) return { ok: false, message: 'You need to be signed in.' }
      // Prove it's really you before changing anything.
      const check = await client.auth.signInWithPassword({ email, password: current })
      if (check.error) return { ok: false, message: isNetwork(check.error.message) ? friendly(check.error.message) : 'Your current password isn’t right.' }
      const { error } = await client.auth.updateUser({ password: next })
      if (error) return { ok: false, message: friendly(error.message) }
      return { ok: true, message: 'Password changed.' }
    },
    deleteAccount: async () => {
      const uid = get().userId
      if (!client || !uid) return { ok: false, message: 'You need to be signed in.' }
      // Photos are files, not rows, so they have to be removed before the account goes.
      try {
        for (let i = 0; i < 20; i++) {
          const { data: files } = await client.storage.from(PHOTO_BUCKET).list(uid, { limit: 100 })
          if (!files || files.length === 0) break
          const { error: removeError } = await client.storage.from(PHOTO_BUCKET).remove(files.map((f) => `${uid}/${f.name}`))
          if (removeError) break
        }
      } catch { /* no photo storage, or offline: the account deletion below reports real problems */ }
      const { error } = await client.rpc('delete_my_account')
      if (error) {
        if (error.code === 'PGRST202' || /could not find the function/i.test(error.message)) return { ok: false, message: 'Account deletion isn’t set up on the server yet.' }
        return { ok: false, message: friendly(error.message) }
      }
      await client.auth.signOut({ scope: 'local' }).catch(() => {})
      writeMeta({ ...EMPTY_META })
      set({ userId: null, email: null, status: 'signed-out', conflict: null, error: null, lastSyncedAt: null })
      return { ok: true }
    },
    syncNow: reconcile,
    resolveConflict: async (keep) => {
      const c = get().conflict
      const uid = get().userId
      if (!c || !uid) return
      if (keep === 'cloud') {
        try { localStorage.setItem(BACKUP_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data: snapshot() })) } catch { /* ignore */ }
        set({ conflict: null })
        pull(c.remote, c.remoteVersion, uid)
        useUi.getState().pushToast({ title: 'Using your cloud data', sub: 'This device’s old copy was kept as a backup', kind: 'success' })
      } else {
        set({ conflict: null, status: 'syncing' })
        const result = await push(uid, c.remoteVersion)
        if (result === 'ok') useUi.getState().pushToast({ title: 'Cloud updated from this device', kind: 'success' })
        else if (result === 'stale') void reconcile()
      }
    },
  }
})

export function hasLocalBackup(): string | null {
  try { const b = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null'); return b?.savedAt ?? null } catch { return null }
}
export function localBackupJson(): string | null {
  try { const b = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null'); return b ? JSON.stringify(b.data, null, 2) : null } catch { return null }
}
