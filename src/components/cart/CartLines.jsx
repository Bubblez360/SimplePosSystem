import { useStore } from '../../store/useStore'
import { t } from '../../i18n'
import Icon from '../Icon'
import { peso } from './useCart'

// Order lines with − / qty / + steppers. Shared by the mobile cart bar and the
// desktop cart panel so both behave identically.
export default function CartLines({ lines }) {
  const lang = useStore(s => s.lang)
  const addToCart = useStore(s => s.addToCart)
  const removeFromCart = useStore(s => s.removeFromCart)

  return (
    <ul className="divide-y divide-border">
      {lines.map(line => {
        const extras = [line.variantName, ...line.selectedAddons.map(a => `+${a.name}`)].filter(Boolean)
        return (
          <li key={line.cartKey} className="flex items-center gap-3 px-4 py-2.5 min-h-[68px]">
            <div className="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
              {line.photo
                ? <img src={line.photo} alt="" className="w-full h-full object-cover" />
                : line.emoji || '🍱'}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-text leading-tight truncate">{line.name}</p>
              <p className="text-[12px] text-muted truncate">
                {extras.length > 0 ? extras.join(' · ') : peso(line.price)}
              </p>
              <p className="font-mono text-[13px] font-medium text-amber-ink">{peso(line.subtotal)}</p>
            </div>

            <div className="flex items-center shrink-0 rounded-pill bg-surface-2 border border-border">
              <button
                type="button"
                onClick={() => removeFromCart(line.cartKey)}
                className="icon-btn text-text"
                aria-label={`${t('removeOne', lang)}: ${line.displayName}`}
              >
                <Icon name={line.qty === 1 ? 'trash' : 'minus'} size={18} />
              </button>
              <span className="w-7 text-center font-mono text-[15px] font-bold text-text" aria-live="polite">{line.qty}</span>
              <button
                type="button"
                onClick={() => addToCart(line.cartKey)}
                className="icon-btn text-text"
                aria-label={`${t('addOne', lang)}: ${line.displayName}`}
              >
                <Icon name="plus" size={18} />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
