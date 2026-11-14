import { create } from 'zustand'
import { useStore, snapshot } from './useStore'
import { useSync, getClient, syncConfigured } from './sync'
import { buildReminderQueue } from '@/lib/reminderQueue'

/**
 * Reminders that arrive with the app closed. This device registers with the phone maker's push
 * service, the address is saved to the signed-in account, and the app keeps the coming week of
 * reminder times in the account so a scheduled job on the server can deliver them.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
export const pushConfigured = syncConfigured && !!VAPID_PUBLIC_KEY
const FLAG_KEY = 'era-push' // { uid, endpoint } while this device is registered
const QUEUE_KEY = 'era-push-queue'
const SUBS = 'push_subscriptions'
const QUEUE = 'push_reminders'
const FUNCTION = 'send-reminders'

export type PushStatus = 'unconfigured' | 'unsupported' | 'needs-install' | 'signed-out' | 'blocked' | 'off' | 'on'
interface PushState {
  status: PushStatus
  busy: boolean
  message: string | null
  refresh: () => Promise<void>
  enable: () => Promise<void>
  disable: () => Promise<void>
  test: () => Promise<void>
}

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const isIos = () => typeof navigator !== 'undefined' && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
const installed = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

function readFlag(): { uid: string; endpoint: string } | null {
  try { return JSON.parse(localStorage.getItem(FLAG_KEY) || 'null') } catch { return null }
}
/** True when this device gets reminders by push, so the in-app copy of the same reminder can stay quiet. */
export function pushOnHere(): boolean {
  const f = readFlag()
  return !!f && f.uid === useSync.getState().userId
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

export const usePush = create<PushState>()((set, get) => ({
  status: pushConfigured ? 'off' : 'unconfigured',
  busy: false,
  message: null,

  refresh: async () => {
    if (!pushConfigured) { set({ status: 'unconfigured' }); return }
    if (!supported()) { set({ status: isIos() && !installed() ? 'needs-install' : 'unsupported' }); return }
    const uid = useSync.getState().userId
    if (!uid) { set({ status: 'signed-out' }); return }
    if (Notification.permission === 'denied') { set({ status: 'blocked' }); return }
    const sub = await currentSubscription().catch(() => null)
    const flag = readFlag()
    set({ status: sub && flag && flag.uid === uid && flag.endpoint === sub.endpoint ? 'on' : 'off' })
  },

  enable: async () => {
    const client = getClient()
    const uid = useSync.getState().userId
    if (!client || !uid || !supported() || !VAPID_PUBLIC_KEY) return
    set({ busy: true, message: null })
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { set({ status: permission === 'denied' ? 'blocked' : 'off', message: permission === 'denied' ? null : 'Notifications weren’t allowed.' }); return }
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) { set({ message: 'The app is still finishing its install. Close it, reopen it, and try again.' }); return }
      let sub = await reg.pushManager.getSubscription()
      const flag = readFlag()
      if (sub && flag && flag.uid !== uid) { await sub.unsubscribe().catch(() => false); sub = null } // registered under another account
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) })
      const json = sub.toJSON()
      const { error } = await client.from(SUBS).upsert({ endpoint: sub.endpoint, user_id: uid, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' }, { onConflict: 'endpoint' })
      if (error) {
        await sub.unsubscribe().catch(() => false)
        set({ message: /does not exist|could not find|schema cache/i.test(error.message) ? 'Push reminders haven’t been set up on the server yet.' : 'Couldn’t save this device. Check your connection and try again.' })
        return
      }
      try { localStorage.setItem(FLAG_KEY, JSON.stringify({ uid, endpoint: sub.endpoint })) } catch { /* ignore */ }
      set({ status: 'on', message: 'Reminders are on for this device.' })
      void syncReminderQueue(true)
    } catch (e) {
      set({ message: e instanceof Error && /permission|denied/i.test(e.message) ? 'Notifications are blocked for this app in your device settings.' : 'Couldn’t turn reminders on. Try again in a moment.' })
    } finally {
      set({ busy: false })
    }
  },

  disable: async () => {
    const client = getClient()
    set({ busy: true, message: null })
    try {
      const sub = await currentSubscription().catch(() => null)
      const endpoint = sub?.endpoint ?? readFlag()?.endpoint
      if (client && endpoint) await client.from(SUBS).delete().eq('endpoint', endpoint)
      if (sub) await sub.unsubscribe().catch(() => false)
      try { localStorage.removeItem(FLAG_KEY) } catch { /* ignore */ }
      set({ status: 'off', message: 'Reminders are off for this device.' })
    } finally {
      set({ busy: false })
    }
  },

  test: async () => {
    const client = getClient()
    if (!client || get().status !== 'on') return
    set({ busy: true, message: null })
    try {
      const { data, error } = await client.functions.invoke(FUNCTION, { body: { test: true } })
      if (error) set({ message: 'The server couldn’t send a test. The reminder job may not be set up yet.' })
      else if (data?.sent > 0) set({ message: 'Test sent. It should arrive within a few seconds.' })
      else set({ message: data?.error ? `The server couldn’t deliver it: ${String(data.error).slice(0, 120)}` : 'No registered device was found. Turn reminders off and on again.' })
    } catch {
      set({ message: 'Couldn’t reach the server.' })
    } finally {
      set({ busy: false })
    }
  },
}))

// ---------- keeping the server's list of upcoming reminders current ----------
let queueBusy = false
let queueAgain = false
let timer: ReturnType<typeof setTimeout> | null = null

export async function syncReminderQueue(force = false): Promise<void> {
  const client = getClient()
  const uid = useSync.getState().userId
  if (!pushConfigured || !client || !uid) return
  if (queueBusy) { queueAgain = true; return }
  queueBusy = true
  try {
    const now = new Date()
    const rows = buildReminderQueue(snapshot(), now)
    const signature = `${uid}|${JSON.stringify(rows)}`
    let last: string | null = null
    try { last = localStorage.getItem(QUEUE_KEY) } catch { /* ignore */ }
    if (!force && last === signature) return
    // Replace only what is still in the future; anything already due is left for the server to send.
    const { error: clearError } = await client.from(QUEUE).delete().eq('user_id', uid).is('sent_at', null).gt('fire_at', now.toISOString())
    if (clearError) return
    if (rows.length) {
      const { error } = await client.from(QUEUE).insert(rows.map((r) => ({ ...r, user_id: uid })))
      if (error) return
    }
    try { localStorage.setItem(QUEUE_KEY, signature) } catch { /* ignore */ }
  } catch {
    /* offline: the next change or app open tries again */
  } finally {
    queueBusy = false
    if (queueAgain) { queueAgain = false; schedule(1000) }
  }
}

function schedule(delay = 4000) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { timer = null; void syncReminderQueue() }, delay)
}

if (typeof window !== 'undefined' && pushConfigured) {
  useStore.subscribe((state, prev) => {
    if (state.days !== prev.days || state.reminders !== prev.reminders || state.profile !== prev.profile) schedule()
  })
  useSync.subscribe((state, prev) => {
    if (state.userId !== prev.userId) { void usePush.getState().refresh(); schedule(1500) }
  })
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(1500) })
  void usePush.getState().refresh()
}
