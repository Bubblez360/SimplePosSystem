import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { getCurrentShift, openShift, closeShift, getSalesByRange } from '../db/db'
import { autoSync } from '../lib/sync'
import { t } from '../i18n'
import Sheet from './Sheet'
import Icon from './Icon'
import AmountInput from './AmountInput'
import { peso } from './cart/useCart'

export default function ShiftModal() {
  const lang = useStore(s => s.lang)
  const setShiftModalOpen = useStore(s => s.setShiftModalOpen)
  const currentShift = useStore(s => s.currentShift)
  const setCurrentShift = useStore(s => s.setCurrentShift)
  const showToast = useStore(s => s.showToast)
  const [floatInput, setFloatInput] = useState('')
  const [summary, setSummary] = useState(null)
  const [busy, setBusy] = useState(false)
  const isFil = lang === 'fil'
  const close = () => setShiftModalOpen(false)

  useEffect(() => { getCurrentShift().then(setCurrentShift) }, [setCurrentShift])

  async function run(action) {
    setBusy(true)
    try {
      await action()
    } catch {
      showToast(t('saleError', lang), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleOpen = () => run(async () => {
    setCurrentShift(await openShift(Number(floatInput) || 0))
    close()
  })

  // Sales since the shift opened — not just "today", so a shift that crosses
  // midnight still counts everything. closeShift() drops voided sales.
  const handleClose = () => run(async () => {
    const sales = await getSalesByRange(new Date(currentShift.openedAt), new Date())
    setSummary(await closeShift(sales))
    setCurrentShift(null)
    autoSync() // back up the day's sales on close (fire-and-forget)
  })

  const title = summary ? t('shiftSummary', lang) : currentShift ? t('closeShift', lang) : t('openShift', lang)

  return (
    <Sheet title={title} closeLabel={t('close', lang)} onClose={close}>
      <div className="px-5 pb-5 sheet-pb flex flex-col gap-4">
        {summary ? (
          <>
            <div className="rounded-card bg-amber-light border border-amber/40 p-5">
              <p className="eyebrow !text-amber-ink">{t('totalAmount', lang)}</p>
              <p className="font-mono text-[40px] font-medium leading-none text-text mt-1">{peso(summary.totalSales)}</p>
              <p className="text-[13px] font-semibold text-amber-ink mt-2">
                {summary.transactionCount} {t('transactions', lang)}
                {summary.voidedCount > 0 && ` · ${summary.voidedCount} ${t('voided', lang).toLowerCase()}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="card p-4">
                <p className="eyebrow flex items-center gap-1.5"><Icon name="banknote" size={14} />{t('shiftCash', lang)}</p>
                <p className="font-mono text-[20px] font-medium mt-1">{peso(summary.cashSales)}</p>
              </div>
              <div className="rounded-card bg-green-light border border-green/40 p-4">
                <p className="eyebrow !text-green flex items-center gap-1.5"><Icon name="phone" size={14} />{t('shiftGcash', lang)}</p>
                <p className="font-mono text-[20px] font-medium text-green mt-1">{peso(summary.gcashSales)}</p>
              </div>
            </div>

            <dl className="card p-4 flex flex-col gap-2">
              <div className="flex justify-between text-[14px]">
                <dt className="text-muted">{t('openingFloat', lang)}</dt>
                <dd className="font-mono font-medium">{peso(summary.openingFloat)}</dd>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-border">
                <dt className="text-[14px] font-bold">{t('expectedCash', lang)}</dt>
                <dd className="font-mono text-[22px] font-medium text-amber-ink">{peso(summary.expectedCash)}</dd>
              </div>
            </dl>

            <button type="button" data-autofocus onClick={close} className="btn-primary w-full h-14 text-base">OK</button>
          </>
        ) : currentShift ? (
          <>
            <div className="card p-4 flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-amber-light text-amber-ink flex items-center justify-center shrink-0">
                <Icon name="clock" size={22} />
              </span>
              <div className="min-w-0">
                <p className="eyebrow">{t('shiftOpen', lang)}</p>
                <p className="text-[14px] font-bold">{new Date(currentShift.openedAt).toLocaleString(isFil ? 'fil-PH' : 'en-PH')}</p>
                <p className="text-[12px] text-muted">
                  {t('openingFloat', lang)}: <span className="font-mono font-medium">{peso(currentShift.openingFloat)}</span>
                </p>
              </div>
            </div>
            <button type="button" onClick={handleClose} disabled={busy} className="btn-danger w-full h-14 text-base">
              {busy ? '…' : t('closeShift', lang)}
            </button>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="shift-float" className="field-label">{t('openingFloat', lang)}</label>
              <AmountInput
                id="shift-float"
                size="lg"
                data-autofocus
                value={floatInput}
                onChange={setFloatInput}
                onKeyDown={e => e.key === 'Enter' && !busy && handleOpen()}
              />
              <p className="text-[12px] text-muted mt-2">
                {isFil ? 'Ilagay ang pera na nasa kahon bago magsimula' : 'Enter the cash in the drawer before you start'}
              </p>
            </div>
            <button type="button" onClick={handleOpen} disabled={busy} className="btn-primary w-full h-14 text-base">
              {busy ? '…' : t('openShift', lang)}
            </button>
          </>
        )}
      </div>
    </Sheet>
  )
}
