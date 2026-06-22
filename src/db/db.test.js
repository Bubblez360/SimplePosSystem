import 'fake-indexeddb/auto'
import { beforeEach, describe, it, expect } from 'vitest'
import {
  getDB, recordSale, voidSale, restock, saveItem,
  syncIdentity, hasUnsynced, markSyncedByIdentity,
} from './db'

const ALL_STORES = ['items', 'categories', 'sales', 'expenses', 'shifts', 'settings']

async function clearAll() {
  const db = await getDB()
  const tx = db.transaction(ALL_STORES, 'readwrite')
  for (const s of ALL_STORES) await tx.objectStore(s).clear()
  await tx.done
}

beforeEach(clearAll)

describe('recordSale', () => {
  it('stamps a uuid and synced:false', async () => {
    const { id, uuid, ref } = await recordSale({ total: 50, method: 'cash', lines: [] })
    expect(uuid).toBeTruthy()
    expect(ref).toBeTruthy()
    const sale = await (await getDB()).get('sales', id)
    expect(sale.uuid).toBe(uuid)
    expect(sale.synced).toBe(false)
  })

  it('decrements stock for tracked items', async () => {
    const itemId = await saveItem({ name: 'X', price: 10, trackStock: true, stock: 5 })
    await recordSale({ total: 20, method: 'cash', lines: [{ itemId, name: 'X', qty: 2, subtotal: 20 }] })
    const item = await (await getDB()).get('items', itemId)
    expect(item.stock).toBe(3)
  })
})

describe('voidSale', () => {
  it('marks voided, restores stock, and is idempotent', async () => {
    const itemId = await saveItem({ name: 'X', price: 10, trackStock: true, stock: 5 })
    const { id } = await recordSale({ total: 20, method: 'cash', lines: [{ itemId, name: 'X', qty: 2, subtotal: 20 }] })
    expect((await (await getDB()).get('items', itemId)).stock).toBe(3)

    const voided = await voidSale(id)
    expect(voided.status).toBe('voided')
    expect(voided.voidedAt).toBeTruthy()
    expect(voided.synced).toBe(false)
    expect((await (await getDB()).get('items', itemId)).stock).toBe(5)

    // second void must not double-restock
    await voidSale(id)
    expect((await (await getDB()).get('items', itemId)).stock).toBe(5)
  })

  it('returns null for a missing sale', async () => {
    expect(await voidSale(999)).toBeNull()
  })
})

describe('restock', () => {
  it('only adds stock to tracked items and ignores lines without itemId', async () => {
    const tracked = await saveItem({ name: 'T', trackStock: true, stock: 1 })
    const untracked = await saveItem({ name: 'U', trackStock: false, stock: 0 })
    await restock([{ itemId: tracked, qty: 3 }, { itemId: untracked, qty: 5 }, { qty: 9 }])
    expect((await (await getDB()).get('items', tracked)).stock).toBe(4)
    expect((await (await getDB()).get('items', untracked)).stock).toBe(0)
  })
})

describe('syncIdentity', () => {
  it('prefers uuid, then ref, then id', () => {
    expect(syncIdentity({ uuid: 'u', ref: 'r', id: 1 })).toBe('u')
    expect(syncIdentity({ ref: 'r', id: 1 })).toBe('ref:r')
    expect(syncIdentity({ id: 1 })).toBe('id:1')
  })
})

describe('hasUnsynced', () => {
  it('is true only when a record has synced === false', async () => {
    expect(await hasUnsynced()).toBe(false)
    await recordSale({ total: 1, method: 'cash', lines: [] })
    expect(await hasUnsynced()).toBe(true)
  })

  it('treats legacy records (synced undefined) as already synced', async () => {
    const db = await getDB()
    await db.add('sales', { total: 1, method: 'cash', date: new Date().toISOString(), ref: 'legacy' })
    expect(await hasUnsynced()).toBe(false)
  })
})

describe('markSyncedByIdentity', () => {
  it('flips only the matching unsynced records', async () => {
    const a = await recordSale({ total: 1, method: 'cash', lines: [] })
    const b = await recordSale({ total: 2, method: 'cash', lines: [] })
    await markSyncedByIdentity({ sales: new Set([a.uuid]) })
    const db = await getDB()
    expect((await db.get('sales', a.id)).synced).toBe(true)
    expect((await db.get('sales', b.id)).synced).toBe(false)
  })
})
