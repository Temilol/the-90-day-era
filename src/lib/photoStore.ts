/**
 * Progress photos on this device. The pictures themselves live in the browser's IndexedDB,
 * because they are far too big for the main saved data. Only a small id and date go there.
 */

const DB = 'era-photos'
const STORE = 'photos'

export interface PhotoRecord { id: string; data: ArrayBuffer; uploadedBy?: string }

let dbPromise: Promise<IDBDatabase> | null = null
function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'id' }) }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    dbPromise.catch(() => { dbPromise = null })
  }
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then((d) => new Promise<T>((resolve, reject) => {
    const tx = d.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  }))
}

export const photoGet = (id: string) => run<PhotoRecord | undefined>('readonly', (s) => s.get(id)).catch(() => undefined)
export const photoPut = (rec: PhotoRecord) => run('readwrite', (s) => s.put(rec)).then(() => true)
export const photoDelete = (id: string) => run('readwrite', (s) => s.delete(id)).then(() => true).catch(() => false)

export function newPhotoId(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** Shrink a picked photo to a sensible size. Phone photos are several MB; this lands around 200 KB. */
export async function shrinkPhoto(file: Blob, max = 1280, quality = 0.82): Promise<Blob> {
  let source: CanvasImageSource
  let w: number
  let h: number
  let cleanup = () => {}
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    source = bmp; w = bmp.width; h = bmp.height; cleanup = () => bmp.close()
  } catch {
    const url = URL.createObjectURL(file)
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('That file isn’t a photo this browser can open.'))
      i.src = url
    }).finally(() => setTimeout(() => URL.revokeObjectURL(url), 1000))
    source = img; w = img.naturalWidth; h = img.naturalHeight
  }
  const scale = Math.min(1, max / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  cleanup()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Could not prepare that photo.')
  return blob
}
