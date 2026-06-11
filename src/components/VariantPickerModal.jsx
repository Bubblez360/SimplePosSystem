import { useStore } from '../store/useStore'
import { t } from '../i18n'

export default function VariantPickerModal() {
  const { variantPickerItem, setVariantPickerItem, addToCart, lang } = useStore()
  const item = variantPickerItem
  if (!item) return null

  function pick(variantIdx) {
    addToCart(`${item.id}_${variantIdx}`)
    setVariantPickerItem(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60" onClick={() => setVariantPickerItem(null)}>
      <div className="mt-auto bg-bg rounded-t-[20px] overflow-hidden w-full max-w-2xl mx-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-surface px-4 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{item.photo
              ? <img src={item.photo} alt={item.name} className="w-8 h-8 rounded-lg object-cover" />
              : item.emoji || '🍱'}</span>
            <div>
              <p className="font-extrabold text-text">{item.name}</p>
              <p className="text-xs text-muted">{t('chooseVariant', lang)}</p>
            </div>
          </div>
          <button onClick={() => setVariantPickerItem(null)} className="w-10 h-10 -m-2 flex items-center justify-center text-muted text-2xl leading-none">×</button>
        </div>

        <div className="px-4 py-3 flex flex-col gap-2 sheet-pb">
          {item.variants.map((v, idx) => (
            <button
              key={idx}
              onClick={() => pick(idx)}
              className="w-full flex items-center justify-between h-14 px-4 rounded-card border border-border bg-surface active:bg-amber-light active:border-amber transition-colors"
            >
              <span className="font-semibold text-text">{v.name}</span>
              <span className="font-mono font-medium text-amber-dark">₱{Number(v.price).toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
