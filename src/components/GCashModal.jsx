import { useStore, cartTotal, cartLines } from '../store/useStore'
import { recordSale } from '../db/db'
import { printReceipt, isPrinterConnected } from '../utils/printer'
import { t } from '../i18n'

export default function GCashModal() {
  const { items, cart, cartAddons, cartNotes, clearCart, setGcashOpen, setLastSale, setReceiptOpen, gcashQR, lang, businessName } = useStore()
  const total = cartTotal(items, cart, cartAddons)
  const lines = cartLines(items, cart, cartAddons, cartNotes)

  async function handlePaid() {
    const saleData = {
      total,
      itemCount: lines.reduce((s, l) => s + l.qty, 0),
      method: 'gcash',
      lines: lines.map(l => ({
        itemId: l.id,
        name: l.displayName,
        qty: l.qty,
        subtotal: l.subtotal,
        addons: l.selectedAddons.map(a => a.name),
        note: l.note || '',
      })),
    }
    const sale = await recordSale(saleData)
    if (isPrinterConnected()) {
      printReceipt({
        businessName,
        ref: sale?.ref,
        date: new Date().toISOString(),
        lines: saleData.lines,
        total,
        method: 'gcash',
        lang,
      }).catch(() => {})
    }
    clearCart()
    setGcashOpen(false)
    setLastSale({
      ref: sale?.ref,
      date: new Date().toISOString(),
      lines: saleData.lines,
      total,
      method: 'gcash',
    })
    setReceiptOpen(true)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-between py-8 px-4">
      <div className="text-center">
        <p className="text-white/60 text-sm font-semibold mb-1">{t('totalAmount', lang)}</p>
        <p className="font-mono text-4xl font-medium text-amber">₱{total.toFixed(2)}</p>
      </div>

      <div className="flex-1 flex items-center justify-center w-full px-4">
        {gcashQR ? (
          <div className="bg-white rounded-2xl p-3 w-full max-w-xs">
            <img src={gcashQR} alt="GCash QR" className="w-full object-contain rounded-xl" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-6xl">📱</span>
            <p className="text-white/60 text-sm">Walang GCash QR na naka-upload.</p>
            <p className="text-white/40 text-xs">{t('noQRHint', lang)}</p>
          </div>
        )}
      </div>

      <div className="text-center mb-4">
        <p className="text-white/70 text-sm font-semibold">{t('scanQR', lang)}</p>
      </div>

      <div className="w-full flex flex-col gap-2 max-w-sm">
        <button onClick={handlePaid} className="w-full h-14 rounded-btn bg-green text-white font-bold text-base">
          {t('confirmPayment', lang)}
        </button>
        <button onClick={() => setGcashOpen(false)} className="w-full h-10 rounded-btn text-white/50 font-semibold text-sm">
          {t('cancel', lang)}
        </button>
      </div>
    </div>
  )
}
