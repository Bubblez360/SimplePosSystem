import { useState } from 'react'
import { useStore, cartLines, cartTotal } from '../store/useStore'
import { t } from '../i18n'
import Sheet from './Sheet'
import Icon from './Icon'
import { peso } from './cart/useCart'

// "Hold" parks the order on the counter; the held list brings it back. Built
// for the rush: customer 1 is hunting for change, customer 2 is already waiting.
export function HoldButton({ className = '' }) {
  const holdOrder = useStore(s => s.holdOrder)
  const showToast = useStore(s => s.showToast)
  const lang = useStore(s => s.lang)
  return (
    <button
      type="button"
      className={`btn-secondary btn-sm ${className}`}
      onClick={() => { if (holdOrder()) showToast(t('orderHeld', lang)) }}
    >
      <Icon name="clock" size={16} />
      {t('holdOrder', lang)}
    </button>
  )
}

export function HeldOrdersButton() {
  const held = useStore(s => s.heldOrders)
  const lang = useStore(s => s.lang)
  const [open, setOpen] = useState(false)
  if (held.length === 0) return null
  return (
    <>
      <button type="button" className="btn-secondary btn-sm shrink-0" onClick={() => setOpen(true)}>
        <Icon name="clock" size={16} />
        {t('heldOrders', lang)}
        <span className="pill-badge bg-amber text-on-amber !px-2">{held.length}</span>
      </button>
      {open && <HeldOrdersModal onClose={() => setOpen(false)} />}
    </>
  )
}

function HeldOrdersModal({ onClose }) {
  const held = useStore(s => s.heldOrders)
  const items = useStore(s => s.items)
  const resumeOrder = useStore(s => s.resumeOrder)
  const discardHeld = useStore(s => s.discardHeld)
  const lang = useStore(s => s.lang)
  const isFil = lang === 'fil'

  return (
    <Sheet title={t('heldOrders', lang)} subtitle={t('heldHint', lang)} closeLabel={t('close', lang)} onClose={onClose}>
      {held.length === 0 ? (
        <p className="px-5 pb-8 text-[15px] text-muted">{t('noHeldOrders', lang)}</p>
      ) : (
        <ul className="px-4 pb-5 sheet-pb flex flex-col gap-2.5">
          {held.map(h => {
            const lines = cartLines(items, h.cart, h.cartAddons, h.cartNotes)
            const count = lines.reduce((s, l) => s + l.qty, 0)
            const time = new Date(h.createdAt).toLocaleTimeString(isFil ? 'fil-PH' : 'en-PH', { hour: '2-digit', minute: '2-digit' })
            return (
              <li key={h.id} className="card p-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold truncate">{lines.map(l => `${l.qty}× ${l.name}`).join(', ') || '—'}</p>
                  <p className="text-[13px] text-muted">
                    {time} · {t('itemsShort', lang).replace('{n}', count)} ·{' '}
                    <span className="font-mono font-medium text-text">{peso(cartTotal(items, h.cart, h.cartAddons))}</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => { resumeOrder(h.id); onClose() }}
                >
                  {t('resumeOrder', lang)}
                </button>
                <button
                  type="button"
                  className="icon-btn text-error"
                  aria-label={`${t('delete', lang)}: ${time}`}
                  onClick={() => { if (window.confirm(t('discardHeldConfirm', lang))) discardHeld(h.id) }}
                >
                  <Icon name="trash" size={18} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
