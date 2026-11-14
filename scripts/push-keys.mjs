// Creates the keys for push reminders. Run once:  npm run push:keys
// Writes them to push-keys.local (never committed) and adds the public key to .env.local.
import { createECDH, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'

const FILE = 'push-keys.local'
if (existsSync(FILE)) {
  console.log(`${FILE} already exists. Keys were not changed.`)
  console.log('Creating new keys would switch off reminders on every device that has them on.')
  console.log(`Delete ${FILE} first only if you really want to start over.`)
  process.exit(0)
}

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const ecdh = createECDH('prime256v1')
ecdh.generateKeys()
const publicKey = b64url(ecdh.getPublicKey())
const privateKey = b64url(ecdh.getPrivateKey())
const cronSecret = b64url(randomBytes(32))

writeFileSync(FILE, [
  'Push reminder keys for The 90-Day Era. Keep this file private. It is not committed to GitHub.',
  '',
  '1. Render → your site → Environment → add:',
  `   VITE_VAPID_PUBLIC_KEY = ${publicKey}`,
  '',
  '2. Supabase → Edge Functions → Secrets → add these three:',
  `   VAPID_PUBLIC_KEY  = ${publicKey}`,
  `   VAPID_PRIVATE_KEY = ${privateKey}`,
  `   CRON_SECRET       = ${cronSecret}`,
  '',
  '3. In supabase/push.sql, replace PASTE_CRON_SECRET_HERE with the CRON_SECRET value above',
  '   in the SQL Editor only. Do not save that change into the project file.',
  '',
].join('\n'), { mode: 0o600 })

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : ''
if (!/^VITE_VAPID_PUBLIC_KEY=/m.test(env)) appendFileSync('.env.local', `${env && !env.endsWith('\n') ? '\n' : ''}VITE_VAPID_PUBLIC_KEY=${publicKey}\n`)

console.log(`Keys created and saved to ${FILE}. Open that file for the next steps.`)
console.log('The public key was also added to .env.local for local use.')
