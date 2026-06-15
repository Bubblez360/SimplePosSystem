import { supabase } from './supabase'
import { getDB } from '../db/db'

const STORES = ['items', 'categories', 'sales', 'expenses']
const LAST_SYNC_KEY = 'lastCloudSync'

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
  const validStores = STORES.filter(s => Array.isArray(grouped[s]) && grouped[s].length > 0)

  if (validStores.length > 0) {
    const tx = db.transaction(validStores, 'readwrite')
    for (const storeName of validStores) {
      await tx.objectStore(storeName).clear()
      for (const record of grouped[storeName]) {
        await tx.objectStore(storeName).add(record)
      }
    }
    await tx.done
  }

  if (result.lastSyncAt) localStorage.setItem(LAST_SYNC_KEY, result.lastSyncAt)

  return { restored: result.restored }
}

export function getLastSyncTime(_licenseKey) {
  return Promise.resolve(localStorage.getItem(LAST_SYNC_KEY) ?? null)
}
