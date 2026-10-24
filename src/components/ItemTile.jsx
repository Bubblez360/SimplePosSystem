import { t } from '../i18n'
import Icon from './Icon'
import { peso } from './cart/useCart'

const LOW_STOCK_AT = 5

// One sellable item on the Benta grid. The whole card is the "add" target
// (a stretched button underneath); the stepper floats above it so there are
// never nested interactive elements.
export default function ItemTile({ item, qty, lang, onAdd, onRemove }) {
  const hasVariants = item.variants?.length > 0
  const price = hasVariants ? Math.min(...item.variants.map(v => v.price)) : item.price ?? 0
  const priceLabel = `${peso(price, { compact: true })}${hasVariants ? '+' : ''}`
  const outOfStock = item.trackStock && item.stock <= 0
  const lowStock = item.trackStock && item.stock > 0 && item.stock <= LOW_STOCK_AT
  const active = qty > 0

  const label = [
    item.name,
    priceLabel,
    active ? `${qty} ${t('inCart', lang)}` : '',
    outOfStock ? t('outOfStock', lang) : '',
  ].filter(Boolean).join(', ')

  return (
    <li
      className={`tile card relative overflow-hidden flex flex-col ${
        active ? '!border-amber bg-amber-light ring-2 ring-amber/40' : ''
      } ${outOfStock ? 'opacity-55' : ''}`}
    >
      <button
        type="button"
        disabled={outOfStock}
        onClick={onAdd}
        aria-label={label}
        className="absolute inset-0 z-0 w-full h-full rounded-card cursor-pointer disabled:cursor-not-allowed"
      />

      <div className="relative pointer-events-none aspect-[5/4] flex items-center justify-center bg-surface-2 text-[60px] leading-none">
        {item.photo
          ? <img src={item.photo} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          : <span aria-hidden="true">{item.emoji || '🍱'}</span>}

        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {outOfStock && <span className="pill-badge bg-error text-on-error">{t('outOfStock', lang)}</span>}
          {lowStock && <span className="pill-badge bg-amber text-on-amber">{item.stock} {t('left', lang)}</span>}
          {hasVariants && !outOfStock && (
            <span className="pill-badge bg-surface/90 text-muted border border-border backdrop-blur-sm">{t('options', lang)}</span>
          )}
        </div>

        {!outOfStock && (
          <div className="absolute right-2 bottom-2 z-10 pointer-events-auto flex items-center rounded-pill bg-amber text-on-amber shadow-float">
            {active && !hasVariants && (
              <button type="button" onClick={onRemove} className="icon-btn text-on-amber hover:bg-black/10" aria-label={`${t('removeOne', lang)}: ${item.name}`}>
                <Icon name="minus" size={18} strokeWidth={2.6} />
              </button>
            )}
            {active && (
              <span key={qty} className="min-w-[28px] px-1 text-center font-mono text-[15px] font-bold animate-pop" aria-hidden="true">{qty}</span>
            )}
            <button type="button" onClick={onAdd} className="icon-btn text-on-amber hover:bg-black/10" aria-label={`${t('addOne', lang)}: ${item.name}`}>
              <Icon name="plus" size={20} strokeWidth={2.6} />
            </button>
          </div>
        )}
      </div>

      <div className="relative pointer-events-none px-3 pt-2.5 pb-3 flex-1 flex flex-col justify-between gap-1">
        <p className="text-[14px] font-bold text-text leading-snug line-clamp-2">{item.name}</p>
        <p className="font-mono text-[15px] font-medium text-amber-ink">{priceLabel}</p>
      </div>
    </li>
  )
}
