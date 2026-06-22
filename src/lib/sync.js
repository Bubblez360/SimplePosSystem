import { supabase } from './supabase'
import { getDB, syncIdentity, markSyncedByIdentity, hasUnsynced } from '../db/db'

const STORES = ['items', 'categories', 'sales', 'expenses']
// Money data is append-only and irreplaceable: merge on pull, never wipe.
const MERGE_STORES = ['sales', 'expenses']
// Catalog is editable and regenerable: a pull is a "restore from cloud" replace.
const REPLACE_STORES = ['items', 'categories']
const LAST_SYNC_KEY = 'lastCloudSync'
const SYNC_ERROR_KEY = 'lastSyncError'

// Fired whenever sync state changes (success or failure) so the UI can refresh.
export const SYNC_CHANGED_EVENT = 'tindapos:sync-changed'

export function getSyncError() {
  return localStorage.getItem(SYNC_ERROR_KEY)
}

// Record the outcome of a sync attempt so it surfaces in the UI instead of
// being silently swallowed. Pass null on success to clear a prior error.
export function noteSyncResult(error) {
  if (error) localStorage.setItem(SYNC_ERROR_KEY, String(error))
  else localStorage.removeItem(SYNC_ERROR_KEY)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SYNC_CHANGED_EVENT))
}

export async function pushToCloud(licenseKey) {
  if (!supabase) throw new Error('Supabase not configured')
  const db = await getDB()

  const data = {}
  for (const storeName of STORES) {
    data[storeName] = await db.getAll(storeName)
  }

  const { data: result, error } = await supabase.functions.invoke('push-backup', {
    body: { licenseKey, data },
  })

  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)

  if (result?.syncedAt) localStorage.setItem(LAST_SYNC_KEY, result.syncedAt)

  // Flag exactly the records we just uploaded as synced.
  const identityMap = {}
  for (const store of MERGE_STORES) {
    identityMap[store] = new Set((data[store] || []).map(syncIdentity))
  }
  await markSyncedByIdentity(identityMap)

  noteSyncResult(null)
  return result.results
}

export async function pullFromCloud(licenseKey) {
  if (!supabase) throw new Error('Supabase not configured')

  const { data: result, error } = await supabase.functions.invoke('pull-backup', {
    body: { licenseKey },
  })

  if (error) throw new Error(error.message)
  if (result?.error) throw new Error(result.error)
  if (!result?.restored) return { restored: 0 }

  const db = await getDB()
  const grouped = result.data

  // Catalog: replace from cloud (only when cloud actually has rows, so an
  // empty cloud snapshot never wipes a freshly-seeded local catalog).
  const replaceStores = REPLACE_STORES.filter(s => Array.isArray(grouped[s]) && grouped[s].length > 0)
  if (replaceStores.length > 0) {
    const tx = db.transaction(replaceStores, 'readwrite')
    for (const storeName of replaceStores) {
      await tx.objectStore(storeName).clear()
      for (const record of grouped[storeName]) {
        await tx.objectStore(storeName).add(record)
      }
    }
    await tx.done
  }

  // Money data: merge by identity. Never clear — local-only sales that haven't
  // uploaded yet must survive. Cloud rows already exist server-side, so they
  // come in flagged synced. Drop the cloud autoincrement id to avoid keyPath
  // collisions; identity (uuid/ref) is what dedupes, not the local id.
  const mergeStores = MERGE_STORES.filter(s => Array.isArray(grouped[s]) && grouped[s].length > 0)
  if (mergeStores.length > 0) {
    const tx = db.transaction(mergeStores, 'readwrite')
    for (const storeName of mergeStores) {
      const store = tx.objectStore(storeName)
      const existing = await store.getAll()
      const seen = new Set(existing.map(syncIdentity))
      for (const record of grouped[storeName]) {
        const identity = syncIdentity(record)
        if (seen.has(identity)) continue
        seen.add(identity)
        const { id: _droppedId, ...rest } = record
        await store.add({ ...rest, synced: true })
      }
    }
    await tx.done
  }

  if (result.lastSyncAt) localStorage.setItem(LAST_SYNC_KEY, result.lastSyncAt)

  noteSyncResult(null)
  return { restored: result.restored }
}

export function getLastSyncTime(_licenseKey) {
  return Promise.resolve(localStorage.getItem(LAST_SYNC_KEY) ?? null)
}

// ── Auto-sync ────────────────────────────────────────────────────────────────

// Push unsynced data to the cloud if conditions allow. Safe to call freely:
// no-ops when offline, unlicensed, or nothing changed. Never throws — sync is
// always secondary to the local-first write that already succeeded.
export async function autoSync() {
  const licenseKey = localStorage.getItem('licenseKey')
  if (!licenseKey || !supabase || !navigator.onLine) return false
  try {
    if (!(await hasUnsynced())) return false
    await pushToCloud(licenseKey)
    return true
  } catch (err) {
    // Connection flaky / server down — records stay flagged unsynced and
    // retry on the next trigger. The sale is already safe in IndexedDB.
    // Surface the failure (no longer silent) so the UI can show it.
    noteSyncResult(err?.message || 'Sync failed')
    return false
  }
}

// Register automatic sync triggers. Returns a cleanup function.
// Triggers: connection restored, app refocused, periodic heartbeat, startup.
export function initAutoSync({ intervalMs = 60_000 } = {}) {
  const onOnline = () => { autoSync() }
  const onVisible = () => { if (document.visibilityState === 'visible') autoSync() }

  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)
  const timer = setInterval(() => { autoSync() }, intervalMs)

  // Attempt once on startup in case sales were made offline last session.
  autoSync()

  return () => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
    clearInterval(timer)
  }
}
