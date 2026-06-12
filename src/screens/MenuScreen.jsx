import { useState, useEffect, useRef } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useStore } from '../store/useStore'
import { getAllItems, saveItem, deleteItem } from '../db/db'
import { t } from '../i18n'

const EMOJIS = ['🍱','🍗','🍖','🌮','🥪','🍜','🍝','🍛','🥘','🍲','🥗','🍔','🌭','🍕','🧆','🥚','🍳','🥞','🧇','🥓','🥩','🧀','🥫','🥦','🥕','🍎','🍊','🍋','🍇','🍓','🫐','🍉','🥭','🍑','🍒','🍌','🍍','🥝','🫙','🧃','🥤','☕','🍵','🧋','🧊','💧']

const DEFAULT_ITEM = { name: '', price: '', emoji: '🍱', photo: null, categoryId: '', variants: [], addons: [], trackStock: false, stock: '' }

function getCroppedImg(imgEl, crop) {
  const canvas = document.createElement('canvas')
  const scaleX = imgEl.naturalWidth / imgEl.width
  const scaleY = imgEl.naturalHeight / imgEl.height
  canvas.width = crop.width
  canvas.height = crop.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imgEl, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width, crop.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function MenuScreen() {
  const { items, setItems, categories, lang } = useStore()
  const [menuCat, setMenuCat] = useState(null)
  const [menuSearch, setMenuSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(DEFAULT_ITEM)
  const [saving, setSaving] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  // Crop state
  const [cropSrc, setCropSrc] = useState(null)
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState(null)
  const imgRef = useRef(null)

  async function reload() {
    const all = await getAllItems()
    setItems(all)
  }

  useEffect(() => { reload() }, [])

  function openNew() {
    setForm(DEFAULT_ITEM)
    setEditing('new')
    setShowEmoji(false)
    setCropSrc(null)
  }

  function openEdit(item) {
    setForm({
      name: item.name,
      price: item.variants?.length ? '' : String(item.price ?? ''),
      emoji: item.emoji || '🍱',
      photo: item.photo || null,
      categoryId: item.categoryId ? String(item.categoryId) : '',
      variants: item.variants ? item.variants.map(v => ({ ...v })) : [],
      addons: item.addons ? item.addons.map(a => ({ ...a })) : [],
      trackStock: item.trackStock || false,
      stock: item.stock != null ? String(item.stock) : '',
      id: item.id,
    })
    setEditing(item.id)
    setShowEmoji(false)
    setCropSrc(null)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    const hasVariants = form.variants.length > 0
    if (!hasVariants && (!form.price || isNaN(parseFloat(form.price)))) return
    setSaving(true)
    const price = hasVariants ? null : parseFloat(form.price)
    const variants = hasVariants
      ? form.variants.filter(v => v.name.trim() && !isNaN(parseFloat(v.price)))
          .map(v => ({ name: v.name.trim(), price: parseFloat(v.price) }))
      : []
    const addons = (form.addons || [])
      .filter(a => a.name.trim() && !isNaN(parseFloat(a.price)))
      .map(a => ({ name: a.name.trim(), price: parseFloat(a.price) }))
    await saveItem({
      id: editing !== 'new' ? editing : undefined,
      name: form.name.trim(),
      price,
      emoji: form.emoji,
      photo: form.photo || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      variants,
      addons,
      trackStock: form.trackStock,
      stock: form.trackStock ? (parseInt(form.stock) || 0) : 0,
    })
    await reload()
    setSaving(false)
    setEditing(null)
  }

  async function handleDelete(id) {
    const itemName = items.find(i => i.id === id)?.name || ''
    const msg = lang === 'fil'
      ? `Burahin ang "${itemName}"? Hindi na ito maibabalik.`
      : `Delete "${itemName}"? This cannot be undone.`
    if (!window.confirm(msg)) return
    await deleteItem(id)
    await reload()
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setCropSrc(ev.target.result)
      setCrop(undefined)
      setCompletedCrop(null)
    }
    reader.readAsDataURL(file)
  }

  function onImageLoad(e) {
    const { width, height } = e.currentTarget
    const c = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, width, height), width, height)
    setCrop(c)
  }

  function applyCrop() {
    if (!completedCrop || !imgRef.current) return
    const dataUrl = getCroppedImg(imgRef.current, completedCrop)
    setForm(f => ({ ...f, photo: dataUrl, emoji: f.emoji }))
    setCropSrc(null)
  }

  function addVariant() {
    setForm(f => ({ ...f, variants: [...f.variants, { name: '', price: '' }] }))
  }

  function updateVariant(idx, field, value) {
    setForm(f => {
      const variants = f.variants.map((v, i) => i === idx ? { ...v, [field]: value } : v)
      return { ...f, variants }
    })
  }

  function removeVariant(idx) {
    setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }))
  }

  function addAddon() {
    setForm(f => ({ ...f, addons: [...(f.addons || []), { name: '', price: '' }] }))
  }
  function updateAddon(idx, field, value) {
    setForm(f => ({ ...f, addons: (f.addons || []).map((a, i) => i === idx ? { ...a, [field]: value } : a) }))
  }
  function removeAddon(idx) {
    setForm(f => ({ ...f, addons: (f.addons || []).filter((_, i) => i !== idx) }))
  }

  // Crop screen
  if (cropSrc) {
    return (
      <div className="screen-enter">
        <header className="sticky top-0 bg-surface border-b border-border px-4 py-3 z-10 flex items-center gap-3">
          <button onClick={() => setCropSrc(null)} className="text-amber font-bold text-sm">← {t('cancel', lang)}</button>
          <p className="text-lg font-extrabold text-text flex-1">{t('cropPhoto', lang)}</p>
          <button onClick={applyCrop} className="text-amber font-bold text-sm">{t('applyCrop', lang)}</button>
        </header>
        <div className="flex flex-col items-center p-4 gap-4">
          <p className="text-xs text-muted">{t('cropHint', lang)}</p>
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
            aspect={1}
            circularCrop={false}
          >
            <img ref={imgRef} src={cropSrc} alt="crop" onLoad={onImageLoad} className="max-w-full rounded-card" />
          </ReactCrop>
          <button
            onClick={applyCrop}
            className="w-full h-12 rounded-btn bg-amber text-white font-bold text-sm"
          >
            {t('applyCrop', lang)}
          </button>
        </div>
      </div>
    )
  }

  if (editing !== null) {
    const hasVariants = form.variants.length > 0
    return (
      <div className="screen-enter">
        <header className="sticky top-0 bg-surface border-b border-border px-4 py-3 z-10 flex items-center gap-3">
          <button onClick={() => setEditing(null)} className="text-amber font-bold text-sm">← {t('cancel', lang)}</button>
          <p className="text-lg font-extrabold text-text flex-1">
            {editing === 'new' ? t('addItem', lang) : t('edit', lang)}
          </p>
        </header>

        <div className="p-4 flex flex-col gap-4">
          {/* Photo / emoji */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEmoji(v => !v)}
              className="w-16 h-16 rounded-card border-2 border-border bg-surface-2 text-4xl flex items-center justify-center overflow-hidden"
            >
              {form.photo
                ? <img src={form.photo} alt="item" className="w-full h-full object-cover rounded-card" />
                : form.emoji}
            </button>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-bold text-muted">Icon</p>
              <label className="text-xs font-semibold text-amber underline cursor-pointer">
                {t('uploadPhoto', lang)}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </label>
              {form.photo && (
                <button onClick={() => setForm(f => ({ ...f, photo: null }))} className="text-xs text-error font-semibold text-left">
                  {t('removePhoto', lang)}
                </button>
              )}
            </div>
          </div>

          {showEmoji && (
            <div className="grid grid-cols-8 gap-1 p-2 bg-surface-2 rounded-card border border-border">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { setForm(f => ({ ...f, emoji: e, photo: null })); setShowEmoji(false) }}
                  className={`text-2xl h-9 rounded flex items-center justify-center ${form.emoji === e ? 'bg-amber-light' : ''}`}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wide mb-1 block">{t('itemName', lang)}</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={t('enterName', lang)}
              className="w-full h-12 rounded-lg border border-border px-3 text-sm font-semibold bg-surface focus:outline-none focus:border-amber"
            />
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wide mb-1 block">{t('category', lang)}</label>
              <select
                value={form.categoryId}
                onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                className="w-full h-12 rounded-lg border border-border px-3 text-sm font-semibold bg-surface focus:outline-none focus:border-amber"
              >
                <option value="">{t('noCategory', lang)}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.emoji ? `${cat.emoji} ` : ''}{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Price or Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-muted uppercase tracking-wide">{t('variants', lang)}</label>
              <button onClick={addVariant} className="text-xs font-bold text-amber">+ {t('addVariant', lang)}</button>
            </div>

            {!hasVariants && (
              <div>
                <p className="text-xs text-faint mb-2">{t('noVariants', lang)}</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-medium text-muted">₱</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full h-12 rounded-lg border border-border pl-7 pr-3 font-mono text-sm font-medium bg-surface focus:outline-none focus:border-amber"
                  />
                </div>
              </div>
            )}

            {hasVariants && (
              <div className="flex flex-col gap-2">
                {form.variants.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={v.name}
                      onChange={e => updateVariant(idx, 'name', e.target.value)}
                      placeholder={t('variantName', lang)}
                      className="flex-1 h-11 rounded-lg border border-border px-3 text-sm font-semibold bg-surface focus:outline-none focus:border-amber"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-muted text-sm">₱</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={v.price}
                        onChange={e => updateVariant(idx, 'price', e.target.value)}
                        placeholder="0"
                        className="w-full h-11 rounded-lg border border-border pl-6 pr-2 font-mono text-sm bg-surface focus:outline-none focus:border-amber"
                      />
                    </div>
                    <button onClick={() => removeVariant(idx)} className="text-error font-bold text-lg leading-none w-8 flex-shrink-0">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add-ons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-muted uppercase tracking-wide">{t('addons', lang)}</label>
              <button onClick={addAddon} className="text-xs font-bold text-amber">+ {t('addAddon', lang)}</button>
            </div>
            {(form.addons || []).length === 0 && (
              <p className="text-xs text-faint">{t('noAddons', lang)}</p>
            )}
            {(form.addons || []).length > 0 && (
              <div className="flex flex-col gap-2">
                {(form.addons || []).map((a, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={a.name}
                      onChange={e => updateAddon(idx, 'name', e.target.value)}
                      placeholder={t('addonName', lang)}
                      className="flex-1 h-11 rounded-lg border border-border px-3 text-sm font-semibold bg-surface focus:outline-none focus:border-amber"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-muted text-sm">+₱</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={a.price}
                        onChange={e => updateAddon(idx, 'price', e.target.value)}
                        placeholder="0"
                        className="w-full h-11 rounded-lg border border-border pl-8 pr-2 font-mono text-sm bg-surface focus:outline-none focus:border-amber"
                      />
                    </div>
                    <button onClick={() => removeAddon(idx)} className="text-error font-bold text-lg leading-none w-8 flex-shrink-0">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stock tracking */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted uppercase tracking-wide">{t('trackStock', lang)}</label>
              <button
                onClick={() => setForm(f => ({ ...f, trackStock: !f.trackStock }))}
                className="w-12 h-6 rounded-full transition-colors flex-shrink-0 relative"
                style={{ background: form.trackStock ? 'var(--amber)' : 'var(--border)' }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: form.trackStock ? '26px' : '2px' }}
                />
              </button>
            </div>
            {form.trackStock && (
              <input
                type="number"
                inputMode="numeric"
                value={form.stock}
                onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                placeholder="0"
                className="mt-2 w-full h-11 rounded-lg border border-border px-3 font-mono text-sm bg-surface focus:outline-none focus:border-amber"
              />
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || (!hasVariants && !form.price)}
            className="h-12 rounded-btn bg-amber text-white font-bold text-sm disabled:opacity-50 mt-2"
          >
            {saving ? '...' : t('save', lang)}
          </button>

          {editing !== 'new' && (
            <button
              onClick={() => { handleDelete(editing); setEditing(null) }}
              className="h-10 rounded-btn border border-error text-error font-bold text-sm"
            >
              {t('delete', lang)}
            </button>
          )}
        </div>
      </div>
    )
  }

  const catFiltered = menuCat === null
    ? items
    : menuCat === 'none'
      ? items.filter(i => !i.categoryId)
      : items.filter(i => String(i.categoryId) === String(menuCat))

  const visibleItems = menuSearch.trim()
    ? catFiltered.filter(i => i.name.toLowerCase().includes(menuSearch.toLowerCase()))
    : catFiltered

  return (
    <div className="screen-enter">
      <header className="sticky top-0 bg-surface border-b border-border z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-lg font-extrabold text-text">{t('menu', lang)}</p>
          <button onClick={openNew} className="h-9 px-4 rounded-pill bg-amber text-white text-xs font-bold">
            + {t('addItem', lang)}
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
            <input
              value={menuSearch}
              onChange={e => setMenuSearch(e.target.value)}
              placeholder={t('searchItems', lang)}
              className="w-full h-10 rounded-lg border border-border pl-8 pr-3 text-sm font-semibold bg-surface focus:outline-none focus:border-amber text-text"
            />
            {menuSearch && (
              <button
                onClick={() => setMenuSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-lg leading-none"
              >×</button>
            )}
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setMenuCat(null)}
              className={`flex-shrink-0 h-8 px-3 rounded-pill text-xs font-bold border transition-all ${
                menuCat === null ? 'bg-amber text-white border-amber' : 'bg-surface border-border text-muted'
              }`}
            >
              {t('allItems', lang)}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setMenuCat(cat.id)}
                className={`flex-shrink-0 h-8 px-3 rounded-pill text-xs font-bold border transition-all ${
                  menuCat === cat.id ? 'bg-amber text-white border-amber' : 'bg-surface border-border text-muted'
                }`}
              >
                {cat.emoji && <span className="mr-1">{cat.emoji}</span>}{cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="p-3 flex flex-col gap-2">
        {visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-5xl">📋</span>
            <p className="text-muted text-sm">{t('noItems', lang)}</p>
          </div>
        ) : (
          visibleItems.map(item => (
            <div
              key={item.id}
              onClick={() => openEdit(item)}
              className="flex items-center gap-3 p-3 rounded-card border border-border bg-surface active:bg-surface-2 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-card bg-surface-2 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                {item.photo
                  ? <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                  : item.emoji || '🍱'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-text truncate">{item.name}</p>
                {item.variants?.length > 0
                  ? <p className="text-xs text-muted">{item.variants.length} variants · ₱{Math.min(...item.variants.map(v => v.price)).toFixed(2)}+</p>
                  : <p className="font-mono text-sm text-amber-dark">₱{(item.price ?? 0).toFixed(2)}</p>
                }
                {item.categoryId && categories.find(c => c.id === item.categoryId) && (
                  <p className="text-[10px] text-faint">{categories.find(c => c.id === item.categoryId)?.name}</p>
                )}
              </div>
              <span className="text-faint text-sm">›</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
