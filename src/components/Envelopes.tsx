import { useState } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { ENVELOPE_DEFS, TIERS, prizeDef, isSecret, LEGACY_REWARD_EMOJI, type EnvelopeDef } from '@/content/envelopes'
import { prizeUsed } from '@/lib/prizes'
import { formatDate, addDays } from '@/lib/dates'
import type { Prize } from '@/lib/types'
import { Card, Modal, SectionTitle } from './ui'
import { burst, hearts } from './Celebrate'

const hintFor = (def: EnvelopeDef) => {
  const t = def.trigger
  if (t.type === 'secret') return 'A secret. No hints.'
  return t.type === 'day' ? `Reach Day ${t.value} with ${Math.ceil(t.value / 3)}+ active days` : t.type === 'workouts' ? `${t.value} workouts` : t.type === 'strength' ? `${t.value} strength sessions` : t.type === 'newBosses' ? 'Defeat a boss' : t.type === 'bosses' ? `Defeat ${t.value} bosses` : `${t.value}-day streak`
}

function TierChip({ tier }: { tier: EnvelopeDef['tier'] }) {
  return <span className={clsx('inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', TIERS[tier].chip)}>{TIERS[tier].label}</span>
}

/** The letter, shown once it has been delivered. */
function CapsuleLetter() {
  const capsule = useStore((s) => s.capsule)
  if (!capsule) return null
  return (
    <div className="rounded-2xl bg-gradient-to-br from-lavender-50 to-blush-50 dark:from-lavender-500/15 dark:to-blush-500/10 p-4 text-left">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-lavender-500">From you, on Day {capsule.day}</div>
      <p className="font-display italic mt-2 whitespace-pre-wrap break-words leading-relaxed">{capsule.text}</p>
    </div>
  )
}

