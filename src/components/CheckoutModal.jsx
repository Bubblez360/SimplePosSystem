import { useState } from 'react'
import { useStore } from '../store/useStore'
import { buildSale, computeDiscount } from '../lib/checkout'
import { finalizeSale } from '../lib/finalizeSale'
import { t } from '../i18n'
import Sheet from './Sheet'
import Icon from './Icon'
import AmountInput from './AmountInput'
import { useCart, peso } from './cart/useCart'

const DENOMINATIONS = [20, 50, 100, 200, 500, 1000]

export default function CheckoutModal() {
  const items = useStore(s => s.items)
  const cartAddons = useStore(s => s.cartAddons)
  const setCartAddons = useStore(s => s.setCartAddons)
  const setCartNote = useStore(s => s.setCartNote)
  const discount = useStore(s => s.discount)
  const setDiscount = useStore(s => s.setDiscount)
  const setCheckoutOpen = useStore(s => s.setCheckoutOpen)
  const setGcashOpen = useStore(s => s.setGcashOpen)
  const showToast = useStore(s => s.showToast)
  const lang = useStore(s => s.lang)
  const { lines, total, count } = useCart()

  const method = useStore(s => s.payMethod)
  const setMethod = useStore(s => s.setPayMethod)
  const [cashGiven, setCashGiven] = useState('')
  const [noteOpen, setNoteOpen] = useState(() => new Set())
  const [showDiscount, setShowDiscount] = useState(() => Number(discount.value) > 0)
  const [busy, setBusy] = useState(false)

  const discountAmount = computeDiscount(total, discount)
  const payable = Math.max(0, total - discountAmount)
  const received = Number(cashGiven) || 0
  const shortBy = Math.max(0, payable - received)
  const change = method === 'cash' ? Math.max(0, received - payable) : 0
  const canConfirm = !busy && lines.length > 0 && (method === 'gcash' || shortBy === 0)
  const quickCash = DENOMINATIONS.filter(v => v >= Math.floor(payable))
  const isFil = lang === 'fil'

  function toggleAddon(cartKey, idx) {
    const current = cartAddons[cartKey] || []
    setCartAddons(cartKey, current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx])
  }

  function openNote(cartKey) {
    setNoteOpen(prev => new Set(prev).add(cartKey))
  }

  async function handleConfirm() {
    if (!canConfirm) return
    if (method === 'gcash') {
      setCheckoutOpen(false)
      setGcashOpen(true)
      return
    }
    setBusy(true)
    try {
      await finalizeSale(buildSale({ lines, method: 'cash', discount }), { cashGiven, change })
    } catch {
      showToast(t('saleError', lang), 'error')
      setBusy(false)
    }
  }

  const ctaLabel = method === 'gcash'
    ? t('gcashQR', lang)
    : shortBy > 0
      ? t('shortBy', lang).replace('{n}', peso(shortBy))
      : t('confirmPayment', lang)

  const footer = (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <span className="eyebrow">{t('totalAmount', lang)}</span>
        <span className="text-right">
          {discountAmount > 0 && (
            <span className="block font-mono text-[13px] text-muted line-through leading-none mb-1">{peso(total)}</span>
          )}
          <span className="block font-mono text-[30px] font-medium leading-none text-text">{peso(payable)}</span>
        </span>
      </div>
      <button type="button" onClick={handleConfirm} disabled={!canConfirm} className="btn-primary w-full h-14 text-base">
        {method === 'gcash' ? <Icon name="qr" size={20} /> : shortBy === 0 && <Icon name="check" size={20} strokeWidth={2.6} />}
        {ctaLabel}
      </button>
    </div>
  )

  return (
    <Sheet
      title={t('checkout', lang)}
      subtitle={`${count} ${t('items', lang)} · ${peso(total)}`}
      closeLabel={t('close', lang)}
      onClose={() => setCheckoutOpen(false)}
      footer={footer}
    >
      <div className="px-4 pb-4 flex flex-col gap-4">
        {/* ── Order ── */}
        <section className="card overflow-hidden" aria-label={t('currentOrder', lang)}>
          <ul className="divide-y divide-dashed divide-border">
            {lines.map(line => {
              const item = items.find(i => i.id === line.id)
              const selected = cartAddons[line.cartKey] || []
              const noteVisible = line.note || noteOpen.has(line.cartKey)
              return (
                <li key={line.cartKey} className="px-4 py-3 flex items-start gap-3">
                  <span className="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                    {line.photo ? <img src={line.photo} alt="" className="w-full h-full object-cover" /> : line.emoji || '🍱'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold leading-snug">{line.displayName}</p>
                        <p className="text-[12px] font-medium text-muted font-mono">{line.qty} × {peso(line.price)}</p>
                      </div>
                      <p className="font-mono text-[15px] font-medium shrink-0">{peso(line.subtotal)}</p>
                    </div>

                    {item?.addons?.length > 0 && (
                      <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
                        {item.addons.map((addon, idx) => {
                          const on = selected.includes(idx)
                          return (
                            <button
                              key={idx}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggleAddon(line.cartKey, idx)}
                              className="chip !min-h-[36px] !px-3 !text-[12px] gap-1"
                            >
                              <Icon name={on ? 'check' : 'plus'} size={14} strokeWidth={2.6} />
                              {addon.name}
                              <span className="font-mono">+{peso(addon.price, { compact: true })}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    <div className="mt-1.5">
                      {noteVisible ? (
                        <input
                          autoFocus={!line.note}
                          value={line.note}
                          onChange={e => setCartNote(line.cartKey, e.target.value)}
                          placeholder={t('noteHint', lang)}
                          aria-label={t('orderNote', lang)}
                          maxLength={80}
                          className="field !min-h-[40px] !text-[13px] !rounded-lg"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => openNote(line.cartKey)}
                          className="inline-flex items-center gap-1.5 min-h-[36px] text-[12px] font-bold text-muted hover:text-text cursor-pointer"
                        >
                          <Icon name="pencil" size={14} />
                          {t('orderNote', lang)}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {discountAmount > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-green-light border-t border-dashed border-border">
              <span className="text-[13px] font-bold text-green">
                {t('discount', lang)}{discount.type === 'percent' ? ` ${discount.value}%` : ''}
              </span>
              <span className="font-mono text-[15px] font-medium text-green">−{peso(discountAmount)}</span>
            </div>
          )}
        </section>

        {/* ── Discount ── */}
        {showDiscount ? (
          <div>
          <p id="discount-label" className="field-label">{t('discount', lang)}</p>
          <div className="flex items-center gap-2">
            <div role="group" aria-labelledby="discount-label" className="flex shrink-0 rounded-xl border border-border bg-surface p-1 gap-1">
              {['flat', 'percent'].map(type => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={discount.type === type}
                  onClick={() => setDiscount({ ...discount, type })}
                  className={`min-w-[44px] h-10 px-3 rounded-lg text-[15px] font-bold font-mono cursor-pointer transition-colors ${
                    discount.type === type ? 'bg-amber text-on-amber' : 'text-muted hover:bg-surface-2'
                  }`}
                >
                  {type === 'flat' ? '₱' : '%'}
                </button>
              ))}
            </div>
            <AmountInput
              prefix=""
              autoFocus
              aria-labelledby="discount-label"
              value={discount.value}
              onChange={value => setDiscount({ ...discount, value })}
              className="flex-1"
            />
            <button
              type="button"
              className="icon-btn border border-border bg-surface !w-12 !h-12 !rounded-xl"
              aria-label={t('removeDiscount', lang)}
              onClick={() => { setShowDiscount(false); setDiscount({ ...discount, value: '' }) }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDiscount(true)}
            className="self-start inline-flex items-center gap-2 min-h-[44px] px-1 text-[14px] font-bold text-muted hover:text-text cursor-pointer"
          >
            <Icon name="tag" size={18} />
            {t('addDiscount', lang)}
          </button>
        )}

        {/* ── Payment method ── */}
        <div role="radiogroup" aria-label={t('paymentMethod', lang)} className="grid grid-cols-2 gap-2.5">
          {[['cash', 'banknote'], ['gcash', 'phone']].map(([key, icon]) => {
            const on = method === key
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setMethod(key)}
                className={`tile h-[60px] rounded-btn border-2 font-bold text-[15px] flex items-center justify-center gap-2 cursor-pointer ${
                  on
                    ? (key === 'gcash' ? 'border-green bg-green-light text-green' : 'border-amber bg-amber-bg text-text')
                    : 'border-border bg-surface text-muted hover:bg-surface-2'
                }`}
              >
                <Icon name={icon} size={22} />
                {t(key, lang)}
              </button>
            )
          })}
        </div>

        {/* ── Cash tendered ── */}
        {method === 'cash' && (
          <div className="flex flex-col gap-2.5">
            <div>
              <label htmlFor="cash-given" className="field-label">{t('amountReceived', lang)}</label>
              <AmountInput id="cash-given" size="lg" value={cashGiven} onChange={setCashGiven} />
            </div>
            {quickCash.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1" role="group" aria-label={t('amountReceived', lang)}>
                {quickCash.map(v => (
                  <button
                    key={v}
                    type="button"
                    className="chip font-mono !text-[14px]"
                    aria-pressed={cashGiven === String(v)}
                    onClick={() => setCashGiven(String(v))}
                  >
                    ₱{v}
                  </button>
                ))}
              </div>
            )}
            {received > 0 && shortBy === 0 && (
              <div
                role="status"
                className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-btn bg-green-light border border-green/40"
              >
                <span className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wide text-green">
                  <Icon name="wallet" size={20} />
                  {t('change', lang)}
                </span>
                <span className="font-mono text-[28px] font-medium leading-none text-green">{peso(change)}</span>
              </div>
            )}
          </div>
        )}
        {method === 'gcash' && (
          <p className="text-[13px] text-muted px-1">{isFil ? 'Ipapakita ang QR sa susunod na screen.' : 'The QR code is shown on the next screen.'}</p>
        )}
      </div>
    </Sheet>
  )
}
