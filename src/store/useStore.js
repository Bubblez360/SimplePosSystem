import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { t } from '../i18n'
import { getCachedLicense } from '../lib/licenseCache'

const EMPTY_DISCOUNT = { type: 'flat', value: '' }
const TOAST_MS = 2400
let toastTimer = null

export const useStore = create(persist((set, get) => ({
  // Navigation
  screen: 'benta',
  setScreen: (screen) => set({ screen }),

  // Item catalog. Whenever the catalog changes, drop cart lines that no
  // longer exist (deleted item / removed variant) or exceed remaining stock.
  items: [],
  setItems: (items) => set(state => ({ items, ...pruneCart(items, state) })),

  // Transient message shown by <Toast />
  toast: null,
  showToast: (msg, tone = 'info') => {
    clearTimeout(toastTimer)
    set({ toast: { id: Date.now(), msg, tone } })
    toastTimer = setTimeout(() => set({ toast: null }), TOAST_MS)
  },

  // Categories
  categories: [],
  setCategories: (categories) => set({ categories }),

  // Cart: { [cartKey]: qty }
  // cartKey = itemId (no variants) or "itemId_variantIdx" (with variants)
  cart: {},
  // Returns false (and explains why) when tracked stock would be exceeded.
  addToCart: (cartKey) => {
    const { items, cart, lang, showToast } = get()
    const { itemId } = parseCartKey(cartKey)
    const item = items.find(i => i.id === itemId)
    if (item?.trackStock && itemTotalQty(cart, itemId) >= (item.stock ?? 0)) {
      showToast(t('stockLimit', lang).replace('{n}', item.stock ?? 0), 'warn')
      return false
    }
    set({ cart: { ...cart, [cartKey]: (cart[cartKey] || 0) + 1 } })
    return true
  },
  removeFromCart: (cartKey) => {
    const cart = { ...get().cart }
    if (!cart[cartKey]) return
    if (cart[cartKey] <= 1) {
      delete cart[cartKey]
    } else {
      cart[cartKey] -= 1
    }
    set({ cart })
  },
  clearCart: () => set({ cart: {}, cartNotes: {}, cartAddons: {}, discount: EMPTY_DISCOUNT, payMethod: 'cash' }),

  // Chosen payment method; kept here so backing out of the GCash QR screen
  // returns to checkout with GCash still selected.
  payMethod: 'cash',
  setPayMethod: (payMethod) => set({ payMethod }),

  // Order-level discount, shared by the cash and GCash payment screens.
  discount: EMPTY_DISCOUNT,
  setDiscount: (discount) => set({ discount }),

  // Per-line notes: { [cartKey]: string }
  cartNotes: {},
  setCartNote: (cartKey, note) => {
    const cartNotes = { ...get().cartNotes }
    if (note) cartNotes[cartKey] = note
    else delete cartNotes[cartKey]
    set({ cartNotes })
  },

  // Per-line selected add-ons: { [cartKey]: number[] }
  cartAddons: {},
  setCartAddons: (cartKey, addonIndices) => {
    const cartAddons = { ...get().cartAddons }
    if (addonIndices.length > 0) cartAddons[cartKey] = addonIndices
    else delete cartAddons[cartKey]
    set({ cartAddons })
  },

  // Modals
  checkoutOpen: false,
  setCheckoutOpen: (v) => set({ checkoutOpen: v }),
  gcashOpen: false,
  setGcashOpen: (v) => set({ gcashOpen: v }),
  variantPickerItem: null,
  setVariantPickerItem: (item) => set({ variantPickerItem: item }),
  receiptOpen: false,
  setReceiptOpen: (v) => set({ receiptOpen: v }),
  helpOpen: false,
  setHelpOpen: (v) => set({ helpOpen: v }),
  lastSale: null,
  setLastSale: (sale) => set({ lastSale: sale }),

  // GCash QR
  gcashQR: null,
  setGcashQR: (v) => set({ gcashQR: v }),

  // Printer
  printerConnected: false,
  setPrinterConnected: (v) => set({ printerConnected: v }),

  // Shift
  currentShift: null,
  setCurrentShift: (shift) => set({ currentShift: shift }),
  shiftModalOpen: false,
  setShiftModalOpen: (v) => set({ shiftModalOpen: v }),

  // Settings
  lang: localStorage.getItem('lang') || 'fil',
  setLang: (lang) => {
    localStorage.setItem('lang', lang)
    set({ lang })
  },
  businessName: localStorage.getItem('businessName') || '',
  setBusinessName: (name) => {
    localStorage.setItem('businessName', name)
    set({ businessName: name })
  },
  bigText: localStorage.getItem('bigText') === '1',
  setBigText: (v) => {
    localStorage.setItem('bigText', v ? '1' : '0')
    set({ bigText: v })
  },
  theme: localStorage.getItem('theme') || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },
  logo: null,
  setLogo: (logo) => set({ logo }),

  // Premium / license
  // Derived from the cached license's own expiry; kept fresh by initLicenseRefresh().
  isPremium: !!getCachedLicense(),
  setIsPremium: (v) => set({ isPremium: v }),
  licenseKey: localStorage.getItem('licenseKey') || '',
  setLicenseKey: (key) => {
    localStorage.setItem('licenseKey', key)
    set({ licenseKey: key })
  },
}), {
  // A POS cart must survive an accidental refresh, an Android process kill
  // or a service-worker update reload.
  name: 'tindapos-cart',
  version: 1,
  partialize: ({ cart, cartNotes, cartAddons }) => ({ cart, cartNotes, cartAddons }),
}))

