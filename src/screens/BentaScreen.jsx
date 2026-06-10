import { useState } from 'react'
import { useStore, itemTotalQty } from '../store/useStore'
import { t } from '../i18n'

export default function BentaScreen() {
  const { items, categories, cart, addToCart, removeFromCart, setVariantPickerItem, lang, businessName } = useStore()
  const [activeCat, setActiveCat] = useState('all')

  const filtered = activeCat === 'all'
    ? items
    : items.filter(i => String(i.categoryId) === String(activeCat))

  function handleItemTap(item) {
    if (item.variants?.length) {
      setVariantPickerItem(item)
    } else {
      addToCart(String(item.id))
    }
  }

  function handleMinus(e, item) {
    e.stopPropagation()
    if (item.variants?.length) {
      setVariantPickerItem(item)
    } else {
      removeFromCart(String(item.id))
    }
  }

  return (
    <div className="screen-enter">
      <header className="sticky top-0 bg-surface border-b border-border px-4 py-3 z-10">
        <p className="text-xs font-bold text-muted uppercase tracking-widest">
          {businessName || t('appName', lang)}
        </p>
        <p className="text-lg font-extrabold text-text leading-tight">{t('benta', lang)}</p>
      </header>

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="relative">
        <div className="flex gap-2 px-3 pt-3 pb-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveCat('all')}
            className={`flex-shrink-0 h-8 px-3 rounded-pill text-xs font-bold border transition-all ${
              activeCat === 'all'
                ? 'bg-amber text-white border-amber'
                : 'bg-surface border-border text-muted'
            }`}
          >
            {t('allItems', lang)}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`flex-shrink-0 h-8 px-3 rounded-pill text-xs font-bold border transition-all ${
                activeCat === cat.id
                  ? 'bg-amber text-white border-amber'
                  : 'bg-surface border-border text-muted'
              }`}
            >
              {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
            </button>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg to-transparent pointer-events-none" />
        </div>
      )}

      <div className="p-3 pb-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-5xl">🏪</span>
            <p className="text-muted text-sm">{t('noItems', lang)}</p>
            <p className="text-faint text-xs">{t('goToMenu', lang)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(item => {
              const qty = itemTotalQty(cart, item.id)
              const active = qty > 0
              const hasVariants = item.variants?.length > 0
              const displayPrice = hasVariants
                ? `₱${Math.min(...item.variants.map(v => v.price)).toFixed(2)}+`
                : `₱${(item.price ?? 0).toFixed(2)}`

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemTap(item)}
                  className={`item-card relative rounded-card overflow-hidden border cursor-pointer select-none transition-all ${
                    active ? 'border-amber bg-amber-light' : 'border-border bg-surface'
                  }`}
                >
                  <div className="aspect-square flex items-center justify-center bg-surface-2 text-4xl">
                    {item.photo
                      ? <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                      : item.emoji || '🍱'}
                  </div>

                  <div className="px-2 py-2 flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text leading-tight truncate">{item.name}</p>
                      <p className="font-mono text-sm font-medium text-amber-dark">{displayPrice}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleItemTap(item) }}
                      className="flex-shrink-0 w-7 h-7 rounded-full bg-amber text-white text-base font-bold flex items-center justify-center leading-none"
                    >
                      +
                    </button>
                  </div>

                  {qty > 0 && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber text-white rounded-full px-2 py-0.5">
                      <button
                        onClick={e => handleMinus(e, item)}
                        className="text-xs font-bold leading-none"
                      >−</button>
                      <span className="text-xs font-bold font-mono">{qty}</span>
                    </div>
                  )}

                  {hasVariants && (
                    <div className="absolute top-2 right-2 bg-surface/80 rounded px-1 py-0.5">
                      <span className="text-[9px] font-bold text-muted uppercase">sizes</span>
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
