import { useState } from 'react'
import { Moon } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useToday } from '@/lib/hooks'
import { formatDate } from '@/lib/dates'
import { clock } from '@/lib/walkPlan'
import { carryOver, resetTimes, RESET_CHOICES } from '@/lib/dayReset'
import { Modal } from './ui'

const label = (m: number) => (m === 0 ? '12 AM (midnight)' : m === 720 ? '12 PM (noon)' : clock(m))

/** A time picker for when a day ends: midnight to noon, in half hours. */
export function ResetSelect({ value, onChange, name }: { value: number; onChange: (minutes: number) => void; name: string }) {
  return (
    <select className="input" aria-label={name} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {RESET_CHOICES.map((m) => <option key={m} value={m}>{label(m)}</option>)}
    </select>
  )
}

/** Shown after midnight while the day before is still in progress, so it is clear which day a log counts toward. */
export function DayResetBanner() {
  useToday() // re-check as the clock moves on
  const profile = useStore((s) => s.profile)
  const days = useStore((s) => s.days)
  const carry = carryOver(new Date(), resetTimes(profile), (date) => days[date]?.shift)
  if (!carry) return null
  const weekday = formatDate(carry.date, { weekday: 'long' })
  return (
    <div role="status" className="rounded-2xl bg-lavender-100 dark:bg-lavender-500/20 text-lavender-700 dark:text-lavender-200 px-4 py-3 text-sm flex items-start gap-2.5">
      <Moon size={16} className="shrink-0 mt-0.5" />
      <span className="min-w-0"><span className="font-semibold">{carry.shift === 'night' ? `Still ${weekday}’s night shift.` : `Still ${weekday}.`}</span> What you log counts toward {weekday} until your day resets at {clock(carry.resetAt)}.</span>
    </div>
  )
}

/** Asked once of people who set up before reset times existed. New people are asked during setup. */
export function ResetPrompt() {
  const onboarded = useStore((s) => s.profile.onboarded)
  const asked = useStore((s) => s.profile.resetAsked)
  const setProfile = useStore((s) => s.setProfile)
  const [night, setNight] = useState(7 * 60)
  if (!onboarded || asked) return null
  const keep = () => setProfile({ resetAsked: true })
  return (
    <Modal open onClose={keep} title="Night shifts can count as one day">
      <p className="text-sm text-muted">Until now your day reset at midnight, which split a night shift’s water, quests and steps across two days. Pick a time after your shift ends and the whole shift counts as one day.</p>
      <label className="label mt-4">After a night shift, my day resets at</label>
      <ResetSelect name="Reset time after a night shift" value={night} onChange={setNight} />
      <p className="text-xs text-muted mt-2">Other days still reset at midnight. You can change both times in Settings.</p>
      <button className="btn-primary w-full mt-5 py-3" onClick={() => setProfile({ nightReset: night, resetAsked: true })}>Save</button>
      <button className="btn-ghost w-full mt-2 text-sm" onClick={keep}>Keep midnight</button>
    </Modal>
  )
}
