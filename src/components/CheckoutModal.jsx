import { useState } from 'react'
import { useStore, cartTotal, cartLines } from '../store/useStore'
import { recordSale } from '../db/db'
import { printReceipt, isPrinterConnected } from '../utils/printer'
import { t } from '../i18n'

export default function CheckoutModal() {
  const {
    items, cart, cartNotes, setCartNote, cartAddons, setCartAddons,
    clearCart, setCheckoutOpen, setGcashOpen, setLastSale, setReceiptOpen, lang, businessName,
  } = useStore()
  const total = cartTotal(items, cart, cartAddons)
  const lines = cartLines(items, cart, cartAddons, cartNotes)
  const [method, setMethod] = useState('cash')
  const [cashGiven, setCashGiven] = useState('')
  const [expandedNotes, setExpandedNotes] = useState(new Set())
  const [showDiscount, setShowDiscount] = useState(false)
  const [discountType, setDiscountType] = useState('flat')
  const [discountInput, setDiscountInput] = useState('')

  const rawDiscount = parseFloat(discountInput || 0)
  const discountAmount = discountType === 'percent'
    ? Math.min(total, total * rawDiscount / 100)
    : Math.min(total, rawDiscount)
  const discountedTotal = Math.max(0, total - discountAmount)

  const change = method === 'cash' ? Math.max(0, parseFloat(cashGiven || 0) - discountedTotal) : 0
  const canConfirm = method === 'gcash' || (method === 'cash' && parseFloat(cashGiven || 0) >= discountedTotal)
  const denominations = [20, 50, 100, 200, 500, 1000].filter(v => v >= Math.floor(discountedTotal))

  function toggleNote(cartKey) {
    setExpandedNotes(s => {
      const next = new Set(s)
      next.has(cartKey) ? next.delete(cartKey) : next.add(cartKey)
      return next
    })
  }

  function toggleAddon(cartKey, addonIdx) {
    const current = cartAddons[cartKey] || []
    const updated = current.includes(addonIdx)
      ? current.filter(i => i !== addonIdx)
      : [...current, addonIdx]
    setCartAddons(cartKey, updated)
  }

  async function handleConfirm() {
    if (!canConfirm) return
    if (method === 'gcash') {
      setCheckoutOpen(false)
      setGcashOpen(true)
      return
    }
    const saleData = {
      total: discountedTotal,
      itemCount: lines.reduce((s, l) => s + l.qty, 0),
      method: 'cash',
      discount: discountAmount > 0 ? { type: discountType, amount: discountAmount } : null,
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
        total: discountedTotal,
        method: 'cash',
        cashGiven,
        change,
        discount: saleData.discount,
        lang,
      }).catch(() => {})
    }
    clearCart()
    setCashGiven('')
    setCheckoutOpen(false)
    setLastSale({
      ref: sale?.ref,
      date: new Date().toISOString(),
      lines: saleData.lines,
      total: discountedTotal,
      method: 'cash',
      cashGiven,
      change,
      discount: saleData.discount,
    })
    setReceiptOpen(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <div className="bg-bg rounded-t-[24px] max-h-[92vh] flex flex-col"
        style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xl font-extrabold text-text tracking-tight">{t('checkout', lang)}</p>
            <p className="text-xs text-muted font-medium mt-0.5">
              {lines.length} {t('items', lang)} · ₱{total.toFixed(2)}
            </p>
          </div>
          <button
            onClick={() => setCheckoutOpen(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted text-lg leading-none"
            style={{ background: '#F5F5F0' }}
          >×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-2 flex flex-col gap-3">

          {/* ── Receipt card ── */}
          <div className="bg-surface rounded-[16px] overflow-hidden" style={{ border: '1px solid #E7E5E4' }}>
            <div className="px-4 py-2.5 border-b border-dashed border-border flex items-center justify-between">
              <p className="text-[10px] font-extrabold text-faint uppercase tracking-widest">Order</p>
              <p className="text-[10px] font-extrabold text-faint uppercase tracking-widest">Subtotal</p>
            </div>

            {lines.map(line => {
              const item = items.find(i => i.id === line.id)
              const hasAddons = item?.addons?.length > 0
              const selectedAddons = cartAddons[line.cartKey] || []
              return (
                <div key={line.cartKey} className="border-b border-dashed border-border last:border-0">
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
                      style={{ background: '#F5F5F0' }}>
                      {line.photo
                        ? <img src={line.photo} alt={line.name} className="w-full h-full object-cover" />
                        : line.emoji || '🍱'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-text leading-snug">{line.displayName}</p>
                          <p className="text-xs text-muted font-medium">× {line.qty}</p>
                        </div>
                        <p className="font-mono text-sm font-semibold text-text flex-shrink-0 pt-0.5">
                          ₱{line.subtotal.toFixed(2)}
                        </p>
                      </div>
                      {hasAddons && (
                        <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar pb-0.5">
                          {item.addons.map((addon, idx) => {
                            const checked = selectedAddons.includes(idx)
                            return (
                              <button
                                key={idx}
                                onClick={() => toggleAddon(line.cartKey, idx)}
                                className="flex-shrink-0 h-7 px-2.5 rounded-full text-xs font-bold border transition-all active:scale-95"
                                style={checked
                                  ? { background: '#F59E0B', color: '#fff', borderColor: '#F59E0B' }
                                  : { background: '#F5F5F0', color: '#78716C', borderColor: '#E7E5E4' }}
                              >
                                {checked ? '✓ ' : '+ '}{addon.name}
                                <span className="font-mono ml-0.5">+₱{addon.price}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                      <div className="mt-1.5">
                        {line.note || expandedNotes.has(line.cartKey) ? (
                          <input
                            autoFocus={!line.note}
                            value={line.note}
                            onChange={e => setCartNote(line.cartKey, e.target.value)}
                            placeholder={t('noteHint', lang)}
                            className="w-full h-8 rounded-lg border px-2.5 text-xs font-medium focus:outline-none"
                            style={{ background: '#F5F5F0', borderColor: '#E7E5E4', color: '#1C1917' }}
                            onFocus={e => e.target.style.borderColor = '#F59E0B'}
                            onBlur={e => e.target.style.borderColor = '#E7E5E4'}
                          />
                        ) : (
                          <button
                            onClick={() => toggleNote(line.cartKey)}
                            className="text-[11px] text-faint flex items-center gap-1"
                          >
                            <span>✏️</span>
                            <span className="underline underline-offset-2">{t('orderNote', lang)}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Total row inside receipt */}
            <div className="px-4 flex flex-col" style={{ background: '#FFFBEB', borderTop: '2px dashed #F59E0B' }}>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted">{t('discount', lang)}</p>
                  <p className="font-mono text-sm font-semibold" style={{ color: '#16A34A' }}>
                    -{discountType === 'percent' ? `${rawDiscount}%` : ''} ₱{discountAmount.toFixed(2)}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between py-3">
                <p className="text-sm font-extrabold text-amber-dark uppercase tracking-wider">{t('totalAmount', lang)}</p>
                <div className="text-right">
                  {discountAmount > 0 && (
                    <p className="font-mono text-xs text-muted line-through">₱{total.toFixed(2)}</p>
                  )}
                  <p className="font-mono text-2xl font-bold text-amber-dark">₱{discountedTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Discount toggle ── */}
          {!showDiscount ? (
            <button
              onClick={() => setShowDiscount(true)}
              className="text-xs text-muted flex items-center gap-1.5 px-1 -mt-1"
            >
              <span>🏷️</span>
              <span className="underline underline-offset-2">{t('addDiscount', lang)}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 -mt-1">
              <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
                {['flat', 'percent'].map(type => (
                  <button
                    key={type}
                    onClick={() => setDiscountType(type)}
                    className="h-10 px-3.5 text-sm font-bold transition-colors"
                    style={discountType === type
                      ? { background: '#F59E0B', color: '#fff' }
                      : { background: '#fff', color: '#78716C' }}
                  >
                    {type === 'flat' ? '₱' : '%'}
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="decimal"
                value={discountInput}
                onChange={e => setDiscountInput(e.target.value)}
                placeholder="0"
                autoFocus
                className="flex-1 h-10 rounded-lg border border-border px-3 text-sm font-mono font-semibold focus:outline-none bg-surface"
                style={{ borderColor: discountInput ? '#F59E0B' : '#E7E5E4' }}
              />
              <button
                onClick={() => { setShowDiscount(false); setDiscountInput('') }}
                className="w-10 h-10 flex items-center justify-center text-faint text-base rounded-lg border border-border bg-surface flex-shrink-0"
              >×</button>
            </div>
          )}

          {/* ── Payment method ── */}
          <div className="grid grid-cols-2 gap-2">
            {[['cash', '💵', 'cash'], ['gcash', '💚', 'gcash']].map(([key, icon, labelKey]) => (
              <button
                key={key}
                onClick={() => setMethod(key)}
                className="h-14 rounded-[14px] border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                style={method === key
                  ? { borderColor: '#F59E0B', background: '#FFFBEB', color: '#D97706' }
                  : { borderColor: '#E7E5E4', background: '#fff', color: '#78716C' }}
              >
                <span className="text-base">{icon}</span>
                <span>{t(labelKey, lang)}</span>
              </button>
            ))}
          </div>

          {/* ── Cash section ── */}
          {method === 'cash' && (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-semibold text-muted text-base">₱</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={cashGiven}
                  onChange={e => setCashGiven(e.target.value)}
                  placeholder={t('amountReceived', lang)}
                  className="w-full h-14 rounded-[14px] border-2 pl-9 pr-4 font-mono text-2xl font-semibold focus:outline-none transition-colors"
                  style={{ borderColor: cashGiven ? '#F59E0B' : '#E7E5E4', background: '#fff', color: '#1C1917' }}
                />
              </div>
              {parseFloat(cashGiven || 0) >= discountedTotal && parseFloat(cashGiven || 0) > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-[14px]"
                  style={{ background: '#DCFCE7', border: '1.5px solid #16A34A' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">💰</span>
                    <p className="text-sm font-bold uppercase tracking-wide" style={{ color: '#16A34A' }}>{t('change', lang)}</p>
                  </div>
                  <p className="font-mono text-2xl font-bold" style={{ color: '#16A34A' }}>₱{change.toFixed(2)}</p>
                </div>
              )}
              {denominations.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                  {denominations.map(v => (
                    <button
                      key={v}
                      onClick={() => setCashGiven(String(v))}
                      className="flex-shrink-0 h-11 px-4 rounded-[12px] text-sm font-bold border-2 transition-all active:scale-95"
                      style={cashGiven === String(v)
                        ? { background: '#F59E0B', color: '#fff', borderColor: '#F59E0B' }
                        : { background: '#fff', color: '#78716C', borderColor: '#E7E5E4' }}
                    >
                      ₱{v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Confirm CTA ── */}
        <div className="px-4 pt-2 pb-6 flex-shrink-0" style={{ borderTop: '1px solid #E7E5E4', background: '#FAFAF7' }}>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full h-[60px] rounded-[16px] font-extrabold text-base tracking-wide transition-all active:scale-[0.98]"
            style={canConfirm
              ? { background: '#F59E0B', color: '#fff', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }
              : { background: '#E7E5E4', color: '#A8A29E', cursor: 'not-allowed' }}
          >
            {method === 'gcash'
              ? `${t('gcashQR', lang)} →`
              : canConfirm
                ? t('confirmPayment', lang)
                : `₱${Math.max(0, discountedTotal - parseFloat(cashGiven || 0)).toFixed(2)} ${lang === 'fil' ? 'kulang pa' : 'more needed'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
