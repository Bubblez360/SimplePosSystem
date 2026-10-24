import { describe, it, expect } from 'vitest'
import { buildCsv, csvFileName } from './exportCsv'

const now = new Date('2026-03-05T10:00:00')
const sale = (over = {}) => ({
  ref: '260305-100000', date: '2026-03-05T09:30:00', method: 'cash', total: 90,
  lines: [{ name: 'Milk Tea (Large)', qty: 1, subtotal: 90 }], ...over,
})

describe('buildCsv', () => {
  it('summarises totals, payment split and profit', () => {
    const csv = buildCsv({
      sales: [sale(), sale({ method: 'gcash', total: 40, lines: [{ name: 'Lemonade', qty: 1, subtotal: 40 }] })],
      expenses: [{ name: 'Ice', amount: 30, date: '2026-03-05T08:00:00' }],
      lang: 'eng', period: 'today', businessName: 'Aling Nena', now,
    })
    expect(csv).toContain('"Total Sales","","₱130.00"')
    expect(csv).toContain('"Cash Sales","","₱90.00"')
    expect(csv).toContain('"GCash Sales","","₱40.00"')
    expect(csv).toContain('"Profit (Sales - Expenses)","","₱100.00"')
    expect(csv).toContain('"Total Transactions","","2"')
  })

  it('neutralises spreadsheet formulas in user-entered text', () => {
    const csv = buildCsv({
      sales: [sale({ lines: [{ name: '=HYPERLINK("http://evil")', qty: 1, subtotal: 5 }] })],
      expenses: [{ name: '+cmd|calc', amount: 1, date: '2026-03-05T08:00:00' }],
      lang: 'eng', period: 'today', businessName: '@SUM(A1)', now,
    })
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`)
    expect(csv).toContain(`"'+cmd|calc"`)
    expect(csv).toContain(`"'@SUM(A1)"`)
  })

  it('names the file after the business, period and date', () => {
    expect(csvFileName('Aling Nena Store', 'week', now)).toBe('aling-nena-store-week-2026-03-05.csv')
    expect(csvFileName('', 'today', now)).toBe('sales-today-2026-03-05.csv')
  })
})
