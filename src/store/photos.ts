import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { useStore } from './useStore'
import { useSync, getClient, PHOTO_BUCKET } from './sync'
import { photoGet, photoPut, photoDelete, newPhotoId, type PhotoRecord } from '@/lib/photoStore'
import { makeZip } from '@/lib/zip'

/**
 * Progress photos: saved on this device first, then copied to the signed-in account's private
 * storage folder. Other devices fetch a photo the first time they need to show it.
 */

const DELETE_KEY = 'era-photo-deletes'
const path = (uid: string, id: string) => `${uid}/${id}.jpg`

interface PhotoState {
  waiting: number // photos on this device not yet copied to the account
  backup: 'unknown' | 'ok' | 'unavailable' // 'unavailable' = storage isn't set up on the server
}
export const usePhotos = create<PhotoState>()(() => ({ waiting: 0, backup: 'unknown' }))

// ---------- showing a photo ----------
const urls = new Map<string, string>()
const loading = new Map<string, Promise<string | null>>()

async function fetchRecord(id: string): Promise<PhotoRecord | null> {
  const local = await photoGet(id)
  if (local) return local
  const client = getClient()
  const uid = useSync.getState().userId
  if (!client || !uid) return null
  const { data, error } = await client.storage.from(PHOTO_BUCKET).download(path(uid, id))
  if (error || !data) return null
  const rec: PhotoRecord = { id, data: await data.arrayBuffer(), uploadedBy: uid }
  await photoPut(rec).catch(() => false)
  return rec
}

export function loadPhotoUrl(id: string): Promise<string | null> {
  const ready = urls.get(id)
  if (ready) return Promise.resolve(ready)
  let p = loading.get(id)
  if (!p) {
    p = fetchRecord(id).then((rec) => {
      if (!rec) return null
      const url = URL.createObjectURL(new Blob([rec.data], { type: 'image/jpeg' }))
      urls.set(id, url)
      return url
    }).catch(() => null).finally(() => { loading.delete(id) })
    loading.set(id, p)
  }
  return p
}

export function usePhotoUrl(id: string | undefined): { url?: string; state: 'loading' | 'ready' | 'missing' } {
  const uid = useSync((s) => s.userId)
  const [got, setGot] = useState<{ id: string; url: string | null } | null>(() => (id && urls.has(id) ? { id, url: urls.get(id)! } : null))
  useEffect(() => {
    if (!id) return
    let live = true
    void loadPhotoUrl(id).then((url) => { if (live) setGot({ id, url }) })
    return () => { live = false }
  }, [id, uid])
  if (!id) return { state: 'missing' }
  if (!got || got.id !== id) return { state: 'loading' }
  return got.url ? { url: got.url, state: 'ready' } : { state: 'missing' }
}

// ---------- adding ----------
/** Store an already-shrunk photo on this device and attach it to a date. */
export async function savePhoto(date: string, blob: Blob): Promise<string> {
  const id = newPhotoId()
  await photoPut({ id, data: await blob.arrayBuffer() })
  useStore.getState().addPhoto(date, id)
  return id
}

// ---------- copying to the account ----------
function readDeletes(): string[] {
  try { const v = JSON.parse(localStorage.getItem(DELETE_KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
function writeDeletes(ids: string[]) {
  try { localStorage.setItem(DELETE_KEY, JSON.stringify(ids.slice(-500))) } catch { /* ignore */ }
}

let running = false
let rerun = false
let timer: ReturnType<typeof setTimeout> | null = null

export async function syncPhotos(): Promise<void> {
  const client = getClient()
  const uid = useSync.getState().userId
  if (running) { rerun = true; return }
  running = true
  try {
    const photos = useStore.getState().photos ?? []
    if (!client || !uid) {
      let waiting = 0
      for (const p of photos) if (await photoGet(p.id)) waiting++
      usePhotos.setState({ waiting })
      return
    }
    const bucket = client.storage.from(PHOTO_BUCKET)

    const gone = readDeletes()
    if (gone.length) {
      const { error } = await bucket.remove(gone.map((id) => path(uid, id)))
      if (!error) writeDeletes(readDeletes().filter((id) => !gone.includes(id)))
    }

    let waiting = 0
    let unavailable = false
    for (const p of photos) {
      const rec = await photoGet(p.id)
      if (!rec || rec.uploadedBy === uid) continue
      if (unavailable) { waiting++; continue }
      const { error } = await bucket.upload(path(uid, p.id), new Blob([rec.data], { type: 'image/jpeg' }), { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
      if (!error || /already exists|duplicate/i.test(error.message)) {
        // Only mark it if it is still wanted; it may have been deleted while uploading.
        if (useStore.getState().photos.some((x) => x.id === p.id)) await photoPut({ ...rec, uploadedBy: uid }).catch(() => false)
      } else {
        waiting++
        if (/bucket not found|not found/i.test(error.message)) unavailable = true
      }
    }
    usePhotos.setState({ waiting, backup: unavailable ? 'unavailable' : 'ok' })
  } catch {
    /* offline or storage hiccup: try again on the next trigger */
  } finally {
    running = false
    if (rerun) { rerun = false; schedule(500) }
  }
}

function schedule(delay = 1200) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { timer = null; void syncPhotos() }, delay)
}

if (typeof window !== 'undefined') {
  // A photo that leaves the saved data (deleted, replaced, reset, or removed on another device)
  // is removed from this device and from the account.
  useStore.subscribe((state, prev) => {
    if (state.photos === prev.photos) return
    const keep = new Set((state.photos ?? []).map((p) => p.id))
    const gone = (prev.photos ?? []).filter((p) => !keep.has(p.id)).map((p) => p.id)
    if (gone.length) {
      writeDeletes([...readDeletes(), ...gone])
      for (const id of gone) {
        void photoDelete(id)
        const url = urls.get(id)
        if (url) { URL.revokeObjectURL(url); urls.delete(id) }
      }
    }
    schedule()
  })
  useSync.subscribe((state, prev) => { if (state.userId !== prev.userId) schedule(300) })
  window.addEventListener('online', () => schedule(300))
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(300) })
  schedule(1500)
}

// ---------- taking a copy out ----------
function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export async function downloadPhoto(id: string, date: string): Promise<boolean> {
  const rec = await fetchRecord(id)
  if (!rec) return false
  download(new Blob([rec.data], { type: 'image/jpeg' }), `90-day-era-${date}.jpg`)
  return true
}

/** Every photo in one .zip. Returns how many made it in and how many could not be fetched. */
export async function downloadAllPhotos(): Promise<{ saved: number; missed: number }> {
  const photos = useStore.getState().photos ?? []
  const files: { name: string; data: Uint8Array }[] = []
  let missed = 0
  for (const p of photos) {
    const rec = await fetchRecord(p.id)
    if (rec) files.push({ name: `${p.date}.jpg`, data: new Uint8Array(rec.data) })
    else missed++
  }
  if (files.length) download(new Blob([makeZip(files) as BlobPart], { type: 'application/zip' }), '90-day-era-photos.zip')
  return { saved: files.length, missed }
}
