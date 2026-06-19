import { openDB } from 'idb'

const DB_NAME = 'tindapos'
const DB_VERSION = 4

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const itemStore = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true })
        itemStore.createIndex('name', 'name')
        const saleStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true })
        saleStore.createIndex('date', 'date')
        db.createObjectStore('settings')
      }
      if (oldVersion < 2) {
        const catStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true })
        catStore.createIndex('name', 'name')
      }
      if (oldVersion < 3) {
        db.createObjectStore('shifts', { keyPath: 'id', autoIncrement: true })
      }
      if (oldVersion < 4) {
        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true })
        expenseStore.createIndex('date', 'date')
      }
    },
  })
}

// Items
export async function getAllItems() {
  const db = await getDB()
  return db.getAll('items')
}

export async function saveItem(item) {
  const db = await getDB()
  if (item.id) return db.put('items', item)
  const { id: _id, ...rest } = item
  return db.add('items', rest)
}

export async function deleteItem(id) {
  const db = await getDB()
  return db.delete('items', id)
}

export async function decrementStock(lines) {
  const db = await getDB()
  const tx = db.transaction('items', 'readwrite')
  for (const line of lines) {
    if (!line.itemId) continue
    const item = await tx.store.get(line.itemId)
    if (!item || !item.trackStock) continue
    const newStock = Math.max(0, (item.stock ?? 0) - line.qty)
    await tx.store.put({ ...item, stock: newStock })
  }
  await tx.done
}

// Reverse of decrementStock — return qty to stock for tracked items.
export async function restock(lines) {
  const db = await getDB()
  const tx = db.transaction('items', 'readwrite')
  for (const line of lines) {
    if (!line.itemId) continue
    const item = await tx.store.get(line.itemId)
    if (!item || !item.trackStock) continue
    await tx.store.put({ ...item, stock: (item.stock ?? 0) + line.qty })
  }
  await tx.done
}

// Soft-cancel a completed sale. Never deletes — keeps an audit trail, restores
// stock, and flags the change for re-sync. Voided sales are excluded from
// report totals but still visible (with a count) so abuse is detectable.
export async function voidSale(id) {
  const db = await getDB()
  const sale = await db.get('sales', id)
  if (!sale || sale.status === 'voided') return sale ?? null
  const updated = {
    ...sale,
    status: 'voided',
    voidedAt: new Date().toISOString(),
    synced: false,
  }
  await db.put('sales', updated)
  if (sale.lines?.length) await restock(sale.lines)
  return updated
}

// Categories
export async function getAllCategories() {
  const db = await getDB()
  return db.getAll('categories')
}

export async function saveCategory(category) {
  const db = await getDB()
  if (category.id) return db.put('categories', category)
  const { id: _id, ...rest } = category
  return db.add('categories', rest)
}

export async function deleteCategory(id) {
  const db = await getDB()
  return db.delete('categories', id)
}

// Sales
export function generateRef() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${now.getFullYear().toString().slice(2)}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

// Globally-unique id for a record, stable across devices/re-sync.
// Falls back for old Android WebViews without crypto.randomUUID.
function newUUID() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Stable identity used to dedupe records during sync. uuid for new records,
// ref/id fallback for legacy records created before uuid existed.
export function syncIdentity(rec) {
  return rec.uuid || (rec.ref ? `ref:${rec.ref}` : `id:${rec.id}`)
}

export async function recordSale(sale) {
  const db = await getDB()
  const ref = generateRef()
  const date = new Date().toISOString()
  const uuid = newUUID()
  const id = await db.add('sales', { ...sale, ref, date, uuid, synced: false })
  // Decrement stock for items that track it
  if (sale.lines?.length) {
    await decrementStock(sale.lines)
  }
  return { id, ref, date, uuid }
}

export async function getTodaySales() {
  const db = await getDB()
  const all = await db.getAll('sales')
  const today = new Date().toDateString()
  return all.filter(s => new Date(s.date).toDateString() === today)
}

export async function getSalesByRange(from, to) {
  const db = await getDB()
  const all = await db.getAll('sales')
  return all.filter(s => {
    const d = new Date(s.date)
    return d >= from && d <= to
  })
}

export async function getWeeklySales() {
  const now = new Date()
  const from = new Date(now)
  from.setDate(now.getDate() - now.getDay()) // start of week (Sunday)
  from.setHours(0, 0, 0, 0)
  const to = new Date()
  return getSalesByRange(from, to)
}

