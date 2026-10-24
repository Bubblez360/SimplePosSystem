import { useMemo, useState } from 'react'
import { useStore, itemTotalQty } from '../store/useStore'
import { t } from '../i18n'
import Icon from '../components/Icon'
import ItemTile from '../components/ItemTile'
import CartPanel from '../components/cart/CartPanel'
import { HeldOrdersButton } from '../components/HeldOrders'

const SEARCH_THRESHOLD = 6

export default function BentaScreen() {
  const items = useStore(s => s.items)
  const categories = useStore(s => s.categories)
  const cart = useStore(s => s.cart)
  const addToCart = useStore(s => s.addToCart)
  const removeFromCart = useStore(s => s.removeFromCart)
  const setVariantPickerItem = useStore(s => s.setVariantPickerItem)
  const lang = useStore(s => s.lang)
  const businessName = useStore(s => s.businessName)
  const logo = useStore(s => s.logo)
  const [activeCat, setActiveCat] = useState('all')
  const [search, setSearch] = useState('')

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter(i =>
      (activeCat === 'all' || String(i.categoryId) === String(activeCat)) &&
      (!query || i.name.toLowerCase().includes(query)))
  }, [items, activeCat, search])

  function handleAdd(item) {
    if (item.variants?.length) setVariantPickerItem(item)
    else addToCart(String(item.id))
  }

  return (
    <div className="screen-enter rail:flex rail:h-full">
      <div className="rail:flex-1 rail:min-w-0 rail:overflow-y-auto">
        <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-border">
          <div className="px-4 pt-3 pb-2 short:py-1.5 flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="" className="w-11 h-11 short:hidden rounded-xl object-cover border border-border shrink-0" />
            ) : (
              <span className="w-11 h-11 short:hidden rounded-xl bg-amber text-on-amber flex items-center justify-center shrink-0">
                <Icon name="store" size={22} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="eyebrow truncate short:hidden">{businessName || t('appName', lang)}</p>
              <h1 className="text-[22px] short:text-[17px] font-extrabold tracking-tight leading-tight">{t('benta', lang)}</h1>
            </div>
            <HeldOrdersButton />
          </div>

          {items.length > SEARCH_THRESHOLD && (
            <div className="relative px-4 pb-2">
              <Icon name="search" size={18} className="absolute left-7 top-1/2 -translate-y-[calc(50%+4px)] text-faint pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('searchItems', lang)}
                aria-label={t('searchItems', lang)}
                className="field pl-11 pr-11"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="icon-btn absolute right-5 top-1/2 -translate-y-[calc(50%+4px)]"
                  aria-label={t('close', lang)}
                >
                  <Icon name="x" size={18} />
                </button>
              )}
            </div>
          )}

          {categories.length > 0 && (
            <div className="flex gap-2 px-4 pb-3 short:pb-1.5 overflow-x-auto no-scrollbar" role="group" aria-label={t('categories', lang)}>
              <button type="button" className="chip" aria-pressed={activeCat === 'all'} onClick={() => setActiveCat('all')}>
                {t('allItems', lang)}
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className="chip"
                  aria-pressed={activeCat === cat.id}
                  onClick={() => setActiveCat(cat.id)}
                >
                  {cat.emoji && <span aria-hidden="true">{cat.emoji}</span>}
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="p-3 pb-4">
          {visible.length === 0 ? (
            <EmptyCatalog hasItems={items.length > 0} lang={lang} />
          ) : (
            <ul className="grid grid-cols-2 min-[560px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 short:grid-cols-3 gap-3">
              {visible.map(item => (
                <ItemTile
                  key={item.id}
                  item={item}
                  qty={itemTotalQty(cart, item.id)}
                  lang={lang}
                  onAdd={() => handleAdd(item)}
                  onRemove={() => removeFromCart(String(item.id))}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <CartPanel />
    </div>
  )
}

function EmptyCatalog({ hasItems, lang }) {
  const setScreen = useStore(s => s.setScreen)
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <span className="w-16 h-16 rounded-2xl bg-surface-2 text-faint flex items-center justify-center">
        <Icon name={hasItems ? 'search' : 'store'} size={30} />
      </span>
      {hasItems ? (
        <p className="text-[15px] font-bold text-muted">{t('noSearchResults', lang)}</p>
      ) : (
        <>
          <p className="text-[15px] font-bold">{t('noItems', lang)}</p>
          <p className="text-[13px] text-muted max-w-[16rem]">{t('goToMenu', lang)}</p>
          <button type="button" className="btn-primary mt-1" onClick={() => setScreen('menu')}>
            <Icon name="plus" size={18} />
            {t('addItem', lang)}
          </button>
        </>
      )}
    </div>
  )
}
