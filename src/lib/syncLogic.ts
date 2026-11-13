/** Pure decision logic for cloud sync, kept separate so it can be unit tested. */

export interface SyncMeta {
  userId: string | null // account this device last synced with
  version: number // cloud row version this device last saw (0 = none)
  dirty: boolean // local changes not yet pushed
  lastSyncedAt: string | null
}

export const EMPTY_META: SyncMeta = { userId: null, version: 0, dirty: false, lastSyncedAt: null }

export type SyncDecision =
  | 'noop' // nothing to do
  | 'create' // no cloud copy yet: upload this device's data
  | 'push' // only this device changed
  | 'pull' // only the cloud changed, or this device is empty
  | 'ask' // both sides have data that could be lost: the person decides

export function decide(input: { uid: string; meta: SyncMeta; remoteVersion: number | null; localHasData: boolean }): SyncDecision {
  const { uid, meta, remoteVersion, localHasData } = input
  const known = meta.userId === uid

  if (remoteVersion === null) return localHasData ? 'create' : 'noop'

  // First time this device meets this account.
  if (!known) return localHasData ? 'ask' : 'pull'

  if (remoteVersion === meta.version) return meta.dirty ? 'push' : 'noop'

  // The cloud moved on since this device last synced.
  return meta.dirty ? 'ask' : 'pull'
}
