// Pure analytics for the Ulat screen. Voided sales are excluded everywhere
// (they stay in the transaction list so abuse is visible, but never in totals).

const WEEKDAYS = {
  fil: ['Lin', 'Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab'],
  eng: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
}
const MONTHS = {
  fil: ['Ene', 'Peb', 'Mar', 'Abr', 'May', 'Hun', 'Hul', 'Ago', 'Set', 'Okt', 'Nob', 'Dis'],
  eng: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}
const FIRST_HOUR = 6
const LAST_HOUR = 22

const sum = (list, pick) => list.reduce((s, x) => s + pick(x), 0)

function hourLabel(h) {
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

export function timeSeries(sales, period, lang) {
  const key = lang === 'fil' ? 'fil' : 'eng'
  if (period === 'today') {
    const hours = Array(24).fill(0)
    for (const s of sales) hours[new Date(s.date).getHours()] += s.total
    return hours.slice(FIRST_HOUR, LAST_HOUR + 1).map((value, i) => ({ label: hourLabel(i + FIRST_HOUR), value }))
  }
  if (period === 'week') {
    const days = Array(7).fill(0)
    for (const s of sales) days[new Date(s.date).getDay()] += s.total
    return WEEKDAYS[key].map((label, i) => ({ label, value: days[i] }))
  }
  const months = Array(12).fill(0)
  for (const s of sales) months[new Date(s.date).getMonth()] += s.total
  return MONTHS[key].map((label, i) => ({ label, value: months[i] }))
}

export function computeReport({ sales, expenses, items, categories, period, lang }) {
  const active = sales.filter(s => s.status !== 'voided')
  const total = sum(active, s => s.total)
  const cash = sum(active.filter(s => s.method === 'cash'), s => s.total)
  const gcash = sum(active.filter(s => s.method === 'gcash'), s => s.total)
  const gastos = sum(expenses, e => e.amount)

  const byName = new Map()
  for (const sale of active) {
    for (const line of sale.lines || []) {
      const row = byName.get(line.name) || { qty: 0, revenue: 0 }
      row.qty += line.qty
      row.revenue += line.subtotal
      byName.set(line.name, row)
    }
  }
  const bestSellers = [...byName.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)

  // Sale lines store the display name (e.g. "Milk Tea (Large)"), so match the
  // longest item name that prefixes the line to find its category.
  const catById = new Map(categories.map(c => [c.id, c]))
  const itemCat = items
    .filter(i => catById.has(i.categoryId))
    .map(i => ({ name: i.name, cat: catById.get(i.categoryId) }))
    .sort((a, b) => b.name.length - a.name.length)
  const others = lang === 'fil' ? 'Iba pa' : 'Others'
  const byCategory = new Map()
  for (const [name, v] of byName) {
    const hit = itemCat.find(i => name === i.name || name.startsWith(`${i.name} (`))
    const label = hit ? `${hit.cat.emoji ? `${hit.cat.emoji} ` : ''}${hit.cat.name}` : others
    byCategory.set(label, (byCategory.get(label) || 0) + v.revenue)
  }
  const categoryData = [...byCategory.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)

  return {
    active,
    voidedCount: sales.length - active.length,
    total,
    cash,
    gcash,
    gastos,
    kita: total - gastos,
    avgOrder: active.length ? total / active.length : 0,
    bestSellers,
    categoryData,
    series: timeSeries(active, period, lang),
  }
}
