import { openDB } from 'idb'

const DB_NAME = 'tindapos'
const DB_VERSION = 2

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

export async function recordSale(sale) {
  const db = await getDB()
  const ref = generateRef()
  const date = new Date().toISOString()
  const id = await db.add('sales', { ...sale, ref, date })
  return { id, ref, date }
}

export async function getTodaySales() {
  const db = await getDB()
  const all = await db.getAll('sales')
  const today = new Date().toDateString()
  return all.filter(s => new Date(s.date).toDateString() === today)
}

// Seed default data on first run
export async function seedDefaultData() {
  const db = await getDB()
  const existingCats = await db.getAll('categories')
  if (existingCats.length > 0) return

  const catIds = {}
  const defaultCats = [
    { name: 'Drinks', emoji: '🥤' },
    { name: 'Milk Tea', emoji: '🧋' },
    { name: 'Coffee', emoji: '☕' },
    { name: 'Food', emoji: '🍱' },
    { name: 'Snacks', emoji: '🍟' },
    { name: 'Desserts', emoji: '🍰' },
  ]
  for (const cat of defaultCats) {
    const id = await db.add('categories', cat)
    catIds[cat.name] = id
  }

  const defaultItems = [
    {
      name: 'Milk Tea',
      emoji: '🧋',
      photo: null,
      price: null,
      categoryId: catIds['Milk Tea'],
      variants: [{ name: 'Small', price: 65 }, { name: 'Medium', price: 75 }, { name: 'Large', price: 90 }],
      addons: [{ name: 'Extra Pearls', price: 10 }, { name: 'Cream Cheese', price: 15 }, { name: 'Nata de Coco', price: 10 }],
    },
    {
      name: 'Iced Coffee',
      emoji: '☕',
      photo: null,
      price: null,
      categoryId: catIds['Coffee'],
      variants: [{ name: 'Small', price: 60 }, { name: 'Medium', price: 70 }, { name: 'Large', price: 80 }],
      addons: [{ name: 'Extra Shot', price: 20 }, { name: 'Whipped Cream', price: 15 }],
    },
    {
      name: 'Lemonade',
      emoji: '🍋',
      photo: null,
      price: 40,
      categoryId: catIds['Drinks'],
      variants: [],
      addons: [],
    },
    {
      name: 'Rice Meal',
      emoji: '🍱',
      photo: null,
      price: null,
      categoryId: catIds['Food'],
      variants: [{ name: 'Regular', price: 80 }, { name: 'Solo', price: 95 }],
      addons: [],
    },
    {
      name: 'Fries',
      emoji: '🍟',
      photo: null,
      price: 45,
      categoryId: catIds['Snacks'],
      variants: [],
      addons: [{ name: 'Cheese Dip', price: 15 }, { name: 'Sour Cream', price: 15 }],
    },
    {
      name: 'Ice Cream',
      emoji: '🍦',
      photo: null,
      price: 35,
      categoryId: catIds['Desserts'],
      variants: [],
      addons: [],
    },
  ]
  for (const item of defaultItems) {
    await db.add('items', item)
  }
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
