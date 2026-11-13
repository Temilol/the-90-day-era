import { useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useStore } from '@/store/useStore'
import { todayKey, formatDate } from '@/lib/dates'
import { PageHeader, Card, SectionTitle, Empty } from '@/components/ui'
import { hearts } from '@/components/Celebrate'
import { Trash2, Camera, X } from 'lucide-react'
import { shrinkPhoto } from '@/lib/photoStore'
import { savePhoto } from '@/store/photos'
import { useUi } from '@/store/ui'
import { ProgressPhotos, PhotoImg, PhotoViewer } from '@/components/Photos'
import { clsx } from 'clsx'

const NSV_CATS = [['💨', 'Endurance'], ['👖', 'Clothes fit'], ['⚡', 'Energy'], ['💁‍♀️', 'Confidence'], ['📈', 'Consistency'], ['😴', 'Sleep'], ['🌈', 'Mood'], ['✨', 'Other']]

export default function Weight() {
  const weights = useStore((s) => s.weights)
  const nsvs = useStore((s) => s.nsvs)
  const units = useStore((s) => s.profile.units)
  const addWeight = useStore((s) => s.addWeight)
  const removeWeight = useStore((s) => s.removeWeight)
  const addNsv = useStore((s) => s.addNsv)
  const removeNsv = useStore((s) => s.removeNsv)
  const [date, setDate] = useState(todayKey())
  const [value, setValue] = useState('')
  const [cat, setCat] = useState(NSV_CATS[0][1])
  const [text, setText] = useState('')
  const photos = useStore((s) => s.photos)
  const blur = useUi((s) => s.blurPhotos)
  const fileRef = useRef<HTMLInputElement>(null)
  const [staged, setStaged] = useState<{ blob: Blob; url: string } | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [formMsg, setFormMsg] = useState<string | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const clearStaged = () => { if (staged) URL.revokeObjectURL(staged.url); setStaged(null) }
  const pickPhoto = async (f: File) => {
    setPhotoBusy(true); setFormMsg(null)
    try {
      const blob = await shrinkPhoto(f)
      if (staged) URL.revokeObjectURL(staged.url)
      setStaged({ blob, url: URL.createObjectURL(blob) })
    } catch (e) {
      setFormMsg(e instanceof Error ? e.message : 'Could not open that photo.')
    } finally { setPhotoBusy(false) }
  }
  const saveCheckIn = async () => {
    const v = parseFloat(value)
    const hasWeight = !isNaN(v) && v > 0
    if (!hasWeight && !staged) { setFormMsg('Add a weight, a photo, or both.'); return }
    setFormMsg(null)
    if (staged) {
      try { await savePhoto(date, staged.blob) } catch { setFormMsg('This browser wouldn’t store the photo. Private browsing can block it.'); return }
      clearStaged()
    }
    if (hasWeight) { addWeight(date, v); setValue('') }
    hearts()
  }
  const photoOn = (d: string) => photos.find((p) => p.date === d)
  const first = weights[0]?.value
  const last = weights[weights.length - 1]?.value
  const data = weights.map((w) => ({ ...w, label: formatDate(w.date, { month: 'short', day: 'numeric' }) }))

  return (
    <div className="space-y-6">
      <PageHeader title="Weight & Wins" emoji="⚖️" sub="Optional. Weigh in when you want to, and give the non-scale victories equal billing." />

      <section>
        <SectionTitle sub="Trend over time matters more than any single number. Weekly is plenty. A photo can go with a weigh-in, or stand alone.">Check-in</SectionTitle>
        <Card>
          <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); void saveCheckIn() }}>
            <input type="date" className="input sm:w-44" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} />
            <input type="number" step="0.1" min="1" className="input" placeholder={`Weight (${units})`} value={value} onChange={(e) => setValue(e.target.value)} />
            <button type="button" className="btn-soft shrink-0" disabled={photoBusy} onClick={() => fileRef.current?.click()}><Camera size={16} /> {photoBusy ? 'Preparing…' : staged ? 'Change photo' : 'Photo'}</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickPhoto(f); e.target.value = '' }} />
            <button className="btn-primary" type="submit" disabled={photoBusy}>Save</button>
          </form>
          {staged && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-card-2 p-2 text-sm">
              <img src={staged.url} alt="" className="size-14 rounded-xl object-cover" />
              <div className="flex-1 min-w-0"><div className="font-medium">Photo ready for {formatDate(date, { month: 'short', day: 'numeric' })}</div><div className="text-xs text-muted">{photoOn(date) ? 'Saving replaces the photo already on this date.' : 'Press Save to keep it.'}</div></div>
              <button type="button" className="btn-ghost p-2" onClick={clearStaged} aria-label="Remove photo"><X size={16} /></button>
            </div>
          )}
          {formMsg && <div role="status" className="text-sm text-rose-500 mt-2">{formMsg}</div>}
          {weights.length >= 2 && (
            <div className="mt-4 h-56">
              <ResponsiveContainer>
                <LineChart data={data} margin={{ left: -10, right: 10, top: 10 }}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, color: 'var(--ink)' }} formatter={(v) => [`${v} ${units}`, 'Weight']} />
                  <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={3} dot={{ fill: '#f472b6', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {weights.length >= 2 && <div className="text-sm text-muted mt-2 text-center">{first} → {last} {units} ({(last - first) > 0 ? '+' : ''}{(last - first).toFixed(1)} {units} since first entry)</div>}
          {weights.length > 0 && (
            <div className="mt-4 max-h-44 overflow-y-auto divide-y divide-line text-sm">
              {[...weights].reverse().map((w) => { const ph = photoOn(w.date); return <div key={w.date} className="flex items-center gap-2 py-1.5"><span className="text-muted flex-1">{formatDate(w.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>{ph && <button onClick={() => setViewing(ph.id)} aria-label="Open the photo from this day" className="rounded-lg overflow-hidden"><PhotoImg id={ph.id} blur={blur} className="size-7" /></button>}<span className="font-semibold w-20 text-right">{w.value} {units}</span><button className="btn-ghost p-1" onClick={() => removeWeight(w.date)} aria-label="Delete weigh-in"><Trash2 size={14} /></button></div> })}
            </div>
          )}
          {weights.length === 0 && <p className="text-xs text-muted mt-3">No entries yet. This is optional, and totally fine to skip.</p>}
        </Card>
      </section>

      <ProgressPhotos />
      <PhotoViewer photo={photos.find((p) => p.id === viewing) ?? null} onClose={() => setViewing(null)} />

      <section>
        <SectionTitle sub="Things the scale can’t measure.">Non-scale victories</SectionTitle>
        <Card>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {NSV_CATS.map(([e, c]) => <button key={c} onClick={() => setCat(c)} className={clsx('chip shrink-0 py-1.5', cat === c ? 'bg-lavender-500 text-white' : 'bg-card-2 text-muted')}>{e} {c}</button>)}
          </div>
          <form className="flex gap-2 mt-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { addNsv(cat, text.trim()); setText(''); hearts() } }}>
            <input className="input" placeholder="Took the stairs without stopping…" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn-primary" type="submit">Add</button>
          </form>
          <div className="mt-4 space-y-2">
            {nsvs.length === 0 ? <Empty emoji="🪄" title="No victories yet" sub="They add up faster than you think." /> : nsvs.map((n) => (
              <div key={n.id} className="flex items-start gap-3 rounded-2xl bg-card-2 p-3 text-sm">
                <span className="text-xl">{NSV_CATS.find((c) => c[1] === n.category)?.[0] ?? '✨'}</span>
                <div className="flex-1"><div>{n.text}</div><div className="text-xs text-muted">{n.category} · {formatDate(n.date)}</div></div>
                <button className="btn-ghost p-1" onClick={() => removeNsv(n.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