/** Opening an envelope: three face-down cards, pick one, see what it was. */
function PickModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const envelope = useStore((s) => (id ? s.envelopes[id] : undefined))
  const chooseEnvelope = useStore((s) => s.chooseEnvelope)
  const prizes = useStore((s) => s.prizes)
  const [picked, setPicked] = useState<number | null>(null)
  const def = ENVELOPE_DEFS.find((d) => d.id === id)
  const options = envelope?.options ?? []
  const opened = !!envelope?.openedAt
  const won = prizeDef(envelope?.rewardKey)
  const wonPrize = prizes.find((p) => p.from === id)
  const legacy = opened && !won
  const close = () => { setPicked(null); onClose() }
  const pick = (i: number) => {
    if (opened || picked !== null || !id) return
    setPicked(i)
    setTimeout(() => { chooseEnvelope(id, options[i]); burst({ big: true }) }, 650)
  }
  return (
    <Modal open={!!id && !!def} onClose={close} title={def?.title}>
      {def && envelope && (
        <div className="text-center">
          <TierChip tier={def.tier} />
          {!opened && <p className="text-sm text-muted mt-2 text-balance">Three rewards are inside. Pick one to keep.</p>}

          {(!opened || picked !== null) && options.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {options.map((key, i) => {
                const chosen = picked === i
                const faceUp = chosen && opened
                const o = prizeDef(key)
                return (
                  <motion.button key={`${key}-${i}`} type="button" disabled={opened || picked !== null} onClick={() => pick(i)}
                    animate={chosen ? { rotateY: [0, 90, 0], scale: [1, 1.06, 1] } : {}} transition={{ duration: 0.65 }} whileTap={picked === null ? { scale: 0.95 } : {}}
                    aria-label={faceUp ? o?.title : `Card ${i + 1} of 3`}
                    className={clsx('aspect-[3/4] min-w-0 rounded-2xl grid place-items-center transition-opacity',
                      faceUp ? 'bg-card ring-2 ring-blush-400 shadow-glow' : 'bg-gradient-to-br from-lavender-500 to-blush-400 text-white',
                      picked !== null && !chosen && 'opacity-30')}>
                    <div className="grid place-items-center gap-1">
                      <span className="text-3xl leading-none">{faceUp ? o?.emoji : '✨'}</span>
                      {!faceUp && picked === null && <span className="text-[11px] font-semibold">Tap</span>}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}

          {opened && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              {picked === null && <div className="text-6xl leading-none">{won?.emoji ?? LEGACY_REWARD_EMOJI[envelope.reward ?? ''] ?? '💌'}</div>}
              <div className="h-display text-2xl mt-3 text-balance break-words">{won?.title ?? envelope.reward}</div>
              {won && <p className="text-sm text-muted mt-2 text-balance">{won.text}</p>}
              {won?.xp && <div className="gradient-text font-bold mt-2">+{won.xp} XP added</div>}
              {legacy && <p className="text-xs text-muted mt-2">Opened before rewards could be kept. This one is on your honour.</p>}
              {won && !won.xp && wonPrize && <p className="text-xs text-muted mt-2">Kept in My rewards, in the Shop, until you use it.</p>}
              {def.found && <p className="text-xs mt-3 rounded-2xl bg-card-2 p-3 text-balance"><span className="font-semibold">Secret found.</span> {def.found}</p>}
              {id === 'day90' && <div className="mt-4"><CapsuleLetter /></div>}
              <button className="btn-primary w-full mt-5" onClick={close}>{picked !== null ? (won?.xp ? 'Lovely' : 'Add to my rewards') : 'Close'}</button>
            </motion.div>
          )}
          {!opened && picked === null && <p className="text-xs text-muted mt-4 text-balance">The two you leave go back in the pool for a later envelope.</p>}
        </div>
      )}
    </Modal>
  )
}

export function EnvelopeGrid() {
  const envelopes = useStore((s) => s.envelopes)
  const drawEnvelope = useStore((s) => s.drawEnvelope)
  const [open, setOpen] = useState<string | null>(null)
  const ready = Object.values(envelopes).filter((e) => !e.openedAt).length
  const secretsFound = ENVELOPE_DEFS.filter((d) => isSecret(d) && envelopes[d.id]).length
  const secretsTotal = ENVELOPE_DEFS.filter(isSecret).length
  // What she can act on comes first (ready, then opened with the newest on top); everything still locked folds into one row.
  const stateOf = (def: EnvelopeDef) => { const e = envelopes[def.id]; return !e ? 'locked' : e.openedAt ? 'opened' : 'ready' }
  const readyDefs = ENVELOPE_DEFS.filter((d) => stateOf(d) === 'ready')
  const openedDefs = ENVELOPE_DEFS.filter((d) => stateOf(d) === 'opened').sort((a, b) => envelopes[b.id].openedAt!.localeCompare(envelopes[a.id].openedAt!))
  const unlocked = [...readyDefs, ...openedDefs]
  const locked = ENVELOPE_DEFS.filter((d) => stateOf(d) === 'locked')
  const lockedSecrets = locked.filter(isSecret).length
  const [showLocked, setShowLocked] = useState(() => unlocked.length === 0)
  const renderCard = (def: EnvelopeDef) => {
    const e = envelopes[def.id]
    const state = stateOf(def)
    const won = prizeDef(e?.rewardKey)
    return (
      <motion.button key={def.id} whileTap={state !== 'locked' ? { scale: 0.96 } : {}} disabled={state === 'locked'}
        onClick={() => { if (state === 'ready') drawEnvelope(def.id); setOpen(def.id) }}
        className={clsx('card p-3.5 text-left relative overflow-hidden min-w-0 flex flex-col', state === 'ready' && `ring-2 shadow-glow ${TIERS[def.tier].ring}`, state === 'locked' && 'opacity-70')}>
        <motion.div animate={state === 'ready' ? { y: [0, -4, 0] } : {}} transition={{ repeat: Infinity, duration: 1.8 }} className="text-4xl leading-none">
          {state === 'opened' ? (won?.emoji ?? LEGACY_REWARD_EMOJI[e!.reward ?? ''] ?? '💌') : state === 'ready' ? TIERS[def.tier].emoji : isSecret(def) ? '❔' : '🔒'}
        </motion.div>
        <div className="mt-2.5"><TierChip tier={def.tier} /></div>
        <div className="font-semibold text-sm mt-1.5 leading-tight break-words">{state === 'locked' && isSecret(def) ? '???' : def.title}</div>
        <div className="text-xs text-muted mt-0.5 break-words">{state === 'locked' ? hintFor(def) : state === 'ready' ? (isSecret(def) ? 'Secret found. Tap to open' : 'Tap to open') : 'Opened'}</div>
        {state === 'opened' && <div className="text-xs mt-1.5 text-lavender-600 dark:text-lavender-300 line-clamp-2 break-words">{won?.title ?? e!.reward}</div>}
      </motion.button>
    )
  }
  return (
    <section>
      <SectionTitle sub={`${ready ? `${ready} ready to open` : 'Bigger milestones hold better rewards'} · ${secretsFound} of ${secretsTotal} secrets found`}>Mystery envelopes</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{unlocked.map(renderCard)}</div>
      {locked.length > 0 && (
        <div className={unlocked.length ? 'mt-3' : ''}>
          <button type="button" aria-expanded={showLocked} onClick={() => setShowLocked((v) => !v)} className="card w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
            <div className="min-w-0">
              <div className="text-sm font-medium">Still to earn</div>
              <div className="text-xs text-muted">{locked.length} {locked.length === 1 ? 'envelope' : 'envelopes'}{lockedSecrets > 0 ? ` · ${lockedSecrets} of them secret` : ''}</div>
            </div>
            <ChevronDown size={16} className={clsx('text-muted shrink-0 transition', showLocked && 'rotate-180')} />
          </button>
          {showLocked && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">{locked.map(renderCard)}</div>}
        </div>
      )}
      <PickModal key={open ?? 'none'} id={open} onClose={() => setOpen(null)} />
    </section>
  )
}

/** Where a reward in My rewards came from. */
export function SourceTag({ source }: { source: 'shop' | 'envelope' }) {
  return <span className={clsx('inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0', source === 'shop' ? 'bg-lavender-100 text-lavender-700 dark:bg-lavender-500/20 dark:text-lavender-200' : 'bg-blush-100 text-blush-600 dark:bg-blush-500/20 dark:text-blush-200')}>{source === 'shop' ? 'Shop' : 'Envelope'}</span>
}

/** One prize won from an envelope, with whatever button it needs. */
export function PrizeRow({ p }: { p: Prize }) {
  const days = useStore((s) => s.days)
  const freezes = useStore((s) => s.freezes)
  const redeemPrize = useStore((s) => s.redeemPrize)
  const stats = useStats()
  const today = stats.today
  const def = prizeDef(p.key)
  if (!def) return null
  const used = prizeUsed(p, { days, freezes }, today)
  const short = (d: string) => formatDate(d, { month: 'short', day: 'numeric' })
  const from = ENVELOPE_DEFS.find((d) => d.id === p.from)?.title ?? 'Envelope'
  const linkClass = 'btn-soft !py-1.5 text-xs shrink-0 whitespace-nowrap'
  const kind = def.kind
  const pendingDouble = kind === 'double' && used && days[today]?.doubleXp === p.id && !days[today]?.workout
  const status = kind === 'xp' ? `Added on ${short(p.wonAt.slice(0, 10))}`
    : !used ? from
    : kind === 'freeze' ? `Used on ${short(p.usedOn!)}`
    : kind === 'double' ? (pendingDouble ? 'On today. Log your walk to double it.' : (def.days ?? 1) > 1 ? `Used on ${short(p.usedOn!)} and ${short(addDays(p.usedOn!, 1))}` : `Used on ${short(p.usedOn!)}`)
    : kind === 'discount' ? `Used on ${p.note ?? 'a shop reward'}`
    : kind === 'swap' ? `Used on ${short(p.usedOn ?? p.usedAt!.slice(0, 10))}`
    : `Done on ${short(p.usedAt!.slice(0, 10))}`
  return (
    <div className={clsx('flex items-center gap-3 rounded-2xl p-3 min-w-0', used ? 'bg-card-2/60' : 'bg-card-2')}>
      <span className={clsx('text-2xl leading-none shrink-0', used && 'opacity-50')}>{def.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className={clsx('font-semibold text-sm leading-tight break-words', used && 'text-muted')}>{def.title}</div>
        <div className="text-xs text-muted break-words mt-0.5 flex items-center gap-1.5 flex-wrap"><SourceTag source="envelope" />{status}</div>
      </div>
      {!used && kind === 'freeze' && <Link to="/calendar" className={linkClass}>Use</Link>}
      {!used && kind === 'discount' && <Link to="/rewards#shop" className={linkClass}>Use in shop</Link>}
      {!used && kind === 'swap' && <Link to="/today" className={linkClass}>Use today</Link>}
      {!used && kind === 'double' && <button className={linkClass} disabled={!stats.started || stats.finished} onClick={() => { redeemPrize(p.id); hearts() }}>{(def.days ?? 1) > 1 ? 'Start today' : 'Use today'}</button>}
      {(kind === 'treat' || kind === 'mission') && <button className={used ? 'btn-ghost !py-1.5 text-xs shrink-0 whitespace-nowrap' : linkClass} onClick={() => { redeemPrize(p.id); if (!used) hearts() }}>{used ? 'Undo' : kind === 'treat' ? 'Mark enjoyed' : 'Mark done'}</button>}
      {used && kind !== 'treat' && kind !== 'mission' && <span className="text-mint-400 shrink-0" aria-label="Used">✓</span>}
    </div>
  )
}

/** On the Mystery page: a pointer to the prizes, which are kept in the Shop's My rewards. */
export function PrizesTeaser() {
  const prizes = useStore((s) => s.prizes)
  const days = useStore((s) => s.days)
  const freezes = useStore((s) => s.freezes)
  const today = useStats().today
  const ready = prizes.filter((p) => prizeDef(p.key) && !prizeUsed(p, { days, freezes }, today)).length
  return (
    <section>
      <SectionTitle>My rewards</SectionTitle>
      <Link to="/rewards#my-rewards" className="card p-4 flex items-center gap-3 hover:shadow-glow transition">
        <span className="size-11 shrink-0 rounded-2xl grid place-items-center text-2xl bg-lavender-100 dark:bg-lavender-500/20">🎁</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{ready > 0 ? `${ready} ${ready === 1 ? 'prize' : 'prizes'} ready to use` : 'No prizes waiting'}</div>
          <div className="text-xs text-muted">Prizes from your envelopes are kept in My rewards, in the Shop.</div>
        </div>
        <span className="text-xs font-semibold underline text-lavender-600 dark:text-lavender-300 shrink-0">View</span>
      </Link>
    </section>
  )
}

export const CAPSULE_FROM_DAY = 5
export const CAPSULE_UNTIL_DAY = 60

/** Write a letter to your Day 90 self. Once sealed it is hidden until the Day 90 envelope is opened. */
export function TimeCapsule() {
  const capsule = useStore((s) => s.capsule)
  const delivered = useStore((s) => !!s.envelopes.day90?.openedAt)
  const sealCapsule = useStore((s) => s.sealCapsule)
  const stats = useStats()
  const [text, setText] = useState('')
  const [confirming, setConfirming] = useState(false)
  if (!stats.started) return null
  const canRead = !!capsule && (delivered || stats.finished)
  if (!capsule && (stats.currentDay > CAPSULE_UNTIL_DAY || stats.finished)) return null
  return (
    <section id="capsule">
      <SectionTitle sub={capsule ? undefined : 'A letter to the you who finishes this. Sealed until Day 90.'}>Time capsule</SectionTitle>
      {canRead ? <CapsuleLetter /> : capsule ? (
        <Card className="flex items-center gap-3">
          <span className="text-3xl leading-none shrink-0">🔐</span>
          <div className="min-w-0"><div className="font-semibold">Sealed on Day {capsule.day}</div><div className="text-sm text-muted">Your letter comes back to you inside the Day 90 envelope.</div></div>
        </Card>
      ) : (
        <Card className="space-y-3">
          <p className="text-sm text-muted">Why did you start? What do you hope has changed by Day 90? What should that version of you remember? Nobody else reads this.</p>
          <textarea className="input min-h-36 resize-y" maxLength={4000} placeholder="Dear Day 90 me…" value={text} onChange={(e) => { setText(e.target.value); setConfirming(false) }} />
          {confirming ? (
            <div>
              <p className="text-sm text-center text-balance">Seal it? You won’t be able to read or change it until Day 90.</p>
              <div className="flex gap-2 mt-3"><button className="btn-soft flex-1" onClick={() => setConfirming(false)}>Keep writing</button><button className="btn-primary flex-1" onClick={() => { sealCapsule(text); setText(''); setConfirming(false); burst() }}>Seal it</button></div>
            </div>
          ) : (
            <button className="btn-primary w-full" disabled={text.trim().length < 20} onClick={() => setConfirming(true)}>{text.trim().length < 20 ? 'Write a few lines first' : 'Seal the letter'}</button>
          )}
        </Card>
      )}
    </section>
  )
}
