import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { t } from '../../i18n'
import Icon from '../Icon'
import CartLines from './CartLines'
import { useCart, peso } from './useCart'

// Phone/tablet cart: a floating pill above the nav that always shows the
// running total and the pay button, and expands upward into the order list.
export default function CartBar() {
  const lang = useStore(s => s.lang)
  const clearCart = useStore(s => s.clearCart)
  const setCheckoutOpen = useStore(s => s.setCheckoutOpen)
  const { lines, total, count } = useCart()
  const [expanded, setExpanded] = useState(false)
  const hasItems = lines.length > 0

  useEffect(() => { if (!hasItems) setExpanded(false) }, [hasItems])

  if (!hasItems) return null

  return (
    <div className="fixed above-nav inset-x-0 z-20 px-3 lg:hidden">
      <div className="max-w-2xl mx-auto">
        {expanded && (
          <section
            id="cart-list"
            aria-label={t('currentOrder', lang)}
            className="mb-2 card shadow-float overflow-hidden flex flex-col max-h-[46dvh] animate-sheet-up"
          >
            <div className="flex items-center justify-between pl-4 pr-1 border-b border-border shrink-0">
              <p className="eyebrow">{count} {t('items', lang)}</p>
              <button type="button" onClick={clearCart} className="btn-ghost btn-sm text-error hover:bg-error-light">
                <Icon name="trash" size={16} />
                {t('clearAll', lang)}
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain">
              <CartLines lines={lines} />
            </div>
          </section>
        )}

        <div className="card shadow-float flex items-center gap-2 p-2 pl-3">
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-controls="cart-list"
            aria-label={expanded ? t('hideOrder', lang) : t('showOrder', lang)}
            className="flex items-center gap-3 flex-1 min-w-0 min-h-[52px] text-left cursor-pointer rounded-xl"
          >
            <span className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-amber-light text-amber-ink shrink-0">
              <Icon name="cart" size={22} />
              <span
                key={count}
                className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-text text-surface
                  text-[12px] font-extrabold flex items-center justify-center animate-pop"
              >
                {count}
              </span>
            </span>
            <span className="min-w-0">
              <span className="eyebrow block leading-none mb-1">{t('total', lang)}</span>
              <span className="font-mono text-[22px] font-medium text-text leading-none block truncate">{peso(total)}</span>
            </span>
            <Icon
              name="chevron-up"
              size={18}
              className={`text-faint transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>

          <button
            type="button"
            onClick={() => { setExpanded(false); setCheckoutOpen(true) }}
            className="btn-primary pulse-cta h-[52px] px-5 shrink-0"
          >
            {t('bayad', lang)}
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
