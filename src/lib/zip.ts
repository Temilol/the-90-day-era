/** A tiny uncompressed .zip writer. Photos are already compressed, so storing them as-is loses nothing. */

let table: Uint32Array | null = null
export function crc32(data: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export interface ZipFile { name: string; data: Uint8Array }

export function makeZip(files: ZipFile[], when = new Date()): Uint8Array {
  const enc = new TextEncoder()
  const time = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1)
  const date = ((Math.max(1980, when.getFullYear()) - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate()
  const entries = files.map((f) => ({ name: enc.encode(f.name), data: f.data, crc: crc32(f.data), offset: 0 }))
  const size = entries.reduce((n, e) => n + 30 + e.name.length + e.data.length + 46 + e.name.length, 22)
  const out = new Uint8Array(size)
  const view = new DataView(out.buffer)
  let p = 0
  const u16 = (v: number) => { view.setUint16(p, v, true); p += 2 }
  const u32 = (v: number) => { view.setUint32(p, v, true); p += 4 }
  const bytes = (b: Uint8Array) => { out.set(b, p); p += b.length }

  for (const e of entries) {
    e.offset = p
    u32(0x04034b50); u16(20); u16(0x0800); u16(0); u16(time); u16(date)
    u32(e.crc); u32(e.data.length); u32(e.data.length); u16(e.name.length); u16(0)
    bytes(e.name); bytes(e.data)
  }
  const dirStart = p
  for (const e of entries) {
    u32(0x02014b50); u16(20); u16(20); u16(0x0800); u16(0); u16(time); u16(date)
    u32(e.crc); u32(e.data.length); u32(e.data.length); u16(e.name.length); u16(0); u16(0); u16(0); u16(0); u32(0); u32(e.offset)
    bytes(e.name)
  }
  const dirSize = p - dirStart
  u32(0x06054b50); u16(0); u16(0); u16(entries.length); u16(entries.length); u32(dirSize); u32(dirStart); u16(0)
  return out
}
