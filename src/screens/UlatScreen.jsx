import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import {
  getTodaySales, getWeeklySales, getYearlySales,
  getTodayExpenses, getWeeklyExpenses, getYearlyExpenses,
  addExpense, deleteExpense, voidSale, getAllItems,
} from '../db/db'
import { computeReport } from '../lib/report'
import { downloadCsv } from '../utils/exportCsv'
import { isPeriodLocked, canExportCsv } from '../lib/premium'
import { t } from '../i18n'
import Icon from '../components/Icon'
import { BarChart, RankedRows } from '../components/ulat/Charts'
import ExpensesCard from '../components/ulat/ExpensesCard'
import TransactionList from '../components/ulat/TransactionList'
import { peso } from '../components/cart/useCart'

// "month" is the third tab key for historical reasons; it loads year-to-date.
const PERIODS = ['today', 'week', 'month']
const SALES_LOADERS = { today: getTodaySales, week: getWeeklySales, month: getYearlySales }
const EXPENSE_LOADERS = { today: getTodayExpenses, week: getWeeklyExpenses, month: getYearlyExpenses }

function Segmented({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 p-1 rounded-2xl bg-surface-2">
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`flex-1 min-h-[44px] px-3 rounded-xl text-[14px] font-bold transition-colors duration-150 cursor-pointer ${
            value === key ? 'bg-surface text-text shadow-card' : 'text-muted hover:text-text'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

function LedgerRow({ label, value, swatch, tone, strong = false }) {
  const color = tone === 'green' ? 'text-green' : tone === 'error' ? 'text-error' : 'text-text'
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? 'pt-3 mt-1' : 'py-2.5'}`}>
      <dt className={`flex items-center gap-2 ${strong ? 'text-[16px] font-extrabold' : 'text-[14px] font-semibold text-muted'}`}>
        {swatch && <span className={`w-3 h-3 rounded-full ${swatch}`} aria-hidden="true" />}
        {label}
      </dt>
      <dd className={`font-mono ${strong ? 'text-[24px]' : 'text-[16px]'} font-medium ${color}`}>{value}</dd>
    </div>
  )
}

