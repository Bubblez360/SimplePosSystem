import { useState } from 'react'
import { t } from '../../i18n'
import Icon from '../Icon'
import AmountInput from '../AmountInput'
import ImageCropper from '../ImageCropper'

const EMOJIS = ['🍱','🍗','🍖','🌮','🥪','🍜','🍝','🍛','🥘','🍲','🥗','🍔','🌭','🍕','🧆','🥚','🍳','🥞','🧇','🥓','🥩','🧀','🥫','🥦','🥕','🍎','🍊','🍋','🍇','🍓','🫐','🍉','🥭','🍑','🍒','🍌','🍍','🥝','🫙','🧃','🥤','☕','🍵','🧋','🧊','💧']

const BLANK = { name: '', price: '', emoji: '🍱', photo: null, categoryId: '', variants: [], addons: [], trackStock: false, stock: '' }

function toForm(item) {
  if (!item) return BLANK
  return {
    name: item.name,
    price: item.variants?.length ? '' : String(item.price ?? ''),
    emoji: item.emoji || '🍱',
    photo: item.photo || null,
    categoryId: item.categoryId ? String(item.categoryId) : '',
    variants: (item.variants || []).map(v => ({ name: v.name, price: String(v.price) })),
    addons: (item.addons || []).map(a => ({ name: a.name, price: String(a.price) })),
    trackStock: !!item.trackStock,
    stock: item.stock != null ? String(item.stock) : '',
  }
}

const hasPrice = v => v !== '' && !Number.isNaN(Number(v))

