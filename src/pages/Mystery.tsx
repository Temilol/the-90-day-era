import { useState } from 'react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { ENVELOPE_DEFS, ENVELOPE_REWARDS } from '@/content/envelopes'
import { WHEEL } from '@/content/wheel'
import { THEMES } from '@/content/themes'
import { PageHeader, SectionTitle, Card, Modal } from '@/components/ui'
import { burst, hearts } from '@/components/Celebrate'
import { XP } from '@/lib/xp'
import { addDays, dayNumber, TOTAL_DAYS } from '@/lib/dates'

export default function Mystery() {
  const stats = useStats()
  const envelopes = useStore((s) => s.envelopes)
  const openEnvelope = useStore((s) => s.openEnvelope)
  const recordSpin = useStore((s) => s.recordSpin)
  const setBonus = useStore((s) => s.setBonusMission)
  const todayLog = useStore((s) => s.days[stats.today])
  const [opening, setOpening] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [cat, setCat] = useState(WHEEL[0].id)
  const [spinning, setSpinning] = useState(false)
  const [angle, setAngle] = useState(0)
  const [result, setResult] = useState<{ category: string; text: string } | null>(null)

  const category = WHEEL.find((c) => c.id === cat)!
  const spin = () => {
    if (spinning) return
    setSpinning(true); setResult(null); setAdopted(null)
    const idx = Math.floor(Math.random() * category.items.length)
    const seg = 360 / category.items.length
    const target = 360 * 5 + (360 - (idx * seg + seg / 2))
    setAngle((a) => a + target + ((360 - (a % 360)) % 360))
    setTimeout(() => {
      setSpinning(false)
      const text = category.items[idx]
      setResult({ category: category.name, text })
      recordSpin(category.id, text)
      hearts()
    }, 3600)
  }
  const doOpen = (id: string) => {
    setOpening(id)
    setTimeout(() => { openEnvelope(id); setOpening(null); setRevealed(id); burst({ big: true }) }, 1100)
  }
  const active = stats.started && !stats.finished
  const todayBonus = todayLog?.bonusMission
  const todayDone = !!todayBonus?.done
  const tomorrowKey = addDays(stats.today, 1)
  const tomorrowBonus = useStore((s) => s.days[tomorrowKey]?.bonusMission)
  const tomorrowInChallenge = !!stats.startDate && dayNumber(stats.startDate, tomorrowKey) <= TOTAL_DAYS
  const [adopted, setAdopted] = useState<string | null>(null)
  // What a spin result can become right now.
  const target: { date: string; label: string; done: string } | null = !active ? null
    : !todayBonus ? { date: stats.today, label: `Make it today’s bonus mission (+${XP.bonusMission} XP)`, done: 'Added to Today’s Mission' }
    : !todayDone ? { date: stats.today, label: 'Swap today’s bonus mission for this one', done: 'Today’s bonus mission swapped' }
    : !tomorrowInChallenge ? null
    : !tomorrowBonus ? { date: tomorrowKey, label: `Save it as tomorrow’s bonus mission (+${XP.bonusMission} XP)`, done: 'Saved for tomorrow' }
    : { date: tomorrowKey, label: 'Replace tomorrow’s bonus mission with this one', done: 'Tomorrow’s bonus mission replaced' }

  return (
    <div className="space-y-8">
      <PageHeader title="Mystery Missions" emoji="🎁" sub="Envelopes unlock at milestones. The wheel is always open." />

      <section>
        <SectionTitle sub={`${Object.values(envelopes).filter((e) => !e.openedAt).length} ready to open`}>Mystery envelopes</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ENVELOPE_DEFS.map((def) => {
            const e = envelopes[def.id]
            const state = !e ? 'locked' : e.openedAt ? 'opened' : 'ready'
            const t = def.trigger
            const hint = t.type === 'day' ? `Reach Day ${t.value} with ${Math.ceil(t.value / 3)}+ active days` : t.type === 'workouts' ? `${t.value} workouts` : `${t.value}-day streak`
            return (
              <motion.button key={def.id} whileTap={state === 'ready' ? { scale: 0.95 } : {}} disabled={state !== 'ready'} onClick={() => doOpen(def.id)}
                className={clsx('card p-4 text-left relative overflow-hidden', state === 'ready' && 'ring-2 ring-blush-400 shadow-glow', state === 'locked' && 'opacity-70')}>
                <motion.div animate={opening === def.id ? { rotateX: [0, -180], y: [0, -6, 0] } : state === 'ready' ? { y: [0, -4, 0] } : {}} transition={opening === def.id ? { duration: 1 } : { repeat: Infinity, duration: 1.8 }} className="text-4xl">
                  {state === 'opened' ? '💌' : state === 'ready' ? '✉️' : '🔒'}
                </motion.div>
                <div className="font-semibold text-sm mt-2 leading-tight">{def.title}</div>
                <div className="text-xs text-muted mt-0.5">{state === 'locked' ? hint : state === 'ready' ? 'Tap to open' : 'Opened'}</div>
                {state === 'opened' && <div className="text-xs mt-2 text-lavender-600 dark:text-lavender-300 line-clamp-2">{e!.reward}</div>}
              </motion.button>
            )
          })}
        </div>
      </section>

      <section>
        <SectionTitle sub="Pick a category and spin. One result a day can become your bonus mission for +10 XP.">Spin the wheel</SectionTitle>
        <Card>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {WHEEL.map((c) => <button key={c.id} disabled={spinning} onClick={() => { setCat(c.id); setResult(null) }} className={clsx('chip shrink-0 py-1.5 px-3', cat === c.id ? 'text-white' : 'bg-card-2 text-muted')} style={cat === c.id ? { background: c.color } : {}}>{c.emoji} {c.name}</button>)}
          </div>
          <div className="relative mx-auto my-6 size-64 sm:size-72">
            <div className="absolute left-1/2 -top-2 -translate-x-1/2 z-10 text-2xl drop-shadow">🔻</div>
            <motion.div animate={{ rotate: angle }} transition={{ duration: 3.5, ease: [0.15, 0.85, 0.2, 1] }} className="size-full rounded-full shadow-glow border-4 border-white dark:border-card"
              style={{ background: `conic-gradient(${category.items.map((_, i) => `${i % 2 ? category.color : '#fff'} ${(i / category.items.length) * 100}% ${((i + 1) / category.items.length) * 100}%`).join(',')})` }}>
              {category.items.map((_, i) => (
                <div key={i} className="absolute left-1/2 top-1/2 origin-left text-xs font-bold" style={{ transform: `rotate(${(i + 0.5) * (360 / category.items.length) - 90}deg) translateX(34px)`, color: i % 2 ? '#fff' : category.color }}>{category.emoji}</div>
              ))}
            </motion.div>
            <div className="absolute inset-0 m-auto size-16 rounded-full bg-card shadow-soft grid place-items-center text-2xl">{spinning ? '✨' : category.emoji}</div>
          </div>
          {active && todayBonus && (
            <div className="mb-3 rounded-2xl bg-card-2 p-3 text-sm">
              {todayDone
                ? <><span className="font-semibold">Today’s bonus is done ✓</span> <span className="text-muted">One bonus earns XP per day. {tomorrowInChallenge ? (tomorrowBonus ? `Tomorrow’s is lined up: “${tomorrowBonus.text}”. Spin to replace it, or just for fun.` : 'Spin now to line one up for tomorrow.') : ''}</span></>
                : <><span className="font-semibold">Today’s bonus:</span> <span className="text-muted">“{todayBonus.text}”. Spin to swap it for something else.</span></>}
            </div>
          )}
          <button className="btn-primary w-full py-3" disabled={spinning} onClick={spin}>{spinning ? 'Spinning…' : todayDone && tomorrowInChallenge ? 'Spin for tomorrow' : 'Spin'}</button>
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl bg-gradient-to-br from-lavender-50 to-blush-50 dark:from-lavender-500/15 dark:to-blush-500/10 p-4 text-center">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-lavender-500">{result.category}</div>
                <div className="h-display text-xl mt-1">{result.text}</div>
                {adopted ? <div className="text-sm font-semibold gradient-text mt-3">{adopted} ✓</div>
                  : target ? <button className="btn-soft mt-3" onClick={() => { setBonus(target.date, result.text, result.category); setAdopted(target.done); hearts() }}>{target.label}</button>
                  : <div className="text-xs text-muted mt-2">{!active ? 'Bonus missions unlock once your challenge starts.' : 'Today’s bonus is done and tomorrow is past Day 90, so this one is just for fun.'}</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </section>

      <section>
        <SectionTitle sub="Same incline, same speed, different vibe. Today’s theme is on your mission page; here’s the whole deck.">Entertainment themes</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-2">
          {THEMES.map((t) => <div key={t.id} className="card p-3 flex gap-3 items-start"><span className="text-2xl">{t.emoji}</span><div><div className="font-semibold text-sm">{t.name}</div><div className="text-xs text-muted">{t.blurb}</div></div></div>)}
        </div>
      </section>

      <Modal open={!!revealed} onClose={() => setRevealed(null)}>
        {revealed && (() => { const e = envelopes[revealed]; const r = ENVELOPE_REWARDS.find((x) => x.text === e?.reward); return (
          <div className="text-center py-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} className="text-6xl">{r?.emoji ?? '💌'}</motion.div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-lavender-500 mt-4">{ENVELOPE_DEFS.find((d) => d.id === revealed)?.title}</div>
            <div className="h-display text-2xl mt-2">{e?.reward}</div>
            {r?.xp && <div className="gradient-text font-bold mt-2">+{r.xp} XP added</div>}
            <button className="btn-primary w-full mt-6" onClick={() => setRevealed(null)}>Yay</button>
          </div>
        ) })()}
      </Modal>
    </div>
  )
}
