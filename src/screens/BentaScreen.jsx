import { useStore } from '../store/useStore'
import { t } from '../i18n'

export default function BentaScreen() {
  const { items, cart, addToCart, removeFromCart, lang, businessName } = useStore()

  return (
    <div className="screen-enter">
      {/* Header */}
      <header className="sticky top-0 bg-surface border-b border-border px-4 py-3 z-10">
        <p className="text-xs font-bold text-muted uppercase tracking-widest">
          {businessName || t('appName', lang)}
        </p>
        <p className="text-lg font-extrabold text-text leading-tight">{t('benta', lang)}</p>
      </header>

      {/* Item grid */}
      <div className="p-3 pb-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-5xl">🏪</span>
            <p className="text-muted text-sm">{t('noItems', lang)}</p>
            <p className="text-faint text-xs">{t('goToMenu', lang)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map(item => {
              const qty = cart[item.id] || 0
              const active = qty > 0
              return (
                <div
                  key={item.id}
                  onClick={() => addToCart(item.id)}
                  className={`item-card relative rounded-card overflow-hidden border cursor-pointer select-none transition-all ${
                    active ? 'border-amber bg-amber-light' : 'border-border bg-surface'
                  }`}
                >
                  {/* Photo or emoji */}
                  <div className="aspect-square flex items-center justify-center bg-surface-2 text-4xl">
                    {item.photo
                      ? <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                      : item.emoji || '🍱'}
                  </div>

                  {/* Info row */}
                  <div className="px-2 py-2 flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text leading-tight truncate">{item.name}</p>
                      <p className="font-mono text-sm font-medium text-amber-dark">₱{item.price.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); addToCart(item.id) }}
                      className="flex-shrink-0 w-7 h-7 rounded-full bg-amber text-white text-base font-bold flex items-center justify-center leading-none"
                    >
                      +
                    </button>
                  </div>

                  {/* Qty badge */}
                  {qty > 0 && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber text-white rounded-full px-2 py-0.5">
                      <button
                        onClick={e => { e.stopPropagation(); removeFromCart(item.id) }}
                        className="text-xs font-bold leading-none"
                      >−</button>
                      <span className="text-xs font-bold font-mono">{qty}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
