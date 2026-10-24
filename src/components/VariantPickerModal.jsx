import { useStore } from '../store/useStore'
import { t } from '../i18n'
import Sheet from './Sheet'
import { peso } from './cart/useCart'

export default function VariantPickerModal() {
  const item = useStore(s => s.variantPickerItem)
  const setVariantPickerItem = useStore(s => s.setVariantPickerItem)
  const addToCart = useStore(s => s.addToCart)
  const lang = useStore(s => s.lang)
  if (!item) return null

  function pick(variantIdx) {
    // Only close when the line was actually added (stock cap may refuse).
    if (addToCart(`${item.id}_${variantIdx}`)) setVariantPickerItem(null)
  }

  const thumb = (
    <span className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center text-3xl overflow-hidden shrink-0">
      {item.photo ? <img src={item.photo} alt="" className="w-full h-full object-cover" /> : item.emoji || '🍱'}
    </span>
  )

  return (
    <Sheet
      title={item.name}
      subtitle={t('chooseVariant', lang)}
      icon={thumb}
      closeLabel={t('close', lang)}
      onClose={() => setVariantPickerItem(null)}
    >
      <ul className="px-5 pb-5 pt-1 flex flex-col gap-2.5 sheet-pb">
        {item.variants.map((v, idx) => (
          <li key={idx}>
            <button
              type="button"
              onClick={() => pick(idx)}
              className="tile card w-full flex items-center justify-between min-h-[60px] px-4 text-left cursor-pointer
                hover:border-amber active:bg-amber-light"
            >
              <span className="text-[16px] font-bold text-text">{v.name}</span>
              <span className="font-mono text-[18px] font-medium text-amber-ink">{peso(v.price)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