export async function getMonthlySales() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date()
  return getSalesByRange(from, to)
}

export async function getYearlySales() {
  const now = new Date()
  const from = new Date(now.getFullYear(), 0, 1)
  return getSalesByRange(from, new Date())
}

// Expenses (gastos)
export async function addExpense(expense) {
  const db = await getDB()
  const record = {
    name: expense.name || '',
    amount: parseFloat(expense.amount) || 0,
    date: new Date().toISOString(),
    uuid: newUUID(),
    synced: false,
  }
  const id = await db.add('expenses', record)
  return { ...record, id }
}

export async function deleteExpense(id) {
  const db = await getDB()
  return db.delete('expenses', id)
}

export async function getExpensesByRange(from, to) {
  const db = await getDB()
  const all = await db.getAll('expenses')
  return all.filter(e => {
    const d = new Date(e.date)
    return d >= from && d <= to
  })
}

export async function getTodayExpenses() {
  const db = await getDB()
  const all = await db.getAll('expenses')
  const today = new Date().toDateString()
  return all.filter(e => new Date(e.date).toDateString() === today)
}

export async function getWeeklyExpenses() {
  const now = new Date()
  const from = new Date(now)
  from.setDate(now.getDate() - now.getDay())
  from.setHours(0, 0, 0, 0)
  return getExpensesByRange(from, new Date())
}

export async function getMonthlyExpenses() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return getExpensesByRange(from, new Date())
}

export async function getYearlyExpenses() {
  const now = new Date()
  const from = new Date(now.getFullYear(), 0, 1)
  return getExpensesByRange(from, new Date())
}

// Shifts
export async function getCurrentShift() {
  const db = await getDB()
  return db.get('settings', 'currentShift')
}

export async function openShift(openingFloat) {
  const db = await getDB()
  const shift = {
    openedAt: new Date().toISOString(),
    openingFloat: parseFloat(openingFloat) || 0,
  }
  await db.put('settings', shift, 'currentShift')
  return shift
}

export async function closeShift(sales) {
  const db = await getDB()
  const current = await db.get('settings', 'currentShift')
  if (!current) return null
  const cashSales = sales.filter(s => s.method === 'cash').reduce((sum, s) => sum + s.total, 0)
  const gcashSales = sales.filter(s => s.method === 'gcash').reduce((sum, s) => sum + s.total, 0)
  const record = {
    ...current,
    closedAt: new Date().toISOString(),
    cashSales,
    gcashSales,
    totalSales: cashSales + gcashSales,
    expectedCash: (current.openingFloat || 0) + cashSales,
    transactionCount: sales.length,
  }
  await db.add('shifts', record)
  await db.delete('settings', 'currentShift')
  return record
}

const DEFAULT_CATS = [
  { name: 'Drinks', emoji: '🥤' },
  { name: 'Milk Tea', emoji: '🧋' },
  { name: 'Coffee', emoji: '☕' },
  { name: 'Food', emoji: '🍱' },
  { name: 'Snacks', emoji: '🍟' },
  { name: 'Desserts', emoji: '🍰' },
]

const DEFAULT_ITEMS = [
  { name: 'Milk Tea', emoji: '🧋', photo: null, price: null, _cat: 'Milk Tea', trackStock: false, stock: 0,
    variants: [{ name: 'Small', price: 65 }, { name: 'Medium', price: 75 }, { name: 'Large', price: 90 }],
    addons: [{ name: 'Extra Pearls', price: 10 }, { name: 'Cream Cheese', price: 15 }, { name: 'Nata de Coco', price: 10 }] },
  { name: 'Iced Coffee', emoji: '☕', photo: null, price: null, _cat: 'Coffee', trackStock: false, stock: 0,
    variants: [{ name: 'Small', price: 60 }, { name: 'Medium', price: 70 }, { name: 'Large', price: 80 }],
    addons: [{ name: 'Extra Shot', price: 20 }, { name: 'Whipped Cream', price: 15 }] },
  { name: 'Lemonade', emoji: '🍋', photo: null, price: 40, _cat: 'Drinks', trackStock: false, stock: 0, variants: [], addons: [] },
  { name: 'Rice Meal', emoji: '🍱', photo: null, price: null, _cat: 'Food', trackStock: false, stock: 0,
    variants: [{ name: 'Regular', price: 80 }, { name: 'Solo', price: 95 }], addons: [] },
  { name: 'Fries', emoji: '🍟', photo: null, price: 45, _cat: 'Snacks', trackStock: false, stock: 0,
    variants: [], addons: [{ name: 'Cheese Dip', price: 15 }, { name: 'Sour Cream', price: 15 }] },
  { name: 'Ice Cream', emoji: '🍦', photo: null, price: 35, _cat: 'Desserts', trackStock: false, stock: 0, variants: [], addons: [] },
]

