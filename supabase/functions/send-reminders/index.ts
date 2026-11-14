// Supabase Edge Function: delivers due reminders as push notifications.
// Two ways in:
//   1. The scheduled job calls it every five minutes with the x-cron-secret header.
//   2. A signed-in person calls it with { "test": true } to send themselves a test.
// Deploy with "Verify JWT" switched off; the function checks callers itself.
// Secrets needed: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET. Optional: VAPID_SUBJECT.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const STALE_MINUTES = 45 // a reminder this late is skipped, not sent
const EARLY_SECONDS = 90 // send slightly early so a five-minute schedule lands close to the time

type Sub = { endpoint: string; user_id: string; p256dh: string; auth: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) return json({ error: 'The VAPID keys are not set as secrets.' }, 500)
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'https://the-90-day-era.onrender.com', publicKey, privateKey)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  /** Sends one message to one device. Devices that have gone away are forgotten. */
  const deliver = async (sub: Sub, payload: Record<string, string>): Promise<string | null> => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 1800, urgency: 'high' })
      return null
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      return `${status ?? ''} ${(e as { body?: string; message?: string }).body || (e as Error).message || 'send failed'}`.trim()
    }
  }

  const body = await req.json().catch(() => ({}))

  // ---- a person testing their own device ----
  if (body?.test === true) {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: who, error: whoError } = await admin.auth.getUser(token)
    if (whoError || !who?.user) return json({ error: 'Sign in first.' }, 401)
    const { data: subs } = await admin.from('push_subscriptions').select('endpoint,user_id,p256dh,auth').eq('user_id', who.user.id)
    let sent = 0
    let lastError: string | null = null
    for (const sub of (subs ?? []) as Sub[]) {
      const err = await deliver(sub, { title: 'Reminders are working', body: 'Your walk reminders will arrive like this, even with the app closed.', url: '/shifts', tag: 'era-test' })
      if (err) lastError = err; else sent++
    }
    return json({ sent, devices: subs?.length ?? 0, error: sent ? null : lastError })
  }

  // ---- the scheduled job ----
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'Not allowed.' }, 401)

  const now = Date.now()
  const { data: due, error } = await admin.from('push_reminders').select('id,user_id,fire_at,title,body,url')
    .is('sent_at', null).lte('fire_at', new Date(now + EARLY_SECONDS * 1000).toISOString()).order('fire_at').limit(200)
  if (error) return json({ error: error.message }, 500)

  let sent = 0
  let skipped = 0
  const subsByUser = new Map<string, Sub[]>()
  for (const r of due ?? []) {
    const late = now - new Date(r.fire_at).getTime() > STALE_MINUTES * 60_000
    if (late) skipped++
    else {
      if (!subsByUser.has(r.user_id)) {
        const { data: subs } = await admin.from('push_subscriptions').select('endpoint,user_id,p256dh,auth').eq('user_id', r.user_id)
        subsByUser.set(r.user_id, (subs ?? []) as Sub[])
      }
      for (const sub of subsByUser.get(r.user_id)!) {
        if (!(await deliver(sub, { title: r.title, body: r.body, url: r.url, tag: `era-${r.id}` }))) sent++
      }
    }
    await admin.from('push_reminders').update({ sent_at: new Date().toISOString() }).eq('id', r.id)
  }
  // Tidy up what was handled more than two days ago.
  await admin.from('push_reminders').delete().not('sent_at', 'is', null).lt('sent_at', new Date(now - 2 * 86_400_000).toISOString())
  return json({ due: due?.length ?? 0, sent, skipped })
})
