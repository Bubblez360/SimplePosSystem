import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { getCurrentShift, openShift, closeShift, getTodaySales } from '../db/db'
import { t } from '../i18n'

export default function ShiftModal() {
  const { lang, setShiftModalOpen, currentShift, setCurrentShift } = useStore()
  const [floatInput, setFloatInput] = useState('')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getCurrentShift().then(setCurrentShift)
  }, [setCurrentShift])

  async function handleOpen() {
    setLoading(true)
    const float = parseFloat(floatInput || 0)
    const shift = await openShift(float)
    setCurrentShift(shift)
    setLoading(false)
    setShiftModalOpen(false)
  }

  async function handleClose() {
    setLoading(true)
    const sales = await getTodaySales()
    const shiftSales = currentShift
      ? sales.filter(s => new Date(s.date) >= new Date(currentShift.openedAt))
      : sales
    const record = await closeShift(shiftSales)
    setSummary(record)
    setCurrentShift(null)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm">
      <div className="w-full bg-bg rounded-t-[24px] max-h-[80vh] flex flex-col max-w-2xl mx-auto"
        style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
          <p className="text-xl font-extrabold text-text">
            {currentShift ? t('closeShift', lang) : t('openShift', lang)}
          </p>
          <button
            onClick={() => setShiftModalOpen(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted text-lg"
            style={{ background: 'var(--surface-2)' }}
          >×</button>
        </div>

        <div className="px-5 sheet-pb flex flex-col gap-4 overflow-y-auto">

          {summary ? (
            /* Closed shift summary */
            <div className="flex flex-col gap-3">
              <div className="bg-amber-light border border-amber rounded-card p-4">
                <p className="text-xs font-bold text-amber-dark uppercase tracking-wide mb-2">{t('shiftSummary', lang)}</p>
                <p className="font-mono text-3xl font-medium text-amber-dark">₱{summary.totalSales?.toFixed(2)}</p>
                <p className="text-xs text-amber-dark opacity-70 mt-1">{summary.transactionCount} {t('transactions', lang)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface border border-border rounded-card p-3">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-1">💵 {t('shiftCash', lang)}</p>
                  <p className="font-mono text-lg font-bold text-text">₱{summary.cashSales?.toFixed(2)}</p>
                </div>
                <div className="bg-green-light border border-green rounded-card p-3">
                  <p className="text-[10px] font-bold text-green uppercase tracking-wide mb-1">💚 {t('shiftGcash', lang)}</p>
                  <p className="font-mono text-lg font-bold text-green">₱{summary.gcashSales?.toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-card p-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted">{t('openingFloat', lang)}</p>
                  <p className="font-mono font-bold text-text">₱{summary.openingFloat?.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                  <p className="text-sm font-bold text-text">{t('expectedCash', lang)}</p>
                  <p className="font-mono font-bold text-amber-dark">₱{summary.expectedCash?.toFixed(2)}</p>
                </div>
              </div>

              <button
                onClick={() => setShiftModalOpen(false)}
                className="w-full h-[56px] rounded-[16px] font-extrabold text-base"
                style={{ background: 'var(--amber)', color: '#fff' }}
              >
                OK
              </button>
            </div>
          ) : currentShift ? (
            /* Close shift form */
            <div className="flex flex-col gap-4">
              <div className="bg-surface-2 border border-border rounded-card p-3">
                <p className="text-xs font-bold text-muted uppercase tracking-wide">{t('shiftOpen', lang)}</p>
                <p className="text-sm text-text mt-1">
                  {new Date(currentShift.openedAt).toLocaleString(lang === 'fil' ? 'fil-PH' : 'en-PH')}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {t('openingFloat', lang)}: <span className="font-mono font-bold">₱{currentShift.openingFloat?.toFixed(2)}</span>
                </p>
              </div>

              <button
                onClick={handleClose}
                disabled={loading}
                className="w-full h-[56px] rounded-[16px] font-extrabold text-base"
                style={{ background: loading ? 'var(--border)' : 'var(--error)', color: loading ? 'var(--text-faint)' : '#fff' }}
              >
                {loading ? '...' : t('closeShift', lang)}
              </button>
            </div>
          ) : (
            /* Open shift form */
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wide block mb-2">
                  {t('openingFloat', lang)}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-semibold text-muted text-base">₱</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={floatInput}
                    onChange={e => setFloatInput(e.target.value)}
                    placeholder="0"
                    className="w-full h-14 rounded-[14px] border-2 pl-9 pr-4 font-mono text-2xl font-semibold focus:outline-none transition-colors"
                    style={{ borderColor: floatInput ? 'var(--amber)' : 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                  />
                </div>
                <p className="text-xs text-muted mt-1.5">
                  {lang === 'fil' ? 'Ilagay ang pera na nasa kahon bago magsimula' : 'Enter the cash in the drawer before you start'}
                </p>
              </div>

              <button
                onClick={handleOpen}
                disabled={loading}
                className="w-full h-[56px] rounded-[16px] font-extrabold text-base"
                style={{ background: loading ? 'var(--border)' : 'var(--amber)', color: loading ? 'var(--text-faint)' : '#fff',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(245,158,11,0.4)' }}
              >
                {loading ? '...' : t('openShift', lang)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
