import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import {
  getTodaySales, getWeeklySales, getMonthlySales,
  getTodayExpenses, getWeeklyExpenses, getMonthlyExpenses,
  addExpense, deleteExpense,
} from '../db/db'
import { t } from '../i18n'

const PERIODS = ['today', 'week', 'month']

function exportCSV(sales, lang, period) {
  const isFil = lang === 'fil'
  const rows = [[
    'Ref', isFil ? 'Petsa' : 'Date', isFil ? 'Paraan' : 'Method',
    'Item', 'Qty', 'Subtotal',
    isFil ? 'Diskwento' : 'Discount', isFil ? 'Kabuuan' : 'Total',
  ]]
  for (const sale of sales) {
    const disc = sale.discount?.amount?.toFixed(2) ?? '0.00'
    if (sale.lines?.length) {
      for (const line of sale.lines) {
        rows.push([sale.ref ?? '', new Date(sale.date).toLocaleString(isFil ? 'fil-PH' : 'en-PH'),
          sale.method, line.name, line.qty, line.subtotal.toFixed(2), disc, sale.total.toFixed(2)])
      }
    } else {
      rows.push([sale.ref ?? '', new Date(sale.date).toLocaleString(), sale.method, '', sale.itemCount, '', disc, sale.total.toFixed(2)])
    }
  }
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sales-${period}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function SummaryCard({ sales, lang }) {
  const total = sales.reduce((sum, s) => sum + s.total, 0)
  const cashTotal = sales.filter(s => s.method === 'cash').reduce((sum, s) => sum + s.total, 0)
  const gcashTotal = sales.filter(s => s.method === 'gcash').reduce((sum, s) => sum + s.total, 0)

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-amber-light border border-amber rounded-card p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-amber-dark uppercase tracking-wide">{t('totalAmount', lang)}</p>
          <p className="font-mono text-3xl font-medium text-amber-dark">₱{total.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-amber">{sales.length}</p>
          <p className="text-xs font-bold text-amber-dark">{t('transactions', lang)}</p>
        </div>
      </div>
      {(cashTotal > 0 || gcashTotal > 0) && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface border border-border rounded-card p-3">
            <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1">💵 Cash</p>
            <p className="font-mono text-lg font-bold text-text">₱{cashTotal.toFixed(2)}</p>
          </div>
          <div className="bg-green-light border border-green rounded-card p-3">
            <p className="text-[10px] font-bold text-green uppercase tracking-wide mb-1">💚 GCash</p>
            <p className="font-mono text-lg font-bold text-green">₱{gcashTotal.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function BestSellers({ sales, lang }) {
  const itemTotals = {}
  for (const sale of sales) {
    for (const line of (sale.lines || [])) {
      if (!itemTotals[line.name]) itemTotals[line.name] = { qty: 0, revenue: 0 }
      itemTotals[line.name].qty += line.qty
      itemTotals[line.name].revenue += line.subtotal
    }
  }
  const best = Object.entries(itemTotals).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5)
  if (!best.length) return null
  return (
    <div className="bg-surface border border-border rounded-card overflow-hidden">
      <p className="px-4 pt-3 pb-1 text-[10px] font-extrabold text-faint uppercase tracking-widest">{t('bestSellers', lang)}</p>
      {best.map(([name, { qty, revenue }], idx) => (
        <div key={name} className="flex items-center justify-between px-4 py-2.5 border-t border-border">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-extrabold font-mono text-faint w-4 flex-shrink-0">{idx + 1}</span>
            <p className="text-sm font-semibold text-text truncate">{name}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
            <span className="text-xs font-bold text-muted bg-surface-2 border border-border rounded-full px-2 py-0.5">×{qty}</span>
            <span className="font-mono text-sm font-medium text-amber-dark">₱{revenue.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

const SALES_LOADERS = { today: getTodaySales, week: getWeeklySales, month: getMonthlySales }
const EXPENSE_LOADERS = { today: getTodayExpenses, week: getWeeklyExpenses, month: getMonthlyExpenses }

function GastosSection({ expenses, lang, onAdd, onDelete }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const gastosTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

  function handleAdd() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    onAdd({ name: name.trim(), amount: amt })
    setName('')
    setAmount('')
  }

  return (
    <div className="bg-surface border border-border rounded-card overflow-hidden">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <p className="text-[10px] font-extrabold text-faint uppercase tracking-widest">🧾 {t('gastos', lang)}</p>
        {gastosTotal > 0 && (
          <p className="font-mono text-sm font-bold" style={{ color: 'var(--error)' }}>-₱{gastosTotal.toFixed(2)}</p>
        )}
      </div>

      {/* Add expense row */}
      <div className="flex gap-2 px-4 py-2.5">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('gastosName', lang)}
          className="flex-1 min-w-0 h-11 rounded-lg border border-border px-3 text-sm font-medium bg-surface-2 focus:outline-none focus:border-amber text-text"
        />
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="₱0"
          className="w-20 h-11 rounded-lg border border-border px-2 font-mono text-sm font-semibold bg-surface-2 focus:outline-none focus:border-amber text-text"
        />
        <button
          onClick={handleAdd}
          disabled={!parseFloat(amount)}
          className="h-11 px-3.5 rounded-btn bg-amber text-white font-bold text-sm disabled:opacity-40 flex-shrink-0"
        >
          {t('addGastos', lang)}
        </button>
      </div>

      {expenses.length > 0 && (
        <div className="border-t border-border">
          {[...expenses].reverse().map(exp => (
            <div key={exp.id} className="flex items-center justify-between px-4 py-2 border-b border-border last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text truncate">{exp.name || t('gastos', lang)}</p>
                <p className="text-[10px] text-faint">
                  {new Date(exp.date).toLocaleString(lang === 'fil' ? 'fil-PH' : 'en-PH', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <p className="font-mono text-sm font-semibold" style={{ color: 'var(--error)' }}>-₱{exp.amount.toFixed(2)}</p>
                <button
                  onClick={() => onDelete(exp.id)}
                  className="w-8 h-8 flex items-center justify-center text-faint text-base"
                >×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function KitaCard({ sales, expenses, lang }) {
  const bentaTotal = sales.reduce((sum, s) => sum + s.total, 0)
  const gastosTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
  if (gastosTotal === 0) return null
  const kita = bentaTotal - gastosTotal

  return (
    <div className="bg-surface border border-border rounded-card p-4 flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted">{t('benta2', lang)}</p>
        <p className="font-mono text-sm font-semibold text-text">₱{bentaTotal.toFixed(2)}</p>
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted">{t('gastos', lang)}</p>
        <p className="font-mono text-sm font-semibold" style={{ color: 'var(--error)' }}>-₱{gastosTotal.toFixed(2)}</p>
      </div>
      <div className="flex justify-between items-center pt-1.5 mt-0.5 border-t border-border">
        <p className="text-sm font-extrabold text-text uppercase tracking-wide">💰 {t('kita', lang)}</p>
        <p className="font-mono text-xl font-bold" style={{ color: kita >= 0 ? 'var(--green)' : 'var(--error)' }}>
          ₱{kita.toFixed(2)}
        </p>
      </div>
    </div>
  )
}

export default function UlatScreen() {
  const { lang } = useStore()
  const [period, setPeriod] = useState('today')
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    SALES_LOADERS[period]().then(setSales)
    EXPENSE_LOADERS[period]().then(setExpenses)
  }, [period])

  async function handleAddExpense(expense) {
    await addExpense(expense)
    EXPENSE_LOADERS[period]().then(setExpenses)
  }

  async function handleDeleteExpense(id) {
    await deleteExpense(id)
    EXPENSE_LOADERS[period]().then(setExpenses)
  }

  const periodLabel = { today: t('periodToday', lang), week: t('periodWeek', lang), month: t('periodMonth', lang) }

  return (
    <div className="screen-enter">
      <header className="sticky top-0 bg-surface border-b border-border px-4 py-3 z-10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-lg font-extrabold text-text">{t('todaySales', lang)}</p>
          {sales.length > 0 && (
            <button
              onClick={() => exportCSV(sales, lang, period)}
              className="h-9 px-3 rounded-btn border border-border bg-surface text-xs font-bold text-muted flex items-center gap-1.5"
            >
              <span>📥</span> {t('exportCSV', lang)}
            </button>
          )}
        </div>
        {/* Period tabs */}
        <div className="flex gap-1.5">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="flex-1 h-10 rounded-lg text-xs font-bold transition-all"
              style={period === p
                ? { background: 'var(--amber)', color: '#fff' }
                : { background: 'var(--surface-2)', color: 'var(--text-muted)' }}
            >
              {periodLabel[p]}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4 flex flex-col gap-3">
        <SummaryCard sales={sales} lang={lang} />
        <KitaCard sales={sales} expenses={expenses} lang={lang} />
        <GastosSection expenses={expenses} lang={lang} onAdd={handleAddExpense} onDelete={handleDeleteExpense} />
        <BestSellers sales={sales} lang={lang} />
      </div>

      {/* Transaction list */}
      <div className="px-4 flex flex-col gap-2 pb-4">
        {sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="text-5xl">📊</span>
            <p className="text-muted text-sm">{t('noSales', lang)}</p>
          </div>
        ) : (
          [...sales].reverse().map((sale) => {
            const isOpen = expanded === sale.id
            return (
              <div key={sale.id} className="bg-surface border border-border rounded-card overflow-hidden">
                <button
                  onClick={() => setExpanded(prev => prev === sale.id ? null : sale.id)}
                  className="w-full flex items-center justify-between px-3 py-3 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono font-bold text-faint bg-surface-2 border border-border rounded px-1.5 py-0.5 flex-shrink-0">
                      {sale.ref || '—'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      sale.method === 'gcash' ? 'bg-green-light text-green' : 'bg-surface-2 text-muted'
                    }`}>
                      {sale.method === 'gcash' ? 'GCash' : 'Cash'}
                    </span>
                    <span className="text-xs text-muted truncate">
                      {new Date(sale.date).toLocaleString(lang === 'fil' ? 'fil-PH' : 'en-PH', {
                        month: period === 'today' ? undefined : 'short',
                        day: period === 'today' ? undefined : 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="font-mono font-medium text-text text-sm">₱{sale.total.toFixed(2)}</span>
                    <span className={`text-faint text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-surface-2 px-3 py-2 flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1">{t('orderDetails', lang)}</p>
                    {sale.lines?.length > 0 ? (
                      sale.lines.map((line, i) => (
                        <div key={i} className="border-b border-border last:border-0 py-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-faint w-5 text-right">{line.qty}×</span>
                              <span className="text-sm font-medium text-text">{line.name}</span>
                            </div>
                            <span className="font-mono text-sm text-muted">₱{line.subtotal.toFixed(2)}</span>
                          </div>
                          {line.addons?.length > 0 && <p className="text-[11px] text-faint ml-7">+ {line.addons.join(', ')}</p>}
                          {line.note && <p className="text-[11px] text-faint ml-7 italic">* {line.note}</p>}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-faint py-1">{sale.itemCount} {t('items', lang)}</p>
                    )}
                    {sale.discount?.amount > 0 && (
                      <div className="flex justify-between pt-0.5">
                        <span className="text-xs text-muted">{t('discount', lang)}</span>
                        <span className="font-mono text-sm text-green">-₱{sale.discount.amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 mt-0.5 border-t border-border">
                      <span className="text-xs font-bold text-muted">{t('totalAmount', lang)}</span>
                      <span className="font-mono text-sm font-bold text-amber-dark">₱{sale.total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
