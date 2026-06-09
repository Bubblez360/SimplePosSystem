import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { getAllItems, saveItem, deleteItem } from '../db/db'
import { t } from '../i18n'

const EMOJIS = ['🍱','🍗','🍖','🌮','🥪','🍜','🍝','🍛','🥘','🍲','🥗','🍔','🌭','🍕','🧆','🥚','🍳','🥞','🧇','🥓','🥩','🧀','🥫','🥦','🥕','🍎','🍊','🍋','🍇','🍓','🫐','🍉','🥭','🍑','🍒','🍌','🍍','🥝','🫙','🧃','🥤','☕','🍵','🧋','🧊','💧']

const DEFAULT_ITEM = { name: '', price: '', emoji: '🍱', photo: null }

export default function MenuScreen() {
  const { items, setItems, lang } = useStore()
  const [editing, setEditing] = useState(null) // null = list, object = form
  const [form, setForm] = useState(DEFAULT_ITEM)
  const [saving, setSaving] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)

  async function reload() {
    const all = await getAllItems()
    setItems(all)
  }

  useEffect(() => { reload() }, [])

  function openNew() {
    setForm(DEFAULT_ITEM)
    setEditing('new')
    setShowEmoji(false)
  }

  function openEdit(item) {
    setForm({ name: item.name, price: String(item.price), emoji: item.emoji || '🍱', photo: item.photo || null, id: item.id })
    setEditing(item.id)
    setShowEmoji(false)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) return
    const price = parseFloat(form.price)
    if (isNaN(price) || price < 0) return
    setSaving(true)
    await saveItem({ id: editing !== 'new' ? editing : undefined, name: form.name.trim(), price, emoji: form.emoji, photo: form.photo || null })
    await reload()
    setSaving(false)
    setEditing(null)
  }

  async function handleDelete(id) {
    await deleteItem(id)
    await reload()
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, photo: ev.target.result }))
    reader.readAsDataURL(file)
  }

  if (editing !== null) {
    return (
      <div className="screen-enter">
        <header className="sticky top-0 bg-surface border-b border-border px-4 py-3 z-10 flex items-center gap-3">
          <button onClick={() => setEditing(null)} className="text-amber font-bold text-sm">← {t('cancel', lang)}</button>
          <p className="text-lg font-extrabold text-text flex-1">
            {editing === 'new' ? t('addItem', lang) : t('edit', lang)}
          </p>
        </header>

        <div className="p-4 flex flex-col gap-4">
          {/* Emoji / photo picker */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEmoji(v => !v)}
              className="w-16 h-16 rounded-card border-2 border-border bg-surface-2 text-4xl flex items-center justify-center"
            >
              {form.photo
                ? <img src={form.photo} alt="item" className="w-full h-full object-cover rounded-card" />
                : form.emoji}
            </button>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-bold text-muted">Icon</p>
              <label className="text-xs font-semibold text-amber underline cursor-pointer">
                {t('uploadPhoto', lang)}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
              {form.photo && (
                <button onClick={() => setForm(f => ({ ...f, photo: null }))} className="text-xs text-error font-semibold">
                  {t('removePhoto', lang)}
                </button>
              )}
            </div>
          </div>

          {/* Emoji grid */}
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

          {/* Price */}
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wide mb-1 block">{t('price', lang)}</label>
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

          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.price}
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

  return (
    <div className="screen-enter">
      <header className="sticky top-0 bg-surface border-b border-border px-4 py-3 z-10 flex items-center justify-between">
        <p className="text-lg font-extrabold text-text">{t('menu', lang)}</p>
        <button
          onClick={openNew}
          className="h-9 px-4 rounded-pill bg-amber text-white text-xs font-bold"
        >
          + {t('addItem', lang)}
        </button>
      </header>

      <div className="p-3 flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-5xl">📋</span>
            <p className="text-muted text-sm">{t('noItems', lang)}</p>
          </div>
        ) : (
          items.map(item => (
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
                <p className="font-mono text-sm text-amber-dark">₱{item.price.toFixed(2)}</p>
              </div>
              <span className="text-faint text-sm">›</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
