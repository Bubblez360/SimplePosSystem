import { describe, it, expect } from 'vitest'
import { computeReport } from './report'

const at = (h, over = {}) => ({
  date: new Date(2026, 2, 5, h, 0, 0).toISOString(), method: 'cash', total: 100,
  lines: [{ name: 'Milk Tea (Large)', qty: 1, subtotal: 100 }], ...over,
})

const items = [
  { id: 1, name: 'Milk Tea', categoryId: 10 },
  { id: 2, name: 'Milk', categoryId: 11 },
]
const categories = [{ id: 10, name: 'Tea', emoji: '🧋' }, { id: 11, name: 'Dairy', emoji: '🥛' }]

describe('computeReport', () => {
  it('ignores voided sales in every total', () => {
    const r = computeReport({
      sales: [at(9), at(10, { method: 'gcash', total: 50, lines: [] }), at(11, { total: 999, status: 'voided' })],
      expenses: [{ amount: 30 }], items, categories, period: 'today', lang: 'eng',
    })
    expect(r.total).toBe(150)
    expect(r.cash).toBe(100)
    expect(r.gcash).toBe(50)
    expect(r.kita).toBe(120)
    expect(r.voidedCount).toBe(1)
    expect(r.avgOrder).toBe(75)
  })

  it('attributes variant lines to the right category (longest name wins)', () => {
    const r = computeReport({ sales: [at(9)], expenses: [], items, categories, period: 'today', lang: 'eng' })
    expect(r.categoryData).toEqual([{ label: '🧋 Tea', value: 100 }])
  })

  it('files unknown items under Others', () => {
    const r = computeReport({
      sales: [at(9, { lines: [{ name: 'Mystery', qty: 1, subtotal: 100 }] })],
      expenses: [], items, categories, period: 'today', lang: 'fil',
    })
    expect(r.categoryData[0].label).toBe('Iba pa')
  })

  it('buckets today by hour, week by weekday, year by month', () => {
    const base = { sales: [at(13)], expenses: [], items, categories, lang: 'eng' }
    const hourly = computeReport({ ...base, period: 'today' }).series
    expect(hourly.find(b => b.label === '1p').value).toBe(100)
    const weekly = computeReport({ ...base, period: 'week' }).series
    expect(weekly).toHaveLength(7)
    expect(weekly.reduce((s, b) => s + b.value, 0)).toBe(100)
    const yearly = computeReport({ ...base, period: 'month' }).series
    expect(yearly).toHaveLength(12)
    expect(yearly[2].value).toBe(100)
  })

  it('ranks best sellers by revenue', () => {
    const r = computeReport({
      sales: [at(9, { lines: [{ name: 'A', qty: 5, subtotal: 50 }, { name: 'B', qty: 1, subtotal: 90 }] })],
      expenses: [], items, categories, period: 'today', lang: 'eng',
    })
    expect(r.bestSellers.map(b => b.name)).toEqual(['B', 'A'])
  })
})
