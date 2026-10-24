import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { getAllItems, saveItem, deleteItem } from '../db/db'
import { t } from '../i18n'
import Icon from '../components/Icon'
import ItemForm from '../components/menu/ItemForm'
import { peso } from '../components/cart/useCart'

export default function MenuScreen() {
  const items = useStore(s => s.items)
  const setItems = useStore(s => s.setItems)
  const categories = useStore(s => s.categories)
  const showToast = useStore(s => s.showToast)
  const lang = useStore(s => s.lang)
  const [menuCat, setMenuCat] = useState(null)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // null = list, 'new', or an item id
  const [saving, setSaving] = useState(false)

  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories])
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(i =>
      (menuCat === null || String(i.categoryId) === String(menuCat)) &&
      (!q || i.name.toLowerCase().includes(q)))
  }, [items, menuCat, search])

  const reload = async () => setItems(await getAllItems())

  async function handleSave(data) {
    setSaving(true)
    try {
      await saveItem(data)
      await reload()
      setEditing(null)
    } catch {
      showToast(t('saleError', lang), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(t('deleteItemConfirm', lang).replace('{name}', item.name))) return
    await deleteItem(item.id)
    await reload()
    setEditing(null)
  }

  if (editing !== null) {
    const item = editing === 'new' ? null : items.find(i => i.id === editing)
    return (
      <ItemForm
        key={editing}
        item={item}
        categories={categories}
        lang={lang}
        saving={saving}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
        onDelete={() => item && handleDelete(item)}
      />
    )
  }

  return (
    <div className="screen-enter">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          <div>
            <p className="eyebrow">{items.length} {t('items', lang)}</p>
            <h1 className="text-[22px] font-extrabold tracking-tight leading-tight">{t('menu', lang)}</h1>
          </div>
          <button type="button" onClick={() => setEditing('new')} className="btn-primary btn-sm hidden rail:inline-flex">
            <Icon name="plus" size={18} strokeWidth={2.6} />
            {t('addItem', lang)}
          </button>
        </div>

        <div className="relative px-4 pb-2">
          <Icon name="search" size={18} className="absolute left-7 top-1/2 -translate-y-[calc(50%+4px)] text-faint pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchItems', lang)}
            aria-label={t('searchItems', lang)}
            className="field pl-11"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar" role="group" aria-label={t('categories', lang)}>
            <button type="button" className="chip" aria-pressed={menuCat === null} onClick={() => setMenuCat(null)}>
              {t('allItems', lang)}
            </button>
            {categories.map(cat => (
              <button key={cat.id} type="button" className="chip" aria-pressed={menuCat === cat.id} onClick={() => setMenuCat(cat.id)}>
                {cat.emoji && <span aria-hidden="true">{cat.emoji}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="p-3 pb-24 rail:pb-3">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="w-16 h-16 rounded-2xl bg-surface-2 text-faint flex items-center justify-center">
              <Icon name={search ? 'search' : 'box'} size={30} />
            </span>
            <p className="text-[15px] font-bold">{search ? t('noSearchResults', lang) : t('noItems', lang)}</p>
            {!search && (
              <button type="button" onClick={() => setEditing('new')} className="btn-primary">
                <Icon name="plus" size={18} strokeWidth={2.6} />
                {t('addItem', lang)}
              </button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map(item => {
              const hasVariants = item.variants?.length > 0
              const cat = catById.get(item.categoryId)
              const price = hasVariants ? Math.min(...item.variants.map(v => v.price)) : item.price ?? 0
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(item.id)}
                    className="tile card w-full flex items-center gap-3 p-3 text-left cursor-pointer hover:border-amber/60"
                  >
                    <span className="w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                      {item.photo ? <img src={item.photo} alt="" loading="lazy" className="w-full h-full object-cover" /> : item.emoji || '🍱'}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-bold leading-snug truncate">{item.name}</span>
                      <span className="block font-mono text-[14px] font-medium text-amber-ink">
                        {peso(price, { compact: true })}{hasVariants && '+'}
                        {hasVariants && (
                          <span className="font-sans text-[12px] font-semibold text-muted ml-2">
                            {t('nVariants', lang).replace('{n}', item.variants.length)}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 mt-0.5 text-[12px] text-muted">
                        {cat && <span className="truncate">{cat.emoji} {cat.name}</span>}
                        {item.trackStock && (
                          <span className={`pill-badge ${item.stock <= 0 ? 'bg-error-light text-error' : 'bg-surface-2 text-muted'}`}>
                            {item.stock} {t('left', lang)}
                          </span>
                        )}
                      </span>
                    </span>
                    <Icon name="chevron-right" size={20} className="text-faint" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Primary action lives in the thumb zone on phones */}
      <button
        type="button"
        onClick={() => setEditing('new')}
        className="btn-primary fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] z-20 h-14 px-5 shadow-float rail:hidden"
      >
        <Icon name="plus" size={20} strokeWidth={2.6} />
        {t('addItem', lang)}
      </button>
    </div>
  )
}
