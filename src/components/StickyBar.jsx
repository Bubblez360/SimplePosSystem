import { useStore, cartTotal } from '../store/useStore'
import { t } from '../i18n'

export default function StickyBar() {
  const { items, cart, cartAddons, setCheckoutOpen, lang } = useStore()
  const total = cartTotal(items, cart, cartAddons)
  const hasItems = Object.keys(cart).length > 0

  return (
    <div className="fixed bottom-16 left-0 right-0 z-20 px-4 pb-2 pt-1">
      <div className="bg-surface border border-border rounded-btn shadow-lg flex items-center justify-between px-4 h-[56px]">
        <div>
          <p className="text-[11px] font-bold text-muted uppercase tracking-wide">{t('total', lang)}</p>
          <p className={`font-mono text-2xl font-medium ${hasItems ? 'text-amber-dark' : 'text-faint'}`}>
            ₱{total.toFixed(2)}
          </p>
        </div>
        <button
          onClick={() => hasItems && setCheckoutOpen(true)}
          disabled={!hasItems}
          className={`px-6 h-10 rounded-btn text-sm font-bold transition-all ${
            hasItems
              ? 'bg-amber text-white pulse-cta'
              : 'bg-border text-faint cursor-not-allowed'
          }`}
        >
          {t('bayad', lang)} →
        </button>
      </div>
    </div>
  )
}
