import 'fake-indexeddb/auto'
import { beforeEach, describe, it, expect } from 'vitest'
import {
  getDB, recordSale, voidSale, restock, saveItem, saveCategory, deleteCategory,
  openShift, closeShift, getSetting, setSetting, exportAllData, importAllData,
  syncIdentity, hasUnsynced, markSyncedByIdentity,
} from './db'

const ALL_STORES = ['items', 'categories', 'sales', 'expenses', 'shifts', 'settings']

async function clearAll() {
  const db = await getDB()
  const tx = db.transaction(ALL_STORES, 'readwrite')
  for (const s of ALL_STORES) await tx.objectStore(s).clear()
  await tx.done
}

beforeEach(async () => {
  localStorage.clear()
  await clearAll()
})

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

describe('deleteCategory', () => {
  it('unlinks items that pointed at the deleted category', async () => {
    const catId = await saveCategory({ name: 'Drinks', emoji: '🥤' })
    const other = await saveCategory({ name: 'Food', emoji: '🍱' })
    const a = await saveItem({ name: 'A', price: 1, categoryId: catId })
    const b = await saveItem({ name: 'B', price: 1, categoryId: other })
    await deleteCategory(catId)
    const db = await getDB()
    expect((await db.get('items', a)).categoryId).toBeNull()
    expect((await db.get('items', b)).categoryId).toBe(other)
  })
})

describe('closeShift', () => {
  it('excludes voided sales from totals and expected cash', async () => {
    await openShift(100)
    const sales = [
      { total: 50, method: 'cash' },
      { total: 30, method: 'gcash' },
      { total: 999, method: 'cash', status: 'voided' },
    ]
    const rec = await closeShift(sales)
    expect(rec.cashSales).toBe(50)
    expect(rec.gcashSales).toBe(30)
    expect(rec.totalSales).toBe(80)
    expect(rec.expectedCash).toBe(150)
    expect(rec.transactionCount).toBe(2)
    expect(rec.voidedCount).toBe(1)
  })
})

describe('backup export/import', () => {
  it('round-trips localStorage-backed settings (name, language, theme)', async () => {
    localStorage.setItem('businessName', 'Aling Nena')
    localStorage.setItem('lang', 'eng')
    localStorage.setItem('theme', 'dark')
    await setSetting('logo', 'data:image/png;base64,AAAA')
    const backup = await exportAllData()
    expect(backup.settings).toMatchObject({
      businessName: 'Aling Nena', lang: 'eng', theme: 'dark', logo: 'data:image/png;base64,AAAA',
    })

    localStorage.clear()
    await clearAll()
    await importAllData(backup)
    expect(localStorage.getItem('businessName')).toBe('Aling Nena')
    expect(localStorage.getItem('lang')).toBe('eng')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(await getSetting('logo')).toBe('data:image/png;base64,AAAA')
  })

  it('ignores unknown or malformed setting values on import', async () => {
    await importAllData({
      version: 1,
      settings: {
        currentShift: { openedAt: 'x' },
        defaultDataSeeded: false,
        lang: 'klingon',
        theme: 'neon',
        gcashQR: 'javascript:alert(1)',
        businessName: 'Ok Store',
      },
    })
    expect(await getSetting('currentShift')).toBeUndefined()
    expect(await getSetting('defaultDataSeeded')).toBeUndefined()
    expect(await getSetting('gcashQR')).toBeUndefined()
    expect(localStorage.getItem('lang')).toBeNull()
    expect(localStorage.getItem('theme')).toBeNull()
    expect(localStorage.getItem('businessName')).toBe('Ok Store')
  })
})

describe('order numbers', () => {
  it('counts up through the day, starting at 1', async () => {
    const a = await recordSale({ total: 1, method: 'cash', lines: [] })
    const b = await recordSale({ total: 1, method: 'cash', lines: [] })
    expect([a.orderNo, b.orderNo]).toEqual([1, 2])
    expect((await (await getDB()).get('sales', b.id)).orderNo).toBe(2)
  })

  it('restarts every day and still counts voided sales (numbers are never reused)', async () => {
    const db = await getDB()
    const yesterday = new Date(Date.now() - 36 * 3600_000).toISOString()
    await db.add('sales', { total: 1, method: 'cash', date: yesterday, orderNo: 57, ref: 'old', uuid: 'u-old', synced: true })
    const first = await recordSale({ total: 1, method: 'cash', lines: [] })
    expect(first.orderNo).toBe(1)
    await voidSale(first.id)
    expect((await recordSale({ total: 1, method: 'cash', lines: [] })).orderNo).toBe(2)
  })
})
