import { supabase } from './supabase'
import { getDB } from '../db/db'

const STORES = ['items', 'categories', 'sales', 'expenses']

export async function pushToCloud(licenseKey) {
  const db = await getDB()
  const results = []

  for (const storeName of STORES) {
    const records = await db.getAll(storeName)
    if (!records.length) continue

    const rows = records.map(r => ({
      vendor_key: licenseKey,
      store_name: storeName,
      record_id: String(r.id),
      data: r,
      synced_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('vendor_backups')
      .upsert(rows, { onConflict: 'vendor_key,store_name,record_id' })

    if (error) results.push({ storeName, error: error.message })
    else results.push({ storeName, count: rows.length })
  }

  return results
}

export async function pullFromCloud(licenseKey) {
  const { data, error } = await supabase
    .from('vendor_backups')
    .select('store_name, record_id, data')
    .eq('vendor_key', licenseKey)

  if (error) throw new Error(error.message)
  if (!data?.length) return { restored: 0 }

  const db = await getDB()
  const grouped = {}
  for (const row of data) {
    if (!grouped[row.store_name]) grouped[row.store_name] = []
    grouped[row.store_name].push(row.data)
  }

  const validStores = STORES.filter(s => grouped[s]?.length)
  const tx = db.transaction(validStores, 'readwrite')
  for (const storeName of validStores) {
    await tx.objectStore(storeName).clear()
    for (const record of grouped[storeName]) {
      await tx.objectStore(storeName).add(record)
    }
  }
  await tx.done

  return { restored: data.length }
}

export async function getLastSyncTime(licenseKey) {
  const { data } = await supabase
    .from('vendor_backups')
    .select('synced_at')
    .eq('vendor_key', licenseKey)
    .order('synced_at', { ascending: false })
    .limit(1)
    .single()

  return data?.synced_at ?? null
}
