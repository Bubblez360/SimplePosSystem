import { useState } from 'react'
import { useStore, cartTotal, cartLines } from '../store/useStore'
import { recordSale } from '../db/db'
import { t } from '../i18n'

export default function CheckoutModal() {
  const { items, cart, clearCart, setCheckoutOpen, setGcashOpen, lang } = useStore()
  const total = cartTotal(items, cart)
  const lines = cartLines(items, cart)
  const [method, setMethod] = useState('cash')
  const [cashGiven, setCashGiven] = useState('')

  const change = method === 'cash' ? Math.max(0, parseFloat(cashGiven || 0) - total) : 0
  const canConfirm = method === 'gcash' || (method === 'cash' && parseFloat(cashGiven || 0) >= total)

  async function handleConfirm() {
    if (!canConfirm) return
    if (method === 'gcash') {
      setCheckoutOpen(false)
      setGcashOpen(true)
      return
    }
    await recordSale({
      total,
      itemCount: lines.reduce((s, l) => s + l.qty, 0),
      method: 'cash',
      lines: lines.map(l => ({ name: l.name, qty: l.qty, subtotal: l.subtotal })),
    })
    clearCart()
    setCashGiven('')
    setCheckoutOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50">
      <div className="mt-auto bg-bg rounded-t-[20px] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-surface px-4 py-4 border-b border-border flex items-center justify-between">
          <p className="text-lg font-extrabold text-text">{t('checkout', lang)}</p>
          <button onClick={() => setCheckoutOpen(false)} className="text-muted text-2xl leading-none">×</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-3">
          {/* Cart summary */}
          <div className="bg-surface rounded-card border border-border overflow-hidden">
            {lines.map(line => (
              <div key={line.id} className="flex items-center justify-between px-3 py-2.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{line.emoji || '🍱'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{line.name}</p>
                    <p className="text-[11px] text-muted">× {line.qty}</p>
                  </div>
                </div>
                <p className="font-mono text-sm font-medium text-text flex-shrink-0 ml-2">₱{line.subtotal.toFixed(2)}</p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between px-3 py-3 bg-amber-light rounded-card border border-amber">
            <p className="text-sm font-bold text-amber-dark">{t('totalAmount', lang)}</p>
            <p className="font-mono text-xl font-medium text-amber-dark">₱{total.toFixed(2)}</p>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">{t('paymentMethod', lang)}</p>
            <div className="grid grid-cols-2 gap-2">
              {[['cash','💵','cash'],['gcash','💚','gcash']].map(([key, icon, labelKey]) => (
                <button
                  key={key}
                  onClick={() => setMethod(key)}
                  className={`h-14 rounded-btn border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    method === key ? 'border-amber bg-amber-light text-amber-dark' : 'border-border bg-surface text-muted'
                  }`}
                >
                  {icon} {t(labelKey, lang)}
                </button>
              ))}
            </div>
          </div>

          {/* Cash entry */}
          {method === 'cash' && (
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-wide mb-1">{t('amountReceived', lang)}</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-medium text-muted">₱</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={cashGiven}
                    onChange={e => setCashGiven(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-14 rounded-lg border border-border pl-7 pr-3 font-mono text-xl font-medium bg-surface focus:outline-none focus:border-amber"
                  />
                </div>
              </div>
              {parseFloat(cashGiven || 0) >= total && (
                <div className="flex items-center justify-between px-3 py-2.5 bg-green-light rounded-card border border-green">
                  <p className="text-sm font-bold text-green">{t('change', lang)}</p>
                  <p className="font-mono text-xl font-medium text-green">₱{change.toFixed(2)}</p>
                </div>
              )}
              {/* Quick cash buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {[20, 50, 100, 200, 500, 1000].filter(v => v >= total * 0.8).slice(0, 4).map(v => (
                  <button
                    key={v}
                    onClick={() => setCashGiven(String(v))}
                    className="h-9 rounded-lg bg-surface border border-border text-xs font-bold text-muted"
                  >
                    ₱{v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirm button */}
        <div className="px-4 pt-2 pb-4 bg-bg border-t border-border">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`w-full h-14 rounded-btn font-bold text-base transition-all ${
              canConfirm ? 'bg-amber text-white' : 'bg-border text-faint cursor-not-allowed'
            }`}
          >
            {method === 'gcash' ? `${t('gcashQR', lang)} →` : t('confirmPayment', lang)}
          </button>
        </div>
      </div>
    </div>
  )
}