// Remove cart lines that can no longer be sold: deleted items, variants that
// were removed, stale add-on indices, and quantities beyond tracked stock.
export function pruneCart(items, { cart, cartNotes, cartAddons }) {
  const byId = new Map(items.map(i => [i.id, i]))
  const stockLeft = new Map()
  const nextCart = {}
  for (const [key, qty] of Object.entries(cart)) {
    const { itemId, variantIdx } = parseCartKey(key)
    const item = byId.get(itemId)
    if (!item || !(qty > 0)) continue
    const hasVariants = item.variants?.length > 0
    const variantOk = hasVariants ? variantIdx !== null && !!item.variants[variantIdx] : variantIdx === null
    if (!variantOk) continue
    let q = qty
    if (item.trackStock) {
      const left = stockLeft.has(itemId) ? stockLeft.get(itemId) : (item.stock ?? 0)
      q = Math.min(q, left)
      stockLeft.set(itemId, left - q)
    }
    if (q > 0) nextCart[key] = q
  }
  const nextNotes = {}
  const nextAddons = {}
  for (const key of Object.keys(nextCart)) {
    if (cartNotes[key]) nextNotes[key] = cartNotes[key]
    const item = byId.get(parseCartKey(key).itemId)
    const valid = (cartAddons[key] || []).filter(idx => item.addons?.[idx])
    if (valid.length) nextAddons[key] = valid
  }
  return { cart: nextCart, cartNotes: nextNotes, cartAddons: nextAddons }
}

// Parse cart key into itemId + optional variantIdx
export function parseCartKey(key) {
  const str = String(key)
  const parts = str.split('_')
  return {
    itemId: Number(parts[0]),
    variantIdx: parts.length > 1 ? Number(parts[1]) : null,
  }
}

// Get price for a cart key
function resolvePrice(item, variantIdx) {
  if (variantIdx !== null && item.variants?.length) {
    return item.variants[variantIdx]?.price ?? 0
  }
  return item.price ?? 0
}

// Total qty for an item across all its variants
export function itemTotalQty(cart, itemId) {
  return Object.entries(cart)
    .filter(([key]) => parseCartKey(key).itemId === itemId)
    .reduce((sum, [, qty]) => sum + qty, 0)
}

export function cartTotal(items, cart, cartAddons = {}) {
  return Object.entries(cart).reduce((sum, [key, qty]) => {
    const { itemId, variantIdx } = parseCartKey(key)
    const item = items.find(i => i.id === itemId)
    if (!item) return sum
    const addonTotal = (cartAddons[key] || []).reduce((s, idx) => s + (item.addons?.[idx]?.price ?? 0), 0)
    return sum + (resolvePrice(item, variantIdx) + addonTotal) * qty
  }, 0)
}

export function cartLines(items, cart, cartAddons = {}, cartNotes = {}) {
  return Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([key, qty]) => {
      const { itemId, variantIdx } = parseCartKey(key)
      const item = items.find(i => i.id === itemId)
      if (!item) return null
      const selectedAddons = (cartAddons[key] || []).map(idx => item.addons?.[idx]).filter(Boolean)
      const addonTotal = selectedAddons.reduce((s, a) => s + a.price, 0)
      const price = resolvePrice(item, variantIdx) + addonTotal
      const variantName = variantIdx !== null ? item.variants?.[variantIdx]?.name ?? null : null
      return {
        ...item,
        cartKey: key,
        qty,
        price,
        subtotal: price * qty,
        variantName,
        displayName: variantName ? `${item.name} (${variantName})` : item.name,
        selectedAddons,
        note: cartNotes[key] || '',
      }
    })
    .filter(Boolean)
}
