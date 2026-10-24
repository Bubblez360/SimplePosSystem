import { useStore } from '../../store/useStore'
import { t } from '../../i18n'
import Icon from '../Icon'
import CartLines from './CartLines'
import { useCart, peso } from './useCart'

// Desktop / landscape-tablet cart: always-visible column beside the catalog.
export default function CartPanel() {
  const lang = useStore(s => s.lang)
  const clearCart = useStore(s => s.clearCart)
  const setCheckoutOpen = useStore(s => s.setCheckoutOpen)
  const { lines, total, count } = useCart()
  const hasItems = lines.length > 0

  return (
    <aside
      aria-label={t('currentOrder', lang)}
      className="hidden lg:flex flex-col w-[380px] shrink-0 h-full border-l border-border bg-surface"
    >
      <header className="flex items-center justify-between px-5 h-[72px] border-b border-border shrink-0">
        <div>
          <h2 className="text-[17px] font-extrabold tracking-tight leading-tight">{t('currentOrder', lang)}</h2>
          <p className="text-[12px] font-semibold text-muted">{count} {t('items', lang)}</p>
        </div>
        {hasItems && (
          <button type="button" onClick={clearCart} className="btn-ghost btn-sm text-error hover:bg-error-light">
            <Icon name="trash" size={16} />
            {t('clearAll', lang)}
          </button>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {hasItems ? (
          <CartLines lines={lines} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="w-16 h-16 rounded-2xl bg-surface-2 text-faint flex items-center justify-center">
              <Icon name="cart" size={30} />
            </span>
            <p className="text-[15px] font-bold">{t('emptyCart', lang)}</p>
            <p className="text-[13px] text-muted">{t('emptyCartHint', lang)}</p>
          </div>
        )}
      </div>

      <footer className="shrink-0 p-5 border-t border-border bg-amber-bg">
        <div className="flex items-baseline justify-between mb-4">
          <span className="eyebrow">{t('total', lang)}</span>
          <span className="font-mono text-[34px] font-medium leading-none text-text">{peso(total)}</span>
        </div>
        <button
          type="button"
          disabled={!hasItems}
          onClick={() => setCheckoutOpen(true)}
          className={`btn-primary w-full h-14 text-base ${hasItems ? 'pulse-cta' : ''}`}
        >
          {t('bayad', lang)}
          <Icon name="arrow" size={20} />
        </button>
      </footer>
    </aside>
  )
}
