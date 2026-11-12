import { useState } from 'react'
import { clsx } from 'clsx'
import { useStore } from '@/store/useStore'
import { useStats } from '@/lib/hooks'
import { PageHeader, Card, Modal, Progress, SectionTitle, Empty } from '@/components/ui'
import { burst } from '@/components/Celebrate'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Reward } from '@/lib/types'

export default function Shop() {
  const stats = useStats()
  const rewards = useStore((s) => s.rewards)
  const purchases = useStore((s) => s.purchases)
  const buy = useStore((s) => s.buyReward)
  const redeem = useStore((s) => s.redeemPurchase)
  const addReward = useStore((s) => s.addReward)
  const updateReward = useStore((s) => s.updateReward)
  const removeReward = useStore((s) => s.removeReward)
  const [edit, setEdit] = useState<Partial<Reward> | null>(null)
  const [confirmBuy, setConfirmBuy] = useState<Reward | null>(null)

  const save = () => {
    if (!edit?.name?.trim() || !edit.cost || edit.cost <= 0) return
    if (edit.id) updateReward(edit.id, { name: edit.name.trim(), cost: Math.round(edit.cost), emoji: edit.emoji || '🎁' })
    else addReward({ name: edit.name.trim(), cost: Math.round(edit.cost), emoji: edit.emoji || '🎁' })
    setEdit(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reward Shop" emoji="🛍️" sub="Spend XP on real-life treats. Your level never drops." action={<button className="btn-soft" onClick={() => setEdit({ emoji: '🎁', cost: 150 })}><Plus size={16} /> Add</button>} />
      <Card className="flex items-center gap-4 bg-gradient-to-br from-lavender-50 to-blush-50 dark:from-lavender-500/15 dark:to-blush-500/10">
        <div className="text-4xl">💎</div>
        <div className="flex-1"><div className="text-xs font-bold uppercase tracking-wider text-muted">Balance</div><div className="h-display text-3xl gradient-text">{stats.spendableXp} XP</div><div className="text-xs text-muted">{stats.spentXp} spent · {stats.lifetimeXp} earned</div></div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        {[...rewards].sort((a, b) => a.cost - b.cost).map((r) => {
          const can = stats.spendableXp >= r.cost
          const owned = purchases.filter((p) => p.rewardId === r.id).length
          return (
            <div key={r.id} className={clsx('card p-4 flex items-center gap-4', can && 'ring-1 ring-lavender-300')}>
              <div className="size-14 rounded-2xl grid place-items-center text-3xl bg-gradient-to-br from-lavender-100 to-blush-100 dark:from-lavender-500/30 dark:to-blush-500/20">{r.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{r.name}</div>
                <div className="text-xs text-muted">{r.cost} XP{owned ? ` · unlocked ×${owned}` : ''}</div>
                {!can && <Progress value={stats.spendableXp / r.cost} className="mt-2" height="h-1.5" />}
              </div>
              <div className="flex flex-col items-end gap-1">
                <button className={can ? 'btn-primary !py-1.5' : 'btn-soft !py-1.5'} disabled={!can} onClick={() => setConfirmBuy(r)}>{can ? 'Unlock' : `${r.cost - stats.spendableXp} more`}</button>
                <div className="flex gap-1">
                  <button className="btn-ghost p-1.5" onClick={() => setEdit(r)} aria-label="Edit"><Pencil size={14} /></button>
                  <button className="btn-ghost p-1.5" onClick={() => { if (confirm(`Remove "${r.name}" from the shop?`)) removeReward(r.id) }} aria-label="Remove"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <section>
        <SectionTitle sub="Tap to mark a reward as enjoyed.">My rewards</SectionTitle>
        {purchases.length === 0 ? <Empty emoji="🎀" title="Nothing unlocked yet" sub="Your first 100 XP is about four standard walks away." /> : (
          <div className="space-y-2">
            {[...purchases].reverse().map((p) => (
              <button key={p.id} onClick={() => redeem(p.id)} className={clsx('card w-full p-3 flex items-center gap-3 text-left', p.redeemed && 'opacity-60')}>
                <span className="text-2xl">{rewards.find((r) => r.id === p.rewardId)?.emoji ?? '🎁'}</span>
                <div className="flex-1"><div className={clsx('font-medium', p.redeemed && 'line-through')}>{p.name}</div><div className="text-xs text-muted">{p.cost} XP · {new Date(p.at).toLocaleDateString()}{p.redeemed ? ' · enjoyed ✓' : ' · tap when enjoyed'}</div></div>
              </button>
            ))}
          </div>
        )}
      </section>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit reward' : 'New reward'}>
        {edit && (
          <div className="space-y-3">
            <div className="grid grid-cols-[72px_1fr] gap-3">
              <div><label className="label">Icon</label><input className="input text-center text-xl" value={edit.emoji || ''} onChange={(e) => setEdit({ ...edit, emoji: e.target.value.slice(0, 4) })} /></div>
              <div><label className="label">Reward</label><input className="input" placeholder="A new book, a nail appointment…" value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></div>
            </div>
            <div><label className="label">Cost (XP)</label><input type="number" min={5} step={5} className="input" value={edit.cost ?? ''} onChange={(e) => setEdit({ ...edit, cost: +e.target.value })} /></div>
            <button className="btn-primary w-full" onClick={save}>Save</button>
          </div>
        )}
      </Modal>

      <Modal open={!!confirmBuy} onClose={() => setConfirmBuy(null)} title="Unlock reward?">
        {confirmBuy && (
          <div className="text-center">
            <div className="text-5xl">{confirmBuy.emoji}</div>
            <div className="h-display text-xl mt-2">{confirmBuy.name}</div>
            <div className="text-muted text-sm mt-1">Spend {confirmBuy.cost} XP. You’ll have {stats.spendableXp - confirmBuy.cost} XP left. Level stays the same.</div>
            <button className="btn-primary w-full mt-5" onClick={() => { if (buy(confirmBuy.id)) burst({ big: true }); setConfirmBuy(null) }}>Treat myself</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
