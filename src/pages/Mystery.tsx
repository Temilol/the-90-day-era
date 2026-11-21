import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { EnvelopeGrid, PrizesTeaser, TimeCapsule } from '@/components/Envelopes'
import { WHEEL } from '@/content/wheel'
import { THEMES } from '@/content/themes'
import { PageHeader, SectionTitle, Card } from '@/components/ui'
import { hearts } from '@/components/Celebrate'
import { XP } from '@/lib/xp'
import { addDays, dayNumber, TOTAL_DAYS } from '@/lib/dates'

type Tab = 'envelopes' | 'wheel' | 'themes'
const TABS: { id: Tab; label: string }[] = [{ id: 'envelopes', label: 'Envelopes' }, { id: 'wheel', label: 'Wheel' }, { id: 'themes', label: 'Themes' }]
const LAST_TAB = 'era-mystery-tab'
const lastTab = (): Tab => { try { const v = localStorage.getItem(LAST_TAB); return v === 'wheel' || v === 'themes' ? v : 'envelopes' } catch { return 'envelopes' } }

export default function Mystery() {
  const stats = useStats()
  // The tab comes from the link (/mystery#wheel).
  const loc = useLocation()
  const hash = loc.hash.slice(1)
  const unopened = useStore((s) => Object.values(s.envelopes).filter((e) => !e.openedAt).length)
  // With no tab in the link: an envelope waiting to be opened wins, otherwise the tab she used last.
  // Decided once per arrival, so opening that envelope does not move her to another tab.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const arrival = useMemo<Tab>(() => (Object.values(useStore.getState().envelopes).some((e) => !e.openedAt) ? 'envelopes' : lastTab()), [loc.key])
  const tab: Tab = hash === 'wheel' || hash === 'themes' ? hash : hash === 'envelopes' || hash === 'capsule' ? 'envelopes' : arrival
  // Only a tab she chose herself is remembered, not one the page picked for her.
  useEffect(() => { if (hash) try { localStorage.setItem(LAST_TAB, tab) } catch { /* private mode */ } }, [tab, hash])
  const recordSpin = useStore((s) => s.recordSpin)
  const setBonus = useStore((s) => s.setBonusMission)
  const todayLog = useStore((s) => s.days[stats.today])
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
      <PageHeader title="Mystery Missions" emoji="🎁" sub="Envelopes unlock at milestones. Pick one of three rewards and keep it. The wheel is always open." />

      <div role="tablist" aria-label="Mystery Missions sections" className="grid grid-cols-3 gap-1 rounded-full bg-card-2 p-1 text-sm font-semibold -mt-2">
        {TABS.map((x) => (
          <Link key={x.id} to={`#${x.id}`} replace role="tab" aria-selected={tab === x.id} className={clsx('relative rounded-full py-2 text-center transition', tab === x.id ? 'bg-card shadow-soft text-ink' : 'text-muted')}>
            {x.label}
            {x.id === 'envelopes' && unopened > 0 && <span className="absolute top-1.5 right-2.5 size-2 rounded-full bg-blush-500" aria-label={`${unopened} ready to open`} />}
          </Link>
        ))}
      </div>

      {/* Every tab stays mounted, so a spin result is still there after a look at another tab. */}
      <div hidden={tab !== 'envelopes'} className="space-y-8">
        <EnvelopeGrid />
        <PrizesTeaser />
        <TimeCapsule />
      </div>

      <section hidden={tab !== 'wheel'}>
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

      <section hidden={tab !== 'themes'}>
        <SectionTitle sub="Same incline, same speed, different vibe. Today’s theme is on your mission page; here’s the whole deck.">Entertainment themes</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-2">
          {THEMES.map((t) => <div key={t.id} className="card p-3 flex gap-3 items-start"><span className="text-2xl">{t.emoji}</span><div><div className="font-semibold text-sm">{t.name}</div><div className="text-xs text-muted">{t.blurb}</div></div></div>)}
        </div>
      </section>

    </div>
  )
}
