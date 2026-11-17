import { useState } from 'react'
import { clsx } from 'clsx'
import { readyPrizes } from '@/lib/prizes'
import { prizeDef } from '@/content/envelopes'
import { todayKey } from '@/lib/dates'
import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { Card, Modal, Progress, Empty, confirmDialog } from '@/components/ui'
import { burst } from '@/components/Celebrate'
import { Plus, Trash2, ImagePlus, ExternalLink, X } from 'lucide-react'
import { XP } from '@/lib/xp'
import { useRef } from 'react'
import type { Reward } from '@/lib/types'
import { OwedNote } from '@/components/OwedNote'

export function ShopPanel() {
  const stats = useStats()
  const rewards = useStore((s) => s.rewards)
  const purchases = useStore((s) => s.purchases)
  const buy = useStore((s) => s.buyReward)
  const redeem = useStore((s) => s.redeemPurchase)
  const addReward = useStore((s) => s.addReward)
  const updateReward = useStore((s) => s.updateReward)
  const removeReward = useStore((s) => s.removeReward)
  const [edit, setEdit] = useState<Partial<Reward> | null>(null)
  const [view, setView] = useState<'wish' | 'mine'>('wish')
  const [confirmBuy, setConfirmBuy] = useState<Reward | null>(null)
  const prizes = useStore((s) => s.prizes)
  const allDays = useStore((s) => s.days)
  const freezes = useStore((s) => s.freezes)
  const coupons = readyPrizes({ prizes, days: allDays, freezes }, 'discount', todayKey()).map((p) => ({ id: p.id, pct: prizeDef(p.key)?.pct ?? 0 })).sort((a, b) => b.pct - a.pct)
  const [couponId, setCouponId] = useState<string | null>(null)
  const coupon = coupons.find((c) => c.id === couponId)
  const priceOf = (r: Reward, pct = 0) => Math.round(r.cost * (1 - pct / 100))
  const bestPct = coupons[0]?.pct ?? 0

  const fileRef = useRef<HTMLInputElement>(null)
  const save = () => {
    if (!edit?.name?.trim() || !edit.cost || edit.cost <= 0) return
    const fields = { name: edit.name.trim(), cost: Math.round(edit.cost), emoji: edit.emoji || '🎁', image: edit.image, budget: edit.budget && edit.budget > 0 ? Math.round(edit.budget) : undefined, link: edit.link?.trim() || undefined, note: edit.note?.trim() || undefined }
    if (edit.id) updateReward(edit.id, fields)
    else addReward(fields)
    setEdit(null)
  }
  const pickImage = async (f: File) => {
    const url = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f) })
    const img = await new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = url })
    const max = 480
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    setEdit((e) => ({ ...e, image: c.toDataURL('image/jpeg', 0.8) }))
  }
  const locked = !!edit?.id && !edit.custom
  const waiting = purchases.filter((p) => !p.redeemed).length
  const walksAway = (xp: number) => Math.max(1, Math.ceil(xp / XP.walkFull))

  return (
    <div className="space-y-6">
      <Card className="flex items-center gap-4 bg-gradient-to-br from-lavender-50 to-blush-50 dark:from-lavender-500/15 dark:to-blush-500/10">
        <div className="text-4xl">💎</div>
        <div className="flex-1 min-w-0"><div className="text-xs font-bold uppercase tracking-wider text-muted">Balance</div><div className="h-display text-3xl gradient-text">{stats.balanceXp} XP</div><div className="text-xs text-muted">{stats.spentXp} spent · {stats.lifetimeXp} earned</div><OwedNote owed={stats.owedXp} /></div>
      </Card>

      <div role="tablist" aria-label="Shop sections" className="grid grid-cols-2 gap-1 rounded-full bg-card-2 p-1 text-sm font-semibold">
        {([['wish', 'Wishlist'], ['mine', 'My rewards']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={clsx('rounded-full py-2 text-center transition inline-flex items-center justify-center gap-1.5', view === id ? 'bg-card shadow-soft text-ink' : 'text-muted')}>
            {label}
            {id === 'mine' && waiting > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-blush-500 text-white text-[11px] font-bold grid place-items-center" aria-label={`${waiting} waiting to be enjoyed`}>{waiting}</span>}
          </button>
        ))}
      </div>

      {view === 'wish' ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted min-w-0">Tap a reward to edit it. Add a photo or link so you can see what you’re walking toward.</p>
            <button className="btn-soft shrink-0" onClick={() => setEdit({ emoji: '🎁', cost: 150 })}><Plus size={16} /> Add</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[...rewards].sort((a, b) => a.cost - b.cost).map((r) => {
              const can = stats.spendableXp >= priceOf(r, bestPct)
              const owned = purchases.filter((p) => p.rewardId === r.id).length
              return (
                <div key={r.id} className={clsx('card overflow-hidden', can && 'ring-2 ring-lavender-300')}>
                  {r.image && <button type="button" onClick={() => setEdit(r)} aria-label={`Edit ${r.name}`} className="block w-full"><img src={r.image} alt="" className="w-full h-36 object-cover" /></button>}
                  <div className="p-4 flex items-center gap-3">
                    <button type="button" onClick={() => setEdit(r)} aria-label={`Edit ${r.name}`} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                      {!r.image && <div className="size-11 sm:size-14 shrink-0 rounded-2xl grid place-items-center text-2xl sm:text-3xl bg-gradient-to-br from-lavender-100 to-blush-100 dark:from-lavender-500/30 dark:to-blush-500/20">{r.emoji}</div>}
                      <div className="min-w-0">
                        <div className="font-semibold leading-tight break-words">{r.image && <span className="mr-1">{r.emoji}</span>}{r.name}</div>
                        <div className="text-xs text-muted">{r.cost} XP{r.budget ? ` · up to $${r.budget}` : ''}{owned ? ` · unlocked ×${owned}` : ''}{!can && ` · about ${walksAway(r.cost - stats.spendableXp)} more walk${walksAway(r.cost - stats.spendableXp) === 1 ? '' : 's'}`}</div>
                        {r.note && <div className="text-xs text-muted italic truncate mt-0.5">{r.note}</div>}
                      </div>
                    </button>
                    {can
                      ? <button className="btn-primary !py-1.5 shrink-0" onClick={() => { setCouponId(stats.spendableXp >= r.cost ? null : coupons.find((c) => stats.spendableXp >= priceOf(r, c.pct))?.id ?? null); setConfirmBuy(r) }}>Unlock</button>
                      : <span className="text-xs text-muted text-right shrink-0">{r.cost - stats.spendableXp} XP<br />to go</span>}
                  </div>
                  {(r.link || !can) && (
                    <div className="px-4 pb-4 -mt-1">
                      {r.link && <a href={r.link} target="_blank" rel="noreferrer" className="text-xs text-lavender-600 dark:text-lavender-300 font-medium inline-flex items-center gap-1"><ExternalLink size={11} /> Open link</a>}
                      {!can && <Progress value={stats.balanceXp / r.cost} className={r.link ? 'mt-2' : ''} height="h-1.5" />}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <section>
          <p className="text-sm text-muted mb-3">Tap a reward to mark it as enjoyed.</p>
          {purchases.length === 0 ? <Empty emoji="🎀" title="Nothing unlocked yet" sub="Your first 100 XP is about four standard walks away." /> : (
            <div className="space-y-2">
              {[...purchases].reverse().map((p) => (
                <button key={p.id} onClick={() => redeem(p.id)} className={clsx('card w-full p-3 flex items-center gap-3 text-left', p.redeemed && 'opacity-60')}>
                  <span className="text-2xl">{rewards.find((r) => r.id === p.rewardId)?.emoji ?? '🎁'}</span>
                  <div className="flex-1"><div className={clsx('font-medium', p.redeemed && 'line-through')}>{p.name}</div><div className="text-xs text-muted">{p.cost} XP{rewards.find((r) => r.id === p.rewardId)?.budget ? ` · up to $${rewards.find((r) => r.id === p.rewardId)!.budget}` : ''} · {new Date(p.at).toLocaleDateString()}{p.redeemed ? ' · enjoyed ✓' : ' · tap when enjoyed'}</div></div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit reward' : 'New reward'}>
        {edit && (
          <div className="space-y-3">
            {locked ? (
              <div className="flex items-center gap-3 rounded-2xl bg-card-2 p-3">
                <div className="size-11 shrink-0 rounded-2xl grid place-items-center text-2xl bg-gradient-to-br from-lavender-100 to-blush-100 dark:from-lavender-500/30 dark:to-blush-500/20">{edit.emoji}</div>
                <div className="min-w-0"><div className="font-semibold leading-tight break-words">{edit.name}</div><div className="text-xs text-muted">{edit.cost} XP · name and price are set by the app</div></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[72px_1fr] gap-3">
                  <div><label className="label">Icon</label><input className="input text-center text-xl" value={edit.emoji || ''} onChange={(e) => setEdit({ ...edit, emoji: e.target.value.slice(0, 4) })} /></div>
                  <div><label className="label">Reward</label><input className="input" placeholder="A new book, a nail appointment…" value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></div>
                </div>
                <div><label className="label">Cost (XP)</label><input type="number" min={5} step={5} className="input" value={edit.cost ?? ''} onChange={(e) => setEdit({ ...edit, cost: +e.target.value })} /></div>
              </>
            )}
            <div><label className="label">Budget cap ($)</label><input type="number" min={0} step={5} className="input" placeholder="optional" value={edit.budget ?? ''} onChange={(e) => setEdit({ ...edit, budget: e.target.value === '' ? undefined : +e.target.value })} /></div>
            {!!edit.cost && edit.cost > 0 && <div className="text-xs text-muted -mt-1">About {walksAway(edit.cost)} standard walks from zero.{edit.budget ? ` Spend up to $${edit.budget} when you unlock it.` : ''}</div>}
            <div>
              <label className="label">Wishlist photo (optional)</label>
              {edit.image ? (
                <div className="relative"><img src={edit.image} alt="" className="w-full h-36 object-cover rounded-2xl" /><button className="absolute top-2 right-2 size-7 rounded-full bg-black/50 text-white grid place-items-center" onClick={() => setEdit({ ...edit, image: undefined })}><X size={14} /></button></div>
              ) : (
                <button className="btn-soft w-full" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> Add a photo of the thing</button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.target.value = '' }} />
            </div>
            <div><label className="label">Link (optional)</label><input className="input" placeholder="https://…" inputMode="url" value={edit.link || ''} onChange={(e) => setEdit({ ...edit, link: e.target.value })} /></div>
            <div><label className="label">Note to self (optional)</label><input className="input" placeholder="Lilac, size M. Book the Sunday slot." value={edit.note || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></div>
            <button className="btn-primary w-full" onClick={save}>Save</button>
            {edit.id && (
              <button type="button" className="btn-soft w-full !text-rose-500" onClick={async () => { if (await confirmDialog(`Remove “${edit.name}” from the shop?`, { confirmLabel: 'Remove', cancelLabel: 'Keep it', danger: true })) { removeReward(edit.id!); setEdit(null) } }}><Trash2 size={16} /> Remove from the shop</button>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!confirmBuy} onClose={() => setConfirmBuy(null)} title="Unlock reward?">
        {confirmBuy && (
          <div className="text-center">
            <div className="text-5xl">{confirmBuy.emoji}</div>
            <div className="h-display text-xl mt-2">{confirmBuy.name}</div>
            <div className="text-muted text-sm mt-1 text-balance">Spend {priceOf(confirmBuy, coupon?.pct)} XP{coupon ? ` (was ${confirmBuy.cost})` : ''}. You’ll have {stats.spendableXp - priceOf(confirmBuy, coupon?.pct)} XP left. Level stays the same.</div>
            {coupons.length > 0 && (
              <div className="mt-3 space-y-1.5 text-left">
                {coupons.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 rounded-2xl bg-card-2 p-3 text-sm cursor-pointer">
                    <input type="checkbox" className="size-4 accent-lavender-500 shrink-0" checked={couponId === c.id} onChange={() => setCouponId(couponId === c.id ? null : c.id)} />
                    <span className="min-w-0">🎟️ Use your {c.pct}% off<span className="block text-xs text-muted">Saves {confirmBuy.cost - priceOf(confirmBuy, c.pct)} XP. From a mystery envelope.</span></span>
                  </label>
                ))}
              </div>
            )}
            {confirmBuy.budget && <div className="chip bg-gold-300/50 text-ink mt-3">Budget: up to ${confirmBuy.budget}</div>}
            <button className="btn-primary w-full mt-5" disabled={stats.spendableXp < priceOf(confirmBuy, coupon?.pct)} onClick={() => { if (buy(confirmBuy.id, coupon?.id)) burst({ big: true }); setConfirmBuy(null); setCouponId(null) }}>{stats.spendableXp < priceOf(confirmBuy, coupon?.pct) ? 'Not enough XP without the discount' : 'Treat myself'}</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
