import { useState } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useStore } from '../store/useStore'
import { voidSale, getAllItems } from '../db/db'
import { autoSync } from '../lib/sync'
import { t } from '../i18n'
import Sheet from './Sheet'
import Icon from './Icon'
import { peso } from './cart/useCart'
import '../lib/lottie'
import successAnim from '../assets/success.lottie?url'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function ReceiptModal() {
  const lastSale = useStore(s => s.lastSale)
  const setReceiptOpen = useStore(s => s.setReceiptOpen)
  const setItems = useStore(s => s.setItems)
  const showToast = useStore(s => s.showToast)
  const lang = useStore(s => s.lang)
  const businessName = useStore(s => s.businessName)
  const [busy, setBusy] = useState(false)
  if (!lastSale) return null

  const { id, ref, date, lines, total, method, cashGiven, change, discount } = lastSale
  const isFil = lang === 'fil'
  const close = () => setReceiptOpen(false)

  async function handleVoid() {
    if (!id || busy || !window.confirm(t('voidConfirm', lang))) return
    setBusy(true)
    try {
      await voidSale(id)
      setItems(await getAllItems()) // restored stock must show in the catalog right away
      autoSync()
      showToast(t('voided', lang))
      close()
    } catch {
      showToast(t('saleError', lang), 'error')
      setBusy(false)
    }
  }

  return (
    <Sheet variant="full" hideHeader title={isFil ? 'Resibo' : 'Receipt'} onClose={close}>
      <div className="min-h-full flex flex-col items-center px-4" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="w-28 h-28 -mb-1">
            <DotLottieReact src={successAnim} autoplay={!prefersReducedMotion()} loop={false} />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">{isFil ? 'Bayad na!' : 'Payment received!'}</h2>
          <p className="mt-1 mb-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-muted">
            <Icon name={method === 'gcash' ? 'phone' : 'banknote'} size={16} />
            {method === 'gcash' ? 'GCash' : t('cash', lang)}
          </p>

          {/* Paper receipt */}
          <article className="receipt-paper w-full bg-surface text-text rounded-t-2xl shadow-card border border-b-0 border-border">
            <header className="px-5 pt-5 pb-4 text-center border-b border-dashed border-border">
              <p className="text-[17px] font-extrabold">{businessName || t('appName', lang)}</p>
              <p className="font-mono text-[12px] text-muted mt-1">
                {date ? new Date(date).toLocaleString(isFil ? 'fil-PH' : 'en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
              </p>
              {ref && <p className="font-mono text-[12px] font-bold tracking-widest text-faint mt-0.5">#{ref}</p>}
            </header>

            <ul className="px-5 py-1 divide-y divide-dashed divide-border">
              {lines.map((line, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold leading-snug">{line.name}</p>
                    {line.addons?.length > 0 && <p className="text-[12px] text-muted">+ {line.addons.join(', ')}</p>}
                    {line.note && <p className="text-[12px] text-faint italic">“{line.note}”</p>}
                    <p className="font-mono text-[12px] text-muted">× {line.qty}</p>
                  </div>
                  <p className="font-mono text-[14px] font-medium shrink-0">{peso(line.subtotal)}</p>
                </li>
              ))}
            </ul>

            <dl className="mx-5 pt-3 pb-4 border-t-2 border-dashed border-amber flex flex-col gap-1.5">
              {discount?.amount > 0 && (
                <div className="flex justify-between text-[13px]">
                  <dt className="text-muted">{t('discount', lang)}</dt>
                  <dd className="font-mono font-medium text-green">−{peso(discount.amount)}</dd>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <dt className="text-[13px] font-extrabold uppercase tracking-wide">{t('totalAmount', lang)}</dt>
                <dd className="font-mono text-[28px] font-medium leading-none">{peso(total)}</dd>
              </div>
              {method === 'cash' && Number(cashGiven) > 0 && (
                <>
                  <div className="flex justify-between text-[13px]">
                    <dt className="text-muted">{isFil ? 'Ibinigay' : 'Cash given'}</dt>
                    <dd className="font-mono">{peso(cashGiven)}</dd>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <dt className="text-[13px] font-bold text-green">{t('change', lang)}</dt>
                    <dd className="font-mono text-[20px] font-medium text-green">{peso(change)}</dd>
                  </div>
                </>
              )}
            </dl>

            <p className="px-5 pb-6 text-center text-[12px] font-semibold text-faint">
              {isFil ? 'Salamat sa inyong pagbili!' : 'Thank you for your purchase!'}
            </p>
          </article>
        </div>
      </div>

      <div
        className="sticky bottom-0 px-4 pt-3 bg-gradient-to-t from-bg from-70% to-transparent"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-md mx-auto flex flex-col gap-2">
          <button type="button" data-autofocus onClick={close} className="btn-primary w-full h-14 text-base">
            {isFil ? 'Tapos na' : 'Done'}
          </button>
          {id && (
            <button type="button" onClick={handleVoid} disabled={busy} className="btn-danger w-full">
              <Icon name="ban" size={18} />
              {t('voidSale', lang)}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
