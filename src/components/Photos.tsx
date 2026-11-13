import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { Camera, Download, EyeOff, ImageOff, Trash2, Columns2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useUi } from '@/store/ui'
import { useSync, syncConfigured } from '@/store/sync'
import { usePhotos, usePhotoUrl, downloadPhoto } from '@/store/photos'
import { dayNumber, diffDays, formatDate, TOTAL_DAYS } from '@/lib/dates'
import type { ProgressPhoto } from '@/lib/types'
import { Card, Modal, SectionTitle } from './ui'

/** One photo, cropped to fill its box. Blurred when asked, so a glance at the screen gives nothing away. */
export function PhotoImg({ id, blur, contain, className }: { id: string; blur?: boolean; contain?: boolean; className?: string }) {
  const { url, state } = usePhotoUrl(id)
  return (
    <div className={clsx('relative overflow-hidden bg-card-2', className)}>
      {state === 'loading' && <div className="absolute inset-0 animate-pulse bg-line/60" />}
      {state === 'missing' && <div className="absolute inset-0 grid place-items-center text-muted p-2 text-center"><div><ImageOff size={18} className="mx-auto" /><div className="text-[10px] mt-1 leading-tight">Not on this device yet</div></div></div>}
      {url && <img src={url} alt="" draggable={false} className={clsx('size-full transition duration-300', contain ? 'object-contain' : 'object-cover', blur && 'blur-lg scale-125')} />}
    </div>
  )
}

function useCaption() {
  const start = useStore((s) => s.profile.startDate)
  const weights = useStore((s) => s.weights)
  const units = useStore((s) => s.profile.units)
  return (date: string) => {
    const n = start ? dayNumber(start, date) : 0
    const w = weights.find((x) => x.date === date)
    return {
      day: n >= 1 && n <= TOTAL_DAYS ? `Day ${n}` : null,
      date: formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' }),
      weight: w ? `${w.value} ${units}` : null,
      value: w?.value,
    }
  }
}

