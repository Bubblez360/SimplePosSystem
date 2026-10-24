import { useState } from 'react'
import { useStore } from '../store/useStore'
import { buildSale } from '../lib/checkout'
import { finalizeSale } from '../lib/finalizeSale'
import { t } from '../i18n'
import Sheet from './Sheet'
import Icon from './Icon'
import { useCart, peso } from './cart/useCart'

// Customer-facing QR screen. Always charges the same discounted amount that
// the checkout sheet showed (the discount lives in the store).
export default function GCashModal() {
  const gcashQR = useStore(s => s.gcashQR)
  const discount = useStore(s => s.discount)
  const setGcashOpen = useStore(s => s.setGcashOpen)
  const setCheckoutOpen = useStore(s => s.setCheckoutOpen)
  const setScreen = useStore(s => s.setScreen)
  const showToast = useStore(s => s.showToast)
  const lang = useStore(s => s.lang)
  const { lines } = useCart()
  const [busy, setBusy] = useState(false)

  const sale = buildSale({ lines, method: 'gcash', discount })

  function backToCheckout() {
    setGcashOpen(false)
    setCheckoutOpen(true)
  }

  async function handlePaid() {
    if (busy) return
    setBusy(true)
    try {
      await finalizeSale(sale)
    } catch {
      showToast(t('saleError', lang), 'error')
      setBusy(false)
    }
  }

  return (
    <Sheet
      variant="full"
      tone="dark"
      hideHeader
      title={t('gcashQR', lang)}
      onClose={backToCheckout}
    >
      <div
        className="min-h-full flex flex-col items-center justify-between gap-6 px-5"
        style={{
          paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="text-center">
          <p className="eyebrow !text-white/60 mb-1">{t('totalAmount', lang)}</p>
          <p className="font-mono text-[44px] font-medium leading-none text-amber">{peso(sale.total)}</p>
          {sale.discount && (
            <p className="mt-2 text-[13px] font-semibold text-white/60">
              {t('discount', lang)} −{peso(sale.discount.amount)}
            </p>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center w-full">
          {gcashQR ? (
            <div className="bg-white rounded-3xl p-4 w-full max-w-[19rem] shadow-float">
              <img src={gcashQR} alt={t('gcashQR', lang)} className="w-full aspect-square object-contain rounded-xl" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center max-w-[16rem]">
              <span className="w-16 h-16 rounded-2xl border-2 border-dashed border-white/30 text-white/60 flex items-center justify-center">
                <Icon name="camera" size={28} />
              </span>
              <p className="text-[15px] font-bold text-white/80">{t('noGcashQR', lang)}</p>
              <p className="text-[13px] text-white/55">{t('noQRHint', lang)}</p>
              <button
                type="button"
                className="btn-secondary btn-sm mt-1"
                onClick={() => { setGcashOpen(false); setScreen('setting') }}
              >
                <Icon name="gear" size={16} />
                {t('setting', lang)}
              </button>
            </div>
          )}
        </div>

        <div className="w-full max-w-sm flex flex-col gap-2">
          <p className="text-center text-[14px] font-semibold text-white/70 mb-1">{t('scanQR', lang)}</p>
          <button type="button" onClick={handlePaid} disabled={busy} className="btn-success w-full h-14 text-base">
            <Icon name="check" size={22} strokeWidth={2.6} />
            {t('confirmPayment', lang)}
          </button>
          <button type="button" onClick={backToCheckout} className="btn-ghost w-full !text-white/70 hover:!bg-white/10">
            <Icon name="arrow-left" size={18} />
            {t('cancel', lang)}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