export default function UlatScreen() {
  const lang = useStore(s => s.lang)
  const items = useStore(s => s.items)
  const categories = useStore(s => s.categories)
  const businessName = useStore(s => s.businessName)
  const isPremium = useStore(s => s.isPremium)
  const setScreen = useStore(s => s.setScreen)
  const showToast = useStore(s => s.showToast)
  const setItems = useStore(s => s.setItems)
  const [period, setPeriod] = useState('today')
  const [view, setView] = useState('analytics')
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])

  const loadSales = () => SALES_LOADERS[period]().then(setSales)
  const loadExpenses = () => EXPENSE_LOADERS[period]().then(setExpenses)

  useEffect(() => {
    let live = true
    SALES_LOADERS[period]().then(r => live && setSales(r))
    EXPENSE_LOADERS[period]().then(r => live && setExpenses(r))
    return () => { live = false }
  }, [period])

  async function handleAddExpense(expense) {
    await addExpense(expense)
    loadExpenses()
  }
  async function handleDeleteExpense(id) {
    await deleteExpense(id)
    loadExpenses()
  }
  async function handleVoid(id) {
    if (!window.confirm(t('voidConfirm', lang))) return
    await voidSale(id)
    loadSales()
    setItems(await getAllItems()) // reflect restored stock
  }

  const r = useMemo(
    () => computeReport({ sales, expenses, items, categories, period, lang }),
    [sales, expenses, items, categories, period, lang],
  )

  const locked = isPeriodLocked(period, isPremium)

  function handleCsv() {
    if (!canExportCsv(isPremium)) {
      showToast(t('premiumCsvLocked', lang), 'warn')
      return
    }
    downloadCsv({ sales: r.active, expenses, lang, period, businessName })
  }

  const periodLabels = [['today', t('periodToday', lang)], ['week', t('periodWeek', lang)], ['month', t('periodMonth', lang)]]
  const heroLabel = period === 'today' ? t('todaySales', lang) : period === 'week' ? t('weeklySales', lang) : t('monthlySales', lang)
  const chartTitle = period === 'today' ? t('salesByHour', lang) : period === 'week' ? t('salesByDay', lang) : t('monthlyTrend', lang)
  const peak = r.series.reduce((b, d) => (d.value > b.value ? d : b), r.series[0])
  const cashShare = r.total > 0 ? (r.cash / r.total) * 100 : 0
  // Category rows are gross line revenue (before order-level discounts), so
  // their shares are measured against the gross sum, never the discounted total.
  const categoryGross = r.categoryData.reduce((s, c) => s + c.value, 0)

  return (
    <div className="screen-enter">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-border px-4 pt-3 pb-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[22px] font-extrabold tracking-tight">{t('ulat', lang)}</h1>
          {r.active.length > 0 && !locked && (
            <button type="button" className="btn-secondary btn-sm" onClick={handleCsv}>
              <Icon name={isPremium ? 'download' : 'lock'} size={16} />
              CSV
            </button>
          )}
        </div>
        <Segmented label={t('ulat', lang)} options={periodLabels} value={period} onChange={setPeriod} />
        <Segmented
          label={t('ulat', lang)}
          options={[
            ['analytics', t('analyticsTab', lang)],
            ['transactions', `${t('transactionsTab', lang)}${r.active.length ? ` (${r.active.length})` : ''}`],
          ]}
          value={view}
          onChange={setView}
        />
      </header>

      <div className="flex flex-col gap-3 p-4">
        {locked && (
          <section className="card p-6 text-center" aria-label={t('premiumLockedTitle', lang)}>
            <span className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-amber-bg text-amber-ink flex items-center justify-center"><Icon name="lock" size={26} /></span>
            <h2 className="text-[17px] font-extrabold">{t('premiumLockedTitle', lang)}</h2>
            <p className="mt-2 text-[14px] text-muted">{t('premiumLockedBody', lang)}</p>
            <button type="button" className="btn-primary mt-4 w-full" onClick={() => setScreen('setting')}>
              <Icon name="star" size={18} />{t('goPremium', lang)}
            </button>
          </section>
        )}

        {!locked && view === 'analytics' && (
          <>
            {/* Hero: the one number a vendor checks all day */}
            <section className="rounded-card bg-amber text-on-amber p-5 shadow-card" aria-label={heroLabel}>
              <p className="text-[14px] font-bold opacity-80">{heroLabel}</p>
              <p className="font-mono text-[44px] font-medium leading-none tracking-tight mt-2">{peso(r.total)}</p>
              <p className="mt-3 text-[14px] font-semibold opacity-85">
                {r.active.length} {t('transactions', lang)}
                {r.avgOrder > 0 && <> · {t('avgOrder', lang)} <span className="font-mono">{peso(r.avgOrder, { compact: true })}</span></>}
              </p>
              {r.total > 0 && (
                <div
                  className="mt-4 flex h-2.5 rounded-full overflow-hidden bg-white/40"
                  role="img"
                  aria-label={`Cash ${Math.round(cashShare)}%, GCash ${Math.round(100 - cashShare)}%`}
                >
                  <div className="bg-on-amber" style={{ width: `${cashShare}%` }} />
                  <div className="bg-white" style={{ width: `${100 - cashShare}%` }} />
                </div>
              )}
            </section>

            {/* Ledger: exact figures behind the hero, laid out like a till slip */}
            <section className="card p-4" aria-label={t('ledger', lang)}>
              <dl className="flex flex-col divide-y divide-dashed divide-border">
                <LedgerRow swatch="bg-on-amber" label={t('cash', lang)} value={peso(r.cash)} />
                <LedgerRow swatch="bg-white border border-border-strong" label="GCash" value={peso(r.gcash)} />
                {r.gastos > 0 && <LedgerRow label={t('gastos', lang)} value={`−${peso(r.gastos)}`} tone="error" />}
                <LedgerRow
                  strong
                  label={t('kita', lang)}
                  value={peso(r.kita)}
                  tone={r.gastos > 0 ? (r.kita >= 0 ? 'green' : 'error') : undefined}
                />
              </dl>
            </section>

            {r.total > 0 && (
              <section className="card p-4" aria-label={chartTitle}>
                <h2 className="section-title mb-4"><Icon name={period === 'today' ? 'clock' : 'calendar'} size={18} className="text-muted" />{chartTitle}</h2>
                <BarChart
                  data={r.series}
                  ariaLabel={`${chartTitle}: ${peak.label} ${peso(peak.value, { compact: true })}`}
                />
              </section>
            )}

            {r.bestSellers.length > 0 && (
              <section className="card overflow-hidden" aria-label={t('bestSellers', lang)}>
                <h2 className="section-title px-4 pt-4 pb-1"><Icon name="trophy" size={18} className="text-muted" />{t('bestSellers', lang)}</h2>
                <RankedRows rows={r.bestSellers.map(b => ({ key: b.name, label: b.name, value: b.revenue, badge: `×${b.qty}` }))} />
              </section>
            )}

            {r.categoryData.length > 0 && (
              <section className="card overflow-hidden" aria-label={t('salesByCategory', lang)}>
                <h2 className="section-title px-4 pt-4 pb-1"><Icon name="layers" size={18} className="text-muted" />{t('salesByCategory', lang)}</h2>
                <RankedRows
                  rows={r.categoryData.map(c => ({
                    key: c.label, label: c.label, value: c.value,
                    footnote: categoryGross > 0 ? `${Math.round((c.value / categoryGross) * 100)}%` : undefined,
                  }))}
                />
              </section>
            )}

            {r.total === 0 && r.active.length === 0 && (
              <p className="text-center text-[13px] text-muted py-2">{t('noSales', lang)}</p>
            )}

            <ExpensesCard expenses={expenses} lang={lang} onAdd={handleAddExpense} onDelete={handleDeleteExpense} />
          </>
        )}

        {!locked && view === 'transactions' && (
          sales.length === 0 ? (
            <div className="py-16 text-center card border-dashed shadow-none">
              <span className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-surface-2 text-faint flex items-center justify-center"><Icon name="receipt" size={26} /></span>
              <p className="text-[15px] font-bold">{t('noSales', lang)}</p>
            </div>
          ) : (
            <>
              {r.voidedCount > 0 && (
                <p className="text-[12px] font-bold text-muted px-1">{r.voidedCount} {t('voided', lang).toLowerCase()}</p>
              )}
              <TransactionList sales={sales} period={period} lang={lang} onVoid={handleVoid} />
            </>
          )
        )}
      </div>
    </div>
  )
}