export function PhotoViewer({ photo, onClose }: { photo: ProgressPhoto | null; onClose: () => void }) {
  const removePhoto = useStore((s) => s.removePhoto)
  const caption = useCaption()
  const [confirming, setConfirming] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const close = () => { setConfirming(false); setNote(null); onClose() }
  const c = photo ? caption(photo.date) : null
  return (
    <Modal open={!!photo} onClose={close} title={c ? [c.day, c.date].filter(Boolean).join(' · ') : undefined} wide>
      {photo && c && (
        <div>
          <PhotoImg id={photo.id} contain className="w-full h-[60vh] rounded-2xl" />
          {c.weight && <div className="text-center text-sm text-muted mt-2">Weigh-in that day: <span className="text-ink font-semibold">{c.weight}</span></div>}
          {note && <div className="text-center text-sm text-rose-500 mt-2">{note}</div>}
          {confirming ? (
            <div className="mt-4">
              <p className="text-sm text-muted text-center">Delete this photo everywhere? This can’t be undone.</p>
              <div className="flex gap-2 mt-3"><button className="btn-soft flex-1" onClick={() => setConfirming(false)}>Keep it</button><button className="btn-danger flex-1" onClick={() => { removePhoto(photo.id); close() }}>Delete photo</button></div>
            </div>
          ) : (
            <div className="flex gap-2 mt-4">
              <button className="btn-soft flex-1" onClick={() => { void downloadPhoto(photo.id, photo.date).then((ok) => setNote(ok ? null : 'This photo isn’t available right now.')) }}><Download size={16} /> Save a copy</button>
              <button className="btn-ghost text-rose-500" onClick={() => setConfirming(true)} aria-label="Delete photo"><Trash2 size={16} /> Delete</button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export function PhotoCompare({ open, onClose }: { open: boolean; onClose: () => void }) {
  const photos = useStore((s) => s.photos)
  const units = useStore((s) => s.profile.units)
  const caption = useCaption()
  const [pick, setPick] = useState<{ a?: string; b?: string }>({})
  const a = photos.find((p) => p.id === pick.a) ?? photos[0]
  const b = photos.find((p) => p.id === pick.b) ?? photos[photos.length - 1]
  if (!a || !b) return <Modal open={open} onClose={onClose} title="Compare"><p className="text-sm text-muted">Add two photos to compare them.</p></Modal>
  const ca = caption(a.date)
  const cb = caption(b.date)
  const days = Math.abs(diffDays(a.date, b.date))
  const change = ca.value !== undefined && cb.value !== undefined ? (a.date <= b.date ? cb.value - ca.value : ca.value - cb.value) : null
  const side = (p: ProgressPhoto, c: ReturnType<typeof caption>, key: 'a' | 'b') => (
    <div className="min-w-0">
      <select className="input py-2 text-sm" value={p.id} onChange={(e) => setPick((s) => ({ ...s, [key]: e.target.value }))} aria-label={key === 'a' ? 'First photo' : 'Second photo'}>
        {photos.map((x) => { const cx = caption(x.date); return <option key={x.id} value={x.id}>{cx.day ? `${cx.day} · ` : ''}{formatDate(x.date, { month: 'short', day: 'numeric' })}</option> })}
      </select>
      <PhotoImg id={p.id} className="w-full aspect-[3/4] rounded-2xl mt-2" />
      <div className="text-center text-xs text-muted mt-1.5">{c.day ?? c.date}{c.weight ? ` · ${c.weight}` : ''}</div>
    </div>
  )
  return (
    <Modal open={open} onClose={onClose} title="Compare" wide>
      <div className="grid grid-cols-2 gap-3">{side(a, ca, 'a')}{side(b, cb, 'b')}</div>
      {a.id !== b.id && <div className="text-center text-sm mt-4"><span className="font-semibold">{days} {days === 1 ? 'day' : 'days'} apart</span>{change !== null && <span className="text-muted"> · {change > 0 ? '+' : ''}{change.toFixed(1)} {units}</span>}</div>}
    </Modal>
  )
}

/** Where the photos are kept, in one honest line. */
function BackupLine() {
  const signedIn = useSync((s) => !!s.userId)
  const waiting = usePhotos((s) => s.waiting)
  const backup = usePhotos((s) => s.backup)
  if (!syncConfigured || !signedIn) return <>Kept on this device only.{syncConfigured ? ' Sign in from Settings to back them up and see them on your other devices.' : ''}</>
  if (backup === 'unavailable') return <>Kept on this device only for now. Photo backup hasn’t been switched on for your account’s storage yet.</>
  if (waiting > 0) return <>{waiting} {waiting === 1 ? 'photo is' : 'photos are'} waiting to upload. Keep the app open with a connection.</>
  return <>Backed up to your account, and private to you.</>
}

export function ProgressPhotos() {
  const photos = useStore((s) => s.photos)
  const blur = useUi((s) => s.blurPhotos)
  const caption = useCaption()
  const [viewing, setViewing] = useState<string | null>(null)
  const [comparing, setComparing] = useState(false)
  const newestFirst = useMemo(() => [...photos].reverse(), [photos])
  const current = photos.find((p) => p.id === viewing) ?? null
  return (
    <section>
      <SectionTitle sub="A photo every week or two shows what the scale can’t." action={photos.length >= 2 ? <button className="btn-soft" onClick={() => setComparing(true)}><Columns2 size={16} /> Compare</button> : undefined}>Progress photos</SectionTitle>
      <Card>
        {photos.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-muted"><div className="size-11 shrink-0 rounded-2xl bg-card-2 grid place-items-center text-lavender-500"><Camera size={20} /></div><div>No photos yet. Add one with the <span className="text-ink font-medium">Photo</span> button in the check-in above. It’s optional, and a weight isn’t needed.</div></div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {newestFirst.map((p) => { const c = caption(p.date); return (
              <button key={p.id} onClick={() => setViewing(p.id)} className="relative rounded-2xl overflow-hidden text-left focus-visible:ring-2 ring-lavender-400" aria-label={`Open photo from ${c.date}`}>
                <PhotoImg id={p.id} blur={blur} className="w-full aspect-[3/4]" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-5 pb-1.5 text-white"><div className="text-xs font-semibold leading-tight">{c.day ?? formatDate(p.date, { month: 'short', day: 'numeric' })}</div><div className="text-[10px] opacity-80 leading-tight">{c.day ? formatDate(p.date, { month: 'short', day: 'numeric' }) : ''}{c.weight ? `${c.day ? ' · ' : ''}${c.weight}` : ''}</div></div>
                {blur && <div className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/40 text-white grid place-items-center"><EyeOff size={12} /></div>}
              </button>
            ) })}
          </div>
        )}
        {photos.length > 0 && <p className="text-xs text-muted mt-3"><BackupLine />{blur ? ' Blurred until you tap one.' : ''}</p>}
      </Card>
      <PhotoViewer photo={current} onClose={() => setViewing(null)} />
      <PhotoCompare open={comparing} onClose={() => setComparing(false)} />
    </section>
  )
}

/** First photo beside the latest one, for the chapter recap. Stays blurred until tapped if blur is on. */
export function RecapPhotos({ upTo }: { upTo: string }) {
  const photos = useStore((s) => s.photos)
  const blurSetting = useUi((s) => s.blurPhotos)
  const caption = useCaption()
  const [shown, setShown] = useState(false)
  const inRange = photos.filter((p) => p.date <= upTo)
  if (inRange.length < 2) return null
  const pair = [inRange[0], inRange[inRange.length - 1]]
  const blur = blurSetting && !shown
  return (
    <button type="button" className="block w-full mt-5 text-left" onClick={() => setShown((v) => !v)} aria-label={blur ? 'Show your photos' : 'Hide your photos'}>
      <div className="grid grid-cols-2 gap-2">
        {pair.map((p) => { const c = caption(p.date); return (
          <div key={p.id}><PhotoImg id={p.id} blur={blur} className="w-full aspect-[3/4] rounded-2xl" /><div className="text-center text-[11px] text-muted mt-1">{c.day ?? c.date}</div></div>
        ) })}
      </div>
      {blurSetting && <div className="text-center text-xs text-muted mt-1">{shown ? 'Tap to hide' : 'Tap to show your photos'}</div>}
    </button>
  )
}
