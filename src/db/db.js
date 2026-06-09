import { openDB } from 'idb'

const DB_NAME = 'tindapos'
const DB_VERSION = 1

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('items')) {
        const itemStore = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true })
        itemStore.createIndex('name', 'name')
      }
      if (!db.objectStoreNames.contains('sales')) {
        const saleStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true })
        saleStore.createIndex('date', 'date')
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings')
      }
    },
  })
}

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

export function generateRef() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${now.getFullYear().toString().slice(2)}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

export async function recordSale(sale) {
  const db = await getDB()
  return db.add('sales', { ...sale, ref: generateRef(), date: new Date().toISOString() })
}

export async function getTodaySales() {
  const db = await getDB()
  const all = await db.getAll('sales')
  const today = new Date().toDateString()
  return all.filter(s => new Date(s.date).toDateString() === today)
}

export async function getSetting(key) {
  const db = await getDB()
  return db.get('settings', key)
}

export async function setSetting(key, value) {
  const db = await getDB()
  return db.put('settings', value, key)
}
