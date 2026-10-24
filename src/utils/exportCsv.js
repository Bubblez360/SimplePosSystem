// Sales report → CSV. Pure builder (testable) + a thin browser download helper.

const PERIOD_NAMES = {
  fil: { today: 'Ngayon', week: 'Linggong Ito', month: 'Taong Ito' },
  eng: { today: 'Today', week: 'This Week', month: 'This Year' },
}

// Excel/Sheets run text starting with = + - @ as a formula. Vendor-entered
// names and notes land in this file, so prefix them with an apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/

function cell(value) {
  const text = String(value ?? '')
  const safe = FORMULA_START.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

const row = (...cols) => cols.map(cell).join(',')
const php = n => `₱${Number(n).toFixed(2)}`
const sum = (list, pick) => list.reduce((s, x) => s + pick(x), 0)

export function buildCsv({ sales, expenses, lang, period, businessName, now = new Date() }) {
  const isFil = lang === 'fil'
  const locale = isFil ? 'fil-PH' : 'en-PH'
  const pad = ['', '', '', '', '', '', '']
  const dateStr = now.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })

  const totalSales = sum(sales, s => s.total)
  const cashSales = sum(sales.filter(s => s.method === 'cash'), s => s.total)
  const gcashSales = sum(sales.filter(s => s.method === 'gcash'), s => s.total)
  const totalExpenses = sum(expenses, e => e.amount)

  const out = [
    row(businessName || 'TindaPOS', ...pad),
    row(`${isFil ? 'Ulat ng Benta' : 'Sales Report'} — ${PERIOD_NAMES[isFil ? 'fil' : 'eng'][period]}`, ...pad),
    row(`${isFil ? 'Na-export:' : 'Exported:'} ${dateStr}`, ...pad),
    '',
    row(isFil ? '=== BUOD ===' : '=== SUMMARY ===', ...pad),
    row(isFil ? 'Kabuuang Benta' : 'Total Sales', '', php(totalSales), ...pad.slice(2)),
    row(isFil ? 'Cash na Benta' : 'Cash Sales', '', php(cashSales), ...pad.slice(2)),
    row('GCash Sales', '', php(gcashSales), ...pad.slice(2)),
    row(isFil ? 'Gastos' : 'Expenses', '', php(totalExpenses), ...pad.slice(2)),
    row(isFil ? 'Kita (Benta - Gastos)' : 'Profit (Sales - Expenses)', '', php(totalSales - totalExpenses), ...pad.slice(2)),
    row(isFil ? 'Bilang ng Transaksyon' : 'Total Transactions', '', sales.length, ...pad.slice(2)),
    '',
    row(isFil ? '=== MGA TRANSAKSYON ===' : '=== TRANSACTIONS ===', ...pad),
    row('Ref', isFil ? 'Petsa at Oras' : 'Date & Time', isFil ? 'Paraan' : 'Method', 'Item', 'Qty', 'Subtotal', isFil ? 'Diskwento' : 'Discount', isFil ? 'Kabuuan' : 'Total'),
  ]

  for (const sale of sales) {
    const discount = php(sale.discount?.amount ?? 0)
    const when = new Date(sale.date).toLocaleString(locale)
    if (sale.lines?.length) {
      sale.lines.forEach((line, i) => {
        const first = i === 0
        out.push(row(
          first ? sale.ref ?? '' : '', first ? when : '', first ? sale.method : '',
          line.name, line.qty, php(line.subtotal), first ? discount : '', first ? php(sale.total) : '',
        ))
      })
    } else {
      out.push(row(sale.ref ?? '', when, sale.method, '', sale.itemCount ?? '', '', discount, php(sale.total)))
    }
  }

  if (expenses.length > 0) {
    out.push('', row(isFil ? '=== GASTOS ===' : '=== EXPENSES ===', ...pad))
    out.push(row(isFil ? 'Petsa' : 'Date', isFil ? 'Para Saan' : 'Description', isFil ? 'Halaga' : 'Amount', ...pad.slice(2)))
    for (const exp of expenses) {
      out.push(row(new Date(exp.date).toLocaleString(locale), exp.name || '', php(exp.amount), ...pad.slice(2)))
    }
  }
  return out.join('\n')
}

export function csvFileName(businessName, period, now = new Date()) {
  const base = (businessName || 'sales').trim().replace(/\s+/g, '-').toLowerCase()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${base}-${period}-${y}-${m}-${d}.csv`
}

export function downloadCsv(options) {
  const blob = new Blob(['\uFEFF' + buildCsv(options)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = csvFileName(options.businessName, options.period, options.now)
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
