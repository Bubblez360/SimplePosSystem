import { useState } from 'react'
import { useStore, itemTotalQty } from '../store/useStore'
import { t } from '../i18n'

export default function BentaScreen() {
  const { items, categories, cart, addToCart, removeFromCart, setVariantPickerItem, lang, businessName, logo } = useStore()
  const [activeCat, setActiveCat] = useState('all')
  const [search, setSearch] = useState('')

  const byCategory = activeCat === 'all'
    ? items
    : items.filter(i => String(i.categoryId) === String(activeCat))
  const query = search.trim().toLowerCase()
  const filtered = query
    ? byCategory.filter(i => i.name.toLowerCase().includes(query))
    : byCategory

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
        <div className="flex items-center gap-3">
          {logo && (
            <img src={logo} alt="logo" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-border" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-muted uppercase tracking-widest truncate">
              {businessName || t('appName', lang)}
            </p>
            <p className="text-lg font-extrabold text-text leading-tight">{t('benta', lang)}</p>
          </div>
        </div>
        {items.length > 6 && (
          <div className="relative mt-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('searchItems', lang)}
              className="w-full h-10 rounded-lg border border-border pl-9 pr-8 text-sm font-medium bg-surface-2 focus:outline-none focus:border-amber text-text"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-faint text-base"
              >×</button>
            )}
          </div>
        )}
      </header>

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="relative">
        <div className="flex gap-2 px-3 pt-3 pb-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveCat('all')}
            className={`flex-shrink-0 h-9 px-3.5 rounded-pill text-xs font-bold border transition-all ${
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
              className={`flex-shrink-0 h-9 px-3.5 rounded-pill text-xs font-bold border transition-all ${
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {filtered.map(item => {
              const qty = itemTotalQty(cart, item.id)
              const active = qty > 0
              const hasVariants = item.variants?.length > 0
              const displayPrice = hasVariants
                ? `₱${Math.min(...item.variants.map(v => v.price)).toFixed(2)}+`
                : `₱${(item.price ?? 0).toFixed(2)}`
              const isOutOfStock = item.trackStock && item.stock <= 0
              const isLowStock = item.trackStock && item.stock > 0 && item.stock <= 5

              return (
                <div
                  key={item.id}
                  onClick={() => !isOutOfStock && handleItemTap(item)}
                  className={`item-card relative rounded-card overflow-hidden border select-none transition-all ${
                    isOutOfStock ? 'border-border bg-surface opacity-50 cursor-not-allowed'
                    : active ? 'border-amber bg-amber-light cursor-pointer'
                    : 'border-border bg-surface cursor-pointer'
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
                      onClick={e => { e.stopPropagation(); if (!isOutOfStock) handleItemTap(item) }}
                      className="flex-shrink-0 w-9 h-9 -m-1 rounded-full bg-amber text-white text-lg font-bold flex items-center justify-center leading-none"
                    >
                      +
                    </button>
                  </div>

                  {qty > 0 && (
                    <div className="absolute top-1.5 left-1.5 flex items-center bg-amber text-white rounded-full pr-2.5">
                      <button
                        onClick={e => handleMinus(e, item)}
                        className="w-7 h-7 flex items-center justify-center text-sm font-bold leading-none"
                      >−</button>
                      <span className="text-xs font-bold font-mono">{qty}</span>
                    </div>
                  )}

                  {hasVariants && !isOutOfStock && (
                    <div className="absolute top-2 right-2 bg-surface rounded px-1 py-0.5">
                      <span className="text-[9px] font-bold text-muted uppercase">sizes</span>
                    </div>
                  )}

                  {isOutOfStock && (
                    <div className="absolute top-2 right-2 bg-red-500 rounded-full px-2 py-0.5">
                      <span className="text-[9px] font-bold text-white uppercase">{t('outOfStock', lang)}</span>
                    </div>
                  )}

                  {isLowStock && (
                    <div className="absolute top-2 right-2 bg-orange-400 rounded-full px-2 py-0.5">
                      <span className="text-[9px] font-bold text-white uppercase">{t('lowStock', lang)} {item.stock}</span>
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
