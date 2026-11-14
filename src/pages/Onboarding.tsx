import { useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { todayKey, addDays, formatDate } from '@/lib/dates'
import { Sparkles } from '@/components/ui'
import { burst } from '@/components/Celebrate'
import { Modal } from '@/components/ui'
import { AccountPanel } from '@/components/Account'
import { useSync, syncConfigured } from '@/store/sync'
import { WATER_DEFAULTS, toMl, type WaterUnit } from '@/lib/water'
import { DEFAULT_STEP_GOAL } from '@/lib/xp'

export default function Onboarding() {
  const setProfile = useStore((s) => s.setProfile)
  const [name, setName] = useState('')
  const [start, setStart] = useState(todayKey())
  const [units, setUnits] = useState<'lb' | 'kg'>('lb')
  const [step, setStep] = useState(0)
  const [waterUnit, setWaterUnit] = useState<WaterUnit>('oz')
  const [stepGoal, setStepGoal] = useState(String(DEFAULT_STEP_GOAL))
  const [waterGoal, setWaterGoal] = useState(String(WATER_DEFAULTS.oz.goal))
  const pickWaterUnit = (u: WaterUnit) => { if (u !== waterUnit) { setWaterUnit(u); setWaterGoal(String(WATER_DEFAULTS[u].goal)) } }
  const [account, setAccount] = useState(false)
  const signedInEmail = useSync((s) => s.email)

  const finish = () => {
    const goal = parseFloat(waterGoal) > 0 ? parseFloat(waterGoal) : WATER_DEFAULTS[waterUnit].goal
    setProfile({ name: name.trim(), startDate: start, units, onboarded: true, waterUnit, waterGoal: toMl(goal, waterUnit), waterBottle: toMl(WATER_DEFAULTS[waterUnit].bottle, waterUnit), stepGoal: parseFloat(stepGoal) > 0 ? Math.round(parseFloat(stepGoal)) : DEFAULT_STEP_GOAL })
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
              <div>
                <label className="label">Daily water goal</label>
                <div className="flex gap-2">
                  <input type="number" inputMode="decimal" min={1} className="input text-base flex-1 min-w-0" aria-label={`Daily water goal in ${waterUnit}`} value={waterGoal} onChange={(e) => setWaterGoal(e.target.value)} />
                  <div className="grid grid-cols-2 gap-1 rounded-full bg-card-2 p-1 text-sm font-semibold shrink-0">
                    {(['oz', 'ml'] as const).map((u) => <button type="button" key={u} onClick={() => pickWaterUnit(u)} className={waterUnit === u ? 'rounded-full px-3 py-1.5 bg-card shadow-soft text-ink' : 'rounded-full px-3 py-1.5 text-muted'}>{u}</button>)}
                  </div>
                </div>
                <p className="text-xs text-muted mt-2">You log your water through the day, and the hydration quest ticks itself when you reach this. Pick what suits you. You can change the amount and the unit in Settings.</p>
              </div>
              <div>
                <label className="label">Daily step goal</label>
                <input type="number" inputMode="numeric" min={1} className="input text-base" aria-label="Daily step goal" value={stepGoal} onChange={(e) => setStepGoal(e.target.value)} />
                <p className="text-xs text-muted mt-2">Optional. You type in your steps from your watch or phone. It’s tracked for your stats and earns no XP. Change the goal in Settings.</p>
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
      <Modal open={account} onClose={() => setAccount(false)} title="Your account">
        <AccountPanel onSignedIn={() => setAccount(false)} />
      </Modal>
    </div>
  )
}