// Seed default data on first run — uses atomic transaction to prevent double-seeding
// under React StrictMode (which runs effects twice in development).
export async function seedDefaultData() {
  const db = await getDB()
  const tx = db.transaction(['settings', 'categories', 'items'], 'readwrite')
  const settingsStore = tx.objectStore('settings')
  const catStore = tx.objectStore('categories')
  const itemStore = tx.objectStore('items')

  const seeded = await settingsStore.get('defaultDataSeeded')
  if (seeded) { await tx.done; return }
  await settingsStore.put(true, 'defaultDataSeeded')

  const catIds = {}
  for (const cat of DEFAULT_CATS) {
    const id = await catStore.add(cat)
    catIds[cat.name] = id
  }
  for (const { _cat, ...item } of DEFAULT_ITEMS) {
    await itemStore.add({ ...item, categoryId: catIds[_cat] })
  }
  await tx.done
}

// Settings
export async function getSetting(key) {
  const db = await getDB()
  return db.get('settings', key)
}

export async function setSetting(key, value) {
  const db = await getDB()
  return db.put('settings', value, key)
}

// Sync bookkeeping ───────────────────────────────────────────────────────────
const SYNCABLE_STORES = ['sales', 'expenses']

// True if any record in the given stores still needs uploading.
// Legacy records (synced === undefined) are treated as already synced so we
// don't re-push a vendor's entire history on first run after upgrade.
export async function hasUnsynced(storeNames = SYNCABLE_STORES) {
  const db = await getDB()
  for (const store of storeNames) {
    const all = await db.getAll(store)
    if (all.some(r => r.synced === false)) return true
  }
  return false
}

// Mark records as synced, but only the ones that were actually pushed
// (matched by stable identity). Avoids a race where a sale made mid-push
// gets flagged synced without ever being uploaded.
export async function markSyncedByIdentity(identityMap) {
  const stores = Object.keys(identityMap)
  const db = await getDB()
  const tx = db.transaction(stores, 'readwrite')
  for (const store of stores) {
    const ids = identityMap[store]
    const objStore = tx.objectStore(store)
    const all = await objStore.getAll()
    for (const rec of all) {
      if (rec.synced === false && ids.has(syncIdentity(rec))) {
        await objStore.put({ ...rec, synced: true })
      }
    }
  }
  await tx.done
}

// Backup & Restore
export async function exportAllData() {
  const db = await getDB()
  const [items, categories, sales, expenses, shifts] = await Promise.all([
    db.getAll('items'),
    db.getAll('categories'),
    db.getAll('sales'),
    db.getAll('expenses'),
    db.getAll('shifts'),
  ])
  const settingKeys = ['gcashQR', 'logo', 'businessName', 'lang', 'theme']
  const settings = {}
  for (const key of settingKeys) {
    const val = await db.get('settings', key)
    if (val !== undefined) settings[key] = val
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
    categories,
    sales,
    expenses,
    shifts,
    settings,
  }
}

export async function importAllData(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid backup file')
  if (data.version !== 1) throw new Error('Invalid backup file')
  const storeKeys = ['items', 'categories', 'sales', 'expenses', 'shifts']
  for (const store of storeKeys) {
    if (data[store] !== undefined && !Array.isArray(data[store])) {
      throw new Error(`Invalid backup: ${store} must be an array`)
    }
  }
  const db = await getDB()

  const stores = ['items', 'categories', 'sales', 'expenses', 'shifts']
  const tx = db.transaction(stores, 'readwrite')
  for (const store of stores) await tx.objectStore(store).clear()
  for (const item of (data.items || [])) await tx.objectStore('items').add(item)
  for (const cat of (data.categories || [])) await tx.objectStore('categories').add(cat)
  for (const sale of (data.sales || [])) await tx.objectStore('sales').add(sale)
  for (const expense of (data.expenses || [])) await tx.objectStore('expenses').add(expense)
  for (const shift of (data.shifts || [])) await tx.objectStore('shifts').add(shift)
  await tx.done

  if (data.settings) {
    for (const [key, val] of Object.entries(data.settings)) {
      await db.put('settings', val, key)
    }
  }
}