// Add / edit one menu item. Returns a clean payload through onSave().
export default function ItemForm({ item, categories, lang, saving, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(() => toForm(item))
  const [showEmoji, setShowEmoji] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)
  const isNew = !item

  const hasVariants = form.variants.length > 0
  const valid = form.name.trim() && (hasVariants || hasPrice(form.price))
  const patch = values => setForm(f => ({ ...f, ...values }))

  function updateRow(field, idx, key, value) {
    setForm(f => ({ ...f, [field]: f[field].map((row, i) => (i === idx ? { ...row, [key]: value } : row)) }))
  }
  const addRow = field => setForm(f => ({ ...f, [field]: [...f[field], { name: '', price: '' }] }))
  const removeRow = (field, idx) => setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }))

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCropSrc(ev.target.result)
    reader.readAsDataURL(file)
  }

  function submit() {
    if (!valid || saving) return
    const rows = list => list.filter(r => r.name.trim() && hasPrice(r.price)).map(r => ({ name: r.name.trim(), price: Number(r.price) }))
    const variants = rows(form.variants)
    onSave({
      id: item?.id,
      name: form.name.trim(),
      price: variants.length ? null : Number(form.price),
      emoji: form.emoji,
      photo: form.photo || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      variants,
      addons: rows(form.addons),
      trackStock: form.trackStock,
      stock: form.trackStock ? Math.max(0, parseInt(form.stock, 10) || 0) : 0,
    })
  }

  return (
    <div className="screen-enter">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-border flex items-center gap-1 px-2 h-16">
        <button type="button" onClick={onCancel} className="icon-btn" aria-label={t('back', lang)}>
          <Icon name="arrow-left" size={22} />
        </button>
        <h1 className="flex-1 text-xl font-extrabold tracking-tight">{isNew ? t('addItem', lang) : t('edit', lang)}</h1>
      </header>

      <form className="p-4 flex flex-col gap-5" onSubmit={e => { e.preventDefault(); submit() }}>
        {/* Photo / emoji */}
        <section className="flex items-center gap-4" aria-label={t('itemPhoto', lang)}>
          <button
            type="button"
            onClick={() => setShowEmoji(v => !v)}
            aria-expanded={showEmoji}
            aria-label={t('chooseEmoji', lang)}
            className="w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-surface-2 text-5xl leading-none flex items-center justify-center overflow-hidden cursor-pointer hover:border-amber"
          >
            {form.photo ? <img src={form.photo} alt="" className="w-full h-full object-cover" /> : form.emoji}
          </button>
          <div className="flex flex-wrap gap-2">
            <label className="btn-secondary btn-sm">
              <Icon name="camera" size={16} />
              {t('uploadPhoto', lang)}
              <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
            </label>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setShowEmoji(v => !v)}>
              {t('chooseEmoji', lang)}
            </button>
            {form.photo && (
              <button type="button" className="btn-ghost btn-sm text-error" onClick={() => patch({ photo: null })}>
                <Icon name="trash" size={16} />
                {t('removePhoto', lang)}
              </button>
            )}
          </div>
        </section>

        {showEmoji && (
          <div className="grid grid-cols-7 gap-1 p-2 card" role="group" aria-label={t('chooseEmoji', lang)}>
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                aria-pressed={form.emoji === e && !form.photo}
                onClick={() => { patch({ emoji: e, photo: null }); setShowEmoji(false) }}
                className={`h-11 rounded-lg text-2xl flex items-center justify-center cursor-pointer hover:bg-surface-2 ${
                  form.emoji === e && !form.photo ? 'bg-amber-light ring-2 ring-amber' : ''
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <div>
          <label htmlFor="item-name" className="field-label">{t('itemName', lang)}</label>
          <input
            id="item-name"
            value={form.name}
            onChange={e => patch({ name: e.target.value })}
            placeholder={t('enterName', lang)}
            maxLength={60}
            className="field"
          />
        </div>

        {categories.length > 0 && (
          <div>
            <label htmlFor="item-cat" className="field-label">{t('category', lang)}</label>
            <select id="item-cat" value={form.categoryId} onChange={e => patch({ categoryId: e.target.value })} className="field">
              <option value="">{t('noCategory', lang)}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.emoji ? `${cat.emoji} ` : ''}{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Price or variants */}
        <fieldset>
          <div className="flex items-center justify-between mb-1.5">
            <legend className="field-label !mb-0">{hasVariants ? t('variants', lang) : t('price', lang)}</legend>
            <button type="button" onClick={() => addRow('variants')} className="btn-ghost btn-sm !text-amber-ink">
              <Icon name="plus" size={16} />
              {t('addVariant', lang)}
            </button>
          </div>
          {!hasVariants ? (
            <>
              <AmountInput value={form.price} onChange={price => patch({ price })} placeholder="0.00" aria-label={t('price', lang)} />
              <p className="text-[12px] text-muted mt-1.5">{t('noVariants', lang)}</p>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              {form.variants.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={v.name}
                    onChange={e => updateRow('variants', idx, 'name', e.target.value)}
                    placeholder={t('variantName', lang)}
                    aria-label={t('variantName', lang)}
                    maxLength={30}
                    className="field flex-1 min-w-0"
                  />
                  <AmountInput
                    value={v.price}
                    onChange={val => updateRow('variants', idx, 'price', val)}
                    aria-label={t('variantPrice', lang)}
                    className="w-32 shrink-0"
                  />
                  <button type="button" className="icon-btn text-error" aria-label={t('removeRow', lang)} onClick={() => removeRow('variants', idx)}>
                    <Icon name="x" size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        {/* Add-ons */}
        <fieldset>
          <div className="flex items-center justify-between mb-1.5">
            <legend className="field-label !mb-0">{t('addons', lang)}</legend>
            <button type="button" onClick={() => addRow('addons')} className="btn-ghost btn-sm !text-amber-ink">
              <Icon name="plus" size={16} />
              {t('addAddon', lang)}
            </button>
          </div>
          {form.addons.length === 0 ? (
            <p className="text-[13px] text-muted">{t('noAddons', lang)}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {form.addons.map((a, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={a.name}
                    onChange={e => updateRow('addons', idx, 'name', e.target.value)}
                    placeholder={t('addonName', lang)}
                    aria-label={t('addonName', lang)}
                    maxLength={30}
                    className="field flex-1 min-w-0"
                  />
                  <AmountInput
                    value={a.price}
                    prefix="+₱"
                    onChange={val => updateRow('addons', idx, 'price', val)}
                    aria-label={t('addonPrice', lang)}
                    inputClassName="!pl-11"
                    className="w-32 shrink-0"
                  />
                  <button type="button" className="icon-btn text-error" aria-label={t('removeRow', lang)} onClick={() => removeRow('addons', idx)}>
                    <Icon name="x" size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        {/* Stock */}
        <section className="card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span id="stock-label" className="text-[15px] font-bold">{t('trackStock', lang)}</span>
            <button
              type="button"
              role="switch"
              aria-checked={form.trackStock}
              aria-labelledby="stock-label"
              onClick={() => patch({ trackStock: !form.trackStock })}
              className={`relative w-14 h-8 rounded-full transition-colors duration-200 cursor-pointer ${form.trackStock ? 'bg-amber' : 'bg-border-strong'}`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-card transition-transform duration-200 ${form.trackStock ? 'translate-x-6' : ''}`}
              />
            </button>
          </div>
          {form.trackStock && (
            <AmountInput
              prefix=""
              decimals={0}
              value={form.stock}
              onChange={stock => patch({ stock })}
              aria-label={t('stockCount', lang)}
            />
          )}
        </section>

        {/* Actions — sticky above the nav */}
        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] rail:bottom-0 -mx-4 px-4 py-3 bg-bg/95 backdrop-blur border-t border-border flex flex-col gap-2">
          <button type="submit" disabled={saving || !valid} className="btn-primary w-full h-14 text-base">
            {saving ? '…' : t('save', lang)}
          </button>
          {!valid && <p className="text-center text-[12px] text-muted">{t('fixFields', lang)}</p>}
          {!isNew && (
            <button type="button" onClick={onDelete} className="btn-danger w-full">
              <Icon name="trash" size={18} />
              {t('delete', lang)}
            </button>
          )}
        </div>
      </form>

      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          lang={lang}
          title={t('cropPhoto', lang)}
          hint={t('cropHint', lang)}
          onCancel={() => setCropSrc(null)}
          onApply={photo => { patch({ photo }); setCropSrc(null) }}
        />
      )}
    </div>
  )
}
