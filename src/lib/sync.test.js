import 'fake-indexeddb/auto'
import { beforeEach, describe, it, expect, vi } from 'vitest'

// Mock the Supabase client so no network is touched.
const invoke = vi.fn()
vi.mock('./supabase', () => ({ supabase: { functions: { invoke: (...args) => invoke(...args) } } }))

import { pushToCloud, pullFromCloud, autoSync } from './sync'
import { getDB, recordSale, saveItem } from '../db/db'

const ALL_STORES = ['items', 'categories', 'sales', 'expenses', 'shifts', 'settings']

async function clearAll() {
  const db = await getDB()
  const tx = db.transaction(ALL_STORES, 'readwrite')
  for (const s of ALL_STORES) await tx.objectStore(s).clear()
  await tx.done
}

function pullResult(stores) {
  return {
    data: { restored: 1, data: { items: [], categories: [], sales: [], expenses: [], ...stores } },
    error: null,
  }
}

beforeEach(async () => {
  await clearAll()
  invoke.mockReset()
  localStorage.clear()
})

describe('pullFromCloud — merge semantics', () => {
  it('does not duplicate sales across repeated pulls', async () => {
    const cloudSale = { id: 99, uuid: 'u1', total: 50, method: 'cash', ref: 'r1' }
    invoke.mockResolvedValue(pullResult({ sales: [cloudSale] }))

    await pullFromCloud('key')
    await pullFromCloud('key')

    const all = await (await getDB()).getAll('sales')
    expect(all.length).toBe(1)
    expect(all[0].uuid).toBe('u1')
    expect(all[0].synced).toBe(true)
    expect(all[0].id).not.toBe(99) // cloud id dropped, local key assigned
  })

  it('preserves local-only unsynced sales', async () => {
    const local = await recordSale({ total: 30, method: 'cash', lines: [] })
    invoke.mockResolvedValue(pullResult({ sales: [{ id: 1, uuid: 'cloud', total: 50, method: 'cash', ref: 'rc' }] }))

    await pullFromCloud('key')

    const all = await (await getDB()).getAll('sales')
    expect(all.length).toBe(2)
    expect(all.some(s => s.uuid === local.uuid)).toBe(true)
    expect(all.some(s => s.uuid === 'cloud')).toBe(true)
  })

  it('replaces catalog when cloud has rows', async () => {
    await saveItem({ name: 'Old', price: 5 })
    invoke.mockResolvedValue(pullResult({ items: [{ id: 1, name: 'New', price: 9 }] }))

    await pullFromCloud('key')

    const items = await (await getDB()).getAll('items')
    expect(items.length).toBe(1)
    expect(items[0].name).toBe('New')
  })

  it('does not wipe local catalog when cloud catalog is empty', async () => {
    await saveItem({ name: 'Keep', price: 5 })
    invoke.mockResolvedValue(pullResult({})) // all empty

    await pullFromCloud('key')

    expect((await (await getDB()).getAll('items')).length).toBe(1)
  })
})

describe('pushToCloud', () => {
  it('flags uploaded sales as synced', async () => {
    const s = await recordSale({ total: 10, method: 'cash', lines: [] })
    invoke.mockResolvedValue({ data: { results: {}, syncedAt: 't' }, error: null })

    await pushToCloud('key')

    expect((await (await getDB()).get('sales', s.id)).synced).toBe(true)
  })

  it('throws when the function returns an error', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(pushToCloud('key')).rejects.toThrow('boom')
  })
})

describe('autoSync — gating', () => {
  it('no-ops without a license key', async () => {
    await recordSale({ total: 1, method: 'cash', lines: [] })
    expect(await autoSync()).toBe(false)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('no-ops when nothing is unsynced', async () => {
    localStorage.setItem('licenseKey', 'k')
    expect(await autoSync()).toBe(false)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('pushes when online, licensed, and unsynced', async () => {
    localStorage.setItem('licenseKey', 'k')
    await recordSale({ total: 1, method: 'cash', lines: [] })
    invoke.mockResolvedValue({ data: { results: {}, syncedAt: 't' }, error: null })

    expect(await autoSync()).toBe(true)
    expect(invoke).toHaveBeenCalledOnce()
  })

  it('never throws when the push fails', async () => {
    localStorage.setItem('licenseKey', 'k')
    await recordSale({ total: 1, method: 'cash', lines: [] })
    invoke.mockRejectedValue(new Error('net down'))

    expect(await autoSync()).toBe(false)
  })
})
