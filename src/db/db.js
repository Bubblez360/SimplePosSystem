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
  // Decrement stock for items that track it
  if (sale.lines?.length) {
    await decrementStock(sale.lines)
  }
  return { id, ref, date }
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
    { name: 'Milk Tea', emoji: '🧋', photo: null, price: null, categoryId: catIds['Milk Tea'], trackStock: false, stock: 0,
      variants: [{ name: 'Small', price: 65 }, { name: 'Medium', price: 75 }, { name: 'Large', price: 90 }],
      addons: [{ name: 'Extra Pearls', price: 10 }, { name: 'Cream Cheese', price: 15 }, { name: 'Nata de Coco', price: 10 }] },
    { name: 'Iced Coffee', emoji: '☕', photo: null, price: null, categoryId: catIds['Coffee'], trackStock: false, stock: 0,
      variants: [{ name: 'Small', price: 60 }, { name: 'Medium', price: 70 }, { name: 'Large', price: 80 }],
      addons: [{ name: 'Extra Shot', price: 20 }, { name: 'Whipped Cream', price: 15 }] },
    { name: 'Lemonade', emoji: '🍋', photo: null, price: 40, categoryId: catIds['Drinks'], trackStock: false, stock: 0, variants: [], addons: [] },
    { name: 'Rice Meal', emoji: '🍱', photo: null, price: null, categoryId: catIds['Food'], trackStock: false, stock: 0,
      variants: [{ name: 'Regular', price: 80 }, { name: 'Solo', price: 95 }], addons: [] },
    { name: 'Fries', emoji: '🍟', photo: null, price: 45, categoryId: catIds['Snacks'], trackStock: false, stock: 0,
      variants: [], addons: [{ name: 'Cheese Dip', price: 15 }, { name: 'Sour Cream', price: 15 }] },
    { name: 'Ice Cream', emoji: '🍦', photo: null, price: 35, categoryId: catIds['Desserts'], trackStock: false, stock: 0, variants: [], addons: [] },
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
  if (!data || data.version !== 1) throw new Error('Invalid backup file')
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
