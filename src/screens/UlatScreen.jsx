import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../store/useStore'
import {
  getTodaySales, getWeeklySales, getYearlySales,
  getTodayExpenses, getWeeklyExpenses, getYearlyExpenses,
  addExpense, deleteExpense,
} from '../db/db'
import { t } from '../i18n'

const PERIODS = ['today', 'week', 'month']
const SALES_LOADERS = { today: getTodaySales, week: getWeeklySales, month: getYearlySales }
const EXPENSE_LOADERS = { today: getTodayExpenses, week: getWeeklyExpenses, month: getYearlyExpenses }

function exportCSV(sales, lang, period, expenses, businessName) {
  const isFil = lang === 'fil'
  const locale = isFil ? 'fil-PH' : 'en-PH'
  const now = new Date()
  const dateStr = now.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
  const periodNames = { today: isFil ? 'Ngayon' : 'Today', week: isFil ? 'Linggong Ito' : 'This Week', month: isFil ? 'Taong Ito' : 'This Year' }

  const totalSales = sales.reduce((s, x) => s + x.total, 0)
  const cashSales = sales.filter(x => x.method === 'cash').reduce((s, x) => s + x.total, 0)
  const gcashSales = sales.filter(x => x.method === 'gcash').reduce((s, x) => s + x.total, 0)
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0)
  const profit = totalSales - totalExpenses

  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const row = (...cols) => cols.map(q).join(',')
  const blank = () => ''

  const lines = []

  // ── Title block ──
  lines.push(row(businessName || 'TindaPOS', '', '', '', '', '', '', ''))
  lines.push(row((isFil ? 'Ulat ng Benta' : 'Sales Report') + ' — ' + periodNames[period], '', '', '', '', '', '', ''))
  lines.push(row((isFil ? 'Na-export:' : 'Exported:') + ' ' + dateStr, '', '', '', '', '', '', ''))
  lines.push(blank())

  // ── Summary block ──
  lines.push(row(isFil ? '=== BUOD ===' : '=== SUMMARY ===', '', '', '', '', '', '', ''))
  lines.push(row(isFil ? 'Kabuuang Benta' : 'Total Sales', '', '₱' + totalSales.toFixed(2), '', '', '', '', ''))
  lines.push(row(isFil ? 'Cash na Benta' : 'Cash Sales', '', '₱' + cashSales.toFixed(2), '', '', '', '', ''))
  lines.push(row('GCash Sales', '', '₱' + gcashSales.toFixed(2), '', '', '', '', ''))
  lines.push(row(isFil ? 'Gastos' : 'Expenses', '', '₱' + totalExpenses.toFixed(2), '', '', '', '', ''))
  lines.push(row(isFil ? 'Kita (Benta - Gastos)' : 'Profit (Sales - Expenses)', '', '₱' + profit.toFixed(2), '', '', '', '', ''))
  lines.push(row(isFil ? 'Bilang ng Transaksyon' : 'Total Transactions', '', sales.length, '', '', '', '', ''))
  lines.push(blank())

  // ── Transactions ──
  lines.push(row(isFil ? '=== MGA TRANSAKSYON ===' : '=== TRANSACTIONS ===', '', '', '', '', '', '', ''))
  lines.push(row('Ref', isFil ? 'Petsa at Oras' : 'Date & Time', isFil ? 'Paraan' : 'Method', 'Item', 'Qty', 'Subtotal', isFil ? 'Diskwento' : 'Discount', isFil ? 'Kabuuan' : 'Total'))
  for (const sale of sales) {
    const disc = sale.discount?.amount?.toFixed(2) ?? '0.00'
    const dateTime = new Date(sale.date).toLocaleString(locale)
    if (sale.lines?.length) {
      for (let i = 0; i < sale.lines.length; i++) {
        const line = sale.lines[i]
        lines.push(row(i === 0 ? (sale.ref ?? '') : '', i === 0 ? dateTime : '', i === 0 ? sale.method : '', line.name, line.qty, '₱' + line.subtotal.toFixed(2), i === 0 ? '₱' + disc : '', i === 0 ? '₱' + sale.total.toFixed(2) : ''))
      }
    } else {
      lines.push(row(sale.ref ?? '', dateTime, sale.method, '', sale.itemCount ?? '', '', '₱' + disc, '₱' + sale.total.toFixed(2)))
    }
  }
  lines.push(blank())

  // ── Expenses ──
  if (expenses.length > 0) {
    lines.push(row(isFil ? '=== GASTOS ===' : '=== EXPENSES ===', '', '', '', '', '', '', ''))
    lines.push(row(isFil ? 'Petsa' : 'Date', isFil ? 'Para Saan' : 'Description', isFil ? 'Halaga' : 'Amount', '', '', '', '', ''))
    for (const exp of expenses) {
      lines.push(row(new Date(exp.date).toLocaleString(locale), exp.name || '', '₱' + exp.amount.toFixed(2), '', '', '', '', ''))
    }
  }

  const csv = lines.join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(businessName || 'sales').replace(/\s+/g, '-').toLowerCase()}-${period}-${now.toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function GastosSection({ expenses, lang, onAdd, onDelete }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const gastosTotal = expenses.reduce((s, e) => s + e.amount, 0)

  function handleAdd() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    onAdd({ name: name.trim(), amount: amt })
    setName(''); setAmount('')
  }

  return (
    <div className="bg-surface border border-border rounded-card overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <p className="text-xs font-extrabold text-muted uppercase tracking-widest">🧾 {t('gastos', lang)}</p>
        {gastosTotal > 0 && (
          <span className="font-mono text-sm font-bold text-error">−₱{gastosTotal.toFixed(2)}</span>
        )}
      </div>
      <div className="flex gap-2 px-4 pb-3">
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder={t('gastosName', lang)}
          className="flex-1 min-w-0 h-10 rounded-lg border border-border px-3 text-sm font-medium bg-surface-2 focus:outline-none focus:border-amber text-text" />
        <input type="number" inputMode="decimal" value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="₱0"
          className="w-20 h-10 rounded-lg border border-border px-2 font-mono text-sm bg-surface-2 focus:outline-none focus:border-amber text-text" />
        <button onClick={handleAdd} disabled={!parseFloat(amount)}
          className="h-10 px-3 rounded-btn bg-amber text-white font-bold text-sm disabled:opacity-40 flex-shrink-0">
          {t('addGastos', lang)}
        </button>
      </div>
      {expenses.length > 0 && (
        <div className="border-t border-border">
          {[...expenses].reverse().map(exp => (
            <div key={exp.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text truncate">{exp.name || t('gastos', lang)}</p>
                <p className="text-[10px] text-faint">{new Date(exp.date).toLocaleString(lang === 'fil' ? 'fil-PH' : 'en-PH',
                  { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="font-mono text-sm font-semibold text-error">−₱{exp.amount.toFixed(2)}</span>
                <button onClick={() => onDelete(exp.id)} className="w-7 h-7 flex items-center justify-center text-faint text-lg">×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function UlatScreen() {
  const { lang, items, categories, businessName } = useStore()
  const [period, setPeriod] = useState('today')
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [view, setView] = useState('analytics')

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

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const total = useMemo(() => sales.reduce((s, x) => s + x.total, 0), [sales])
  const cashTotal = useMemo(() => sales.filter(s => s.method === 'cash').reduce((s, x) => s + x.total, 0), [sales])
  const gcashTotal = useMemo(() => sales.filter(s => s.method === 'gcash').reduce((s, x) => s + x.total, 0), [sales])
  const gastosTotal = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])
  const kita = total - gastosTotal
  const avgOrder = sales.length > 0 ? total / sales.length : 0

  // ── Best sellers ─────────────────────────────────────────────────────────────
  const bestSellers = useMemo(() => {
    const map = {}
    for (const sale of sales) {
      for (const line of (sale.lines || [])) {
        if (!map[line.name]) map[line.name] = { qty: 0, revenue: 0 }
        map[line.name].qty += line.qty
        map[line.name].revenue += line.subtotal
      }
    }
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 6)
  }, [sales])

  // ── Category breakdown ───────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const itemCatMap = {}
    for (const item of items) {
      if (item.categoryId) {
        const cat = categories.find(c => c.id === item.categoryId)
        if (cat) itemCatMap[item.name] = cat
      }
    }
    const map = {}
    for (const sale of sales) {
      for (const line of (sale.lines || [])) {
        const cat = itemCatMap[line.name]
        const key = cat ? `${cat.emoji || ''} ${cat.name}` : (lang === 'fil' ? 'Iba pa' : 'Others')
        if (!map[key]) map[key] = 0
        map[key] += line.subtotal
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [sales, items, categories, lang])

  // ── Time chart ───────────────────────────────────────────────────────────────
  const timeChart = useMemo(() => {
    if (period === 'today') {
      const hours = Array(24).fill(0)
      for (const sale of sales) hours[new Date(sale.date).getHours()] += sale.total
      return hours.slice(6, 23).map((v, i) => {
        const h = i + 6
        return { label: h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`, value: v }
      })
    }
    if (period === 'week') {
      const labels = lang === 'fil'
        ? ['Lin', 'Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const vals = Array(7).fill(0)
      for (const sale of sales) vals[new Date(sale.date).getDay()] += sale.total
      return labels.map((label, i) => ({ label, value: vals[i] }))
    }
    const monthLabels = lang === 'fil'
      ? ['Ene','Peb','Mar','Abr','May','Hun','Hul','Ago','Set','Okt','Nob','Dis']
      : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const vals = Array(12).fill(0)
    for (const sale of sales) vals[new Date(sale.date).getMonth()] += sale.total
    return monthLabels.map((label, i) => ({ label, value: vals[i] }))
  }, [sales, period, lang])

  const maxBar = Math.max(...timeChart.map(d => d.value), 1)
  const maxSeller = bestSellers.length > 0 ? bestSellers[0][1].revenue : 1
  const maxCat = categoryData.length > 0 ? categoryData[0][1] : 1

  const periodLabel = {
    today: t('periodToday', lang),
    week: t('periodWeek', lang),
    month: t('periodMonth', lang),
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="screen-enter">
      {/* Header */}
      <header className="sticky top-0 bg-surface border-b border-border z-10 px-4 pt-3 pb-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-lg font-extrabold text-text">{t('ulat', lang)}</p>
          {sales.length > 0 && (
            <button onClick={() => exportCSV(sales, lang, period, expenses, businessName)}
              className="h-8 px-3 rounded-btn border border-border bg-surface text-xs font-bold text-muted flex items-center gap-1.5">
              <span>📥</span> CSV
            </button>
          )}
        </div>
        <div className="flex gap-0">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-all ${
                period === p ? 'border-amber text-amber' : 'border-transparent text-muted'
              }`}>
              {periodLabel[p]}
            </button>
          ))}
        </div>
        <div className="flex gap-0 border-t border-border">
          {['analytics', 'transactions'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all ${
                view === v ? 'border-amber text-amber' : 'border-transparent text-muted'
              }`}>
              {v === 'analytics'
                ? (lang === 'fil' ? '📊 Analytics' : '📊 Analytics')
                : `🧾 ${lang === 'fil' ? 'Transaksyon' : 'Transactions'}${sales.length > 0 ? ` (${sales.length})` : ''}`}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-3 p-4 pb-6">

      {view === 'analytics' && <>

        {/* ── Hero card ── */}
        <div className="rounded-card overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--amber) 0%, var(--amber-dark) 100%)' }}>
          <div className="px-5 pt-5 pb-4">
            <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest mb-1">
              {period === 'today' ? (lang === 'fil' ? 'Benta Ngayon' : "Today's Sales")
                : period === 'week' ? (lang === 'fil' ? 'Benta Ngayong Linggo' : 'This Week')
                : (lang === 'fil' ? 'Benta Ngayong Buwan' : 'This Month')}
            </p>
            <p className="font-mono text-4xl font-bold text-white leading-none tracking-tight">
              ₱{total.toFixed(2)}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wide">{t('transactions', lang)}</p>
                <p className="text-white font-extrabold text-xl leading-none">{sales.length}</p>
              </div>
              {avgOrder > 0 && (
                <div>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wide">
                    {lang === 'fil' ? 'Avg. Order' : 'Avg. Order'}
                  </p>
                  <p className="text-white font-extrabold text-xl leading-none font-mono">₱{avgOrder.toFixed(0)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment split bar */}
          {(cashTotal > 0 || gcashTotal > 0) && (
            <div className="px-5 pb-4">
              <div className="flex rounded-full overflow-hidden h-2 bg-white/20">
                {cashTotal > 0 && (
                  <div style={{ width: `${(cashTotal / total) * 100}%`, background: 'rgba(255,255,255,0.6)' }} />
                )}
                {gcashTotal > 0 && (
                  <div style={{ width: `${(gcashTotal / total) * 100}%`, background: 'var(--green)' }} />
                )}
              </div>
              <div className="flex gap-4 mt-2">
                {cashTotal > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-white/60" />
                    <span className="text-white/80 text-[10px] font-bold">Cash ₱{cashTotal.toFixed(0)}</span>
                  </div>
                )}
                {gcashTotal > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--green)' }} />
                    <span className="text-white/80 text-[10px] font-bold">GCash ₱{gcashTotal.toFixed(0)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Profit snapshot ── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface border border-border rounded-card p-3">
            <p className="text-[9px] font-bold text-muted uppercase tracking-wide mb-1">💵 Cash</p>
            <p className="font-mono text-sm font-bold text-text">₱{cashTotal.toFixed(0)}</p>
          </div>
          <div className="bg-surface border border-border rounded-card p-3" style={{ borderColor: 'var(--green)', background: 'var(--green-light)' }}>
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--green)' }}>💚 GCash</p>
            <p className="font-mono text-sm font-bold" style={{ color: 'var(--green)' }}>₱{gcashTotal.toFixed(0)}</p>
          </div>
          <div className="bg-surface border border-border rounded-card p-3"
            style={gastosTotal > 0 ? { borderColor: kita >= 0 ? 'var(--green)' : 'var(--error)', background: kita >= 0 ? 'var(--green-light)' : '#FEF2F2' } : {}}>
            <p className="text-[9px] font-bold text-muted uppercase tracking-wide mb-1">💰 {t('kita', lang)}</p>
            <p className="font-mono text-sm font-bold" style={{ color: gastosTotal > 0 ? (kita >= 0 ? 'var(--green)' : 'var(--error)') : 'var(--text)' }}>
              ₱{kita.toFixed(0)}
            </p>
          </div>
        </div>

        {/* ── Time chart ── */}
        {total > 0 && (
          <div className="bg-surface border border-border rounded-card p-4">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest mb-3">
              {period === 'today' ? (lang === 'fil' ? '🕐 Oras ng Benta' : '🕐 Sales by Hour')
                : period === 'week' ? (lang === 'fil' ? '📅 Araw ng Benta' : '📅 Sales by Day')
                : (lang === 'fil' ? '📅 Buwan ng Taon' : '📅 Monthly Trend')}
            </p>
            <div className={`flex items-end gap-0.5 h-16 ${period === 'month' ? 'gap-px' : 'gap-1'}`}>
              {timeChart.map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-sm flex-shrink-0"
                    style={{
                      height: `${Math.max(2, (bar.value / maxBar) * 52)}px`,
                      background: bar.value > 0 ? 'var(--amber)' : 'var(--border)',
                      opacity: bar.value > 0 ? 1 : 0.4,
                    }} />
                  <span className="text-[8px] font-bold text-faint leading-none">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Best sellers ── */}
        {bestSellers.length > 0 && (
          <div className="bg-surface border border-border rounded-card overflow-hidden">
            <p className="px-4 pt-3 pb-2 text-[10px] font-extrabold text-muted uppercase tracking-widest">
              🏆 {t('bestSellers', lang)}
            </p>
            <div className="flex flex-col">
              {bestSellers.map(([name, { qty, revenue }], idx) => (
                <div key={name} className="px-4 py-2.5 border-t border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        idx === 0 ? 'bg-amber text-white' : 'bg-surface-2 text-muted'
                      }`}>{idx + 1}</span>
                      <p className="text-sm font-semibold text-text truncate">{name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-[10px] font-bold text-muted bg-surface-2 border border-border rounded-full px-2 py-0.5">×{qty}</span>
                      <span className="font-mono text-xs font-bold text-amber-dark">₱{revenue.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(revenue / maxSeller) * 100}%`, background: idx === 0 ? 'var(--amber)' : 'var(--border)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Category breakdown ── */}
        {categoryData.length > 0 && (
          <div className="bg-surface border border-border rounded-card overflow-hidden">
            <p className="px-4 pt-3 pb-2 text-[10px] font-extrabold text-muted uppercase tracking-widest">
              📂 {lang === 'fil' ? 'Benta sa Kategorya' : 'Sales by Category'}
            </p>
            <div className="flex flex-col">
              {categoryData.map(([cat, revenue]) => (
                <div key={cat} className="px-4 py-2.5 border-t border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold text-text">{cat}</p>
                    <span className="font-mono text-xs font-bold text-amber-dark">₱{revenue.toFixed(0)}</span>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${(revenue / maxCat) * 100}%`, background: 'var(--amber)' }} />
                  </div>
                  <p className="text-[10px] text-faint mt-0.5">
                    {total > 0 ? `${((revenue / total) * 100).toFixed(0)}%` : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Gastos ── */}
        <GastosSection expenses={expenses} lang={lang} onAdd={handleAddExpense} onDelete={handleDeleteExpense} />

      </>}

      {view === 'transactions' && (
        sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">📊</span>
            <p className="text-muted text-sm">{t('noSales', lang)}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...sales].reverse().map(sale => {
              const isOpen = expanded === sale.id
              return (
                <div key={sale.id} className="bg-surface border border-border rounded-card overflow-hidden">
                  <button
                    onClick={() => setExpanded(prev => prev === sale.id ? null : sale.id)}
                    className="w-full flex items-center justify-between px-3 py-3 text-left">
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
                      {sale.lines?.length > 0 ? sale.lines.map((line, i) => (
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
                      )) : (
                        <p className="text-xs text-faint py-1">{sale.itemCount} {t('items', lang)}</p>
                      )}
                      {sale.discount?.amount > 0 && (
                        <div className="flex justify-between pt-0.5">
                          <span className="text-xs text-muted">{t('discount', lang)}</span>
                          <span className="font-mono text-sm text-green">−₱{sale.discount.amount.toFixed(2)}</span>
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
            })}
          </div>
        )
      )}

      </div>
    </div>
  )
}
