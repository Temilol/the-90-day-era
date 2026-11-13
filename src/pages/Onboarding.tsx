import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { todayKey, addDays, formatDate } from '@/lib/dates'
import { Sparkles } from '@/components/ui'
import { burst } from '@/components/Celebrate'
import { Modal } from '@/components/ui'
import { AccountPanel } from '@/components/Account'
import { useSync, syncConfigured } from '@/store/sync'

export default function Onboarding() {
  const setProfile = useStore((s) => s.setProfile)
  const [name, setName] = useState('')
  const [start, setStart] = useState(todayKey())
  const [units, setUnits] = useState<'lb' | 'kg'>('lb')
  const [step, setStep] = useState(0)
  const [account, setAccount] = useState(false)
  const recovery = useSync((s) => s.recovery)
  const signedInEmail = useSync((s) => s.email)

  const finish = () => {
    setProfile({ name: name.trim(), startDate: start, units, onboarded: true })
    burst({ big: true })
  }

  return (
    <div className="min-h-screen grid place-items-center p-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative card p-7 sm:p-10 w-full max-w-md overflow-hidden">
        <Sparkles />
        <div className="relative">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-lavender-500">Welcome to</div>
          <h1 className="h-display text-4xl gradient-text mt-1">The 90-Day Era</h1>
          <p className="text-muted mt-1">Your journey. Your rules. Your glow-up.</p>

          {step === 0 && (
            <div className="mt-8 space-y-5">
              <div>
                <label className="label">What should we call you?</label>
                <input className="input text-base" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Weight units (optional tracking)</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['lb', 'kg'] as const).map((u) => (
                    <button key={u} onClick={() => setUnits(u)} className={units === u ? 'btn-primary' : 'btn-soft'}>{u === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}</button>
                  ))}
                </div>
              </div>
              <button className="btn-primary w-full py-3" onClick={() => setStep(1)}>Next</button>
              {syncConfigured && (signedInEmail
                ? <p className="text-center text-xs text-muted">Signed in as {signedInEmail}. No saved progress found yet, so set up above.</p>
                : <button className="w-full text-center text-sm text-lavender-600 dark:text-lavender-300 font-medium" onClick={() => setAccount(true)}>Already started on another device? Sign in</button>)}
            </div>
          )}

          {step === 1 && (
            <div className="mt-8 space-y-5">
              <div>
                <label className="label">When does Day 1 begin?</label>
                <input type="date" className="input text-base" value={start} onChange={(e) => setStart(e.target.value)} />
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button className="chip bg-lavender-100 text-lavender-700 dark:bg-lavender-500/20 dark:text-lavender-200" onClick={() => setStart(todayKey())}>Today</button>
                  <button className="chip bg-lavender-100 text-lavender-700 dark:bg-lavender-500/20 dark:text-lavender-200" onClick={() => setStart(addDays(todayKey(), 1))}>Tomorrow</button>
                  <button className="chip bg-lavender-100 text-lavender-700 dark:bg-lavender-500/20 dark:text-lavender-200" onClick={() => setStart(addDays(todayKey(), 7))}>Next week</button>
                </div>
                <p className="text-xs text-muted mt-2">You can change this in Settings until you log your first day. Day 90 will be {formatDate(addDays(start, 89), { month: 'long', day: 'numeric', year: 'numeric' })}.</p>
              </div>
              <div className="rounded-2xl bg-card-2 p-4 text-sm">
                <div className="font-semibold mb-1">Your standard workout</div>
                <div className="text-muted">Incline 12 · 3.0 mph · 30 minutes. Shorter walks, strength sessions and rest days all count. No punishments, ever.</div>
              </div>
              <div className="flex gap-2">
                <button className="btn-soft" onClick={() => setStep(0)}>Back</button>
                <button className="btn-primary flex-1 py-3" onClick={finish}>Begin my era</button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
      <Modal open={account || recovery} onClose={() => setAccount(false)} title={recovery ? 'Reset password' : 'Your account'}>
        <AccountPanel onSignedIn={() => setAccount(false)} />
      </Modal>
    </div>
  )
}
